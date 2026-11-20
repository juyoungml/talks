# %% setup
import json
import time
from pathlib import Path

import torch
import torch.nn.functional as F
from huggingface_hub import snapshot_download
from safetensors.torch import load_file
from transformers import AutoTokenizer

device = "mps" if torch.backends.mps.is_available() else "cpu"
dtype = torch.float16 if device == "mps" else torch.float32

REVISION = "c1899de289a04d12100db370d81485cdf75e47ca"
path = Path(snapshot_download("Qwen/Qwen3-0.6B", revision=REVISION))
config = json.loads((path / "config.json").read_text())
weights = load_file(path / "model.safetensors")
W = {name: t.to(device, dtype) for name, t in weights.items()}

tokenizer = AutoTokenizer.from_pretrained(path)
meeting = (Path(__file__).parent / "meeting.txt").read_text()
request = "회의록의 결정 사항 세 가지를 한국어로 정리해줘."
messages = [{"role": "user", "content": f"{request}\n\n{meeting}"}]
text = tokenizer.apply_chat_template(
    messages, tokenize=False,
    add_generation_prompt=True, enable_thinking=False,
)
ids = tokenizer(text, return_tensors="pt").input_ids.to(device)

# %% model
n_q = config["num_attention_heads"]    # 16
n_kv = config["num_key_value_heads"]   # 8
hd = config["head_dim"]                # 128
eps = config["rms_norm_eps"]
n_layers = config["num_hidden_layers"] # 28

def rms_norm(x, weight):
    xf = x.float()
    xf = xf * torch.rsqrt(xf.pow(2).mean(-1, keepdim=True) + eps)
    return xf.to(x.dtype) * weight

dims = torch.arange(0, hd, 2, device=device).float()
freq = config["rope_theta"] ** (-dims / hd)

def rope_tables(pos):
    angle = pos[:, None].float() * freq
    angle = torch.cat([angle, angle], dim=-1)
    return angle.cos().to(dtype), angle.sin().to(dtype)

def rope(x, cos, sin):
    left, right = x.chunk(2, dim=-1)
    return x * cos + torch.cat([-right, left], dim=-1) * sin

def causal_mask(T, start=0):
    # 새 토큰 T개(위치 start부터)가, 캐시를 포함한 start+T개 중 어디까지 볼지
    q = torch.arange(start, start + T, device=device)[:, None]
    k = torch.arange(start + T, device=device)[None, :]
    return k <= q

def attention(x, L, cos, sin, mask, cache):
    T = x.shape[1]
    p = f"model.layers.{L}.self_attn."
    q = (x @ W[p + "q_proj.weight"].T).view(1, T, n_q, hd)
    k = (x @ W[p + "k_proj.weight"].T).view(1, T, n_kv, hd)
    v = (x @ W[p + "v_proj.weight"].T).view(1, T, n_kv, hd)
    q = rope(rms_norm(q, W[p + "q_norm.weight"]).transpose(1, 2), cos, sin)
    k = rope(rms_norm(k, W[p + "k_norm.weight"]).transpose(1, 2), cos, sin)
    v = v.transpose(1, 2)
    if cache[L] is not None:  # 앞에서 계산해 둔 k, v 뒤에 새 것만 붙인다
        k = torch.cat([cache[L][0], k], dim=2)
        v = torch.cat([cache[L][1], v], dim=2)
    cache[L] = (k, v)
    # 점수 계산, mask, softmax, 가중합을 커널 하나로. k, v 헤드 공유도 알아서 한다
    out = F.scaled_dot_product_attention(q, k, v, attn_mask=mask, enable_gqa=True)
    out = out.transpose(1, 2).reshape(1, T, -1)
    return out @ W[p + "o_proj.weight"].T

def mlp(x, L):
    p = f"model.layers.{L}.mlp."
    gate = x @ W[p + "gate_proj.weight"].T
    up = x @ W[p + "up_proj.weight"].T
    return (F.silu(gate) * up) @ W[p + "down_proj.weight"].T

def block(x, L, cos, sin, mask, cache):
    p = f"model.layers.{L}."
    h = rms_norm(x, W[p + "input_layernorm.weight"])
    x = x + attention(h, L, cos, sin, mask, cache)
    h = rms_norm(x, W[p + "post_attention_layernorm.weight"])
    x = x + mlp(h, L)
    return x

def new_cache():
    return [None] * n_layers  # 층마다 (k, v)

def forward(ids, cache, start=0):
    T = ids.shape[1]
    cos, sin = rope_tables(torch.arange(start, start + T, device=device))
    mask = causal_mask(T, start)
    x = W["model.embed_tokens.weight"][ids]
    for L in range(n_layers):
        x = block(x, L, cos, sin, mask, cache)
    x = rms_norm(x[:, -1], W["model.norm.weight"])
    return x @ W["model.embed_tokens.weight"].T

# %% generate
EOS = tokenizer.convert_tokens_to_ids("<|im_end|>")

def sync():
    if device == "mps":
        torch.mps.synchronize()

def greedy(logits):
    return logits.argmax(-1, keepdim=True)

def generate(ids, max_new=48, pick=greedy):
    out, times = [], []
    shown = ""
    cache = new_cache()
    start = time.perf_counter()
    logits = forward(ids, cache)  # 프롬프트 전체는 처음 한 번만 (prefill)
    pos = ids.shape[1]
    for _ in range(max_new):
        next_id = pick(logits)
        sync()
        times.append((time.perf_counter() - start) * 1000)
        if next_id.item() == EOS:
            break
        out.append(next_id.item())
        text = tokenizer.decode(out)
        if not text.endswith("�"):        # 바이트 조각이 덜 모였으면 기다린다
            print(text[len(shown):], end="", flush=True)
            shown = text
        logits = forward(next_id, cache, start=pos)  # 이제 새 토큰 하나만
        pos += 1
    print()
    return out, times

warm = new_cache()  # 워밍업: 처음 보는 모양은 GPU 준비 때문에 느리다
forward(ids, warm)
forward(ids[:, -1:], warm, start=ids.shape[1])
sync()
out, times = generate(ids)
first = times[0]
rate = (len(times) - 1) / (times[-1] - first) * 1000
print(f"첫 토큰 {first:.0f} ms | 이후 {rate:.1f} tok/s ({len(out)}토큰)")
print("스텝별 ms:", [round(b - a) for a, b in zip(times, times[1:])])

# %% demo_kernel
# attention 하나만 떼어서, 손으로 짠 버전과 SDPA를 비교한다
from torch.utils._python_dispatch import TorchDispatchMode

def manual(q, k, v, mask):  # 04장까지 쓰던 방식
    k = k.repeat_interleave(n_q // n_kv, dim=1)
    v = v.repeat_interleave(n_q // n_kv, dim=1)
    scores = (q @ k.transpose(-1, -2)) * hd**-0.5
    scores = scores.masked_fill(~mask, float("-inf"))
    return scores.float().softmax(-1).to(dtype) @ v

def fused(q, k, v, mask):
    return F.scaled_dot_product_attention(q, k, v, attn_mask=mask, enable_gqa=True)

class CountOps(TorchDispatchMode):  # PyTorch가 실제로 실행한 연산을 센다
    def __init__(self):
        super().__init__()
        self.ops = []
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        self.ops.append(func.__name__.split(".")[0])
        return func(*args, **(kwargs or {}))

def inputs(Tq, Tk):
    r = lambda h, t: torch.randn(1, h, t, hd, device=device, dtype=dtype)
    return r(n_q, Tq), r(n_kv, Tk), r(n_kv, Tk), causal_mask(Tq, Tk - Tq)

def timed(fn, args, n=9):
    fn(*args)
    out = []
    for _ in range(n):
        sync()
        start = time.perf_counter()
        fn(*args)
        sync()
        out.append((time.perf_counter() - start) * 1000)
    return sorted(out)[n // 2]

T = ids.shape[1]
args = inputs(T, T)
for fn in (manual, fused):
    with CountOps() as c:
        fn(*args)
    print(f"{fn.__name__:6} 연산 {len(c.ops):2}개: {' '.join(c.ops)}")
print(f"결과 차이: {(manual(*args) - fused(*args)).abs().max().item():.4f}")

for n in [T, 2048, 4096]:
    a, b = timed(manual, inputs(n, n)), timed(fused, inputs(n, n))
    scores = n_q * n * n * 4 / 1e6
    print(f"prefill {n:4}토큰 | 손으로 {a:6.2f} ms · SDPA {b:5.2f} ms ({a / b:.1f}배) | 점수 행렬 {scores:6.0f} MB")

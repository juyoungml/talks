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

def causal_mask(T):
    return torch.ones(T, T, dtype=torch.bool, device=device).tril()

def attention(x, L, cos, sin, mask):
    T = x.shape[1]
    p = f"model.layers.{L}.self_attn."
    q = (x @ W[p + "q_proj.weight"].T).view(1, T, n_q, hd)
    k = (x @ W[p + "k_proj.weight"].T).view(1, T, n_kv, hd)
    v = (x @ W[p + "v_proj.weight"].T).view(1, T, n_kv, hd)
    q = rope(rms_norm(q, W[p + "q_norm.weight"]).transpose(1, 2), cos, sin)
    k = rope(rms_norm(k, W[p + "k_norm.weight"]).transpose(1, 2), cos, sin)
    v = v.transpose(1, 2)
    k = k.repeat_interleave(n_q // n_kv, dim=1)
    v = v.repeat_interleave(n_q // n_kv, dim=1)
    scores = (q @ k.transpose(-1, -2)) * hd**-0.5
    scores = scores.masked_fill(~mask, float("-inf"))
    out = scores.float().softmax(-1).to(dtype) @ v
    out = out.transpose(1, 2).reshape(1, T, -1)
    return out @ W[p + "o_proj.weight"].T

def mlp(x, L):
    p = f"model.layers.{L}.mlp."
    gate = x @ W[p + "gate_proj.weight"].T
    up = x @ W[p + "up_proj.weight"].T
    return (F.silu(gate) * up) @ W[p + "down_proj.weight"].T

def block(x, L, cos, sin, mask):
    p = f"model.layers.{L}."
    h = rms_norm(x, W[p + "input_layernorm.weight"])
    x = x + attention(h, L, cos, sin, mask)
    h = rms_norm(x, W[p + "post_attention_layernorm.weight"])
    x = x + mlp(h, L)
    return x

def forward(ids):
    T = ids.shape[1]
    # 입력 길이가 매번 달라지니 위치 정보와 mask도 매번 만든다
    cos, sin = rope_tables(torch.arange(T, device=device))
    mask = causal_mask(T)
    x = W["model.embed_tokens.weight"][ids]
    for L in range(n_layers):
        x = block(x, L, cos, sin, mask)
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
    start = time.perf_counter()
    for _ in range(max_new):
        next_id = pick(forward(ids))
        sync()
        times.append((time.perf_counter() - start) * 1000)
        if next_id.item() == EOS:
            break
        out.append(next_id.item())
        ids = torch.cat([ids, next_id], dim=1)  # 고른 토큰을 입력 끝에 붙인다
        text = tokenizer.decode(out)
        if not text.endswith("�"):        # 바이트 조각이 덜 모였으면 기다린다
            print(text[len(shown):], end="", flush=True)
            shown = text
    print()
    return out, times

forward(ids)  # 워밍업: 첫 호출은 GPU 준비 때문에 느리다
sync()
out, times = generate(ids)
first = times[0]
rate = (len(times) - 1) / (times[-1] - first) * 1000
print(f"첫 토큰 {first:.0f} ms | 이후 {rate:.1f} tok/s ({len(out)}토큰)")

# %% demo_sampling
def sample(logits, temperature=0.6, top_k=20, top_p=0.95):
    probs = (logits.float() / temperature).softmax(-1)
    probs, idx = probs.topk(top_k)              # 상위 20개만 남기고
    keep = probs.cumsum(-1) - probs < top_p     # 누적 95% 안쪽만 남긴다
    probs = probs * keep
    choice = torch.multinomial(probs / probs.sum(), 1)
    return idx.gather(-1, choice)

# 같은 점수에서 첫 토큰을 1,000번 뽑아 보면
logits = forward(ids)
torch.manual_seed(0)
picks = torch.cat([sample(logits) for _ in range(1000)]).flatten()
counts = picks.bincount(minlength=logits.shape[-1])
for i in counts.nonzero().flatten():
    print(f"{tokenizer.decode(i)!r:8} {counts[i].item():4}번")

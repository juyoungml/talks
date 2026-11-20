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

# %% quantize
# 층 안의 행렬(q, k, v, o, gate, up, down)을 행마다 int8로 줄인다
LINEARS = ["self_attn.q_proj", "self_attn.k_proj", "self_attn.v_proj",
           "self_attn.o_proj", "mlp.gate_proj", "mlp.up_proj", "mlp.down_proj"]
Q = {}
for L in range(config["num_hidden_layers"]):
    for name in LINEARS:
        key = f"model.layers.{L}.{name}"
        w = W.pop(key + ".weight").float()
        scale = w.abs().amax(dim=1) / 127            # 행마다 가장 큰 값이 127이 되게
        Q[key] = ((w / scale[:, None]).round().to(torch.int8), scale.to(dtype))

def linear(x, key):
    w, scale = Q[key]
    out = torch.ops.aten._weight_int8pack_mm(x.reshape(-1, x.shape[-1]), w, scale)
    return out.view(*x.shape[:-1], -1)

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

MAX_LEN = 1024  # 캐시에 담을 수 있는 최대 토큰 수

def causal_mask(pos):
    # 새 토큰들(위치 pos)이 캐시 MAX_LEN칸 중 어디까지 볼지. 빈 칸은 못 본다
    k = torch.arange(MAX_LEN, device=device)[None, :]
    return k <= pos[:, None]

def attention(x, L, cos, sin, mask, cache, pos):
    T = x.shape[1]
    p = f"model.layers.{L}.self_attn."
    q = linear(x, p + "q_proj").view(1, T, n_q, hd)
    k = linear(x, p + "k_proj").view(1, T, n_kv, hd)
    v = linear(x, p + "v_proj").view(1, T, n_kv, hd)
    q = rope(rms_norm(q, W[p + "q_norm.weight"]).transpose(1, 2), cos, sin)
    k = rope(rms_norm(k, W[p + "k_norm.weight"]).transpose(1, 2), cos, sin)
    v = v.transpose(1, 2)
    # 미리 잡아 둔 버퍼의 pos 칸에 써 넣고, 버퍼 전체를 attention에 넘긴다
    K, V = cache[L]
    K.index_copy_(2, pos, k)
    V.index_copy_(2, pos, v)
    k, v = K, V
    # 점수 계산, mask, softmax, 가중합을 커널 하나로. k, v 헤드 공유도 알아서 한다
    out = F.scaled_dot_product_attention(q, k, v, attn_mask=mask, enable_gqa=True)
    out = out.transpose(1, 2).reshape(1, T, -1)
    return linear(out, p + "o_proj")

def mlp(x, L):
    p = f"model.layers.{L}.mlp."
    gate = linear(x, p + "gate_proj")
    up = linear(x, p + "up_proj")
    return linear(F.silu(gate) * up, p + "down_proj")

def block(x, L, cos, sin, mask, cache, pos):
    p = f"model.layers.{L}."
    h = rms_norm(x, W[p + "input_layernorm.weight"])
    x = x + attention(h, L, cos, sin, mask, cache, pos)
    h = rms_norm(x, W[p + "post_attention_layernorm.weight"])
    x = x + mlp(h, L)
    return x

def new_cache():
    shape = (1, n_kv, MAX_LEN, hd)  # 층마다 (k, v) 버퍼를 처음에 한 번만 잡는다
    return [(torch.zeros(shape, dtype=dtype, device=device),
             torch.zeros(shape, dtype=dtype, device=device)) for _ in range(n_layers)]

def forward(ids, cache, pos):
    cos, sin = rope_tables(pos)
    mask = causal_mask(pos)
    x = W["model.embed_tokens.weight"][ids]
    for L in range(n_layers):
        x = block(x, L, cos, sin, mask, cache, pos)
    x = rms_norm(x[:, -1], W["model.norm.weight"])
    return x @ W["model.embed_tokens.weight"].T

# %% compile
# decode 스텝(새 토큰 1개)은 모양이 항상 같으니, 한 번 컴파일해서 계속 쓴다
decode = torch.compile(forward, dynamic=False)

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
    T = ids.shape[1]
    logits = forward(ids, cache, torch.arange(T, device=device))
    pos = torch.tensor([T], device=device)
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
        logits = decode(next_id, cache, pos)
        pos += 1
    print()
    return out, times

warm = new_cache()  # 워밍업: 처음 보는 모양은 GPU 준비 때문에 느리다
first_id = greedy(forward(ids, warm, torch.arange(ids.shape[1], device=device)))
t0 = time.perf_counter()
decode(first_id, warm, torch.tensor([ids.shape[1]], device=device))
sync()
print(f"컴파일: {time.perf_counter() - t0:.1f}초 (처음 한 번)")
out, times = generate(ids)
first = times[0]
rate = (len(times) - 1) / (times[-1] - first) * 1000
print(f"첫 토큰 {first:.0f} ms | 이후 {rate:.1f} tok/s ({len(out)}토큰)")
print("스텝별 ms:", [round(b - a) for a, b in zip(times, times[1:])])

# %% demo_ollama
# 같은 프롬프트를 Ollama에도 보내서 나란히 잰다 (ollama serve가 떠 있어야 한다)
import urllib.request

def ollama(model, n=48):
    body = json.dumps({
        "model": model, "stream": False, "think": False,
        # 앞에 매번 다른 번호를 붙여서, Ollama가 지난 계산을 재사용하지 못하게 한다
        "messages": [{"role": "user", "content": f"({time.time_ns()}) {request}\n\n{meeting}"}],
        "options": {"temperature": 0, "num_predict": n},
    }).encode()
    url = "http://127.0.0.1:11434/api/chat"
    r = json.load(urllib.request.urlopen(urllib.request.Request(url, body)))
    return r["prompt_eval_duration"] / 1e6, r["eval_count"] / r["eval_duration"] * 1e9

ours_rate = rate
for model in ["qwen3:0.6b-fp16", "qwen3:0.6b"]:
    try:
        ollama(model, 4)  # 모델 로드
        first_ms, tok_s = ollama(model)
        print(f"{model:16} 첫 토큰 {first_ms:4.0f} ms | {tok_s:5.1f} tok/s")
    except OSError:
        print(f"{model}: Ollama에 연결할 수 없어요")
print(f"{'우리 (08장)':16} 첫 토큰 {first:4.0f} ms | {ours_rate:5.1f} tok/s")

# %% demo_bandwidth
# decode 한 스텝은 가중치를 전부 한 번씩 읽는다. 초당 몇 GB를 읽고 있나?
def nbytes(t):
    return t.numel() * t.element_size()

step_bytes = (sum(nbytes(w) + nbytes(s) for w, s in Q.values())
              + nbytes(W["model.embed_tokens.weight"])         # lm head
              + n_layers * 2 * n_kv * MAX_LEN * hd * 2)          # KV 버퍼
print(f"스텝마다 읽는 양 ≈ {step_bytes / 1e6:.0f} MB")
print(f"→ {step_bytes * ours_rate / 1e9:.0f} GB/s (M3 Pro 메모리 대역폭 150 GB/s)")

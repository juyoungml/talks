# %% weights
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

n_params = sum(t.numel() for t in W.values())
print(f"텐서 {len(W)}개, 파라미터 {n_params / 1e6:.0f}M")
for name in [
    "model.embed_tokens.weight",
    "model.layers.0.self_attn.q_proj.weight",
    "model.layers.0.mlp.up_proj.weight",
]:
    print(f"  {name:42} {list(W[name].shape)}")

# %% tokens
tokenizer = AutoTokenizer.from_pretrained(path)
meeting = (Path(__file__).parent / "meeting.txt").read_text()
request = "회의록의 결정 사항 세 가지를 한국어로 정리해줘."
messages = [{"role": "user", "content": f"{request}\n\n{meeting}"}]
text = tokenizer.apply_chat_template(
    messages, tokenize=False,
    add_generation_prompt=True, enable_thinking=False,
)
ids = tokenizer(text, return_tensors="pt").input_ids.to(device)

print(ids.shape)
print(ids[0, :8].tolist())
print([tokenizer.decode(i) for i in ids[0, :8]])

# %% embed
x = W["model.embed_tokens.weight"][ids]
print(x.shape)

# %% attention
T = ids.shape[1]
n_q = config["num_attention_heads"]    # 16
n_kv = config["num_key_value_heads"]   # 8
hd = config["head_dim"]                # 128
eps = config["rms_norm_eps"]

def rms_norm(x, weight):
    xf = x.float()
    xf = xf * torch.rsqrt(xf.pow(2).mean(-1, keepdim=True) + eps)
    return xf.to(x.dtype) * weight

# 위치마다 다른 각도로 q, k를 회전시킨다 (RoPE)
dims = torch.arange(0, hd, 2, device=device).float()
freq = config["rope_theta"] ** (-dims / hd)
angle = torch.arange(T, device=device)[:, None].float() * freq
angle = torch.cat([angle, angle], dim=-1)
cos, sin = angle.cos().to(dtype), angle.sin().to(dtype)

def rope(x):
    left, right = x.chunk(2, dim=-1)
    return x * cos + torch.cat([-right, left], dim=-1) * sin

# 각 위치는 자기 자신과 그 앞만 볼 수 있다
mask = torch.ones(T, T, dtype=torch.bool, device=device).tril()

def attention(x, L):
    p = f"model.layers.{L}.self_attn."
    q = (x @ W[p + "q_proj.weight"].T).view(1, T, n_q, hd)
    k = (x @ W[p + "k_proj.weight"].T).view(1, T, n_kv, hd)
    v = (x @ W[p + "v_proj.weight"].T).view(1, T, n_kv, hd)
    q = rope(rms_norm(q, W[p + "q_norm.weight"]).transpose(1, 2))
    k = rope(rms_norm(k, W[p + "k_norm.weight"]).transpose(1, 2))
    v = v.transpose(1, 2)
    # q 헤드 16개가 k, v 헤드 8개를 둘씩 나눠 쓴다
    k = k.repeat_interleave(n_q // n_kv, dim=1)
    v = v.repeat_interleave(n_q // n_kv, dim=1)
    scores = (q @ k.transpose(-1, -2)) * hd**-0.5
    scores = scores.masked_fill(~mask, float("-inf"))
    out = scores.float().softmax(-1).to(dtype) @ v
    out = out.transpose(1, 2).reshape(1, T, -1)
    return out @ W[p + "o_proj.weight"].T

# %% block
def mlp(x, L):
    p = f"model.layers.{L}.mlp."
    gate = x @ W[p + "gate_proj.weight"].T
    up = x @ W[p + "up_proj.weight"].T
    return (F.silu(gate) * up) @ W[p + "down_proj.weight"].T

def block(x, L):
    p = f"model.layers.{L}."
    h = rms_norm(x, W[p + "input_layernorm.weight"])
    x = x + attention(h, L)
    h = rms_norm(x, W[p + "post_attention_layernorm.weight"])
    x = x + mlp(h, L)
    return x

print(block(x, 0).shape)

# %% logits
def forward(ids):
    x = W["model.embed_tokens.weight"][ids]
    for L in range(config["num_hidden_layers"]):
        x = block(x, L)
    x = rms_norm(x[:, -1], W["model.norm.weight"])
    # 출력 행렬은 입력 embedding과 같은 가중치다
    return x @ W["model.embed_tokens.weight"].T

logits = forward(ids)
print(logits.shape)
probs = logits[0].float().softmax(-1)
for p, i in zip(*probs.topk(5)):
    print(f"{i.item():>6}  {tokenizer.decode(i)!r:8} {p.item():6.1%}")

# %% timing
def sync():
    if device == "mps":
        torch.mps.synchronize()

times = []
for _ in range(4):
    sync()
    start = time.perf_counter()
    next_id = forward(ids).argmax(-1)
    sync()
    times.append((time.perf_counter() - start) * 1000)

ms = sorted(times[1:])[1]  # 첫 실행은 버리고 중앙값
print(f"입력 {T}토큰 → 첫 토큰 {tokenizer.decode(next_id)!r}: {ms:.0f} ms")

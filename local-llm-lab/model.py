"""Qwen3 decoder forward, written with PyTorch tensor operations."""
import json
from pathlib import Path
from types import SimpleNamespace

import torch
from safetensors.torch import load_file
from torch import nn
from torch.nn import functional as F

MODEL_ID = "Qwen/Qwen3-0.6B"


def load_config(path):
    return SimpleNamespace(**json.loads((Path(path) / "config.json").read_text()))


class RMSNorm(nn.Module):
    def __init__(self, size, eps):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(size))
        self.eps = eps

    def forward(self, x):
        xf = x.float()
        return (xf * (xf.square().mean(-1, keepdim=True) + self.eps).rsqrt()).to(x.dtype) * self.weight


def rope(x, cos, sin):
    left, right = x.chunk(2, dim=-1)
    return x * cos + torch.cat((-right, left), dim=-1) * sin


class Attention(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.q_heads = c.num_attention_heads
        self.kv_heads = c.num_key_value_heads
        self.head_dim = c.head_dim
        self.q_proj = nn.Linear(c.hidden_size, self.q_heads * c.head_dim, bias=False)
        self.k_proj = nn.Linear(c.hidden_size, self.kv_heads * c.head_dim, bias=False)
        self.v_proj = nn.Linear(c.hidden_size, self.kv_heads * c.head_dim, bias=False)
        self.o_proj = nn.Linear(self.q_heads * c.head_dim, c.hidden_size, bias=False)
        self.q_norm = RMSNorm(c.head_dim, c.rms_norm_eps)
        self.k_norm = RMSNorm(c.head_dim, c.rms_norm_eps)

    def forward(self, x, cos, sin, mask, cache, layer, start, use_sdpa):
        batch, length, _ = x.shape
        q = self.q_norm(self.q_proj(x).view(batch, length, self.q_heads, self.head_dim))
        k = self.k_norm(self.k_proj(x).view(batch, length, self.kv_heads, self.head_dim))
        v = self.v_proj(x).view(batch, length, self.kv_heads, self.head_dim)
        q = rope(q.transpose(1, 2), cos, sin)
        k = rope(k.transpose(1, 2), cos, sin)
        v = v.transpose(1, 2)
        if cache is not None:
            k, v = cache.update(layer, start, k, v)

        # Store 8 heads in the cache. Expand only at the attention boundary.
        repeats = self.q_heads // self.kv_heads
        k = k.repeat_interleave(repeats, dim=1)
        v = v.repeat_interleave(repeats, dim=1)
        if use_sdpa:
            output = F.scaled_dot_product_attention(q, k, v, attn_mask=mask)
        else:
            scores = (q @ k.transpose(-1, -2)) * (self.head_dim ** -0.5)
            scores = scores.masked_fill(~mask, float("-inf"))
            output = scores.float().softmax(-1).to(q.dtype) @ v
        return self.o_proj(output.transpose(1, 2).reshape(batch, length, -1))


class MLP(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.gate_proj = nn.Linear(c.hidden_size, c.intermediate_size, bias=False)
        self.up_proj = nn.Linear(c.hidden_size, c.intermediate_size, bias=False)
        self.down_proj = nn.Linear(c.intermediate_size, c.hidden_size, bias=False)

    def forward(self, x):
        return self.down_proj(F.silu(self.gate_proj(x)) * self.up_proj(x))


class Block(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.input_layernorm = RMSNorm(c.hidden_size, c.rms_norm_eps)
        self.self_attn = Attention(c)
        self.post_attention_layernorm = RMSNorm(c.hidden_size, c.rms_norm_eps)
        self.mlp = MLP(c)

    def forward(self, x, *attention_args):
        x = x + self.self_attn(self.input_layernorm(x), *attention_args)
        return x + self.mlp(self.post_attention_layernorm(x))


class Qwen3(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.config = c
        self.embed_tokens = nn.Embedding(c.vocab_size, c.hidden_size)
        self.layers = nn.ModuleList([Block(c) for _ in range(c.num_hidden_layers)])
        self.norm = RMSNorm(c.hidden_size, c.rms_norm_eps)

    def forward(self, ids, cache=None, start=0, use_sdpa=False, all_logits=False):
        length = ids.shape[1]
        positions = torch.arange(start, start + length, device=ids.device)
        keys = torch.arange(start + length, device=ids.device)
        mask = keys[None, :] <= positions[:, None]
        dims = torch.arange(0, self.config.head_dim, 2, device=ids.device, dtype=torch.float32)
        frequencies = self.config.rope_theta ** (-dims / self.config.head_dim)
        angles = positions[:, None] * frequencies[None, :]
        angles = torch.cat((angles, angles), dim=-1)
        x = self.embed_tokens(ids)
        cos, sin = angles.cos().to(x.dtype), angles.sin().to(x.dtype)
        for layer, block in enumerate(self.layers):
            x = block(x, cos, sin, mask, cache, layer, start, use_sdpa)
        # The LM head shares the embedding weights in Qwen3-0.6B.
        return F.linear(self.norm(x if all_logits else x[:, -1:]), self.embed_tokens.weight)


def load_model(path, device, dtype):
    config = load_config(path)
    weights = load_file(str(Path(path) / "model.safetensors"))
    state = {name.removeprefix("model."): value for name, value in weights.items() if name != "lm_head.weight"}
    with torch.device("meta"):
        model = Qwen3(config)
    model.load_state_dict(state, strict=True, assign=True)
    return model.to(device=device, dtype=dtype).eval()

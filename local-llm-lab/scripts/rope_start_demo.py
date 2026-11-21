"""RoPE 위치를 start부터 매기지 않으면 어떻게 되는지 보여 준다 (4강 s3r 장면).

steps/04_kv_cache.py의 모델 부분을 그대로 가져와서, 같은 회의록 프롬프트로
greedy 48토큰을 두 번 생성한다.

- 바른 쪽: decode 스텝마다 RoPE 위치 = start (638, 639, ...)
- 틀린 쪽: mask는 그대로 두고, decode 스텝의 RoPE 위치만 늘 0

캐시의 k는 이미 0 ... 637번 위치로 돌려 저장돼 있으므로, 새 토큰을 0번으로
돌리면 거리 정보가 어긋나 출력이 무너진다.

    cd local-llm-lab && uv run python scripts/rope_start_demo.py
"""
from pathlib import Path

import torch

STEP = Path(__file__).resolve().parents[1] / "steps" / "04_kv_cache.py"
src = STEP.read_text()
head = src.split("# %% generate")[0]  # setup + model 부분만
__file__ = str(STEP)  # 04_kv_cache.py 안의 Path(__file__) 경로가 맞도록
exec(head)


def fwd(ids, cache, start, rope_start):
    T = ids.shape[1]
    cos, sin = rope_tables(torch.arange(rope_start, rope_start + T, device=device))
    mask = causal_mask(T, start)
    x = W["model.embed_tokens.weight"][ids]
    for L in range(n_layers):
        x = block(x, L, cos, sin, mask, cache)
    x = rms_norm(x[:, -1], W["model.norm.weight"])
    return x @ W["model.embed_tokens.weight"].T


EOS = tokenizer.convert_tokens_to_ids("<|im_end|>")


def run(wrong):
    cache = new_cache()
    logits = fwd(ids, cache, 0, 0)
    pos = ids.shape[1]
    out, top = [], []
    for _ in range(48):
        p = torch.softmax(logits.float(), -1)[0]
        nid = logits.argmax(-1, keepdim=True)
        top.append((tokenizer.decode([nid.item()]), round(p.max().item() * 100, 1)))
        if nid.item() == EOS:
            break
        out.append(nid.item())
        logits = fwd(nid, cache, pos, 0 if wrong else pos)
        pos += 1
    return out, top


a, ta = run(False)
b, tb = run(True)
print("T =", ids.shape[1])
print("RIGHT:", repr(tokenizer.decode(a)))
print("WRONG:", repr(tokenizer.decode(b)))
d = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), None)
print("first diff at", d, "right", ta[d] if d is not None else None, "wrong", tb[d] if d is not None else None)
print("wrong top list", tb[:12])

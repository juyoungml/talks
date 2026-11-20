"""Run steps/01_first_token.py and dump the values the site visualizes.

    HF_HUB_OFFLINE=1 uv run python scripts/build_site_data.py
"""
import json
import runpy
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[1]
g = runpy.run_path(str(ROOT / "steps/01_first_token.py"))
tok, W, ids, config = g["tokenizer"], g["W"], g["ids"], g["config"]

# 템플릿 전후, 토큰
ids_list = ids[0].tolist()
pieces = [tok.decode([i]) for i in ids_list]

# 사전에 없는 글자는 바이트 조각 여러 개로 쪼개진다. 혼자 디코딩하면 "�"이 되는
# 연속 조각을 묶어서, 합치면 어떤 글자가 되는지 기록한다.
parts = {}
i = 0
while i < len(ids_list):
    if "�" not in pieces[i]:
        i += 1
        continue
    for j in range(i + 1, min(i + 4, len(ids_list)) + 1):
        whole = tok.decode(ids_list[i:j])
        if "�" not in whole:
            for k in range(i, j):
                parts[k] = [whole.strip(), k - i + 1, j - i]
            i = j
            break
    else:
        i += 1

# lm head: 마지막 위치 벡터 h 와 몇몇 토큰의 embedding 행
with torch.no_grad():
    x = W["model.embed_tokens.weight"][ids]
    for L in range(config["num_hidden_layers"]):
        x = g["block"](x, L)
    h = g["rms_norm"](x[:, -1], W["model.norm.weight"])[0]
    logits = (h @ W["model.embed_tokens.weight"].T).float()
order = logits.argsort(descending=True)
rank = torch.empty_like(order)
rank[order] = torch.arange(len(order), device=order.device)
probs = logits.softmax(-1)


def single(text):
    out = tok.encode(text, add_special_tokens=False)
    return out[0] if len(out) == 1 else None


picked = order[:5].tolist()
for extra in [" 데모", " 회의", "Hello"]:
    i = single(extra)
    if i is not None and i not in picked:
        picked.append(i)
picked.append(order[-1].item())

E = W["model.embed_tokens.weight"]
rows = [{
    "id": i,
    "text": tok.decode([i]),
    "logit": round(logits[i].item(), 2),
    "prob": probs[i].item(),
    "rank": rank[i].item() + 1,
    "vec": [round(v, 3) for v in E[i].float().tolist()],
} for i in picked]

data = {
    "request": g["request"],
    "meeting": g["meeting"],
    "template": g["text"],
    "ids": ids_list,
    "pieces": pieces,
    "parts": parts,
    "vocab": E.shape[0],
    "hidden": E.shape[1],
    "layers": config["num_hidden_layers"],
    "h": [round(v, 3) for v in h.float().tolist()],
    "rows": rows,
}
out = ROOT / "site/data/ch01.js"
out.parent.mkdir(exist_ok=True)
out.write_text("window.CH01 = " + json.dumps(data, ensure_ascii=False) + ";\n")
print(f"wrote {out} ({out.stat().st_size / 1024:.0f} KB)")
for r in rows:
    print(r["id"], repr(r["text"]), r["logit"], f"{r['prob']:.2%}", "rank", r["rank"])


# ── 터미널 재생용: 02장(처음 버전)과 09장(마지막 버전)의 실제 생성 타이밍 ──
def replay(step, max_new, label):
    s = runpy.run_path(str(ROOT / f"steps/{step}.py"))
    out, times = s["generate"](s["ids"], max_new=max_new)
    events, shown = [], ""
    for k in range(len(out)):
        text = tok.decode(out[: k + 1])
        if text.endswith("�"):
            continue
        events.append([round(times[k]), text[len(shown):]])
        shown = text
    first = times[0]
    rate = (len(times) - 1) / (times[-1] - first) * 1000
    return {
        "command": f"uv run python steps/{step}.py",
        "prompt": f"{g['request']}\n… (회의록 38줄)",
        "events": events,
        "stats": f"\n\n[{label}] 첫 토큰 {first:.0f} ms · 이후 {rate:.1f} tok/s",
    }


replays = {"ch02": replay("02_generate", 64, "02장"), "ch09": replay("09_compare", 300, "09장")}
out = ROOT / "site/data/replays.js"
out.write_text("window.REPLAYS = " + json.dumps(replays, ensure_ascii=False) + ";\n")
print(f"wrote {out}")
for k, v in replays.items():
    print(k, v["stats"].strip(), len(v["events"]), "events")

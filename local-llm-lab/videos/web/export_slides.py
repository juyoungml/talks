"""강의 영상 화면을 슬라이드로: 표지·목차(cover.html) 다음에, 장면마다 마지막(다 그려진) 화면 한 장, 소제목 카드마다 한 장
  → slides/course_slides.pdf, site/slides/NNN.webp + manifest.json (site/slides.html이 읽음), slides/script.md (쪽별 발표 대본)

자막과 진행 막대는 숨깁니다. 각 장의 video.html(build.py가 만든 것)과 out/timeline.json을 씁니다.

  cd local-llm-lab/videos/web && uv run --no-project --with playwright --with pillow python export_slides.py [ch01 ch02 ...]
"""
import io
import json
import sys
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "slides" / "course_slides.pdf"
WEB = ROOT / "site" / "slides"
SCRIPT = ROOT / "slides" / "script.md"
COVER_TALK = {
    "cover": ["PyTorch로 Ollama 만들기를 시작합니다.",
              "Qwen3-0.6B 추론 엔진을 직접 짜고, 느린 곳을 하나씩 고쳐서 Ollama와 같은 속도까지 가 보겠습니다.",
              "처음 만든 엔진은 3.6 tok/s였고 마지막에는 92.2 tok/s가 됩니다. 같은 맥의 Ollama(FP16)는 87 tok/s입니다.",
              "사이트, 영상, 코드는 화면의 QR 코드로 들어갈 수 있습니다."],
    "toc": ["전체는 9강입니다.",
            "1, 2강에서 첫 토큰을 꺼내고 답을 끝까지 써 봅니다. 3강에서 어디가 느린지 잽니다.",
            "4강부터 8강까지는 하나씩 고칩니다. KV cache, attention 커널, 고정 버퍼, 컴파일, INT8 순서입니다.",
            "9강에서 다시 Ollama와 같은 조건으로 비교합니다."],
}
FADE = 0.45  # engine.js와 같은 값
HIDE = "#sub,#bar{display:none!important}"


def times(tl, final):
    """(시각, 설명) 목록: 소제목 카드가 다 보인 순간, 장면이 다 그려지고 사라지기 직전.
    마지막 강이 아니면 끝의 '다음 강' 예고 장면은 바로 뒤 강의 첫 장과 겹치므로 뺍니다."""
    scenes = tl["scenes"] if final else tl["scenes"][:-1]
    scenes = [s for s in scenes if s.get("type") != "end"]  # '링크는 설명란에' 같은 영상 전용 끝 화면은 PDF에 넣지 않습니다
    out, last = [], tl["scenes"][-1]
    for s in scenes:
        if s.get("card"):
            out.append((s["card"][1] - 0.4, f"{s['id']} 카드"))
        out.append((s["end"] - (0.05 if s is last else FADE + 0.05), s["id"]))
    return out


def narration(ch):
    """장면 id → 자막 문장 목록 (script.json)."""
    sc = json.loads((HERE / ch / "script.json").read_text(encoding="utf-8"))
    return sc["title"], {s["id"]: [l["sub"] for l in s.get("lines", [])] for s in sc["scenes"]}


def main(chs):
    pages, meta = [], []  # meta: 쪽마다 {ch, label, title, talk}
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        # 표지와 목차 (cover.html)
        pg.goto((HERE / "cover.html").as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        for pid in ("cover", "toc"):
            pg.evaluate(f"document.querySelectorAll('.page').forEach(e => e.classList.toggle('on', e.id === '{pid}'))")
            pages.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
            meta.append({"ch": "", "label": {"cover": "표지", "toc": "목차"}[pid], "talk": COVER_TALK[pid]})
            print(f"{len(pages):3d}  {pid}")
        for ch in chs:
            d = HERE / ch
            tl = json.loads((d / "out" / "timeline.json").read_text(encoding="utf-8"))
            pg.goto((d / "video.html").as_uri(), wait_until="networkidle")
            pg.add_style_tag(content=HIDE)
            pg.evaluate("document.fonts.ready.then(() => window.seek(0))")
            title, lines = narration(ch)
            shown = set()
            chap = {x["id"]: x.get("chapter") or "도입" for x in tl["scenes"]}
            for t, label in times(tl, ch == chs[-1]):
                pg.evaluate(f"seek({t})")
                pages.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
                card = label.endswith(" 카드")
                sid = label.split()[0]
                talk = [] if card else lines.get(sid, [])
                shown.add(sid)
                meta.append({"ch": ch, "title": title, "label": chap[sid] + (" 카드" if card else ""), "talk": talk})
                print(f"{len(pages):3d}  {ch} {label} @{t:.2f}")
            # PDF에서 뺀 '다음 강' 예고·끝 화면의 말은 그 강 마지막 쪽에 붙입니다
            for sid, ls in lines.items():
                if sid not in shown:
                    meta[-1]["talk"] = meta[-1]["talk"] + ls
        b.close()
    pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=144, quality=90)
    print(f"{OUT}: {len(pages)}쪽")
    WEB.mkdir(parents=True, exist_ok=True)
    for f in WEB.glob("*.webp"):
        f.unlink()
    for i, im in enumerate(pages, 1):
        im.save(WEB / f"{i:03d}.webp", quality=82, method=6)
    (WEB / "manifest.json").write_text(json.dumps(
        [{"src": f"{i:03d}.webp", "ch": m["ch"], "title": m.get("title", ""), "label": m["label"], "talk": [fix(t) for t in m["talk"] if fix(t)]}
         for i, m in enumerate(meta, 1)], ensure_ascii=False, indent=1), encoding="utf-8")
    write_script(meta)


TALK_FIX = {  # 영상에서만 맞는 말을 발표용으로
    "첫 토큰 하나에서 시작한 실험실은, 여기까지입니다.": "첫 토큰 하나에서 시작한 여정은 여기까지입니다.",
    "글과 코드는 사이트에 모두 있습니다. 링크는 설명란에 남겨 두었습니다.": "글과 코드, 영상은 처음 화면의 QR 코드 사이트에 모두 있습니다.",
    "처음부터 다시 보시려면, 1강부터 보시면 됩니다.": "",
}


def fix(t):
    for a, b in TALK_FIX.items():
        t = t.replace(a, b)
    return t.strip()


def write_script(meta):
    out = ["# PyTorch로 Ollama 만들기 · 발표 대본", "",
           "`course_slides.pdf`와 사이트의 슬라이드 보기 쪽 번호에 맞춘 대본입니다. 문장은 강의 영상 내레이션을 바탕으로 했습니다.",
           "소제목 카드 쪽은 넘기기만 합니다.", ""]
    cur = None
    for i, m in enumerate(meta, 1):
        if m["ch"] != cur:
            cur = m["ch"]
            out += ["", f"## {m['title']}" if cur else "## 시작", ""]
        head = f"**{i}쪽** · {m['label']}"
        out.append(head + ("  (카드, 넘김)" if not m["talk"] and m["label"].endswith("카드") else ""))
        out += [""] + [f"> {fix(t)}" for t in m["talk"] if fix(t)] + [""] if m["talk"] else [""]
    SCRIPT.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
    print(f"{SCRIPT}: {len(meta)}쪽")


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(p.name for p in HERE.glob("ch0*") if (p / "video.html").exists()))

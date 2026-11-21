"""강의 영상 화면을 슬라이드로: 표지·목차(cover.html) 다음에, 장면마다 마지막(다 그려진) 화면 한 장, 소제목 카드마다 한 장 → slides/course_slides.pdf

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
OUT = HERE.parents[1] / "slides" / "course_slides.pdf"
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


def main(chs):
    pages = []
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        # 표지와 목차 (cover.html)
        pg.goto((HERE / "cover.html").as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        for pid in ("cover", "toc"):
            pg.evaluate(f"document.querySelectorAll('.page').forEach(e => e.classList.toggle('on', e.id === '{pid}'))")
            pages.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
            print(f"{len(pages):3d}  {pid}")
        for ch in chs:
            d = HERE / ch
            tl = json.loads((d / "out" / "timeline.json").read_text(encoding="utf-8"))
            pg.goto((d / "video.html").as_uri(), wait_until="networkidle")
            pg.add_style_tag(content=HIDE)
            pg.evaluate("document.fonts.ready.then(() => window.seek(0))")
            for t, label in times(tl, ch == chs[-1]):
                pg.evaluate(f"seek({t})")
                pages.append(Image.open(io.BytesIO(pg.screenshot())).convert("RGB"))
                print(f"{len(pages):3d}  {ch} {label} @{t:.2f}")
        b.close()
    pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=144, quality=90)
    print(f"{OUT}: {len(pages)}쪽")


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(p.name for p in HERE.glob("ch0*") if (p / "video.html").exists()))

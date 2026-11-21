"""최종 썸네일 9장 (1280×720) → thumbs_final/chNN.png

- 1·3~8강: 결과 한 문장 + 그림 하나 (thumbs2.py의 그림을 그대로 씀)
- 2·9강: 영상 속 실제 터미널 경주 화면 두 개를 나란히 (assets/chNN_left|right.png)
- 모두 왼쪽 위에 'N강' 배지

  cd local-llm-lab/videos/youtube && uv run --no-project --with playwright python thumbs_final.py
"""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

import thumbs2

HERE = Path(__file__).resolve().parent
OUT = HERE / "thumbs_final"
SERIES = "Ollama 안을 열어보자"   # 코스 이름을 바꾸면 여기만 고치면 됩니다


def img(name):
    return "data:image/png;base64," + base64.b64encode((HERE / "assets" / name).read_bytes()).decode()


BADGE_CSS = """
.badge i{font-family:"Pretendard Variable",Pretendard,sans-serif;font-weight:800;font-size:26px;padding:7px 14px}
"""


def badge(n):
    return f'<div class="badge"><i>{int(n)}강</i>{SERIES}</div>'


def a_page(num, lines, vis):
    hook = "".join(f"<span>{l}</span>" for l in lines)
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{thumbs2.CSS}{BADGE_CSS}</style></head><body>
{badge(num)}<div class="hook">{hook}</div><div class="vis">{vis}</div></body></html>"""


C_CSS = """
body{background:#141312;color:#f3efe8}
.badge{color:#a39c90}
.term{position:absolute;top:104px;width:592px;height:420px;border-radius:16px;overflow:hidden;box-shadow:0 0 0 2px #2c2a27}
.term img{display:block;width:100%;height:100%;object-fit:cover;object-position:left top}
.term.l{left:36px}.term.r{right:36px}
.tag{position:absolute;top:122px;z-index:2;font-size:34px;font-weight:900;padding:8px 18px;border-radius:12px;letter-spacing:-.03em;color:#fff}
.tag.l{left:56px}.tag.r{right:56px}
.tag.g{background:#3f7d3a}.tag.o{background:#c2410c}.tag.k{background:#5f5a52}
.shade{position:absolute;left:0;right:0;bottom:0;height:330px;background:linear-gradient(180deg,rgba(20,19,18,0),#141312 55%)}
.h{position:absolute;left:0;right:0;bottom:44px;text-align:center;font-weight:900;font-size:112px;letter-spacing:-.05em;line-height:1}
.h em{font-style:normal;color:#f59e5b}
.h span{display:inline-block;white-space:nowrap}
"""


def c_page(num, left, right, tag_l, tag_r, text):
    (tl, cl), (tr, cr) = tag_l, tag_r
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{thumbs2.CSS}{BADGE_CSS}{C_CSS}</style></head><body>
{badge(num)}
<div class="term l"><img src="{img(left)}"></div><div class="term r"><img src="{img(right)}"></div>
<div class="tag l {cl}">{tl}</div><div class="tag r {cr}">{tr}</div>
<div class="shade"></div><div class="h"><span>{text}</span></div></body></html>"""


C_THUMBS = {
    "02": ("ch02_left.png", "ch02_right.png", ("Ollama · 다 씀", "g"), ("내 코드 · 두 줄", "o"), "같이 출발했는데 <em>24배</em>"),
    "09": ("ch09_left.png", "ch09_right.png", ("Ollama 87 tok/s", "k"), ("내 코드 92 tok/s", "o"), "24배 느리던 코드가 <em>나란히</em>"),
}


def main():
    OUT.mkdir(exist_ok=True)
    pages = []
    for num, lines, vis in thumbs2.THUMBS:
        pages.append((num, c_page(num, *C_THUMBS[num]) if num in C_THUMBS else a_page(num, lines, vis), num not in C_THUMBS))
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        for num, html, is_a in pages:
            pg.set_content(html, wait_until="networkidle")
            pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(200)
            if is_a:
                pg.evaluate("""() => { const h = document.querySelector('.hook'); let f = 104;
                    const wide = () => [...h.children].some(s => s.scrollWidth > 570);
                    while (wide() && f > 64) { f -= 4; h.style.fontSize = f + 'px'; } }""")
            else:
                pg.evaluate("""() => { const h = document.querySelector('.h'); let f = 112;
                    const s = h.firstElementChild; while (s.offsetWidth > 1200 && f > 64) { f -= 4; h.style.fontSize = f + 'px'; } }""")
            # 글자가 상자나 화면 밖으로 넘치면 알려 준다
            bad = pg.evaluate("""() => { const out = [], W = innerWidth, H = innerHeight;
                for (const el of document.body.querySelectorAll('*')) {
                    const r = el.getBoundingClientRect();
                    if (!r.width) continue;
                    if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1) out.push('화면 밖: ' + el.className + ' ' + el.textContent.trim().slice(0, 20));
                    const cs = getComputedStyle(el);
                    if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 && cs.display !== 'inline')
                        out.push('상자 넘침: ' + el.className + ' ' + el.textContent.trim().slice(0, 20));
                    const p = el.parentElement;
                    if (p && p !== document.body && el.textContent.trim() && !el.closest('.term')) {
                        const q = p.getBoundingClientRect();
                        if (r.right > q.right + 1 || r.left < q.left - 1) out.push('부모 밖: ' + (el.className || el.tagName) + ' ' + el.textContent.trim().slice(0, 20));
                    }
                }
                return out; }""")
            if bad: print(f"  ch{num} 넘침:", *bad, sep="\n    ")
            pg.screenshot(path=str(OUT / f"ch{num}.png"))
            print(f"thumbs_final/ch{num}.png")
        b.close()


if __name__ == "__main__":
    main()

"""유튜브 썸네일 2안 (1280×720) → thumbs2/chNN.png

1안(thumbs.py)과 다른 점: 글자는 2~4단어 한 문장, 오른쪽은 숫자 카드 대신 그림 하나.
장 번호는 왼쪽 위 작은 배지로만 둔다.
  cd local-llm-lab/videos/youtube && uv run --no-project --with playwright python thumbs2.py
"""
import html
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "thumbs2"
E = html.escape


def race(rows, unit="tok/s"):
    """rows: [(라벨, 값, 강조?)] → 가로 막대 경주"""
    mx = max(v for _, v, _ in rows)
    out = []
    for label, v, hi in rows:
        w = max(4, v / mx * 100)
        out.append(f'<div class="r{" hi" if hi else ""}"><b>{E(label)}</b><div class="track"><i style="width:{w:.1f}%"></i></div>'
                   f'<span>{v:g}<small>{unit}</small></span></div>')
    return f'<div class="race">{"".join(out)}</div>'


def grid():
    cells = []
    for r in range(6):
        for c in range(9):
            if c > 2 + r: cls = "e"
            elif c == 2 + r: cls = "n"
            else: cls = "x"
            cells.append(f'<i class="{cls}"></i>')
    return f'<div class="grid">{"".join(cells)}</div><div class="cap"><i class="x"></i>했던 계산을 또 <i class="n"></i>새 계산</div>'


def ops():
    many = "".join('<i></i>' for _ in range(27))
    few = "".join('<i class="hi"></i>' for _ in range(4))
    return (f'<div class="ops"><div><b>손으로 짠 attention</b><div class="chips">{many}</div><span>27</span></div>'
            f'<div><b>SDPA</b><div class="chips">{few}</div><span class="hi">4</span></div></div>')


def code(lines, hl):
    rows = "".join(f'<div class="{"hl" if i == hl else ""}">{l}</div>' for i, l in enumerate(lines))
    return f'<div class="code">{rows}</div>'


def file_token():
    return ('<div class="ft"><div class="file"><b>model<br>.safetensors</b><span>1.5 GB · 행렬 311개</span></div>'
            '<div class="arrow">→</div><div class="tok"><span>1</span><small>첫 토큰 · 60%</small></div></div>')


def ceiling():
    return ('<div class="ceil"><div class="line"><span>천장 ≈ 125 tok/s</span></div>'
            '<div class="bars"><div style="height:69.6%"><b>87</b><span>Ollama<br>FP16</span></div>'
            '<div class="hi" style="height:73.6%"><b>92</b><span>우리<br>INT8</span></div></div>'
            '<div class="note">150 GB/s ÷ 1.2 GB</div></div>')


THUMBS = [
    ("01", ["Ollama를", "<em>직접 만들어</em>", "봤습니다"], file_token()),
    ("02", ["Ollama보다", "<em>24배</em> 느리다"], race([("Ollama", 86.8, False), ("우리", 3.6, True)])),
    ("03", ["같은 계산", "<em>46번</em> 반복 중"], grid()),
    ("04", ["KV cache로", "<em>10배</em>"], race([("전", 3.6, False), ("후", 37.9, True)])),
    ("05", ["다섯 줄을", "<em>한 줄로</em>"], ops()),
    ("06", ["안 빨라지는데", "<em>왜</em> 할까?"], race([("05장", 44.0, False), ("06장", 45.0, True)])),
    ("07", ["한 줄 추가로", "<em>+46%</em>"], code(['<span class="c"># 07장에서 더한 줄</span>',
                                                     'decode = <b>torch.compile</b>(',
                                                     '    forward, dynamic=False)'], 1)),
    ("08", ["Ollama를", "<em>넘었다</em>"], race([("Ollama FP16", 86.8, False), ("우리 INT8", 92.2, True)])),
    ("09", ["속도의 천장은", "<em>어디일까?</em>"], ceiling()),
]

CSS = """
@import url("https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:720px;overflow:hidden}
body{background:#faf8f4;color:#1f1d1a;font-family:"Pretendard Variable",Pretendard,sans-serif;word-break:keep-all;-webkit-font-smoothing:antialiased;position:relative}
:root{--o:#c2410c;--o2:#f59e5b;--ink3:#8d877d;--dark:#1c1b19}
.badge{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:26px;color:#5f5a52;letter-spacing:-.02em}
.badge i{display:block;background:var(--o);color:#fff;font:700 24px/1 "JetBrains Mono",monospace;font-style:normal;padding:8px 12px;border-radius:8px}
.hook{position:absolute;left:64px;top:0;bottom:0;width:590px;display:flex;flex-direction:column;justify-content:center;
  font-weight:900;font-size:104px;line-height:1.08;letter-spacing:-.05em;padding-top:30px}
.hook span{display:block;width:max-content;white-space:nowrap}
.hook em{font-style:normal;color:var(--o)}
.vis{position:absolute;right:52px;top:120px;bottom:72px;width:510px;display:flex;flex-direction:column;justify-content:center}
/* race */
.race{display:flex;flex-direction:column;gap:44px}
.r b{display:block;font-size:34px;font-weight:700;color:#5f5a52;margin-bottom:12px;letter-spacing:-.02em}
.r .track{height:64px;background:#ece7de;border-radius:12px;overflow:hidden}
.r .track i{display:block;height:100%;background:#a39c90;border-radius:12px}
.r.hi .track i{background:var(--o)}
.r.hi b{color:var(--o)}
.r span{display:block;font:700 44px/1 "JetBrains Mono",monospace;margin-top:12px;letter-spacing:-.04em}
.r span small{font-size:24px;color:var(--ink3);margin-left:8px;font-weight:500}
/* grid */
.grid{display:grid;grid-template-columns:repeat(9,1fr);gap:8px}
.grid i,.cap i{display:block;aspect-ratio:1;border-radius:8px}
.grid .x,.cap .x{background:rgba(220,38,38,.6)} .grid .n,.cap .n{background:var(--o)} .grid .e{background:#ece7de}
.cap{display:flex;align-items:center;gap:12px;margin-top:22px;font-size:26px;font-weight:600;color:#5f5a52}
.cap i{width:26px;margin-left:10px}
/* ops */
.ops{display:flex;flex-direction:column;gap:40px}
.ops > div{display:grid;grid-template-columns:1fr auto;align-items:end;column-gap:20px}
.ops b{grid-column:1/3;font-size:30px;font-weight:700;color:#5f5a52;margin-bottom:12px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips i{width:36px;height:36px;border-radius:8px;background:#a39c90;display:block}
.chips i.hi{background:var(--o);width:56px;height:56px}
.ops span{font:700 96px/1 "JetBrains Mono",monospace;color:#a39c90;letter-spacing:-.05em}
.ops span.hi{color:var(--o)}
/* code */
.code{background:var(--dark);border-radius:24px;padding:40px 28px;font:500 25px/1.7 "JetBrains Mono",monospace;color:#e8e4dc}
.code div{padding:0 12px;border-radius:8px;white-space:pre}
.code .hl{background:rgba(245,158,91,.18);box-shadow:inset 6px 0 0 var(--o2)}
.code b{color:var(--o2)} .code .c{color:#8a8378}
/* file → token */
.ft{display:flex;align-items:center;gap:18px}
.file{background:#fff;border:3px solid #d6cfc3;border-radius:20px;padding:30px 22px;width:230px}
.file b{display:block;font:700 24px/1.3 "JetBrains Mono",monospace;white-space:nowrap}
.file span{display:block;margin-top:14px;font-size:24px;color:var(--ink3);font-weight:600}
.arrow{font-size:72px;color:var(--o);font-weight:800}
.tok{background:var(--dark);border-radius:24px;width:180px;height:230px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.tok span{font:700 140px/1 "JetBrains Mono",monospace;color:var(--o2)}
.tok small{font-size:24px;color:#c9c2b6;margin-top:10px;font-weight:600}
/* ceiling */
.ceil{position:relative;height:100%}
.ceil .line{position:absolute;left:0;right:0;top:40px;border-top:5px dashed var(--o)}
.ceil .line span{position:absolute;right:0;top:-48px;font-size:30px;font-weight:800;color:var(--o)}
.ceil .bars{position:absolute;left:40px;right:40px;bottom:60px;top:40px;display:flex;align-items:flex-end;gap:60px}
.ceil .bars div{flex:1;background:#a39c90;border-radius:14px 14px 0 0;position:relative}
.ceil .bars div.hi{background:var(--dark)}
.ceil .bars b{position:absolute;top:18px;left:0;right:0;text-align:center;font:700 52px "JetBrains Mono",monospace;color:#fff}
.ceil .bars span{position:absolute;bottom:-58px;left:0;right:0;text-align:center;font-size:22px;font-weight:700;color:#5f5a52;line-height:1.15}
.ceil .note{position:absolute;left:40px;bottom:-26px;display:none}
"""


def page(num, lines, vis):
    hook = "".join(f"<span>{l}</span>" for l in lines)
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="badge"><i>{num}</i>Ollama 안을 열어보자</div>
<div class="hook">{hook}</div>
<div class="vis">{vis}</div>
</body></html>"""


def main():
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        for num, lines, vis in THUMBS:
            pg.set_content(page(num, lines, vis), wait_until="networkidle")
            pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(200)
            # 문구가 왼쪽 칸보다 넓으면 글자를 줄인다
            pg.evaluate("""() => { const h = document.querySelector('.hook'); let f = 104;
                const wide = () => [...h.children].some(s => s.scrollWidth > 570);
                while (wide() && f > 64) { f -= 4; h.style.fontSize = f + 'px'; } }""")
            pg.screenshot(path=str(OUT / f"ch{num}.png"))
            print(f"thumbs2/ch{num}.png")
        b.close()


if __name__ == "__main__":
    main()

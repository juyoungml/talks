"""유튜브 썸네일 9장 (1280×720) → thumbs/chNN.png

  cd local-llm-lab/videos/youtube && uv run --no-project --with playwright python thumbs.py
"""
import html
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "thumbs"

# (번호, 큰 문구 줄들, 강조할 줄 번호, 숫자 카드 위, 숫자 카드 큰 값, 숫자 카드 아래)
THUMBS = [
    ("01", ["가중치 파일에서", "첫 토큰 꺼내기"], 1, "첫 토큰까지", "223 ms", "파이썬 몇십 줄로"),
    ("02", ["Ollama보다", "24배 느리다"], 1, "decode 속도", "3.6 tok/s", "Ollama FP16은 86.8"),
    ("03", ["같은 계산을", "46배 헛돌았다"], 1, "48토큰 동안 계산한 위치", "31,752", "처음 보는 위치는 685개"),
    ("04", ["KV cache로", "10배 빨라지기"], 1, "decode 속도", "3.6 → 37.9", "tok/s"),
    ("05", ["attention 커널", "27개 → 4개"], 1, "첫 토큰", "−73 ms", "SDPA 한 줄로"),
    ("06", ["KV cache", "모양 고정하기"], 1, "미리 잡는 버퍼", "1,024칸", "torch.compile 준비"),
    ("07", ["torch.compile", "한 줄의 효과"], 0, "decode 속도", "45 → 66", "tok/s"),
    ("08", ["INT8로", "Ollama FP16 넘기"], 1, "decode 속도", "92 vs 87", "tok/s · 우리 vs Ollama"),
    ("09", ["속도의 천장은", "메모리 대역폭"], 1, "0.6B FP16 천장", "≈125", "tok/s · M3 Pro 150 GB/s"),
]

CSS = """
@import url("https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:720px;overflow:hidden}
body{background:#faf8f4;color:#1f1d1a;font-family:"Pretendard Variable",Pretendard,"Apple SD Gothic Neo",sans-serif;
  word-break:keep-all;-webkit-font-smoothing:antialiased;position:relative}
.bar{position:absolute;left:0;top:0;bottom:0;width:18px;background:#c2410c}
.series{position:absolute;left:84px;top:64px;display:flex;align-items:center;gap:14px;font-weight:700;font-size:28px;letter-spacing:-.02em;color:#5f5a52}
.series i{width:14px;height:14px;border-radius:50%;background:#c2410c;display:block}
.num{position:absolute;left:84px;top:150px;font:700 120px/1 "JetBrains Mono",monospace;color:#c2410c;letter-spacing:-.04em}
.hook{position:absolute;left:84px;top:300px;width:640px;font-weight:800;font-size:76px;line-height:1.14;letter-spacing:-.04em}
.hook span{display:block;white-space:nowrap}
.hook .em{color:#c2410c}
.card{position:absolute;right:64px;top:150px;width:440px;height:440px;border-radius:28px;background:#1c1b19;color:#e8e4dc;
  display:flex;flex-direction:column;justify-content:center;padding:44px}
.card .k{font-size:28px;font-weight:600;color:#a39c90;letter-spacing:-.02em}
.card .v{font:700 76px/1.1 "JetBrains Mono",monospace;color:#f59e5b;letter-spacing:-.05em;margin:22px 0 18px;white-space:nowrap}
.card .s{font-size:26px;font-weight:500;color:#c9c2b6;letter-spacing:-.02em}
.foot{position:absolute;left:84px;bottom:52px;font-size:24px;font-weight:600;color:#8d877d;letter-spacing:-.01em}
"""


def page(num, lines, em, k, v, s):
    hook = "".join(f'<span class="{"em" if i == em else ""}">{html.escape(t)}</span>' for i, t in enumerate(lines))
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="bar"></div>
<div class="series"><i></i>Ollama 안을 열어보자</div>
<div class="num">{num}</div>
<div class="hook">{hook}</div>
<div class="card"><div class="k">{html.escape(k)}</div><div class="v">{html.escape(v)}</div><div class="s">{html.escape(s)}</div></div>
<div class="foot">PyTorch로 LLM 추론 엔진 만들기 · Qwen3-0.6B</div>
</body></html>"""


def main():
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        for t in THUMBS:
            pg.set_content(page(*t), wait_until="networkidle")
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(200)
            # 큰 값이 카드보다 넓으면 글자를 줄인다
            pg.evaluate("""() => { const v = document.querySelector('.card .v'); let f = 76;
                while (v.scrollWidth > v.clientWidth && f > 40) { f -= 2; v.style.fontSize = f + 'px'; } }""")
            pg.screenshot(path=str(OUT / f"ch{t[0]}.png"))
            print("thumbs/ch%s.png" % t[0])
        b.close()


if __name__ == "__main__":
    main()

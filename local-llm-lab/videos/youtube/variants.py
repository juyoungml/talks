"""02장 썸네일 여러 안 → variants/ch02_<안>.png (1280×720)

  cd local-llm-lab/videos/youtube && uv run --no-project --with playwright python variants.py
"""
import base64
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "variants"
RACE = "data:image/png;base64," + base64.b64encode((HERE / "assets" / "ch02_race.png").read_bytes()).decode()

BASE = """
@import url("https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css");
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap");
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1280px;height:720px;overflow:hidden}
body{font-family:"Pretendard Variable",Pretendard,sans-serif;word-break:keep-all;-webkit-font-smoothing:antialiased;position:relative;
  background:#faf8f4;color:#1f1d1a}
:root{--o:#c2410c;--o2:#f59e5b;--dark:#1c1b19;--g:#a39c90}
.mono{font-family:"JetBrains Mono",monospace}
.badge{position:absolute;left:60px;top:52px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:26px;color:#5f5a52}
.badge i{background:var(--o);color:#fff;font:700 24px/1 "JetBrains Mono",monospace;font-style:normal;padding:8px 12px;border-radius:8px}
em{font-style:normal;color:var(--o)}
"""

VARIANTS = {
    # A. 결과 + 막대 (2안)
    "A_result_bars": """
<style>
.h{position:absolute;left:60px;top:200px;font-weight:900;font-size:110px;line-height:1.08;letter-spacing:-.05em}
.v{position:absolute;right:56px;top:170px;width:500px;display:flex;flex-direction:column;gap:46px}
.v b{display:block;font-size:34px;color:#5f5a52;margin-bottom:12px} .v .hi b{color:var(--o)}
.t{height:66px;background:#ece7de;border-radius:12px;overflow:hidden}.t i{display:block;height:100%;background:var(--g)}
.hi .t i{background:var(--o)} .v span{display:block;font:700 44px "JetBrains Mono";margin-top:10px}
</style>
<div class="badge"><i>02</i>Ollama 안을 열어보자</div>
<div class="h">Ollama보다<br><em>24배</em> 느리다</div>
<div class="v"><div><b>Ollama</b><div class="t"><i style="width:100%"></i></div><span>86.8 tok/s</span></div>
<div class="hi"><b>내가 만든 것</b><div class="t"><i style="width:4.2%"></i></div><span>3.6 tok/s</span></div></div>""",

    # B. 강의형: 큰 '2강' + 강의 제목 + 작은 결과
    "B_course": """
<style>
body{background:var(--dark);color:#f3efe8}
.k{position:absolute;left:72px;top:64px;font-size:30px;font-weight:700;color:var(--o2);letter-spacing:-.01em}
.n{position:absolute;left:66px;top:118px;font-weight:900;font-size:200px;line-height:1;letter-spacing:-.06em}
.n small{font-size:110px;margin-left:6px}
.h{position:absolute;left:72px;top:360px;font-weight:800;font-size:84px;line-height:1.12;letter-spacing:-.045em}
.s{position:absolute;left:72px;bottom:64px;font-size:32px;font-weight:600;color:#a39c90}
.s b{color:var(--o2);font-family:"JetBrains Mono",monospace}
.side{position:absolute;right:0;top:0;bottom:0;width:360px;background:var(--o);display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff}
.side b{font:700 120px/1 "JetBrains Mono",monospace;letter-spacing:-.06em}
.side span{font-size:34px;font-weight:700;margin-top:14px}
</style>
<div class="k">PyTorch로 Ollama 만들기</div>
<div class="n">2<small>강</small></div>
<div class="h">한 토큰씩<br>이어 쓰기</div>
<div class="s">결과: <b>3.6 tok/s</b> · Ollama의 1/24</div>
<div class="side"><b>×24</b><span>더 느림</span></div>""",

    # C. 실제 화면: 영상 속 터미널 경주 그대로
    "C_real_screen": f"""
<style>
body{{background:#111}}
.img{{position:absolute;left:0;right:0;top:0;height:720px;background:url({RACE}) center/cover;filter:saturate(.9)}}
.shade{{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.85) 78%)}}
.tag{{position:absolute;top:44px;font-size:40px;font-weight:900;padding:10px 20px;border-radius:12px;letter-spacing:-.03em}}
.l{{left:40px;background:#3f7d3a;color:#fff}} .r{{right:40px;background:var(--o);color:#fff}}
.h{{position:absolute;left:0;right:0;bottom:46px;text-align:center;color:#fff;font-weight:900;font-size:108px;letter-spacing:-.05em;line-height:1}}
.h em{{color:var(--o2)}}
</style>
<div class="img"></div><div class="shade"></div>
<div class="tag l">Ollama: 끝</div><div class="tag r">내 코드: 두 줄</div>
<div class="h">같이 출발했는데 <em>24배</em></div>""",

    # D. 숫자만: 다크 배경 큰 대비
    "D_numbers": """
<style>
body{background:var(--dark);color:#f3efe8}
.row{position:absolute;left:0;right:0;top:150px;display:flex;justify-content:center;align-items:flex-end;gap:56px}
.c{text-align:center}.c b{display:block;font:700 210px/1 "JetBrains Mono",monospace;letter-spacing:-.07em}
.c span{display:block;font-size:40px;font-weight:700;margin-top:18px;color:#a39c90}
.c.us b{color:var(--o2)} .vs{font:700 64px "JetBrains Mono";color:#5f5a52;margin-bottom:90px}
.h{position:absolute;left:0;right:0;bottom:70px;text-align:center;font-weight:800;font-size:52px;letter-spacing:-.03em}
.h em{color:var(--o2)}
</style>
<div class="row"><div class="c"><b>87</b><span>Ollama</span></div><div class="vs">vs</div><div class="c us"><b>3.6</b><span>내가 만든 엔진</span></div></div>
<div class="h">초당 토큰 수. <em>왜 이렇게 느릴까?</em></div>""",

    # E. 질문형: 느린 진행 바 + 질문
    "E_question": """
<style>
.h{position:absolute;left:60px;top:150px;font-weight:900;font-size:120px;line-height:1.05;letter-spacing:-.055em}
.p{position:absolute;left:60px;right:60px;bottom:110px}
.p .row{display:flex;align-items:center;gap:20px;margin-top:22px;font-size:32px;font-weight:700;color:#5f5a52}
.p .row b{width:200px} .p .bar{flex:1;height:44px;background:#ece7de;border-radius:10px;overflow:hidden}
.p .bar i{display:block;height:100%;background:var(--g)} .p .us b{color:var(--o)} .p .us i{background:var(--o)}
.p span{font:700 30px "JetBrains Mono";width:170px;text-align:right}
</style>
<div class="badge"><i>02</i>Ollama 안을 열어보자</div>
<div class="h">내가 만든 LLM,<br><em>왜 이렇게 느리지?</em></div>
<div class="p"><div class="row"><b>Ollama</b><div class="bar"><i style="width:100%"></i></div><span>완료</span></div>
<div class="row us"><b>내 코드</b><div class="bar"><i style="width:4%"></i></div><span>4%</span></div></div>""",

    # F. 담백한 Karpathy형: 코드 + 설명형 제목
    "F_plain_code": """
<style>
.h{position:absolute;left:64px;top:110px;font-weight:800;font-size:76px;line-height:1.15;letter-spacing:-.045em}
.h small{display:block;font-size:34px;font-weight:600;color:#5f5a52;letter-spacing:-.02em;margin-top:16px}
.code{position:absolute;left:64px;right:64px;bottom:64px;background:var(--dark);border-radius:22px;padding:34px 40px;
  font:500 30px/1.6 "JetBrains Mono",monospace;color:#e8e4dc;white-space:pre}
.code b{color:var(--o2);font-weight:700} .code .c{color:#8a8378}
</style>
<div class="h">LLM이 답을 쓰는 반복문,<br>직접 짜 보기<small>PyTorch로 Ollama 만들기 · 2강</small></div>
<div class="code"><span class="c"># 고르고, 붙이고, 다시</span>
<b>while</b> True:
    next_id = greedy(forward(ids))
    ids = torch.cat([ids, next_id], dim=1)</div>""",
}


def main():
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1280, "height": 720})
        for name, body in VARIANTS.items():
            pg.set_content(f'<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>{BASE}</style></head><body>{body}</body></html>',
                           wait_until="networkidle")
            pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(200)
            pg.screenshot(path=str(OUT / f"ch02_{name}.png"))
            print(f"variants/ch02_{name}.png")
        b.close()


if __name__ == "__main__":
    main()

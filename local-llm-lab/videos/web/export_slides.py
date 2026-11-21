"""강의 영상 화면을 슬라이드로: 표지·발표자 소개·목차(cover.html) 다음에, 본 흐름의 장면마다 한 장 (소제목 카드 쪽은 없음)
  → slides/course_slides.pdf, site/slides/NNN.webp + manifest.json (site/slides.html이 읽음), slides/script.md (쪽별 발표 대본)

PDF와 webp(포스터)는 장면의 마지막(다 그려진) 화면입니다. 사이트의 슬라이드 보기는 manifest.json의 steps로
실제 video.html을 iframe에 띄워 문장 단위로 애니메이션을 재생합니다.
자막·진행 막대·소제목 카드, 그리고 정리 장면에서 "noslide"로 표시한 항목은 숨깁니다.
각 장의 video.html(build.py가 만든 것)과 out/timeline.json을 씁니다.

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
    "about": ["잠깐 제 소개를 드리겠습니다. 석주영입니다.",
              "KAIST 전산학부를 졸업하고 AI대학원에서 석사를 마쳤습니다. 지금은 트릴리온랩스에서 일하고 있습니다.",
              "오늘 자료는 juyoung.site/talks에 모두 올려 두었습니다. 슬라이드, 영상, 코드가 다 있습니다.",
              "Threads에서는 juyoung.ai라는 계정으로 AI 이야기를 쉽게 풀어서 쓰고 있습니다. 관심 있으시면 팔로우해 주세요."],
    "scope": ["오늘은 vLLM 같은 최신 서빙 기술을 다루지 않습니다.",
              "대신 LLM 추론이 어떻게 돌아가는지 기초부터 보겠습니다. 가중치 파일에서 첫 토큰을 꺼내고, 한 토큰씩 답을 쓰고, 어디가 느린지 재고, 하나씩 고칩니다.",
              "마지막에는 속도를 정하는 게 결국 메모리 대역폭이라는 데까지 갑니다.",
              "Ollama가 답을 쓰는 원리를 PyTorch 코드 170줄로 직접 짜 보면서 이해하는 게 목표입니다."],
    "toc": ["전체는 9강입니다.",
            "1, 2강에서 첫 토큰을 꺼내고 답을 끝까지 써 봅니다. 3강에서 어디가 느린지 잽니다.",
            "4강부터 8강까지는 하나씩 고칩니다. KV cache, attention 커널, 고정 버퍼, 컴파일, INT8 순서입니다.",
            "9강에서 다시 Ollama와 같은 조건으로 비교합니다."],
}
FADE = 0.45  # engine.js와 같은 값
TAIL = 0.5   # 장면 끝에서 이만큼 앞이 '다 그려진' 마지막 상태 (사라지기 시작하기 전)
HIDE = "#sub,#bar,#chapcard{display:none!important}.noslide{display:none!important}"  # site/slides.html과 같은 값
# 본 흐름과 거리가 먼 장면 (영상에는 남고 슬라이드에서만 뺍니다)
# 실제 실행을 같은 속도로 다시 재생하는 장면: 뷰어가 문장마다 멈추거나 빨리 감지 않고 1배속으로 이어서 재생합니다
REALTIME = {("ch01", "s1"), ("ch02", "s5"), ("ch09", "s3")}

SKIP = {
    "ch02": {"s4", "s7", "s8"},  # UTF-8 바이트 조각, sampling
    "ch03": {"s6"},              # 다음으로 넘어가는 한 줄
    "ch04": {"s9"},              # 연결 장면
    "ch05": {"s6"},              # 4k 길이 곁가지
    "ch06": {"s7"},              # 연결 장면
    "ch07": {"s7", "s8"},        # stride 함정, 연결 장면
    "ch09": {"s2", "s4"},        # 코드 추가분, Ollama API 캐시 우회
}


def keep(tl, ch, final):
    """슬라이드로 쓸 장면. 마지막 강이 아니면 끝의 '다음 강' 예고는 바로 뒤 강의 첫 장과 겹치므로 뺍니다.
    type "end"(링크는 설명란에 같은 영상 전용 끝 화면)도 뺍니다. 새로 생긴 장면 id는 그대로 들어갑니다."""
    out = []
    for s in tl["scenes"]:
        if s["id"] in SKIP.get(ch, ()) or s.get("type") == "end":
            continue
        if s.get("type") == "next" and not final:
            continue
        out.append(s)
    return out


def steps(tl, s, n_lines, drop):
    """문장 경계: b0 = 첫 문장 시작, b1..= 다음 문장들의 시작, 마지막 = 장면 끝 - TAIL.
    drop(빼는 문장 번호, 1부터)의 경계는 넣지 않습니다. 반환: (경계 목록, 남은 문장 번호 목록)"""
    sid, m = s["id"], tl["marks"]
    vis = (s["card"][1] - 0.35) if s.get("card") else s["start"]
    end = round(s["end"] - TAIL, 3)
    starts = []
    for k in range(1, n_lines + 1):
        key = f"{sid}l{k}"
        if key in m and k not in drop:
            starts.append((k, m[key][0]))
    b = [t for _, t in starts if t < end]
    if not b:
        b = [round(vis + FADE, 3)]
    return [round(t, 3) for t in b] + [end], [k for k, t in starts if t < end]


def narration(ch):
    """장면 id → 자막 문장 목록 (script.json)."""
    sc = json.loads((HERE / ch / "script.json").read_text(encoding="utf-8"))
    return sc["title"], {s["id"]: [l["sub"] for l in s.get("lines", [])] for s in sc["scenes"]}


def noslide_lines(s):
    """정리 장면에서 noslide 항목이 나오는 문장 번호."""
    items = (s.get("data") or {}).get("items") or []
    return {it.get("line") or i + 1 for i, it in enumerate(items) if it.get("noslide")}


def shot(pg):
    return Image.open(io.BytesIO(pg.screenshot())).convert("RGB")


def main(chs):
    pages, meta = [], []  # meta: 쪽마다 manifest 항목
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        # 표지와 목차 (cover.html)
        pg.goto((HERE / "cover.html").as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready")
        for pid in ("cover", "about", "scope", "toc"):
            pg.evaluate(f"document.querySelectorAll('.page').forEach(e => e.classList.toggle('on', e.id === '{pid}'))")
            pages.append(shot(pg))
            meta.append({"type": "img", "ch": "", "sid": pid, "title": "", "label": {"cover": "표지", "about": "발표자 소개", "scope": "오늘 다룰 것", "toc": "목차"}[pid],
                         "talk": COVER_TALK[pid]})
            print(f"{len(pages):3d}  {pid}")
        for ch in chs:
            d = HERE / ch
            final = ch == chs[-1]
            tl = json.loads((d / "out" / "timeline.json").read_text(encoding="utf-8"))
            pg.goto((d / "video.html").as_uri(), wait_until="networkidle")
            pg.add_style_tag(content=HIDE)
            pg.evaluate("document.fonts.ready.then(() => window.seek(0))")
            title, lines = narration(ch)
            label, labels = "도입", {}
            for x in tl["scenes"]:
                label = x.get("chapter") or label
                labels[x["id"]] = label
            for s in keep(tl, ch, final):
                sid = s["id"]
                ls = lines.get(sid, [])
                bs, ks = steps(tl, s, len(ls), noslide_lines(s))
                pg.evaluate(f"seek({bs[-1]})")
                pages.append(shot(pg))
                meta.append({"type": "scene", "ch": ch, "sid": sid, "title": title, "label": labels[sid],
                             "steps": bs, "lines": ks, "talk": [ls[k - 1] for k in ks],
                             "realtime": (ch, sid) in REALTIME})
                print(f"{len(pages):3d}  {ch} {sid} @{bs[-1]:.2f}  {len(bs) - 1}단계")
            # 마지막 강의 끝 화면(type end) 인사말은 마지막 쪽 대본 뒤에 붙입니다
            if final:
                for s in tl["scenes"]:
                    if s.get("type") == "end":
                        meta[-1]["extra"] = meta[-1].get("extra", []) + lines.get(s["id"], [])
        b.close()
    pages[0].save(OUT, save_all=True, append_images=pages[1:], resolution=144, quality=90)
    print(f"{OUT}: {len(pages)}쪽")
    WEB.mkdir(parents=True, exist_ok=True)
    for f in WEB.glob("*.webp"):
        f.unlink()
    man = []
    for i, (im, m) in enumerate(zip(pages, meta), 1):
        im.save(WEB / f"{i:03d}.webp", quality=82, method=6)
        e = {"type": m["type"], "src": f"{i:03d}.webp", "ch": m["ch"], "sid": m["sid"], "title": m["title"], "label": m["label"]}
        if m["type"] == "scene":
            e["steps"] = m["steps"]
            if m.get("realtime"):
                e["realtime"] = True
            e["lines"] = m["lines"]  # 문장 번호: 슬라이드 보기가 iframe의 최신 TL.marks로 steps를 다시 계산할 때 씁니다
        e["talk"] = [fix(t) for t in m["talk"]]  # 장면 쪽은 steps와 한 줄씩 맞물리므로 빈 줄도 자리를 지킵니다
        extra = [fix(t) for t in m.get("extra", []) if fix(t)]
        if extra:
            e["extra"] = extra
        if m["type"] == "img":
            e["talk"] = [t for t in e["talk"] if t]
        man.append(e)
    (WEB / "manifest.json").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    write_script(man)


TALK_FIX = {  # 영상에서만 맞는 말을 발표용으로
    "첫 토큰 하나에서 시작한 이 코스는, 여기까지입니다.": "첫 토큰 하나에서 시작한 여정은 여기까지입니다.",
    "글과 코드는 사이트에 모두 있습니다. 링크는 설명란에 남겨 두었습니다.": "글과 코드, 영상은 처음 화면의 QR 코드 사이트에 모두 있습니다.",
    "처음부터 다시 보시려면, 1강부터 보시면 됩니다.": "",
}


def fix(t):
    for a, b in TALK_FIX.items():
        t = t.replace(a, b)
    return t.strip()


def write_script(man):
    out = ["# PyTorch로 Ollama 만들기 · 발표 대본", "",
           "`course_slides.pdf`와 사이트의 슬라이드 보기 쪽 번호에 맞춘 대본입니다. 문장은 강의 영상 내레이션을 바탕으로 했습니다.",
           "사이트에서는 문장 하나마다 → 를 누르면 그 부분의 애니메이션이 재생됩니다.", ""]
    cur = None
    for i, m in enumerate(man, 1):
        if m["ch"] != cur:
            cur = m["ch"]
            out += ["", f"## {m['title']}" if cur else "## 시작", ""]
        out += [f"**{i}쪽** · {m['label']}", ""]
        talk = [t for t in m["talk"] + m.get("extra", []) if t]
        out += [f"> {t}" for t in talk] + [""] if talk else []
    SCRIPT.write_text("\n".join(out).rstrip() + "\n", encoding="utf-8")
    print(f"{SCRIPT}: {len(man)}쪽")


if __name__ == "__main__":
    main(sys.argv[1:] or sorted(p.name for p in HERE.glob("ch0*") if (p / "video.html").exists()))

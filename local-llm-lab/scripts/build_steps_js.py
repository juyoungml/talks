"""steps/*.py 를 site/data/steps.js 로 묶는다.

페이지가 어디서 열리든(site/ 안에서 서버를 띄우든, 파일로 열든) 코드 패널이 뜨도록,
코드를 fetch 대신 이 파일에서 읽는다. steps/ 를 고친 뒤에는 다시 실행한다.

    python3 scripts/build_steps_js.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
steps = {p.stem: p.read_text() for p in sorted((ROOT / "steps").glob("[0-9][0-9]_*.py"))}
out = ROOT / "site/data/steps.js"
out.write_text("window.STEPS = " + json.dumps(steps, ensure_ascii=False) + ";\n")
print(f"wrote {out} ({len(steps)} files)")

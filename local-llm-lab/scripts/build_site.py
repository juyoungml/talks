"""Embed the current lab source and recorded terminal sessions into the static site."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
files = ("lab.py", "engine.py", "model.py", "cache.py", "quant.py", "meeting.txt", "pyproject.toml", "README.md")
sources = {name: (root / name).read_text() for name in files}
outputs = {path.stem: path.read_text().strip() for path in sorted((root / "examples").glob("cp*.txt"))}
data = json.dumps({"sources": sources, "outputs": outputs}, ensure_ascii=False, indent=2)
(root / "dist" / "lab-data.js").write_text(f"const labData = {data};\n")

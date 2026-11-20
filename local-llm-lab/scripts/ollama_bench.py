"""Measure Ollama prefill/decode on the same prompts lab.py uses.

Usage (with `ollama serve` running):
    python3 scripts/ollama_bench.py qwen3:0.6b-fp16 qwen3:0.6b
"""
import json
import statistics
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:11434/api/chat"


def prompt(kind):
    # Keep in sync with prompt_ids() in lab.py.
    meeting = (ROOT / "meeting.txt").read_text().strip()
    if kind == "long":
        details = "\n".join(
            f"논의 {i}. 안건을 검토했다. 추가 검토가 필요한 항목은 다음 회의로 넘긴다." for i in range(1, 25)
        )
        meeting = details + "\n" + meeting
    return f"회의록의 결정 사항 세 가지를 한국어로 정리해줘.\n\n{meeting}"


def call(model, text, n):
    body = json.dumps({
        "model": model, "stream": False, "think": False, "keep_alive": "10m",
        "messages": [{"role": "user", "content": text}],
        "options": {"temperature": 0, "num_predict": n, "seed": 0},
    }).encode()
    req = urllib.request.Request(URL, body, {"Content-Type": "application/json"})
    return json.load(urllib.request.urlopen(req))


def main(models, steps=64, repeats=3):
    for model in models:
        for kind in ("short", "long"):
            call(model, "(0) " + prompt(kind), 8)  # load the model and warm up
            # Ollama reuses a cached prompt prefix, so vary the head of every request.
            rows = [call(model, f"({i + 1}) " + prompt(kind), steps) for i in range(repeats)]
            count = statistics.median(r["prompt_eval_count"] for r in rows)
            prefill = statistics.median(r["prompt_eval_duration"] / 1e6 for r in rows)
            decode = statistics.median(r["eval_duration"] / 1e6 / max(1, r["eval_count"]) for r in rows)
            print(
                f"{model:18} {kind:5} prompt={count:.0f} | first token={prefill:.2f} ms "
                f"| decode={decode:.2f} ms/token ({1000 / decode:.1f} tok/s)"
            )


if __name__ == "__main__":
    main(sys.argv[1:] or ["qwen3:0.6b-fp16"])

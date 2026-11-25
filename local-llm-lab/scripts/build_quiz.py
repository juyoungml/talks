"""course/quizzes/NN.json → site/data/quizzes.js (웹 퀴즈) + course/quizzes/NN.md (읽기용 문서).

JSON이 원본이다. 문항을 고칠 때는 JSON만 고치고 이 스크립트를 다시 돌린다.
    python3 scripts/build_quiz.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
QUIZ_DIR = ROOT / "course" / "quizzes"
OUT_JS = ROOT / "site" / "data" / "quizzes.js"
TYPES = {"choice", "multi", "number", "blanks", "match", "order"}
LETTERS = "abcdefgh"


def validate(d, path):
    qs = d["questions"]
    assert d["pass"] <= len(qs), path
    for i, q in enumerate(qs, 1):
        where = f"{path.name} #{i}"
        t = q["type"]
        assert t in TYPES, f"{where}: type {t}"
        assert q.get("prompt") and q.get("explain"), f"{where}: prompt/explain"
        if t == "choice":
            assert 0 <= q["answer"] < len(q["options"]), where
        elif t == "multi":
            assert q["answer"] and all(0 <= a < len(q["options"]) for a in q["answer"]), where
        elif t == "number":
            assert q["fields"] and all("answer" in f for f in q["fields"]), where
        elif t == "blanks":
            assert q["text"].count("___") == len(q["answer"]), f"{where}: blanks count"
            assert len(set(q["bank"])) == len(q["bank"]), f"{where}: duplicate chips"
            assert all(a in q["bank"] for a in q["answer"]), f"{where}: answer not in bank"
            assert len(set(q["answer"])) == len(q["answer"]), f"{where}: same chip twice"
        elif t == "match":
            assert len(q["pairs"]) >= 2, where
            assert len({b for _, b in q["pairs"]}) == len(q["pairs"]), f"{where}: duplicate right side"
        elif t == "order":
            assert len(q["items"]) >= 2, where


def to_md(d):
    out = [f"# {int(d['chapter'])}강 퀴즈 · {d['title']}", "",
           f"{len(d['questions'])}문항 · {d['pass']}문항 이상 맞히면 통과입니다. {d.get('intro', '')}".rstrip(), "",
           "> 이 문서는 `course/quizzes/{0}.json`에서 생성합니다. 사이트에서 바로 풀고 채점할 수 있습니다: `site/quiz.html#q{0}`".format(d["chapter"]),
           "", "---", ""]
    answers = []
    for i, q in enumerate(d["questions"], 1):
        t = q["type"]
        out.append(f"**{i}.** {q['prompt']}")
        out.append("")
        if q.get("code"):
            out += [f"```{q.get('codeLang', '')}", q["code"], "```", ""]
        if q.get("after"):
            out += [q["after"], ""]
        if t in ("choice", "multi"):
            out += [f"- ({LETTERS[k]}) {o}" for k, o in enumerate(q["options"])] + [""]
            keys = [q["answer"]] if t == "choice" else q["answer"]
            ans = ", ".join(f"({LETTERS[k]})" for k in keys)
        elif t == "number":
            out += [f"- {f['label']}: ____ {f.get('unit', '')}".rstrip() for f in q["fields"]] + [""]
            ans = ", ".join(f"{f['label']} **{f['answer']}{f.get('unit', '')}**" + (f" (±{f['tolerance']})" if f.get("tolerance") else "") for f in q["fields"])
        elif t == "blanks":
            out += [q["text"], "", "보기: " + " · ".join(f"`{b}`" for b in q["bank"]), ""]
            ans = " / ".join(f"**{a}**" for a in q["answer"])
        elif t == "match":
            lefts = [a for a, _ in q["pairs"]]
            rights = sorted(b for _, b in q["pairs"])
            out += ["짝을 지으십시오.", ""] + [f"- {a}" for a in lefts] + ["", "보기: " + " · ".join(rights), ""]
            ans = "; ".join(f"{a} → **{b}**" for a, b in q["pairs"])
        else:  # order
            out += ["순서대로 늘어놓으십시오.", ""] + [f"- {x}" for x in sorted(q["items"])] + [""]
            ans = " → ".join(f"**{x}**" for x in q["items"])
        answers.append(f"{i}. {ans}. {q['explain']}")
    out += ["---", "", "## 정답과 해설", ""] + answers + [""]
    return "\n".join(out)


def main():
    quizzes = []
    for path in sorted(QUIZ_DIR.glob("[0-9][0-9].json")):
        d = json.loads(path.read_text())
        validate(d, path)
        quizzes.append(d)
        path.with_suffix(".md").write_text(to_md(d))
    OUT_JS.write_text("// course/quizzes/*.json 에서 scripts/build_quiz.py 로 생성. 직접 고치지 마십시오.\nwindow.QUIZZES = "
                      + json.dumps(quizzes, ensure_ascii=False, indent=1) + ";\n")
    print(f"{len(quizzes)}강, {sum(len(d['questions']) for d in quizzes)}문항 → {OUT_JS.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

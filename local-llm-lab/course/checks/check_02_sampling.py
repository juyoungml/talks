"""2강 실습 2-1 체커: sample(logits, temperature, top_k, top_p)

사용법
    uv run python course/checks/check_02_sampling.py work/my_sampling.py
    uv run python course/checks/check_02_sampling.py work/my_sampling.py --real

기본 검사는 모델 없이 합성 점수로 돌아갑니다(CPU, 몇 초).
--real은 steps/02_generate.py의 모델 부분을 불러와 회의록 첫 토큰을 1,000번 뽑고
본문 결과('1' 868번, '-' 132번, '회의' 0번)와 같은 분포인지 봅니다.
"""
import argparse
import importlib.util
import math
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parents[2]  # local-llm-lab/


def load_sample(path):
    spec = importlib.util.spec_from_file_location("learner", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if not hasattr(mod, "sample"):
        sys.exit(f"{path}에 sample 함수가 없습니다.")
    return mod.sample


def logits_from_probs(probs, vocab=None, at=None):
    """확률 목록을 점수(log p)로 바꾼다. at을 주면 그 토큰 번호에 놓고 나머지는 아주 낮게."""
    probs = torch.tensor(probs, dtype=torch.float32)
    if vocab is None:
        return probs.log()[None, :]
    out = torch.full((1, vocab), -1e4)
    out[0, torch.tensor(at)] = probs.log()
    return out


def draw(sample, logits, n, **kw):
    torch.manual_seed(0)
    picks = []
    for _ in range(n):
        out = sample(logits.clone(), **kw)
        picks.append(int(out.reshape(-1)[0]))
    return torch.tensor(picks)


def freqs(picks, ids):
    return [(picks == i).float().mean().item() for i in ids]


# 각 검사는 (통과 여부, 설명) 을 돌려준다
def t_shape(sample):
    out = sample(torch.randn(1, 50), temperature=1.0, top_k=10, top_p=0.9)
    ok = (isinstance(out, torch.Tensor) and tuple(out.shape) == (1, 1)
          and out.dtype == torch.long and 0 <= int(out) < 50)
    got = f"{type(out).__name__} {tuple(getattr(out, 'shape', ()))} {getattr(out, 'dtype', '')}"
    return ok, f"반환값이 [1, 1] torch.long 토큰 번호 (받은 값: {got})"


def t_token_ids(sample):
    # 상위 토큰이 0, 1, 2번이 아니라 1000, 7, 42번에 있다
    logits = logits_from_probs([0.5, 0.3, 0.2], vocab=2000, at=[1000, 7, 42])
    picks = draw(sample, logits, 500, temperature=1.0, top_k=3, top_p=1.0)
    bad = sorted(set(picks.tolist()) - {1000, 7, 42})
    return not bad, f"순위가 아니라 토큰 번호를 돌려줌 (벗어난 값: {bad[:5]})"


def t_top_k(sample):
    logits = logits_from_probs([0.3, 0.25, 0.2, 0.15, 0.1])
    picks = draw(sample, logits, 2000, temperature=1.0, top_k=3, top_p=1.0)
    seen = set(picks.tolist())
    return seen == {0, 1, 2}, f"top_k=3이면 상위 3개만, 3개 모두 나옴 (나온 토큰: {sorted(seen)})"


def t_top_p_cut(sample):
    # 누적: 0.5, 0.8, 0.95, 1.0. top_p=0.75면 0.75를 넘기는 두 번째까지, 0.85면 세 번째까지.
    # 경계값(0.8, 0.95)은 일부러 피했다. 부동소수 반올림으로 정답 코드가 떨어지지 않게.
    logits = logits_from_probs([0.5, 0.3, 0.15, 0.05])
    a = set(draw(sample, logits, 2000, temperature=1.0, top_k=4, top_p=0.75).tolist())
    b = set(draw(sample, logits, 2000, temperature=1.0, top_k=4, top_p=0.85).tolist())
    ok = a == {0, 1} and b == {0, 1, 2}
    return ok, f"top_p는 누적이 p를 넘기는 토큰까지 남김 (p=0.75 → {sorted(a)}, p=0.85 → {sorted(b)})"


def t_top_p_keeps_first(sample):
    logits = logits_from_probs([0.97, 0.02, 0.01])
    try:
        picks = draw(sample, logits, 200, temperature=1.0, top_k=3, top_p=0.95)
    except RuntimeError as e:
        return False, f"1등 확률이 top_p보다 커도 1등은 남김 (오류: {str(e).splitlines()[0]})"
    seen = set(picks.tolist())
    return seen == {0}, f"1등 확률이 top_p보다 커도 1등은 남김 (나온 토큰: {sorted(seen)})"


def t_temperature(sample):
    logits = torch.tensor([[2.0, 1.0, 0.0, -1.0]])
    want = (logits / 0.5).softmax(-1)[0].tolist()
    picks = draw(sample, logits, 20000, temperature=0.5, top_k=4, top_p=1.0)
    got = freqs(picks, range(4))
    err = max(abs(g - w) for g, w in zip(got, want))
    return err < 0.015, (f"temperature=0.5 분포 (기대 {fmt(want)}, 실제 {fmt(got)}, 최대 차이 {err:.3f})")


def t_renormalize(sample):
    logits = logits_from_probs([0.5, 0.3, 0.15, 0.05])
    want = [p / 0.95 for p in (0.5, 0.3, 0.15)]
    picks = draw(sample, logits, 20000, temperature=1.0, top_k=4, top_p=0.85)
    got = freqs(picks, range(3))
    err = max(abs(g - w) for g, w in zip(got, want))
    return err < 0.015, f"잘라 낸 뒤 남은 확률끼리의 비율 유지 (기대 {fmt(want)}, 실제 {fmt(got)})"


def fmt(xs):
    return "[" + ", ".join(f"{x:.3f}" for x in xs) + "]"


TESTS = [
    ("반환 형식", t_shape),
    ("토큰 번호", t_token_ids),
    ("top_k", t_top_k),
    ("top_p 경계", t_top_p_cut),
    ("top_p 1등 보존", t_top_p_keeps_first),
    ("temperature 분포", t_temperature),
    ("재정규화", t_renormalize),
]


def real_check(sample):
    """steps/02_generate.py의 '# %% generate' 앞(설정 + 모델)만 실행해 forward를 얻는다."""
    src_path = ROOT / "steps" / "02_generate.py"
    src = src_path.read_text().split("# %% generate")[0]
    env = {"__file__": str(src_path), "__name__": "steps_02"}
    exec(compile(src, str(src_path), "exec"), env)
    logits = env["forward"](env["ids"])
    picks = draw(sample, logits, 1000, temperature=0.6, top_k=20, top_p=0.95)
    n1, ndash, nmeet = (int((picks == i).sum()) for i in (16, 12, 134379))
    others = sorted(set(picks.tolist()) - {16, 12})
    ok = 840 <= n1 <= 900 and nmeet == 0 and n1 + ndash == 1000
    detail = (f"회의록 첫 토큰 1,000번: '1' {n1}번, '-' {ndash}번, '회의' {nmeet}번"
              f" (본문: 868 / 132 / 0, 허용 '1' 840~900)")
    if others:
        detail += f", 그 밖의 토큰 {others[:5]}"
    return ok, detail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("file", help="sample 함수가 든 파일")
    ap.add_argument("--real", action="store_true", help="실제 모델로도 확인")
    args = ap.parse_args()

    sample = load_sample(args.file)
    tests = list(TESTS)
    if args.real:
        tests.append(("실제 모델", real_check))

    passed = 0
    for name, fn in tests:
        try:
            ok, detail = fn(sample)
        except Exception as e:  # 학습자 코드의 예외도 실패로 보고한다
            ok, detail = False, f"예외 발생: {type(e).__name__}: {e}"
        passed += ok
        print(f"{'PASS' if ok else 'FAIL'}  {name:<14} {detail}")

    print(f"\n{passed}/{len(tests)} 통과")
    sys.exit(0 if passed == len(tests) else 1)


if __name__ == "__main__":
    main()

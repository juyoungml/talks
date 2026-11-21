# 자동 체커

| 파일 | 실습 | 모델 필요 |
|---|---|---|
| `check_02_sampling.py` | 2-1 샘플링 함수 | `--real`일 때만 |

```bash
uv run python course/checks/check_02_sampling.py work/my_sampling.py
uv run python course/checks/check_02_sampling.py work/my_sampling.py --real
```

## 검증 기록 (2026-11-20, Apple M3 Pro)

`examples/sampling_correct.py`는 `steps/02_generate.py`와 다른 방식(정렬 + 마스크)으로 짠 정답, `examples/sampling_wrong.py`는 temperature 누락 + `cumsum < p` 실수가 든 오답입니다. `steps/02_generate.py`의 `sample`을 그대로 떼어 넣어도 7/7 통과했습니다.

| 검사 | 정답 | 오답 |
|---|---|---|
| 반환 형식 | PASS | PASS |
| 토큰 번호 | PASS | PASS |
| top_k | PASS | PASS |
| top_p 경계 | PASS | FAIL (p=0.75 → [0]) |
| top_p 1등 보존 | PASS | FAIL (확률 합 0 → multinomial 오류) |
| temperature 분포 | PASS (최대 차이 0.002) | FAIL (최대 차이 0.217) |
| 재정규화 | PASS | FAIL |
| 실제 모델 (`--real`) | PASS: '1' 868, '-' 132, '회의' 0 | FAIL: '1' 627, '-' 211, '회의' 68 |
| 합계 | 8/8, 종료 코드 0 | 3/8, 종료 코드 1 |

시간: 기본 검사 약 3초, `--real` 약 30초(가중치가 이미 받아져 있을 때).

`--real`은 `steps/02_generate.py`를 고치지 않고, 파일에서 `# %% generate` 앞부분(설정 + 모델)만 `exec`해서 `forward`와 `ids`를 얻습니다. 다른 강의 체커도 같은 방식으로 `steps/NN_*.py`를 재사용할 수 있습니다.

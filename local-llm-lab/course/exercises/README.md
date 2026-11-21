# 실습 안내

- 강마다 **필수 1개**와 선택 실습이 있습니다. 수강 완료 기준은 필수 9개입니다.
- `steps/` 원본은 다음 강의 출발점이라 그대로 두고, 복사해서 고칩니다.

```bash
mkdir -p work && cp steps/02_generate.py work/
```

- `work/`에서 실행할 때 `meeting.txt`도 같이 복사해야 합니다(파일이 같은 폴더의 `meeting.txt`를 읽습니다).

```bash
cp steps/meeting.txt work/
```

- 속도는 기계마다 다릅니다. 기대 결과의 ms, tok/s는 Apple M3 Pro(MPS, FP16)에서 잰 값이고, 판정은 "같은 기계에서 이전 대비"로 합니다.
- 체커가 있는 실습은 `uv run python course/checks/check_NN_*.py 내파일.py`로 확인합니다.

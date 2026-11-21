# PyTorch로 Ollama 만들기

MacBook에서 Qwen3-0.6B에 회의록을 넣고, 첫 토큰부터 KV cache와 가중치 양자화까지 따라가는 실습이다. 웹은 한국어 레슨이고, 모델은 터미널에서 실행한다.

```sh
uv sync --python 3.12
uv run python lab.py cp01 --reference
open dist/index.html
```

처음 실행할 때 공개 모델 가중치 약 1.2 GB를 Hugging Face 캐시에 받는다. 다음 실행부터는 `--offline`을 붙일 수 있다. MPS를 사용할 수 없는 컴퓨터에서는 `--device cpu`로 실행한다. CPU 기본 dtype은 float32, MPS는 float16이다.

| 체크포인트 | 실행 | 관찰 |
| --- | --- | --- |
| CP01 | `uv run python lab.py cp01 --reference` | 마지막 logits와 공식 구현 비교 |
| CP02 | `uv run python lab.py cp02 --steps 48 --offline` | 한 토큰씩 이어서 생성 |
| CP03 | `uv run python lab.py cp03 --steps 8 --offline` | 짧은 입력과 긴 입력, 첫 토큰과 decode |
| CP04 | `uv run python lab.py cp04 --prompt long --steps 8 --offline` | 같은 이력에서 logits 검증, T→1 변화 |
| CP05 | `uv run python lab.py cp05 --prompt long --steps 8 --offline` | 수동 attention과 SDPA |
| CP06 | `uv run python lab.py cp06 --prompt long --steps 8 --offline` | 동적·정적 KV, 사용량·예약량 |
| CP07 | `uv run python lab.py cp07 --steps 4 --repeats 1 --offline` | decode compile의 첫 실행·워밍업 결과 |
| CP08 | `uv run python lab.py cp08 --steps 8 --offline` | INT8 저장, float 복원, 속도와 오차 |
| CP09 | `uv run python lab.py cp09 --prompt long --steps 8 --offline` | 초기 엔진과 static KV/SDPA 엔진 비교 |

`model.py`는 PyTorch로 작성한 decoder다. Transformers는 토크나이저, 터미널 스트리밍 및 CP01의 기준 구현에 사용한다. 체크포인트를 CLI 인자로 전환하므로 한 작업 트리에서 구현을 비교할 수 있다. CP07은 실험적인 경로로, 장치와 빌드에 따라 컴파일에 걸리는 시간과 지원 여부가 달라진다. CP08은 저비트 커널 성능이 아니라 가중치 저장을 탐구하는 예제이며, embedding은 부동소수점으로 유지한다.

벤치마크는 모델 로드와 토큰화 후 워밍업을 거친다. 스트리밍을 끄고 고정 개수만큼 생성한다. KV 수치는 텐서 사용 및 확보 용량이며 장치 전체 사용량과 다르다. 본문 출력 예시에 있는 말줄임표는 사용자 장치에서 채울 측정값이다.

웹을 HTTP로 열면 명령 복사와 학습 진도를 같은 브라우저에 저장하는 기능을 사용할 수 있다.

```sh
python3 -m http.server 8894 --bind 127.0.0.1 --directory dist
```

[로컬 웹 열기](http://127.0.0.1:8894/)

## 웹 코드 뷰어와 실행 기록

오른쪽 코드 뷰어는 레포의 실습 파일 전체를 보여준다. 실습 소스를 수정한 뒤 뷰어 내용도 갱신하려면 레포 루트에서 `python3 scripts/build_site.py`를 실행하고 브라우저를 새로고침한다. 이 스크립트는 `examples/` 아래의 실제 터미널 기록도 함께 반영한다.

## Ollama와 비교

같은 회의록 프롬프트로 Ollama의 첫 토큰 시간과 decode 속도를 잰다. 출력 형식은 `lab.py` 벤치마크와 맞췄다.

```sh
brew install ollama
ollama serve   # 다른 터미널에서
ollama pull qwen3:0.6b-fp16
python3 scripts/ollama_bench.py qwen3:0.6b-fp16 qwen3:0.6b
```

`qwen3:0.6b-fp16`은 실습과 같은 정밀도이고, 기본 태그 `qwen3:0.6b`는 Q4_K_M 양자화 모델이다. Ollama는 이전 요청의 프롬프트 앞부분을 재사용하므로, 스크립트는 요청마다 앞부분을 바꿔서 prefill을 처음부터 계산하게 한다.

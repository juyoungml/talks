# 유튜브 업로드 시트 (최종)

- 공개 범위: 공개
- 재생목록: PyTorch로 Ollama 만들기
- 썸네일: `thumbs_final/chNN.png`
- 태그: Ollama, LLM, PyTorch, Qwen3, 추론 엔진, KV cache, torch.compile, 양자화, 로컬 LLM, Apple Silicon

## 1강

- 파일: `videos/media/web/ch01_first_token.mp4`

**제목** (61자)

Ollama는 어떻게 답을 쓸까? 가중치 파일에서 첫 토큰 꺼내기 · PyTorch로 Ollama 만들기 1강

**설명**

```
Ollama에 회의록을 붙여 넣으면 노트북이 인터넷 없이 요약을 씁니다. 이 안에서는 무슨 일이 일어날까요?

이 시리즈에서는 Hugging Face에 공개된 Qwen3-0.6B 가중치 파일과 PyTorch만으로 Ollama 같은 추론 엔진을 직접 만들고, 마지막에는 Ollama와 나란히 속도를 비교합니다.

1강에서는 가중치 파일을 열어 보고, 채팅 템플릿과 토크나이저, embedding, 28개 층, lm head를 지나 답의 첫 토큰 하나를 꺼냅니다.

0:00 시작: Ollama는 어떻게 동작할까
0:32 모델 파일 열어 보기
1:00 문장을 숫자로: 채팅 템플릿과 토크나이저
1:54 숫자 하나를 벡터 하나로
2:19 28개 층 지나가기: attention, MLP, residual
2:55 다음 토큰 고르기
3:37 첫 토큰까지 걸린 시간
4:10 1강 정리
4:33 다음 강 예고: 2강 한 토큰씩 이어 쓰기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/
코드: https://github.com/juyoungml/talks

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
```

## 2강

- 파일: `videos/media/web/ch02_generate.mp4`

**제목** (52자)

직접 만든 LLM, Ollama보다 24배 느렸다 · PyTorch로 Ollama 만들기 2강

**설명**

```
1강에서 첫 토큰 하나를 꺼냈습니다. 답 전체는 고른 토큰을 입력 끝에 붙이고 forward를 다시 부르는 일을 반복해서 얻습니다.

2강에서는 이 반복문을 만들고, 같은 회의록으로 Ollama와 같이 출발시켜 봅니다. 답은 나오지만 속도는 초당 3.6토큰으로, Ollama보다 24배 느립니다. 마지막으로 Ollama가 매번 다른 답을 쓰는 이유인 sampling(temperature, top-k, top-p)을 짚습니다.

0:00 시작
0:24 입력 길이가 바뀌어도 돌아가게
0:52 고르고, 붙이고, 다시: generate 반복문
1:34 Ollama와 같이 출발시켜 보면
2:14 Ollama는 왜 매번 다른 답을 쓸까
3:14 2강 정리
3:40 다음 강 예고: 3강 어디가 느린지 측정하기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 3강

- 파일: `videos/media/web/ch03_measure.mp4`

**제목** (47자)

LLM이 느린 이유를 프로파일링으로 찾기 · PyTorch로 Ollama 만들기 3강

**설명**

```
2강에서 만든 엔진은 토큰 하나에 250 ms가 걸립니다. 3강에서는 코드를 고치기 전에 먼저 프로파일링합니다.

스텝마다 걸린 시간과 입력 길이별 forward 시간을 재 보면, 매 스텝 앞쪽 638개 위치를 처음부터 다시 계산하고 있다는 것이 드러납니다. 48토큰을 쓰는 동안 31,752개 위치를 계산했는데, 그중 처음 보는 위치는 685개뿐이었습니다.

0:00 시작
0:18 스텝마다 걸린 시간
0:46 입력이 길수록 느려진다
1:14 같은 계산을 계속 다시 하고 있다
2:22 3강 정리
2:48 다음 강 예고: 4강 계산한 K, V 재사용하기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 4강

- 파일: `videos/media/web/ch04_kv_cache.mp4`

**제목** (53자)

KV cache 직접 구현하기: decode 10배 · PyTorch로 Ollama 만들기 4강

**설명**

```
3강에서 decode 스텝마다 앞쪽 위치를 다시 계산하고 있다는 것을 찾았습니다. 4강에서는 층마다 k, v를 저장해 두고 새 토큰 하나만 계산하는 KV cache를 만듭니다.

prefill과 decode를 나누자 decode가 초당 3.6토큰에서 37.9토큰으로 10배 넘게 빨라집니다. 캐시를 써도 답이 같은지 확인하고, 그 대가로 메모리를 토큰 하나당 112 KB씩 쓴다는 것도 계산합니다.

0:00 시작
0:18 층마다 K, V를 모아 두는 상자
1:03 prefill은 한 번, 그다음은 한 토큰씩
1:54 정말 같은 답인가
2:19 대신 메모리를 쓴다
3:19 4강 정리
3:45 다음 강 예고: 5강 attention 커널 바꾸기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 5강

- 파일: `videos/media/web/ch05_sdpa.mp4`

**제목** (62자)

attention을 SDPA 한 줄로: 커널이 줄면 얼마나 빨라질까 · PyTorch로 Ollama 만들기 5강

**설명**

```
4강에서 decode를 초당 37.9토큰까지 올렸습니다. 5강에서는 손으로 짠 attention 다섯 줄을 PyTorch의 scaled_dot_product_attention(SDPA) 한 줄로 바꿉니다.

커널이 무엇인지, attention 한 번에 실제로 실행되는 연산이 27개에서 4개로 어떻게 줄어드는지 봅니다. 회의록 길이에서 prefill attention은 2.6배 빨라지고, 첫 토큰이 73 ms 줄어듭니다. decode에서는 연산 하나를 GPU에 보내는 데 약 6 µs가 든다는 것도 드러납니다.

0:00 시작
0:19 다섯 줄을 한 줄로
0:44 커널이 줄어든다
1:36 얼마나 빨라지나
2:29 decode에서는 커널 수가 문제다
3:14 5강 정리
3:43 다음 강 예고: 6강 메모리 미리 잡아두기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 6강

- 파일: `videos/media/web/ch06_static_cache.mp4`

**제목** (54자)

static KV cache: 안 빨라지는데 왜 할까 · PyTorch로 Ollama 만들기 6강

**설명**

```
5강에서 decode 한 스텝에 PyTorch 연산이 2,546번 실행되고, 이를 GPU에 보내는 비용만 15 ms 가까이 된다는 것을 확인했습니다. 이 연산들을 컴파일로 합치려면 매 스텝 텐서 모양이 같아야 합니다.

6강에서는 torch.cat으로 매번 새로 만들던 KV cache를 1,024칸짜리 고정 버퍼로 바꾸고, 위치도 GPU 위의 텐서로 넘깁니다. 속도는 그대로지만 다음 장의 torch.compile을 위한 준비가 끝납니다.

0:00 시작
0:24 매 스텝 새로 만들던 캐시
1:15 위치도 텐서로
1:42 스텝마다 모양이 똑같다
2:31 6강 정리
2:51 다음 강 예고: 7강 파이썬 오버헤드 줄이기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 7강

- 파일: `videos/media/web/ch07_compile.mp4`

**제목** (52자)

torch.compile 한 줄로 46% 빨라지기 · PyTorch로 Ollama 만들기 7강

**설명**

```
6강에서 decode 스텝의 텐서 모양을 고정했습니다. 7강에서는 torch.compile 한 줄로 decode 스텝 전체를 컴파일합니다.

작은 연산 수천 개를 하나씩 GPU에 보내던 비용이 줄어서, decode가 초당 45토큰에서 66토큰으로 빨라집니다. 처음 컴파일에 20초 가까이 걸리는 이유와, 워밍업 입력의 stride 하나 때문에 다시 컴파일되던 실제 함정도 함께 봅니다.

0:00 시작
0:18 스텝 하나 = 작은 일 수백 개
1:19 처음 한 번은 오래 걸린다
2:31 7강 정리
2:51 다음 강 예고: 8강 가중치를 INT8로 줄이기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · FP16 · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 8강

- 파일: `videos/media/web/ch08_int8.mp4`

**제목** (49자)

INT8 양자화로 Ollama FP16 넘기 · PyTorch로 Ollama 만들기 8강

**설명**

```
7강까지 decode는 초당 65.7토큰입니다. 이제 decode 한 스텝은 대부분 가중치를 메모리에서 읽는 데 시간을 씁니다.

8강에서는 층 행렬을 행마다 눈금을 정해 INT8로 줄이고, INT8을 그대로 읽어 곱하는 커널(_weight_int8pack_mm)을 씁니다. 읽는 양이 882 MB에서 441 MB로 반이 되면서 decode가 초당 92토큰이 되고, 답은 FP16 때와 한 글자도 다르지 않습니다.

0:00 시작
0:38 행마다 눈금 255칸
1:30 INT8 그대로 곱하는 커널
1:58 절반을 읽으면 얼마나 빨라질까
2:48 8강 정리
3:12 다음 강 예고: 9강 다시 Ollama와 비교하기

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

## 9강

- 파일: `videos/media/web/ch09_compare.mp4`

**제목** (52자)

Ollama 속도는 무엇이 정할까: 메모리 대역폭 · PyTorch로 Ollama 만들기 9강

**설명**

```
8강에서 decode는 초당 92토큰으로 Ollama FP16(87토큰)을 넘었습니다. 마지막 9강에서는 같은 조건으로 Ollama와 다시 경주하고, 처음에 던진 질문에 답합니다. Ollama의 eval rate는 무엇이 정하는 숫자일까요?

decode 한 스텝은 가중치 전부를 한 번씩 읽습니다. 그래서 속도의 천장은 메모리 대역폭으로 정해지고, 이 맥에서 0.6B FP16 모델의 천장은 초당 125토큰 정도입니다. 지금까지 바꾼 것을 정리하고, batching과 speculative decoding 같은 다음 갈래도 짚습니다.

0:00 시작
0:31 같은 출발선에 다시
1:32 속도를 정하는 건 읽는 양
2:37 지금까지 바꾼 것
3:12 더 가려면
3:50 코스 정리

강의 사이트(글·슬라이드·영상): https://juyoung.site/talks/

Qwen3-0.6B · Apple M3 Pro. 화면의 수치는 모두 실제 실행 값입니다.
내레이션·음악: ElevenLabs
코드: https://github.com/juyoungml/talks
```

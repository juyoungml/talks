// course/quizzes/*.json 에서 scripts/build_quiz.py 로 생성. 직접 고치지 마십시오.
window.QUIZZES = [
 {
  "chapter": "01",
  "title": "첫 토큰 꺼내기",
  "intro": "코드는 `steps/01_first_token.py`, 숫자는 1강 본문과 실행 출력에서 그대로 가져왔습니다.",
  "pass": 6,
  "questions": [
   {
    "type": "choice",
    "prompt": "`model.safetensors`를 열면 다음이 출력됩니다.",
    "code": "텐서 311개, 파라미터 752M\n  model.embed_tokens.weight                  [151936, 1024]\n  model.layers.0.self_attn.q_proj.weight     [2048, 1024]\n  model.layers.0.mlp.up_proj.weight          [3072, 1024]",
    "codeLang": "text",
    "after": "이 파일의 정체로 맞는 것을 고르십시오.",
    "options": [
     "실행 가능한 신경망 프로그램",
     "이름이 붙은 텐서 311개가 든 딕셔너리",
     "토크나이저 사전과 가중치가 섞인 바이너리",
     "층마다 하나씩 있는 28개 파일의 목록"
    ],
    "answer": 1,
    "explain": "텐서 311개, 파라미터 752M이 이름표를 달고 들어 있을 뿐입니다. 이 행렬들을 어떤 순서로 곱할지는 우리가 짠 코드가 정합니다."
   },
   {
    "type": "blanks",
    "prompt": "텐서 이름에는 `layers.0`부터 `layers.27`까지 있습니다. 그 덕분에 아래 코드를 쓸 수 있습니다.",
    "code": "for L in range(config[\"num_hidden_layers\"]):\n    x = block(x, L)",
    "codeLang": "python",
    "after": "빈칸을 채우십시오.",
    "text": "같은 모양의 층이 ___개 쌓여 있습니다. 층마다 ___만 다르고 ___은 같으니, 번호 `L`만 바꿔 같은 `block` 함수를 반복해서 부를 수 있습니다.",
    "bank": [
     "28",
     "27",
     "311",
     "이름의 번호",
     "텐서 모양",
     "토크나이저 설정",
     "실행 방법"
    ],
    "answer": [
     "28",
     "이름의 번호",
     "텐서 모양"
    ],
    "explain": "번호가 0부터 27까지이니 층은 **28개**입니다. 층마다 이름의 번호만 다르고 텐서 모양이 같으므로, 번호 `L`만 바꿔 같은 `block`을 28번 부릅니다."
   },
   {
    "type": "match",
    "prompt": "아래 두 줄을 실행하면 `torch.Size([1, 638])`과 `torch.Size([1, 638, 1024])`가 찍힙니다. `model.embed_tokens.weight`의 모양은 `[151936, 1024]`입니다.",
    "code": "print(ids.shape)\nx = W[\"model.embed_tokens.weight\"][ids]\nprint(x.shape)",
    "codeLang": "python",
    "after": "각 숫자가 뜻하는 것을 짝지으십시오.",
    "pairs": [
     [
      "1",
      "한 번에 넣은 문장 수(batch)"
     ],
     [
      "638",
      "템플릿까지 포함한 입력 토큰 수"
     ],
     [
      "1024",
      "토큰 하나를 나타내는 벡터의 차원"
     ],
     [
      "151936",
      "사전에 있는 토큰 종류의 수"
     ]
    ],
    "explain": "**638**은 템플릿까지 포함한 입력 토큰 수, **1024**는 토큰 하나를 나타내는 벡터의 차원입니다. 151,936 × 1,024 표에서 토큰 번호에 해당하는 행을 꺼낸 결과이고, 이 모양은 마지막 층을 지날 때까지 바뀌지 않습니다."
   },
   {
    "type": "choice",
    "prompt": "채팅 템플릿을 거친 글은 다음으로 끝납니다.",
    "code": "<|im_start|>assistant\n<think>\n\n</think>\n",
    "codeLang": "text",
    "after": "이렇게 끝나게 만드는 이유로 가장 알맞은 것은 무엇입니까?",
    "options": [
     "토크나이저가 문장 끝에 항상 붙이는 기호라서",
     "다음에 올 토큰이 곧 답의 첫 글자가 되도록 \"모델이 말할 차례\"를 표시하려고",
     "모델이 `<think>` 블록 안에 생각을 먼저 쓰도록 자리를 열어 두려고",
     "attention mask를 만들 때 기준점으로 쓰려고"
    ],
    "answer": 1,
    "explain": "템플릿이 \"assistant 차례\"로 끝나므로 모델이 다음에 쓸 토큰이 곧 답의 첫 글자입니다. `<think></think>`가 비어 있는 것은 `enable_thinking=False`로 생각 단계를 끈 결과입니다."
   },
   {
    "type": "blanks",
    "prompt": "이 회의록 638토큰 중 106개는 \"렌\", \"데\", \"첫\" 같은 글자가 UTF-8 바이트 조각 2~3개로 쪼개진 토큰입니다. 빈칸을 채우십시오. 영어 단어는 대부분 사전에 통째로 있어서 한 단어가 한 토큰입니다.",
    "text": "바이트 조각 토큰은 전체의 약 ___입니다. 사전에 통째로 없는 글자는 조각 여러 개로 쪼개지므로, 한국어 글은 영어보다 토큰을 ___.",
    "bank": [
     "17%",
     "6%",
     "60%",
     "많이 먹습니다",
     "적게 먹습니다",
     "똑같이 먹습니다"
    ],
    "answer": [
     "17%",
     "많이 먹습니다"
    ],
    "explain": "106 ÷ 638 ≈ **17%**. 사전에 통째로 없는 글자는 바이트 조각 여러 개로 쪼개지므로, 한국어 글은 영어보다 토큰을 많이 먹습니다."
   },
   {
    "type": "choice",
    "prompt": "`forward`의 마지막 두 줄입니다. 입력 `ids`의 모양은 `[1, 638]`이고, `model.embed_tokens.weight`의 모양은 `[151936, 1024]`입니다.",
    "code": "x = rms_norm(x[:, -1], W[\"model.norm.weight\"])\nreturn x @ W[\"model.embed_tokens.weight\"].T",
    "codeLang": "python",
    "after": "결과의 모양과, 점수를 만드는 데 쓴 행렬에 대한 설명으로 맞는 것을 고르십시오.",
    "options": [
     "`[1, 151936]`, 입력에서 토큰 번호의 행을 꺼낼 때 쓴 바로 그 행렬",
     "`[1, 638, 151936]`, 입력에서 토큰 번호의 행을 꺼낼 때 쓴 바로 그 행렬",
     "`[1, 151936]`, 입력 쪽에서는 쓰지 않는 출력 전용 행렬",
     "`[1, 1024]`, 입력 쪽에서는 쓰지 않는 출력 전용 행렬"
    ],
    "answer": 0,
    "explain": "`x[:, -1]`로 마지막 위치만 남기므로 모양은 **`[1, 151936]`**(토큰마다 점수 하나)입니다. 점수를 만든 `embed_tokens`는 입력에서 `W[\"model.embed_tokens.weight\"][ids]`로 행을 꺼낼 때 쓴 바로 그 행렬이고, Qwen3-0.6B는 입력과 출력에서 같은 가중치를 씁니다."
   },
   {
    "type": "multi",
    "prompt": "첫 토큰을 고른 결과와 시간을 잰 코드입니다.",
    "code": "    16  '1'       60.0%\n    12  '-'       18.9%\n134379  '회의'       7.3%\n\nsync()\nstart = time.perf_counter()\nnext_id = forward(ids).argmax(-1)\nsync()\ntimes.append((time.perf_counter() - start) * 1000)",
    "codeLang": "text",
    "after": "두 번째 `sync()`는 `torch.mps.synchronize()`입니다. 맞는 설명을 모두 고르십시오.",
    "options": [
     "`argmax`는 확률이 가장 높은 `'1'`(번호 16)을 고른다.",
     "`argmax`는 확률에 비례해 뽑으므로 7.3%의 확률로 `'회의'`를 고른다.",
     "두 번째 `sync()`를 빼면 GPU에 일을 넘긴 시각만 잡혀서 잰 시간이 실제보다 훨씬 짧게 나온다.",
     "두 번째 `sync()`를 빼면 GPU가 기다리느라 잰 시간이 실제보다 길게 나온다.",
     "두 번째 `sync()`는 결과를 정확하게 만들기 위한 것이라, 빼도 잰 시간은 그대로다."
    ],
    "answer": [
     0,
     2
    ],
    "explain": "`argmax`는 늘 1등인 `'1'`(번호 16, 60.0%)을 고릅니다. GPU는 일을 받아 두고 나중에 처리하므로 `sync()` 없이 시계를 보면 일을 넘긴 시각만 잡힙니다. 제대로 잰 값은 638토큰 → 첫 토큰 223 ms였습니다."
   }
  ]
 },
 {
  "chapter": "02",
  "title": "한 토큰씩 이어 쓰기",
  "intro": "코드는 `steps/01_first_token.py`, `steps/02_generate.py`, 숫자는 2강 본문과 실행 출력에서 그대로 가져왔습니다.",
  "pass": 6,
  "questions": [
   {
    "type": "order",
    "prompt": "`generate`는 같은 일을 최대 `max_new`번 반복해 답을 한 토큰씩 이어 씁니다.",
    "after": "반복문 한 바퀴에서 일어나는 일을 순서대로 놓으십시오.",
    "items": [
     "`forward(ids)`로 다음 토큰 점수를 받는다",
     "`pick`(greedy)으로 가장 높은 점수의 토큰을 고른다",
     "`<|im_end|>`(EOS)이면 멈춘다",
     "고른 토큰을 `ids` 끝에 붙이고 처음으로 돌아간다"
    ],
    "explain": "점수 계산 → 토큰 선택 → 종료 검사 → 입력 끝에 붙이기 순서입니다. 종료 검사를 붙이기보다 먼저 해야 `<|im_end|>`가 입력과 답에 섞이지 않습니다."
   },
   {
    "type": "choice",
    "prompt": "첫 토큰을 꺼낼 때는 위치 정보와 mask를 `forward` 밖에서 한 번만 만들었습니다.",
    "code": "T = ids.shape[1]\nangle = torch.arange(T, device=device)[:, None].float() * freq\n...\nmask = torch.ones(T, T, dtype=torch.bool, device=device).tril()\n\n# generate에서는 forward 안으로 옮겼다\ndef forward(ids):\n    T = ids.shape[1]\n    # 입력 길이가 매번 달라지니 위치 정보와 mask도 매번 만든다\n    cos, sin = rope_tables(torch.arange(T, device=device))\n    mask = causal_mask(T)",
    "codeLang": "python",
    "after": "옮겨야 했던 이유로 맞는 것을 고르십시오.",
    "options": [
     "생성할 때는 위치가 커질수록 각도 공식의 `freq`를 다시 계산해야 해서, 한 번 만든 표를 재사용할 수 없기 때문",
     "스텝마다 `ids`가 한 토큰씩 길어져서, 638토큰에 맞춘 cos, sin, mask가 639토큰 입력과 모양이 맞지 않기 때문",
     "mask를 `forward` 밖에 두면 GPU 메모리에 계속 남아 속도가 느려지기 때문",
     "생성할 때는 앞 토큰도 뒤 토큰을 볼 수 있도록 mask를 풀어야 하기 때문"
    ],
    "answer": 1,
    "explain": "스텝마다 `ids`가 한 토큰씩 길어지므로 638토큰에 맞춰 만든 cos, sin, mask는 639토큰 입력에 모양이 맞지 않습니다. 계산 자체는 그대로이고, 입력 길이를 보고 매번 만들도록 바꾼 것입니다."
   },
   {
    "type": "blanks",
    "prompt": "다음 코드에서 `text.endswith(\"�\")`를 검사하는 이유입니다.",
    "code": "text = tokenizer.decode(out)\nif not text.endswith(\"�\"):        # 바이트 조각이 덜 모였으면 기다린다\n    print(text[len(shown):], end=\"\", flush=True)\n    shown = text",
    "codeLang": "python",
    "after": "빈칸을 채우십시오.",
    "text": "\"렌\" 같은 글자는 UTF-8 ___ 2~3개로 나뉩니다. 조각 하나만 디코딩하면 ___가 나오므로, 글자가 ___ 기다렸다가 찍습니다.",
    "bank": [
     "바이트 조각",
     "토큰 번호",
     "깨진 글자 `�`",
     "EOS 토큰",
     "완성될 때까지",
     "문장이 끝날 때까지"
    ],
    "answer": [
     "바이트 조각",
     "깨진 글자 `�`",
     "완성될 때까지"
    ],
    "explain": "\"렌\" 같은 글자는 바이트 조각 2~3개로 나뉩니다. 조각 하나만 디코딩하면 깨진 글자 `�`가 나오므로, 글자가 완성될 때까지 기다렸다가 찍습니다."
   },
   {
    "type": "choice",
    "prompt": "아래 생성 루프의 본문 실행 결과는 `첫 토큰 220 ms | 이후 4.0 tok/s (48토큰)`였습니다. 같은 회의록으로 Ollama와 비교하면 첫 토큰은 1.5배, 이후 속도는 24배 느렸습니다.",
    "code": "for _ in range(max_new):\n    next_id = pick(forward(ids))\n    ...\n    ids = torch.cat([ids, next_id], dim=1)",
    "codeLang": "python",
    "after": "첫 토큰보다 이후 속도에서 차이가 훨씬 큰 이유로 맞는 것을 고르십시오.",
    "options": [
     "`pick`(greedy)이 매 스텝 151,936개 점수를 전부 정렬하기 때문",
     "`torch.cat`이 매 스텝 `ids`를 GPU에서 CPU로 복사하기 때문",
     "매 스텝 `forward(ids)`에 입력 전체를 넣어 638토큰 넘게 다시 계산하기 때문",
     "매 스텝 `tokenizer.decode`로 지금까지의 출력 전체를 다시 디코딩하기 때문"
    ],
    "answer": 2,
    "explain": "매 스텝 `forward(ids)`에 **입력 전체**를 넣습니다. 첫 토큰은 Ollama도 프롬프트 전체를 읽어야 하니 비슷하지만, 그다음부터 우리는 매 스텝 638토큰 넘게 다시 계산합니다."
   },
   {
    "type": "number",
    "prompt": "Ollama의 기본 샘플링 설정(temperature 0.6, top_k 20, top_p 0.95)을 옮긴 함수입니다.",
    "code": "def sample(logits, temperature=0.6, top_k=20, top_p=0.95):\n    probs = (logits.float() / temperature).softmax(-1)\n    probs, idx = probs.topk(top_k)              # 상위 20개만 남기고\n    keep = probs.cumsum(-1) - probs < top_p     # 누적 95% 안쪽만 남긴다\n    probs = probs * keep\n    choice = torch.multinomial(probs / probs.sum(), 1)\n    return idx.gather(-1, choice)",
    "codeLang": "python",
    "after": "temperature를 적용한 뒤 상위 확률이 `[0.97, 0.02, 0.01, ...]`라고 합시다. `keep` 줄이 지금처럼 `probs.cumsum(-1) - probs < top_p`일 때와, `probs.cumsum(-1) < top_p`로 바꿨을 때 남는 토큰은 각각 몇 개입니까?",
    "fields": [
     {
      "label": "`cumsum - probs < top_p`",
      "answer": 1,
      "tolerance": 0,
      "unit": "개"
     },
     {
      "label": "`cumsum < top_p`",
      "answer": 0,
      "tolerance": 0,
      "unit": "개"
     }
    ],
    "explain": "`cumsum - probs`는 \"나보다 앞 토큰들의 누적 확률\"이라 1등은 0 < 0.95로 남고, 2등은 0.97 < 0.95가 아니라 잘립니다(1개). 그냥 `cumsum`이면 1등부터 0.97 < 0.95가 거짓이라 0개가 남고, `probs / probs.sum()`이 0 ÷ 0이 됩니다."
   },
   {
    "type": "choice",
    "prompt": "첫 토큰의 원래 확률은 `'1'` 60.0%, `'-'` 18.9%, `'회의'` 7.3%였습니다. temperature 0.6, top_k 20, top_p 0.95로 뽑는 `sample` 함수로 같은 점수에서 1,000번 뽑았더니 `'1'` 868번, `'-'` 132번이 나왔습니다.",
    "after": "틀린 설명을 고르십시오.",
    "options": [
     "greedy(`logits.argmax(-1, keepdim=True)`)였다면 1,000번 모두 `'1'`이 나온다.",
     "temperature 0.6으로 나누면 1등 쪽으로 확률이 몰려서 `'1'`이 87% 근처가 된다.",
     "`'회의'`가 한 번도 안 나온 것은 top_k 20 밖이었기 때문이다.",
     "`'1'`과 `'-'`만으로 누적 확률이 0.95를 넘어서 그 뒤 토큰이 잘렸다."
    ],
    "answer": 2,
    "explain": "`'회의'`는 3등이라 top_k 20 안에 있습니다. temperature 0.6을 적용하면 `'1'`과 `'-'`의 누적 확률이 0.95를 넘으므로 `'회의'`는 top_p에서 잘립니다."
   },
   {
    "type": "multi",
    "prompt": "이 코스는 속도를 비교할 때 계속 `greedy`를 쓰고, Ollama도 temperature 0으로 맞춥니다. 이유를 두 가지 고르십시오.",
    "options": [
     "sampling은 forward 한 번에 비하면 시간이 거의 들지 않아, greedy로 바꿔도 속도 비교 결과는 달라지지 않는다.",
     "greedy는 같은 입력이면 늘 같은 답이 나와서, 코드를 고친 뒤에도 결과가 그대로인지 비교하기 쉽다.",
     "greedy는 sampling보다 forward를 덜 불러서 tok/s가 높게 나온다.",
     "temperature 0이면 Ollama가 내부 캐시를 꺼서 우리 코드와 조건이 같아진다.",
     "greedy가 sampling보다 늘 더 좋은 답을 내기 때문이다."
    ],
    "answer": [
     0,
     1
    ],
    "explain": "sampling은 forward 한 번에 비해 시간이 거의 들지 않아 속도 비교에 영향이 없습니다. 대신 greedy는 같은 입력이면 늘 같은 답이 나와서, 코드를 고친 뒤 결과가 그대로인지 비교하기 쉽습니다."
   }
  ]
 },
 {
  "chapter": "03",
  "title": "어디가 느린지 측정하기",
  "intro": "코드는 `steps/03_measure.py`, 숫자는 3강 본문과 `examples/steps/` 실행 기록에서 그대로 가져왔습니다.",
  "pass": 5,
  "questions": [
   {
    "type": "choice",
    "prompt": "매 스텝 입력 전체를 다시 넣는 생성 루프와, 스텝별 시간을 찍은 결과(예시 출력 앞부분)입니다.",
    "code": "for _ in range(max_new):\n    next_id = pick(forward(ids))\n    ...\n    ids = torch.cat([ids, next_id], dim=1)\n\n첫 토큰 233 ms | 이후 3.6 tok/s (48토큰)\n스텝별 ms: [244, 258, 278, 256, 257, 259, 260, 267, 309, 306, ...]",
    "codeLang": "text",
    "after": "이 결과에서 이상한 점으로 맞는 것을 고르십시오.",
    "options": [
     "첫 토큰이 두 번째 토큰보다 훨씬 빠르다.",
     "토큰 하나를 붙였을 뿐인데 두 번째 토큰부터도 첫 토큰만큼 걸리고, 갈수록 조금씩 느려진다.",
     "스텝마다 시간이 10배씩 들쭉날쭉하다.",
     "두 번째 토큰부터는 첫 토큰보다 훨씬 빨라졌다가, 30토큰쯤부터 다시 느려진다."
    ],
    "answer": 1,
    "explain": "첫 토큰은 638토큰을 처음 읽으니 오래 걸리는 게 당연하지만, 그 뒤 스텝도 같은 양을 매번 다시 계산하고 있습니다. 입력이 한 토큰씩 길어지니 조금씩 더 느려집니다."
   },
   {
    "type": "number",
    "prompt": "입력 길이만 바꿔 forward 한 번의 시간을 잰 코드와 본문 실행 결과입니다.",
    "code": "for n in [1, 32, 128, 256, 512, ids.shape[1]]:\n    ms = sorted(timed(lambda: forward(ids[:, :n])) for _ in range(3))[1]\n    print(f\"입력 {n:4}토큰 → {ms:6.1f} ms\")\n\n입력    1토큰 →   19.5 ms\n입력   32토큰 →   21.6 ms\n입력  128토큰 →   44.4 ms\n입력  256토큰 →   85.7 ms\n입력  512토큰 →  182.3 ms\n입력  638토큰 →  231.5 ms",
    "codeLang": "text",
    "after": "새 토큰 하나만 넣을 수 있다면 스텝 하나와 초당 토큰 수는 대략 얼마가 됩니까?",
    "fields": [
     {
      "label": "스텝 하나",
      "answer": 20,
      "tolerance": 1,
      "unit": "ms"
     },
     {
      "label": "초당",
      "answer": 50,
      "tolerance": 3,
      "unit": "토큰"
     }
    ],
    "explain": "1토큰 forward가 약 20 ms이므로 스텝 하나 약 **20 ms**, 1000 ÷ 20 = 초당 약 **50토큰**입니다. 지금은 매 스텝 638토큰 넘게 넣고 있어서 230 ms 이상 걸립니다."
   },
   {
    "type": "blanks",
    "prompt": "다음 코드는 프롬프트 638토큰과, 한 토큰을 더 붙인 639토큰을 1층에 넣고 앞쪽 638개 위치를 비교합니다. 출력은 `1층 출력, 앞 638개 위치의 최대 차이: 0.0000`이었습니다.",
    "code": "T = ids.shape[1]\nlonger = torch.cat([ids, greedy(forward(ids))], dim=1)\ndiff = (first_layer(ids) - first_layer(longer)[:, :T]).abs().max()\n\ndef causal_mask(T):\n    return torch.ones(T, T, dtype=torch.bool, device=device).tril()",
    "codeLang": "python",
    "after": "차이가 0인 이유를 완성하십시오.",
    "text": "`tril()`로 만든 mask는 각 위치가 ___만 보게 합니다. 639번째 토큰이 뒤에 붙어도 앞쪽 638개 위치는 그것을 ___ 계산 결과가 바뀌지 않습니다.",
    "bank": [
     "자기와 그 앞",
     "자기와 그 뒤",
     "모든 위치",
     "볼 수 없으니",
     "평균으로 나눠 섞으니",
     "0으로 덮어쓰니"
    ],
    "answer": [
     "자기와 그 앞",
     "볼 수 없으니"
    ],
    "explain": "`tril()`은 아래 삼각형만 `True`로 남기므로 각 위치는 **자기와 그 앞만** 봅니다. 뒤에 붙은 639번째 토큰은 앞쪽 위치의 계산에 들어가지 않습니다."
   },
   {
    "type": "blanks",
    "prompt": "다음 코드의 출력은 `31,752개`와 `685개`입니다(T = 638).",
    "code": "steps = 48\ncomputed = sum(T + i for i in range(steps))\nprint(f\"{steps}토큰 생성 동안 처리한 위치: {computed:,}개\")\nprint(f\"그중 처음 보는 위치: {T + steps - 1:,}개\")",
    "codeLang": "python",
    "after": "계산을 풀어 쓴 식과 `- 1`이 붙는 이유를 완성하십시오.",
    "text": "31,752 = 638 × ___ + (0 + 1 + … + ___). 두 번째 식에 `- 1`이 붙는 것은 ___ 때문입니다.",
    "bank": [
     "48",
     "47",
     "49",
     "638",
     "마지막으로 고른 48번째 토큰은 다시 forward에 넣지 않기",
     "첫 위치를 0부터 세기",
     "EOS 토큰은 위치로 세지 않기"
    ],
    "answer": [
     "48",
     "47",
     "마지막으로 고른 48번째 토큰은 다시 forward에 넣지 않기"
    ],
    "explain": "스텝 i(0부터)에 넣는 길이는 638 + i이므로 638 × 48 + (0 + 1 + … + 47) = 30,624 + 1,128 = **31,752**. 마지막으로 고른 48번째 토큰은 다시 forward에 넣지 않으므로 처음 보는 위치는 638 + 48 − 1 = **685**입니다."
   },
   {
    "type": "multi",
    "prompt": "새 토큰이 각 층에서 앞쪽 위치로부터 가져가는 값만 저장해 두면 앞쪽을 다시 계산하지 않아도 됩니다.",
    "code": "q = (x @ W[p + \"q_proj.weight\"].T).view(1, T, n_q, hd)\nk = (x @ W[p + \"k_proj.weight\"].T).view(1, T, n_kv, hd)\nv = (x @ W[p + \"v_proj.weight\"].T).view(1, T, n_kv, hd)\n...\nscores = (q @ k.transpose(-1, -2)) * hd**-0.5\nscores = scores.masked_fill(~mask, float(\"-inf\"))\nout = scores.float().softmax(-1).to(dtype) @ v",
    "codeLang": "python",
    "after": "위 attention 코드에서 앞쪽 위치에 대해 저장해 둘 값을 모두 고르십시오.",
    "options": [
     "`q`",
     "`k`",
     "`v`",
     "MLP 출력",
     "마지막 층의 출력 전체"
    ],
    "answer": [
     1,
     2
    ],
    "explain": "새 토큰의 `q`는 앞쪽 위치의 `k`와 점수를 매기고, 그 점수로 앞쪽 위치의 `v`를 섞습니다. 앞쪽 위치의 `q`와 MLP 결과는 다시 쓰지 않습니다."
   },
   {
    "type": "number",
    "prompt": "48토큰을 생성하는 동안 처리한 위치는 31,752개, 그중 처음 보는 위치는 685개였습니다.",
    "after": "31,752 ÷ 685는 약 몇 배입니까? (정수로)",
    "fields": [
     {
      "label": "31,752 ÷ 685",
      "answer": 46,
      "tolerance": 0.5,
      "unit": "배"
     }
    ],
    "explain": "31,752 ÷ 685 ≈ **46배**. 48스텝 동안 꼭 필요한 계산의 46배를 하고 있었다는 뜻입니다."
   }
  ]
 },
 {
  "chapter": "04",
  "title": "KV cache",
  "intro": "코드는 `steps/03_measure.py`, `steps/04_kv_cache.py`, 숫자는 4강 본문과 실행 출력에서 그대로 가져왔습니다.",
  "questions": [
   {
    "type": "number",
    "prompt": "KV cache를 쓰는 `generate`입니다.",
    "code": "cache = new_cache()\nlogits = forward(ids, cache)  # 프롬프트 전체는 처음 한 번만 (prefill)\npos = ids.shape[1]\nfor _ in range(max_new):\n    next_id = pick(logits)\n    ...\n    logits = forward(next_id, cache, start=pos)  # 이제 새 토큰 하나만\n    pos += 1",
    "codeLang": "python",
    "after": "캐시가 없던 루프는 매 스텝 `forward(ids)`에 입력 전체를 넣었습니다. 위 코드에서 회의록(638토큰) 기준으로 첫 `forward`와 반복문 안의 `forward`에 들어가는 토큰 수는 각각 몇 개입니까?",
    "fields": [
     {
      "label": "첫 forward (prefill)",
      "answer": 638,
      "tolerance": 0,
      "unit": "토큰"
     },
     {
      "label": "반복문 안의 forward (decode)",
      "answer": 1,
      "tolerance": 0,
      "unit": "토큰"
     }
    ],
    "explain": "첫 `forward`(prefill)는 프롬프트 전체 **638개**, 반복문 안(decode)은 방금 고른 `next_id` **1개**만 넣습니다. 앞 위치의 k, v는 캐시에 있으니 다시 계산하지 않습니다."
   },
   {
    "type": "blanks",
    "prompt": "attention에 추가된 캐시 코드입니다.",
    "code": "k = (x @ W[p + \"k_proj.weight\"].T).view(1, T, n_kv, hd)\n...\nif cache[L] is not None:  # 앞에서 계산해 둔 k, v 뒤에 새 것만 붙인다\n    k = torch.cat([cache[L][0], k], dim=2)\n    v = torch.cat([cache[L][1], v], dim=2)\ncache[L] = (k, v)",
    "codeLang": "python",
    "after": "transpose를 거친 뒤 층 하나의 k 모양은 `[1, 8, 위치 수, 128]`입니다. 빈칸을 채우십시오.",
    "text": "8은 ___, 128은 ___입니다. `dim=2`로 이어 붙이면 스텝마다 ___이 한 칸씩 늘어납니다.",
    "bank": [
     "k, v 헤드 수 (n_kv)",
     "헤드 하나의 차원 (hd)",
     "위치 축",
     "q 헤드 수 (n_q)",
     "층 수 (n_layers)",
     "헤드 축"
    ],
    "answer": [
     "k, v 헤드 수 (n_kv)",
     "헤드 하나의 차원 (hd)",
     "위치 축"
    ],
    "explain": "`view(1, T, n_kv, hd)` 뒤 transpose로 `[1, n_kv, T, hd]`가 되므로 **8**은 `n_kv`, **128**은 `hd`이고, `dim=2`는 **위치 축**입니다. 28층이 각자 따로 쌓습니다."
   },
   {
    "type": "choice",
    "prompt": "캐시를 쓰면서 mask도 바뀌었습니다.",
    "code": "# 전\ndef causal_mask(T):\n    return torch.ones(T, T, dtype=torch.bool, device=device).tril()\n\n# 후\ndef causal_mask(T, start=0):\n    q = torch.arange(start, start + T, device=device)[:, None]\n    k = torch.arange(start + T, device=device)[None, :]\n    return k <= q",
    "codeLang": "python",
    "after": "프롬프트 638토큰 직후 새 토큰 1개를 넣으면(`T=1, start=638`) 새 mask의 모양은 무엇입니까?",
    "options": [
     "`[1, 1]`",
     "`[638, 638]`",
     "`[1, 639]`",
     "`[639, 639]`"
    ],
    "answer": 2,
    "explain": "`q`는 `[1, 1]`(새 토큰 1개), `k`는 `[1, 639]`(캐시 638개 + 새 1개)이고, 비교하면 `[1, 639]`가 됩니다. 새 토큰이 캐시까지 합친 639개 위치를 모두 봅니다."
   },
   {
    "type": "blanks",
    "prompt": "캐시를 쓰기 전에는 1토큰 forward가 19.5 ms, 638토큰 forward가 231.5 ms였고, 생성 스텝 하나는 240 ms 안팎이었습니다. 캐시를 쓴 본문 실행 결과는 다음과 같습니다.",
    "code": "첫 토큰 236 ms | 이후 42.0 tok/s (48토큰)\n스텝별 ms: [25, 27, 30, 23, 24, 25, 22, 23, 24, 23, 22, …]",
    "codeLang": "text",
    "after": "무엇이 어떻게 변했고 왜 그런지, 빈칸을 채우십시오.",
    "text": "decode 스텝은 240 ms에서 ___로 줄었고, 첫 토큰 시간은 ___. decode에는 이제 ___만 들어가서 1토큰 forward 시간에 가까워졌고, prefill은 여전히 ___를 처리해야 하기 때문입니다.",
    "bank": [
     "약 23 ms",
     "약 2.4 ms",
     "거의 그대로입니다",
     "10배 줄었습니다",
     "새 토큰 1개",
     "프롬프트 638토큰 전체",
     "지난 스텝의 k, v"
    ],
    "answer": [
     "약 23 ms",
     "거의 그대로입니다",
     "새 토큰 1개",
     "프롬프트 638토큰 전체"
    ],
    "explain": "decode 스텝은 **240 ms → 23 ms 안팎**으로, 1토큰 forward(19.5 ms)에 가까워졌습니다. 첫 토큰은 **236 ms로 그대로**입니다. prefill은 여전히 프롬프트 638토큰 전체를 읽어야 하기 때문입니다."
   },
   {
    "type": "choice",
    "prompt": "캐시 결과가 맞는지 확인하는 코드입니다.",
    "code": "for _ in range(8):\n    next_id = greedy(logits)\n    seq = torch.cat([seq, next_id], dim=1)\n    logits = forward(next_id, cache, start=seq.shape[1] - 1)\n    full = forward(seq, new_cache())  # 빈 캐시 = 처음부터 전부\n    worst = max(worst, (logits - full).abs().max().item())\n    same += int(greedy(logits) == greedy(full))",
    "codeLang": "python",
    "after": "출력은 `8스텝 최대 차이 0.062 | 1등 토큰 일치 8/8`입니다. 차이가 0이 아닌데도 맞다고 보는 이유는 무엇입니까?",
    "options": [
     "0.062는 FP16에서 계산 순서가 달라지면 생기는 반올림 수준이고, 고르는 토큰이 8번 모두 같기 때문입니다.",
     "캐시에 든 k, v가 한 스텝 늦은 값이지만, 그 영향이 0.062 정도로 작기 때문입니다.",
     "logits는 softmax를 거치면 작은 차이가 사라져 확률이 정확히 같아지기 때문입니다.",
     "8스텝처럼 짧을 때는 오차가 쌓이지 않기 때문이고, 길게 생성하면 다른 문장이 나옵니다."
    ],
    "answer": 0,
    "explain": "0.062는 FP16에서 계산 순서가 달라지면 생기는 반올림 수준이고, 고르는 토큰은 8번 모두 같습니다. 첫 토큰 코드를 Hugging Face 공식 구현과 비교했을 때도 점수 차이가 이 정도(최대 0.05)였습니다."
   },
   {
    "type": "number",
    "prompt": "토큰 하나당 KV 크기를 구하는 코드입니다.",
    "code": "size = W[\"model.embed_tokens.weight\"].element_size()   # FP16 → 2\nper_token = n_layers * 2 * n_kv * hd * size",
    "codeLang": "python",
    "after": "`n_layers = 28`, `n_kv = 8`, `hd = 128`을 넣으면 `per_token`은 몇 바이트이고, KB(1 KB = 1,024바이트)로는 얼마입니까?",
    "fields": [
     {
      "label": "per_token",
      "answer": 114688,
      "tolerance": 0,
      "unit": "바이트"
     },
     {
      "label": "KB로 바꾸면",
      "answer": 112,
      "tolerance": 0,
      "unit": "KB"
     }
    ],
    "explain": "28 × 2 × 8 × 128 × 2 = **114,688바이트**, ÷ 1,024 = **112 KB**입니다. 앞의 2는 k와 v 두 개, 뒤의 2는 FP16 2바이트입니다."
   },
   {
    "type": "choice",
    "prompt": "다음 중 **틀린** 설명을 고르십시오. (토큰 하나당 KV는 114,688바이트이고, 여기서 1 MB = 10⁶바이트, 1 GB = 10⁹바이트입니다.)",
    "options": [
     "회의록과 생성한 토큰을 합친 646토큰 정도면 KV cache는 74.1 MB로 가볍다.",
     "Qwen3의 최대 길이 40,960토큰을 채우면 KV cache는 4.7 GB로 가중치(1.2 GB)보다 크다.",
     "q는 16헤드(`n_q`), k와 v는 8헤드(`n_kv`)라서, k, v를 16헤드로 저장했다면 캐시가 두 배였을 것이다.",
     "KV cache를 쓰면 첫 토큰 시간도 10배 줄어든다."
    ],
    "answer": 3,
    "explain": "첫 토큰은 236 ms 안팎으로 그대로이고, 빨라진 것은 decode입니다. 두 번째 설명은 112 KB × 40,960 ≈ 4.7 GB로 맞습니다. 그래서 Ollama는 컨텍스트 길이(`num_ctx`)를 기본값으로 작게 잡아 둡니다."
   }
  ],
  "pass": 6
 },
 {
  "chapter": "05",
  "title": "attention 커널 바꾸기 (SDPA)",
  "intro": "코드는 `steps/04_kv_cache.py`, `steps/05_sdpa.py`, 숫자는 5강 본문과 실행 출력에서 그대로 가져왔습니다.",
  "questions": [
   {
    "type": "multi",
    "prompt": "손으로 짠 attention의 다섯 줄이 SDPA 한 줄로 바뀌었습니다.",
    "code": "# 전\nk = k.repeat_interleave(n_q // n_kv, dim=1)\nv = v.repeat_interleave(n_q // n_kv, dim=1)\nscores = (q @ k.transpose(-1, -2)) * hd**-0.5\nscores = scores.masked_fill(~mask, float(\"-inf\"))\nout = scores.float().softmax(-1).to(dtype) @ v\n\n# 후\nout = F.scaled_dot_product_attention(q, k, v, attn_mask=mask, enable_gqa=True)",
    "codeLang": "python",
    "after": "SDPA 한 줄이 대신하는 일을 모두 고르십시오.",
    "options": [
     "q·kᵀ 계산과 1/√d 곱하기",
     "mask 적용과 softmax",
     "v 가중합",
     "k, v 헤드 8개를 16개로 복사하기",
     "q, k, v를 만드는 행렬곱"
    ],
    "answer": [
     0,
     1,
     2,
     3
    ],
    "explain": "`enable_gqa=True`가 k, v 헤드 8개를 q 헤드 16개가 나눠 쓰는 처리까지 맡아서 `repeat_interleave` 두 줄이 사라집니다. q, k, v 행렬곱은 SDPA 앞에 그대로 남습니다."
   },
   {
    "type": "choice",
    "prompt": "손으로 짠 attention과 `F.scaled_dot_product_attention`에 같은 638토큰을 넣었더니 출력의 최대 차이가 0.002였습니다(FP16). 이 값을 어떻게 해석합니까?",
    "options": [
     "FP16 반올림 수준이라 같은 계산으로 봅니다.",
     "SDPA가 속도를 위해 근사 계산을 하므로 정확도가 그만큼 떨어진 것입니다.",
     "mask가 한 칸 어긋나게 적용되었다는 신호라 고쳐야 합니다.",
     "SDPA가 float32로 softmax를 하지 않아 생긴 오차라, 긴 생성에서는 다른 토큰이 나옵니다."
    ],
    "answer": 0,
    "explain": "0.002는 FP16에서 계산 순서가 달라지면 생기는 반올림 수준입니다. 같은 계산을 다른 커널로 했을 뿐입니다."
   },
   {
    "type": "number",
    "prompt": "attention 한 번에 PyTorch가 실행한 연산을 센 결과입니다.",
    "code": "manual 연산 27개: unsqueeze expand clone view … bmm mul bitwise_not masked_fill _to_copy _softmax _to_copy … bmm\nfused  연산  4개: scalar_tensor scalar_tensor where _scaled_dot_product_attention_math_for_mps",
    "codeLang": "text",
    "after": "manual 27개 중 16개는 `unsqueeze`, `view`, `expand`처럼 모양 정보만 바꾸는 연산입니다. fused의 `scalar_tensor` 두 개는 mask에 쓸 스칼라 값 하나씩을 만드는 것이라 셈에서 뺍니다. 실제로 메모리를 읽고 쓰는 커널은 각각 몇 개입니까?",
    "fields": [
     {
      "label": "손으로 짠 버전 (manual)",
      "answer": 11,
      "tolerance": 0,
      "unit": "개"
     },
     {
      "label": "SDPA (fused)",
      "answer": 2,
      "tolerance": 0,
      "unit": "개"
     }
    ],
    "explain": "손으로 짠 버전은 27 − 16 = **11개**, SDPA는 mask를 숫자로 바꾸는 `where`와 attention 커널 하나로 **2개**입니다. 커널마다 입력을 메모리에서 읽고 결과를 다시 쓰므로, 커널이 줄면 메모리 왕복도 줄어듭니다."
   },
   {
    "type": "number",
    "prompt": "638토큰 prefill에서 손으로 짠 버전은 층마다 중간 결과를 약 110 MB 쓰고, 다음 커널이 그만큼 다시 읽습니다. 28층이면 약 6 GB입니다. 메모리 대역폭이 150 GB/s(M3 Pro)일 때, 이 양을 옮기기만 하는 데 드는 시간은 약 몇 ms입니까?",
    "fields": [
     {
      "label": "옮기는 데 드는 시간",
      "answer": 40,
      "tolerance": 2,
      "unit": "ms"
     }
    ],
    "explain": "6 GB ÷ 150 GB/s = 0.04초 = **약 40 ms**입니다. 계산을 전혀 하지 않아도 드는 시간입니다."
   },
   {
    "type": "blanks",
    "prompt": "attention 하나(층 하나)의 시간을 입력 길이별로 잰 결과입니다.",
    "code": "prefill 길이 | 손으로   | SDPA    | 배   | 점수 행렬 (float32)\n638         | 3.9 ms   | 1.5 ms  | 2.6× | 26 MB\n2,048       | 35.2 ms  | 9.9 ms  | 3.5× | 268 MB\n4,096       | 123.0 ms | 42.0 ms | 2.9× | 1,074 MB\n\n# 점수 행렬 크기 계산\nscores = n_q * n * n * 4 / 1e6   # MB",
    "codeLang": "text",
    "after": "손으로 짠 버전이 긴 입력에서 특히 불리한 이유를 위 식으로 설명하도록 빈칸을 채우십시오.",
    "text": "점수 행렬 크기는 길이 `n`의 ___에 비례합니다. 길이가 638에서 4,096으로 약 6.4배가 되면 점수 행렬은 약 ___배가 되고, 손으로 짠 버전은 층마다 이 행렬을 ___.",
    "bank": [
     "제곱",
     "세제곱",
     "제곱근",
     "41",
     "6.4",
     "13",
     "메모리에 쓰고 다시 읽어야 합니다",
     "칩 안에서만 처리합니다"
    ],
    "answer": [
     "제곱",
     "41",
     "메모리에 쓰고 다시 읽어야 합니다"
    ],
    "explain": "식에 `n * n`이 있으니 점수 행렬은 길이의 **제곱**에 비례합니다. 6.4² ≈ 41이라 26 MB → 1,074 MB가 되고, 층마다 1 GB 넘게 메모리에 쓰고 읽어야 합니다. 긴 문서를 넣으면 메모리부터 바닥납니다."
   },
   {
    "type": "choice",
    "prompt": "decode 때는 새 토큰 하나가 640여 개 위치를 보므로 점수 행렬이 `[16, 1, 640]`, 40 KB밖에 되지 않습니다. 그런데도 decode 스텝이 26.4 ms에서 22.7 ms로 빨라졌습니다. 이유로 가장 알맞은 것은 무엇입니까?",
    "options": [
     "SDPA가 점수 행렬을 메모리에 쓰지 않아, decode에서도 메모리 왕복이 크게 줄어서",
     "PyTorch가 실행하는 연산 수가 줄어, 연산을 GPU에 하나씩 보내는 비용이 줄어서",
     "softmax 앞뒤의 float32 변환이 사라져 계산량이 줄어서",
     "`enable_gqa`로 k, v를 복사하지 않아 KV cache를 읽는 양이 절반이 되어서"
    ],
    "answer": 1,
    "explain": "decode는 옮길 중간 데이터가 거의 없으니, 차이는 연산 수에서 나옵니다. 가중치는 두 방식 모두 똑같이 읽습니다."
   },
   {
    "type": "number",
    "prompt": "decode 한 스텝에 PyTorch가 실행하는 연산이 3,190번에서 2,546번으로 644번 줄었고, 스텝 시간은 26.4 ms에서 22.7 ms로 3.7 ms 줄었습니다. 연산 하나를 GPU에 보내는 비용은 약 몇 µs이고, 남은 2,546번에 이 비용을 곱하면 약 몇 ms입니까?",
    "fields": [
     {
      "label": "연산 하나를 보내는 비용",
      "answer": 6,
      "tolerance": 0.5,
      "unit": "µs"
     },
     {
      "label": "남은 2,546번의 비용",
      "answer": 15,
      "tolerance": 1,
      "unit": "ms"
     }
    ],
    "explain": "3.7 ms ÷ 644 ≈ **6 µs**, 2,546 × 6 µs ≈ **15 ms**입니다. decode 스텝 22.7 ms 중 상당 부분이 계산이 아니라 연산을 하나씩 GPU에 보내는 데 쓰이고 있습니다."
   }
  ],
  "pass": 6
 },
 {
  "chapter": "06",
  "title": "메모리 미리 잡아두기 (static cache)",
  "intro": "코드는 `steps/05_sdpa.py`, `steps/06_static_cache.py`, 숫자는 6강 본문과 실행 출력에서 그대로 가져왔습니다.",
  "questions": [
   {
    "type": "number",
    "prompt": "바꾸기 전의 캐시 코드입니다.",
    "code": "if cache[L] is not None:  # 앞에서 계산해 둔 k, v 뒤에 새 것만 붙인다\n    k = torch.cat([cache[L][0], k], dim=2)\n    v = torch.cat([cache[L][1], v], dim=2)\ncache[L] = (k, v)",
    "codeLang": "python",
    "after": "모델은 28층이고, k의 모양은 `[1, 8, 위치 수, 128]`입니다(`dim=2`가 위치 축). 프롬프트 638토큰을 prefill한 뒤, 그때 고른 첫 토큰 1개를 넣는 decode 스텝을 생각하십시오.",
    "fields": [
     {
      "label": "이 스텝에서 새로 만들어지는 캐시 텐서",
      "answer": 56,
      "tolerance": 0,
      "unit": "개"
     },
     {
      "label": "새로 만들어진 k의 위치 축 길이",
      "answer": 639,
      "tolerance": 0,
      "unit": "칸"
     }
    ],
    "explain": "28층 × (k, v) = **56개**입니다. `torch.cat`은 기존 텐서에 덧붙이는 게 아니라 한 칸 더 큰 텐서(638 + 1 = **639칸**)를 새로 만들어 통째로 복사하므로, 모양이 매 스텝 한 칸씩 커집니다."
   },
   {
    "type": "choice",
    "prompt": "바꾼 뒤의 캐시 코드입니다.",
    "code": "MAX_LEN = 1024  # 캐시에 담을 수 있는 최대 토큰 수\n\ndef new_cache():\n    shape = (1, n_kv, MAX_LEN, hd)  # 층마다 (k, v) 버퍼를 처음에 한 번만 잡는다\n    return [(torch.zeros(shape, dtype=dtype, device=device),\n             torch.zeros(shape, dtype=dtype, device=device)) for _ in range(n_layers)]\n\n# attention 안\nK, V = cache[L]\nK.index_copy_(2, pos, k)\nV.index_copy_(2, pos, v)\nk, v = K, V",
    "codeLang": "python",
    "after": "`index_copy_(2, pos, k)`가 하는 일로 맞는 것은 무엇입니까?",
    "options": [
     "버퍼 `K`의 위치 축(2번 축)에서 `pos`가 가리키는 칸에 새 `k`를 써 넣습니다. 새 텐서는 만들지 않습니다.",
     "버퍼 `K` 뒤에 새 `k`를 한 칸 이어 붙인 1,025칸짜리 버퍼를 새로 만듭니다.",
     "버퍼 `K`의 헤드 축에서 `pos`번 헤드를 새 `k`로 바꿉니다.",
     "새 `k`를 `K`의 `pos` 칸에 쓰고, `pos` 뒤의 칸은 0으로 지웁니다."
    ],
    "answer": 0,
    "explain": "`K`의 위치 축(2번 축)에서 `pos`가 가리키는 칸에 새 `k`를 써 넣습니다. 새 텐서를 만들지 않으므로 버퍼 크기는 1,024칸 그대로이고, 채우는 칸만 하나씩 오른쪽으로 갑니다."
   },
   {
    "type": "choice",
    "prompt": "static cache 코드는 채운 부분만 잘라 주지 않고 `K, V` 버퍼 전체(1,024칸)를 attention에 넘깁니다. 아직 안 채운 칸은 아래 mask가 처리합니다.",
    "code": "def causal_mask(pos):\n    # 새 토큰들(위치 pos)이 캐시 MAX_LEN칸 중 어디까지 볼지. 빈 칸은 못 본다\n    k = torch.arange(MAX_LEN, device=device)[None, :]\n    return k <= pos[:, None]",
    "codeLang": "python",
    "after": "쓸데없는 칸까지 계산하면서도 버퍼 전체를 넘기는 이유는 무엇입니까?",
    "options": [
     "매 스텝 attention에 들어가는 텐서 모양을 똑같이 만들어, `torch.compile`이 한 가지 모양에 맞춘 코드를 쓸 수 있게 하려고",
     "채운 부분만 잘라서 넘기면 앞 위치의 k, v 값이 바뀌어 결과가 틀려지기 때문에",
     "1,024칸 전체를 한 번에 계산하는 편이 채운 칸만 계산하는 것보다 빠르기 때문에",
     "빈 칸을 넘기지 않으면 KV 버퍼 메모리가 해제되어 다음 스텝에 다시 잡아야 하기 때문에"
    ],
    "answer": 0,
    "explain": "목적은 모양 고정입니다. 모양이 고정되어야 `torch.compile`로 한 가지 모양에 맞춘 코드를 만들 수 있습니다. 안 채운 칸은 `k <= pos` 조건이 거짓이라 mask로 가려지고, 대가로 prefill이 손해를 봅니다."
   },
   {
    "type": "blanks",
    "prompt": "위치를 넘기는 방식이 바뀌었습니다.",
    "code": "# 전: 파이썬 정수\nlogits = forward(next_id, cache, start=pos)\npos += 1\n\n# 후: GPU 위의 텐서\npos = torch.tensor([T], device=device)\n...\nlogits = forward(next_id, cache, pos)\npos += 1",
    "codeLang": "python",
    "after": "다음에 적용할 `torch.compile`은 \"같은 모양, 같은 값\"을 가정하고 코드를 만들고, 그 가정이 깨지면 다시 컴파일합니다. 위치를 텐서로 바꾼 이유가 되도록 빈칸을 채우십시오.",
    "text": "파이썬 정수는 ___으로 취급되어, 스텝마다 바뀌면 ___. 텐서 안의 값은 바뀌어도 ___이 같으면 같은 코드를 씁니다. 그래서 `pos += 1`도 ___ 연산으로 처리합니다.",
    "bank": [
     "값",
     "모양",
     "dtype",
     "그때마다 다시 컴파일합니다",
     "컴파일한 코드를 그대로 씁니다",
     "GPU 위의 텐서",
     "파이썬 변수"
    ],
    "answer": [
     "값",
     "그때마다 다시 컴파일합니다",
     "모양",
     "GPU 위의 텐서"
    ],
    "explain": "파이썬 정수는 \"값\"으로 취급되어 스텝마다 바뀌면 그때마다 다시 컴파일합니다. 텐서는 값이 바뀌어도 모양이 같으면 같은 코드를 쓰므로, 위치를 GPU 위의 텐서로 들고 다닙니다."
   },
   {
    "type": "number",
    "prompt": "다음 코드의 출력을 채우십시오. (`n_layers = 28`, `n_kv = 8`, `hd = 128`, FP16, `MAX_LEN = 1024`)",
    "code": "def causal_mask(pos):\n    k = torch.arange(MAX_LEN, device=device)[None, :]\n    return k <= pos[:, None]\n\npos = torch.tensor([700], device=device)\nK = new_cache()[0][0]   # shape = (1, n_kv, MAX_LEN, hd)\nprint(\"mask\", list(causal_mask(pos).shape), \"| K 버퍼\", list(K.shape))\nreserved = n_layers * 2 * K.numel() * K.element_size()\nprint(f\"미리 잡은 KV 버퍼: {reserved / 1e6:.1f} MB ({MAX_LEN}토큰분)\")",
    "codeLang": "python",
    "after": "출력은 `mask [1, ?] | K 버퍼 [1, 8, ?, 128]`과 `미리 잡은 KV 버퍼: ? MB (1024토큰분)` 꼴입니다.",
    "fields": [
     {
      "label": "mask 모양 [1, ?]의 ?",
      "answer": 1024,
      "tolerance": 0,
      "unit": ""
     },
     {
      "label": "K 버퍼 모양 [1, 8, ?, 128]의 ?",
      "answer": 1024,
      "tolerance": 0,
      "unit": ""
     },
     {
      "label": "미리 잡은 KV 버퍼",
      "answer": 117.4,
      "tolerance": 0.1,
      "unit": "MB"
     }
    ],
    "explain": "`mask [1, 1024] | K 버퍼 [1, 8, 1024, 128]`, `미리 잡은 KV 버퍼: 117.4 MB (1024토큰분)`입니다. 28 × 2 × (8 × 1,024 × 128) × 2바이트 = 117,440,512바이트이고, mask는 `pos`가 700이어도 MAX_LEN칸 전체 모양입니다. Ollama도 모델을 띄울 때 `num_ctx`만큼 KV 공간을 미리 잡습니다."
   },
   {
    "type": "choice",
    "prompt": "바꾸기 전과 후의 실행 결과입니다(예시 출력). 바꾼 뒤에는 prefill 때도 1,024칸 버퍼 전체를 attention에 넘깁니다.",
    "code": "전: 첫 토큰 182 ms | 이후 44.5 tok/s (48토큰)\n후: 첫 토큰 233 ms | 이후 43.9 tok/s (48토큰)",
    "codeLang": "text",
    "after": "맞는 해석을 고르십시오.",
    "options": [
     "decode가 두 배 빨라졌고, 첫 토큰은 버퍼를 처음 잡느라 조금 느려졌다.",
     "decode는 그대로이고, 첫 토큰은 prefill이 1,024칸 전체를 보고 mask로 가리느라 느려졌다.",
     "decode는 그대로이고, 첫 토큰은 KV 버퍼 117 MB를 처음에 잡느라 느려졌다.",
     "decode는 조금 느려졌고, 첫 토큰은 위치를 GPU 텐서로 바꿔 동기화가 늘어서 느려졌다."
    ],
    "answer": 1,
    "explain": "이 변경은 속도를 올리려는 게 아니라 모양을 고정하려는 것입니다. prefill에서 638개 위치가 638칸만 보면 되는데 1,024칸을 다 보니 첫 토큰은 손해를 봅니다."
   }
  ],
  "pass": 5
 },
 {
  "chapter": "07",
  "title": "파이썬 오버헤드 줄이기 (torch.compile)",
  "intro": "코드는 `steps/06_static_cache.py`, `steps/07_compile.py`, 숫자는 7강 본문과 `examples/steps/07_compile.pass1.txt`에서 그대로 가져왔습니다.",
  "pass": 5,
  "questions": [
   {
    "type": "number",
    "prompt": "decode 한 스텝은 층마다 다음과 같은 작은 연산으로 이뤄지고, 28층을 합치면 PyTorch 연산이 2,546번 실행됩니다. 연산 하나를 GPU에 보내는 비용은 약 6 µs로 측정됐습니다.",
    "code": "def block(x, L, cos, sin, mask, cache, pos):\n    p = f\"model.layers.{L}.\"\n    h = rms_norm(x, W[p + \"input_layernorm.weight\"])\n    x = x + attention(h, L, cos, sin, mask, cache, pos)\n    h = rms_norm(x, W[p + \"post_attention_layernorm.weight\"])\n    x = x + mlp(h, L)\n    return x",
    "codeLang": "python",
    "after": "2,546 × 6 µs는 약 몇 ms입니까? 컴파일 전 decode 스텝은 약 22 ms입니다.",
    "fields": [
     {
      "label": "연산을 보내는 비용",
      "answer": 15,
      "tolerance": 0.5,
      "unit": "ms"
     }
    ],
    "explain": "2,546 × 6 µs = 15,276 µs ≈ **15 ms**. 22 ms 중 상당 부분이 계산이 아니라 파이썬이 다음 줄을 읽고, PyTorch가 연산을 고르고, GPU에 명령을 보내는 데 쓰인다는 뜻입니다. 토큰 하나짜리 연산은 GPU에서 금방 끝나므로 이 비용이 상대적으로 커집니다."
   },
   {
    "type": "choice",
    "prompt": "추가한 코드는 다음 한 줄입니다.",
    "code": "decode = torch.compile(forward, dynamic=False)",
    "codeLang": "python",
    "after": "`torch.compile`이 하는 일로 **맞지 않는** 것을 고르십시오.",
    "options": [
     "함수를 한 번 따라가며 연산 목록을 뽑는다.",
     "붙어 있는 작은 연산을 하나의 커널로 합친다.",
     "파이썬을 거치지 않고 실행하는 코드를 만든다.",
     "가중치를 자동으로 INT8로 바꾼다."
    ],
    "answer": 3,
    "explain": "양자화는 컴파일과 별개로 직접 해야 합니다. 나머지 셋은 `torch.compile`이 하는 일입니다."
   },
   {
    "type": "choice",
    "prompt": "`generate`에서 컴파일한 함수는 decode에만 씁니다.",
    "code": "logits = forward(ids, cache, torch.arange(T, device=device))   # prefill\n...\nlogits = decode(next_id, cache, pos)                            # decode",
    "codeLang": "python",
    "after": "`dynamic=False`로 컴파일할 수 있는 것은 decode뿐이고 prefill은 그대로 두는 이유로 맞는 것을 고르십시오.",
    "options": [
     "decode 입력은 매 스텝 모양이 같지만, prefill 입력은 프롬프트 길이마다 모양이 다르기 때문이다.",
     "prefill은 한 번만 실행되므로 컴파일해도 빨라지는 부분이 전혀 없기 때문이다.",
     "prefill은 캐시를 채우는 단계라서 `torch.compile`이 캐시에 쓰는 연산을 지원하지 않기 때문이다.",
     "prefill의 `ids`는 decode보다 커서, 컴파일된 커널이 GPU 메모리에 들어가지 않기 때문이다."
    ],
    "answer": 0,
    "explain": "`dynamic=False`는 한 가지 모양에 맞춘 코드를 만듭니다. decode 입력은 매 스텝 `[1, 1]`로 같지만, prefill의 `ids`는 프롬프트 길이에 따라 `[1, 638]`, `[1, 500]`처럼 달라지므로 한 가지 모양에 맞춘 코드를 쓸 수 없습니다."
   },
   {
    "type": "choice",
    "prompt": "같은 기계에서 같은 코드를 두 번 실행했을 때의 첫 줄입니다. 첫 실행 뒤 `~/.cache/torch` 아래에 파일이 생겼습니다.",
    "code": "첫 실행:   컴파일: 19.6초 (처음 한 번)\n두 번째:   컴파일: 2.9초 (처음 한 번)",
    "codeLang": "text",
    "after": "같은 코드인데 컴파일 시간이 이렇게 다른 이유로 맞는 것을 고르십시오.",
    "options": [
     "컴파일 결과가 디스크에 캐시되어, 두 번째 실행부터는 처음부터 다시 만들지 않기 때문이다.",
     "두 번째 실행은 프롬프트가 더 짧아서 따라가야 할 연산 수가 적었기 때문이다.",
     "두 번째 실행은 `dynamic=True`로 컴파일해서 모양별 코드를 만들지 않았기 때문이다.",
     "첫 실행은 워밍업 없이 첫 스텝에서 컴파일까지 함께 쟀기 때문이다."
    ],
    "answer": 0,
    "explain": "컴파일 결과가 디스크에 캐시되기 때문입니다. 처음에는 20초 가까이 걸리고, 두 번째 실행부터는 2~3초로 줄어듭니다. 두 번째 실행은 그 캐시를 다시 쓴 것입니다."
   },
   {
    "type": "blanks",
    "prompt": "처음에는 워밍업을 아래 첫 줄처럼 했습니다(본문 설명대로 다시 쓴 코드입니다). 그랬더니 첫 진짜 스텝에서 17초가 걸렸고, `TORCH_LOGS=recompiles`는 두 번째 줄처럼 알려 줬습니다. 최종 코드는 아래 마지막 두 줄처럼 고쳤습니다.",
    "code": "# 처음 워밍업\ndecode(ids[:, -1:], warm, torch.tensor([ids.shape[1]], device=device))\n\n# TORCH_LOGS=recompiles\n# tensor 'ids' stride mismatch at index 0. expected 638, actual 1\n\n# 최종 코드\nfirst_id = greedy(forward(ids, warm, torch.arange(ids.shape[1], device=device)))\ndecode(first_id, warm, torch.tensor([ids.shape[1]], device=device))",
    "codeLang": "python",
    "after": "모양은 둘 다 `[1, 1]`인데 왜 다시 컴파일했고, 왜 최종 코드로 해결됩니까? 빈칸을 채우십시오.",
    "text": "`ids[:, -1:]`로 잘라 낸 텐서는 모양이 `[1, 1]`이어도 메모리 배치가 원본 ___ 을 따라가서 stride가 ___ 입니다. 진짜 decode 입력의 stride는 ___ 이라서 다시 컴파일했습니다. `greedy(...)`의 결과는 실제 decode에 들어가는 ___ 와 같은 방식으로 만들어진 텐서라 stride도 같습니다.",
    "bank": [
     "`[1, 638]`",
     "638",
     "1",
     "`next_id`",
     "`[1, 1]`",
     "1024",
     "`warm`"
    ],
    "answer": [
     "`[1, 638]`",
     "638",
     "1",
     "`next_id`"
    ],
    "explain": "컴파일된 코드는 모양뿐 아니라 stride까지 같기를 기대합니다. `ids[:, -1:]`는 원본 `[1, 638]`의 배치를 따라 stride가 638이지만 진짜 decode 입력은 stride 1이라 다시 컴파일했습니다. `greedy(...)`로 만든 `first_id`는 실제 `next_id`와 같은 방식으로 만들어져 stride가 같습니다."
   },
   {
    "type": "number",
    "prompt": "컴파일 전 decode는 45.0 tok/s, 컴파일 후 65.7 tok/s입니다. 몇 % 빨라졌습니까?",
    "fields": [
     {
      "label": "빨라진 정도",
      "answer": 46,
      "tolerance": 1,
      "unit": "%"
     }
    ],
    "explain": "65.7 ÷ 45.0 ≈ 1.46, 약 **46%** 빨라졌습니다. 같은 정밀도(FP16)의 Ollama는 87 tok/s입니다."
   }
  ]
 },
 {
  "chapter": "08",
  "title": "가중치를 INT8로 줄이기",
  "intro": "코드는 `steps/07_compile.py`, `steps/08_int8.py`, 숫자는 8강 본문과 `examples/steps/08_int8.pass1.txt`에서 그대로 가져왔습니다.",
  "pass": 6,
  "questions": [
   {
    "type": "choice",
    "prompt": "decode 한 스텝은 새 토큰 하나를 계산하면서 아래 행렬곱을 28층 전부 지납니다.",
    "code": "q = (x @ W[p + \"q_proj.weight\"].T).view(1, T, n_q, hd)\nk = (x @ W[p + \"k_proj.weight\"].T).view(1, T, n_kv, hd)\nv = (x @ W[p + \"v_proj.weight\"].T).view(1, T, n_kv, hd)\n...\ngate = x @ W[p + \"gate_proj.weight\"].T\nup = x @ W[p + \"up_proj.weight\"].T\nreturn (F.silu(gate) * up) @ W[p + \"down_proj.weight\"].T",
    "codeLang": "python",
    "after": "`x`는 토큰 하나(`[1, 1, 1024]`)인데 `W[...]`는 `[2048, 1024]`, `[3072, 1024]` 같은 큰 행렬입니다. 컴파일까지 마친 decode 스텝에서 시간 대부분을 쓰는 일은 무엇입니까? 행렬의 각 원소는 한 번 읽어서 곱셈·덧셈을 한 번씩만 합니다.",
    "options": [
     "큰 행렬과 토큰 벡터를 곱하는 곱셈·덧셈 계산",
     "가중치를 메모리에서 읽는 일",
     "파이썬이 연산을 하나씩 GPU에 보내는 일",
     "attention에서 softmax를 계산하는 일"
    ],
    "answer": 1,
    "explain": "**가중치를 메모리에서 읽는 일**입니다. 토큰 하나를 위해 층 28개의 큰 행렬을 전부 한 번씩 읽어야 하고, 곱셈 자체는 토큰 하나라 금방 끝납니다. 파이썬이 연산을 보내는 비용은 컴파일로 이미 줄였습니다."
   },
   {
    "type": "number",
    "prompt": "양자화 코드입니다.",
    "code": "w = W.pop(key + \".weight\").float()\nscale = w.abs().amax(dim=1) / 127            # 행마다 가장 큰 값이 127이 되게\nQ[key] = ((w / scale[:, None]).round().to(torch.int8), scale.to(dtype))",
    "codeLang": "python",
    "after": "1층 `q_proj` 첫 행에서 절댓값이 가장 큰 값은 0.0518입니다. 이 행의 `scale`을 구하고, 원래 값 0.0204가 INT8로 몇이 되는지 계산하십시오.",
    "fields": [
     {
      "label": "이 행의 scale (유효숫자 3자리)",
      "answer": 0.000408,
      "tolerance": 2e-06,
      "unit": ""
     },
     {
      "label": "0.0204의 INT8 값",
      "answer": 50,
      "tolerance": 0,
      "unit": ""
     }
    ],
    "explain": "scale = 0.0518 ÷ 127 ≈ **0.000408**. 0.0204 ÷ 0.000408 ≈ 50.0 → **50**. 되돌리면 50 × 0.000408 ≈ 0.0204이고, 이 행 전체의 평균 오차는 값 크기의 1% 정도입니다."
   },
   {
    "type": "choice",
    "prompt": "같은 양자화 코드입니다.",
    "code": "w = W.pop(key + \".weight\").float()\nscale = w.abs().amax(dim=1) / 127            # 행마다 가장 큰 값이 127이 되게\nQ[key] = ((w / scale[:, None]).round().to(torch.int8), scale.to(dtype))",
    "codeLang": "python",
    "after": "`Q[key]`에 저장되는 것을 고르십시오.",
    "options": [
     "INT8 행렬만",
     "INT8 행렬과 행마다 scale 하나",
     "INT8 행렬과 원소마다 scale 하나",
     "FP16 행렬과 INT8 행렬 둘 다"
    ],
    "answer": 1,
    "explain": "`(int8 행렬, scale)` 한 쌍이고, `scale`은 `amax(dim=1)`이라 행마다 하나입니다."
   },
   {
    "type": "multi",
    "prompt": "양자화 대상 목록입니다. `model.embed_tokens.weight`는 목록에 없어서 FP16으로 남습니다. 이 행렬은 아래 두 곳에서 쓰입니다. (embedding 표는 151,936 × 1,024로 FP16 약 311 MB이고, 층 행렬은 모두 합쳐 FP16 882 MB입니다.)",
    "code": "LINEARS = [\"self_attn.q_proj\", \"self_attn.k_proj\", \"self_attn.v_proj\",\n           \"self_attn.o_proj\", \"mlp.gate_proj\", \"mlp.up_proj\", \"mlp.down_proj\"]\n\nx = W[\"model.embed_tokens.weight\"][ids]          # 입력: 토큰 번호의 행 꺼내기\nreturn x @ W[\"model.embed_tokens.weight\"].T      # 출력: 다음 토큰 점수",
    "codeLang": "python",
    "after": "이 행렬을 FP16으로 남겨 둔 이유 두 가지를 고르십시오.",
    "options": [
     "출력 점수를 직접 만드는 행렬이라 오차에 민감하다.",
     "입력에서 토큰 번호의 행을 꺼내 쓰는 용도도 있다.",
     "decode 스텝에서는 읽히지 않으므로 줄여도 속도 이득이 없다.",
     "층 행렬보다 훨씬 작아서 줄여도 메모리가 거의 줄지 않는다."
    ],
    "answer": [
     0,
     1
    ],
    "explain": "① 출력 점수를 직접 만드는 행렬이라 오차에 민감하고, ② 입력에서 토큰 번호의 행을 꺼내 쓰는 용도도 있습니다. 이 행렬은 lm head로 매 스텝 읽히고, embedding과 norm을 합쳐 311 MB나 되므로 나머지 두 보기는 틀립니다."
   },
   {
    "type": "blanks",
    "prompt": "처음에는 곱하기 직전에 FP16으로 되돌려서 곱했습니다(저장소에는 남아 있지 않아서, 본문 설명대로 다시 쓴 것입니다). decode 스텝이 24 ms에서 105 ms로 오히려 느려졌습니다. 아래 둘째 함수가 최종 코드입니다.",
    "code": "# 처음 방식\ndef linear(x, key):\n    w, scale = Q[key]\n    return x @ (w.to(dtype) * scale[:, None]).T\n\n# 최종 코드\ndef linear(x, key):\n    w, scale = Q[key]\n    out = torch.ops.aten._weight_int8pack_mm(x.reshape(-1, x.shape[-1]), w, scale)\n    return out.view(*x.shape[:-1], -1)",
    "codeLang": "python",
    "after": "느려진 이유와 최종 코드의 차이를 빈칸에 채우십시오.",
    "text": "처음 방식은 매번 `w.to(dtype) * scale`로 ___ 크기의 행렬을 새로 만들어 메모리에 쓰고 다시 읽으므로, 줄이기 전보다 더 많이 읽게 됩니다. 최종 코드는 ___ 가중치를 그대로 읽어서 ___ 안에서 scale을 곱하므로 사본이 생기지 않습니다.",
    "bank": [
     "FP16",
     "INT8",
     "커널",
     "FP32",
     "파이썬",
     "디스크 캐시"
    ],
    "answer": [
     "FP16",
     "INT8",
     "커널"
    ],
    "explain": "처음 방식은 INT8을 읽고, FP16을 쓰고, FP16을 또 읽으니 더 많이 읽습니다. 최종 코드는 INT8 가중치를 그대로 읽어서 **커널 안에서** scale을 곱하므로 FP16 사본이 생기지 않습니다."
   },
   {
    "type": "number",
    "prompt": "메모리를 센 코드와 출력입니다.",
    "code": "fp = sum(nbytes(t) for k, t in W.items() if k != \"lm_head.weight\")\nq8 = sum(nbytes(w) + nbytes(s) for w, s in Q.values())\nprint(f\"FP16로 남은 것(embedding, norm): {fp / 1e6:.0f} MB\")\nprint(f\"INT8로 바꾼 층 행렬: {q8 / 1e6:.0f} MB (FP16이면 {q8 * 2 / 1e6:.0f} MB)\")\n\n# 출력\n# FP16로 남은 것(embedding, norm): 311 MB\n# INT8로 바꾼 층 행렬: 441 MB (FP16이면 882 MB)\n# 첫 토큰 225 ms | 이후 97.6 tok/s (48토큰)",
    "codeLang": "python",
    "after": "스텝당 읽는 층 행렬은 몇 MB 줄었습니까? 출력의 97.6 tok/s로 계산하면 decode 스텝 하나는 약 몇 ms입니까? (줄이기 전 스텝은 15 ms 안팎이었습니다.)",
    "fields": [
     {
      "label": "줄어든 층 행렬 읽기",
      "answer": 441,
      "tolerance": 1,
      "unit": "MB"
     },
     {
      "label": "decode 스텝 시간",
      "answer": 10.2,
      "tolerance": 1,
      "unit": "ms"
     }
    ],
    "explain": "층 행렬이 882 MB → 441 MB로 **441 MB**, 절반이 줄었습니다. 1000 ÷ 97.6 ≈ **10.2 ms**로, 스텝은 11 ms 안팎(예시 출력은 9~12 ms)이 되었습니다. 답은 48토큰까지 FP16 때와 한 글자도 다르지 않았습니다."
   },
   {
    "type": "choice",
    "prompt": "같은 기계의 결과입니다.",
    "code": "엔진                      층 행렬 정밀도   decode\n우리, 컴파일까지          FP16             66 tok/s\n우리, INT8                INT8             92 tok/s\nOllama qwen3:0.6b-fp16    FP16             87 tok/s\nOllama qwen3:0.6b         Q4              169 tok/s",
    "codeLang": "text",
    "after": "\"우리 엔진이 Ollama를 이겼다\"는 말에 대해 맞는 것을 고르십시오.",
    "options": [
     "같은 조건의 비교이므로 그대로 맞다.",
     "정밀도가 달라 같은 조건이 아니다. 같은 FP16끼리는 66 대 87이다.",
     "Ollama Q4도 이겼다.",
     "INT8 때문에 출력이 달라졌으므로 비교할 수 없다."
    ],
    "answer": 1,
    "explain": "읽는 정밀도가 다르므로 같은 조건이 아니고, 같은 FP16끼리는 66 대 87입니다. Q4는 169 tok/s라 Q4도 이겼다는 말은 틀리고, 48토큰 출력이 FP16과 같으므로 비교할 수 없다는 말도 틀립니다."
   }
  ]
 },
 {
  "chapter": "09",
  "title": "다시 Ollama와 비교하기",
  "intro": "코드는 `steps/09_compare.py`, 숫자는 9강 본문과 `examples/steps/09_compare.pass1.txt`에서 그대로 가져왔습니다.",
  "pass": 6,
  "questions": [
   {
    "type": "match",
    "prompt": "Ollama를 부르는 코드입니다.",
    "code": "body = json.dumps({\n    \"model\": model, \"stream\": False, \"think\": False,\n    \"messages\": [{\"role\": \"user\", \"content\": f\"({time.time_ns()}) {request}\\n\\n{meeting}\"}],\n    \"options\": {\"temperature\": 0, \"num_predict\": n},\n}).encode()",
    "codeLang": "python",
    "after": "각 설정이 맞추려는 것을 짝지으십시오.",
    "pairs": [
     [
      "메시지 앞의 `time.time_ns()`",
      "지난 요청의 프롬프트 계산을 재사용해 첫 토큰 시간이 실제 prefill보다 짧게 잡히는 것을 막음"
     ],
     [
      "`\"temperature\": 0`",
      "우리 엔진의 greedy와 같은 디코딩"
     ],
     [
      "`\"num_predict\": n`",
      "생성할 토큰 수를 우리 엔진과 같게"
     ],
     [
      "`\"think\": False`",
      "우리 엔진의 `enable_thinking=False`처럼 생각 과정 없이 답하게"
     ]
    ],
    "explain": "`time.time_ns()`가 없으면 Ollama가 지난 요청의 프롬프트 계산을 재사용해서, 두 번째 요청부터 첫 토큰 시간이 실제 prefill보다 훨씬 짧게 잡힙니다. 앞부분을 매번 다르게 하면 처음부터 계산해 우리 엔진과 같은 조건이 됩니다. `temperature 0`은 greedy와 같은 디코딩으로 맞추는 설정입니다."
   },
   {
    "type": "choice",
    "prompt": "출력에서 응답의 어떤 값을 쓰는지 보십시오.",
    "code": "return r[\"prompt_eval_duration\"] / 1e6, r[\"eval_count\"] / r[\"eval_duration\"] * 1e9\n\n# 출력\n# qwen3:0.6b-fp16  첫 토큰  151 ms |  89.8 tok/s\n# qwen3:0.6b       첫 토큰  166 ms | 171.8 tok/s\n# 우리 (08장)         첫 토큰  220 ms |  91.9 tok/s",
    "codeLang": "python",
    "after": "같은 FP16 모델끼리 비교할 때 맞는 것을 고르십시오.",
    "options": [
     "decode는 우리가 91.9 대 89.8로 앞서고, 첫 토큰은 220 ms 대 151 ms로 뒤진다.",
     "첫 토큰은 우리가 220 대 151로 앞서고, decode는 91.9 대 89.8로 뒤진다.",
     "decode는 91.9 대 171.8로 크게 뒤지고, 첫 토큰은 220 ms 대 166 ms로 뒤진다.",
     "두 항목 모두 우리가 앞선다."
    ],
    "answer": 0,
    "explain": "같은 FP16 모델은 `qwen3:0.6b-fp16`입니다. decode는 **91.9 대 89.8**로 앞서고(층 행렬을 INT8로 읽는 덕분), 첫 토큰은 시간이 짧을수록 좋으므로 **220 ms 대 151 ms**로 뒤집니다. 171.8은 Q4 모델의 숫자입니다."
   },
   {
    "type": "choice",
    "prompt": "스텝마다 읽는 양을 계산하는 코드입니다. (`MAX_LEN = 1024`, `n_layers = 28`, `n_kv = 8`, `hd = 128`)",
    "code": "step_bytes = (sum(nbytes(w) + nbytes(s) for w, s in Q.values())\n              + nbytes(W[\"model.embed_tokens.weight\"])         # lm head\n              + n_layers * 2 * n_kv * MAX_LEN * hd * 2)          # KV 버퍼",
    "codeLang": "python",
    "after": "세 항목은 각각 약 441 MB, 311 MB, 117 MB입니다. 세 번째 항목에서 실제로 채운 칸은 650개 정도인데 1,024칸 전체를 세는 이유로 맞는 것을 고르십시오.",
    "options": [
     "모양을 고정하려고 1,024칸 전체를 attention에 넘기고, 빈 칸은 mask로 가리기 때문이다.",
     "생성이 끝날 때쯤에는 1,024칸이 모두 채워지므로 미리 최댓값으로 셌기 때문이다.",
     "버퍼를 처음에 0으로 채우는 비용을 스텝마다 나눠 넣었기 때문이다.",
     "빈 칸도 K, V를 계산해 채워 두어야 mask 없이 attention을 할 수 있기 때문이다."
    ],
    "answer": 0,
    "explain": "attention에 버퍼 1,024칸 전체를 넘기고 빈 칸은 mask로 가리기 때문입니다. 모양을 고정해 컴파일하려고 낸 비용이고, 채운 칸만 읽으면 줄일 수 있는 낭비입니다."
   },
   {
    "type": "number",
    "prompt": "다음 줄은 스텝당 읽는 바이트 × decode 속도를 GB/s로 출력합니다.",
    "code": "print(f\"→ {step_bytes * ours_rate / 1e9:.0f} GB/s\")",
    "codeLang": "python",
    "after": "스텝당 읽는 양은 약 870 MB(441 + 311 + 117), 우리 decode는 92 tok/s입니다. 870 MB × 92 tok/s를 계산하고, 이것이 이론 대역폭 150 GB/s의 몇 %인지 쓰십시오.",
    "fields": [
     {
      "label": "실제로 읽는 속도",
      "answer": 80,
      "tolerance": 2,
      "unit": "GB/s"
     },
     {
      "label": "이론 대역폭 대비",
      "answer": 53,
      "tolerance": 3,
      "unit": "%"
     }
    ],
    "explain": "0.870 GB × 92 ≈ **80 GB/s**. 80 ÷ 150 ≈ 0.53, 이론 대역폭의 **절반 정도**(약 53%)입니다."
   },
   {
    "type": "number",
    "prompt": "`qwen3:0.6b-fp16`은 스텝마다 가중치 약 1.2 GB를 읽습니다. 메모리 대역폭이 150 GB/s인 이 맥에서 이 모델의 decode 속도 천장은 초당 몇 토큰입니까? 같은 조건으로 잰 Ollama의 87 tok/s는 천장의 몇 %입니까?",
    "fields": [
     {
      "label": "decode 속도 천장",
      "answer": 125,
      "tolerance": 2,
      "unit": "tok/s"
     },
     {
      "label": "87 tok/s는 천장의",
      "answer": 70,
      "tolerance": 4,
      "unit": "%"
     }
    ],
    "explain": "150 ÷ 1.2 ≈ **초당 125토큰**. 87 ÷ 125 ≈ 0.70, 천장의 **3분의 2쯤**입니다. 더 빠르게 하려면 읽을 양 자체를 줄여야 하고, 522 MB짜리 Q4 모델이 171 tok/s를 내는 이유입니다."
   },
   {
    "type": "blanks",
    "prompt": "강마다 바꾼 것과 decode 속도입니다.",
    "code": "바꾼 것                엔진 코드   decode (tok/s)\n고르고, 붙이고, 다시   +49 −48      3.6\n층마다 K, V 저장       +28 −13     37.9\nSDPA 커널              +2 −5       44.0\n고정 크기 버퍼         +27 −23     45.0\ndecode 컴파일          +8 −4       65.7\nINT8 가중치            +24 −7      92.2",
    "codeLang": "text",
    "after": "빈칸을 채우십시오.",
    "text": "가장 큰 배수를 낸 변경은 ___(으)로, 약 ___ 빨라졌습니다. 속도는 거의 그대로지만 꼭 필요했던 변경은 ___ 이고, 매 스텝 텐서 모양을 같게 만들어 그다음의 ___ 을 가능하게 했습니다.",
    "bank": [
     "층마다 K, V 저장",
     "10배",
     "고정 크기 버퍼",
     "decode 컴파일",
     "INT8 가중치",
     "SDPA 커널",
     "1.5배"
    ],
    "answer": [
     "층마다 K, V 저장",
     "10배",
     "고정 크기 버퍼",
     "decode 컴파일"
    ],
    "explain": "KV cache(층마다 K, V 저장)는 3.6 → 37.9로 37.9 ÷ 3.6 ≈ **10배**입니다. 고정 크기 버퍼는 44.0 → 45.0으로 거의 그대로지만, 매 스텝 모양을 같게 만들어 decode 컴파일(+46%)을 가능하게 했습니다."
   },
   {
    "type": "multi",
    "prompt": "더 빠르게 하는 방향 네 가지입니다. \"가중치를 한 번 읽을 때 여러 토큰을 처리한다\"는 같은 원리로 묶이는 두 가지를 고르십시오.",
    "options": [
     "실제 길이만 보는 prefill 경로를 따로 두기",
     "4비트를 그대로 읽는 커널",
     "여러 요청을 한 번에 계산하기(batching)",
     "작은 모델이 초안을 쓰고 큰 모델이 한 번에 검사하기(speculative decoding)"
    ],
    "answer": [
     2,
     3
    ],
    "explain": "batching과 speculative decoding은 둘 다 가중치를 한 번 읽을 때 여러 토큰을 같이 계산해서 읽는 비용을 나눕니다. 4비트 커널은 읽는 양 자체를 줄이는 방향이고, prefill 경로는 빈 칸 낭비를 줄이는 방향입니다."
   }
  ]
 }
];

const lessons = [
  {
    short:"첫 토큰", title:"Qwen3에서 첫 토큰 꺼내기",
    intro:"회의록과 질문을 토큰 ID로 바꾸고, Qwen3의 마지막 위치에서 다음 토큰 하나를 고릅니다.",
    flow:["prompt","token IDs","forward","logits","token"],
    files:"lab.py · model.py",
    recipe:["prompt_ids()에서 채팅 템플릿이 역할과 생성 시작 표시를 붙이는 부분을 찾습니다.","Qwen3.forward()에서 embedding부터 LM head까지 따라갑니다. 이 모델은 embedding의 가중치를 출력 계산에도 공유합니다.","마지막 위치의 logits에서 argmax로 토큰 ID 하나를 선택합니다."],
    code:"ids = prompt_ids(tokenizer, args.prompt, args.device)\nlogits = model(ids, all_logits=True)\nnext_id = choose(logits[:, -1]).item()",
    cmd:"uv run python lab.py cp01 --reference",
    output:"input=[1, T] | logits=[1, T, 151936] | next id=…\ntext=…\nTransformers logits PASS | max abs diff=…",
    observation:"마지막 차원은 단어 수가 아니라 어휘에 들어 있는 토큰 ID 수입니다. 마지막 위치만 읽는 이유는 지금 입력의 바로 뒤를 예측하고 있기 때문이에요.",
    question:"입력 길이가 두 배가 되면 logits의 어느 축이 바뀔까요?",answer:"가운데 T 축만 두 배가 됩니다. 1은 요청 한 건, 151936은 이 모델의 어휘 크기입니다."
  },
  {
    short:"문장 생성",title:"첫 토큰을 이어 문장 만들기",
    intro:"방금 고른 토큰을 입력에 붙여 모델을 다시 실행합니다. 토큰이 모이면 터미널에 텍스트가 나타납니다.",
    flow:["forward","argmax","append","repeat"],files:"engine.py · lab.py",
    recipe:["Request.next_logits()에서 두 번째 스텝부터 previous_id가 history 뒤에 붙는 부분을 봅니다.","run_steps()가 EOS 또는 토큰 한도에서 멈추는 경로를 따라갑니다.","TextStreamer가 토큰 ID를 화면에 출력할 텍스트로 모으는 부분을 확인합니다."],
    code:"previous = choose(request.next_logits(previous))\nif previous.item() in eos:\n    break\nstreamer.put(previous.cpu())",
    cmd:"uv run python lab.py cp02 --steps 48 --offline",
    output:"<회의록 요약이 텍스트 조각으로 출력>\nforward lengths=[T, T+1, T+2, T+3]",
    observation:"문장이 토큰 단위로 생성되어도, 화면에 출력되는 텍스트 조각은 스트리머의 버퍼 때문에 여러 토큰에 걸칠 수 있습니다.",
    question:"답을 16토큰 생성하면 forward는 몇 번 호출될까요?",answer:"최대 16번입니다. 첫 호출은 프롬프트에서 첫 토큰을 고르고, 이후 매번 하나를 고릅니다."
  },
  {
    short:"실행 기록",title:"긴 회의록을 넣고 실행 기록 남기기",
    intro:"같은 요약 요청에 회의 내역을 더 붙이고, 첫 토큰까지와 이후 생성 단계를 따로 잽니다.",
    flow:["short / long","first token","decode"],files:"lab.py",
    recipe:["benchmark()는 워밍업을 하고 반복 측정의 중앙값을 냅니다.","run_steps()에서 첫 토큰 시점과 마지막 시점을 기록합니다. MPS에서는 구간 경계에서 GPU 작업이 끝날 때까지 기다립니다.","출력 토큰 수를 고정한 채 short와 long의 forward 입력 길이를 비교합니다."],
    code:"sync(device)\nstart = time.perf_counter()\n# 첫 토큰 선택까지 실행\nsync(device)\nfirst = time.perf_counter()",
    cmd:"uv run python lab.py cp03 --steps 8 --offline",
    output:"CP03 | prompt=T_short | generated=8\n  forward lengths=[T_short, T_short+1, …]\n  first token=… ms | decode=… ms/token\nCP03 | prompt=T_long | generated=8\n  forward lengths=[T_long, T_long+1, …]",
    observation:"처음부터 워밍업된 모델의 생성 구간을 잽니다. 모델 로딩, 토큰화, 화면 출력 시간은 이 수치의 범위 밖에 있어요.",
    question:"처리 시간이 늘었을 때 입력 토큰 수와 출력 토큰 수를 왜 함께 기록할까요?",answer:"긴 프롬프트를 읽는 비용과 긴 답변을 더 많이 생성하는 비용을 구분하기 위해서예요."
  },
  {
    short:"KV 재사용",title:"이미 읽은 토큰의 K/V 저장하기",
    intro:"과거 위치에서는 미래 토큰을 참조하지 않습니다. 레이어별 K/V를 남겨 두고 다음 단계에서 재사용합니다.",
    flow:["prefill: T","cache","decode: 1"],files:"engine.py · model.py · cache.py",
    recipe:["Attention.forward()에서 RoPE가 적용된 K와 V를 캐시에 넣습니다.","첫 호출은 프롬프트 전체를 처리하고, 이후 요청은 직전 토큰 한 개와 실제 위치를 넘깁니다.","동일한 토큰 이력으로 cache 전후의 logits를 비교합니다."],
    code:"if cache is not None:\n    k, v = cache.update(layer, start, k, v)",
    cmd:"uv run python lab.py cp04 --prompt long --steps 8 --offline",
    output:"logits PASS | max abs diff=…\nCP03 forward lengths=[T, T+1, T+2, T+3]\nCP04 forward lengths=[T, 1, 1, 1]\n     cached KV lengths=[T, T+1, T+2, T+3]",
    observation:"forward에 들어가는 새 토큰은 하나여도, 그 토큰이 참조하는 과거 K/V의 길이는 계속 늘어납니다.",
    question:"왜 과거 Q는 캐시하지 않을까요?",answer:"새 위치의 attention에는 새 위치의 Q와 과거 위치의 K/V가 필요합니다. 과거 위치의 출력을 다시 만들지 않기 때문에 과거 Q는 필요하지 않습니다."
  },
  {
    short:"SDPA와 GQA",title:"Attention을 SDPA로 실행하기",
    intro:"KV를 재사용하는 엔진에 두 번째 attention 실행 경로를 추가합니다.",
    flow:["16 Q heads","8 cached KV heads","SDPA"],files:"model.py",
    recipe:["직접 작성한 scores, mask, softmax, value 곱을 확인합니다.","동일한 입력을 SDPA에 넘깁니다. 한 토큰 decode에서도 실제 위치에 맞는 mask를 유지합니다.","K/V head 복제가 cache.update() 뒤에서 일어나는지 확인합니다."],
    code:"if use_sdpa:\n    output = F.scaled_dot_product_attention(q, k, v, attn_mask=mask)",
    cmd:"uv run python lab.py cp05 --prompt long --steps 8 --offline",
    output:"logits PASS | max abs diff=…\nCP04 | first token=… | decode=…\nCP05 | first token=… | decode=…",
    observation:"Qwen3의 GQA는 이전부터 동일합니다. 바뀐 건 attention을 계산하는 연산 경로입니다. 같은 MPS 기기에서 실제로 재보세요.",
    question:"16비트 KV라면 Qwen3-0.6B가 토큰 하나당 저장하는 양은?",answer:"K와 V 2개 × 레이어 28개 × KV head 8개 × head dim 128 × 2바이트 = 112 KiB입니다."
  },
  {
    short:"Static cache",title:"캐시를 제자리에 갱신하기",
    intro:"K/V를 한 칸 늘릴 때마다 연결하던 버전을, 정해진 버퍼에 새 조각을 쓰는 버전으로 바꿉니다.",
    flow:["allocate","write slice","read prefix"],files:"cache.py",
    recipe:["DynamicKVCache.update()의 torch.cat 두 곳을 확인합니다.","StaticKVCache가 첫 호출에 capacity만큼 할당하는 부분을 봅니다.","슬라이스에 새 K/V를 쓰고 채워진 길이만큼만 attention에 넘깁니다."],
    code:"keys[:, :, start:end].copy_(key)\nvalues[:, :, start:end].copy_(value)\nreturn keys[:, :, :end], values[:, :, :end]",
    cmd:"uv run python lab.py cp06 --prompt long --steps 8 --offline",
    output:"logits PASS | max abs diff=…\nCP05 | KV used=… B | reserved=… B\nCP06 | KV used=… B | reserved=… B",
    observation:"같은 토큰 이력을 저장하므로 사용량은 같고, static은 수용 가능한 최대 길이까지 버퍼를 확보합니다. 여기서 reserved는 KV 텐서 용량이에요.",
    question:"버퍼의 크기를 고정하면 attention에 들어가는 KV의 길이도 고정되나요?",answer:"이 구현에서는 채워진 prefix만 반환하므로 attention 입력의 길이는 토큰마다 늘어납니다."
  },
  {
    short:"Compile",title:"반복하는 decode 단계 컴파일하기",
    intro:"한 토큰을 계산하는 함수에 torch.compile을 적용하고, 최초 호출과 워밍업 후 실행을 비교합니다.",
    flow:["decode step","eager / compiled","measure"],files:"lab.py",
    recipe:["compile_probe()에서 프롬프트 계산은 그대로 두고 decode 함수만 컴파일합니다.","첫 호출에 걸린 시간과 이미 실행해 본 뒤의 토큰당 시간을 따로 봅니다.","지원되지 않는 연산이나 정확성 검증 실패가 나오면 기록하고 eager 경로로 다음 실습을 이어갑니다."],
    code:"compiled = torch.compile(decode, dynamic=True)",
    cmd:"uv run python lab.py cp07 --steps 4 --repeats 1 --offline",
    output:"eager first decode call: … ms\ncompiled first decode call: … ms\nlogits PASS … 또는 Compile probe did not pass …",
    observation:"이 실험은 OS, PyTorch 버전, 장치에 따라 결과가 달라집니다. 짧은 실습보다 컴파일 자체가 오래 걸릴 수 있어요.",
    question:"첫 호출이 오래 걸리고 이후에도 체감 차이가 작다면 어떤 요청에서 이득일까요?",answer:"충분히 많은 decode 스텝이 컴파일 비용을 상쇄하는 워크로드인지 확인해야 합니다. 이득이 없다면 eager를 유지할 수 있습니다."
  },
  {
    short:"INT8 저장",title:"가중치를 더 작게 저장하기",
    intro:"KV와 별개로 모델 가중치의 저장 형식을 바꿉니다. 메모리와 속도를 따로 살펴봅니다.",
    flow:["float weights","int8 + scale","dequantize","linear"],files:"quant.py",
    recipe:["Linear의 출력 채널마다 scale을 계산하고 가중치를 INT8 버퍼에 저장합니다.","forward에서 부동소수점으로 복원해 동일한 linear 연산을 호출합니다.","가중치 바이트와 KV 바이트, 첫 logits 차이와 토큰당 시간을 비교합니다."],
    code:"weight = (self.packed_weight.float() * self.scale).to(x.dtype)\nreturn F.linear(x, weight)",
    cmd:"uv run python lab.py cp08 --steps 8 --offline",
    output:"Floating-point weights | weights=… B\nINT8 weight storage + floating-point linear\nfirst-token logits max abs diff=…\nweights=… B | KV used=… B | decode=… ms/token",
    observation:"이 코드는 가중치 저장을 줄이는 실험입니다. decode마다 부동소수점으로 복원하므로 저비트 전용 커널의 가속 성능을 측정하지 않습니다.",
    question:"가중치를 INT8로 만들면 KV도 절반이 될까요?",answer:"이 구현에서는 KV dtype을 그대로 뒀기 때문에 KV 크기는 그대로입니다."
  },
  {
    short:"엔진 비교",title:"처음 만든 엔진과 다시 나란히 실행하기",
    intro:"같은 긴 회의록을 초기 엔진과 static KV 엔진에 넣고, 이제 각 숫자가 어디서 나오는지 설명해 봅니다.",
    flow:["same prompt","naive / static KV","compare"],files:"lab.py · engine.py",
    recipe:["같은 토큰 이력에서 첫 버전과 마지막 부동소수점 버전의 logits를 확인합니다.","속도 차이를 첫 토큰과 이후 decode로 나눠 설명합니다.","요청을 하나 더 받는 상황에서 공유되는 가중치와 요청마다 필요한 KV를 구분합니다."],
    code:"before, after = (3, 6) if version == 9 else (version - 1, version)",
    cmd:"uv run python lab.py cp09 --prompt long --steps 8 --offline",
    output:"logits PASS …\nCP03 | forward lengths=[T, T+1, …] | KV used=0 B\nCP06 | forward lengths=[T, 1, …] | KV used=… B",
    observation:"CP09는 CP03과 CP06을 비교합니다. compile과 INT8은 앞 레슨의 독립 실험으로 남겨, 각 변경의 영향을 따로 읽을 수 있어요.",
    question:"동시 요청이 두 개가 되면 어떤 상태를 따로 저장해야 할까요?",answer:"모델 가중치는 공유할 수 있지만, 각 요청의 토큰 이력, 위치, KV와 종료 상태는 별도로 관리해야 합니다."
  }
];

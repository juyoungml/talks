const lessons = [
  {
    short:"첫 토큰", title:"Qwen3에서 첫 토큰 꺼내기", time:"모델의 입출력",
    lead:"회의록을 요약해 달라고 입력하면 첫 답변 조각이 나오기까지 무슨 일이 일어날까? 이 장에서는 답변 전체를 만들기 전에, 공개 가중치를 읽어 다음 토큰 하나를 고르는 데까지 간다.",
    focus:["model.py",103,117], args:"--reference",
    before:`
      <h2>문장을 모델이 읽을 수 있는 형태로</h2>
      <p><button class="code-link" data-file="meeting.txt" data-start="1">meeting.txt</button>에는 데모 날짜와 담당자를 적은 회의록이 있다. <code>prompt_ids()</code>는 여기에 사용자의 요청을 붙이고, Qwen3 채팅 템플릿을 적용한다. 템플릿에는 사용자 메시지의 경계와 어시스턴트 응답 시작 표시도 들어간다. 그래서 아래 실행에서 나오는 100은 글자 수가 아니라 <strong>템플릿을 적용한 뒤의 토큰 수</strong>다.</p>
      <p>토크나이저가 만든 각 정수는 어휘의 인덱스다. <code>input_ids.shape = [1, 100]</code>에서 앞의 1은 요청 한 건, 뒤의 100은 그 요청의 입력 위치 수다. 각 인덱스로 embedding에서 벡터를 찾아오면 입력은 <code>[1, 100, 1024]</code>가 된다.</p>
      <button class="jump" data-file="lab.py" data-start="27" data-end="40">채팅 템플릿 코드 보기 <code>lab.py:27</code></button>
      <h2>28개 블록을 통과해 어휘 점수 만들기</h2>
      <p>각 블록은 attention과 MLP를 실행하고, 각각의 결과를 기존 입력에 더한다. Attention은 토큰 사이의 정보를 섞고, MLP는 각 위치의 벡터를 따로 변환한다. 28개 블록 뒤에도 위치마다 1,024차원 벡터가 하나씩 있다. 마지막 RMSNorm 뒤, 이 벡터와 어휘의 embedding을 내적해 토큰 후보 151,936개의 점수를 만든다. Qwen3-0.6B는 이 출력 행렬과 입력 embedding 가중치를 공유한다.</p>
      <div class="equation"><span>[1, T]</span><b>→</b><span>[1, T, 1024]</span><b>→</b><span>[1, T, 151936]</span></div>
      <p><code>logits[0, i]</code>는 위치 <em>i</em>까지 본 뒤 <em>i + 1</em>에 올 토큰들의 점수다. 지금 필요한 건 프롬프트 바로 뒤의 토큰이므로 <code>logits[:, -1, :]</code>만 읽는다. 가장 큰 점수의 인덱스만 필요할 때는 <code>argmax</code> 전에 softmax를 계산할 필요가 없다.</p>
      <button class="jump" data-file="model.py" data-start="103" data-end="117">forward와 출력 행렬 보기 <code>model.py:103</code></button>`,
    after:`<h2>터미널에서 읽을 것</h2><p><code>next id=16</code>을 다시 디코딩하면 <code>'1'</code>이다. 이 실행에서 모델은 답변을 목록 번호로 시작했다. <code>--reference</code>는 동일한 입력 ID와 dtype으로 Transformers의 Qwen3 forward를 실행한 다음, 마지막 위치의 어휘 점수 전체를 비교한다. 출력 텍스트만 비교하면 놓칠 수 있는 가중치 매핑이나 위치 계산 오류를 찾는 데 쓰인다. FP16의 연산 순서 차이 때문에 점수가 조금 달라도 설정된 오차 내에서는 통과한다.</p>
    <p>다음 장에서는 이 <code>16</code>을 출력으로 소비하는 동시에 다음 forward의 입력으로 돌려보낸다.</p>`
  },
  {
    short:"생성 루프", title:"첫 토큰을 이어 문장 만들기", time:"자기회귀 생성",
    lead:"첫 forward에서 얻은 것은 다음 토큰 하나다. 그 토큰을 문맥에 포함하고 다시 예측해야 두 번째 토큰이 나온다. 이 연결이 생성 루프다.",
    focus:["engine.py",23,40], args:"--steps 48",
    before:`
      <h2>모델 출력이 다음 입력으로 돌아간다</h2>
      <p>프롬프트를 <em>x</em>, 새로 생성할 토큰을 <em>y₁, y₂, …</em>라고 하자. 첫 forward의 마지막 logits는 <em>y₁</em>을 고르는 데 쓴다. 두 번째 forward는 원래 프롬프트에 <em>y₁</em>을 붙인 입력으로 <em>y₂</em>를 고른다. 매번 가장 큰 점수의 ID를 고르는 이 실습의 규칙이 greedy decoding이다.</p>
      <div class="equation">y<sub>k</sub> = argmax logits(x, y<sub>1</sub>, …, y<sub>k−1</sub>)<sub>last</sub></div>
      <table><thead><tr><th>forward</th><th>모델에 넣는 토큰</th><th>새로 고르는 토큰</th></tr></thead><tbody><tr><td>첫 번째</td><td>프롬프트 100개</td><td>y₁</td></tr><tr><td>두 번째</td><td>프롬프트 + y₁ (101개)</td><td>y₂</td></tr><tr><td>세 번째</td><td>프롬프트 + y₁ + y₂ (102개)</td><td>y₃</td></tr></tbody></table>
      <p><code>Request</code>는 프롬프트와 누적 입력을 가지고 있고, <code>run_steps()</code>가 이를 호출한다. 이 분리를 기억해 두자. 다음 장에서 생성 루프는 그대로 두고 요청이 forward에 전달하는 데이터만 바꾼다.</p>
      <button class="jump" data-file="engine.py" data-start="23" data-end="40">누적 입력을 만드는 코드 보기 <code>engine.py:23</code></button>
      <h2>생성 시점과 화면에 보이는 시점</h2>
      <p><code>run_steps()</code>는 EOS를 만나면 그 ID를 출력하지 않고 멈춘다. EOS가 없으면 <code>--steps</code> 한도까지 간다. 선택한 ID는 <code>TextStreamer</code>에 넘긴다. 스트리머는 디코딩한 문자열을 자를 수 있는 지점까지 버퍼에 보관하므로, 모델은 한 토큰씩 골라도 터미널에는 몇 글자가 한꺼번에 나타날 수 있다.</p>
      <button class="jump" data-file="lab.py" data-start="43" data-end="63">토큰 선택·종료·출력 보기 <code>lab.py:43</code></button>`,
    after:`<h2>문장이 나왔으니 실행 기록을 보자</h2><p>출력은 Markdown 목록을 만들다가 두 번째 항목의 첫 글자에서 끊긴다. 이 명령은 출력 예산을 48토큰으로 잡았고, 스트리머는 그때까지 받은 텍스트를 끝에서 한 번 더 비운다. 출력 한도를 늘리면 모델이 이어서 생성할 수 있다. 출력 아래의 <code>forward lengths</code>는 처음 네 호출의 입력 토큰 수다. 처음 100에서 시작해 101, 102, 103으로 늘어난다. 긴 회의록이었다면 두 번째 답변 토큰을 만들 때도 회의록 전체를 다시 처리했을 것이다. 그 비용을 다음 장에서 잰다.</p>`
  },
  {
    short:"시간 측정", title:"긴 회의록으로 병목 드러내기", time:"첫 토큰과 이후 생성",
    lead:"같은 질문에 회의 내역을 더 붙여 프롬프트를 100토큰에서 835토큰으로 늘린다. 한 숫자로 보던 응답 시간을 첫 토큰까지와 나머지 토큰 생성으로 나눈다.",
    focus:["lab.py",43,63], args:"--steps 8 --repeats 3",
    before:`
      <h2>같은 출력 토큰 수로 비교한다</h2>
      <p>CP03은 짧은 프롬프트와 긴 프롬프트 모두에서 정확히 8스텝을 실행한다. 벤치마크는 스트리머 없이 실행하므로 EOS에 따른 조기 종료와 터미널 출력이 시간에 섞이지 않는다. 각 조건마다 워밍업 한 번을 돌리고, 새 요청으로 세 번 측정한 중앙값을 낸다. 모델 로드와 토큰화는 타이머 앞에서 끝난다.</p>
      <div class="equation"><div>첫 토큰 시간 = t<sub>1</sub> − t<sub>0</sub></div><div>이후 토큰당 시간 = (t<sub>N</sub> − t<sub>1</sub>) / (N − 1)</div></div>
      <p><em>t₀</em>는 첫 forward 직전, <em>t₁</em>은 첫 토큰을 고른 직후다. 한 요청에서 8개 토큰을 고르면 후반부 측정은 7개에 해당한다. MPS에서는 GPU 작업 제출과 완료가 다른 시점에 발생하므로 타이머를 읽는 경계에서 <code>torch.mps.synchronize()</code>로 작업 완료를 기다린다.</p>
      <button class="jump" data-file="lab.py" data-start="43" data-end="63">타이머 구간 보기 <code>lab.py:43</code></button>
      <button class="jump" data-file="lab.py" data-start="83" data-end="99">워밍업과 중앙값 보기 <code>lab.py:83</code></button>`,
    after:`<h2>첫 토큰도, 이후 토큰도 느려진 이유</h2><p>긴 입력의 첫 forward는 835개 토큰을 처리한다. 두 번째도 836개를 처리한다. 이 기록에서 첫 토큰은 46.67 ms에서 364.69 ms로, 이후 토큰은 42.58 ms에서 344.88 ms/token으로 늘었다. 이 구현에서 attention은 쿼리 길이와 키 길이가 모두 현재 시퀀스 길이인 점수 행렬을 만들고, MLP와 projection도 모든 입력 위치를 다시 계산한다. 출력 쪽에서는 마지막 위치만 읽는데, 내부 연산은 매번 전체 입력을 거친다.</p><p>이 로그는 장치 전체의 병목을 증명하는 프로파일이 아니다. 코드와 입력 길이를 함께 보면 <strong>어떤 계산이 반복되는지</strong>는 정확히 지목할 수 있다. 다음 장은 그 반복을 없애는 구현이다.</p>`
  },
  {
    short:"KV cache", title:"앞에서 계산한 K와 V를 남겨두기", time:"Prefill과 decode",
    lead:"새 위치가 추가되더라도 과거 위치는 그 토큰을 볼 수 없다. 한 번 계산한 과거 위치의 K와 V를 보관하면 다음 forward에서는 새 위치만 계산하면 된다.",
    focus:["engine.py",23,40], args:"--prompt long --steps 8 --repeats 3",
    before:`
      <h2>과거 K/V를 재사용해도 되는 이유</h2>
      <p>Causal mask는 쿼리 위치 <em>i</em>가 키 위치 <em>j ≤ i</em>만 볼 수 있게 한다. 예를 들어 뒤에 새 토큰을 붙여도 위치 0이나 1이 읽는 입력은 이전과 같다. 따라서 각 레이어에서 이미 계산한 과거 위치의 K와 V에 새 토큰 때문에 생기는 변경은 없다. 이 구현은 해당 위치의 RoPE를 적용한 <strong>K</strong>와 projection 결과인 <strong>V</strong>를 레이어별로 저장한다.</p>
      <button class="jump" data-file="model.py" data-start="47" data-end="56">캐시하는 텐서 보기 <code>model.py:47</code></button>
      <h2>Prefill에서 캐시를 채우고, decode에서 한 칸씩 추가한다</h2>
      <p>첫 forward는 여전히 프롬프트 전체를 읽는다. 이때 각 레이어에 프롬프트의 K/V가 쌓이고 마지막 logits에서 <em>y₁</em>을 고른다. 두 번째 forward에는 <em>y₁</em> 하나만 넣는다. 새 위치의 Q로 지금까지의 K/V를 읽어 <em>y₂</em>를 고르는 게 decode다. <em>y₁</em>의 위치는 프롬프트 길이 <em>T</em>이므로, 길이 1의 입력이라도 RoPE 위치를 0부터 다시 시작하면 안 된다.</p>
      <div class="equation"><div>prefill: Q 길이 T · K/V 길이 T</div><div>첫 decode: Q 길이 1 · K/V 길이 T + 1</div></div>
      <p>과거 Q를 저장할 필요는 없다. 지금 출력에 필요한 것은 현재 위치의 Q와 과거 및 현재 위치의 K/V다. 이 레포에서 K와 V의 shape은 각각 <code>[1, 8, 저장된 토큰 수, 128]</code>이다.</p>
      <button class="jump" data-file="engine.py" data-start="23" data-end="40">새 토큰과 절대 위치를 넘기는 코드 보기 <code>engine.py:23</code></button>`,
    after:`<h2>한 토큰만 처리한다는 말의 범위</h2><p><code>forward lengths</code>의 1은 <strong>이번 호출에서 새로 projection하고 MLP에 통과시키는 위치</strong>가 하나라는 뜻이다. <code>cached KV lengths</code>는 835, 836, 837, …로 여전히 길어진다. 그러므로 캐시가 있어도 길어진 문맥을 참조하는 attention 비용과 KV 메모리 비용은 남는다. 이번 실행에서는 첫 토큰 시간이 비슷한 범위에 있었고, 이후 토큰당 시간은 341.09 ms에서 22.65 ms로 크게 내려갔다.</p>
    <p><code>logits PASS</code>는 두 엔진에 <em>같은 토큰 이력</em>을 넣어 점수를 비교한 결과다. 검증 중에는 기준 엔진이 고른 ID를 양쪽 입력에 넣는다. 각자 다른 ID를 골라 다음 스텝으로 넘어가면, 처음 차이가 계산에서 발생했는지 입력에서 발생했는지 구분할 수 없다.</p>
    <button class="jump" data-file="lab.py" data-start="66" data-end="80">동일한 이력을 쓰는 검증 보기 <code>lab.py:66</code></button>`
  },
  {
    short:"SDPA와 GQA", title:"같은 attention을 다른 경로에서 계산하기", time:"점수 행렬과 헤드",
    lead:"KV cache로 과거 위치를 다시 계산하는 일을 줄였다. 이제 새 위치가 K/V를 읽는 계산 자체를 살펴보고, 직접 쓴 attention을 PyTorch SDPA와 비교한다.",
    focus:["model.py",47,68], args:"--prompt long --steps 8 --repeats 3",
    before:`
      <h2>한 헤드에서 계산하는 것</h2>
      <p>한 쿼리를 키 각각과 내적해 관련도를 구한다. 내적을 <em>√d</em>로 나눠 점수의 스케일을 조절한다. 이 모델의 head dimension <em>d</em>는 128이다. 미래 위치의 점수에 −∞를 더한 뒤 softmax를 적용하면 해당 위치의 가중치가 0이 된다. 마지막으로 그 가중치로 V의 가중합을 구한다.</p>
      <div class="equation">O = softmax(QK<sup>⊤</sup> / √d + M) V</div>
      <p>점수의 shape은 <code>[batch, Q heads, Q 길이, K 길이]</code>다. 835토큰 prefill에서는 헤드마다 835×835의 점수 행렬이 생긴다. 첫 decode는 새 위치 하나만 처리하므로 같은 축에서 1×836이 된다. 이 코드에서 <code>mask</code>의 <code>True</code>는 접근을 허용한다. 직접 쓴 attention은 <code>~mask</code>를 −∞로 채우고, SDPA에는 <code>mask</code> 그대로 넘긴다.</p>
      <button class="jump" data-file="model.py" data-start="58" data-end="68">수동 attention과 SDPA 비교 보기 <code>model.py:58</code></button>
      <h2>GQA가 줄이는 건 저장할 K/V 헤드 수</h2>
      <p>Qwen3-0.6B는 Q head 16개를 쓰지만 K/V는 각각 8개만 계산한다. 두 Q head가 같은 K/V head를 공유한다. 이 구현은 캐시에는 8개만 저장하고, attention 직전에 <code>repeat_interleave</code>로 shape을 맞춘다. 따라서 영구 캐시 데이터는 8개 기준이지만, 계산 경로에는 16개로 확장한 임시 텐서가 있을 수 있다.</p>
      <div class="equation">토큰당 KV = 2(K, V) × 28층 × 8헤드 × 128 × 2바이트 = <strong>112 KiB</strong></div>
      <p>CP04에도 이미 같은 GQA가 들어 있다. CP05에서 전후로 바꾸는 것은 <code>scaled_dot_product_attention</code> 호출 여부다. <a href="https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html">PyTorch SDPA 문서</a></p>`,
    after:`<h2>Prefill과 decode를 따로 해석하기</h2><p>두 경로는 동일한 Q/K/V와 마스크를 사용하고 검증에서 logits가 허용 오차 안에 들어간다. 벤치마크에서는 835개 쿼리가 있는 prefill과 한 개의 쿼리만 있는 decode를 따로 비교한다. SDPA는 하나의 API이며, 이 레포의 호출만 보고 MPS가 어떤 커널을 선택했는지 단정할 수 없다. 이 로그에서 첫 토큰은 340.85 ms에서 274.07 ms로 줄었지만, decode는 20.63 ms에서 25.39 ms/token으로 늘었다. 그래서 이 실행에서는 SDPA가 첫 토큰 시간을 개선했다고 말할 수 있다.</p>`
  },
  {
    short:"Static cache", title:"매번 이어 붙이던 캐시를 제자리에 쓰기", time:"복사와 예약 용량",
    lead:"동적 캐시는 이해하기 쉽지만 새 토큰 하나가 생길 때마다 이미 모아둔 K/V를 새 텐서에 이어 붙인다. 미리 확보한 버퍼에 새 조각만 쓰면 이 갱신 비용을 줄일 수 있다.",
    focus:["cache.py",27,48], args:"--prompt long --steps 8 --repeats 3",
    before:`
      <h2>어디에서 복사가 일어나는가</h2>
      <p>동적 버전의 <code>torch.cat</code>은 새 K/V 한 칸과 이미 저장한 전체 prefix를 받아 더 긴 텐서를 만든다. 레이어마다 K와 V를 각각 연결하므로 문맥이 길어질수록 새로 복사하는 데이터가 늘어난다. 메모리 로그의 <code>reserved</code>는 마지막에 남은 텐서 용량이라, 연결 도중 잠시 생기는 피크까지 포함하지는 않는다.</p>
      <button class="jump" data-file="cache.py" data-start="8" data-end="24">동적 캐시의 cat 보기 <code>cache.py:8</code></button>
      <h2>정해둔 위치에 쓰고, 채워진 구간만 읽는다</h2>
      <p>정적 버전은 첫 요청에서 레이어마다 <code>[1, 8, capacity, 128]</code> 크기의 K, V 버퍼를 확보한다. Prefill에서는 <code>[0:T]</code>에 한 번에 쓰고, 첫 decode에서는 <code>[T:T+1]</code>에 쓴다. Attention에는 <code>[:, :, :end]</code>를 반환한다. 버퍼 자체의 크기는 일정하지만 이 슬라이스의 길이는 매 스텝 변한다.</p>
      <button class="jump" data-file="cache.py" data-start="33" data-end="48">슬라이스 갱신과 메모리 계산 보기 <code>cache.py:33</code></button>`,
    after:`<h2>출력 8개인데 왜 캐시는 842칸일까</h2><p>835토큰 프롬프트를 처리한 결과에서 <em>y₁</em>이 바로 나온다. 이후 7번의 decode는 <em>y₁</em>부터 <em>y₇</em>까지를 입력으로 처리해 <em>y₈</em>을 고른다. 마지막에 고른 <em>y₈</em>은 아직 forward에 넣지 않았으므로 사용은 842칸이다. 이 구현은 843칸을 미리 예약한다.</p>
    <div class="equation"><div>사용: (835 + 8 − 1) × 114,688 = 96,567,296 B</div><div>예약: (835 + 8) × 114,688 = 96,681,984 B</div></div>
    <p>static cache가 없애는 것은 기존 K/V를 붙여 새 버퍼에 복사하는 갱신이다. Attention이 prefix를 읽는 일은 여전히 남는다. 그래서 로그에서 캐시의 동작이 달라져도, 특정 장치와 길이에서 속도 차이는 작을 수 있다.</p>`
  },
  {
    short:"Decode 컴파일", title:"반복 실행되는 decode를 컴파일하기", time:"첫 호출과 반복 비용",
    lead:"이제 decode는 같은 모델을 한 토큰씩 반복 실행한다. 이 함수만 컴파일해서 최초 비용과 반복 실행 비용을 분리해 본다.",
    focus:["lab.py",102,123], args:"--steps 8 --repeats 3",
    before:`
      <h2>컴파일 경계는 어디인가</h2>
      <p><code>compile_probe()</code>는 모델 호출을 감싼 <code>decode(ids, cache, start)</code>를 하나 만들고, 같은 함수를 eager와 <code>torch.compile</code>로 각각 실행한다. 프롬프트를 읽는 첫 forward, 다음 토큰을 고르는 <code>argmax</code>, 전체 반복문은 컴파일 경계 밖에 있다. CP06과 같이 정적 KV 버퍼를 사용하므로 이번 비교에 캐시 구현 변경이 섞이지 않는다.</p>
      <button class="jump" data-file="lab.py" data-start="102" data-end="123">eager/compiled 비교 함수 보기 <code>lab.py:102</code></button>
      <h2>정적인 버퍼와 동적인 입력</h2>
      <p>decode의 <code>ids</code>는 계속 <code>[1, 1]</code>이지만, Python의 <code>start</code>와 반환한 K/V prefix의 길이는 변한다. <code>dynamic=True</code>는 동적 shape 처리를 요청한다. 장치와 연산, 컴파일러가 적용하는 조건에 따라 다양한 길이에서 같은 코드가 재사용될지 달라질 수 있다.</p>
      <div class="equation">회수에 필요한 decode 스텝 ≈ 추가 초기 시간 ÷ 토큰당 절약 시간</div>
      <p>이 계산은 반복 속도가 비슷하게 유지되고 추가 컴파일이 없을 때의 근사다. 첫 호출에 드는 시간이 크게 보이더라도 긴 세션에서는 상쇄될 수 있고, 짧은 세션에서는 비용으로 남을 수 있다.</p>`,
    after:`<h2>첫 호출과 워밍업 이후가 답하는 질문</h2><p><code>first decode call</code>에는 해당 경로의 첫 실행 비용이 들어가고, <code>decode=… ms/token</code>에는 워밍업 뒤 정상 구간의 값이 나온다. Prefill은 두 경우 모두 eager다. 컴파일이 실패하거나 logits 검증을 통과하지 못하면 이 코드는 실패 내용을 출력한다. 이 기록에서 초기 비용 차이는 약 9.58초이고, 워밍업 뒤 절약은 토큰당 약 6.09 ms다. 단순히 나누면 약 1,574 decode 스텝이 필요하다. 새 길이에서 재컴파일하거나 토큰당 비용이 달라지면 이 근사도 달라진다.</p>`
  },
  {
    short:"가중치 INT8", title:"가중치 저장 크기와 실행 비용 분리하기", time:"채널별 양자화",
    lead:"지금까지는 요청이 만드는 K/V를 관리했다. 이 장에서는 여러 요청이 공통으로 사용할 모델 가중치의 저장 형식을 바꾼다.",
    focus:["quant.py",7,25], args:"--prompt long --steps 8 --repeats 3",
    before:`
      <h2>Linear의 각 출력 채널마다 scale을 둔다</h2>
      <p>Linear의 가중치 행렬에서 한 행은 한 출력 채널에 대응한다. 행마다 절댓값이 가장 큰 값을 구해 127로 나누면 scale <em>s</em>가 된다. 각 가중치 <em>w</em>를 <em>s</em>로 나누고 반올림하면 −127~127 범위의 정수로 저장할 수 있다. 이 양자화에는 zero point가 따로 없다.</p>
      <div class="equation"><div>s = max(max |w|, 10<sup>−8</sup>) / 127</div><div>q = clamp(round(w / s), −127, 127)</div><div>복원값 ŵ = q × s</div></div>
      <p>예를 들어 한 행이 <code>[-0.8, 0.2, 0.4]</code>라면 scale은 약 0.0063이고, 정수는 대략 <code>[-127, 32, 64]</code>다. 0.4에 대응하는 64를 복원하면 약 0.403이다. 반올림 때문에 원래 가중치와 조금 다르다.</p>
      <button class="jump" data-file="quant.py" data-start="7" data-end="17">scale·INT8 저장·복원 보기 <code>quant.py:7</code></button>
      <h2>어떤 메모리가 줄어드는가</h2>
      <p>이 실습은 bias가 없는 Linear에만 적용한다. 임베딩과 RMSNorm은 FP16으로 남고, 각 행의 scale도 FP32로 함께 저장한다. 따라서 모델 전체 바이트가 정확히 절반이 되지는 않는다. KV dtype도 바꾸지 않았으므로 동일한 토큰 수를 처리하면 KV 바이트는 그대로다.</p>`,
    after:`<h2>작게 저장했는데 생성이 느려질 수 있다</h2><p>이 구현은 forward마다 INT8 버퍼를 FP32로 변환하고 scale을 곱한 뒤 입력 dtype으로 맞춰 일반 <code>F.linear</code>를 실행한다. 복원 연산과 임시 부동소수점 텐서에 비용이 든다. <code>weights</code>는 유지하는 가중치와 scale의 바이트를 뜻하고, 이 임시 텐서나 전체 프로세스 피크 메모리를 뜻하지 않는다.</p><p>로그에서 가중치는 약 1.19 GB에서 0.75 GB로 줄었고, decode는 24.41 ms에서 104.83 ms/token으로 늘었다. KV 바이트는 같다. 양자화는 실제 가중치 값을 바꾸므로 앞 레슨처럼 logits 일치를 요구하지 않는다. 여기서는 첫 토큰의 어휘 점수에서 최대 차이를 관찰한다. 출력 품질을 판단하려면 실제 작업 여러 개로 답변을 따로 평가해야 한다.</p>`
  },
  {
    short:"최종 비교", title:"같은 회의록을 두 엔진에 넣어보기", time:"결과 읽기",
    lead:"처음 만든 엔진과 최종 부동소수점 엔진을 같은 입력으로 비교한다. 이제 답변이 나오기까지의 대기와 토큰 사이의 간격을 코드로 설명할 수 있다.",
    focus:["lab.py",179,189], args:"--prompt long --steps 8 --repeats 3",
    before:`
      <h2>비교할 두 경로</h2>
      <p>CP03은 매 스텝마다 전체 문맥을 다시 모델에 넣는다. CP06은 첫 스텝에서 프롬프트를 처리한 뒤, 같은 모델에 새 토큰 하나와 정적 KV cache를 넘긴다. Attention은 SDPA를 사용한다. 모델·dtype·입력 및 생성 스텝은 동일하고, compile과 INT8은 각각 CP07·CP08에서 독립 실험으로 다뤘다.</p>
      <table><thead><tr><th>실행 조건</th><th>CP03</th><th>CP06</th></tr></thead><tbody><tr><td>첫 forward</td><td>835개</td><td>835개</td></tr><tr><td>다음 forward</td><td>836개</td><td>새 토큰 1개 + 기존 KV</td></tr><tr><td>요청이 보관하는 KV</td><td>0 B</td><td>토큰당 112 KiB</td></tr></tbody></table>
      <p>명령은 먼저 두 경로의 텍스트를 스트리밍하고, 이어서 같은 토큰 이력에서 logits를 검증한다. 시간 비교는 터미널 출력이 없는 별도 실행으로 잰다. 처음 8개 토큰까지만 만드는 명령이니 요약은 첫 구절에서 잘릴 수 있다.</p>
      <button class="jump" data-file="lab.py" data-start="179" data-end="189">비교 순서 보기 <code>lab.py:179</code></button>`,
    after:`<h2>이제 숫자로 설명하기</h2><p><strong>첫 토큰.</strong> 양쪽에서 프롬프트 전체를 읽어야 한다. 차이가 나더라도 CP04에서 없앤 반복 계산이 원인은 아니다. 여기에 포함된 SDPA 변경의 효과는 CP05의 단독 비교로 읽는다. <strong>이후 토큰.</strong> 전체 입력을 다시 처리하는 경로와 과거 K/V에 새 위치만 추가하는 경로의 차이가 드러난다. <strong>메모리.</strong> 가중치 크기는 같고, CP06은 그 위에 요청별 KV 메모리를 사용한다.</p>
    <p>요청이 하나 더 오면 같은 모델 가중치를 공유할 수 있지만, 각 요청은 자신의 위치와 KV를 가진다. 여기서 여러 요청에 실행 순서와 메모리를 나눠 주는 서빙 엔진의 문제가 시작된다.</p>`
  }
];

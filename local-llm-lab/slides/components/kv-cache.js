/* KV cache step scene. Usage: const scene = KVCacheScene.mount(el); scene.setStep(n); */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  // meeting.txt 앞부분을 단어 단위로 나눈 예시 (실제 BPE 토큰과는 다르다)
  const TOKENS = ["팀은", "11월", "25일에", "데모를", "진행", "하기로", "했다"];
  const PROMPT = 5;
  const MAX = TOKENS.length;
  // Qwen3-0.6B: (K, V) × 28 layers × 8 KV heads × head_dim 128 × fp16 2 bytes
  const KV_BYTES_PER_TOKEN = 2 * 28 * 8 * 128 * 2;
  const CELL = 50, PITCH = 56, X0 = 130, Y0 = 82;

  const STEPS = [
    { mode: "start", n: 5, input: null, cells: null, cum: null,
      caption: "회의록 앞부분 5토큰을 넣었다. <b>다음 토큰 하나</b>를 만들려면 무엇을 계산해야 할까?" },
    { mode: "prefill", n: 5, input: 5, cells: 15, cum: 15,
      caption: "<b>Prefill</b> — 각 토큰이 자기 이전 토큰들과의 attention 점수를 <span class=new>한 번에</span> 계산한다. 점선 칸은 causal mask로 가려진 미래." },
    { mode: "nocache", n: 6, input: 6, cells: 21, cum: 36,
      caption: "<b>캐시 없음</b> — ‘하기로’를 만든 뒤, 다음 토큰을 위해 6토큰 전체를 다시 넣는다. <span class=redo>빨간 칸</span>은 이미 했던 계산." },
    { mode: "nocache", n: 7, input: 7, cells: 28, cum: 64,
      caption: "길이가 늘수록 반복도 커진다. 매 단계 T(T+1)/2칸 — 그리고 이 반복은 <b>모든 층</b>에서 일어난다." },
    { mode: "cache", n: 5, cache: 5, input: 5, cells: 15, cum: 15,
      caption: "<b>관찰</b> — 지난 토큰은 미래를 보지 않으므로 그 K, V는 다시 계산해도 똑같다. Prefill 때 <span class=kv>K, V를 저장</span>해 두자." },
    { mode: "cache", n: 6, cache: 6, input: 1, cells: 6, cum: 21,
      caption: "<b>KV 캐시</b> — 새 토큰 하나만 넣는다. <span class=new>새 Q 한 줄</span> × 저장된 K 전체. 새 K, V는 캐시 끝에 붙인다." },
    { mode: "cache", n: 7, cache: 7, input: 1, cells: 7, cum: 28, extra: "compare",
      caption: "Q는 이번 줄에서만 쓰이니 저장할 필요가 없다. 입력 길이가 <code>[5, 1, 1, …]</code>로 바뀌는 이유 — CP04의 <code>forward lengths</code>." },
    { mode: "cache", n: 7, cache: 7, input: 1, cells: 7, cum: 28, settle: true, extra: "memory",
      caption: "<b>대가는 메모리</b> — 토큰 하나마다 <span class=kv>112 KiB</span>씩 쌓인다. 긴 문맥에서 KV 캐시가 가중치만큼 커질 수 있다." },
  ];

  function el(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  function cellState(s, i, j) {
    if (s.mode === "start" || i >= s.n || j >= s.n) return "hidden";
    if (j > i) return "mask";
    if (s.mode === "prefill") return "new";
    if (s.mode === "nocache") return i === s.n - 1 ? "new" : "redo";
    return !s.settle && s.input === 1 && i === s.n - 1 ? "new" : "idle";
  }

  function kvState(s, j) {
    if (s.mode !== "cache" || j >= s.cache) return "hidden";
    return !s.settle && s.input === 1 && j === s.cache - 1 ? "kvnew" : "kv";
  }

  function modeLabel(s) {
    if (s.mode === "start") return "입력";
    if (s.mode === "prefill") return "Prefill";
    if (s.mode === "nocache") return "Decode · 캐시 없음";
    return s.input === 1 ? "Decode · KV 캐시" : "Prefill + K, V 저장";
  }

  const fmt = new Intl.NumberFormat("en-US");
  function tween(node, to) {
    if (to == null) { node.textContent = "–"; node.dataset.v = ""; return; }
    const from = node.dataset.v === "" || node.dataset.v == null ? 0 : Number(node.dataset.v);
    node.dataset.v = to;
    const t0 = performance.now();
    const run = (t) => {
      const p = Math.min(1, (t - t0) / 500);
      const e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt.format(Math.round(from + (to - from) * e));
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  function mount(root) {
    root.classList.add("kv-scene");
    root.innerHTML = `
      <svg viewBox="0 0 600 560" aria-label="attention 점수 행렬"></svg>
      <div class="kv-panel">
        <div class="kv-mode"></div>
        <div class="kv-metric big"><span class="lbl">model 입력 길이</span><span class="val" data-k="input"></span><span class="unit">토큰</span></div>
        <div class="kv-metric"><span class="lbl">이번 단계 attention 점수</span><span class="val" data-k="cells"></span><span class="unit">칸</span></div>
        <div class="kv-metric"><span class="lbl">누적</span><span class="val" data-k="cum"></span><span class="unit">칸</span></div>
        <div class="kv-extra-stack">
          <div class="kv-extra kv-compare" data-extra="compare">
            <div class="kv-bar"><span>캐시 없음</span><div class="track"><div class="fill redo" style="width:100%"></div><span class="note">64칸 · 입력 합 18토큰</span></div></div>
            <div class="kv-bar"><span>KV 캐시</span><div class="track"><div class="fill cache" style="width:${(28 / 64) * 100}%"></div><span class="note">28칸 · 입력 합 7토큰</span></div></div>
          </div>
          <div class="kv-extra kv-memory" data-extra="memory">
            <div class="formula">(K,V) 2 × 28층 × 8헤드 × 128 × 2B = ${fmt.format(KV_BYTES_PER_TOKEN)} B/토큰</div>
            <div class="total"><span class="mem"></span> B <span style="font-size:20px;color:var(--kv-muted)">(7토큰)</span></div>
            <div class="sub">4,096토큰이면 448 MiB · 가중치(fp16)는 1.11 GiB</div>
          </div>
        </div>
      </div>
      <div class="kv-caption"></div>`;

    const svg = root.querySelector("svg");
    const cx = (j) => X0 + j * PITCH;
    const cy = (i) => Y0 + i * PITCH;

    el("text", { x: X0 + (MAX * PITCH) / 2, y: 22, "text-anchor": "middle", class: "axis" }, svg).textContent = "Key — 이미 읽은 토큰 →";
    const qAxis = el("text", { x: 0, y: 0, "text-anchor": "middle", class: "axis",
      transform: `translate(18 ${Y0 + (MAX * PITCH) / 2}) rotate(-90)` }, svg);
    qAxis.textContent = "Query — 지금 보는 토큰 →";

    const keyLabels = [], qLabels = [], cells = [], kvK = [], kvV = [];
    for (let j = 0; j < MAX; j++) {
      const gen = j >= PROMPT ? " gen" : "";
      keyLabels.push(el("text", { x: cx(j) + CELL / 2, y: Y0 - 12, "text-anchor": "middle", class: "tok" + gen }, svg));
      keyLabels[j].textContent = TOKENS[j];
      qLabels.push(el("text", { x: X0 - 12, y: cy(j) + CELL / 2 + 5, "text-anchor": "end", class: "tok" + gen }, svg));
      qLabels[j].textContent = TOKENS[j];
    }
    for (let i = 0; i < MAX; i++) {
      cells.push([]);
      for (let j = 0; j < MAX; j++) {
        cells[i].push(el("rect", { x: cx(j), y: cy(i), width: CELL, height: CELL, rx: 7, class: "cell hidden" }, svg));
      }
    }
    const kvY = Y0 + MAX * PITCH + 10;
    const kLabel = el("text", { x: X0 - 12, y: kvY + 15, "text-anchor": "end", class: "kvlabel hidden" }, svg);
    kLabel.textContent = "K 캐시";
    const vLabel = el("text", { x: X0 - 12, y: kvY + 41, "text-anchor": "end", class: "kvlabel hidden" }, svg);
    vLabel.textContent = "V 캐시";
    for (let j = 0; j < MAX; j++) {
      kvK.push(el("rect", { x: cx(j), y: kvY, width: CELL, height: 20, rx: 4, class: "kvcell hidden" }, svg));
      kvV.push(el("rect", { x: cx(j), y: kvY + 26, width: CELL, height: 20, rx: 4, class: "kvcell hidden" }, svg));
    }

    const modeEl = root.querySelector(".kv-mode");
    const vals = Object.fromEntries([...root.querySelectorAll(".val")].map((n) => [n.dataset.k, n]));
    const extras = [...root.querySelectorAll(".kv-extra")];
    const memEl = root.querySelector(".mem");
    const caption = root.querySelector(".kv-caption");
    let current = -1;

    function setStep(index) {
      const k = Math.max(0, Math.min(STEPS.length - 1, index));
      if (k === current) return;
      current = k;
      const s = STEPS[k];
      for (let j = 0; j < MAX; j++) {
        const shown = j < s.n;
        keyLabels[j].classList.toggle("hidden", !shown);
        qLabels[j].classList.toggle("hidden", !shown);
        const active = shown && j === s.n - 1 && s.mode !== "start" && !s.settle && (s.mode === "nocache" || s.input === 1);
        qLabels[j].classList.toggle("active", active);
        kvK[j].setAttribute("class", "kvcell " + kvState(s, j));
        kvV[j].setAttribute("class", "kvcell " + kvState(s, j));
      }
      // 같은 상태 클래스를 다시 넣으면 pop 애니메이션이 재생되지 않으므로 리셋 후 적용
      for (let i = 0; i < MAX; i++) {
        for (let j = 0; j < MAX; j++) {
          const rect = cells[i][j];
          const next = "cell " + cellState(s, i, j);
          if (rect.getAttribute("class") !== next) {
            rect.setAttribute("class", "cell");
            void rect.getBoundingClientRect();
            rect.setAttribute("class", next);
          }
        }
      }
      const showKV = s.mode === "cache";
      kLabel.classList.toggle("hidden", !showKV);
      vLabel.classList.toggle("hidden", !showKV);
      modeEl.textContent = modeLabel(s);
      modeEl.dataset.mode = s.mode;
      tween(vals.input, s.input);
      tween(vals.cells, s.cells);
      tween(vals.cum, s.cum);
      extras.forEach((x) => x.classList.toggle("on", x.dataset.extra === s.extra));
      if (s.extra === "memory") tween(memEl, s.cache * KV_BYTES_PER_TOKEN);
      caption.innerHTML = s.caption;
    }

    setStep(0);
    return { setStep, get step() { return current; }, steps: STEPS.length };
  }

  window.KVCacheScene = { mount, steps: STEPS.length };
})();

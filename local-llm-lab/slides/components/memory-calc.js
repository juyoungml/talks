/* Qwen3-0.6B memory calculator. Usage: const calc = MemoryCalc.mount(el); calc.setStep(n); */
(function () {
  // Qwen3-0.6B config.json + model.safetensors 파라미터 수 (LM head는 임베딩과 공유: model.py)
  const CFG = { layers: 28, qHeads: 16, kvHeads: 8, headDim: 128 };
  const PARAMS = {
    embed: 151936 * 1024,   // 155,582,464 — 임베딩 = LM head
    linear: 440401920,      // 28층 q/k/v/o + gate/up/down
    norms: 65536,           // RMSNorm, q/k norm
    scaleRows: 344064,      // Int8Linear 출력 행마다 float32 scale 1개 (quant.py)
  };
  const BANDWIDTH = [
    ["M1", 68], ["M2", 100], ["M3", 100], ["M4", 120], ["M3 Pro", 150],
    ["M1 Pro · M2 Pro", 200], ["M4 Pro", 273], ["M1 Max · M2 Max", 400], ["M4 Max", 546],
  ];
  const MIN_LEN = 64, MAX_LEN = 40960; // max_position_embeddings
  const BASE = { length: 1024, dtype: "float16", int8: false, mha: false, cache: "dynamic", capacity: 4096 };
  const STEPS = [
    { set: {}, caption: "회의록 정도(1,024토큰)면 KV 캐시는 <span class=kv>112 MiB</span>. 가중치 1.11 GiB에 비하면 작다." },
    { set: { length: 8192 }, caption: "문맥 8,192토큰: KV 캐시가 <span class=kv>896 MiB</span>. 문맥 길이에 <b>정비례</b>해서 커진다." },
    { set: { length: 40960 }, caption: "최대 문맥 40,960토큰: KV(<span class=kv>4.38 GiB</span>)가 가중치의 약 4배. 약 10,400토큰부터 KV가 가중치보다 크다." },
    { set: { length: 40960, mha: true }, caption: "GQA가 없었다면(MHA, KV 헤드 16개) KV만 <span class=kv>8.75 GiB</span>. Qwen3가 KV 헤드를 8개로 줄인 이유." },
    { set: { int8: true }, caption: "<b>INT8 저장</b>(CP08): 28층 linear만 1바이트로 줄고, 임베딩·LM head는 float 그대로. 1.11 GiB → 718 MiB." },
    { set: { cache: "static", capacity: 4096 }, caption: "<b>Static 캐시</b>(CP06): 최대 길이만큼 미리 확보한다. 사용 112 MiB, 예약 448 MiB — 대신 매 단계 재할당이 없다." },
  ];

  const GiB = 1024 ** 3, MiB = 1024 ** 2, KiB = 1024;
  const fmtInt = new Intl.NumberFormat("en-US");
  function human(n) {
    if (n >= GiB) return (n / GiB).toFixed(2) + " GiB";
    if (n >= MiB) return (n / MiB).toFixed(n >= 100 * MiB ? 0 : 1) + " MiB";
    if (n >= KiB) return Math.round(n / KiB) + " KiB";
    return n + " B";
  }
  const toLen = (p) => {
    const v = MIN_LEN * Math.pow(MAX_LEN / MIN_LEN, p / 1000);
    return Math.min(MAX_LEN, Math.max(MIN_LEN, Math.round(v / 16) * 16));
  };
  const fromLen = (len) => Math.round((1000 * Math.log(len / MIN_LEN)) / Math.log(MAX_LEN / MIN_LEN));

  function compute(s) {
    const b = s.dtype === "float32" ? 4 : 2;
    const embed = PARAMS.embed * b;
    const layers = (s.int8 ? PARAMS.linear + PARAMS.scaleRows * 4 : PARAMS.linear * b) + PARAMS.norms * b;
    const weights = embed + layers;
    const heads = s.mha ? CFG.qHeads : CFG.kvHeads;
    const kvPerToken = 2 * CFG.layers * heads * CFG.headDim * b;
    const kvUsed = kvPerToken * s.length;
    const capacity = s.cache === "static" ? Math.max(s.capacity, s.length) : s.length;
    const kvReserved = kvPerToken * capacity;
    const readPerToken = weights + kvUsed;
    const tokPerSec = (s.bw * 1e9) / readPerToken;
    return { b, heads, embed, layers, weights, kvPerToken, kvUsed, kvReserved, capacity,
      total: weights + kvReserved, readPerToken, tokPerSec, crossover: Math.ceil(weights / kvPerToken) };
  }

  function niceMax(total) {
    const steps = [0.5, 1, 1.5, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32];
    return (steps.find((x) => x * GiB >= total) || 48) * GiB;
  }

  function mount(root) {
    root.classList.add("mc-scene");
    const seg = (key, options) => `<div class="mc-seg" data-key="${key}">${options
      .map(([v, t]) => `<button type="button" data-value="${v}">${t}</button>`).join("")}</div>`;
    root.innerHTML = `
      <div class="mc-controls">
        <div class="mc-field" data-f="length"><div class="lbl">문맥 길이 (프롬프트 + 생성) <b class="len"></b></div>
          <input type="range" min="0" max="1000" class="len-range" aria-label="문맥 길이"></div>
        <div class="mc-field" data-f="dtype"><div class="lbl">실행 dtype</div>${seg("dtype", [["float16", "float16 · MPS"], ["float32", "float32 · CPU"]])}</div>
        <div class="mc-field" data-f="int8"><div class="lbl">가중치 저장</div>${seg("int8", [["false", "float"], ["true", "INT8 (CP08)"]])}</div>
        <div class="mc-field" data-f="mha"><div class="lbl">어텐션</div>${seg("mha", [["false", "GQA · KV 8헤드"], ["true", "MHA 가정 · 16헤드"]])}</div>
        <div class="mc-field" data-f="cache"><div class="lbl">KV 캐시</div>${seg("cache", [["dynamic", "Dynamic (CP04)"], ["static", "Static (CP06)"]])}</div>
        <div class="mc-field" data-f="capacity"><div class="lbl">Static 예약 길이 <b class="cap"></b></div>
          <input type="range" min="0" max="1000" class="cap-range" aria-label="Static 예약 길이"></div>
        <div class="mc-field" data-f="bw"><div class="lbl">메모리 대역폭 (Apple 공개 사양)</div>
          <div class="mc-bw"><select aria-label="칩">${BANDWIDTH.map(([n, v]) => `<option value="${v}|${n}">${n} · ${v} GB/s</option>`).join("")}<option value="custom">직접 입력</option></select>
          <input type="number" min="10" max="2000" step="1" aria-label="GB/s"></div></div>
      </div>
      <div class="mc-out">
        <div class="mc-total"><span class="val total"></span><span class="sub">메모리에 올라가는 양 (가중치 + KV 캐시)</span></div>
        <div>
          <div class="mc-bar"><div class="seg embed"></div><div class="seg layers"></div><div class="seg kv"></div><div class="seg reserved"></div></div>
          <div class="mc-axis"></div>
        </div>
        <div class="mc-legend">
          <span class="sw" style="background:var(--mc-embed)"></span><span>임베딩 · LM head (공유)</span><span class="num" data-o="embed"></span><span class="raw" data-r="embed"></span>
          <span class="sw" style="background:var(--mc-layers)"></span><span class="layers-label">28층 가중치</span><span class="num" data-o="layers"></span><span class="raw" data-r="layers"></span>
          <span class="sw" style="background:var(--mc-kv)"></span><span>KV 캐시 사용</span><span class="num" data-o="kvUsed"></span><span class="raw" data-r="kvUsed"></span>
          <span class="sw res-row" style="background:repeating-linear-gradient(45deg, rgba(88,196,221,.6) 0 3px, transparent 3px 6px); box-shadow: inset 0 0 0 1.5px var(--mc-kv)"></span><span class="res-row">KV 예약 (아직 빈 칸)</span><span class="num res-row" data-o="kvFree"></span><span class="raw res-row" data-r="kvFree"></span>
        </div>
        <div class="mc-cards">
          <div class="mc-card"><div class="k">토큰 하나당 KV 캐시</div><div class="v kv kv-tok"></div>
            <div class="d kv-formula"></div><div class="d crossover"></div></div>
          <div class="mc-card"><div class="k">decode 속도 이론 상한 (대역폭 ÷ 읽는 양)</div><div class="v acc speed"></div>
            <div class="d read"></div><div class="d speed-note"></div></div>
        </div>
      </div>
      <div class="mc-caption"></div>`;

    const $ = (q) => root.querySelector(q);
    const lenRange = $(".len-range"), capRange = $(".cap-range");
    const bwSelect = $(".mc-bw select"), bwInput = $(".mc-bw input");
    let state = { ...BASE, bw: 150, chip: "M3 Pro" };
    let current = -1;

    function render(changed) {
      const r = compute(state);
      $(".len").textContent = fmtInt.format(state.length) + " 토큰";
      $(".cap").textContent = fmtInt.format(r.capacity) + " 토큰";
      lenRange.value = fromLen(state.length);
      capRange.value = fromLen(r.capacity);
      root.querySelector('[data-f="capacity"]').classList.toggle("hidden", state.cache !== "static");
      root.querySelectorAll(".mc-seg").forEach((g) => {
        g.querySelectorAll("button").forEach((btn) => btn.classList.toggle("on", String(state[g.dataset.key]) === btn.dataset.value));
      });
      bwInput.value = state.bw;
      const match = [...bwSelect.options].find((o) => o.value === `${state.bw}|${state.chip}`);
      bwSelect.value = match ? match.value : "custom";

      $(".total").textContent = human(r.total);
      const max = niceMax(r.total);
      const pct = (x) => (100 * x) / max + "%";
      $(".seg.embed").style.width = pct(r.embed);
      $(".seg.layers").style.width = pct(r.layers);
      $(".seg.kv").style.width = pct(r.kvUsed);
      $(".seg.reserved").style.width = pct(r.kvReserved - r.kvUsed);
      $(".mc-axis").innerHTML = [0, 0.25, 0.5, 0.75, 1]
        .map((f) => `<span style="left:${f * 100}%">${f === 0 ? "0" : human(max * f).replace(".00", "")}</span>`).join("");

      const vals = { embed: r.embed, layers: r.layers, kvUsed: r.kvUsed, kvFree: r.kvReserved - r.kvUsed };
      for (const [k, v] of Object.entries(vals)) {
        $(`[data-o="${k}"]`).textContent = human(v);
        $(`[data-r="${k}"]`).textContent = fmtInt.format(v) + " B";
      }
      root.querySelectorAll(".res-row").forEach((n) => n.classList.toggle("row-hidden", vals.kvFree === 0));
      $(".layers-label").textContent = state.int8 ? "28층 가중치 (INT8 + scale)" : "28층 가중치";

      $(".kv-tok").textContent = human(r.kvPerToken);
      $(".kv-formula").innerHTML = `(K,V) 2 × 28층 × ${r.heads}헤드 × 128 × ${r.b}B = ${fmtInt.format(r.kvPerToken)} B`;
      $(".crossover").textContent = `KV가 가중치보다 커지는 길이: ${fmtInt.format(r.crossover)} 토큰`;
      $(".speed").textContent = `≈ ${r.tokPerSec.toFixed(0)} tok/s · ${(1000 / r.tokPerSec).toFixed(1)} ms`;
      $(".read").textContent = `토큰마다 읽는 양 ≈ 가중치 + KV 사용 = ${human(r.readPerToken)}`;
      $(".speed-note").innerHTML = state.int8
        ? `<span class="warn">이 실습의 Int8Linear는 매 호출 float로 복원하므로 실제로는 빨라지지 않는다.</span>`
        : "실측은 이보다 느리다 (Python·커널 실행 오버헤드). lab.py의 decode ms/token과 비교해 보자.";

      (changed || []).forEach((f) => {
        const field = root.querySelector(`[data-f="${f}"]`);
        if (!field) return;
        field.classList.add("flash");
        setTimeout(() => field.classList.remove("flash"), 900);
      });
    }

    function update(patch) {
      const changed = Object.keys(patch).filter((k) => state[k] !== patch[k]);
      state = { ...state, ...patch };
      if (state.capacity < state.length) state.capacity = state.length;
      render(changed);
    }

    lenRange.addEventListener("input", () => update({ length: toLen(+lenRange.value) }));
    capRange.addEventListener("input", () => update({ capacity: Math.max(state.length, toLen(+capRange.value)) }));
    root.querySelectorAll(".mc-seg").forEach((g) => g.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const raw = btn.dataset.value;
      update({ [g.dataset.key]: raw === "true" ? true : raw === "false" ? false : raw });
      btn.blur();
    }));
    bwSelect.addEventListener("change", () => {
      if (bwSelect.value !== "custom") {
        const [v, chip] = bwSelect.value.split("|");
        update({ bw: +v, chip });
      }
      bwSelect.blur();
    });
    bwInput.addEventListener("change", () => {
      const v = Math.max(10, Math.min(2000, +bwInput.value || 100));
      update({ bw: v, chip: "custom" });
      bwInput.blur();
    });
    // 슬라이드에서 → 키가 슬라이더에 잡히지 않도록 조작 후 포커스를 푼다
    [lenRange, capRange].forEach((r) => ["change", "pointerup"].forEach((ev) => r.addEventListener(ev, () => r.blur())));

    function setStep(index) {
      const k = Math.max(0, Math.min(STEPS.length - 1, index));
      if (k === current) return;
      current = k;
      update({ ...BASE, ...STEPS[k].set });
      $(".mc-caption").innerHTML = STEPS[k].caption;
    }

    setStep(0);
    return { setStep, get step() { return current; }, steps: STEPS.length, compute: () => compute(state) };
  }

  window.MemoryCalc = { mount, steps: STEPS.length, compute: (s) => compute({ ...BASE, bw: 150, ...s }) };
})();

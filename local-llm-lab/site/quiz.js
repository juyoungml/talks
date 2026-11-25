// 퀴즈 · 수료증. 문항은 data/quizzes.js (course/quizzes/NN.json에서 생성)에서 온다.
// 서버 없이 브라우저에서 채점하고, 진행 상황은 이 브라우저의 localStorage에만 둔다.
(function () {
  const QUIZZES = window.QUIZZES || [];
  const KEY = "olm-quiz-v1";
  const TYPE_LABEL = { choice: "하나 고르기", multi: "모두 고르기", number: "숫자 입력", blanks: "빈칸 채우기", match: "짝 연결", order: "순서 맞추기" };
  const ARMED = new Map(); // 짝 연결: 문항 id → 눌러 둔 왼쪽 항목
  const PAIR_COLORS = ["#2563eb", "#16a34a", "#c2410c", "#9333ea", "#0891b2"];

  // ── 저장 ──
  let state = { answers: {}, graded: {}, name: "" };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

  // ── 도우미 ──
  const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const md = (s) => esc(s || "").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  const h = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  function seeded(seedStr) {
    let a = 0;
    for (const c of seedStr) a = (Math.imul(a ^ c.charCodeAt(0), 2654435761) + 1) >>> 0;
    return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffled(n, seedStr) {
    const idx = [...Array(n).keys()], rnd = seeded(seedStr);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    if (n > 1 && idx.every((v, i) => v === i)) [idx[0], idx[1]] = [idx[1], idx[0]]; // 정답 순서 그대로 나오지 않게
    return idx;
  }
  const qid = (ch, i) => `${ch.chapter}-${i + 1}`;
  const parseNum = (s) => { const v = parseFloat(String(s).replaceAll(",", "").trim()); return Number.isFinite(v) ? v : null; };

  // ── 채점 ──
  function isAnswered(q, r) {
    if (r == null) return false;
    switch (q.type) {
      case "choice": return Number.isInteger(r);
      case "multi": return Array.isArray(r) && r.length > 0;
      case "number": return q.fields.every((_, i) => parseNum(r[i]) != null);
      case "blanks": return Array.isArray(r) && r.length === q.answer.length && r.every((x) => x != null);
      case "match": return r && q.pairs.every((_, i) => r[i] != null);
      case "order": return Array.isArray(r) && r.length === q.items.length;
    }
    return false;
  }
  function isRight(q, r) {
    if (!isAnswered(q, r)) return false;
    switch (q.type) {
      case "choice": return r === q.answer;
      case "multi": { const a = [...q.answer].sort().join(), b = [...r].sort().join(); return a === b; }
      case "number": return q.fields.every((f, i) => Math.abs(parseNum(r[i]) - f.answer) <= (f.tolerance || 0) + 1e-9);
      case "blanks": return r.every((x, i) => q.bank[x] === q.answer[i]);
      case "match": return q.pairs.every((_, i) => r[i] === i);
      case "order": return r.every((x, i) => x === i);
    }
    return false;
  }
  function chapterScore(ch) {
    return ch.questions.reduce((s, q, i) => s + (isRight(q, state.answers[qid(ch, i)]) ? 1 : 0), 0);
  }
  const passed = (ch) => !!state.graded[ch.chapter] && chapterScore(ch) >= ch.pass;

  // ── 문항 그리기 ──
  function renderQuestion(ch, q, i, graded) {
    const id = qid(ch, i);
    const r = state.answers[id];
    const right = graded && isRight(q, r);
    const card = h(`<div class="q-card${graded ? (right ? " right" : " wrong") : ""}" id="q-${id}"></div>`);
    if (graded) card.append(h(`<span class="q-badge">${right ? "정답" : "오답"}</span>`));
    card.append(h(`<p class="q-type">${TYPE_LABEL[q.type] || ""}</p>`));
    card.append(h(`<p class="q-prompt"><b class="n">${i + 1}.</b>${md(q.prompt)}</p>`));
    if (q.code) card.append(h(`<pre class="qcode${q.codeLang === "text" ? " text" : ""}">${esc(q.code)}</pre>`));
    if (q.after) card.append(h(`<p class="q-after">${md(q.after)}</p>`));
    const body = h(`<div class="q-body"></div>`);
    card.append(body);
    const set = (v) => { state.answers[id] = v; save(); rerenderQuestion(ch, i); updateActions(ch); };
    const lock = graded;

    if (q.type === "choice" || q.type === "multi") {
      const multi = q.type === "multi";
      const sel = multi ? (r || []) : r;
      const list = h(`<div class="q-options"></div>`);
      q.options.forEach((opt, k) => {
        const on = multi ? sel.includes(k) : sel === k;
        const isAns = multi ? q.answer.includes(k) : q.answer === k;
        const b = h(`<button type="button" class="q-opt${multi ? " sq" : ""}${on ? " on" : ""}${lock && isAns ? " is-answer" : ""}"><span class="mark"></span><span>${md(opt)}</span></button>`);
        b.disabled = lock;
        b.onclick = () => {
          if (multi) { const s = new Set(sel); s.has(k) ? s.delete(k) : s.add(k); set([...s].sort((a, b) => a - b)); }
          else set(k);
        };
        list.append(b);
      });
      body.append(list);
      if (lock && !right) {
        const ans = multi ? q.answer.map((k) => q.options[k]) : [q.options[q.answer]];
        body.append(h(`<div class="q-truth">정답: <b>${ans.map(md).join(" · ")}</b></div>`));
      }
    }

    if (q.type === "number") {
      const vals = r || [];
      const wrap = h(`<div class="q-fields"></div>`);
      q.fields.forEach((f, k) => {
        const row = h(`<div class="q-field"><label for="${id}-${k}">${md(f.label)}</label><input id="${id}-${k}" inputmode="decimal" autocomplete="off" value="${esc(vals[k] ?? "")}"><span class="unit">${md(f.unit || "")}</span></div>`);
        const input = row.querySelector("input");
        input.disabled = lock;
        input.oninput = () => { const v = [...(state.answers[id] || [])]; v[k] = input.value; state.answers[id] = v; save(); updateActions(ch); };
        if (lock && Math.abs((parseNum(vals[k]) ?? Infinity) - f.answer) > (f.tolerance || 0) + 1e-9)
          row.append(h(`<span class="truth">정답 ${f.answer}${f.tolerance ? ` (±${f.tolerance})` : ""}</span>`));
        wrap.append(row);
      });
      body.append(wrap);
    }

    if (q.type === "blanks") {
      const filled = r || Array(q.answer.length).fill(null);
      const parts = q.text.split("___");
      const sentence = h(`<div class="q-sentence"></div>`);
      parts.forEach((p, k) => {
        sentence.insertAdjacentHTML("beforeend", md(p));
        if (k < parts.length - 1) {
          const ok = lock && filled[k] != null && q.bank[filled[k]] === q.answer[k];
          const slot = h(`<span class="slot${lock ? (ok ? " right" : " wrong") : ""}"></span>`);
          if (filled[k] != null) {
            const chip = h(`<button type="button" class="chip-btn">${md(q.bank[filled[k]])}</button>`);
            chip.disabled = lock;
            chip.onclick = () => { const v = [...filled]; v[k] = null; set(v); };
            slot.append(chip);
          }
          sentence.append(slot);
        }
      });
      body.append(sentence);
      const order = shuffled(q.bank.length, id);
      const bank = h(`<div class="q-bank"></div>`);
      order.forEach((b) => {
        const chip = h(`<button type="button" class="chip-btn${filled.includes(b) ? " used" : ""}">${md(q.bank[b])}</button>`);
        chip.disabled = lock;
        chip.onclick = () => { const v = [...filled]; const k = v.indexOf(null); if (k >= 0) { v[k] = b; set(v); } };
        bank.append(chip);
      });
      if (!lock) body.append(bank);
      if (lock && !right) body.append(h(`<div class="q-truth">정답: <b>${q.answer.map(md).join(" · ")}</b></div>`));
    }

    if (q.type === "match") {
      const pairs = r || {};
      const rightOrder = shuffled(q.pairs.length, id);
      const grid = h(`<div class="q-match"><div class="col left"></div><div class="col right"></div></div>`);
      const leftCol = grid.querySelector(".left"), rightCol = grid.querySelector(".right");
      const armed = ARMED.has(id) ? ARMED.get(id) : null;
      const pairNo = {}; // 왼쪽 i → 표시 번호
      Object.keys(pairs).map(Number).sort((a, b) => a - b).forEach((li, n) => { pairNo[li] = n; });
      q.pairs.forEach(([left], li) => {
        const b = h(`<button type="button" class="chip-btn${armed === li ? " armed" : ""}">${md(left)}</button>`);
        if (pairs[li] != null) { b.dataset.pair = String.fromCharCode(65 + pairNo[li]); b.style.setProperty("--pc", PAIR_COLORS[pairNo[li] % PAIR_COLORS.length]); }
        b.disabled = lock;
        b.onclick = () => {
          if (pairs[li] != null) { const v = { ...pairs }; delete v[li]; ARMED.delete(id); set(v); return; }
          ARMED.set(id, li); rerenderQuestion(ch, i);
        };
        leftCol.append(b);
      });
      rightOrder.forEach((ri) => {
        const owner = Object.keys(pairs).map(Number).find((li) => pairs[li] === ri);
        const b = h(`<button type="button" class="chip-btn">${md(q.pairs[ri][1])}</button>`);
        if (owner != null) { b.dataset.pair = String.fromCharCode(65 + pairNo[owner]); b.style.setProperty("--pc", PAIR_COLORS[pairNo[owner] % PAIR_COLORS.length]); }
        b.disabled = lock;
        b.onclick = () => {
          const v = { ...pairs };
          if (owner != null) { delete v[owner]; set(v); return; }
          const a = ARMED.has(id) ? ARMED.get(id) : q.pairs.findIndex((_, li) => v[li] == null);
          if (a == null || a < 0) return;
          v[a] = ri; ARMED.delete(id); set(v);
        };
        rightCol.append(b);
      });
      body.append(grid);
      if (!lock) body.append(h(`<p class="q-hint" style="margin:10px 0 0">왼쪽을 누른 뒤 짝이 되는 오른쪽을 누르세요. 다시 누르면 풀립니다.</p>`));
      if (lock && !right) body.append(h(`<div class="q-truth">정답:<ul>${q.pairs.map(([a, b]) => `<li>${md(a)} → <b>${md(b)}</b></li>`).join("")}</ul></div>`));
    }

    if (q.type === "order") {
      const seq = r || [];
      const seqEl = h(`<div class="q-seq"></div>`);
      seq.forEach((it, k) => {
        const chip = h(`<button type="button" class="chip-btn">${md(q.items[it])}</button>`);
        chip.disabled = lock;
        chip.onclick = () => { const v = [...seq]; v.splice(k, 1); set(v); };
        seqEl.append(chip);
      });
      body.append(seqEl);
      if (!lock) {
        const pool = h(`<div class="q-pool"></div>`);
        shuffled(q.items.length, id).forEach((it) => {
          const chip = h(`<button type="button" class="chip-btn${seq.includes(it) ? " used" : ""}">${md(q.items[it])}</button>`);
          chip.onclick = () => set([...seq, it]);
          pool.append(chip);
        });
        body.append(pool);
      }
      if (lock && !right) body.append(h(`<div class="q-truth">정답 순서:<ol>${q.items.map((x) => `<li><b>${md(x)}</b></li>`).join("")}</ol></div>`));
    }

    if (graded && q.explain) card.append(h(`<div class="q-explain">${md(q.explain)}</div>`));
    return card;
  }

  function rerenderQuestion(ch, i) {
    const old = document.getElementById(`q-${qid(ch, i)}`);
    old.replaceWith(renderQuestion(ch, ch.questions[i], i, !!state.graded[ch.chapter]));
  }

  // ── 강 섹션 ──
  function renderChapter(ch) {
    const graded = !!state.graded[ch.chapter];
    const sec = h(`<section class="q-chapter" id="q${ch.chapter}"></section>`);
    sec.append(h(`<header><span class="q-num">${ch.chapter}</span><h2>${md(ch.title)}</h2><span class="q-rule">${ch.questions.length}문항 · ${ch.pass}개 이상 통과</span></header>`));
    sec.append(h(`<p class="q-intro">${md(ch.intro || "")} <a href="ch${ch.chapter}.html">강의 다시 보기 →</a></p>`));
    ch.questions.forEach((q, i) => sec.append(renderQuestion(ch, q, i, graded)));
    const actions = h(`<div class="q-actions"></div>`);
    sec.append(actions);
    return sec;
  }

  function updateActions(ch) {
    const sec = document.getElementById(`q${ch.chapter}`);
    const actions = sec.querySelector(".q-actions");
    actions.innerHTML = "";
    if (state.graded[ch.chapter]) {
      const s = chapterScore(ch), ok = s >= ch.pass;
      actions.append(h(`<p class="q-result ${ok ? "pass" : "fail"}"><b>${s} / ${ch.questions.length}</b> · ${ok ? "통과했습니다" : `${ch.pass}개 이상이면 통과입니다. 해설을 보고 다시 풀어 보세요`}</p>`));
      const retry = h(`<button type="button" class="btn">${ok ? "처음부터 다시 풀기" : "다시 풀기"}</button>`);
      retry.onclick = () => {
        delete state.graded[ch.chapter];
        ch.questions.forEach((_, i) => delete state.answers[qid(ch, i)]);
        save(); sec.replaceWith(renderChapter(ch)); updateActions(ch); updateProgress();
        document.getElementById(`q${ch.chapter}`).scrollIntoView({ block: "start" });
      };
      actions.append(retry);
    } else {
      const left = ch.questions.filter((q, i) => !isAnswered(q, state.answers[qid(ch, i)])).length;
      const btn = h(`<button type="button" class="btn primary">채점하기</button>`);
      btn.disabled = left > 0;
      btn.onclick = () => {
        state.graded[ch.chapter] = true; save();
        sec.replaceWith(renderChapter(ch)); updateActions(ch); updateProgress();
        document.getElementById(`q${ch.chapter}`).scrollIntoView({ block: "start" });
      };
      actions.append(btn);
      actions.append(h(`<span class="q-hint">${left ? `${left}문항 남았습니다` : "모두 답했습니다"}</span>`));
    }
  }

  // ── 진행 칩 ──
  function updateProgress() {
    const bar = document.getElementById("q-progress");
    bar.innerHTML = "";
    QUIZZES.forEach((ch) => {
      const cls = state.graded[ch.chapter] ? (passed(ch) ? "pass" : "fail") : "";
      bar.append(h(`<a href="#q${ch.chapter}" class="${cls}">${ch.chapter}</a>`));
    });
    const all = QUIZZES.length > 0 && QUIZZES.every(passed);
    bar.append(h(`<a href="#certificate" class="cert${all ? " open" : ""}">수료증</a>`));
    renderCertificate();
  }

  // ── 수료증 ──
  function renderCertificate() {
    const root = document.getElementById("certificate");
    const n = QUIZZES.filter(passed).length;
    root.innerHTML = "";
    if (n < QUIZZES.length) {
      root.append(h(`<div class="cert-lock"><strong>9강 퀴즈를 모두 통과하면 수료증이 열립니다</strong>
        <div class="dots">${QUIZZES.map((ch) => `<i class="${passed(ch) ? "pass" : ""}"></i>`).join("")}</div>
        <span>${n} / ${QUIZZES.length} 통과</span></div>`));
      return;
    }
    const total = QUIZZES.reduce((s, ch) => s + ch.questions.length, 0);
    const score = QUIZZES.reduce((s, ch) => s + chapterScore(ch), 0);
    const today = new Date();
    const date = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}.`;
    const form = h(`<div class="cert-form"><input id="cert-name" placeholder="수료증에 넣을 이름" maxlength="24" value="${esc(state.name || "")}"><button type="button" class="btn primary" id="cert-print">인쇄 · PDF로 저장</button></div>`);
    root.append(form);
    const S = window.SCORES?.chapters || {};
    const rates = Object.entries(S).filter(([, v]) => v.rate).map(([k, v]) => [`${Number(k)}강`, v.rate]);
    const max = Math.max(...rates.map(([, v]) => v), 1);
    const sheet = h(`<article class="sheet" aria-label="수료증">
      <section class="main">
        <p class="kind">수료증<span>CERTIFICATE</span></p>
        <div class="who">
          <h3 class="name"></h3>
          <p class="course">PyTorch로 Ollama 만들기</p>
          <p class="what">9강 강의를 마치고 퀴즈 ${total}문항을 풀어 모든 강을 통과했습니다.</p>
        </div>
        <dl class="meta">
          <div><dt>발급일</dt><dd>${date}</dd></div>
          <div><dt>퀴즈 점수</dt><dd class="mono">${score} / ${total}</dd></div>
          <div><dt>구분</dt><dd>수강 완료</dd></div>
        </dl>
      </section>
      <aside class="proof" aria-label="코스에서 만든 엔진">
        <span class="tag">수강 완료</span>
        <p class="big"><span class="from">${rates.length ? rates[0][1].toFixed(1) + " →" : ""}</span><span class="to">${rates.length ? rates[rates.length - 1][1].toFixed(1) : ""}</span></p>
        <p class="unit">코스에서 따라 만든 엔진의 decode 속도 (tok/s)<br>코스 기준값 · Apple M3 Pro</p>
        <div class="bars" aria-hidden="true">${rates.map(([, v]) => `<i style="height:${(v / max * 100).toFixed(1)}%"></i>`).join("")}</div>
        <div class="ticks" aria-hidden="true">${rates.map(([k]) => `<span>${k}</span>`).join("")}</div>
      </aside>
    </article>`);
    root.append(sheet);
    root.append(h(`<p class="cert-note">퀴즈는 이 브라우저에서 채점되고, 이 수료증은 확인 번호 없이 스스로 발급하는 수강 완료증입니다. 오른쪽 숫자는 코스 작성자의 기계에서 잰 값입니다. 자기 기계에서 잰 숫자가 들어가는 프로젝트 인증 수료증은 최종 프로젝트를 제출하면 발급합니다.</p>`));
    const nameEl = sheet.querySelector(".name");
    const input = form.querySelector("#cert-name");
    const paint = () => { nameEl.textContent = input.value.trim() || "이름"; nameEl.style.opacity = input.value.trim() ? 1 : 0.3; };
    input.oninput = () => { state.name = input.value; save(); paint(); };
    paint();
    form.querySelector("#cert-print").onclick = () => {
      const holder = h(`<div class="print-root"></div>`);
      holder.append(sheet.cloneNode(true));
      document.body.append(holder);
      document.body.classList.add("printing");
      const done = () => { document.body.classList.remove("printing"); holder.remove(); window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      window.print();
    };
  }

  // ── 시작 ──
  const list = document.getElementById("q-list");
  QUIZZES.forEach((ch) => { list.append(renderChapter(ch)); updateActions(ch); });
  updateProgress();
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ block: "start" });
})();

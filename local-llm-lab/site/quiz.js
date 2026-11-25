// 퀴즈 · 수료증. 문항은 data/quizzes.js (course/quizzes/NN.json에서 생성)에서 온다.
// 강마다 한 문제씩 풀고 바로 확인한다. 틀린 문제는 강 끝에 다시 나온다.
// 통과 여부는 첫 시도 점수로 정한다. 진행 상황은 이 브라우저의 localStorage에만 둔다.
(function () {
  const QUIZZES = window.QUIZZES || [];
  const KEY = "olm-quiz-v2";
  const TYPE_LABEL = { choice: "하나 고르기", multi: "모두 고르기", number: "숫자 입력", blanks: "빈칸 채우기", match: "짝 연결", order: "순서 맞추기" };
  const PAIR_COLORS = ["#2563eb", "#16a34a", "#c2410c", "#9333ea", "#0891b2"];
  const PRAISE = ["정답입니다", "맞았습니다", "좋습니다", "정확합니다"];

  // ── 저장: progress[강] = { best, passed, tries } ──
  let state = { progress: {}, name: "" };
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
  const parseNum = (s) => { const v = parseFloat(String(s).replaceAll(",", "").trim()); return Number.isFinite(v) ? v : null; };
  const prog = (ch) => state.progress[ch.chapter] || {};
  const passed = (ch) => !!prog(ch).passed;

  // ── 채점 ──
  function isAnswered(q, r) {
    if (r == null) return false;
    switch (q.type) {
      case "choice": return Number.isInteger(r);
      case "multi": return Array.isArray(r) && r.length > 0;
      case "number": return q.fields.every((_, i) => parseNum(r[i]) != null);
      case "blanks": return Array.isArray(r) && r.length === q.answer.length && r.every((x) => x != null);
      case "match": return q.pairs.every((_, i) => r[i] != null);
      case "order": return Array.isArray(r) && r.length === q.items.length;
    }
    return false;
  }
  function isRight(q, r) {
    if (!isAnswered(q, r)) return false;
    switch (q.type) {
      case "choice": return r === q.answer;
      case "multi": return [...q.answer].sort().join() === [...r].sort().join();
      case "number": return q.fields.every((f, i) => Math.abs(parseNum(r[i]) - f.answer) <= (f.tolerance || 0) + 1e-9);
      case "blanks": return r.every((x, i) => q.bank[x] === q.answer[i]);
      case "match": return q.pairs.every((_, i) => r[i] === i);
      case "order": return r.every((x, i) => x === i);
    }
    return false;
  }

  // ── 문항 입력부: (문항, 응답, 잠금, 바뀔 때) → 요소 ──
  // ui는 문항 하나 동안만 쓰는 화면 상태(짝 연결에서 눌러 둔 왼쪽 등)
  function renderBody(q, seed, r, lock, onChange, ui) {
    const body = h(`<div class="q-body"></div>`);

    if (q.type === "choice" || q.type === "multi") {
      const multi = q.type === "multi";
      const sel = multi ? (r || []) : r;
      const list = h(`<div class="q-options"></div>`);
      q.options.forEach((opt, k) => {
        const on = multi ? sel.includes(k) : sel === k;
        const isAns = multi ? q.answer.includes(k) : q.answer === k;
        const b = h(`<button type="button" class="q-opt${multi ? " sq" : ""}${on ? " on" : ""}${lock && isAns ? " is-answer" : ""}${lock && on && !isAns ? " is-wrong" : ""}"><span class="mark"></span><span>${md(opt)}</span></button>`);
        b.disabled = lock;
        b.onclick = () => {
          if (multi) { const s = new Set(sel); s.has(k) ? s.delete(k) : s.add(k); onChange([...s].sort((a, b) => a - b)); }
          else onChange(k);
        };
        list.append(b);
      });
      body.append(list);
    }

    if (q.type === "number") {
      const vals = r || [];
      const wrap = h(`<div class="q-fields"></div>`);
      q.fields.forEach((f, k) => {
        const id = `${seed}-f${k}`;
        const row = h(`<div class="q-field"><label for="${id}">${md(f.label)}</label><input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(vals[k] ?? "")}"><span class="unit">${md(f.unit || "")}</span></div>`);
        const input = row.querySelector("input");
        input.disabled = lock;
        input.oninput = () => { const v = [...(r || [])]; v[k] = input.value; r = v; onChange(v, true); };
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
            chip.onclick = () => { const v = [...filled]; v[k] = null; onChange(v); };
            slot.append(chip);
          }
          sentence.append(slot);
        }
      });
      body.append(sentence);
      if (!lock) {
        const bank = h(`<div class="q-bank"></div>`);
        shuffled(q.bank.length, seed).forEach((b) => {
          const chip = h(`<button type="button" class="chip-btn${filled.includes(b) ? " used" : ""}">${md(q.bank[b])}</button>`);
          chip.onclick = () => { const v = [...filled]; const k = v.indexOf(null); if (k >= 0) { v[k] = b; onChange(v); } };
          bank.append(chip);
        });
        body.append(bank);
      }
    }

    if (q.type === "match") {
      const pairs = r || {};
      const grid = h(`<div class="q-match"><div class="col left"></div><div class="col right"></div></div>`);
      const leftCol = grid.querySelector(".left"), rightCol = grid.querySelector(".right");
      const pairNo = {};
      Object.keys(pairs).map(Number).sort((a, b) => a - b).forEach((li, n) => { pairNo[li] = n; });
      const paint = (b, li) => { b.dataset.pair = String.fromCharCode(65 + pairNo[li]); b.style.setProperty("--pc", PAIR_COLORS[pairNo[li] % PAIR_COLORS.length]); };
      q.pairs.forEach(([left], li) => {
        const b = h(`<button type="button" class="chip-btn${ui.armed === li ? " armed" : ""}">${md(left)}</button>`);
        if (pairs[li] != null) paint(b, li);
        b.disabled = lock;
        b.onclick = () => {
          if (pairs[li] != null) { const v = { ...pairs }; delete v[li]; ui.armed = null; onChange(v); return; }
          ui.armed = li; onChange(pairs);
        };
        leftCol.append(b);
      });
      shuffled(q.pairs.length, seed).forEach((ri) => {
        const owner = Object.keys(pairs).map(Number).find((li) => pairs[li] === ri);
        const b = h(`<button type="button" class="chip-btn">${md(q.pairs[ri][1])}</button>`);
        if (owner != null) paint(b, owner);
        b.disabled = lock;
        b.onclick = () => {
          const v = { ...pairs };
          if (owner != null) { delete v[owner]; onChange(v); return; }
          const a = ui.armed != null ? ui.armed : q.pairs.findIndex((_, li) => v[li] == null);
          if (a < 0) return;
          v[a] = ri; ui.armed = null; onChange(v);
        };
        rightCol.append(b);
      });
      body.append(grid);
      if (!lock) body.append(h(`<p class="q-hint" style="margin:10px 0 0">왼쪽을 누른 뒤 짝이 되는 오른쪽을 누르세요. 다시 누르면 풀립니다.</p>`));
    }

    if (q.type === "order") {
      const seq = r || [];
      const seqEl = h(`<div class="q-seq"></div>`);
      seq.forEach((it, k) => {
        const chip = h(`<button type="button" class="chip-btn">${md(q.items[it])}</button>`);
        chip.disabled = lock;
        chip.onclick = () => { const v = [...seq]; v.splice(k, 1); onChange(v); };
        seqEl.append(chip);
      });
      body.append(seqEl);
      if (!lock) {
        const pool = h(`<div class="q-pool"></div>`);
        shuffled(q.items.length, seed).forEach((it) => {
          const chip = h(`<button type="button" class="chip-btn${seq.includes(it) ? " used" : ""}">${md(q.items[it])}</button>`);
          chip.onclick = () => onChange([...seq, it]);
          pool.append(chip);
        });
        body.append(pool);
      }
    }
    return body;
  }

  // 틀렸을 때 보여 줄 정답 (고르기·숫자는 입력부에 이미 표시됨)
  function truthHtml(q) {
    if (q.type === "choice") return `정답: <b>${md(q.options[q.answer])}</b>`;
    if (q.type === "multi") return `정답: <b>${q.answer.map((k) => md(q.options[k])).join(" · ")}</b>`;
    if (q.type === "number") return `정답: <b>${q.fields.map((f) => `${md(f.label)} ${f.answer}${f.unit ? " " + md(f.unit) : ""}`).join(" · ")}</b>`;
    if (q.type === "blanks") return `정답: <b>${q.answer.map(md).join(" · ")}</b>`;
    if (q.type === "match") return `정답:<ul>${q.pairs.map(([a, b]) => `<li>${md(a)} → <b>${md(b)}</b></li>`).join("")}</ul>`;
    return `정답 순서:<ol>${q.items.map((x) => `<li><b>${md(x)}</b></li>`).join("")}</ol>`;
  }

  // ── 레슨: 한 강을 한 문제씩 ──
  let lesson = null;
  const overlay = h(`<div class="lesson" role="dialog" aria-modal="true" hidden>
      <header class="lesson-top">
        <button type="button" class="lesson-close" aria-label="닫기">✕</button>
        <div class="lesson-bar" aria-hidden="true"><i></i></div>
        <span class="lesson-count"></span>
      </header>
      <div class="lesson-scroll"><div class="lesson-stage"></div></div>
      <footer class="lesson-foot"><div class="lesson-foot-in"></div></footer>
    </div>`);
  document.body.append(overlay);
  const stage = overlay.querySelector(".lesson-stage");
  const foot = overlay.querySelector(".lesson-foot");
  const footIn = overlay.querySelector(".lesson-foot-in");
  overlay.querySelector(".lesson-close").onclick = () => closeLesson();

  function openLesson(ch) {
    lesson = { ch, queue: ch.questions.map((_, i) => i), first: {}, solved: new Set(), cur: null, resp: undefined, phase: "answer", ui: {}, retry: false };
    overlay.hidden = false;
    document.documentElement.classList.add("lesson-open");
    history.replaceState(null, "", `#q${ch.chapter}`);
    nextQuestion();
  }
  function closeLesson() {
    overlay.hidden = true;
    document.documentElement.classList.remove("lesson-open");
    history.replaceState(null, "", location.pathname + location.search);
    lesson = null;
    renderPath();
  }
  function updateBar() {
    const n = lesson.ch.questions.length;
    overlay.querySelector(".lesson-bar i").style.width = `${(lesson.solved.size / n) * 100}%`;
    overlay.querySelector(".lesson-count").textContent = `${lesson.solved.size} / ${n}`;
  }
  function nextQuestion() {
    if (!lesson.queue.length) return finishLesson();
    lesson.cur = lesson.queue.shift();
    lesson.retry = lesson.first[lesson.cur] === false;
    lesson.resp = undefined; lesson.phase = "answer"; lesson.ui = {};
    drawQuestion(true);
  }
  function drawQuestion(fresh) {
    const { ch, cur } = lesson, q = ch.questions[cur], seed = `${ch.chapter}-${cur + 1}`;
    const lock = lesson.phase !== "answer";
    const card = h(`<div class="q-card lesson-card${fresh ? " enter" : ""}"></div>`);
    card.append(h(`<p class="q-type">${lesson.retry ? '<span class="again">다시 풀기</span>' : ""}${TYPE_LABEL[q.type] || ""} · ${ch.chapter} ${md(ch.title)}</p>`));
    card.append(h(`<p class="q-prompt">${md(q.prompt)}</p>`));
    if (q.code) card.append(h(`<pre class="qcode${q.codeLang === "text" ? " text" : ""}">${esc(q.code)}</pre>`));
    if (q.after) card.append(h(`<p class="q-after">${md(q.after)}</p>`));
    card.append(renderBody(q, seed, lesson.resp, lock, (v, quiet) => {
      lesson.resp = v;
      if (quiet) drawFoot(); else { drawQuestion(false); }
    }, lesson.ui));
    stage.replaceChildren(card);
    if (fresh) overlay.querySelector(".lesson-scroll").scrollTop = 0;
    updateBar();
    drawFoot();
  }
  function drawFoot() {
    const { ch, cur, phase } = lesson, q = ch.questions[cur];
    foot.className = "lesson-foot" + (phase === "right" ? " right" : phase === "wrong" ? " wrong" : "");
    if (phase === "answer") {
      const ready = isAnswered(q, lesson.resp);
      footIn.innerHTML = `<span class="foot-hint">${ready ? "Enter로 확인" : "답을 고르세요"}</span><button type="button" class="btn primary lesson-go"${ready ? "" : " disabled"}>확인</button>`;
      footIn.querySelector(".lesson-go").onclick = check;
    } else {
      const ok = phase === "right";
      const head = ok ? PRAISE[cur % PRAISE.length] : "아쉽습니다";
      footIn.innerHTML = `<div class="foot-msg"><strong class="foot-head">${ok ? "✓" : "✕"} ${head}</strong>
        ${ok ? "" : `<div class="foot-truth">${truthHtml(q)}</div>`}
        ${q.explain ? `<p class="foot-explain">${md(q.explain)}</p>` : ""}
        ${!ok ? '<p class="foot-note">이 문제는 강 끝에 한 번 더 나옵니다.</p>' : ""}</div>
        <button type="button" class="btn primary lesson-go">계속</button>`;
      footIn.querySelector(".lesson-go").onclick = nextQuestion;
      footIn.querySelector(".lesson-go").focus({ preventScroll: true });
    }
  }
  function check() {
    const { ch, cur } = lesson, q = ch.questions[cur];
    if (!isAnswered(q, lesson.resp)) return;
    const ok = isRight(q, lesson.resp);
    if (!(cur in lesson.first)) lesson.first[cur] = ok;
    if (ok) lesson.solved.add(cur); else lesson.queue.push(cur);
    lesson.phase = ok ? "right" : "wrong";
    drawQuestion(false);
  }
  function finishLesson() {
    const { ch } = lesson;
    const n = ch.questions.length;
    const score = Object.values(lesson.first).filter(Boolean).length;
    const ok = score >= ch.pass;
    const p = prog(ch);
    state.progress[ch.chapter] = { best: Math.max(p.best || 0, score), passed: !!p.passed || ok, tries: (p.tries || 0) + 1 };
    save();
    const idx = QUIZZES.indexOf(ch);
    const next = QUIZZES.slice(idx + 1).find((c) => !passed(c)) || QUIZZES.find((c) => !passed(c));
    const all = QUIZZES.every(passed);
    overlay.querySelector(".lesson-bar i").style.width = "100%";
    foot.className = "lesson-foot";
    stage.replaceChildren(h(`<div class="lesson-done ${ok ? "pass" : "fail"}">
        <div class="done-badge">${ok ? "✓" : "↺"}</div>
        <p class="kicker">${ch.chapter} ${md(ch.title)}</p>
        <h2>${ok ? (all ? "모든 강을 통과했습니다" : "통과했습니다") : "조금만 더"}</h2>
        <p class="done-score"><b>${score}</b> / ${n} <span>첫 시도에 맞힌 문제</span></p>
        <p class="done-sub">${ok ? (all ? "목록 맨 아래에서 수료증을 받을 수 있습니다." : `${ch.pass}개 이상 맞혀 이 강을 통과했습니다.`) : `${ch.pass}개 이상 맞히면 통과입니다. 해설을 떠올리며 다시 풀어 보세요.`}</p>
      </div>`));
    footIn.innerHTML = "";
    const again = h(`<button type="button" class="btn">다시 풀기</button>`);
    again.onclick = () => openLesson(ch);
    let go;
    if (all) { go = h(`<button type="button" class="btn primary lesson-go">수료증 받기</button>`); go.onclick = () => { closeLesson(); document.getElementById("certificate").scrollIntoView({ block: "start" }); }; }
    else if (ok && next) { go = h(`<button type="button" class="btn primary lesson-go">다음 · ${next.chapter} ${esc(next.title)}</button>`); go.onclick = () => openLesson(next); }
    else { go = h(`<button type="button" class="btn primary lesson-go">목록으로</button>`); go.onclick = closeLesson; }
    footIn.append(again, go);
    go.focus({ preventScroll: true });
    lesson.phase = "done";
  }
  document.addEventListener("keydown", (e) => {
    if (!lesson || overlay.hidden) return;
    if (e.key === "Escape") { closeLesson(); return; }
    if (e.key !== "Enter" || e.isComposing) return;
    if (e.target.tagName === "BUTTON" && !e.target.classList.contains("lesson-go")) return; // 버튼 위의 Enter는 그 버튼이 처리
    e.preventDefault();
    if (lesson.phase === "answer") check();
    else if (lesson.phase === "right" || lesson.phase === "wrong") nextQuestion();
  });

  // ── 경로 (첫 화면) ──
  function renderPath() {
    const list = document.getElementById("q-list");
    list.innerHTML = "";
    const firstOpen = QUIZZES.find((c) => !passed(c));
    QUIZZES.forEach((ch) => {
      const p = prog(ch), n = ch.questions.length;
      const status = p.passed ? "pass" : p.tries ? "fail" : "";
      const isNext = ch === firstOpen;
      const item = h(`<li class="path-item ${status}${isNext ? " is-next" : ""}">
          <button type="button" class="path-node" aria-label="${ch.chapter}강 퀴즈 시작">${p.passed ? "✓" : ch.chapter}</button>
          <div class="path-text">
            <strong>${md(ch.title)}</strong>
            <span>${n}문항 · ${p.passed ? `통과 · 최고 ${p.best}/${n}` : p.tries ? `최고 ${p.best}/${n} · ${ch.pass}개 이상이면 통과` : `${ch.pass}개 이상 맞히면 통과`}</span>
          </div>
          <button type="button" class="btn ${isNext ? "primary" : ""} path-go">${p.passed ? "다시" : p.tries ? "재도전" : "시작"}</button>
        </li>`);
      item.querySelector(".path-node").onclick = item.querySelector(".path-go").onclick = () => openLesson(ch);
      list.append(item);
    });
    const done = QUIZZES.filter(passed).length;
    document.getElementById("q-summary").innerHTML = `<b>${done}</b> / ${QUIZZES.length}강 통과`;
    const head = document.querySelector(".cert-head");
    const open = done === QUIZZES.length;
    head.classList.toggle("pass", open);
    head.querySelector(".path-text span").textContent = open ? "열렸습니다. 이름을 넣고 저장하세요" : "9강을 모두 통과하면 열립니다";
    document.getElementById("q-summary-bar").style.width = `${(done / Math.max(1, QUIZZES.length)) * 100}%`;
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
    const score = QUIZZES.reduce((s, ch) => s + (prog(ch).best || 0), 0);
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
        <div class="cbars" aria-hidden="true">${rates.map(([, v]) => `<i style="height:${(v / max * 100).toFixed(1)}%"></i>`).join("")}</div>
        <div class="cticks" aria-hidden="true">${rates.map(([k]) => `<span>${k}</span>`).join("")}</div>
      </aside>
    </article>`);
    root.append(sheet);
    root.append(h(`<p class="cert-note">퀴즈 점수는 강마다 첫 시도에 맞힌 문제 수의 최고 기록입니다. 이 수료증은 브라우저에서 채점해 확인 번호 없이 스스로 발급하는 수강 완료증이고, 오른쪽 숫자는 코스 작성자의 기계에서 잰 값입니다. 자기 기계에서 잰 숫자가 들어가는 프로젝트 인증 수료증은 최종 프로젝트를 제출하면 발급합니다.</p>`));
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
  renderPath();
  const m = location.hash.match(/^#q(\d\d)$/);
  const target = m && QUIZZES.find((c) => c.chapter === m[1]);
  if (target) openLesson(target);
  else if (location.hash === "#certificate") document.getElementById("certificate").scrollIntoView({ block: "start" });
  window.__quiz = { openLesson, isRight, isAnswered, get lesson() { return lesson; } }; // QA용
})();

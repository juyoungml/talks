// ── Ollama 터미널 재생 ──────────────────────────────────────────
// 실제 `ollama run qwen3:0.6b-fp16 --verbose` 실행 기록 (M3 Pro).
// 첫 토큰까지 182 ms(5회 중앙값), 이후 586토큰을 7.45초 동안 출력.
const OLLAMA = {
  command: "ollama run qwen3:0.6b-fp16 --verbose",
  prompt: "회의록의 결정 사항 세 가지를 한국어로 정리해줘.\n\n주간 제품 회의록 (11월 18일, 화)\n참석: 민호(PM), 지민(백엔드), 서연(디자인), …\n… (회의록 23줄)",
  firstTokenMs: 182,
  streamMs: 7452,
  answer: `1. **주간 제품 회의록 (11월 18일, 화)**
   - **참석자**: 민호(PM), 지민(백엔드), 서연(디자인), 도윤(프론트엔드), 하은(QA)

2. **지난주 진행 상황**
   - **도윤**: 대시보드 첫 화면의 로딩 속도를 개선했다. 초기 렌더링이 2.4초에서 1.1초로 줄었다.
   - **지민**: 검색 API의 응답 형식을 정리했다. 기존 클라이언트와 호환되도록 이전 필드는 한 달 동안 유지한다.
   - **서연**: 온보딩 화면 시안 두 가지를 공유했다. 팀원 대부분이 단계 수가 적은 B안을 선호했다.
   - **하은**: 지난 배포 이후 들어온 버그 리포트 14건을 분류했다. 그중 3건은 재현되지 않아 보류했다.

3. **데모 일정**
   - ** 고객사 데모 날짜**: 11월 21일을 논의했다.
   - ** 목표**: 검색 기능 안정화가 끝나지 않아 무리라는 의견이 많았다.
   - **결론**: 데모는 11월 25일(화) 오후 2시에 진행한다.

4. **역할 분담**
   - **검색과 대시보드 테스트**: 지민이 맡는다.
   - **회귀 테스트**: 하은과 함께 만든 목록을 작성한다.
   - **사용자 가이드**: 서연이 작성한다.
   - **화면 캡처**: B안 기준으로 새로 찍는다.
   - **샘플 데이터**: 도윤이 준비하고, 발표 순서를 민호가 정리한다.

5. **기타**
   - **외부 공개 여부**: 블로그 글, 보도자료는 이번 달 안에 결정하지 않고 다음 회의에서 다시 논의한다.
   - **사내 위키 문서**: 각자 담당 영역부터 이번 달 안에 진행한다.
   - **회고**: 11월 25일 데모가 끝난 뒤 오후 4시에 짧게 회고를 드린다.`,
  stats: "\n\nprompt eval count:    642 token(s)\neval count:           586 token(s)\neval duration:        7.451829s\neval rate:            78.64 tokens/s",
};

const esc = s => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

// ── 장 목록 · 상단 내비 ─────────────────────────────────────────
const CHAPTERS = [
  ["00", "시작", "index.html"],
  ["01", "01 첫 토큰", "ch01.html", "첫 토큰 꺼내기"],
  ["02", "02 이어 쓰기", "ch02.html", "한 토큰씩 이어 쓰기"],
  ["03", "03 측정", "ch03.html", "어디가 느린지 측정하기"],
  ["04", "04 KV cache", "ch04.html", "계산한 K, V 재사용하기"],
  ["05", "05 SDPA", "ch05.html", "attention 커널 바꾸기"],
  ["06", "06 static cache", "ch06.html", "메모리 미리 잡아두기"],
  ["07", "07 compile", "ch07.html", "파이썬 오버헤드 줄이기"],
  ["08", "08 INT8", "ch08.html", "가중치를 INT8로 줄이기"],
  ["09", "09 비교", "ch09.html", "다시 Ollama와 비교하기"],
  ["Q", "퀴즈 · 수료증", "quiz.html", "퀴즈 · 수료증"],
];

function setupNav() {
  const nav = document.querySelector("#nav");
  if (!nav) return;
  const here = document.body.dataset.chapter;
  nav.innerHTML = CHAPTERS.map(([n, label, href]) =>
    `<a href="${href}"${n === here ? ' class="here" aria-current="page"' : ""}>${label}</a>`).join("");
  nav.querySelector(".here")?.scrollIntoView({ inline: "center", block: "nearest" });
  const next = document.querySelector("a.next[data-next]");
  if (next) {
    const c = CHAPTERS.find(c => c[0] === next.dataset.next);
    if (c) { next.href = c[2]; next.innerHTML = `다음 · ${c[0]} ${c[3]} →`; next.classList.remove("disabled"); }
  }
}

// ── 터미널 재생 ────────────────────────────────────────────────
// 재생 데이터는 [[시각 ms, 덧붙일 글자], ...] 목록이다.
function replayData(key) {
  if (key === "ollama") {
    const n = OLLAMA.answer.length;
    const events = [...OLLAMA.answer].map((ch, i) => [OLLAMA.firstTokenMs + (i / n) * OLLAMA.streamMs, ch]);
    return { command: OLLAMA.command, prompt: OLLAMA.prompt, events, stats: OLLAMA.stats };
  }
  return window.REPLAYS?.[key];
}

function makePlayer(fig) {
  const D = replayData(fig.dataset.replay);
  const body = fig.querySelector(".term-body");
  const clock = fig.querySelector(".term-clock");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let timer = null;
  if (!D) { body.textContent = "재생 데이터를 불러오지 못했습니다."; return { play() {} }; }
  const head = `<span class="ps">$</span> ${esc(D.command)}\n<span class="ps">&gt;&gt;&gt;</span> <span class="user">${esc(D.prompt)}</span>\n\n`;
  const end = D.events.at(-1)[0];

  function render(t) {
    let text = "", n = 0;
    for (const [at, s] of D.events) { if (at > t) break; text += s; n++; }
    const done = n === D.events.length;
    body.innerHTML = head + esc(text) + (done ? `<span class="stat">${esc(D.stats)}</span>` : `<span class="caret"></span>`);
    body.scrollTop = body.scrollHeight;
    if (clock) clock.textContent = `${(Math.min(t, end) / 1000).toFixed(1)}초`;
    return done;
  }
  function play() {
    clearInterval(timer);
    if (reduce) return render(Infinity);
    const start = performance.now();
    render(0);
    timer = setInterval(() => { if (render(performance.now() - start)) clearInterval(timer); }, 33);
  }
  render(-1);
  return { play };
}

function setupTerminals() {
  const players = new Map();
  document.querySelectorAll("figure.term[data-replay]").forEach(f => players.set(f, makePlayer(f)));
  const scopes = new Set([...players.keys()].map(f => f.closest(".duo") || f));
  for (const scope of scopes) {
    const figs = scope.matches("figure") ? [scope] : [...scope.querySelectorAll("figure.term[data-replay]")];
    const playAll = () => figs.forEach(f => players.get(f).play());
    scope.querySelectorAll("[data-play]").forEach(b => b.addEventListener("click", playAll));
    // 화면에 처음 들어올 때 한 번 재생 (스크롤 위치로 직접 확인)
    let started = false;
    const check = () => {
      if (started) return;
      const r = scope.getBoundingClientRect();
      if (r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.2) {
        started = true;
        removeEventListener("scroll", check);
        playAll();
      }
    };
    addEventListener("scroll", check, { passive: true });
    check();
  }
}

// ── 스코어보드 ─────────────────────────────────────────────────
// <figure class="score" data-upto="04" data-metric="rate|first">
function setupScores() {
  const S = window.SCORES;
  if (!S) return;
  document.querySelectorAll("figure.score[data-upto]").forEach(fig => {
    const metric = fig.dataset.metric || "rate";
    const upto = fig.dataset.upto;
    const rows = [["Ollama FP16", S.ollama[metric], "them"]];
    if (fig.dataset.q4 !== undefined) rows.push(["Ollama Q4", S.ollamaQ4[metric], "them q4"]);
    for (const [n, v] of Object.entries(S.chapters)) {
      if (n > upto) break;
      if (v[metric] == null) continue;
      rows.push([`${n}장`, v[metric], n === upto ? "us now" : "us"]);
    }
    const max = Math.max(...rows.map(r => r[1]));
    const unit = metric === "rate" ? "tok/s" : "ms";
    const title = metric === "rate" ? "답을 써 내려가는 속도" : "첫 토큰까지 걸린 시간";
    const hint = metric === "rate" ? "길수록 빠릅니다" : "짧을수록 좋습니다";
    fig.innerHTML = `<figcaption>${title} <small>${hint}</small></figcaption>` + rows.map(([who, v, cls]) =>
      `<div class="row ${cls}"><span class="who">${who}</span><span class="track"><span style="--w:${(v / max) * 100}%"></span></span><span class="val">${metric === "rate" ? v.toFixed(1) : Math.round(v)} ${unit}</span></div>`).join("")
      + `<p class="fine">${S.note}</p>`;
  });
}

// ── 코드 패널 ─────────────────────────────────────────────────
async function loadCells(step) {
  // data/steps.js (scripts/build_steps_js.py) 에 묶어 둔 코드를 먼저 쓰고, 없으면 레포에서 직접 읽는다
  if (window.STEPS?.[step]) return splitCells(window.STEPS[step]);
  const res = await fetch(`../steps/${step}.py`, { cache: "no-cache" });
  if (!res.ok) throw new Error(step);
  return splitCells(await res.text());
}

// 줄 단위 LCS diff. 결과: [{op: "same"|"add"|"del", text, cell}]
function diffLines(prev, cur) {
  const n = prev.length, m = cur.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = prev[i] === cur[j].text ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && prev[i] === cur[j].text) { ops.push({ op: "same", ...cur[j], n: j + 1 }); i++; j++; }
    else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) { ops.push({ op: "add", ...cur[j], n: j + 1 }); j++; }
    else { ops.push({ op: "del", text: prev[i], cell: null }); i++; }
  }
  // 지워진 줄은 바로 다음에 오는 줄의 칸에 붙인다
  let carry = [];
  for (const o of ops) {
    if (o.op === "del") carry.push(o);
    else { carry.forEach(d => (d.cell = o.cell)); carry = []; }
  }
  carry.forEach(d => (d.cell = cur.at(-1)?.cell ?? 0));
  return ops;
}

function currentSection(sections) {
  const line = innerHeight * 0.45;
  let pick = sections[0];
  for (const s of sections) if (s.getBoundingClientRect().top < line) pick = s;
  return pick;
}

async function setupCode() {
  const panel = document.querySelector("#code-body");
  if (!panel) return;
  const delta = document.querySelector("#code-delta");
  const sections = [...document.querySelectorAll("section[data-cell]")];
  const step = document.body.dataset.step, prevStep = document.body.dataset.prev;
  const smooth = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  let cells, prev = null;
  try {
    cells = await loadCells(step);
    if (prevStep) prev = (await loadCells(prevStep)).filter(c => !c.name.startsWith("demo_"));
  } catch {
    panel.textContent = "코드를 불러오지 못했습니다. 레포 루트에서 python3 scripts/build_steps_js.py 를 실행해 data/steps.js를 다시 만들어 주십시오.";
    return;
  }
  const index = Object.fromEntries(cells.map((c, i) => [c.name, i]));
  const cellOf = s => index[s.dataset.cell];

  if (!prev) return growMode();
  return diffMode();

  // 01장: 파일이 처음부터 자란다. 지금 읽는 칸까지만 보이고, 이번 칸이 새 줄이다.
  function growMode() {
    for (const s of sections) {
      const cell = cells[cellOf(s)];
      if (!cell) continue;
      const pre = document.createElement("pre");
      pre.className = "inline-code";
      pre.innerHTML = `<span class="added-label">+ ${cell.lines.length}줄</span>\n` + cell.lines.map(highlight).join("\n");
      s.querySelector("h2").after(pre);
    }
    let current = -1;
    function show(i) {
      if (i === current) return;
      current = i;
      let lineNo = 0, html = "";
      cells.slice(0, i + 1).forEach((c, ci) => {
        if (ci > 0) { html += `<span class="ln gap"> </span>`; lineNo++; }
        for (const l of c.lines) html += `<span class="ln${ci === i ? " act add" : ""}" data-n="${++lineNo}">${highlight(l) || " "}</span>`;
      });
      panel.innerHTML = html;
      delta.textContent = `${lineNo}줄 · 이번 절 +${cells[i].lines.length}`;
      const first = panel.querySelector(".add");
      if (first) panel.scrollTo({ top: first.offsetTop - 40, behavior: smooth });
    }
    const sync = () => show(cellOf(currentSection(sections)));
    addEventListener("scroll", sync, { passive: true });
    sync();
  }

  // 02장부터: 이전 장 파일과의 diff. 바뀐 칸만 펼치고, 그대로인 칸은 접는다.
  function diffMode() {
    const cur = cells.flatMap((c, ci) => c.lines.map(text => ({ text, cell: ci })));
    const ops = diffLines(prev.flatMap(c => c.lines), cur);
    const byCell = cells.map((_, ci) => ops.filter(o => o.cell === ci));
    const changed = byCell.map(list => list.some(o => o.op !== "same"));
    const adds = ops.filter(o => o.op === "add").length, dels = ops.filter(o => o.op === "del").length;
    const open = new Set();
    const prevNo = Number(prevStep.slice(0, 2));

    const lineHtml = (o, ci, active) => {
      const cls = `ln ${o.op === "same" ? "" : o.op}${ci === active ? " act" : ""}`;
      const n = o.op === "del" ? "" : o.n;
      return `<span class="${cls}" data-n="${n}">${highlight(o.text) || " "}</span>`;
    };

    // 좁은 화면: 절마다 그 칸의 바뀐 줄(+앞뒤 한 줄)만
    for (const s of sections) {
      const ci = cellOf(s);
      if (ci == null) continue;
      const list = byCell[ci];
      const keep = list.map((o, k) => o.op !== "same" || list[k - 1]?.op === "add" || list[k + 1]?.op === "add" || list[k + 1]?.op === "del" || list[k - 1]?.op === "del");
      if (!keep.some(Boolean)) continue;
      let html = "", gap = false;
      list.forEach((o, k) => {
        if (!keep[k]) { if (!gap) html += `<span class="ln fold">⋯</span>`; gap = true; return; }
        gap = false;
        html += lineHtml(o, ci, ci);
      });
      const pre = document.createElement("pre");
      pre.className = "inline-code diff";
      pre.innerHTML = html;
      s.querySelector("h2").after(pre);
    }

    let current = -1;
    function show(active, force) {
      if (active === current && !force) return;
      current = active;
      let html = "";
      cells.forEach((c, ci) => {
        if (ci > 0) html += `<span class="ln gap"> </span>`;
        if (!changed[ci] && ci !== active && !open.has(ci)) {
          html += `<span class="ln fold" data-open="${ci}">⋯ ${c.name} · ${String(prevNo).padStart(2, "0")}장과 같음 (${c.lines.length}줄)</span>`;
          return;
        }
        for (const o of byCell[ci]) html += lineHtml(o, ci, active);
      });
      panel.innerHTML = html;
      delta.textContent = `${String(prevNo).padStart(2, "0")}장 대비 +${adds} −${dels}`;
      const target = panel.querySelector(".act.add, .act.del") || panel.querySelector(".act");
      if (target) panel.scrollTo({ top: target.offsetTop - 60, behavior: smooth });
    }
    panel.addEventListener("click", e => {
      const f = e.target.closest("[data-open]");
      if (f) { open.add(Number(f.dataset.open)); show(current, true); }
    });
    const sync = () => show(cellOf(currentSection(sections)) ?? current);
    addEventListener("scroll", sync, { passive: true });
    sync();
  }
}

// ── 파이썬 하이라이트 ───────────────────────────────────────────
const TOKEN = /#[^\n]*|f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*'|\b(?:def|import|from|return|for|in|if|else|as|with|not|and|or|None|True|False|lambda)\b|\b\d+(?:\.\d+)?(?:e-?\d+)?\b/g;

function highlight(line) {
  let out = "", at = 0;
  for (const m of line.matchAll(TOKEN)) {
    const t = m[0];
    const kind = t[0] === "#" ? "c" : /^f?["']/.test(t) ? "s" : /^\d/.test(t) ? "n" : "k";
    out += esc(line.slice(at, m.index)) + `<span class="t-${kind}">${esc(t)}</span>`;
    at = m.index + t.length;
  }
  return out + esc(line.slice(at));
}

// ── 자라는 코드 ────────────────────────────────────────────────
// steps/*.py 를 `# %% 이름` 단위로 나눠, 글의 절(section[data-cell])과 짝짓는다.
function splitCells(source) {
  const cells = [];
  for (const line of source.replace(/\n+$/, "").split("\n")) {
    const m = line.match(/^# %% (\S+)/);
    if (m) cells.push({ name: m[1], lines: [] });
    else if (cells.length) cells[cells.length - 1].lines.push(line);
  }
  for (const c of cells) while (c.lines.length && !c.lines.at(-1).trim()) c.lines.pop();
  return cells;
}


function setupPeeks(D) {
  document.querySelector("#peek-content").textContent = `${D.request}\n\n${D.meeting.trim()}`;

  const special = /(&lt;\|im_start\|&gt;(?:user|assistant)?|&lt;\|im_end\|&gt;|&lt;\/?think&gt;)/g;
  document.querySelector("#peek-template").innerHTML = esc(D.template).replace(special, '<span class="sp">$1</span>');

  const box = document.querySelector("#peek-tokens");
  const button = document.querySelector("#tok-mode");
  const show = p => p.replaceAll(" ", "␣");
  let asIds = false;
  function render() {
    box.innerHTML = D.pieces.map((p, i) => {
      const sp = /^<\|.*\|>$|^<\/?think>$/.test(p);
      const nl = p.includes("\n");
      const part = D.parts[i];
      if (part && !asIds) {
        const [whole, k, n] = part;
        return `<span class="t part" title="#${i} · id ${D.ids[i]} · '${esc(whole)}'의 바이트 조각 ${k}/${n}">${esc(whole)}<sub>${k}/${n}</sub></span>`;
      }
      const label = asIds ? D.ids[i] : esc(show(p).replaceAll("\n", "↵"));
      return `<span class="t c${i % 4}${sp ? " sp" : ""}" title="#${i} · id ${D.ids[i]}">${label}</span>${nl && !asIds ? "<br>" : ""}`;
    }).join("");
    button.textContent = asIds ? "글자로 보기" : "번호로 보기";
  }
  button.addEventListener("click", () => { asIds = !asIds; render(); });
  render();
}

// ── lm head 그림 ───────────────────────────────────────────────
function paintStrip(canvas, vec) {
  const n = vec.length;
  canvas.width = n; canvas.height = 1;
  const abs = vec.map(Math.abs).sort((a, b) => a - b);
  const scale = abs[Math.floor(n * 0.98)] || 1; // 튀는 값 몇 개에 색이 묻히지 않게
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(n, 1);
  const pos = [234, 108, 32], neg = [37, 99, 235];
  const mid = getComputedStyle(document.body).getPropertyValue("--strip-mid").trim().split(/\s+/).map(Number);
  vec.forEach((v, i) => {
    const t = Math.min(1, Math.abs(v) / scale);
    const c = v >= 0 ? pos : neg;
    for (let k = 0; k < 3; k++) img.data[i * 4 + k] = Math.round(mid[k] + (c[k] - mid[k]) * t);
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);
}

function setupLmHead(D) {
  const list = document.querySelector("#lh-rows");
  const fmt = n => n.toLocaleString("en-US");
  const label = t => esc(JSON.stringify(t).slice(1, -1).replaceAll(" ", "␣"));
  const top = D.rows.filter(r => r.rank <= 5);
  const rest = D.rows.filter(r => r.rank > 5);
  const rowHtml = r => `<button type="button" class="lh-row${r.rank === 1 ? " win" : ""}" role="option" data-id="${r.id}">
      <span class="lh-label"><b>'${label(r.text)}'</b><small>id ${r.id}</small></span>
      <canvas></canvas><span class="lh-score">${r.logit.toFixed(2)}</span><span class="lh-rank">${fmt(r.rank)}등</span></button>`;
  list.innerHTML = top.map(rowHtml).join("")
    + `<div class="lh-gap">⋮ <span>나머지 ${fmt(D.vocab - D.rows.length)}개 행</span></div>`
    + rest.map(rowHtml).join("");

  // 1,024칸을 h 값이 큰 순서로 다시 줄 세운다. 모든 띠에 같은 순서를 쓰므로 내적은 그대로다.
  const perm = D.h.map((v, i) => i).sort((a, b) => D.h[b] - D.h[a]);
  const P = vec => perm.map(i => vec[i]);
  paintStrip(document.querySelector('#lmhead canvas[data-vec="h"]'), P(D.h));
  const buttons = [...list.querySelectorAll("button")];
  buttons.forEach(b => paintStrip(b.querySelector("canvas"), P(D.rows.find(r => r.id == b.dataset.id).vec)));

  function select(id) {
    const r = D.rows.find(r => r.id == id);
    buttons.forEach(b => b.setAttribute("aria-selected", b.dataset.id == id));
    document.querySelector("#lh-pick-name").textContent = `'${r.text.replaceAll(" ", "␣")}'`;
    paintStrip(document.querySelector("#lh-prod"), P(D.h.map((v, i) => v * r.vec[i])));
    document.querySelector("#lh-prod-sum").textContent = r.logit.toFixed(2);
    drawCum(id);
  }

  // 누적합: 곱한 값을 왼쪽부터 더해 가면 끝에서 점수가 된다. 모든 행을 겹쳐 그려 경주처럼 보이게.
  const cums = Object.fromEntries(D.rows.map(r => {
    let s = 0;
    return [r.id, perm.map(i => (s += D.h[i] * r.vec[i]))];
  }));
  const all = Object.values(cums).flat();
  const lo = Math.min(0, ...all), hi = Math.max(...all);
  const cumCanvas = document.querySelector("#lh-cum");
  function drawCum(sel) {
    const dpr = devicePixelRatio || 1;
    const w = cumCanvas.clientWidth, h = cumCanvas.clientHeight;
    cumCanvas.width = w * dpr; cumCanvas.height = h * dpr;
    const ctx = cumCanvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const css = getComputedStyle(document.body);
    const X = i => (i / 1023) * w, Y = v => h - 4 - ((v - lo) / (hi - lo)) * (h - 8);
    ctx.strokeStyle = css.getPropertyValue("--line"); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(w, Y(0)); ctx.stroke();
    const order = [...D.rows.filter(r => r.id != sel), D.rows.find(r => r.id == sel)];
    for (const r of order) {
      const on = r.id == sel;
      ctx.strokeStyle = on ? css.getPropertyValue("--accent") : css.getPropertyValue("--faint");
      ctx.globalAlpha = on ? 1 : 0.35; ctx.lineWidth = on ? 2 : 1;
      ctx.beginPath();
      cums[r.id].forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  addEventListener("resize", () => drawCum(document.querySelector('#lh-rows [aria-selected="true"]')?.dataset.id));
  buttons.forEach(b => b.addEventListener("click", () => select(b.dataset.id)));
  select(D.rows[0].id);
}


// ── 작은 차트 ─────────────────────────────────────────────────
// <figure class="chart" data-series='[{"name":..,"y":[..],"cls":..}]' data-ylabel="ms" data-xlabel="스텝">
function setupCharts() {
  document.querySelectorAll("figure.chart[data-series]").forEach(fig => {
    const series = JSON.parse(fig.dataset.series);
    const W = 600, H = 200, L = 44, B = 26, T = 10, R = 10;
    const n = Math.max(...series.map(s => s.y.length));
    const ymax = Number(fig.dataset.ymax) || Math.max(...series.flatMap(s => s.y)) * 1.1;
    const X = i => L + (i / Math.max(1, n - 1)) * (W - L - R);
    const Y = v => T + (1 - v / ymax) * (H - T - B);
    const ticks = 4;
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(fig.dataset.label || "")}">`;
    for (let k = 0; k <= ticks; k++) {
      const v = (ymax / ticks) * k;
      svg += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/>`
        + `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`;
    }
    svg += `<text x="${L}" y="${H - 6}">${esc(fig.dataset.xstart || "1")}</text><text x="${W - R}" y="${H - 6}" text-anchor="end">${esc(fig.dataset.xend || String(n))}</text>`;
    svg += `<text class="lbl" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${esc(fig.dataset.xlabel || "")}</text>`;
    svg += `<text class="lbl" x="4" y="${T + 2}">${esc(fig.dataset.ylabel || "")}</text>`;
    for (const s of series) {
      const color = s.cls === "them" ? "var(--them)" : "var(--accent)";
      const pts = s.y.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
      svg += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 4"' : ""}/>`;
      const last = s.y.length - 1;
      svg += `<text class="lbl" x="${X(last) - 4}" y="${Y(s.y[last]) - 8}" text-anchor="end" style="fill:${color}">${esc(s.name)}</text>`;
    }
    fig.insertAdjacentHTML("afterbegin", svg + "</svg>");
  });
}

// ── 위치 × 스텝 격자: 스텝마다 어떤 위치를 계산하나 ──────────────
// <div class="cg" data-mode="nocache|cache" data-pos="8" data-steps="6">
function setupGrids() {
  document.querySelectorAll(".cg[data-mode]").forEach(g => {
    const P = Number(g.dataset.pos), S = Number(g.dataset.steps), cols = P + S - 1;
    g.style.setProperty("--cols", cols);
    let html = "";
    for (let s = 0; s < S; s++) {
      const len = P + s;
      for (let c = 0; c < cols; c++) {
        let cls = "";
        if (c < len) {
          if (s === 0) cls = "nw";
          else if (c === len - 1) cls = "nw";
          else cls = g.dataset.mode === "cache" ? "kv" : "re";
        } else cls = "empty";
        html += `<i class="${cls}"></i>`;
      }
    }
    g.innerHTML = html;
  });
}

setupNav();
setupGrids();
setupCharts();
setupTerminals();
setupScores();
setupCode();
if (window.CH01) { setupPeeks(window.CH01); setupLmHead(window.CH01); }

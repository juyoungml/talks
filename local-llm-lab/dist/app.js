const ids = lessons.map((_, i) => `cp${String(i + 1).padStart(2, "0")}`);
const files = Object.keys(labData.sources);
const main = document.querySelector("main");
const nav = document.querySelector("nav");
const announce = document.querySelector("#announce");
const setup = document.querySelector("#setup");
const viewer = document.querySelector("#viewer");
const codeScroll = document.querySelector("#code-scroll");
const fileTabs = document.querySelector("#file-tabs");
const storageKey = "local-llm-lab-progress-v1";
let selection = null;
let lastJump = null;

let completed = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  completed = new Set(stored.filter(id => ids.includes(id)));
} catch {}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function copy(text, button, label) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사됨";
    announce.textContent = "클립보드에 복사했습니다.";
    setTimeout(() => { button.textContent = label; }, 1200);
  } catch {
    announce.textContent = "복사할 수 없습니다. 텍스트를 직접 선택해 주세요.";
  }
}

function updateNav(index) {
  const groups = [
    ["토큰 생성", 0, 3],
    ["재사용과 메모리", 3, 6],
    ["추가 최적화와 비교", 6, 9],
  ];
  nav.innerHTML = groups.map(([group, start, end]) => `
    <div class="nav-group"><p>${group}</p>
    ${lessons.slice(start, end).map((lesson, i) => {
      const n = start + i;
      return `<a href="#${ids[n]}" ${index === n ? 'aria-current="page"' : ""}>
        <span class="chapter-num">${String(n + 1).padStart(2,"0")}</span><span>${lesson.short}</span>
        ${completed.has(ids[n]) ? '<span class="done" aria-label="읽음">✓</span>' : ""}
      </a>`;
    }).join("")}</div>`).join("");
  document.querySelector("#count").textContent = `${completed.size}/9 읽음`;
}

function colorLine(line) {
  const tokens = /#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:class|def|import|from|return|for|in|if|elif|else|with|as|raise|None|True|False|not|is|and|or|try|except|break)\b|\b\d+(?:\.\d+)?\b/g;
  let out = "";
  let cursor = 0;
  for (const match of line.matchAll(tokens)) {
    const token = match[0];
    const kind = token.startsWith("#") ? "comment" : /^['"]/.test(token) ? "string" : /^\d/.test(token) ? "number" : "keyword";
    out += escapeHtml(line.slice(cursor, match.index)) + `<span class="tok-${kind}">${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }
  return out + escapeHtml(line.slice(cursor));
}

function showFile(file, start = 0, end = start, fromArticle = false) {
  if (!files.includes(file)) return;
  selection = file;
  const openOnNarrowScreen = fromArticle && matchMedia("(max-width: 820px)").matches;
  if (openOnNarrowScreen) viewer.classList.add("viewer-open");
  const lines = labData.sources[file].trimEnd().split("\n");
  document.querySelector("#file-name").textContent = file;
  document.querySelector("#file-selection").textContent = start ? `줄 ${start}${end > start ? `–${end}` : ""} / ${lines.length}` : `${lines.length}줄`;
  fileTabs.innerHTML = files.map(name => `<button type="button" data-tab="${name}" aria-pressed="${name === file}">${name}</button>`).join("");
  document.querySelector("#file-code").innerHTML = lines.map((line, i) => {
    const n = i + 1;
    return `<span class="source-line${start && n >= start && n <= end ? " active-line" : ""}" data-line="${n}"><span class="line-no" aria-hidden="true">${n}</span><code>${file.endsWith(".py") ? colorLine(line) : escapeHtml(line)}</code></span>`;
  }).join("");
  const line = document.querySelector(`[data-line="${start}"]`);
  codeScroll.scrollTop = line ? Math.max(0, line.offsetTop - 40) : 0;
  codeScroll.scrollLeft = 0;
  if (openOnNarrowScreen) codeScroll.focus({preventScroll:true});
}

fileTabs.addEventListener("click", event => {
  const button = event.target.closest("[data-tab]");
  if (!button) return;
  const file = button.dataset.tab;
  showFile(file);
  fileTabs.querySelector(`[data-tab="${file}"]`).focus();
});
document.querySelector("#copy-file").addEventListener("click", event =>
  copy(labData.sources[selection], event.currentTarget, "파일 복사"));

function drawTrace() {
  const size = Number(document.querySelector("#prompt-size").value);
  const cached = document.querySelector("#cache-toggle").checked;
  document.querySelector("#prompt-value").textContent = size;
  const rows = [
    ["Prefill", size, size],
    ["첫 decode", cached ? 1 : size + 1, size + 1],
    ["두 번째 decode", cached ? 1 : size + 2, size + 2],
  ];
  document.querySelector("#trace").innerHTML = rows.map(([label, input, kv]) =>
    `<tr><th scope="row">${label}</th><td>${input}</td><td>${kv}</td></tr>`).join("");
}

function render(focus = false) {
  const index = Math.max(0, ids.indexOf(location.hash.slice(1)));
  const lesson = lessons[index];
  const id = ids[index];
  const command = `uv run python lab.py ${id} --offline --device mps ${lesson.args}`;
  updateNav(index);
  main.innerHTML = `
    <article>
      <header class="article-head">
        <div class="eyebrow">CHECKPOINT ${id.slice(2)} <span>·</span> ${lesson.time}</div>
        <h1>${lesson.title}</h1><p class="lead">${lesson.lead}</p>
        <button class="mobile-viewer jump" data-file="${lesson.focus[0]}" data-start="${lesson.focus[1]}" data-end="${lesson.focus[2]}">레포 코드 열기</button>
      </header>
      <div class="prose">
        ${lesson.before}
        ${index === 3 ? `<section class="trace-box"><h3>토큰 수로 두 경로 비교하기</h3>
          <p>프롬프트 길이와 KV cache 사용 여부를 바꾸면 forward 입력과 attention의 K/V 길이가 어떻게 달라지는지 볼 수 있다.</p>
          <div class="lab-controls"><label>입력 <input id="prompt-size" type="range" min="4" max="64" value="24"> <output id="prompt-value" for="prompt-size"></output>토큰</label>
          <label><input id="cache-toggle" type="checkbox" checked> KV cache 사용</label></div>
          <table><thead><tr><th>단계</th><th>forward 입력</th><th>참조한 K/V</th></tr></thead><tbody id="trace"></tbody></table></section>` : ""}
        <h2>실행하고 로그 읽기</h2>
        <div class="terminal"><div class="terminal-head"><span>터미널 · 레포 디렉터리</span><button id="copy-command">명령 복사</button></div>
        <pre class="command"><code>$ ${escapeHtml(command)}</code></pre>
        <div class="capture">실제 출력 · Apple M3 Pro · PyTorch 2.15.0 · MPS / FP16</div>
        <pre class="output"><code>${escapeHtml(labData.outputs[id] || "이 실행의 기록이 없습니다.")}</code></pre></div>
        <p class="fine-print">시간은 이 Mac에서 기록한 값이다. 같은 명령을 다시 실행하면 달라질 수 있다.</p>
        ${lesson.after}
      </div>
    </article>
    <footer><div>${index > 0 ? `<a href="#${ids[index - 1]}">이전 · ${lessons[index - 1].short}</a>` : ""}</div>
      <button id="complete" aria-pressed="${completed.has(id)}">${completed.has(id) ? "읽음 표시 해제" : "읽음 표시"}</button>
      <div>${index < ids.length - 1 ? `<a href="#${ids[index + 1]}">다음 · ${lessons[index + 1].short}</a>` : ""}</div></footer>`;
  document.title = `${lesson.title} · PyTorch로 Ollama 만들기`;
  lastJump = null;
  viewer.classList.remove("viewer-open");
  showFile(...lesson.focus);
  document.querySelector("#copy-command").addEventListener("click", event => copy(command, event.currentTarget, "명령 복사"));
  document.querySelector("#complete").addEventListener("click", event => {
    const button = event.currentTarget;
    if (completed.has(id)) completed.delete(id);
    else completed.add(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch {}
    button.textContent = completed.has(id) ? "읽음 표시 해제" : "읽음 표시";
    button.setAttribute("aria-pressed", completed.has(id));
    updateNav(index);
  });
  if (index === 3) {
    document.querySelector("#prompt-size").addEventListener("input", drawTrace);
    document.querySelector("#cache-toggle").addEventListener("change", drawTrace);
    drawTrace();
  }
  if (focus) {
    main.focus({preventScroll:true});
    window.scrollTo(0, 0);
  }
}

main.addEventListener("click", event => {
  const link = event.target.closest("[data-file]");
  if (!link) return;
  lastJump = link;
  const start = Number(link.dataset.start);
  showFile(link.dataset.file, start, Number(link.dataset.end ?? start), true);
});
function closeViewer() {
  viewer.classList.remove("viewer-open");
  (lastJump || main).focus({preventScroll:true});
}
document.querySelector("#return-to-article").addEventListener("click", closeViewer);
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && viewer.classList.contains("viewer-open")) closeViewer();
});
document.querySelector("#open-setup").addEventListener("click", () => setup.showModal());
document.querySelector("#close-setup").addEventListener("click", () => setup.close());
window.addEventListener("hashchange", () => render(true));
render();

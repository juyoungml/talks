const exercises = [
  "명령에 --prompt long을 추가합니다. 다음 토큰의 값보다 input과 logits에서 함께 바뀐 축을 찾아보세요.",
  "같은 명령을 --steps 4와 --steps 48로 실행합니다. 화면에 보이는 텍스트와 forward 길이를 비교해 보세요.",
  "lab.py의 prompt_ids()에서 range(1, 25)의 25를 13으로 바꿔 봅니다. 긴 입력의 토큰 수와 첫 토큰 시간은 어떻게 달라지나요?",
  "같은 명령에서 --prompt long을 --prompt short로 바꿉니다. 캐시의 길이, forward 길이, 속도 차이가 각각 어떻게 바뀌나요?",
  "짧은 입력과 긴 입력으로 각각 실행합니다. 어떤 조건에서 SDPA의 prefill 차이가 더 큰지 기록하세요.",
  "lab.py의 benchmark()에서 Request에 넘기는 capacity를 64칸 늘립니다. 예약량과 사용량 중 무엇이 바뀌나요?",
  "현재 컴파일 경로가 통과한다면 --steps를 늘려 봅니다. 첫 호출과 워밍업 이후 시간에 어떤 차이가 생기나요?",
  "quantize_linears()에서 child를 교체하는 조건에 name == 'down_proj'를 추가해 보세요. 바꾸는 가중치를 줄이면 저장 크기와 오차가 어떻게 달라지나요?",
  "같은 비교를 --prompt short로 반복하고, 긴 입력에서 보인 차이가 짧은 입력에서도 같은지 확인하세요."
];

const ids = lessons.map((_, i) => `cp${String(i + 1).padStart(2, "0")}`);
const main = document.querySelector("main");
const nav = document.querySelector("nav");
const announce = document.querySelector("#announce");
const setup = document.querySelector("#setup");
const storageKey = "local-llm-lab-progress-v1";

let completed = new Set();
try {
  completed = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]").filter(id => ids.includes(id)));
} catch {}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function updateNav(index) {
  nav.innerHTML = lessons.map((lesson, i) => `
    <a href="#${ids[i]}" ${index === i ? 'aria-current="page"' : ""}>
      <span>${ids[i].toUpperCase()}</span><span>${lesson.short}</span>
      ${completed.has(ids[i]) ? '<span aria-label="완료">✓</span>' : ""}
    </a>`).join("");
  document.querySelector("#count").textContent = `${completed.size} / ${ids.length}`;
  document.querySelector("#progress").value = completed.size;
  document.querySelector("#progress").setAttribute("aria-label", "완료한 레슨");
}

function drawTrace() {
  const input = document.querySelector("#prompt-size");
  const cached = document.querySelector("#cache-toggle").checked;
  const size = Number(input.value);
  document.querySelector("#prompt-value").textContent = size;
  const rows = [
    ["Prefill · forward", size],
    ["Decode 1 · forward", cached ? 1 : size + 1],
    ["Decode 2 · forward", cached ? 1 : size + 2],
    ["Decode 2 · K/V", size + 2],
  ];
  document.querySelector("#trace").innerHTML = rows.map(([label, value]) => `
    <div class="trace-row"><span>${label}</span><span class="track" aria-hidden="true">
      <span class="fill" style="width:${value / 66 * 100}%"></span></span><code>${value}</code></div>`).join("");
}

function render(focus = false) {
  const index = Math.max(0, ids.indexOf(location.hash.slice(1)));
  const lesson = lessons[index];
  const id = ids[index];
  updateNav(index);
  main.innerHTML = `
    <div class="hero">
      <div class="kicker mono">${id.toUpperCase()} / ${ids.length.toString().padStart(2, "0")}</div>
      <h1>${lesson.title}</h1><p>${lesson.intro}</p>
      <div class="flow" aria-label="이 레슨의 처리 순서">${lesson.flow.map(part => `<span>${part}</span>`).join("")}</div>
    </div>
    <section><h2>코드 따라가기</h2><p class="hint mono">${lesson.files}</p>
      <ol>${lesson.recipe.map(step => `<li>${step}</li>`).join("")}</ol>
      <pre><code>${escapeHtml(lesson.code)}</code></pre>
    </section>
    <section><div class="bar"><h2>터미널에서 실행</h2><button id="copy">명령 복사</button></div>
      <pre><code>${escapeHtml(lesson.cmd)}</code></pre>
      <p class="hint">예상 출력 형식</p><pre class="expected"><code>${escapeHtml(lesson.output)}</code></pre>
      <p>${lesson.observation}</p>
    </section>
    ${index === 2 || index === 3 ? `<section>
      <h2>입력 길이 실험</h2><p class="hint">토큰 개수를 보여주는 개념 실험입니다. 모델 또는 GPU를 실행하지 않습니다.</p>
      <div class="lab-controls"><label>프롬프트 <input id="prompt-size" type="range" min="4" max="64" value="24" step="1"> <output id="prompt-value" for="prompt-size"></output> 토큰</label>
      <label><input id="cache-toggle" type="checkbox" ${index === 3 ? "checked" : ""}> KV cache 사용</label></div>
      <div id="trace" class="trace" aria-live="polite"></div></section>` : ""}
    <section><h2>한 가지 바꿔보기</h2><p>${exercises[index]}</p></section>
    <section><h2>실행 뒤 스스로 확인</h2><p>${lesson.question}</p>
      <details><summary>답 보기</summary><p>${lesson.answer}</p></details>
    </section>
    <footer><div>${index > 0 ? `<a href="#${ids[index - 1]}">이전 레슨</a>` : ""}</div>
      <button id="complete" class="primary" aria-pressed="${completed.has(id)}">${completed.has(id) ? "완료 표시 해제" : "이 레슨 완료"}</button>
      <div>${index < ids.length - 1 ? `<a href="#${ids[index + 1]}">다음 레슨</a>` : ""}</div>
    </footer>`;
  document.title = `${lesson.title} · 로컬 LLM 추론 실험실`;
  document.querySelector("#copy").addEventListener("click", async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(lesson.cmd);
      button.textContent = "복사됨";
      announce.textContent = "명령을 복사했습니다.";
    } catch {
      announce.textContent = "복사할 수 없습니다. 명령을 직접 선택해 주세요.";
      button.textContent = "직접 복사해 주세요";
    }
  });
  document.querySelector("#complete").addEventListener("click", event => {
    const button = event.currentTarget;
    if (completed.has(id)) completed.delete(id);
    else completed.add(id);
    try { localStorage.setItem(storageKey, JSON.stringify([...completed])); } catch {}
    button.textContent = completed.has(id) ? "완료 표시 해제" : "이 레슨 완료";
    button.setAttribute("aria-pressed", completed.has(id));
    updateNav(index);
  });
  if (document.querySelector("#trace")) {
    document.querySelector("#prompt-size").addEventListener("input", drawTrace);
    document.querySelector("#cache-toggle").addEventListener("change", drawTrace);
    drawTrace();
  }
  if (focus) {
    main.focus({preventScroll:true});
    window.scrollTo(0, 0);
  }
}

document.querySelector("#open-setup").addEventListener("click", () => setup.showModal());
document.querySelector("#close-setup").addEventListener("click", () => setup.close());
window.addEventListener("hashchange", () => render(true));
render();

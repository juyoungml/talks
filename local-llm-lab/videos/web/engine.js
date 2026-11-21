// 공통 seek 엔진 — 모든 화면은 seek(t)의 순수 함수다 (PADO 소개 영상과 같은 방식).
// 템플릿은 TL, META를 먼저 정의하고, 장면별 효과는 FX.push(t => ...)로 등록한다.
(function () {
  const segN = META.segs || 0;
  const segHTML = '<i></i>'.repeat(segN);
  document.body.insertAdjacentHTML('afterbegin', `
<div class="chrome-top">
  <div class="brand"><span class="logo"></span>${META.brand}<small>${META.brand_sub ? META.brand_sub + ' · ' : ''}${META.title}</small></div>
  <div class="chap" id="chap"><span id="chapLabel"></span><span class="segs">${segHTML}</span></div>
</div>
<div id="chapcard"><div class="cc"><div class="cc-num" id="ccNum"></div><h2 id="ccTitle"></h2><p id="ccSub"></p><div class="cc-segs" id="ccSegs">${segHTML}</div></div></div>
<div class="sub" id="sub"></div>
<div class="disc">${META.disc}</div>
<div class="bar" id="bar"></div>`);
})();

// 공통 장면: script.json에서 "type": "recap" | "next" | "end" 인 장면은 템플릿에 따로 쓰지 않아도 여기서 만든다.
(function () {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const at = (id, line, add = 0) => `--at:calc(var(--${id}${line ? 'l' + line : ''}) + ${add}s)`;
  for (const s of TL.scenes) {
    if (!s.type || document.getElementById(s.id)) continue;
    const d = s.data || {}, id = s.id;
    let h = '';
    if (s.type === 'recap') {
      h = `<div class="cm-recap">
        <span class="kicker up" style="${at(id, 0, -.1)}">${esc(d.label || '')}</span>
        <h2 class="up" style="${at(id, 0, .1)}">${esc(d.title || '')}</h2>
        <ol>${(d.items || []).map((it, i) => `<li class="up" style="${at(id, it.line || i + 1, .15)}">
          <i>${i + 1}</i><span>${esc(it.text)}</span>${it.num ? `<b>${esc(it.num)}</b>` : ''}</li>`).join('')}</ol></div>`;
    } else if (s.type === 'next') {
      h = `<div class="cm-next">
        <span class="kicker up" style="${at(id, 0, -.1)}">${esc(d.label || '')}</span>
        <h2 class="up" style="${at(id, 0, .15)}">${esc(d.title || '')}</h2>
        <p class="up" style="${at(id, 1, .2)}">${esc(d.desc || '')}</p>
        ${d.cmd ? `<div class="cm-cmd fade" style="${at(id, d.cmdLine || 1, 1.2)}"><small>${esc(d.cmdLabel || '이번 강 코드')}</small><code>${esc(d.cmd)}</code></div>` : ''}</div>`;
    } else if (s.type === 'end') {
      h = `<div class="cm-next cm-end">
        <span class="kicker up" style="${at(id, 0, -.1)}">${esc(d.label || '')}</span>
        <h2 class="up" style="${at(id, 0, .15)}">${esc(d.title || '')}</h2>
        ${d.sub ? `<p class="up" style="${at(id, 1, .2)}">${esc(d.sub)}</p>` : ''}
        <div class="cm-rows">${(d.rows || []).map((r, i) => `<div class="up" style="${at(id, d.rowsLine || 1, .8 + i * .3)}"><b>${esc(r[0])}</b><span>${esc(r[1] || '')}</span></div>`).join('')}</div></div>`;
    }
    document.body.insertAdjacentHTML('beforeend', `<section class="scene" id="${id}"><div class="stage">${h}</div></section>`);
  }
})();

const CSSV = getComputedStyle(document.documentElement);
const V = n => parseFloat(CSSV.getPropertyValue('--' + n));
const clamp01 = x => Math.max(0, Math.min(1, x));
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeIO = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const prog = (t, a, d) => clamp01((t - a) / d);
const lerp = (a, b, p) => a + (b - a) * p;
const FX = [];

window.addEventListener('DOMContentLoaded', () => {
  const scenes = TL.scenes.map(s => ({...s, el: document.getElementById(s.id)}));
  const segs = [...document.querySelectorAll('.chap .segs i')];
  const subEl = document.getElementById('sub'), barEl = document.getElementById('bar'),
        chapLabel = document.getElementById('chapLabel'), chapEl = document.getElementById('chap');
  const ccEl = document.getElementById('chapcard'), ccNum = document.getElementById('ccNum'), ccTitle = document.getElementById('ccTitle'),
        ccSub = document.getElementById('ccSub'), ccSegs = [...document.querySelectorAll('#ccSegs i')];
  const FADE = 0.45;
  function applyCard(t) {
    const s = scenes.find(s => s.card && t >= s.card[0] && t < s.card[1]);
    if (!s) { ccEl.style.opacity = 0; return; }
    const [a, b, c] = s.card, k = t - a;
    ccEl.style.opacity = Math.min(clamp01(k / .3), clamp01((b - t) / .35));
    ccNum.textContent = c.num; ccTitle.textContent = c.title; ccSub.textContent = c.sub;
    const p1 = easeOut(clamp01((k - .1) / .5)), p2 = easeOut(clamp01((k - .2) / .5)), p3 = easeOut(clamp01((k - .35) / .5));
    ccNum.style.setProperty('--lw', (60 * p1) + 'px'); ccNum.style.opacity = p1;
    ccTitle.style.cssText = `opacity:${p2};transform:translateY(${(1 - p2) * 30}px)`;
    ccSub.style.cssText = `opacity:${p3};transform:translateY(${(1 - p3) * 20}px)`;
    ccSegs.forEach((g, i) => g.classList.toggle('on', i < s.chapterIndex - (k < .6 ? 1 : 0)));
  }
  window.seek = function (t) {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t * 1000; }
    let cur = scenes[0];
    for (const s of scenes) {
      let o = 0;
      const vis = s.card ? s.card[1] - 0.35 : s.start;
      const last = s === scenes[scenes.length - 1];
      if (t >= vis && t < s.end) o = Math.min(1, (t - vis) / FADE);
      if (!last && t >= s.end - FADE && t < s.end) o = Math.min(o, (s.end - t) / FADE);
      if (last && t >= s.end) o = 1;
      s.el.style.opacity = o;
      s.el.style.visibility = o > 0 ? 'visible' : 'hidden';
      if (t >= s.start) cur = s;
    }
    chapLabel.textContent = cur.chapter;
    chapEl.style.visibility = cur.chapterIndex ? 'visible' : 'hidden';
    segs.forEach((g, i) => g.classList.toggle('on', i < cur.chapterIndex));
    // 같은 문장 안에서 쪼갠 자막끼리는 겹치지 않게: 다음 자막이 시작하면 바로 바뀐다
    let cue = null; for (const c of TL.cues) { if (t >= c.start && t < c.end + 0.25) cue = c; }
    subEl.textContent = cue ? cue.text : '';
    barEl.style.width = (Math.min(1, t / TL.total) * 100) + '%';
    for (const f of FX) f(t);
    applyCard(t);
  };
  window.seek(0);
});

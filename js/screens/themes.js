// Theme picker: one big card per category, plus "Mix it up", and how many questions a round has.
import { app, go, persist } from '../app.js';
import { ROUND_SIZES, ROUND_SIZE } from '../core/round.js';
import { esc, themeIcon } from '../ui.js';
import { sfx } from '../audio.js';

export function render(root) {
  const { themes, bank } = app.content;
  const s = app.save;
  const st = s.stats;
  const cards = themes.map((t) => {
    const total = t.id === 'mix' ? bank.length : bank.filter((q) => q.category === t.id).length;
    const th = t.id === 'mix' ? { answered: st.answered, correct: st.correct } : st.themes[t.id] || { answered: 0, correct: 0 };
    const acc = th.answered ? Math.round((100 * th.correct) / th.answered) + '% right' : 'New!';
    return `<button class="theme-card ${t.id === 'mix' ? 'wide' : ''}" data-t="${t.id}" style="--c:${t.color};--cd:${t.dark}">
      <span class="theme-ico">${themeIcon(t)}</span>
      <span class="theme-name">${esc(t.name)}</span>
      <span class="theme-blurb">${esc(t.blurb)}</span>
      <span class="theme-meta">${total} questions · ${acc}</span>
    </button>`;
  }).join('');
  const size = s.settings.roundSize || ROUND_SIZE;
  root.innerHTML = `<div class="row"><button class="icon-btn" data-back aria-label="Back">←</button><h1 class="title">Pick a theme</h1></div>
    <div class="row seg-row"><span class="small dim">Questions per round</span><div class="spacer"></div>
      <div class="seg">${ROUND_SIZES.map((n) => `<button data-n="${n}" class="${n === size ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="theme-grid">${cards}</div>`;
  root.querySelector('[data-back]').onclick = () => { sfx('tap'); go('home'); };
  root.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => {
    sfx('select');
    s.settings.roundSize = +b.dataset.n;
    persist();
    root.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  root.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { sfx('tap'); go('quiz', { theme: b.dataset.t }); }));
}

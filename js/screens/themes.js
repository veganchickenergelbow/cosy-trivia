// Theme picker: one big card per category, plus "Mix it up", and how many questions a round has.
import { app, go, persist, ownedCats } from '../app.js';
import { heartsFor } from '../core/bonds.js';
import { ROUND_SIZES, ROUND_SIZE } from '../core/round.js';
import { esc, themeIcon, catArt } from '../ui.js';
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
  const cats = ownedCats();
  if (!cats.some((c) => c.id === s.buddy)) s.buddy = cats[0]?.id || null;
  const buddies = cats.map((c) => `<button class="buddy-pick ${c.id === s.buddy ? 'on' : ''}" data-buddy="${c.id}" title="${esc(c.name)}">
    <span class="bp-pic">${catArt(c, 'idle')}</span><span class="bp-name">${esc(c.name)}</span>
    <span class="bp-hearts">${'♥'.repeat(heartsFor(s.bonds[c.id]))}</span></button>`).join('');
  const review = s.review.filter((id) => !s.retired.includes(id) && app.content.bank.some((q) => q.id === id)).length;
  root.innerHTML = `<div class="row"><button class="icon-btn" data-back aria-label="Back">←</button><h1 class="title">Pick a theme</h1></div>
    <div class="row seg-row"><span class="small dim">Questions per round</span><div class="spacer"></div>
      <div class="seg">${ROUND_SIZES.map((n) => `<button data-n="${n}" class="${n === size ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="buddy-row"><span class="small dim">Quiz buddy <i>(right answers together grow your friendship)</i></span>
      <div class="buddy-list">${buddies}</div></div>
    <button class="brush-up ${review ? '' : 'empty'}" data-review ${review ? '' : 'disabled'}>
      <span class="act-ico">🔁</span><span class="grow"><b>Brush up</b>
      <span class="small dim">${review ? `${review} question${review === 1 ? '' : 's'} you got wrong. Get them right to clear them!` : 'Nothing to brush up. Questions you get wrong will wait here.'}</span></span></button>
    <div class="theme-grid">${cards}</div>`;
  root.querySelector('[data-back]').onclick = () => { sfx('tap'); go('home'); };
  root.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => {
    sfx('select');
    s.settings.roundSize = +b.dataset.n;
    persist();
    root.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  root.querySelectorAll('[data-buddy]').forEach((b) => (b.onclick = () => {
    sfx('select');
    s.buddy = b.dataset.buddy;
    persist();
    root.querySelectorAll('[data-buddy]').forEach((x) => x.classList.toggle('on', x === b));
  }));
  root.querySelector('[data-review]').onclick = () => { sfx('tap'); go('quiz', { mode: 'review' }); };
  root.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { sfx('tap'); go('quiz', { theme: b.dataset.t }); }));
}

// The tracker: totals, streaks, per-theme accuracy and recent mistakes.
import { app, themeById } from '../app.js';
import { esc, icon, themeIcon } from '../ui.js';

export function render(root) {
  const st = app.save.stats;
  const wrong = st.answered - st.correct;
  const acc = st.answered ? Math.round((100 * st.correct) / st.answered) : 0;
  const tile = (v, label, c) => `<div class="tile" style="--c:${c}"><b>${v}</b><span>${label}</span></div>`;
  const themes = app.content.themes.filter((t) => t.id !== 'mix').map((t) => {
    const th = st.themes[t.id] || { answered: 0, correct: 0 };
    const pct = th.answered ? Math.round((100 * th.correct) / th.answered) : 0;
    return `<div class="theme-row">
      <span class="t-ico">${themeIcon(t)}</span>
      <div class="grow"><div class="row"><b>${esc(t.name)}</b><div class="spacer"></div><span class="small dim">${th.correct}/${th.answered} · ${th.answered ? pct + '%' : '–'}</span></div>
      <div class="bar" style="--c:${t.color}"><i style="width:${pct}%"></i></div></div></div>`;
  }).join('');
  const mistakes = st.mistakes.slice(0, 15).map((m) => `<div class="mistake">
      <p><span class="small dim">${themeById(m.cat) ? themeIcon(themeById(m.cat)) : ''}</span> ${esc(m.q)}</p>
      <p class="small"><span class="no">${icon('cross')} ${esc(m.yours)}</span> <span class="yes">${icon('check')} ${esc(m.right)}</span></p></div>`).join('');
  const owned = Object.keys(app.save.cats).length;
  root.innerHTML = `<h1 class="title">Your stats</h1>
    <div class="tiles four">
      ${tile(st.answered, 'Answered', 'var(--sky-d)')}
      ${tile(st.correct, 'Right', 'var(--mint-d)')}
      ${tile(wrong, 'Wrong', 'var(--red-d)')}
      ${tile(acc + '%', 'Accuracy', 'var(--lav-d)')}
    </div>
    <div class="tiles four">
      ${tile(st.rounds, 'Rounds', 'var(--ink)')}
      ${tile(st.perfect, 'Perfect', 'var(--yellow-d)')}
      ${tile(st.bestStreak, 'Best run', 'var(--pink-d)')}
      ${tile(`${st.dayStreak}<small>/${st.bestDayStreak}</small>`, 'Day streak', 'var(--pink-d)')}
    </div>
    <div class="card row"><span>${icon('fish')} Fish earned</span><div class="spacer"></div><b>${st.fishEarned}</b></div>
    <div class="card row"><span>${icon('paw')} Cats at home</span><div class="spacer"></div><b>${owned} / ${app.content.cats.length}</b></div>
    <h2>By theme</h2>
    <div class="card themes-card">${themes}</div>
    <h2>Recent mistakes</h2>
    ${mistakes ? `<div class="card">${mistakes}</div>` : '<p class="dim">No mistakes yet. Suspiciously clever!</p>'}`;
}

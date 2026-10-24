// End of a round: score, fish breakdown, day streak and home progress, then a level-up and any cats who just moved in.
import { app, go, catById, themeById } from '../app.js';
import { esc, icon, themeIcon, catArt, openSheet } from '../ui.js';
import { sfx } from '../audio.js';
import { announceNewCats } from './cats.js';
import { levelCard } from './home.js';

export function render(root, r) {
  const buddy = catById(r.buddy) || app.content.cats[0];
  const t = themeById(r.theme);
  const title = r.perfect ? 'Purrfect round!' : r.correct >= r.total * 0.7 ? 'Great round!' : r.correct >= r.total * 0.4 ? 'Nice work!' : 'Every question counts!';
  const total = r.fish + r.bonus + r.cosy;
  root.innerHTML = `
    <div class="results-hero">
      <div class="hero-cat cheer">${catArt(buddy, 'happy')}</div>
      <h1 class="title center">${title}</h1>
      <p class="center dim">${esc(buddy.name)} is very proud of you.</p>
    </div>
    <div class="tiles">
      <div class="tile" style="--c:var(--mint)"><b>${r.correct}/${r.total}</b><span>Correct</span></div>
      <div class="tile" style="--c:var(--yellow-d)"><b>+${total}</b><span>${icon('fish')} Fish</span></div>
      <div class="tile" style="--c:var(--pink-d)"><b>${r.dayStreak}</b><span>${icon('flame')} Day streak</span></div>
    </div>
    <div class="card breakdown">
      <div class="row"><span>Right answers</span><div class="spacer"></div><b>+${r.fish} ${icon('fish')}</b></div>
      <div class="row"><span>Round bonus</span><div class="spacer"></div><b>+${r.roundBonus} ${icon('fish')}</b></div>
      ${r.perfect ? `<div class="row"><span>Perfect round!</span><div class="spacer"></div><b>+${r.perfectBonus} ${icon('fish')}</b></div>` : ''}
      ${r.cosy ? `<div class="row"><span>Cosy cats (favourite in the room)</span><div class="spacer"></div><b>+${r.cosy} ${icon('fish')}</b></div>` : ''}
      ${r.bestStreak >= 3 ? `<div class="row dim"><span>Best run this round</span><div class="spacer"></div><b>${r.bestStreak} in a row</b></div>` : ''}
    </div>
    ${levelCard()}
    <div class="spacer"></div>
    <button class="btn big block" data-home>Continue</button>
    <button class="btn ghost block" data-again>${t ? themeIcon(t) + ' ' : ''}Play again</button>`;
  sfx('done');
  root.querySelector('[data-home]').onclick = () => { sfx('tap'); go('home'); };
  root.querySelector('[data-again]').onclick = () => { sfx('tap'); go('quiz', { theme: r.theme }); };
  setTimeout(() => {
    if (app.current !== 'results') return;
    if (r.levelUp != null) levelUp(r.levelUp, () => announceNewCats());
    else announceNewCats();
  }, 700);
}

/** "Your home grew!": the new level, and what it unlocks (furniture and window views). */
function levelUp(index, onDone) {
  const home = app.content.home, n = index + 1;
  const items = home.items.filter((it) => it.level === n).map((it) => it.name);
  const views = home.windows.filter((w) => w.level === n).map((w) => w.name + ' window view');
  const news = [...items, ...views];
  sfx('done');
  openSheet((sh, close) => {
    sh.innerHTML = `<div class="lv-big">${n}</div>
      <h2 class="center">Your home grew!</h2>
      <p class="center">Welcome to <b>${esc(home.levels[index].name)}</b>.</p>
      ${news.length ? `<div class="card"><span class="small dim">New in the shop</span>${news.map((x) => `<p>✨ ${esc(x)}</p>`).join('')}</div>` : ''}
      <button class="btn block">Lovely!</button>`;
    sh.querySelector('.btn').onclick = () => { sfx('tap'); close(); };
  }, { center: true, onClose: onDone });
}

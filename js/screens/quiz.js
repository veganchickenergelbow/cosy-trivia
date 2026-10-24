// A round: 10 questions, pick an answer, CHECK, see if you were right (with a fun fact), CONTINUE.
import { app, go, persist, themeById, ownedCats } from '../app.js';
import { pickRound, mixFor, ROUND_SIZE } from '../core/round.js';
import { recordAnswer, finishRound, retireQuestion } from '../core/progress.js';
import { esc, el, icon, themeIcon, catArt, confirmDialog } from '../ui.js';
import { sfx } from '../audio.js';

const PRAISE = ['Nice one!', 'Purrfect!', 'Clever cat!', 'You got it!', 'Meow-velous!', 'Spot on!', 'Pawsome!'];
const OOPS = ['Not quite', 'Close, but no fish', 'Oops!', 'So close!'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const LETTERS = 'ABCD';

export function render(root, params) {
  const save = app.save;
  const theme = themeById(params.theme) ? params.theme : 'mix';
  save.lastTheme = theme;
  const n = save.settings.roundSize || ROUND_SIZE;
  const hidden = new Set(save.retired);
  const bank = hidden.size ? app.content.bank.filter((q) => !hidden.has(q.id)) : app.content.bank;
  const qs = pickRound(bank, theme, save.seen, Math.random, n, mixFor(save.stats.recent, n));
  persist();   // the seen list moved on

  const buddy = pick(ownedCats());

  const run = { i: 0, streak: 0, correct: 0, fish: 0, bestStreak: 0, chosen: -1, checked: false };

  const removeFeedback = () => document.querySelectorAll('.feedback').forEach((f) => f.remove());

  const draw = () => {
    removeFeedback();
    const q = qs[run.i];
    const qt = themeById(q.category);
    root.innerHTML = `
      <div class="quiz-top row">
        <button class="icon-btn" data-quit aria-label="Leave round">✕</button>
        <div class="bar grow" style="--c:var(--mint)"><i style="width:${(100 * run.i) / qs.length}%"></i></div>
        <span class="streak ${run.streak >= 2 ? 'on' : ''}">${icon('flame')} ${run.streak}</span>
      </div>
      <div class="row quiz-meta">
        <span class="chip" style="--c:${qt.color}">${themeIcon(qt)} ${esc(qt.name)}</span>
        <span class="dots" title="Difficulty">${[1, 2, 3].map((d) => `<i class="${d <= (q.difficulty || 2) ? 'on' : ''}"></i>`).join('')}</span>
        <div class="spacer"></div><span class="small dim">${run.i + 1} / ${qs.length}</span>
      </div>
      <div class="ask">
        <div class="buddy">${catArt(buddy, 'idle')}</div>
        <div class="bubble">${esc(q.question)}</div>
      </div>
      <div class="opts">${q.answers.map((a, i) => `<button class="opt" data-i="${i}"><span class="key">${LETTERS[i]}</span><span>${esc(a)}</span></button>`).join('')}</div>
      <div class="quiz-foot"><button class="btn block big" data-check disabled>Check</button></div>`;
    run.chosen = -1; run.checked = false;
    root.querySelector('[data-quit]').onclick = quit;
    root.querySelectorAll('.opt').forEach((b) => (b.onclick = () => choose(+b.dataset.i)));
    root.querySelector('[data-check]').onclick = check;
  };

  const choose = (i) => {
    if (run.checked) return;
    sfx('select');
    run.chosen = i;
    root.querySelectorAll('.opt').forEach((b) => b.classList.toggle('sel', +b.dataset.i === i));
    root.querySelector('[data-check]').disabled = false;
  };

  const check = () => {
    if (run.checked || run.chosen < 0) return;
    run.checked = true;
    const q = qs[run.i];
    const ok = run.chosen === q.correct;
    const r = recordAnswer(save, q, run.chosen, run.streak);
    run.streak = r.streak; run.bestStreak = Math.max(run.bestStreak, r.streak);
    if (ok) { run.correct++; run.fish += r.fish; }
    persist();
    sfx(ok ? 'right' : 'wrong');
    if (ok) setTimeout(() => sfx('coin'), 260);

    root.querySelectorAll('.opt').forEach((b) => {
      const i = +b.dataset.i;
      b.disabled = true;
      if (i === q.correct) b.classList.add('right');
      else if (i === run.chosen) b.classList.add('wrong');
    });
    const bud = root.querySelector('.buddy');
    bud.innerHTML = catArt(buddy, ok ? 'happy' : 'idle');
    bud.classList.add(ok ? 'cheer' : 'shake');
    const st = root.querySelector('.streak');
    st.className = 'streak' + (run.streak >= 2 ? ' on' : '');
    st.innerHTML = `${icon('flame')} ${run.streak}`;
    root.querySelector('.bar > i').style.width = (100 * (run.i + 1)) / qs.length + '%';

    const last = run.i === qs.length - 1;
    const fb = el(`<div class="feedback ${ok ? 'good' : 'bad'}">
      <div class="row"><span class="fb-ico">${icon(ok ? 'check' : 'cross')}</span><h3>${ok ? pick(PRAISE) : pick(OOPS)}</h3>
        <div class="spacer"></div>${ok ? `<span class="fb-fish">+${r.fish} ${icon('fish')}</span>` : ''}</div>
      ${ok ? '' : `<p class="fb-right">Answer: <b>${esc(q.answers[q.correct])}</b></p>`}
      ${q.fact ? `<p class="fb-fact">${esc(q.fact)}</p>` : ''}
      ${ok ? '<button class="too-easy" data-easy>Too easy? Don\'t show me this one again</button>' : ''}
      <button class="btn block big ${ok ? '' : 'red'}" data-next>${last ? 'Finish' : 'Continue'}</button>
    </div>`);
    // the panel sits over the bottom of the app; the emptied footer keeps the options scrollable above it
    document.getElementById('app').appendChild(fb);
    const foot = root.querySelector('.quiz-foot');
    foot.innerHTML = '';
    foot.style.height = fb.offsetHeight + 'px';
    fb.querySelector('[data-next]').onclick = next;
    const easy = fb.querySelector('[data-easy]');
    if (easy) easy.onclick = () => {
      sfx('select');
      retireQuestion(save, q.id);
      persist();
      easy.outerHTML = '<p class="too-easy done">Got it, you won\'t see that one again.</p>';
      foot.style.height = fb.offsetHeight + 'px';
    };
  };

  const next = () => {
    sfx('tap');
    if (run.i < qs.length - 1) { run.i++; draw(); return; }
    const res = finishRound(save, { correct: run.correct, total: qs.length }, app.content);
    persist();
    go('results', { ...res, correct: run.correct, total: qs.length, fish: run.fish, bestStreak: run.bestStreak, theme, buddy: buddy.id });
  };

  const quit = async () => {
    sfx('tap');
    if (run.i === 0 && !run.checked) { go('home'); return; }
    if (await confirmDialog('Leave this round?', 'Your answers so far still count, but you will miss the end-of-round bonus.', 'Leave', 'Keep playing')) go('home');
  };

  const onKey = (e) => {   // handy on desktop: 1-4 / A-D to pick, Enter to check or continue
    const k = e.key.toUpperCase();
    const i = '1234'.indexOf(k) >= 0 ? '1234'.indexOf(k) : LETTERS.indexOf(k);
    if (i >= 0 && i < qs[run.i].answers.length) choose(i);
    else if (e.key === 'Enter') (document.querySelector('.feedback [data-next]') || root.querySelector('[data-check]:not(:disabled)'))?.click();
  };
  document.addEventListener('keydown', onKey);

  draw();
  return () => { document.removeEventListener('keydown', onKey); removeFeedback(); };
}

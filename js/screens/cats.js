// The cat album: who lives here, what each loves, and how to bring the others home.
import { app, persist, catById } from '../app.js';
import { milestoneProgress } from '../core/progress.js';
import { levelFor, itemById } from '../core/home.js';
import { heartProgress, unlockedAccessories } from '../core/bonds.js';
import { esc, icon, catArt, openSheet, popHeart } from '../ui.js';
import { sfx } from '../audio.js';

const itemName = (id) => itemById(app.content.home, id)?.name || id;

/** How to get a cat who hasn't moved in yet. */
function howToGet(cat) {
  const s = app.save;
  if (cat.unlock.type === 'milestone') return esc(cat.unlock.label);
  const it = itemById(app.content.home, cat.favourite);
  if (s.home.items[cat.favourite]) return `Loves your ${esc(it.name.toLowerCase())}. Finish a round!`;
  if (s.home.owned.includes(cat.favourite)) return `Loves the ${esc(it.name.toLowerCase())}. Put it back in the room!`;
  const lv = levelFor(s.stats.correct, app.content.home.levels).index;
  if (it.level - 1 > lv) return `Loves the ${esc(it.name.toLowerCase())} (shop, ${esc(app.content.home.levels[it.level - 1].name)})`;
  return `Loves the ${esc(it.name.toLowerCase())}. Find it in the shop.`;
}

export function render(root) {
  const { cats } = app.content;
  const s = app.save;
  const owned = cats.filter((c) => s.cats[c.id]).length;
  const card = (cat) => {
    if (s.cats[cat.id]) {
      const cosy = s.home.items[cat.favourite];
      return `<button class="cat-card" data-id="${cat.id}">
        <div class="cat-pic">${catArt(cat, cosy ? 'happy' : 'idle')}</div>
        <b>${esc(cat.name)}</b>
        <span class="chip" style="--c:${cosy ? 'var(--good-bg)' : '#F1E7DA'}">♥ ${esc(itemName(cat.favourite))}</span></button>`;
    }
    let progress = '';
    if (cat.unlock.type === 'milestone') {
      const p = milestoneProgress(s, cat, app.content.themeIds);
      progress = `<div class="bar" style="--c:var(--lav)"><i style="width:${(100 * p.have) / p.need}%"></i></div><span class="small dim">${p.have} / ${p.need}</span>`;
    }
    return `<div class="cat-card locked-card">
      <div class="cat-pic">${catArt(cat, 'idle', 'locked')}<span class="lock">${cat.unlock.type === 'milestone' ? icon('trophy') : '?'}</span></div>
      <b>???</b><span class="small dim">${howToGet(cat)}</span>${progress}</div>`;
  };
  root.innerHTML = `<div class="row"><h1 class="title">Your cats</h1><div class="spacer"></div>
      <span class="pill"><span class="ico">${icon('paw')}</span>${owned} / ${cats.length}</span></div>
    <p class="dim">Every cat has a favourite piece of furniture. Put it in your room and they'll come to visit, then stay.</p>
    <div class="cat-grid">${cats.map(card).join('')}</div>`;
  root.querySelectorAll('[data-id]').forEach((b) => (b.onclick = () => { sfx('boop'); openCatProfile(b.dataset.id, () => render(root)); }));
}

/** A cat's page: picture (tap for a line), story, favourite, and everything they like to say. */
export function openCatProfile(id, onClose) {
  const cat = catById(id), s = app.save;
  const since = s.cats[id]?.since ? new Date(s.cats[id].since).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const cosy = s.home.items[cat.favourite];
  openSheet((sh) => {
    const draw = () => {
      const hp = heartProgress(s.bonds[id]);
      const open = unlockedAccessories(s, id, app.content.accessories);
      const wardrobe = app.content.accessories.map((a) => {
        const has = open.includes(a);
        return `<button class="wear ${s.wear[id] === a.id ? 'on' : ''}" data-wear="${a.id}" ${has ? '' : 'disabled'} title="${esc(a.name)}">
          ${has ? (app.content.art.accessories ? `<img class="px" src="assets/img/accessories/${a.id}.png" alt="">` : a.emoji) : '♥'.repeat(a.hearts)}</button>`;
      }).join('');
      sh.innerHTML = `<div class="care-pic" data-tap>${catArt(cat, 'happy')}</div>
        <div class="center"><h2>${esc(cat.name)}</h2><p class="small dim">${esc(cat.coat)}${since ? ` · home since ${since}` : ''}</p></div>
        <p class="center">${esc(cat.bio)}</p>
        <div class="card row"><span>♥ Favourite</span><div class="spacer"></div>
          <b>${esc(itemName(cat.favourite))}</b>&nbsp;<span class="chip" style="--c:${cosy ? 'var(--good-bg)' : '#F1E7DA'}">${cosy ? 'In the room' : 'Not in the room'}</span></div>
        <div class="card friend">
          <div class="row"><span>Friendship</span><div class="spacer"></div><span class="hearts">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= hp.hearts ? 'on' : ''}">♥</i>`).join('')}</span></div>
          <div class="bar" style="--c:var(--pink)"><i style="width:${hp.need ? (100 * hp.have) / hp.need : 100}%"></i></div>
          <span class="small dim">${hp.need ? `Pick ${esc(cat.name)} as your quiz buddy: ${hp.need - hp.have} more right answers together for the next heart.` : 'Best friends forever!'}</span>
          <div class="wardrobe"><button class="wear ${s.wear[id] ? '' : 'on'}" data-wear="">None</button>${wardrobe}</div>
        </div>
        <div class="card says"><span class="small dim">Things ${esc(cat.name)} says</span>${(cat.taps || []).map((t) => `<p>“${esc(t)}”</p>`).join('')}</div>
        <p class="center small dim">${cosy ? `Cosy cats earn you a bonus fish every round.` : `Put the ${esc(itemName(cat.favourite).toLowerCase())} in the room to make ${esc(cat.name)} extra cosy.`}</p>`;
      sh.querySelectorAll('[data-wear]').forEach((b) => (b.onclick = () => {
        sfx('select');
        if (b.dataset.wear) s.wear[id] = b.dataset.wear; else delete s.wear[id];
        persist();
        draw();
      }));
      const pic = sh.querySelector('[data-tap]');
      pic.onclick = (e) => {
        const box = pic.getBoundingClientRect();
        sfx('boop');
        pic.classList.remove('cheer'); void pic.offsetWidth; pic.classList.add('cheer');
        popHeart(pic, e.clientX - box.left, e.clientY - box.top);
      };
    };
    draw();
  }, { onClose });
}

function welcomeCat(cat, onClose) {
  const visitor = cat.unlock.type === 'visit';
  openSheet((sh, close) => {
    sh.innerHTML = `<div class="hero-cat cheer">${catArt(cat, 'happy')}</div>
      <h2 class="center">${esc(cat.name)} has moved in!</h2>
      <p class="center dim">${visitor ? `${esc(cat.name)} came to see your ${esc(itemName(cat.favourite).toLowerCase())} and decided to stay.` : esc(cat.bio)}</p>
      <p class="center"><i>“${esc((cat.taps || ['Mrrp.'])[0])}”</i></p>
      <button class="btn block">Welcome, ${esc(cat.name)}!</button>`;
    sh.querySelector('.btn').onclick = () => { sfx('tap'); close(); };
  }, { center: true, onClose });
}

/** Shows cats that moved in since last time, one after another; `onDone` runs only if one was shown. */
export function announceNewCats(onDone) {
  const next = () => {
    const id = app.save.newCats.shift();
    if (!id) { onDone?.(); return; }
    persist();
    sfx('done');
    welcomeCat(catById(id), next);
  };
  if (app.save.newCats.length) next();
}

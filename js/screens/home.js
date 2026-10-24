// Home: the cats' live room, your home level, decorating, and the big Play button.
import { app, go, persist, themeById, resetSave } from '../app.js';
import { levelFor, attractsFor, storeItem, unstoreItem, itemById } from '../core/home.js';
import { esc, icon, themeIcon, catArt, openSheet, confirmDialog, toast } from '../ui.js';
import { audio, sfx, MUSIC_STYLES } from '../audio.js';
import { announceNewCats } from './cats.js';
import { openShop, openWindows } from './shop.js';
import { Room } from '../room.js';

export function header() {
  const s = app.save;
  return `<div class="topbar row">
    <div class="brand">${app.content.art.logo ? '<img src="assets/img/ui/logo.png" alt="Cosy Trivia">' : 'Cosy <b>Trivia</b>'}</div>
    <div class="spacer"></div>
    <span class="pill" title="Fish treats"><span class="ico">${icon('fish')}</span><span data-fish>${s.fish}</span></span>
    <span class="pill ${s.stats.dayStreak ? '' : 'off'}" title="Day streak"><span class="ico">${icon('flame')}</span>${s.stats.dayStreak}</span>
  </div>`;
}

/** Home level card: where you are and how many right answers until the next level. */
export function levelCard() {
  const lv = levelFor(app.save.stats.correct, app.content.home.levels);
  const pct = lv.next ? Math.round((100 * lv.have) / lv.need) : 100;
  return `<div class="level-card">
    <div class="row"><span class="lv-badge">${lv.index + 1}</span><b>${esc(lv.level.name)}</b><div class="spacer"></div>
      <span class="small dim">${lv.next ? `Next: ${esc(lv.next.name)}` : 'Top level!'}</span></div>
    <div class="bar" style="--c:var(--yellow)"><i style="width:${pct}%"></i></div>
    <span class="small dim">${lv.next ? `${lv.need - lv.have} more right answers` : 'A real cat café. Well done!'}</span></div>`;
}

/** One gentle line under the room: what to do next. */
function nudge() {
  const s = app.save, cats = app.content.cats;
  const coming = cats.find((c) => c.unlock.type === 'visit' && !s.cats[c.id] && s.home.items[c.favourite]);
  if (coming) return `Something furry is curious about your ${esc(itemById(app.content.home, coming.favourite).name.toLowerCase())}... finish a round!`;
  if (s.stats.answered === 0) return 'Right answers earn fish. Spend them on furniture, and cats will come.';
  const wanted = app.content.home.items.find((it) => attractsFor(s, cats, it.id).length && !s.home.owned.includes(it.id));
  if (wanted) return `A cat out there loves the ${esc(wanted.name.toLowerCase())}. It's in the shop.`;
  return 'Tap a cat to say hello.';
}

export function render(root) {
  const s = app.save;
  const last = themeById(s.lastTheme) || themeById('mix');
  root.innerHTML = `${header()}${levelCard()}
    <div class="room-host"></div>
    <div class="home-panel"></div>`;
  const panel = root.querySelector('.home-panel');
  const refreshFish = () => { const f = root.querySelector('[data-fish]'); if (f) f.textContent = s.fish; };

  const drawPlayPanel = () => {
    room.setDecorating(false);
    panel.innerHTML = `<p class="nudge">${nudge()}</p>
      <button class="btn big block" data-play>Play</button>
      <div class="row two">
        <button class="btn ghost" data-quick>${themeIcon(last)} Quick · ${s.settings.roundSize || 10}</button>
        <button class="btn yellow" data-decorate>🛋️ Decorate</button>
      </div>
      <button class="icon-btn settings-btn">${icon('gear')} Settings</button>`;
    panel.querySelector('[data-play]').onclick = () => { sfx('tap'); go('themes'); };
    panel.querySelector('[data-quick]').onclick = () => { sfx('tap'); go('quiz', { theme: last.id }); };
    panel.querySelector('[data-decorate]').onclick = () => { sfx('tap'); room.setDecorating(true); drawDecorPanel(null); };
    panel.querySelector('.settings-btn').onclick = () => { sfx('tap'); openSettings(); };
  };

  const drawDecorPanel = (selected) => {
    if (!room.decorating) return;
    const stored = s.home.owned.filter((id) => !s.home.items[id]);
    const sel = selected && itemById(app.content.home, selected);
    panel.innerHTML = `<p class="nudge">${sel ? `<b>${esc(sel.name)}</b> · drag it anywhere` : 'Drag furniture anywhere. Tap a piece to select it.'}</p>
      ${sel ? `<button class="btn ghost block" data-store>Put ${esc(sel.name.toLowerCase())} away</button>` : ''}
      ${stored.length ? `<div class="stored"><span class="small dim">Put away:</span>${stored.map((id) => `<button class="stored-item" data-place="${id}" title="${esc(itemById(app.content.home, id).name)}"><img class="px" src="assets/img/room/furniture/${id}.png" alt=""></button>`).join('')}</div>` : ''}
      <div class="row two">
        <button class="btn yellow" data-shop>${icon('fish')} Shop</button>
        <button class="btn sky" data-window>🪟 Window</button>
      </div>
      <button class="btn big block" data-done>Done</button>`;
    panel.querySelector('[data-done]').onclick = () => { sfx('tap'); drawPlayPanel(); };
    panel.querySelector('[data-shop]').onclick = () => { sfx('tap'); openShop((id) => { room.syncItem(id); refreshFish(); room.select(id); }); };
    panel.querySelector('[data-window]').onclick = () => { sfx('tap'); openWindows(() => room.draw()); };
    panel.querySelector('[data-store]')?.addEventListener('click', () => {
      sfx('tap'); storeItem(s, selected); persist(); room.syncItem(selected); room.select(null);
    });
    panel.querySelectorAll('[data-place]').forEach((b) => (b.onclick = () => {
      sfx('select'); unstoreItem(s, app.content.home, b.dataset.place); persist(); room.syncItem(b.dataset.place); room.select(b.dataset.place);
    }));
  };

  const room = new Room(root.querySelector('.room-host'), { onSelect: (id) => drawDecorPanel(id) });
  drawPlayPanel();
  if (!s.welcomed) welcome();
  else announceNewCats(() => go('home'));
  return () => room.destroy();
}

function welcome() {
  const mochi = app.content.cats[0];
  openSheet((sh, close) => {
    sh.innerHTML = `<div class="hero-cat">${catArt(mochi, 'happy')}</div>
      <h2 class="center">Welcome home!</h2>
      <p class="center dim">${esc(mochi.name)} has moved into a cosy corner with one cushion bed. Here's how it grows:</p>
      <ul class="howto">
        <li><span>${icon('star')}</span>Pick a theme and answer trivia questions.</li>
        <li><span>${icon('fish')}</span>Right answers earn fish. Spend them on furniture, then drag it anywhere.</li>
        <li><span>${icon('heart')}</span>Every cat has a favourite piece of furniture. Put it in the room and that cat will visit, then move in.</li>
        <li><span>${icon('trophy')}</span>The more you get right, the more your home grows: new furniture, new views, new cats.</li>
      </ul>
      <button class="btn block">Let's go</button>`;
    sh.querySelector('.btn').onclick = () => { sfx('tap'); close(); };
  }, { center: true, onClose: () => { app.save.welcomed = true; persist(); } });
}

function openSettings() {
  openSheet((sh, close) => {
    const draw = () => {
      const slider = (bus, label, ico) => `<label class="vol"><span>${ico} ${label}</span>
        <input type="range" min="0" max="100" step="5" value="${Math.round(audio.getVolume(bus) * 100)}" data-vol="${bus}"></label>`;
      sh.innerHTML = `<h2>Settings</h2>
        <div class="card vols">
          <span class="vol-label">🎶 Music style</span>
          <div class="seg wide">${MUSIC_STYLES.map(([id, label]) => `<button data-style="${id}" class="${audio.style === id ? 'on' : ''}">${label}</button>`).join('')}</div>
          ${slider('music', 'Music', '🎵')}${slider('sfx', 'Sounds', '🔔')}</div>
        ${app.storageOk ? '' : '<div class="card"><p class="small" style="color:var(--red-d)">This browser mode cannot save progress.</p></div>'}
        ${app.save.retired.length ? `<div class="card row"><span class="small">${app.save.retired.length} question${app.save.retired.length === 1 ? '' : 's'} hidden as too easy</span>
          <div class="spacer"></div><button class="btn sm ghost" data-unretire>Bring back</button></div>` : ''}
        <button class="btn ghost block" data-reset>Reset all progress</button>
        <p class="small dim center">Cosy Trivia v0.5 · ${app.content.bank.length} questions</p>`;
      sh.querySelectorAll('[data-style]').forEach((b) => (b.onclick = () => {
        sfx('select');
        audio.setStyle(b.dataset.style, app.current);
        sh.querySelectorAll('[data-style]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      sh.querySelectorAll('[data-vol]').forEach((r) => {
        r.oninput = () => audio.setVolume(r.dataset.vol, r.value / 100);
        r.onchange = () => { if (r.dataset.vol === 'sfx') sfx('select'); };
      });
      const unretire = sh.querySelector('[data-unretire]');
      if (unretire) unretire.onclick = () => { sfx('tap'); app.save.retired = []; persist(); toast('They\'re back in the mix'); draw(); };
      sh.querySelector('[data-reset]').onclick = async () => {
        close();
        if (await confirmDialog('Reset everything?', 'All your cats, furniture, fish and stats will be gone. This cannot be undone.', 'Reset', 'Keep my cats', true)) {
          resetSave(); toast('Fresh start!'); go('home');
        }
      };
    };
    draw();
  });
}

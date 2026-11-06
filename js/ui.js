// Small DOM helpers: escaping, icons, cat art (ChatGPT sprite or a flat placeholder), sheets and toasts.
import { app } from './app.js';
import { sfx } from './audio.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Parses an HTML string into a single element. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// UI icons: emoji until the ChatGPT icon sheet is sliced (data/art.json "icons").
const EMOJI = { fish: '🐟', flame: '🔥', heart: '❤️', star: '⭐', paw: '🐾', bowl: '🥣', yarn: '🧶', pet: '💕', check: '✅', cross: '❌',
  trophy: '🏆', chart: '📊', gear: '⚙️', home: '🏠', book: '📖', lock: '🔒' };
export function icon(name) {
  if (app.content?.art.icons) return `<img class="ico-img" src="assets/img/ui/${name}.png" alt="">`;
  return EMOJI[name] || '';
}
export function themeIcon(t) {
  if (app.content?.art.icons) return `<img class="ico-img" src="assets/img/ui/theme_${t.id}.png" alt="">`;
  return t.emoji;
}

/**
 * Cat art for a pose ('idle' | 'happy' | 'sleep'), wearing its chosen accessory (unless `cls` is 'locked').
 * Uses the sprite when the cat's art is in, else a simple placeholder.
 */
export function catArt(cat, pose = 'idle', cls = '') {
  if (!cat.art) return placeholderCat(cat, pose, cls);
  const img = `<img class="cat-art px ${cls}" src="assets/img/cats/${cat.id}_${pose}.png" alt="${esc(cat.name)}" draggable="false">`;
  const acc = cls.includes('locked') ? '' : accessoryHTML(cat, pose);
  return acc ? `<span class="cat-fig">${img}${acc}</span>` : img;
}

/** The accessory a cat is wearing, positioned on its head in % of the 34 x 30 sprite box ('' if none). */
export function accessoryHTML(cat, pose) {
  const id = app.save?.wear?.[cat.id];
  const a = id && app.content.accessories.find((x) => x.id === id);
  const at = a && app.content.anchors[cat.id]?.[pose];
  if (!at) return '';
  const style = `left:${(100 * at[0]) / 34}%;top:${(100 * at[1]) / 30}%;width:${(100 * a.w) / 34}%`;
  return app.content.art.accessories
    ? `<img class="acc px" src="assets/img/accessories/${a.id}.png" alt="" style="${style}">`
    : `<span class="acc emoji" style="${style}">${a.emoji}</span>`;
}

// A deliberately plain stand-in for a cat whose art isn't in yet.
function placeholderCat(cat, pose, cls) {
  const { body, accent, eye } = cat.colors || { body: '#E7DED2', accent: '#FFC9D6', eye: '#3B2F4A' };
  const ink = '#3B2F4A';
  const sleep = pose === 'sleep';
  const hy = sleep ? 56 : 42;                       // head centre y
  const eyes = pose === 'happy'
    ? `<path d="M36 ${hy + 1} q5 -6 10 0 M54 ${hy + 1} q5 -6 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : sleep
      ? `<path d="M36 ${hy} q5 4 10 0 M54 ${hy} q5 4 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : `<circle cx="41" cy="${hy}" r="5.5" fill="${eye}"/><circle cx="59" cy="${hy}" r="5.5" fill="${eye}"/>
         <circle cx="41" cy="${hy}" r="3" fill="${ink}"/><circle cx="59" cy="${hy}" r="3" fill="${ink}"/>
         <circle cx="39.5" cy="${hy - 2}" r="1.6" fill="#fff"/><circle cx="57.5" cy="${hy - 2}" r="1.6" fill="#fff"/>`;
  const bodyShape = sleep
    ? `<ellipse cx="52" cy="76" rx="34" ry="15" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/>`
    : `<ellipse cx="50" cy="72" rx="24" ry="20" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/>
       <ellipse cx="50" cy="76" rx="13" ry="11" fill="${accent}" opacity=".9"/>
       <ellipse cx="41" cy="90" rx="6" ry="4" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/>
       <ellipse cx="59" cy="90" rx="6" ry="4" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/>`;
  const tail = sleep
    ? `<path d="M84 78 q8 -2 4 -14" stroke="${body}" stroke-width="8" fill="none" stroke-linecap="round"/>`
    : `<path d="M72 80 q18 -2 12 -24" stroke="${body}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  const zz = sleep ? `<text x="76" y="30" font-size="14" font-weight="800" fill="${ink}" opacity=".45" font-family="sans-serif">z z</text>` : '';
  return `<svg class="cat-art ${cls}" viewBox="0 0 100 100" role="img" aria-label="${esc(cat.name)}">
    <ellipse cx="50" cy="94" rx="30" ry="4.5" fill="${ink}" opacity=".13"/>
    ${tail}${bodyShape}
    <path d="M30 ${hy - 10} L28 ${hy - 30} L45 ${hy - 20} Z M70 ${hy - 10} L72 ${hy - 30} L55 ${hy - 20} Z" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2" stroke-linejoin="round"/>
    <path d="M32 ${hy - 14} L31 ${hy - 25} L41 ${hy - 19} Z M68 ${hy - 14} L69 ${hy - 25} L59 ${hy - 19} Z" fill="${accent}"/>
    <circle cx="50" cy="${hy}" r="23" fill="${body}" stroke="${ink}" stroke-opacity=".2" stroke-width="2"/>
    ${eyes}
    <ellipse cx="33" cy="${hy + 8}" rx="4.5" ry="2.6" fill="#FF8FB1" opacity=".55"/><ellipse cx="67" cy="${hy + 8}" rx="4.5" ry="2.6" fill="#FF8FB1" opacity=".55"/>
    <path d="M47.5 ${hy + 6} h5 l-2.5 3 z" fill="#FF8FB1"/>
    <path d="M45 ${hy + 11} q2.5 2.5 5 0 q2.5 2.5 5 0" stroke="${ink}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${zz}
  </svg>`;
}

/** Floats a little emoji/heart up from a point inside `host` (which must be position:relative). */
export function popHeart(host, x, y, char = '💕') {
  const h = el(`<span class="heart-pop">${char}</span>`);
  h.style.left = x + 'px'; h.style.top = y + 'px';
  host.appendChild(h);
  setTimeout(() => h.remove(), 950);
}

export function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  document.getElementById('app').appendChild(t);
  setTimeout(() => t.remove(), 2300);
}

/**
 * Opens a bottom sheet (or a centred card with {center:true}). `build(sheetEl, close)` fills it.
 * @returns {Function} close
 */
export function openSheet(build, { center = false, onClose = null, dismissable = true } = {}) {
  const ov = el(`<div class="overlay${center ? ' center' : ''}"><div class="sheet"></div></div>`);
  const sheet = ov.firstElementChild;
  let closed = false;
  const close = () => { if (closed) return; closed = true; ov.remove(); onClose?.(); };
  if (dismissable) ov.addEventListener('click', (e) => { if (e.target === ov) { sfx('tap'); close(); } });
  document.getElementById('app').appendChild(ov);
  build(sheet, close);
  return close;
}

export function confirmDialog(title, text, yes = 'Yes', no = 'Cancel', danger = false) {
  return new Promise((resolve) => {
    let answer = false;
    openSheet((s, close) => {
      s.innerHTML = `<h2 class="center">${esc(title)}</h2><p class="center dim">${esc(text)}</p>
        <button class="btn block ${danger ? 'red' : ''}" data-y>${esc(yes)}</button><button class="btn ghost block" data-n>${esc(no)}</button>`;
      s.querySelector('[data-y]').onclick = () => { answer = true; close(); };
      s.querySelector('[data-n]').onclick = () => close();
    }, { center: true, onClose: () => resolve(answer) });
  });
}

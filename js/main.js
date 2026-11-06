// Boot: load the content and the save, wire the nav, register the service worker, show Home.
import { app, loadSave, go, persist } from './app.js';
import { pruneCats } from './core/progress.js';
import { audio, sfx } from './audio.js';
import { toast, icon } from './ui.js';
import { normaliseBank } from './core/bank.js';
import * as home from './screens/home.js';
import * as themes from './screens/themes.js';
import * as quiz from './screens/quiz.js';
import * as results from './screens/results.js';
import * as cats from './screens/cats.js';
import * as stats from './screens/stats.js';

const QUESTION_FILES = ['general', 'geography', 'history', 'politics', 'science', 'singapore', 'technology'];
const getJSON = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });

async function boot() {
  const [themeList, catList, art, retired, homeData, accessories, anchors, specials, ...banks] = await Promise.all([
    getJSON('data/themes.json'), getJSON('data/cats.json'), getJSON('data/art.json'), getJSON('data/retired.json'), getJSON('data/home.json'),
    getJSON('data/accessories.json'), getJSON('data/cat_anchors.json'), getJSON('data/specials.json'),
    ...QUESTION_FILES.map((f) => getJSON(`data/questions/${f}.json`)),
  ]);
  const tooEasy = new Set(retired.ids);
  const bank = normaliseBank(banks.flat()).filter((q) => !tooEasy.has(q.id));
  // content waiting on ChatGPT art stays out of the game until it lands (data/art.json)
  const ready = (x) => !x.art || x.art === true || art[x.art];
  const homeContent = { ...homeData, levels: homeData.levels.filter(ready), areas: (homeData.areas || []).filter(ready),
    items: homeData.items.filter((it) => !it.area || it.area === 'room' || art[it.area]) };
  app.content = { themes: themeList, cats: catList.filter((c) => c.art), art, bank, home: homeContent, accessories: accessories.items, anchors, specials, themeIds: themeList.filter((t) => t.id !== 'mix').map((t) => t.id) };
  app.screens = { home, themes, quiz, results, cats, stats };
  loadSave();
  const refund = pruneCats(app.save, app.content);
  persist();
  await audio.init();

  document.getElementById('app').insertAdjacentHTML('beforeend', `<nav class="nav" id="nav">
    <button data-go="home"><span class="ico">${icon('home')}</span>Home</button>
    <button data-go="cats"><span class="ico">${icon('paw')}</span>Cats</button>
    <button data-go="stats"><span class="ico">${icon('chart')}</span>Stats</button></nav>`);
  document.querySelectorAll('#nav button').forEach((b) => (b.onclick = () => { sfx('tap'); go(b.dataset.go); }));

  document.getElementById('boot').remove();
  go('home');
  if (!app.storageOk) toast('Progress cannot be saved in this browser mode');
  else if (refund) toast(`New cats moved in! ${refund} fish refunded`);

  const sw = 'serviceWorker' in navigator && location.protocol === 'https:';
  const hadController = sw && !!navigator.serviceWorker.controller;
  const reg = sw ? navigator.serviceWorker.register('sw.js').catch(() => null) : Promise.resolve(null);   // fine if not: online-only
  if (sw) {
    // a new version takes over at once, but this page still runs the old code: offer a refresh, never force one
    let offered = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || offered) return;
      offered = true;
      const b = document.createElement('button');
      b.className = 'update-banner';
      b.textContent = 'New questions are here! Tap to refresh';
      b.onclick = () => location.reload();
      document.getElementById('app').appendChild(b);
    });
  }

  // the room's light follows the clock: redraw Home when the app comes back after a while
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) return;
    (await reg)?.update().catch(() => {});   // iOS home-screen apps rarely look for updates on their own
    if (app.current === 'home' && !document.querySelector('.overlay')) go('home');
  });
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = '<p>Oh no, something went wrong loading the game. Pull down to refresh.</p>';
});

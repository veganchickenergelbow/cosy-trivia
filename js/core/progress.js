// The save shape, answer and round bookkeeping, day streaks, home levels and the cats who join.
import { REWARD, RECENT_KEPT, fishFor } from './round.js';
import { defaultHome, levelFor, cosyCats, visitors } from './home.js';

const newCat = (now) => ({ since: now });

export const SAVE_VERSION = 1;
export const MISTAKES_KEPT = 30;
export const DAYS_KEPT = 60;
const MIN_TIMED_MS = 800;          // quicker than this is a double-tap, not a real answer

/** What kind of question it was, for the per-type stats. */
export const kindOf = (q) => q.kind || q.origType || 'mc';

export function defaultSave(now = Date.now()) {
  return {
    v: SAVE_VERSION,
    fish: 0,
    cats: { mochi: newCat(now) },
    home: defaultHome(),
    newCats: [],                   // joined but not yet announced
    seen: {},
    retired: [],                   // questions this player marked "too easy"
    review: [],                    // questions got wrong and not yet got right since: "Brush up" rounds
    daily: {},                     // Daily Kopi Break results by day: { "2026-10-25": { correct, total } }
    challenge: null,               // today's cat challenge: { day, cat, theme, done, won }
    buddy: null,                   // the cat who joins your rounds
    bonds: {},                     // friendship points per cat
    wear: {},                      // accessory each cat is wearing
    stats: {
      answered: 0, correct: 0, rounds: 0, perfect: 0, fishEarned: 0,
      bestStreak: 0, dayStreak: 0, bestDayStreak: 0, lastDay: '',
      themes: {}, mistakes: [],
      recent: [],                  // last RECENT_KEPT answers, 1 = right: drives the difficulty mix
      byDay: {},                   // "2026-10-25": { a: answered, c: right, ms: time spent } (last DAYS_KEPT days)
      byDiff: {},                  // "1" | "2" | "3": { a, c }
      byKind: {},                  // mc | tf | estimate | order | compare: { a, c }
      timeMs: 0, timed: 0,         // time spent answering, and how many answers were timed
      fastestMs: 0,                // quickest right answer (ignoring sub-second taps)
      mastered: 0,                 // Brush-up questions finally got right
      fishSpent: 0,
      challenges: { played: 0, won: 0 },
    },
    settings: { roundSize: 10 },
    lastTheme: 'mix',
    welcomed: false,
    hints: {},                     // one-off tips already dismissed: { install: true }
  };
}

/** Local calendar day, e.g. "2026-10-22". */
export function dayKey(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Fills in fields a newer version added; drops nothing. */
export function migrate(raw, now = Date.now()) {
  const base = defaultSave(now);
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw, stats: { ...base.stats, ...(raw.stats || {}) }, settings: { ...base.settings, ...(raw.settings || {}) } };
  if (!s.cats || !Object.keys(s.cats).length) s.cats = base.cats;
  s.home = { ...base.home, ...(raw.home || {}) };
  s.hints = { ...base.hints, ...(raw.hints || {}) };
  return s;
}

/**
 * Records one answer. `streak` is the in-round run of correct answers before this one; `ms` how long it took.
 * @returns {{fish:number, streak:number}}
 */
export function recordAnswer(save, q, chosen, streak, ms = 0, now = Date.now()) {
  const st = save.stats;
  const ok = chosen === q.correct;
  const th = (st.themes[q.category] ||= { answered: 0, correct: 0 });
  st.answered++; th.answered++;
  const tally = (bucket, key) => { const b = (bucket[key] ||= { a: 0, c: 0 }); b.a++; if (ok) b.c++; return b; };
  const day = tally(st.byDay, dayKey(new Date(now)));
  tally(st.byDiff, String(q.difficulty || 2));
  tally(st.byKind, kindOf(q));
  if (ms >= MIN_TIMED_MS && ms < 10 * 60000) {
    st.timeMs += ms; st.timed++; day.ms = (day.ms || 0) + ms;
    if (ok && (!st.fastestMs || ms < st.fastestMs)) st.fastestMs = ms;
  }
  const days = Object.keys(st.byDay).sort();
  for (const old of days.slice(0, Math.max(0, days.length - DAYS_KEPT))) delete st.byDay[old];
  st.recent.push(ok ? 1 : 0);
  if (st.recent.length > RECENT_KEPT) st.recent.splice(0, st.recent.length - RECENT_KEPT);
  if (!q.special) {                // made-up specials (timelines, comparisons) have no fixed id to come back to
    const at = save.review.indexOf(q.id);
    if (!ok && at < 0) save.review.push(q.id);
    if (ok && at >= 0) { save.review.splice(at, 1); st.mastered++; }
  }
  if (!ok) {
    st.mistakes.unshift({ id: q.id, q: q.question, yours: q.answers[chosen], right: q.answers[q.correct], cat: q.category });
    st.mistakes.length = Math.min(st.mistakes.length, MISTAKES_KEPT);
    return { fish: 0, streak: 0 };
  }
  st.correct++; th.correct++;
  const s = streak + 1;
  st.bestStreak = Math.max(st.bestStreak, s);
  const fish = fishFor(q, s);
  save.fish += fish; st.fishEarned += fish;
  return { fish, streak: s };
}

/**
 * Called once a round is finished: pays the bonuses (including one per cosy cat, whose favourite item is in the room),
 * updates the day streak, notices a new home level, and lets milestone cats and one visitor move in.
 * `content` = { cats, themeIds (without 'mix'), home (data/home.json) }.
 */
export function finishRound(save, { correct, total }, content, now = Date.now()) {
  const st = save.stats;
  st.rounds++;
  const perfect = total > 0 && correct === total;
  if (perfect) st.perfect++;
  const today = dayKey(new Date(now));
  const yesterday = dayKey(new Date(now - 86400000));
  if (st.lastDay !== today) st.dayStreak = st.lastDay === yesterday ? st.dayStreak + 1 : 1;
  st.lastDay = today;
  st.bestDayStreak = Math.max(st.bestDayStreak, st.dayStreak);

  const cosy = cosyCats(save, content.cats).length * REWARD.cosyPerCat;
  // longer rounds pay proportionally bigger end bonuses (a 30-question round = 3x a 10-question one)
  const scale = total / 10;
  const roundBonus = Math.round(REWARD.roundDone * scale);
  const perfectBonus = perfect ? Math.round(REWARD.perfect * scale) : 0;
  const bonus = roundBonus + perfectBonus;
  save.fish += bonus + cosy; st.fishEarned += bonus + cosy;
  const lv = levelFor(st.correct, content.home.levels).index;
  const levelUp = lv > save.home.level ? lv : null;
  save.home.level = Math.max(save.home.level ?? 0, lv);
  const earned = checkMilestones(save, content, now);    // announces itself through save.newCats
  const visited = visitors(save, content.cats, now);
  save.newCats.push(...visited);
  const joined = [...earned, ...visited];
  return { perfect, bonus, roundBonus, perfectBonus, cosy, dayStreak: st.dayStreak, joined, levelUp };
}

export function milestoneProgress(save, cat, themeIds) {
  const u = cat.unlock, st = save.stats;
  if (u.stat === 'allThemes') {
    const have = themeIds.filter((t) => (st.themes[t]?.correct || 0) >= u.value).length;
    return { have, need: themeIds.length };
  }
  return { have: Math.min(st[u.stat] || 0, u.value), need: u.value };
}

/** Lets every milestone cat whose goal is met join. @returns {string[]} ids that just joined */
export function checkMilestones(save, { cats, themeIds }, now = Date.now()) {
  const joined = [];
  for (const cat of cats) {
    if (cat.unlock.type !== 'milestone' || save.cats[cat.id]) continue;
    const p = milestoneProgress(save, cat, themeIds);
    if (p.have >= p.need) { save.cats[cat.id] = newCat(now); joined.push(cat.id); }
  }
  save.newCats.push(...joined);
  return joined;
}

// v0.1's placeholder roster, replaced by BreakingEmbed's cats in v0.2: what each adoptable one cost
const OLD_ADOPT_COST = { biscuit: 25, pepper: 40, tofu: 60, dumpling: 130, starling: 180, tiger: 240 };

/**
 * Drops cats that are no longer in the roster, refunds what they cost, keeps a starter cat,
 * and re-checks milestones so earned cats come back as their new selves. @returns {number} fish refunded
 */
export function pruneCats(save, content, now = Date.now()) {
  const known = new Set(content.cats.map((c) => c.id));
  let refund = 0;
  for (const id of Object.keys(save.cats)) {
    if (known.has(id)) continue;
    refund += OLD_ADOPT_COST[id] || 0;
    delete save.cats[id];
  }
  save.newCats = save.newCats.filter((id) => known.has(id));
  const starter = content.cats.find((c) => c.unlock.type === 'start');
  if (starter && !save.cats[starter.id]) save.cats[starter.id] = newCat(now);
  save.fish += refund;
  checkMilestones(save, content, now);
  return refund;
}

/** "Too easy": this player never sees the question again (undo with save.retired = []). */
export function retireQuestion(save, id) {
  if (!save.retired.includes(id)) save.retired.push(id);
}


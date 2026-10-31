// The other ways to play: the Daily Kopi Break, Brush-up (your mistakes), and a cat's daily challenge.
import { shuffle, prepare, seeded } from './round.js';
import { dayKey } from './progress.js';

export const DAILY = { size: 5, fish: 10, weekBonus: 30 };
export const CHALLENGE = { size: 3, winFish: 15, winBond: 8, tryBond: 3 };
export const REVIEW_SIZE = 10;

/** The same 5 questions for everyone on a given day: medium or hard, each from a different theme. */
export function dailyRound(bank, day, themeIds) {
  const rng = seeded('kopi-' + day);
  const themes = shuffle(themeIds, rng).slice(0, DAILY.size);
  return themes.map((t) => {
    const pool = bank.filter((q) => q.category === t && (q.difficulty || 2) >= 2);
    return prepare(pool[Math.floor(rng() * pool.length)], rng);
  }).filter(Boolean);
}

/** Records a finished daily and pays for it. @returns {{fish:number, weekBonus:number, stamps:number}} */
export function finishDaily(save, day, correct, total, now = Date.now()) {
  const first = !save.daily[day];
  save.daily[day] = { correct, total };
  if (!first) return { fish: 0, weekBonus: 0, stamps: weekStamps(save, now) };
  const stamps = weekStamps(save, now);
  const weekBonus = stamps === 7 ? DAILY.weekBonus : 0;
  save.fish += DAILY.fish + weekBonus;
  save.stats.fishEarned += DAILY.fish + weekBonus;
  return { fish: DAILY.fish, weekBonus, stamps };
}

/** The last 7 days (oldest first) with whether the daily was done. */
export function weekDays(save, now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400000);
    return { day: dayKey(d), label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), done: !!save.daily[dayKey(d)] };
  });
}
export const weekStamps = (save, now) => weekDays(save, now).filter((d) => d.done).length;

/** Up to 10 questions you got wrong, still waiting to be got right. */
export function reviewRound(bank, reviewIds, rng = Math.random, n = REVIEW_SIZE) {
  const byId = new Map(bank.map((q) => [q.id, q]));
  return shuffle(reviewIds.filter((id) => byId.has(id)), rng).slice(0, n).map((id) => prepare(byId.get(id), rng));
}

/** Today's challenge: one of your cats (picked by the date) with 3 tricky questions from its favourite topic. */
export function todaysChallenge(save, cats, day) {
  if (save.challenge?.day === day) return save.challenge;
  const owned = cats.filter((c) => save.cats[c.id] && c.topic);
  if (!owned.length) return null;
  const cat = owned[Math.floor(seeded('challenge-' + day)() * owned.length)];
  save.challenge = { day, cat: cat.id, theme: cat.topic, done: false, won: false };
  return save.challenge;
}

export function challengeRound(bank, theme, rng = Math.random) {
  const pool = (d) => bank.filter((q) => q.category === theme && (q.difficulty || 2) >= d);
  const hard = shuffle(pool(3), rng);
  const qs = hard.length >= CHALLENGE.size ? hard : shuffle(pool(2), rng);
  return qs.slice(0, CHALLENGE.size).map((q) => prepare(q, rng));
}

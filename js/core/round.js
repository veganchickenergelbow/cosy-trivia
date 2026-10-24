// Picking a round of questions (no repeats until a theme runs dry) and the fish rewards.

export const ROUND_SIZE = 10;
export const ROUND_SIZES = [10, 20, 30];
export const REWARD = { roundDone: 3, perfect: 5, streakBonusFrom: 3, cosyPerCat: 1 };

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Adaptive difficulty: the share of easy / medium / hard questions, from how you've done lately.
export const RECENT_KEPT = 40;
const MIXES = [   // [min recent accuracy, easy, medium, hard]
  [0.85, 0.1, 0.3, 0.6],
  [0.7, 0.15, 0.4, 0.45],
  [0.5, 0.25, 0.45, 0.3],
  [0, 0.35, 0.45, 0.2],
];
const START_MIX = [0.2, 0.5, 0.3];   // until there are 10 recent answers to go on

/** @param {number[]} recent 1 = right, 0 = wrong, newest last @returns {{1:number,2:number,3:number}} question counts */
export function mixFor(recent, n = ROUND_SIZE) {
  let shares = START_MIX;
  if (recent.length >= 10) {
    const acc = recent.reduce((a, b) => a + b, 0) / recent.length;
    shares = MIXES.find(([min]) => acc >= min).slice(1);
  }
  const easy = Math.round(n * shares[0]), hard = Math.round(n * shares[2]);
  return { 1: easy, 2: n - easy - hard, 3: hard };
}

/**
 * @param {object[]} bank all questions
 * @param {string} theme a category id, or 'mix'
 * @param {Record<string,string[]>} seen ids already asked, per theme (mutated: reset when a theme runs dry)
 * @param {{1:number,2:number,3:number}} [mix] how many of each difficulty (see mixFor); topped up from the rest if short
 * @returns {object[]} questions with shuffled answers ({answers, correct} rewritten), easy first
 */
export function pickRound(bank, theme, seen, rng = Math.random, n = ROUND_SIZE, mix = mixFor([], n)) {
  const pool = theme === 'mix' ? bank : bank.filter((q) => q.category === theme);
  let used = new Set(seen[theme] || []);
  let fresh = pool.filter((q) => !used.has(q.id));
  if (fresh.length < n) {          // ran dry: start the theme over, keeping the leftovers first
    seen[theme] = [];
    used = new Set();
    fresh = [...shuffle(fresh, rng), ...shuffle(pool.filter((q) => !fresh.includes(q)), rng)];
  } else {
    fresh = shuffle(fresh, rng);
  }
  const picked = [];
  for (const d of [1, 2, 3]) picked.push(...fresh.filter((q) => (q.difficulty || 2) === d).slice(0, mix[d]));
  for (const q of fresh) { if (picked.length >= n) break; if (!picked.includes(q)) picked.push(q); }
  const round = picked.slice(0, n).sort((a, b) => (a.difficulty || 2) - (b.difficulty || 2));
  seen[theme] = [...(seen[theme] || []), ...round.map((q) => q.id)];
  return round.map((q) => {
    if (q.fixedOrder) return { ...q };   // True/False and number ladders read best in order
    const order = shuffle(q.answers.map((_, i) => i), rng);
    return { ...q, answers: order.map((i) => q.answers[i]), correct: order.indexOf(q.correct) };
  });
}

/** Fish for one correct answer: 1/2/3 by difficulty, +1 once you're on a roll. `streak` includes this answer. */
export const fishFor = (q, streak) => (q.difficulty || 2) + (streak >= REWARD.streakBonusFrom ? 1 : 0);

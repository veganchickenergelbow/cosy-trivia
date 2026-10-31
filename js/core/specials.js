// Generated questions: "Which came first?" (put 3 dated events in order) and "Higher or lower" (pick the bigger of two).
// Both are marked `special: true` (made up on the spot, so they skip the Brush-up list and the "seen" list).
import { shuffle } from './round.js';

const MIN_GAP_YEARS = 10;    // events in one timeline at least this far apart
const MIN_RATIO = 1.15;      // compared values at least 15% apart

const yearText = (y) => (y < 0 ? `${-y} BC` : String(y));
const numText = (v, unit) => `${v.toLocaleString('en-GB')} ${unit}`;
let uid = 0;

/** @returns {object|null} an "order" question, or null if the category has too few events */
export function makeTimeline(data, category, rng = Math.random) {
  const pool = shuffle(data.timeline.filter((e) => !category || e.category === category), rng);
  const pickedEvents = [];
  for (const e of pool) {
    if (pickedEvents.every((p) => Math.abs(p.year - e.year) >= MIN_GAP_YEARS)) pickedEvents.push(e);
    if (pickedEvents.length === 3) break;
  }
  if (pickedEvents.length < 3) return null;
  const sorted = [...pickedEvents].sort((a, b) => a.year - b.year);
  return {
    id: `sp_order_${++uid}`, special: true, kind: 'order', type: 'order', difficulty: 2,
    category: category || sorted[0].category,
    question: 'Which came first? Tap them in order, oldest first.',
    items: pickedEvents.map((e) => e.name),
    order: sorted.map((e) => e.name),
    fact: sorted.map((e) => `${e.name} (${yearText(e.year)})`).join(' → '),
  };
}

/** @returns {object|null} a two-option question ("Higher or lower"), or null if nothing fits the category */
export function makeCompare(data, category, rng = Math.random) {
  const groups = data.compare.filter((g) => !category || g.category === category);
  if (!groups.length) return null;
  const g = groups[Math.floor(rng() * groups.length)];
  for (let tries = 0; tries < 30; tries++) {
    const [a, b] = shuffle(g.items, rng);
    const hi = Math.max(a.value, b.value), lo = Math.min(a.value, b.value);
    if (hi / lo < MIN_RATIO) continue;
    return {
      id: `sp_cmp_${++uid}`, special: true, kind: 'compare', type: 'mc', difficulty: 2, fixedOrder: true,
      category: g.category,
      question: g.question,
      answers: [a.name, b.name],
      correct: a.value > b.value ? 0 : 1,
      fact: `${a.name}: ${numText(a.value, g.unit)} · ${b.name}: ${numText(b.value, g.unit)}`,
    };
  }
  return null;
}

/**
 * Swaps about one question in ten for a special one that fits the round's theme (never the first question).
 * @param {object[]} qs the round (not mutated) @returns {object[]}
 */
export function addSpecials(qs, theme, data, rng = Math.random) {
  const out = qs.slice();
  const count = Math.max(1, Math.round(qs.length / 10));
  for (let k = 0; k < count && out.length > 1; k++) {
    const cat = theme === 'mix' ? null : theme;
    const makers = rng() < 0.5 ? [makeTimeline, makeCompare] : [makeCompare, makeTimeline];
    const q = makers.map((m) => m(data, cat, rng)).find(Boolean);
    if (!q) break;
    const at = 1 + Math.floor(rng() * (out.length - 1));
    out[at] = q;
  }
  return out;
}

/** Was the tapped order right? */
export const orderIsRight = (q, tapped) => tapped.length === q.order.length && tapped.every((name, i) => name === q.order[i]);

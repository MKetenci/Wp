/**
 * Player progress: what the player has mastered, and the totals derived from it.
 * Pure functions (no DOM, no storage) so they can be tested in Node.
 *
 * State shape (version 1):
 * {
 *   version: 1,
 *   items: { [itemId]: rank },        // highest rank reached that grants mastery (30, or 32..40 for rank-40 items)
 *   nodes: { [nodeKey]: true },       // normal star chart nodes + junctions
 *   steelPath: { [nodeKey]: true },   // same keys, Steel Path
 *   intrinsics: { railjack: { Tactical: 0..10, ... }, drifter: { ... } },
 *   goal: 36,                         // target rank (31 = L1)
 *   plan: { noPlat, includeLimited, includeLowConfidence, chartFirst },  // route planner options
 *   speed: { levelSpeed, farmSpeed }  // personal speed multipliers for the effort model
 * }
 */
import { CATEGORIES, MR_MAX, rankForXp, xpForRank } from './mastery.js';

export const STATE_VERSION = 1;

/** Allowed speed multipliers (0.5 = twice as fast as the defaults). */
export const SPEED_STEPS = [0.5, 0.75, 1, 1.5, 2];

export const nodeKey = (node) => `${node.planet}/${node.name}`;

export function emptyState() {
  return {
    version: STATE_VERSION, items: {}, nodes: {}, steelPath: {}, intrinsics: { railjack: {}, drifter: {} }, goal: MR_MAX,
    plan: { noPlat: false, includeLimited: false, includeLowConfidence: true, chartFirst: false },
    speed: { levelSpeed: 1, farmSpeed: 1 },
  };
}

/** Rank-40 items gain 2 ranks per Forma: 30, 32, ..., 40. */
export function validRanks(item) {
  const ranks = [];
  for (let r = 30; r <= item.maxRank; r += 2) ranks.push(r);
  return ranks;
}

/** XP an item grants at a given rank (0 when not mastered). */
export function itemXp(item, rank) {
  if (!rank) return 0;
  return CATEGORIES[item.category].perRank * Math.min(rank, item.maxRank);
}

/**
 * Cleans an untrusted state object (e.g. an imported file or old localStorage)
 * against the current data: unknown ids are dropped, values are clamped.
 */
export function sanitizeState(raw, data) {
  const state = emptyState();
  if (!raw || typeof raw !== 'object') return state;

  const itemsById = new Map(data.items.map((i) => [i.id, i]));
  for (const [id, rank] of Object.entries(raw.items || {})) {
    const item = itemsById.get(id);
    const r = Number(rank);
    if (!item || !Number.isFinite(r) || r < 30) continue;
    // Snap to the highest valid rank not above r.
    state.items[id] = validRanks(item).filter((v) => v <= r).pop();
  }

  const keys = new Set([...data.starChart.nodes, ...data.starChart.junctions].map(nodeKey));
  for (const field of ['nodes', 'steelPath']) {
    for (const [k, v] of Object.entries(raw[field] || {})) if (v === true && keys.has(k)) state[field][k] = true;
  }

  for (const [kind, def] of Object.entries(data.intrinsics)) {
    for (const tree of def.trees) {
      const v = Math.trunc(Number(raw.intrinsics?.[kind]?.[tree]));
      if (v > 0) state.intrinsics[kind][tree] = Math.min(v, def.maxRank);
    }
  }

  for (const k of Object.keys(state.plan)) if (typeof raw.plan?.[k] === 'boolean') state.plan[k] = raw.plan[k];
  for (const k of Object.keys(state.speed)) {
    const v = Number(raw.speed?.[k]);
    if (SPEED_STEPS.includes(v)) state.speed[k] = v;
  }

  const goal = Math.trunc(Number(raw.goal));
  if (goal >= 1 && goal <= 60) state.goal = goal;
  return state;
}

/** All totals the UI needs, computed in one pass. */
export function computeProgress(data, state) {
  const byCategory = {};
  for (const key of Object.keys(data.categories)) byCategory[key] = { earned: 0, max: 0, done: 0, count: 0 };

  let itemsEarned = 0;
  let itemsMax = 0;
  for (const item of data.items) {
    const c = byCategory[item.category];
    const xp = itemXp(item, state.items[item.id]);
    c.earned += xp;
    c.max += item.mastery;
    c.count++;
    if (xp === item.mastery) c.done++;
    itemsEarned += xp;
    itemsMax += item.mastery;
  }

  const allNodes = [...data.starChart.nodes, ...data.starChart.junctions];
  const chart = (field) => {
    let earned = 0, max = 0, done = 0;
    for (const n of allNodes) {
      max += n.xp;
      if (state[field][nodeKey(n)]) { earned += n.xp; done++; }
    }
    return { earned, max, done, count: allNodes.length };
  };
  const starChart = chart('nodes');
  const steelPath = chart('steelPath');

  const intrinsics = {};
  for (const [kind, def] of Object.entries(data.intrinsics)) {
    const ranks = def.trees.reduce((s, t) => s + (state.intrinsics[kind]?.[t] || 0), 0);
    intrinsics[kind] = { earned: ranks * def.xpPerRank, max: def.trees.length * def.maxRank * def.xpPerRank, done: ranks, count: def.trees.length * def.maxRank };
  }

  const sources = { items: { earned: itemsEarned, max: itemsMax }, starChart, steelPath, ...intrinsics };
  const total = Object.values(sources).reduce((s, x) => s + x.earned, 0);
  const max = Object.values(sources).reduce((s, x) => s + x.max, 0);
  const impossible = data.items.filter((i) => i.exclusive?.impossible && !state.items[i.id]).reduce((s, i) => s + i.mastery, 0);
  const reachable = max - impossible;

  const rank = rankForXp(total);
  const curFloor = xpForRank(rank);
  const next = xpForRank(rank + 1);

  return {
    total,
    max,
    reachable,                          // max minus items that can never be obtained (Founders) and aren't owned
    rank,
    toNext: next - total,
    pctToNext: (total - curFloor) / (next - curFloor),
    maxRank: rankForXp(reachable),
    sources,
    byCategory,
  };
}

/** Progress toward a target rank. */
export function goalStatus(progress, goal) {
  const need = xpForRank(goal);
  return {
    goal,
    need,
    remaining: Math.max(0, need - progress.total),
    reached: progress.total >= need,
    reachable: progress.reachable >= need,
  };
}

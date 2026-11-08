/**
 * Route planner: the order in which to master things to reach a target rank
 * in as few active hours as possible.
 *
 * Everything still missing becomes a task (items, star chart planets, Steel
 * Path planets, intrinsic ranks) with an XP value and an hour estimate. The
 * route is built greedily: at each step take the available task with the best
 * XP per hour. "Available" means its Mastery Rank requirement is met by the
 * XP collected so far, its predecessor is done (intrinsic ranks go in order)
 * and, for Steel Path, the normal star chart is finished. Greedy by ratio is
 * the classic answer to "reach an XP target in minimum time" when tasks are
 * small compared to the target, and it is easy to explain step by step.
 * Pure functions: no DOM, no storage.
 */
import { CATEGORIES, MR_MAX, rankForXp, xpForRank } from './mastery.js';
import { DEFAULTS as EFFORT_DEFAULTS, METHODS, estimateEffort, levelCycleHours } from './effort.js';
import { computeProgress, itemXp, nodeKey } from './progress.js';

export const PLAN_DEFAULTS = {
  noPlat: false,               // skip things that need platinum (Market-for-plat, Prime Vault trading)
  chartFirst: false,           // finish the normal star chart before anything else (new players)
  farmSpeed: 1,                // scales star chart / intrinsic time like effort.configFor does
  includeLimited: false,       // include things you can't farm on demand (Baro, events, invasions, …)
  includeLowConfidence: true,  // include items whose acquisition was guessed
  starChartNodeMinutes: 6,
  junctionMinutes: 10,
  steelPathNodeMinutes: 9,
  intrinsicPointHours: { railjack: 0.3, drifter: 0.25 }, // one intrinsic point; rank r costs r points
};

const PLAT_METHODS = new Set(['market_plat', 'prime_vault']);

/** Short, groupable label for the place a farm happens. */
export function farmPlace(location) {
  return location
    .replace(/, Rotation [ABC]$/, '')
    .replace(/\s*\(Level\s+[\d\s-]+(.*?Bounty)\)/, ' ($1)')
    .replace(/ \((Radiant|Exceptional|Flawless|Intact)\)$/, '')
    .trim();
}

function itemGroup(item, effort) {
  const a = item.acq;
  switch (a.method) {
    case 'market': return { key: 'market', label: 'Market alışverişi (kredi ile plan)' };
    case 'market_plat': return { key: 'market_plat', label: 'Market (platinle hazır al)' };
    case 'dojo': return { key: `dojo:${a.source}`, label: `Klan Dojo — ${a.source}` };
    case 'vendor': return { key: `vendor:${a.source}`, label: `Satıcı — ${a.source}` };
    case 'relic': return { key: 'relic', label: 'Void Relic farmı (Prime parçaları)' };
    case 'adversary': return { key: `adv:${a.source}`, label: a.source };
    case 'quest': return { key: `quest:${a.source}`, label: `Görev: ${a.source}` };
    case 'companion': return { key: 'companion', label: 'Yoldaş yetiştirme' };
    case 'drop':
    case 'bounty': {
      if (!a.parts.length) return { key: 'farm:?', label: 'Farm (kaynak belirsiz)' };
      // Group by the slowest part's place: that is where the time goes.
      const slowest = [...a.parts].sort((x, y) => x.chance - y.chance)[0];
      const place = farmPlace(slowest.location);
      return { key: `farm:${place}`, label: `Farm — ${place}` };
    }
    default: return { key: a.method, label: effort.label };
  }
}

/** Every task that still gives XP, with exclusions counted by reason. */
export function buildTasks(data, state, opts = {}, effortCfg = EFFORT_DEFAULTS) {
  const o = { ...PLAN_DEFAULTS, ...opts };
  const tasks = [];
  const skipped = { plat: 0, limited: 0, lowConfidence: 0, impossible: 0 };

  for (const item of data.items) {
    const rank = state.items[item.id] || 0;
    const left = item.mastery - itemXp(item, rank);
    if (left <= 0) continue;
    const effort = estimateEffort(item, item.acq, effortCfg);
    const meta = METHODS[item.acq.method] || METHODS.unknown;
    if (meta.impossible) { skipped.impossible++; continue; }

    let hours;
    if (rank >= 30) {
      // Already owned and at 30+: only the remaining Forma cycles are left.
      const cycles = (item.maxRank - rank) / 2;
      hours = cycles * (levelCycleHours(item, effortCfg) + effortCfg.formaHours);
    } else {
      if (o.noPlat && PLAT_METHODS.has(item.acq.method)) { skipped.plat++; continue; }
      if (!o.includeLimited && meta.limited) { skipped.limited++; continue; }
      if (!o.includeLowConfidence && item.acq.confidence === 'düşük') { skipped.lowConfidence++; continue; }
      hours = effort.totalHours;
    }
    tasks.push({
      id: `item:${item.id}`, kind: 'item', itemId: item.id, name: item.name,
      sub: CATEGORIES[item.category].label, xp: left, hours,
      mrReq: rank >= 30 ? 0 : item.masteryReq || 0, group: itemGroup(item, effort),
    });
  }

  // Star chart and Steel Path: one task per planet.
  const planets = new Map();
  for (const n of [...data.starChart.junctions, ...data.starChart.nodes]) {
    if (!planets.has(n.planet)) planets.set(n.planet, []);
    planets.get(n.planet).push(n);
  }
  for (const [planet, nodes] of planets) {
    for (const [field, kind] of [['nodes', 'chart'], ['steelPath', 'sp']]) {
      const todo = nodes.filter((n) => !state[field][nodeKey(n)]);
      if (!todo.length) continue;
      const minutes = o.farmSpeed * todo.reduce((s, n) => {
        const junction = !n.type;
        if (kind === 'sp') return s + (junction ? o.junctionMinutes : o.steelPathNodeMinutes);
        return s + (junction ? o.junctionMinutes : o.starChartNodeMinutes);
      }, 0);
      tasks.push({
        id: `${kind}:${planet}`, kind, name: planet, sub: `${todo.length} görev`,
        xp: todo.reduce((s, n) => s + n.xp, 0), hours: minutes / 60, mrReq: 0,
        group: kind === 'chart' ? { key: 'chart', label: 'Gezegen haritası görevleri' } : { key: 'sp', label: 'Steel Path görevleri' },
        needsChart: kind === 'sp',
      });
    }
  }

  // Intrinsics: one task per rank; rank r costs r points and needs rank r-1.
  for (const [kind, def] of Object.entries(data.intrinsics)) {
    for (const tree of def.trees) {
      const have = state.intrinsics[kind]?.[tree] || 0;
      for (let r = have + 1; r <= def.maxRank; r++) {
        tasks.push({
          id: `intr:${kind}:${tree}:${r}`, kind: 'intrinsic', name: `${tree} ${r}`, sub: def.label,
          xp: def.xpPerRank, hours: r * o.intrinsicPointHours[kind] * o.farmSpeed, mrReq: 0,
          group: { key: `intr:${kind}`, label: def.label },
          after: r > have + 1 ? `intr:${kind}:${tree}:${r - 1}` : null,
        });
      }
    }
  }

  for (const t of tasks) t.xpPerHour = t.hours > 0 ? t.xp / t.hours : Number.MAX_VALUE;
  return { tasks, skipped, chartFirst: o.chartFirst };
}

/**
 * Greedy route from the current state to `goal` (a rank, 31 = L1).
 * Returns the ordered steps (each annotated with cumulative XP/hours and the
 * rank after it), whether the goal is reached, and why not if it isn't.
 */
export function planRoute(data, state, goal, opts = {}, effortCfg = EFFORT_DEFAULTS) {
  const startXp = computeProgress(data, state).total;
  const goalXp = xpForRank(goal);
  const { tasks, skipped, chartFirst } = buildTasks(data, state, opts, effortCfg);
  const first = (t) => (chartFirst && t.kind === 'chart' ? 1 : 0);
  const pool = [...tasks].sort((a, b) => first(b) - first(a) || b.xpPerHour - a.xpPerHour);
  const done = new Set();
  let chartLeft = tasks.filter((t) => t.kind === 'chart').length;

  let xp = startXp;
  let hours = 0;
  const steps = [];
  while (xp < goalXp && pool.length) {
    const rank = rankForXp(xp);
    const idx = pool.findIndex((t) => t.mrReq <= rank && (!t.after || done.has(t.after)) && (!t.needsChart || chartLeft === 0));
    if (idx < 0) break;
    const [t] = pool.splice(idx, 1);
    done.add(t.id);
    if (t.kind === 'chart') chartLeft--;
    xp += t.xp;
    hours += t.hours;
    steps.push({ ...t, cumXp: xp, cumHours: hours, rankAfter: rankForXp(xp) });
  }

  const reached = xp >= goalXp;
  const gated = !reached && pool.length > 0;
  return {
    goal, goalXp, startXp, endXp: xp, reached, steps, totalHours: hours,
    remainingXp: Math.max(0, goalXp - startXp),
    shortBy: reached ? 0 : goalXp - xp,
    reason: reached ? null : gated ? 'gated' : 'exhausted',
    skipped, milestones: milestones(steps, startXp),
  };
}

/** Hours at which each rank is reached along the route. */
export function milestones(steps, startXp) {
  const out = [];
  let rank = rankForXp(startXp);
  for (const s of steps) {
    while (s.rankAfter > rank) {
      rank++;
      out.push({ rank, hours: s.cumHours });
    }
  }
  return out;
}

const PHASE_ENDS = [5, 10, 15, 20, 25, 28, MR_MAX];

/**
 * Splits the route into phases at rank milestones and groups each phase's
 * steps by activity, keeping the order in which activities first appear.
 */
export function phases(route) {
  const ends = [...PHASE_ENDS, ...Array.from({ length: Math.max(0, route.goal - MR_MAX) }, (_, i) => MR_MAX + 1 + i)];
  const out = [];
  let current = null;
  let fromRank = rankForXp(route.startXp);
  for (const s of route.steps) {
    if (!current) current = { fromRank, toRank: null, steps: [] };
    current.steps.push(s);
    const crossed = ends.find((e) => e > fromRank && s.rankAfter >= e);
    if (crossed) {
      current.toRank = s.rankAfter;
      out.push(current);
      fromRank = s.rankAfter;
      current = null;
    }
  }
  if (current) { current.toRank = current.steps.at(-1).rankAfter; out.push(current); }

  for (const ph of out) {
    const groups = new Map();
    for (const s of ph.steps) {
      if (!groups.has(s.group.key)) groups.set(s.group.key, { ...s.group, steps: [], xp: 0, hours: 0 });
      const g = groups.get(s.group.key);
      g.steps.push(s);
      g.xp += s.xp;
      g.hours += s.hours;
    }
    ph.groups = [...groups.values()];
    ph.xp = ph.steps.reduce((a, s) => a + s.xp, 0);
    ph.hours = ph.steps.reduce((a, s) => a + s.hours, 0);
  }
  return out;
}

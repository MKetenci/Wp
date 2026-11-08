import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { computeProgress, emptyState, goalStatus, itemXp, nodeKey, sanitizeState, validRanks } from '../web/js/progress.js';
import { xpForRank } from '../web/js/mastery.js';

const data = JSON.parse(fs.readFileSync(new URL('../web/data/mastery.json', import.meta.url), 'utf8'));
const item = (name) => data.items.find((i) => i.name === name);

test('empty state has zero progress and full max', () => {
  const p = computeProgress(data, emptyState());
  assert.equal(p.total, 0);
  assert.equal(p.rank, 0);
  assert.equal(p.max, data.meta.totals.all);
  assert.equal(p.toNext, xpForRank(1));
});

test('everything completed reaches the data maximum', () => {
  const s = emptyState();
  for (const i of data.items) s.items[i.id] = i.maxRank;
  for (const n of [...data.starChart.nodes, ...data.starChart.junctions]) {
    s.nodes[nodeKey(n)] = true;
    s.steelPath[nodeKey(n)] = true;
  }
  for (const [kind, def] of Object.entries(data.intrinsics)) for (const t of def.trees) s.intrinsics[kind][t] = def.maxRank;
  const p = computeProgress(data, s);
  assert.equal(p.total, data.meta.totals.all);
  assert.equal(p.rank, 36); // L6
  for (const c of Object.values(p.byCategory)) assert.equal(c.done, c.count);
});

test('rank-40 items: partial forma progress', () => {
  const kuva = item('Kuva Bramma');
  assert.deepEqual(validRanks(kuva), [30, 32, 34, 36, 38, 40]);
  assert.deepEqual(validRanks(item('Braton')), [30]);
  assert.equal(itemXp(kuva, 30), 3000);
  assert.equal(itemXp(kuva, 36), 3600);
  assert.equal(itemXp(kuva, 40), 4000);
  assert.equal(itemXp(item('Excalibur'), 30), 6000);
  assert.equal(itemXp(item('Excalibur'), undefined), 0);
});

test('reachable excludes Founders items unless owned', () => {
  const p = computeProgress(data, emptyState());
  assert.equal(p.max - p.reachable, 12_000);
  const s = emptyState();
  s.items[item('Excalibur Prime').id] = 30;
  assert.equal(computeProgress(data, s).max - computeProgress(data, s).reachable, 6_000);
});

test('goal status', () => {
  const s = emptyState();
  s.items[item('Excalibur').id] = 30;
  const p = computeProgress(data, s);
  const g = goalStatus(p, 1);
  assert.equal(g.reached, true);
  const l6 = goalStatus(p, 36);
  assert.equal(l6.reachable, true);
  assert.equal(l6.remaining, xpForRank(36) - 6000);
  assert.equal(goalStatus(p, 37).reachable, false); // L7 is beyond everything obtainable
});

test('sanitizeState drops junk and clamps values', () => {
  const kuva = item('Kuva Bramma');
  const s = sanitizeState({
    items: { [kuva.id]: 37, [item('Braton').id]: 40, nope: 30, [item('Mag').id]: 'x', [item('Volt').id]: 12 },
    nodes: { 'Mercury/Caloris': true, 'Fake/Node': true },
    steelPath: { 'Mercury/Caloris': 'yes' },
    intrinsics: { railjack: { Tactical: 99, Piloting: -3, Bogus: 5 }, drifter: { Combat: 4.7 } },
    goal: 'L3',
  }, data);
  assert.deepEqual(s.items, { [kuva.id]: 36, [item('Braton').id]: 30 });
  assert.deepEqual(s.nodes, { 'Mercury/Caloris': true });
  assert.deepEqual(s.steelPath, {});
  assert.deepEqual(s.intrinsics, { railjack: { Tactical: 10 }, drifter: { Combat: 4 } });
  assert.equal(s.goal, 30);
  assert.deepEqual(sanitizeState(null, data), emptyState());
});

test('sanitizeState keeps valid plan options and speed steps only', () => {
  const s = sanitizeState({ plan: { noPlat: true, chartFirst: 'yes' }, speed: { levelSpeed: 0.5, farmSpeed: 3 } }, data);
  assert.equal(s.plan.noPlat, true);
  assert.equal(s.plan.chartFirst, false);
  assert.equal(s.speed.levelSpeed, 0.5);
  assert.equal(s.speed.farmSpeed, 1);
});

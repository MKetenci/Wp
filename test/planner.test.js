import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildTasks, farmPlace, phases, planRoute } from '../web/js/planner.js';
import { emptyState, nodeKey } from '../web/js/progress.js';
import { rankForXp, xpForRank } from '../web/js/mastery.js';

const data = JSON.parse(fs.readFileSync(new URL('../web/data/mastery.json', import.meta.url), 'utf8'));
const item = (name) => data.items.find((i) => i.name === name);

test('route reaches MR 30 from scratch and respects MR requirements', () => {
  const r = planRoute(data, emptyState(), 30);
  assert.equal(r.reached, true);
  assert.ok(r.endXp >= xpForRank(30));
  let xp = 0;
  for (const s of r.steps) {
    assert.ok(s.mrReq <= rankForXp(xp), `${s.name} needs MR ${s.mrReq} at ${xp} XP`);
    xp += s.xp;
  }
});

test('cumulative hours and XP are consistent', () => {
  const r = planRoute(data, emptyState(), 20);
  let h = 0;
  let xp = r.startXp;
  for (const s of r.steps) { h += s.hours; xp += s.xp; assert.equal(s.cumXp, xp); }
  assert.ok(Math.abs(h - r.totalHours) < 1e-6);
  // the route stops as soon as the goal is reached
  assert.ok(r.steps.at(-2).cumXp < xpForRank(20));
});

test('intrinsic ranks come in order and Steel Path waits for the star chart', () => {
  const r = planRoute(data, emptyState(), 36, { includeLimited: true });
  const pos = new Map(r.steps.map((s, i) => [s.id, i]));
  for (const s of r.steps.filter((x) => x.after)) assert.ok(pos.get(s.after) < pos.get(s.id), s.id);
  const lastChart = Math.max(...r.steps.map((s, i) => (s.kind === 'chart' ? i : -1)));
  const firstSp = r.steps.findIndex((s) => s.kind === 'sp');
  if (firstSp >= 0) assert.ok(firstSp > lastChart);
});

test('options exclude platinum and limited items', () => {
  const ids = (opts) => new Set(buildTasks(data, emptyState(), opts).tasks.map((t) => t.itemId));
  assert.ok(!ids({}).has(item('Volt Prime').id), 'limited by default');
  assert.ok(ids({ includeLimited: true }).has(item('Volt Prime').id));
  assert.ok(!ids({ noPlat: true, includeLimited: true }).has(item('Volt Prime').id), 'Prime Vault needs plat');
  assert.ok(!ids({ noPlat: true }).has(item('Cinta').id), 'Market for plat');
  assert.ok(!ids({ includeLimited: true }).has(item('Excalibur Prime').id), 'impossible is never planned');
});

test('mastered items are skipped; rank-40 items at 30 only need Forma cycles', () => {
  const s = emptyState();
  s.items[item('Braton').id] = 30;
  s.items[item('Kuva Bramma').id] = 36;
  const { tasks } = buildTasks(data, s);
  assert.ok(!tasks.some((t) => t.itemId === item('Braton').id));
  const kuva = tasks.find((t) => t.itemId === item('Kuva Bramma').id);
  assert.equal(kuva.xp, 400);
  assert.ok(Math.abs(kuva.hours - 2 * (0.5 + 0.2)) < 1e-9);
});

test('completed star chart planets are not planned', () => {
  const s = emptyState();
  for (const n of data.starChart.nodes.filter((x) => x.planet === 'Eris')) s.nodes[nodeKey(n)] = true;
  for (const n of data.starChart.junctions.filter((x) => x.planet === 'Eris')) s.nodes[nodeKey(n)] = true;
  assert.ok(!buildTasks(data, s).tasks.some((t) => t.id === 'chart:Eris'));
});

test('unreachable goal is reported with the shortfall', () => {
  const r = planRoute(data, emptyState(), 40);
  assert.equal(r.reached, false);
  assert.ok(r.shortBy > 0);
});

test('phases cover every step once', () => {
  const r = planRoute(data, emptyState(), 31);
  const ph = phases(r);
  assert.equal(ph.reduce((n, p) => n + p.steps.length, 0), r.steps.length);
  assert.equal(ph.reduce((n, p) => n + p.groups.reduce((m, g) => m + g.steps.length, 0), 0), r.steps.length);
  assert.equal(ph.at(-1).toRank, r.steps.at(-1).rankAfter);
});

test('farm place labels are groupable', () => {
  assert.equal(farmPlace('Sedna/Kappa (Disruption), Rotation C'), 'Sedna/Kappa (Disruption)');
  assert.equal(farmPlace('Earth/Cetus (Level 50 - 70 Cetus Bounty), Rotation B'), 'Earth/Cetus (Cetus Bounty)');
});

test('chartFirst finishes the star chart before anything else', () => {
  const r = planRoute(data, emptyState(), 30, { chartFirst: true });
  const kinds = r.steps.map((s) => s.kind);
  const lastChart = kinds.lastIndexOf('chart');
  assert.ok(lastChart >= 0);
  assert.ok(kinds.slice(0, lastChart + 1).every((k) => k === 'chart'));
});

test('farmSpeed scales star chart and intrinsic time', () => {
  const t1 = buildTasks(data, emptyState(), {}).tasks.find((t) => t.id === 'chart:Eris');
  const t2 = buildTasks(data, emptyState(), { farmSpeed: 2 }).tasks.find((t) => t.id === 'chart:Eris');
  assert.ok(Math.abs(t2.hours - 2 * t1.hours) < 1e-9);
});

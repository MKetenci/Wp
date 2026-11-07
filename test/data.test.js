/** Sanity checks on the committed build output (data/mastery-data.json). */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../web/js/mastery.js';
import fs from 'node:fs';

const readJson = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const data = readJson('../data/mastery-data.json');
const expected = readJson('../data/raw/expected_totals.json');

const sum = (list, key = 'mastery') => list.reduce((s, x) => s + x[key], 0);

test('ids and names are unique', () => {
  assert.equal(new Set(data.items.map((i) => i.id)).size, data.items.length);
  assert.equal(new Set(data.items.map((i) => i.name)).size, data.items.length);
});

test('every item has a valid category and consistent mastery', () => {
  for (const i of data.items) {
    assert.ok(M.CATEGORIES[i.category], `${i.name}: ${i.category}`);
    assert.equal(i.mastery, M.itemMastery(i.category, i.maxRank), i.name);
    assert.ok([30, 40].includes(i.maxRank), `${i.name}: maxRank ${i.maxRank}`);
    assert.equal(i.forma, i.maxRank === 40 ? 5 : 0, i.name);
  }
});

test('grand total equals the wiki total', () => {
  const sc = sum(data.starChart.nodes, 'xp') + sum(data.starChart.junctions, 'xp');
  const intr = Object.values(data.intrinsics).reduce((s, x) => s + x.trees.length * x.maxRank * x.xpPerRank, 0);
  const total = sum(data.items) + 2 * sc + intr;
  assert.equal(total, expected.rows.Total.xp);
  assert.equal(data.meta.totals.all, total);
});

test('star chart: 13 junctions worth 1000 each', () => {
  assert.equal(data.starChart.junctions.length, 13);
  for (const j of data.starChart.junctions) assert.equal(j.xp, M.JUNCTION_XP);
  assert.ok(data.starChart.nodes.every((n) => n.xp > 0));
});

test('known items are classified correctly', () => {
  const get = (n) => data.items.find((i) => i.name === n);
  assert.equal(get('Excalibur').mastery, 6_000);
  assert.equal(get('Kuva Bramma').maxRank, 40);
  assert.equal(get('Voidrig').mastery, 8_000);
  assert.equal(get('Excalibur Prime').exclusive.group, 'founders');
  assert.equal(get('Excalibur Prime').exclusive.impossible, true);
  assert.equal(get('Corvas Prime').category, 'archgun');
  assert.ok(get('Plexus'));
});

test('only Founders items are impossible to obtain', () => {
  const impossible = data.items.filter((i) => i.exclusive?.impossible).map((i) => i.name).sort();
  assert.deepEqual(impossible, ['Excalibur Prime', 'Lato Prime', 'Skana Prime']);
});

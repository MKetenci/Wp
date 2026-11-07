'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/mastery');

test('rank thresholds match the wiki table', () => {
  // https://wiki.warframe.com/w/Mastery_Rank#Mastery_Ranks_Allocation
  const table = { 1: 2_500, 10: 250_000, 29: 2_102_500, 30: 2_250_000, 31: 2_397_500, 35: 2_987_500, 36: 3_135_000, 51: 5_347_500 };
  for (const [rank, xp] of Object.entries(table)) assert.equal(M.xpForRank(Number(rank)), xp, `rank ${rank}`);
});

test('rankForXp is the inverse of xpForRank at the boundaries', () => {
  for (let r = 0; r <= 45; r++) {
    assert.equal(M.rankForXp(M.xpForRank(r)), r, `exactly at rank ${r}`);
    if (r > 0) assert.equal(M.rankForXp(M.xpForRank(r) - 1), r - 1, `just below rank ${r}`);
  }
});

test('rank labels', () => {
  assert.equal(M.rankLabel(0), 'MR 0');
  assert.equal(M.rankLabel(30), 'MR 30');
  assert.equal(M.rankLabel(31), 'L1');
  assert.equal(M.rankLabel(36), 'L6');
});

test('item mastery by category and max rank', () => {
  assert.equal(M.itemMastery('primary'), 3_000);
  assert.equal(M.itemMastery('primary', 40), 4_000);
  assert.equal(M.itemMastery('warframe'), 6_000);
  assert.equal(M.itemMastery('necramech', 40), 8_000);
  assert.equal(M.itemMastery('kdrive'), 6_000);
  assert.equal(M.itemMastery('amp'), 3_000);
  assert.throws(() => M.itemMastery('nope'));
});

test('forma needed for rank 40', () => {
  assert.equal(M.formaForMaxRank(30), 0);
  assert.equal(M.formaForMaxRank(40), 5);
});

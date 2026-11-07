import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULTS, METHODS, attemptMinutes, estimateEffort, expectedAttempts, levelHours, partsHours, resourceHours } from '../web/js/effort.js';

const data = JSON.parse(fs.readFileSync(new URL('../web/data/mastery.json', import.meta.url), 'utf8'));
const item = (name) => data.items.find((i) => i.name === name);
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('expectedAttempts: coupon collector', () => {
  close(expectedAttempts([0.5]), 2);
  close(expectedAttempts([0.5, 0.5]), 3);                 // 2 + 2 - 1
  close(expectedAttempts([1 / 3, 1 / 3, 1 / 3]), 5.5);    // 3 · (1 + 1/2 + 1/3)
  close(expectedAttempts([0.1, 0.1]), 15);                // 10 + 10 - 5
  assert.equal(expectedAttempts([0.5, 0]), Infinity);
});

test('parts at the same location compete; different locations add up', () => {
  const same = partsHours([{ location: 'X (Assassination)', chance: 50 }, { location: 'X (Assassination)', chance: 50 }]);
  const apart = partsHours([{ location: 'X (Assassination)', chance: 50 }, { location: 'Y (Assassination)', chance: 50 }]);
  close(same, (3 * 8) / 60);
  close(apart, (2 * 8 + 2 * 8) / 60);
});

test('attempt minutes by source type', () => {
  assert.equal(attemptMinutes('Axi V1 Relic (Radiant)'), 8);
  assert.equal(attemptMinutes('Earth/Cetus (Level 50 - 70 Cetus Bounty), Rotation B'), 15);
  assert.equal(attemptMinutes('Sedna/Kappa (Disruption), Rotation C'), 16);
  assert.equal(attemptMinutes('Mars/War (Assassination)'), 8);
  assert.equal(attemptMinutes('Corrupted Vor'), DEFAULTS.defaultAttemptMinutes);
});

test('resources: commons are cheap, rare ones cost time', () => {
  assert.ok(resourceHours([{ name: 'Ferrite', count: 1000 }]) < 0.05);
  close(resourceHours([{ name: 'Orokin Cell', count: 3 }]), 0.12);
  close(resourceHours([{ name: 'Mystery Ore', count: 10 }]), 0.3);
});

test('levelling: forma and gilding add cycles', () => {
  close(levelHours(item('Braton')), 0.5);
  close(levelHours(item('Kuva Bramma')), 0.5 * 6 + 5 * 0.2);
  close(levelHours(item('Balla')), 0.5 * 2);
  close(levelHours(item('Voidrig')), 1 * 6 + 5 * 0.2);
});

test('every item has a known method and a finite estimate unless impossible', () => {
  for (const i of data.items) {
    assert.ok(METHODS[i.acq.method], `${i.name}: ${i.acq.method}`);
    assert.ok(['yüksek', 'orta', 'düşük'].includes(i.acq.confidence), i.name);
    const e = estimateEffort(i, i.acq);
    if (e.impossible) assert.equal(e.xpPerHour, 0, i.name);
    else assert.ok(Number.isFinite(e.totalHours) && e.totalHours > 0, `${i.name}: ${e.totalHours}`);
  }
});

test('known items are classified as expected', () => {
  const m = (n) => item(n).acq.method;
  assert.equal(m('Tigris'), 'market');
  assert.equal(m('Lenz'), 'dojo');
  assert.equal(m('Kuva Bramma'), 'adversary');
  assert.equal(m('Tenet Envoy'), 'adversary');
  assert.equal(m('Rakta Cernos'), 'vendor');
  assert.equal(m('Balla'), 'vendor');           // bought from Hok, not the 3.6 % Conclave drop
  assert.equal(m('Lavos'), 'vendor');           // Father, not the Orphix event
  assert.equal(m('Equinox'), 'drop');           // Day/Night Aspect from Tyl Regor
  assert.equal(m('Gauss'), 'drop');
  assert.equal(m('Caliban'), 'bounty');
  assert.equal(m('Excalibur Prime'), 'founders');
  assert.equal(m('Volt Prime'), 'prime_vault');
  assert.equal(m('Excalibur Umbra'), 'quest');
  assert.equal(m('Nidus'), 'drop');             // quest gives the blueprint, parts are farmed
  assert.ok(item('Nidus').acq.requires.includes('Görev: The Glast Gambit'));
  assert.ok(item('Sibear').acq.requires.some((r) => r.startsWith('Magistar')));
});

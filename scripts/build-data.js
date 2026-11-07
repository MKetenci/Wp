/**
 * Builds data/mastery-data.json and data/rapor.md from the raw wiki snapshot
 * (data/raw/, see fetch-sources.js) and the @wfcd/items package.
 *
 * - Which items grant mastery, and how much: wiki data modules, filtered with
 *   the same rules the wiki uses for its "Total Mastery" table.
 * - How items are obtained (build cost/time, components, drop chances, vault):
 *   @wfcd/items, joined by internal name.
 * - Every category count/XP is checked against the wiki's rendered table;
 *   any mismatch fails the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import Items from '@wfcd/items';
import { loadLuaTable } from './lib/lua.js';
import { classify } from './lib/acquisition.js';
import renderReport from './lib/report.js';
import * as M from '../web/js/mastery.js';

const ROOT = path.join(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'data', 'raw');
const raw = (f) => path.join(RAW, f);
const WIKI = 'https://wiki.warframe.com/w/';

// ---------------------------------------------------------------- items ---

const items = [];

function addItem({ name, category, maxRank = 30, masteryReq, internalName, link, image, extra = {} }) {
  items.push({
    // Names are unique; internal names are not (the wiki reuses some for Prime variants).
    id: slugify(name),
    name,
    internalName: internalName || null,
    category,
    maxRank,
    mastery: M.itemMastery(category, maxRank),
    forma: M.formaForMaxRank(maxRank),
    gild: !!M.CATEGORIES[category].gild,
    masteryReq: masteryReq ?? null,
    wikiUrl: WIKI + encodeURIComponent((link || name).replace(/ /g, '_')).replace(/%2F/g, '/'),
    image: image || null,
    ...extra,
  });
}

const slugify = (s) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const countsForMastery = (e) => !e._IgnoreEntry && !e._IgnoreInMasteryCount;

// Weapons: same slot rules as Module:Weapons._getWeaponCount
const WEAPON_FILES = {
  'weapons_primary.lua': { Primary: 'primary' },
  'weapons_secondary.lua': { Secondary: 'secondary' },
  'weapons_melee.lua': { Melee: 'melee' },
  'weapons_archwing.lua': { Archgun: 'archgun', Archmelee: 'archmelee' },
  'weapons_companion.lua': { Robotic: 'robotic', Hound: 'hound_weapon' },
  'weapons_modular.lua': { Secondary: 'kitgun', Melee: 'zaw', Amp: 'amp' },
};
for (const [file, slots] of Object.entries(WEAPON_FILES)) {
  for (const w of Object.values(loadLuaTable(raw(file)))) {
    const category = slots[w.Slot];
    if (!category || !countsForMastery(w)) continue;
    addItem({
      name: w.Name, category, maxRank: w.MaxRank || 30, masteryReq: w.Mastery,
      internalName: w.InternalName, link: w.Link, image: w.Image,
      extra: { traits: Array.isArray(w.Traits) ? w.Traits : Object.values(w.Traits || {}) },
    });
  }
}

// Warframes, Archwings, Necramechs
const frames = loadLuaTable(raw('warframes.lua'));
for (const [table, category] of [['Warframes', 'warframe'], ['Archwings', 'archwing'], ['Necramechs', 'necramech']]) {
  for (const f of Object.values(frames[table])) {
    if (f._IgnoreEntry) continue;
    addItem({ name: f.Name, category, maxRank: f.MaxRank || 30, internalName: f.InternalName, link: f.Link, image: f.Image });
  }
}

// Companions (Sentinels, Kubrows, Kavats, MOAs, Hounds, Predasites, Vulpaphylas)
const COMPANION_TYPES = {
  Sentinel: 'sentinel', Kubrow: 'kubrow', Kavat: 'kavat', MOA: 'moa',
  Hound: 'hound', Predasite: 'predasite', Vulpaphyla: 'vulpaphyla',
};
for (const c of Object.values(loadLuaTable(raw('companions.lua')).Companions)) {
  const category = COMPANION_TYPES[c.Type.replace(/ \(.*\)$/, '')];
  if (!category) throw new Error(`Bilinmeyen yoldaş türü: ${c.Type} (${c.Name})`);
  if (c._IgnoreEntry) continue;
  addItem({ name: c.Name, category, masteryReq: c.Mastery, internalName: c.InternalName, link: c.Link, image: c.Image });
}

// Plexus (Railjack) — a single item, not in any data module.
addItem({ name: 'Plexus', category: 'plexus', link: 'Plexus', image: 'Plexus.png' });

// K-Drive boards — the wiki hard-codes the count; the boards come from WFCD.
const wfcd = new Items();
for (const k of wfcd.filter((i) => i.masterable && i.type === 'K-Drive Component')) {
  addItem({ name: k.name, category: 'kdrive', internalName: k.uniqueName, image: k.imageName });
}

// ------------------------------------------------- exclusive / hidden ---

/** Parses a <tabber> page of `{{Template|Item}} || ... ` rows into groups. */
function parseTabberGroups(text) {
  const groups = [];
  const parts = text.split(/^(?:\|-\|)?\s*([A-Z][\w '&-]*?)\s*=\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const body = parts[i + 1];
    const acquisition = (body.match(/'''Acquisition:'''\s*(.+)/) || [])[1];
    const rows = [...body.matchAll(/^\|\s*\{\{(?:WF|Weapon|Companion)\|([^}|]+)(?:\|[^}]*)?\}\}[^|\n]*\|\|([^\n]*)/gm)]
      .map((m) => ({ name: m[1].trim(), rest: m[2].split('||').map((s) => s.trim()) }));
    const total = body.match(/^!\s*Total:\s*!!\s*(\d+)\s*!!\s*([\d,]+)/m);
    groups.push({
      name: parts[i], acquisition: acquisition && stripWiki(acquisition), rows,
      statedTotal: total ? { count: Number(total[1]), xp: Number(total[2].replace(/,/g, '')) } : null,
    });
  }
  return groups;
}
const stripWiki = (s) => s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/<[^>]+>/g, '').trim();

// Availability classes used by the guide. "imkansiz" = can never be obtained again.
const EXCLUSIVE_GROUPS = {
  'Market Retired': { key: 'market_kaldirildi', label: 'Market\'ten kaldırıldı (nadir etkinlik)' },
  'Founders Pack':  { key: 'founders', label: 'Founders paketi — artık elde edilemez', impossible: true },
  'Nightwave':      { key: 'nightwave', label: 'Nightwave / özel yöntem' },
  'Event Reward':   { key: 'etkinlik', label: 'Etkinlik ödülü' },
  'Void Trader':    { key: 'baro', label: 'Baro Ki\'Teer (Void Trader)' },
  'Daily Tribute':  { key: 'gunluk_odul', label: 'Günlük giriş ödülü (Daily Tribute)' },
  'Prime Vault':    { key: 'prime_vault', label: 'Prime Vault — takas veya Prime Resurgence' },
};

const byName = new Map(items.map((it) => [it.name.toLowerCase(), it]));
const problems = [];  // fail the build
const warnings = [];  // shown in the report only

const exclusiveGroups = parseTabberGroups(fs.readFileSync(raw('exclusive_mastery.wiki'), 'utf8'));
let exclusiveCount = 0;
for (const g of exclusiveGroups) {
  const cls = EXCLUSIVE_GROUPS[g.name];
  if (!cls) { problems.push(`Bilinmeyen exclusive grubu: ${g.name}`); continue; }
  if (g.statedTotal && g.statedTotal.count !== g.rows.length) {
    warnings.push(`Exclusive Mastery sayfası, "${g.name}" grubu: elle yazılmış toplam ${g.statedTotal.count} eşya diyor, listede ${g.rows.length} satır var (satırlar esas alındı).`);
  }
  for (const row of g.rows) {
    const item = byName.get(row.name.toLowerCase());
    if (!item) { problems.push(`Exclusive listesindeki eşya veride yok: ${row.name}`); continue; }
    if (item.exclusive) problems.push(`${item.name} birden fazla exclusive grubunda`);
    item.exclusive = { group: cls.key, label: cls.label, acquisition: g.acquisition || null, impossible: !!cls.impossible };
    exclusiveCount++;
  }
}

for (const g of parseTabberGroups(fs.readFileSync(raw('hidden_mastery.wiki'), 'utf8'))) {
  for (const row of g.rows) {
    const item = byName.get(row.name.toLowerCase());
    // Rows look like: Mastery || Acquisition
    if (item) item.hiddenOnProfile = { acquisition: stripWiki(row.rest[1] || '') || null };
  }
}

// ------------------------------------------------ acquisition (WFCD) ---

const wfcdByUnique = new Map(wfcd.map((i) => [i.uniqueName, i]));
const wfcdByName = new Map();
for (const i of wfcd) {
  // Prefer the masterable entry when several share a name (e.g. Zaw strikes).
  if (!wfcdByName.has(i.name) || i.masterable) wfcdByName.set(i.name, i);
}

const topDrops = (drops = [], n = 5) =>
  [...drops]
    .sort((a, b) => (b.chance || 0) - (a.chance || 0))
    .slice(0, n)
    .map((d) => ({ location: d.location, chance: d.chance ?? null, rarity: d.rarity || null }));

let joined = 0;
for (const item of items) {
  const src = wfcdByName.get(item.name) || wfcdByUnique.get(item.internalName);
  if (!src) { item.acquisition = null; continue; }
  joined++;
  if (item.masteryReq == null && src.masteryReq != null) item.masteryReq = src.masteryReq;
  if (!item.image && src.imageName) item.image = src.imageName;
  item.isPrime = !!src.isPrime;
  item.acquisition = {
    tradable: !!src.tradable,
    vaulted: !!src.vaulted,
    marketCost: src.marketCost ?? null,       // platinum price in the in-game Market
    bpCost: src.bpCost ?? null,               // credits for the blueprint in the Market
    buildPrice: src.buildPrice ?? null,       // credits to build in the Foundry
    buildTimeSec: src.buildTime ?? null,
    drops: topDrops(src.drops),
    components: (src.components || []).map((c) => ({
      name: c.name,
      count: c.itemCount ?? 1,
      tradable: !!c.tradable,
      drops: topDrops(c.drops),
    })),
  };
}

// ------------------------------------------- acquisition method (how) ---

const researchData = loadLuaTable(raw('research.lua'));
const research = new Map(
  Object.entries(researchData.Research).map(([name, r]) => [name, { labName: researchData.Labs[r.Lab]?.Name || r.Lab }])
);
const overrides = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'acquisition-overrides.json'), 'utf8'));
for (const name of Object.keys(overrides)) {
  if (!name.startsWith('_') && !byName.has(name.toLowerCase())) problems.push(`Override'daki eşya veride yok: ${name}`);
}
const itemNames = new Set(items.map((i) => i.name));
for (const item of items) item.acq = classify(item, { research, overrides, itemNames });

// ---------------------------------------------------- star chart & co ---

const missionData = loadLuaTable(raw('missions.lua')).MissionDetails;
const nodes = [];
const junctions = [];
for (const n of Object.values(missionData)) {
  if (!(n.MasteryExp > 0)) continue;
  const entry = { name: n.Name, planet: n.Planet, type: n.Type, xp: n.MasteryExp, hidden: !!n.IsHidden };
  (n.Type === 'Solar Rail Junction' ? junctions : nodes).push(entry);
}
const byPlanetThenName = (a, b) => a.planet.localeCompare(b.planet) || a.name.localeCompare(b.name);
nodes.sort(byPlanetThenName);
junctions.sort(byPlanetThenName);

const intrinsics = {
  railjack: { label: 'Railjack Intrinsic\'leri', trees: ['Tactical', 'Piloting', 'Gunnery', 'Engineering', 'Command'], maxRank: 10, xpPerRank: M.INTRINSIC_XP_PER_RANK },
  drifter:  { label: 'Drifter Intrinsic\'leri', trees: ['Combat', 'Riding', 'Opportunity', 'Endurance'], maxRank: 10, xpPerRank: M.INTRINSIC_XP_PER_RANK },
};

items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

// ----------------------------------------------------------- validate ---

const expected = JSON.parse(fs.readFileSync(raw('expected_totals.json'), 'utf8'));
const sumXp = (list) => list.reduce((s, x) => s + (x.mastery ?? x.xp), 0);
const inCats = (...cats) => items.filter((i) => cats.includes(i.category));
const starChartXp = sumXp(nodes) + sumXp(junctions);
const intrinsicXp = (k) => intrinsics[k].trees.length * intrinsics[k].maxRank * intrinsics[k].xpPerRank;
const companionCats = ['kubrow', 'kavat', 'predasite', 'vulpaphyla', 'moa', 'hound', 'plexus'];

const actual = {
  'Warframes': inCats('warframe'),
  'Primaries': inCats('primary'),
  'Secondaries': inCats('secondary'),
  'Melee (including Zaws )': inCats('melee', 'zaw'),
  'Kitguns': inCats('kitgun'),
  'Sentinels': inCats('sentinel'),
  'Sentinel Weapons': inCats('robotic', 'hound_weapon'),
  'Robotic Weapons': inCats('robotic'),
  'Hound Weapons': inCats('hound_weapon'),
  'Companions': inCats(...companionCats),
  'Kubrows': inCats('kubrow'),
  'Kavats': inCats('kavat'),
  'Predasites': inCats('predasite'),
  'Vulpaphylas': inCats('vulpaphyla'),
  'MOAs': inCats('moa'),
  'Hounds': inCats('hound'),
  'Plexus': inCats('plexus'),
  'Archwings': inCats('archwing'),
  'Archguns': inCats('archgun'),
  'Archmelees': inCats('archmelee'),
  'Amps': inCats('amp'),
  'K-Drives': inCats('kdrive'),
  'Necramechs': inCats('necramech'),
};
const checks = Object.entries(actual).map(([row, list]) => ({ row, count: list.length, xp: sumXp(list) }));
checks.push({ row: 'Normal Missions (nodes + Junctions )', count: null, xp: starChartXp });
checks.push({ row: 'The Steel Path (nodes + Junctions )', count: null, xp: starChartXp });
checks.push({ row: 'Railjack Intrinsics', count: 50, xp: intrinsicXp('railjack') });
checks.push({ row: 'Drifter Intrinsics', count: 40, xp: intrinsicXp('drifter') });

const totalXp = sumXp(items) + 2 * starChartXp + intrinsicXp('railjack') + intrinsicXp('drifter');
const exclusiveXp = sumXp(items.filter((i) => i.exclusive));
checks.push({ row: 'Total', count: null, xp: totalXp });
// The wiki's "Minus Exclusives" row uses hand-entered numbers that lag behind
// the Exclusive Mastery page, so a mismatch there is only a warning.
const minusExp = expected.rows['Minus Exclusives'];
if (minusExp && minusExp.xp !== totalXp - exclusiveXp) {
  warnings.push(`Wiki'nin "Minus Exclusives" satırı ${minusExp.xp.toLocaleString('tr-TR')} XP diyor; Exclusive Mastery sayfasındaki güncel listeye göre ${(totalXp - exclusiveXp).toLocaleString('tr-TR')} XP (fark: elle girilmiş eski değerler).`);
}

for (const c of checks) {
  const exp = expected.rows[c.row];
  if (!exp) { problems.push(`Wiki tablosunda satır yok: ${c.row}`); continue; }
  if (c.xp !== exp.xp) problems.push(`${c.row}: XP ${c.xp} ≠ wiki ${exp.xp}`);
  if (c.count != null && c.count !== exp.count) problems.push(`${c.row}: adet ${c.count} ≠ wiki ${exp.count}`);
}
const ids = new Set();
for (const it of items) {
  if (ids.has(it.id)) problems.push(`Yinelenen id: ${it.id}`);
  ids.add(it.id);
}

// -------------------------------------------------------------- output ---

const sourceManifest = JSON.parse(fs.readFileSync(raw('manifest.json'), 'utf8'));
const data = {
  meta: {
    generatedFrom: {
      wiki: { fetchedAt: sourceManifest.fetchedAt, tableVersion: expected.version, license: 'CC BY-SA' },
      wfcdItems: JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', '@wfcd', 'items', 'package.json'), 'utf8')).version,
    },
    totals: {
      items: sumXp(items), starChart: starChartXp, steelPath: starChartXp,
      intrinsics: intrinsicXp('railjack') + intrinsicXp('drifter'), all: totalXp,
    },
  },
  categories: M.CATEGORIES,
  items,
  starChart: { nodes, junctions, steelPathRepeats: true },
  intrinsics,
};
fs.writeFileSync(path.join(ROOT, 'data', 'mastery-data.json'), JSON.stringify(data, null, 1) + '\n');

// Slim copy for the web app: raw drop/component lists are replaced by the classified `acq`.
const webData = {
  meta: data.meta,
  categories: data.categories,
  items: items.map((i) => ({
    id: i.id, name: i.name, category: i.category, mastery: i.mastery, maxRank: i.maxRank,
    masteryReq: i.masteryReq, gild: i.gild, isPrime: !!i.isPrime, wikiUrl: i.wikiUrl,
    vaulted: !!i.acquisition?.vaulted, tradable: !!i.acquisition?.tradable,
    exclusive: i.exclusive ? { group: i.exclusive.group, label: i.exclusive.label, impossible: i.exclusive.impossible } : null,
    hidden: i.hiddenOnProfile ? (i.hiddenOnProfile.acquisition || true) : null,
    forma: i.forma,
    acq: i.acq,
  })),
  starChart: {
    nodes: nodes.map(({ name, planet, type, xp }) => ({ name, planet, type, xp })),
    junctions: junctions.map(({ name, planet, xp }) => ({ name, planet, xp })),
  },
  intrinsics,
};
fs.writeFileSync(path.join(ROOT, 'web', 'data', 'mastery.json'), JSON.stringify(webData) + '\n');
fs.writeFileSync(path.join(ROOT, 'data', 'rapor.md'), renderReport({ data, checks, expected, joined, problems, warnings }));

console.log(`${items.length} eşya, ${nodes.length} görev + ${junctions.length} junction, toplam ${totalXp.toLocaleString('tr-TR')} XP`);
console.log(`WFCD eşleşmesi: ${joined}/${items.length}; exclusive: ${exclusiveCount}`);
if (warnings.length) console.warn('\nUyarılar:\n- ' + warnings.join('\n- '));
if (problems.length) {
  console.error('\nDoğrulama hataları:\n- ' + problems.join('\n- '));
  process.exit(1);
}
console.log('✓ Tüm kategoriler wiki toplamlarıyla eşleşiyor.');

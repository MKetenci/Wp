/**
 * Downloads raw source data from wiki.warframe.com into data/raw/.
 * The snapshot is committed so `npm run build:data` works offline and
 * every change in the source data shows up as a reviewable diff.
 *
 * Wiki content is CC BY-SA (https://wiki.warframe.com).
 */
import fs from 'node:fs';
import path from 'node:path';

const RAW = path.join(import.meta.dirname, '..', 'data', 'raw');
const WIKI = 'https://wiki.warframe.com';

const MODULES = {
  'weapons_primary.lua': 'Module:Weapons/data/primary',
  'weapons_secondary.lua': 'Module:Weapons/data/secondary',
  'weapons_melee.lua': 'Module:Weapons/data/melee',
  'weapons_archwing.lua': 'Module:Weapons/data/archwing',
  'weapons_companion.lua': 'Module:Weapons/data/companion',
  'weapons_modular.lua': 'Module:Weapons/data/modular',
  'warframes.lua': 'Module:Warframes/data',
  'companions.lua': 'Module:Companions/data',
  'missions.lua': 'Module:Missions/data',
  'exclusive_mastery.wiki': 'Exclusive_Mastery',
  'hidden_mastery.wiki': 'Hidden_Mastery',
};

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'warframe-mastery-rehberi (data fetch)' } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

/** The rendered "Total Mastery" table on [[Mastery Rank]] — our validation target. */
async function fetchExpectedTotals() {
  const url = `${WIKI}/api.php?action=parse&page=Mastery_Rank&prop=text&format=json&formatversion=2`;
  const html = JSON.parse(await get(url)).parse.text;
  const start = html.indexOf('Last updated');
  const table = html.slice(start, html.indexOf('</table>', start));
  const text = (s) => s.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, ' ').replace(/&#160;|&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const version = (text(table.slice(0, 400)).match(/Update [\d.]+ \(\d{4}-\d{2}-\d{2}\)/) || ['?'])[0];
  const rows = {};
  for (const tr of table.split(/<tr[^>]*>/).slice(1)) {
    const cells = tr.split(/<t[dh][^>]*>/).slice(1).map(text);
    if (cells.length !== 3 || !/^\d/.test(cells[1])) continue;
    const num = (s) => Number(s.replace(/\(.*$/, '').replace(/[^\d]/g, ''));
    rows[cells[0]] = { count: num(cells[1]), xp: num(cells[2]) };
  }
  if (!rows.Total) throw new Error('Mastery Rank toplam tablosu ayrıştırılamadı.');
  return { version, rows };
}

async function main() {
  if (process.env.HTTPS_PROXY && !process.env.NODE_USE_ENV_PROXY) {
    console.warn('Not: Proxy arkasındaysan NODE_USE_ENV_PROXY=1 ile çalıştır (Node >= 22.21).');
  }
  fs.mkdirSync(RAW, { recursive: true });
  const manifest = { fetchedAt: new Date().toISOString(), source: WIKI, license: 'CC BY-SA', files: {} };
  for (const [file, page] of Object.entries(MODULES)) {
    const body = await get(`${WIKI}/w/${encodeURI(page)}?action=raw`);
    fs.writeFileSync(path.join(RAW, file), body);
    manifest.files[file] = `${WIKI}/w/${page}`;
    console.log(`✓ ${page} (${(body.length / 1024).toFixed(0)} KB)`);
  }
  const expected = await fetchExpectedTotals();
  fs.writeFileSync(path.join(RAW, 'expected_totals.json'), JSON.stringify(expected, null, 2) + '\n');
  manifest.files['expected_totals.json'] = `${WIKI}/w/Mastery_Rank#Total_Mastery`;
  console.log(`✓ Mastery Rank toplam tablosu (${expected.version})`);
  fs.writeFileSync(path.join(RAW, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

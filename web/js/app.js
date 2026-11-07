import { CATEGORIES, MR_MAX, rankLabel, xpForRank } from './mastery.js';
import { computeProgress, emptyState, goalStatus, itemXp, nodeKey, validRanks } from './progress.js';
import { exportState, loadState, readImportFile, saveState } from './storage.js';
import { METHODS, estimateEffort } from './effort.js';

const $ = (sel) => document.querySelector(sel);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const pct = (a, b) => (b ? Math.min(100, (a / b) * 100) : 0);
const hrs = (h) => (!Number.isFinite(h) ? '—' : h < 1 ? `${Math.max(5, Math.round((h * 60) / 5) * 5)} dk` : `${h.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sa`);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Short badge text for exclusive groups (full label goes in the tooltip). */
const EXCLUSIVE_BADGE = {
  prime_vault: 'Prime Vault',
  baro: 'Baro',
  etkinlik: 'Etkinlik',
  gunluk_odul: 'Günlük ödül',
  nightwave: 'Nightwave',
  market_kaldirildi: 'Market dışı',
  founders: 'Elde edilemez',
};
const GROUP_LABELS = {
  warframe: 'Warframe', silah: 'Silahlar', 'modüler': 'Modüler silahlar',
  archwing: 'Archwing', 'araç': 'Araçlar', 'yoldaş': 'Yoldaşlar',
};
const PLANET_ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Phobos', 'Deimos', 'Ceres', 'Jupiter', 'Europa', 'Saturn', 'Uranus', 'Neptune', 'Pluto', 'Sedna', 'Eris'];

let data;
let state;
let progress;
const itemsById = new Map();
const effortById = new Map();

// ------------------------------------------------------------ boot ---

async function boot() {
  try {
    const res = await fetch('data/mastery.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    document.querySelector('main').innerHTML = `<p class="error">Veri yüklenemedi (${esc(err.message)}). Sayfayı bir web sunucusu üzerinden aç: <code>npm start</code></p>`;
    return;
  }
  for (const i of data.items) {
    itemsById.set(i.id, i);
    effortById.set(i.id, estimateEffort(i, i.acq));
  }
  state = loadState(data);

  setupHeader();
  setupItems();
  renderPlanets();
  renderIntrinsics();
  setupTabs();
  setupFileActions();
  const g = data.meta.generatedFrom;
  $('#data-source').textContent = `Veri sürümü: wiki ${g.wiki.tableVersion}, indirildi ${g.wiki.fetchedAt.slice(0, 10)} · WFCD ${g.wfcdItems}`;
  refresh();
}

/** Recompute totals and update everything that shows them. */
function refresh({ save = true } = {}) {
  progress = computeProgress(data, state);
  renderHeader();
  renderTabPills();
  renderChartSummary();
  renderPlanetHeaders();
  renderIntrinsicTotals();
  renderSummary();
  if (save && !saveState(state)) toast('İlerleme kaydedilemedi (tarayıcı depolaması kapalı olabilir).');
}

// ---------------------------------------------------------- header ---

function setupHeader() {
  const sel = $('#goal');
  const opts = [];
  for (let r = 5; r <= MR_MAX; r += 5) opts.push(r);
  for (let r = MR_MAX + 1; r <= MR_MAX + 10; r++) opts.push(r);
  sel.innerHTML = opts.map((r) => `<option value="${r}">${rankLabel(r)} — ${fmt(xpForRank(r))} XP</option>`).join('');
  if (!opts.includes(state.goal)) state.goal = MR_MAX;
  sel.value = String(state.goal);
  sel.addEventListener('change', () => { state.goal = Number(sel.value); refresh(); });
}

function renderHeader() {
  const p = progress;
  $('#rank-label').textContent = rankLabel(p.rank);
  $('#total-xp').textContent = fmt(p.total);
  $('#next-label').textContent = `Sonraki: ${rankLabel(p.rank + 1)}`;
  $('#next-remaining').textContent = `${fmt(p.toNext)} XP kaldı`;
  $('#next-bar').style.width = `${p.pctToNext * 100}%`;

  const g = goalStatus(p, state.goal);
  const status = $('#goal-status');
  status.className = 'goal-status';
  if (g.reached) { status.textContent = 'Ulaşıldı ✓'; status.classList.add('ok'); }
  else if (!g.reachable) { status.textContent = `Erişilemez — oyunda yeterli XP yok (${fmt(g.remaining)} XP gerekir)`; status.classList.add('bad'); }
  else status.textContent = `${fmt(g.remaining)} XP kaldı`;
  $('#goal-bar').style.width = `${pct(p.total, g.need)}%`;

  $('#reachable-note').textContent =
    `Bugün elde edilebilecek her şeyle ulaşılabilecek en yüksek rank: ${rankLabel(p.maxRank)} (${fmt(p.reachable)} XP). ` +
    `Oyundaki toplam: ${fmt(p.max)} XP.`;
}

function renderTabPills() {
  const s = progress.sources;
  const items = Object.values(progress.byCategory).reduce((a, c) => [a[0] + c.done, a[1] + c.count], [0, 0]);
  $('#tab-items').textContent = `${items[0]}/${items[1]}`;
  $('#tab-chart').textContent = `${s.starChart.done + s.steelPath.done}/${s.starChart.count * 2}`;
  $('#tab-intr').textContent = `${s.railjack.done + s.drifter.done}/${s.railjack.count + s.drifter.count}`;
}

// ------------------------------------------------------------ tabs ---

function setupTabs() {
  const show = () => {
    const tab = (location.hash || '#esyalar').slice(1);
    const valid = ['esyalar', 'harita', 'intrinsic', 'ozet'].includes(tab) ? tab : 'esyalar';
    for (const a of document.querySelectorAll('.tabs a')) a.setAttribute('aria-selected', String(a.dataset.tab === valid));
    for (const p of document.querySelectorAll('.panel')) p.hidden = p.id !== `panel-${valid}`;
  };
  window.addEventListener('hashchange', show);
  show();
}

// ----------------------------------------------------------- items ---

const filters = { search: '', category: 'all', status: 'todo', avail: 'all', method: 'all', sort: 'name' };

function setupItems() {
  const byGroup = {};
  for (const [key, cat] of Object.entries(CATEGORIES)) (byGroup[cat.group] ||= []).push([key, cat]);
  $('#f-category').innerHTML = '<option value="all">Tüm kategoriler</option>' +
    Object.entries(byGroup).map(([group, cats]) =>
      `<optgroup label="${esc(GROUP_LABELS[group] || group)}">` +
      (cats.length > 1 ? `<option value="group:${esc(group)}">Tümü: ${esc(GROUP_LABELS[group] || group)}</option>` : '') +
      cats.map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join('') + '</optgroup>'
    ).join('');

  const present = new Set(data.items.map((i) => i.acq.method));
  $('#f-method').innerHTML = '<option value="all">Tüm edinme yöntemleri</option>' +
    Object.entries(METHODS).filter(([k]) => present.has(k)).map(([k, m]) => `<option value="${k}">${esc(m.label)}</option>`).join('');

  for (const [id, key] of [['#f-search', 'search'], ['#f-category', 'category'], ['#f-status', 'status'], ['#f-avail', 'avail'], ['#f-method', 'method'], ['#f-sort', 'sort']]) {
    const el = $(id);
    el.value = filters[key];
    el.addEventListener(id === '#f-search' ? 'input' : 'change', () => { filters[key] = el.value; renderItems(); });
  }

  const list = $('#item-list');
  list.addEventListener('change', (e) => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const item = itemsById.get(row.dataset.id);
    if (e.target.matches('input[type=checkbox]')) setItemRank(item, e.target.checked ? item.maxRank : 0);
    else if (e.target.matches('select')) setItemRank(item, Number(e.target.value));
    updateItemRow(row, item);
    refresh();
  });

  $('#bulk-done').addEventListener('click', () => bulkSet(true));
  $('#bulk-clear').addEventListener('click', () => bulkSet(false));
  renderItems();
}

function setItemRank(item, rank) {
  if (rank) state.items[item.id] = rank;
  else delete state.items[item.id];
}

function availability(item) {
  if (!item.exclusive) return 'normal';
  return item.exclusive.impossible ? 'impossible' : 'limited';
}

function visibleItems() {
  const q = filters.search.trim().toLowerCase();
  const list = data.items.filter((i) => {
    if (q && !i.name.toLowerCase().includes(q)) return false;
    if (filters.category.startsWith('group:')) { if (CATEGORIES[i.category].group !== filters.category.slice(6)) return false; }
    else if (filters.category !== 'all' && i.category !== filters.category) return false;
    const done = itemXp(i, state.items[i.id]) === i.mastery;
    if (filters.status === 'todo' && done) return false;
    if (filters.status === 'done' && !done) return false;
    if (filters.avail !== 'all' && availability(i) !== filters.avail) return false;
    if (filters.method !== 'all' && i.acq.method !== filters.method) return false;
    return true;
  });
  const byName = (a, b) => a.name.localeCompare(b.name, 'en');
  const sorters = {
    name: byName,
    xp: (a, b) => b.mastery - a.mastery || byName(a, b),
    mr: (a, b) => (a.masteryReq ?? 99) - (b.masteryReq ?? 99) || byName(a, b),
    eff: (a, b) => effortById.get(b.id).xpPerHour - effortById.get(a.id).xpPerHour || byName(a, b),
    hours: (a, b) => effortById.get(a.id).totalHours - effortById.get(b.id).totalHours || byName(a, b),
    category: (a, b) => CATEGORIES[a.category].label.localeCompare(CATEGORIES[b.category].label, 'tr') || byName(a, b),
  };
  return list.sort(sorters[filters.sort]);
}

function badges(item) {
  const out = [];
  if (item.maxRank > 30) out.push(`<span class="badge r40" title="Rank 40'a kadar çıkar; her Forma 2 rank açar (toplam 5 Forma)">R40 · 5 Forma</span>`);
  if (item.gild) out.push('<span class="badge gild" title="Rank 30\'da gilding yapılıp tekrar seviye atlatılması gerekir">Gilding</span>');
  if (item.exclusive) {
    const cls = item.exclusive.impossible ? 'bad' : 'limited';
    out.push(`<span class="badge ${cls}" title="${esc(item.exclusive.label)}">${esc(EXCLUSIVE_BADGE[item.exclusive.group] || item.exclusive.label)}</span>`);
  } else if (item.vaulted) {
    out.push('<span class="badge limited" title="Vault\'ta">Vault</span>');
  }
  if (item.hidden) out.push(`<span class="badge muted" title="Rank 1 olana kadar profilde görünmez${typeof item.hidden === 'string' ? ' · Edinme: ' + esc(item.hidden) : ''}">Profilde gizli</span>`);
  return out.join('');
}

function itemRowHtml(item) {
  const rank = state.items[item.id] || 0;
  const xp = itemXp(item, rank);
  const done = xp === item.mastery;
  const cat = CATEGORIES[item.category];
  const eff = effortById.get(item.id);
  const rankSelect = item.maxRank > 30
    ? `<select class="rank-select" aria-label="${esc(item.name)} rankı">
         <option value="0"${rank ? '' : ' selected'}>—</option>
         ${validRanks(item).map((r) => `<option value="${r}"${r === rank ? ' selected' : ''}>R${r}</option>`).join('')}
       </select>`
    : '';
  return `<li class="item${done ? ' done' : ''}${xp && !done ? ' partial' : ''}" data-id="${esc(item.id)}">
    <label class="check"><input type="checkbox"${done ? ' checked' : ''} aria-label="${esc(item.name)} tamamlandı"><span class="box" aria-hidden="true"></span></label>
    <div class="item-main">
      <div class="item-name"><a href="${esc(item.wikiUrl)}" target="_blank" rel="noopener">${esc(item.name)}</a>${badges(item)}</div>
      <div class="item-sub">${esc(cat.label)}${item.masteryReq ? ` · MR ${item.masteryReq}` : ''} · <span class="method">${esc(eff.label)}${item.acq.source ? ` — ${esc(item.acq.source)}` : ''}</span>${item.acq.confidence !== 'yüksek' ? ` <span class="conf" title="Sınıflandırma güveni">${esc(item.acq.confidence)} güven</span>` : ''}</div>
    </div>
    ${rankSelect}
    <div class="item-xp"><span class="earned">${fmt(xp)}</span><span class="of"> / ${fmt(item.mastery)}</span>
      <div class="eff" title="Tahmini aktif süre · saat başına mastery XP">${eff.impossible ? 'elde edilemez' : `~${hrs(eff.totalHours)} · ${fmt(eff.xpPerHour)} XP/sa`}</div></div>
    <details class="item-details"><summary>Nasıl elde edilir?</summary>${detailsHtml(item, eff)}</details>
  </li>`;
}

function detailsHtml(item, eff) {
  const a = item.acq;
  const out = [];
  out.push(`<p><strong>${esc(eff.label)}</strong>${a.source ? ` — ${esc(a.source)}` : ''} <span class="muted">(sınıflandırma güveni: ${esc(a.confidence)})</span></p>`);
  if (a.note) out.push(`<p class="muted">${esc(a.note)}</p>`);
  if (a.requires.length) out.push(`<p>Gereksinimler: ${a.requires.map(esc).join(' · ')}</p>`);
  if (a.parts.length) {
    out.push(`<table class="parts"><thead><tr><th>Parça</th><th>En verimli kaynak</th><th class="num">Şans</th></tr></thead><tbody>${a.parts
      .map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.location)}</td><td class="num">%${p.chance.toLocaleString('tr-TR')}</td></tr>`)
      .join('')}</tbody></table>`);
  }
  if (!eff.impossible) {
    out.push(`<p>Tahmini aktif süre: ${eff.steps.map((s) => `${esc(s.label)} ${hrs(s.hours)}`).join(' + ')} = <strong>${hrs(eff.totalHours)}</strong></p>`);
  }
  const extra = [];
  if (eff.calendarHours >= 1) extra.push(`Foundry/bekleme: ~${hrs(eff.calendarHours)}`);
  if (a.platCost) extra.push(`Market'ten hazır: ${fmt(a.platCost)} platin`);
  if (a.tradable) extra.push('Takas edilebilir');
  if (extra.length) out.push(`<p class="muted">${extra.join(' · ')}</p>`);
  out.push(`<p class="small"><a href="${esc(item.wikiUrl)}" target="_blank" rel="noopener">Wiki sayfası →</a></p>`);
  return `<div class="details-body">${out.join('')}</div>`;
}

function updateItemRow(row, item) {
  // Replace in place so a "Kalanlar" filter doesn't make the row vanish under the cursor.
  const tmp = document.createElement('template');
  tmp.innerHTML = itemRowHtml(item).trim();
  row.replaceWith(tmp.content.firstChild);
}

let lastVisible = [];
function renderItems() {
  lastVisible = visibleItems();
  $('#item-list').innerHTML = lastVisible.map(itemRowHtml).join('');
  $('#item-empty').hidden = lastVisible.length > 0;
  const remaining = lastVisible.reduce((s, i) => s + i.mastery - itemXp(i, state.items[i.id]), 0);
  const hours = lastVisible
    .filter((i) => itemXp(i, state.items[i.id]) < i.mastery && Number.isFinite(effortById.get(i.id).totalHours))
    .reduce((s, i) => s + effortById.get(i.id).totalHours, 0);
  $('#list-count').textContent = `${lastVisible.length} eşya · bu listede ${fmt(remaining)} XP kaldı · tahmini ${hrs(hours)}`;
}

function bulkSet(done) {
  if (!lastVisible.length) return;
  const verb = done ? 'tamamlandı olarak işaretlensin' : 'temizlensin';
  if (!confirm(`Listede görünen ${lastVisible.length} eşya ${verb} mi?`)) return;
  for (const i of lastVisible) setItemRank(i, done ? i.maxRank : 0);
  renderItems();
  refresh();
}

// ------------------------------------------------------- star chart ---

function planetGroups() {
  const groups = new Map();
  for (const n of [...data.starChart.junctions, ...data.starChart.nodes]) {
    if (!groups.has(n.planet)) groups.set(n.planet, []);
    groups.get(n.planet).push(n);
  }
  const order = (p) => (PLANET_ORDER.includes(p) ? PLANET_ORDER.indexOf(p) : 99);
  return [...groups.entries()].sort((a, b) => order(a[0]) - order(b[0]) || a[0].localeCompare(b[0]));
}

function renderPlanets() {
  const root = $('#planets');
  root.innerHTML = planetGroups().map(([planet, nodes]) => `
    <details class="planet" data-planet="${esc(planet)}">
      <summary>
        <span class="planet-name">${esc(planet)}</span>
        <span class="planet-stat" data-stat="nodes"></span>
        <span class="planet-stat sp" data-stat="steelPath"></span>
      </summary>
      <div class="planet-actions">
        <button type="button" class="btn small" data-all="nodes" data-val="1">Normal: hepsi</button>
        <button type="button" class="btn small ghost" data-all="nodes" data-val="0">Normal: hiçbiri</button>
        <button type="button" class="btn small sp" data-all="steelPath" data-val="1">Steel Path: hepsi</button>
        <button type="button" class="btn small ghost" data-all="steelPath" data-val="0">Steel Path: hiçbiri</button>
      </div>
      <table class="nodes">
        <thead><tr><th>Görev</th><th>Tür</th><th class="num">XP</th><th class="c">Normal</th><th class="c">Steel Path</th></tr></thead>
        <tbody>${nodes.map((n) => {
          const k = esc(nodeKey(n));
          const type = n.type ?? 'Junction';
          return `<tr data-key="${k}">
            <td>${esc(n.name)}</td><td class="muted">${esc(type === 'Solar Rail Junction' ? 'Junction' : type)}</td>
            <td class="num">${fmt(n.xp)}</td>
            <td class="c"><input type="checkbox" data-field="nodes" aria-label="${esc(n.name)} normal"${state.nodes[nodeKey(n)] ? ' checked' : ''}></td>
            <td class="c"><input type="checkbox" data-field="steelPath" aria-label="${esc(n.name)} Steel Path"${state.steelPath[nodeKey(n)] ? ' checked' : ''}></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </details>`).join('');

  root.onchange = (e) => {
    const field = e.target.dataset.field;
    const key = e.target.closest('tr')?.dataset.key;
    if (!field || !key) return;
    if (e.target.checked) state[field][key] = true;
    else delete state[field][key];
    refresh();
  };
  root.onclick = (e) => {
    const btn = e.target.closest('button[data-all]');
    if (!btn) return;
    setPlanet(btn.closest('.planet'), btn.dataset.all, btn.dataset.val === '1');
  };
}

function setPlanet(planetEl, field, on) {
  for (const tr of planetEl.querySelectorAll('tr[data-key]')) {
    if (on) state[field][tr.dataset.key] = true;
    else delete state[field][tr.dataset.key];
    tr.querySelector(`input[data-field="${field}"]`).checked = on;
  }
  refresh();
}

function renderPlanetHeaders() {
  const groups = new Map(planetGroups());
  for (const el of document.querySelectorAll('.planet')) {
    const nodes = groups.get(el.dataset.planet);
    for (const field of ['nodes', 'steelPath']) {
      const done = nodes.filter((n) => state[field][nodeKey(n)]);
      const xp = done.reduce((s, n) => s + n.xp, 0);
      const max = nodes.reduce((s, n) => s + n.xp, 0);
      const stat = el.querySelector(`[data-stat="${field}"]`);
      stat.textContent = `${field === 'nodes' ? 'Normal' : 'SP'} ${done.length}/${nodes.length} · ${fmt(xp)}/${fmt(max)} XP`;
      stat.classList.toggle('complete', done.length === nodes.length);
    }
  }
}

function renderChartSummary() {
  const { starChart: n, steelPath: sp } = progress.sources;
  const card = (title, s, field, cls = '') => `
    <div class="sum-card ${cls}">
      <div class="sum-title">${title}</div>
      <div class="sum-num">${fmt(s.earned)} <span class="muted">/ ${fmt(s.max)} XP</span></div>
      <div class="bar"><div class="bar-fill" style="width:${pct(s.earned, s.max)}%"></div></div>
      <div class="muted small">${s.done}/${s.count} görev</div>
      <div class="sum-actions">
        <button type="button" class="btn small" data-chart-all="${field}" data-val="1">Hepsini işaretle</button>
        <button type="button" class="btn small ghost" data-chart-all="${field}" data-val="0">Temizle</button>
      </div>
    </div>`;
  const root = $('#chart-summary');
  root.innerHTML = card('Normal görevler + Junction', n, 'nodes') + card('Steel Path', sp, 'steelPath', 'sp');
  root.onclick = (e) => {
    const btn = e.target.closest('button[data-chart-all]');
    if (!btn) return;
    const on = btn.dataset.val === '1';
    if (!on && !confirm('Tüm işaretler kaldırılsın mı?')) return;
    for (const el of document.querySelectorAll('.planet')) setPlanet(el, btn.dataset.chartAll, on);
  };
}

// ------------------------------------------------------- intrinsics ---

function renderIntrinsics() {
  const root = $('#intrinsics');
  root.innerHTML = Object.entries(data.intrinsics).map(([kind, def]) => `
    <div class="intr-card" data-kind="${kind}">
      <div class="intr-head"><h3>${esc(def.label)}</h3><span class="intr-total muted"></span></div>
      ${def.trees.map((t) => {
        const v = state.intrinsics[kind][t] || 0;
        return `<label class="intr-row">
          <span class="intr-name">${esc(t)}</span>
          <input type="range" min="0" max="${def.maxRank}" step="1" value="${v}" data-tree="${esc(t)}" aria-label="${esc(t)} rankı">
          <output>${v}</output>
        </label>`;
      }).join('')}
      <div class="intr-actions">
        <button type="button" class="btn small" data-intr-all="${def.maxRank}">Hepsi ${def.maxRank}</button>
        <button type="button" class="btn small ghost" data-intr-all="0">Sıfırla</button>
      </div>
    </div>`).join('');

  root.oninput = (e) => {
    if (!e.target.matches('input[type=range]')) return;
    const kind = e.target.closest('[data-kind]').dataset.kind;
    const v = Number(e.target.value);
    if (v) state.intrinsics[kind][e.target.dataset.tree] = v;
    else delete state.intrinsics[kind][e.target.dataset.tree];
    e.target.nextElementSibling.value = v;
    e.target.nextElementSibling.textContent = v;
    refresh();
  };
  root.onclick = (e) => {
    const btn = e.target.closest('button[data-intr-all]');
    if (!btn) return;
    const card = btn.closest('[data-kind]');
    const v = Number(btn.dataset.intrAll);
    for (const input of card.querySelectorAll('input[type=range]')) {
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
}

function renderIntrinsicTotals() {
  for (const card of document.querySelectorAll('.intr-card')) {
    const s = progress.sources[card.dataset.kind];
    card.querySelector('.intr-total').textContent = `${fmt(s.earned)} / ${fmt(s.max)} XP`;
  }
}

// ---------------------------------------------------------- summary ---

function barRow(label, earned, max, extra = '') {
  return `<div class="sum-row">
    <div class="sum-row-head"><span>${label}</span><span class="muted">${extra}${fmt(earned)} / ${fmt(max)} XP · ${fmt(max - earned)} kaldı</span></div>
    <div class="bar"><div class="bar-fill" style="width:${pct(earned, max)}%"></div></div>
  </div>`;
}

function renderSummary() {
  const s = progress.sources;
  $('#sum-sources').innerHTML = [
    barRow('Eşyalar', s.items.earned, s.items.max),
    barRow('Gezegen haritası + Junction\'lar', s.starChart.earned, s.starChart.max),
    barRow('Steel Path', s.steelPath.earned, s.steelPath.max),
    barRow(esc(data.intrinsics.railjack.label), s.railjack.earned, s.railjack.max),
    barRow(esc(data.intrinsics.drifter.label), s.drifter.earned, s.drifter.max),
  ].join('');
  const byMethod = {};
  for (const i of data.items) {
    const left = i.mastery - itemXp(i, state.items[i.id]);
    if (!left) continue;
    const e = effortById.get(i.id);
    const m = (byMethod[e.method] ||= { n: 0, xp: 0, h: 0 });
    m.n++; m.xp += left;
    if (Number.isFinite(e.totalHours)) m.h += e.totalHours;
  }
  const mrows = Object.entries(byMethod).sort((a, b) => b[1].xp - a[1].xp);
  const tot = mrows.reduce((s, [k, m]) => s + (METHODS[k].limited || METHODS[k].impossible ? 0 : m.h), 0);
  $('#sum-methods').innerHTML = `<p class="muted small">Sınırlı erişimli olmayan kalan eşyalar için tahmini toplam aktif süre: <strong>${hrs(tot)}</strong>. Süreler tahminidir (varsayımlar için bkz. data/rapor.md).</p>
    <table class="grid"><thead><tr><th>Edinme yöntemi</th><th class="num">Kalan eşya</th><th class="num">Kalan XP</th><th class="num">Tahmini süre</th><th class="num">XP/saat</th></tr></thead><tbody>${mrows
      .map(([k, m]) => `<tr><td>${esc(METHODS[k].label)}</td><td class="num">${m.n}</td><td class="num">${fmt(m.xp)}</td><td class="num">${METHODS[k].impossible ? '—' : hrs(m.h)}</td><td class="num">${m.h ? fmt(m.xp / m.h) : '—'}</td></tr>`)
      .join('')}</tbody></table>`;
  $('#sum-categories').innerHTML = Object.entries(progress.byCategory)
    .filter(([, c]) => c.count)
    .sort((a, b) => (b[1].max - b[1].earned) - (a[1].max - a[1].earned))
    .map(([key, c]) => barRow(esc(CATEGORIES[key].label), c.earned, c.max, `${c.done}/${c.count} · `))
    .join('');
}

// ---------------------------------------------------- file actions ---

function setupFileActions() {
  $('#btn-export').addEventListener('click', () => exportState(state));
  $('#file-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = await readImportFile(file, data);
      if (!confirm('Mevcut ilerlemen içe aktarılan dosyayla değiştirilsin mi?')) return;
      replaceState(imported);
      toast('İlerleme içe aktarıldı.');
    } catch {
      toast('Dosya okunamadı: geçerli bir ilerleme dosyası değil.');
    }
  });
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Tüm ilerleme silinsin mi? Bu geri alınamaz (önce dışa aktarmak isteyebilirsin).')) return;
    replaceState(emptyState());
    toast('İlerleme sıfırlandı.');
  });
}

function replaceState(next) {
  state = next;
  $('#goal').value = String(state.goal);
  renderItems();
  renderPlanets();
  renderIntrinsics();
  refresh();
}

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

boot();

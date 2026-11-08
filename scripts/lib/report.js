/** Renders data/rapor.md — the human-readable summary of the built data. */
import * as M from '../../web/js/mastery.js';
import { DEFAULTS, METHODS, estimateEffort } from '../../web/js/effort.js';
import { planRoute, phases } from '../../web/js/planner.js';
import { emptyState } from '../../web/js/progress.js';

const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const rank = (xp) => M.rankLabel(M.rankForXp(xp));

export default function renderReport({ data, checks, expected, joined, problems, warnings = [] }) {
  const { items, starChart, meta } = data;
  const sum = (list) => list.reduce((s, i) => s + i.mastery, 0);
  const t = meta.totals;
  const impossibleXp = sum(items.filter((i) => i.exclusive?.impossible));
  const exclusiveXp = sum(items.filter((i) => i.exclusive));
  const scenarios = [
    ['Oyundaki her şey', t.all, 'Founders dahil, kuramsal üst sınır'],
    ['Founders hariç', t.all - impossibleXp, 'Bugün elde edilebilecek her şey (bir kısmı takas veya etkinlik gerektirir)'],
    ['Hiçbir exclusive olmadan', t.all - exclusiveXp, 'Yalnızca her zaman açık kaynaklar (drop, Market, araştırma, itibar vb.)'],
  ];

  const lines = [];
  const p = (s = '') => lines.push(s);

  p('# Mastery veri raporu');
  p();
  p(`> Bu dosya \`npm run build:data\` tarafından otomatik üretilir; elle düzenleme.`);
  p(`> Kaynak: wiki.warframe.com (${meta.generatedFrom.wiki.tableVersion}, indirildi: ${meta.generatedFrom.wiki.fetchedAt.slice(0, 10)}) ve @wfcd/items ${meta.generatedFrom.wfcdItems}.`);
  p();
  p('## Özet');
  p();
  p('| Senaryo | Toplam XP | Ulaşılabilecek en yüksek rank | Açıklama |');
  p('|---|---:|---|---|');
  for (const [name, xp, note] of scenarios) p(`| ${name} | ${fmt(xp)} | **${rank(xp)}** | ${note} |`);
  p();
  const next = M.rankForXp(t.all - exclusiveXp) + 1;
  p(`- Exclusive eşyalar olmadan **${rank(t.all - exclusiveXp)}** mümkün. ${M.rankLabel(next)} için ${fmt(M.xpForRank(next) - (t.all - exclusiveXp))} XP daha gerekir; bu fark Prime Vault, Baro veya etkinlik eşyalarıyla kapanır.`);
  p(`- Founders eşyaları (${fmt(impossibleXp)} XP) artık elde edilemez.`);
  p();

  p('## Rank eşikleri');
  p();
  p('| Rank | Gereken toplam XP |');
  p('|---|---:|');
  for (const r of [10, 20, 25, 28, 29, 30, 31, 32, 33, 34, 35, 36]) p(`| ${M.rankLabel(r)} | ${fmt(M.xpForRank(r))} |`);
  p();
  p('Formül: MR *n* için 2.500 × n²; MR30 sonrası her Legendary rank +147.500.');
  p();

  p('## Kaynağa göre dağılım');
  p();
  p('| Kaynak | XP | Pay |');
  p('|---|---:|---:|');
  for (const [name, xp] of [
    ['Eşyalar (silah, Warframe, yoldaş, araç)', t.items],
    [`Gezegen haritası (${starChart.nodes.length} görev + ${starChart.junctions.length} Junction)`, t.starChart],
    ['Steel Path (aynı görevler tekrar)', t.steelPath],
    ['Railjack + Drifter Intrinsic\'leri', t.intrinsics],
  ]) p(`| ${name} | ${fmt(xp)} | %${((xp / t.all) * 100).toFixed(1)} |`);
  p();

  p('## Kategoriler');
  p();
  p('| Kategori | Adet | XP | Rank 40 / Gilding |');
  p('|---|---:|---:|---|');
  for (const [key, cat] of Object.entries(data.categories)) {
    const list = items.filter((i) => i.category === key);
    if (!list.length) continue;
    const r40 = list.filter((i) => i.maxRank > 30).length;
    const notes = [r40 ? `${r40} adet rank 40` : '', cat.gild ? 'gilding gerekli' : ''].filter(Boolean).join(', ');
    p(`| ${cat.label} | ${list.length} | ${fmt(sum(list))} | ${notes} |`);
  }
  p(`| **Toplam** | **${items.length}** | **${fmt(t.items)}** | |`);
  p();

  p('## Exclusive (sınırlı erişimli) eşyalar');
  p();
  p('| Grup | Adet | XP |');
  p('|---|---:|---:|');
  const groups = {};
  for (const i of items.filter((x) => x.exclusive)) {
    const g = (groups[i.exclusive.label] ||= { n: 0, xp: 0 });
    g.n++; g.xp += i.mastery;
  }
  for (const [label, g] of Object.entries(groups).sort((a, b) => b[1].xp - a[1].xp)) p(`| ${label} | ${g.n} | ${fmt(g.xp)} |`);
  p();

  renderEffort(p, items);
  renderRoutes(p, data);

  p('## Veri kapsamı');
  p();
  const withAcq = items.filter((i) => i.acquisition);
  const withDrops = withAcq.filter((i) => i.acquisition.drops.length || i.acquisition.components.some((c) => c.drops.length));
  const inMarket = withAcq.filter((i) => i.acquisition.marketCost || i.acquisition.bpCost);
  p(`- Edinme verisi (WFCD) eşleşen eşya: **${joined} / ${items.length}**`);
  p(`- Drop verisi olan eşya: ${withDrops.length}`);
  p(`- Market'te platin veya kredi fiyatı olan eşya: ${inMarket.length}`);
  p(`- Eşleşmeyenler: ${items.filter((i) => !i.acquisition).map((i) => i.name).join(', ') || '—'}`);
  p();

  p('### Bilinen sınırlamalar (sonraki aşamalarda ele alınacak)');
  p();
  p('- Efor süreleri **tahmindir** (bkz. "Efor modeli" bölümündeki varsayımlar). Syndicate rütbesine ulaşma süresi, klan araştırması ve günlük itibar sınırı hesaba katılmaz; bunlar önkoşul olarak listelenir.');
  p('- Modüler eşyalarda (Zaw, Kitgun, Amp) yalnızca mastery veren ana parça hesaplanır; diğer parçalar (grip, link vb.) dahil değildir.');
  p('- Platin fiyatları (warframe.market) henüz yok.');
  p('- "Exclusive" sınıflandırması wiki\'nin Exclusive Mastery sayfasına dayanır. Prime Vault eşyaları takasla ya da Prime Resurgence ile her zaman alınabilir; bu yüzden "Hiçbir exclusive olmadan" senaryosu en katı senaryodur.');
  p();

  p('## Doğrulama (wiki "Total Mastery" tablosu)');
  p();
  p('| Satır | Bizim adet | Bizim XP | Wiki XP | Durum |');
  p('|---|---:|---:|---:|---|');
  for (const c of checks) {
    const exp = expected.rows[c.row];
    const ok = exp && exp.xp === c.xp && (c.count == null || c.count === exp.count);
    p(`| ${c.row.replace(/\s+\)/, ')')} | ${c.count ?? '—'} | ${fmt(c.xp)} | ${exp ? fmt(exp.xp) : '?'} | ${ok ? '✓' : '✗'} |`);
  }
  p();
  if (warnings.length) {
    p('### Uyarılar');
    p();
    for (const w of warnings) p(`- ${w}`);
    p();
  }
  if (problems.length) {
    p('### Sorunlar');
    p();
    for (const pr of problems) p(`- ${pr}`);
    p();
  }
  return lines.join('\n');
};

const hours = (h) => (Number.isFinite(h) ? h.toLocaleString('tr-TR', { maximumFractionDigits: 1 }) : '∞');

function renderEffort(p, items) {
  const rows = items.map((i) => ({ i, e: estimateEffort(i, i.acq) }));
  p('## Efor modeli');
  p();
  p('Her eşya için edinme yöntemi sınıflandırıldı ve "elde etme + seviye atlatma" için **aktif oyun süresi** tahmin edildi. Üretim bekleme süreleri (Foundry) aktif süreye dahil değildir.');
  p();
  p('### Yöntemlere göre');
  p();
  p('| Yöntem | Adet | XP | Ort. süre (sa) | Ort. XP/saat |');
  p('|---|---:|---:|---:|---:|');
  const byMethod = {};
  for (const r of rows) (byMethod[r.e.method] ||= []).push(r);
  for (const [m, list] of Object.entries(byMethod).sort((a, b) => b[1].length - a[1].length)) {
    const xp = list.reduce((s, r) => s + r.i.mastery, 0);
    const finite = list.filter((r) => Number.isFinite(r.e.totalHours));
    const avgH = finite.length ? finite.reduce((s, r) => s + r.e.totalHours, 0) / finite.length : Infinity;
    const avgX = finite.length ? finite.reduce((s, r) => s + r.e.xpPerHour, 0) / finite.length : 0;
    p(`| ${METHODS[m].label} | ${list.length} | ${fmt(xp)} | ${hours(avgH)} | ${fmt(avgX)} |`);
  }
  p();
  const conf = { 'yüksek': 0, orta: 0, 'düşük': 0 };
  for (const r of rows) conf[r.i.acq.confidence]++;
  p(`Sınıflandırma güveni: **yüksek ${conf['yüksek']}**, orta ${conf.orta}, düşük ${conf['düşük']}.`);
  p();

  const open = rows.filter((r) => !r.e.limited && !r.e.impossible).sort((a, b) => b.e.xpPerHour - a.e.xpPerHour);
  const table = (list) => {
    p('| Eşya | Kategori | Yöntem | XP | Süre (sa) | XP/saat |');
    p('|---|---|---|---:|---:|---:|');
    for (const { i, e } of list) p(`| ${i.name} | ${M.CATEGORIES[i.category].label} | ${e.label}${i.acq.source ? ` — ${i.acq.source}` : ''} | ${fmt(i.mastery)} | ${hours(e.totalHours)} | ${fmt(e.xpPerHour)} |`);
    p();
  };
  p('### En verimli 25 eşya (sınırlı erişimliler hariç)');
  p();
  table(open.slice(0, 25));
  p('### En zahmetli 15 eşya');
  p();
  table(open.slice(-15).reverse());

  const sumH = open.reduce((s, r) => s + r.e.totalHours, 0);
  const sumXp = open.reduce((s, r) => s + r.i.mastery, 0);
  p(`Sınırlı erişimli olmayan ${open.length} eşyanın tamamı: **${fmt(sumXp)} XP**, tahmini **${hours(sumH)} saat** aktif oyun (ortalama ${fmt(sumXp / sumH)} XP/saat).`);
  p();

  p('### Varsayımlar');
  p();
  p(`- Seviye atlatma (0→30, bir tur): silah ${DEFAULTS.levelHours.weapon} sa, Warframe ${DEFAULTS.levelHours.warframe} sa, yoldaş ${DEFAULTS.levelHours.companion} sa, Archwing ${DEFAULTS.levelHours.archwing} sa, Necramech ${DEFAULTS.levelHours.necramech} sa. Rank 40 eşyalarda her Forma bir tur daha (+${DEFAULTS.formaHours} sa Forma); gilding gereken eşyalarda iki tur.`);
  p(`- Drop farmı: Her parça için en yüksek olasılıklı kaynak seçilir. Aynı ödül tablosundaki parçalar "kupon toplama" formülüyle hesaplanır. Deneme süreleri görev türüne göre (ör. suikast 8 dk, Disruption 16 dk, bounty 15 dk, relic 8 dk; tanımsızlar ${DEFAULTS.defaultAttemptMinutes} dk).`);
  p(`- Drop verisi olmayan yöntemler için sabit süreler: ${Object.entries(DEFAULTS.methodHours).filter(([, h]) => Number.isFinite(h) && h > 0).map(([m, h]) => `${METHODS[m].label} ${h} sa`).join(', ')}.`);
  p('- Kaynaklar: yaygın kaynaklar neredeyse bedava sayılır; nadir kaynaklar (Orokin Cell, Argon Crystal, Neural Sensors, Tellurium, Nitain vb.) birim başına sabit süreyle hesaplanır.');
  p('- Platin ve takas maliyetleri süreye dahil değildir (Market fiyatı ayrıca gösterilir).');
  p();

  const low = rows.filter((r) => r.i.acq.confidence === 'düşük');
  if (low.length) {
    p('### Düşük güvenli sınıflandırmalar');
    p();
    p('Bu eşyaların kaynağı veride bulunamadı veya tahmin edildi. Düzeltmeler `data/acquisition-overrides.json` dosyasına eklenebilir:');
    p();
    p(low.map((r) => `${r.i.name} (${r.e.label})`).join(', '));
    p();
  }
}

function renderRoutes(p, data) {
  p('## Yol haritası özeti (sıfırdan başlayan oyuncu)');
  p();
  p('Rota her adımda, o an yapılabilecek adımlar (MR şartı, Intrinsic sırası, Steel Path için normal harita) arasından saat başına en çok XP vereni seçer. Süreler tahmini **aktif oyun süresidir**.');
  p();
  const scenarios = [
    ['Varsayılan (sınırlı erişimliler hariç)', {}],
    ['Platin harcamadan', { noPlat: true }],
    ['Sınırlı erişimliler dahil', { includeLimited: true }],
  ];
  const goals = [10, 20, 25, 30, 31, 32, 33, 34, 35, 36];
  p(`| Senaryo | ${goals.map((g) => M.rankLabel(g)).join(' | ')} |`);
  p(`|---|${goals.map(() => '---:').join('|')}|`);
  for (const [name, opts] of scenarios) {
    const route = planRoute(data, emptyState(), 36, opts);
    const at = new Map(route.milestones.map((m) => [m.rank, m.hours]));
    p(`| ${name} | ${goals.map((g) => (at.has(g) ? fmt(at.get(g)) : '—')).join(' | ')} |`);
  }
  p();
  p('Değerler saat cinsinden; "—" o senaryoda ulaşılamayan hedef demektir.');
  p();
  const route = planRoute(data, emptyState(), 33);
  p('### Sıfırdan L3: aşamalar ve ana faaliyetler (varsayılan senaryo)');
  p();
  for (const ph of phases(route)) {
    const top = [...ph.groups].sort((a, b) => b.xp - a.xp).slice(0, 4);
    p(`- **${M.rankLabel(ph.fromRank)} → ${M.rankLabel(ph.toRank)}** (~${hours(ph.hours)} sa, ${ph.steps.length} adım): ${top.map((g) => `${g.label} (${g.steps.length})`).join(', ')}`);
  }
  p();
}

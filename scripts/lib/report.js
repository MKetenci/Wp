/** Renders data/rapor.md — the human-readable summary of the built data. */
import * as M from '../../web/js/mastery.js';

const fmt = (n) => n.toLocaleString('tr-TR');
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
  p('- Edinme **yöntemi** henüz sınıflandırılmadı. Örneğin Kuva Lich, Sister, syndicate itibarı, klan Dojo araştırması veya görev (quest) ödülü olan eşyalarda drop listesi boş görünür. Bu, 3. aşamada (efor modeli) eklenecek.');
  p('- Bileşen drop listeleri ham kaynakları da (ör. Alloy Plate) içeriyor; efor modeli bunları ayrıca ele alacak.');
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

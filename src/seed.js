'use strict';

/**
 * Starter content so the wiki isn't empty on first run.
 * Game values change often between updates — treat these as examples
 * and correct them through the wiki itself.
 */
const PAGES = [
  {
    title: 'Excalibur',
    category: 'warframe',
    summary: 'Kılıç ustası, dengeli bir başlangıç Warframe\'i.',
    infobox: {
      abilities: 'Slash Dash, Radial Blind, Radial Javelin, Exalted Blade',
      release: 'Lansman (2013)',
    },
    body: `**Excalibur**, yakın dövüş ile hareketliliği birleştiren klasik bir Warframe'dir ve oyuna başlarken seçilebilen üç Warframe'den biridir (diğerleri [[Mag]] ve [[Volt]]).

## Yetenekler

| # | Yetenek | Açıklama |
|---|---------|----------|
| 1 | Slash Dash | Hedefler arasında atılarak kılıçla keser. |
| 2 | Radial Blind | Çevredeki düşmanları kör eder; kör düşmanlara yakın dövüş saldırıları ekstra hasar verir. |
| 3 | Radial Javelin | Çevredeki düşmanlara enerji mızrakları fırlatır. |
| 4 | Exalted Blade | Enerjiden bir kılıç çağırır; kılıç hasar dalgaları fırlatır. |

## Oynanış ipuçları

- *Exalted Blade*, yakın dövüş modlarından faydalanır; [[Pressure Point]] gibi modlar etkilidir.
- *Radial Blind* kalabalık kontrolü için idealdir, özellikle gizli öldürmelerle birlikte.

## Prime sürümü

Excalibur Prime, kurucu (Founder) paketine özel olduğu için yeniden çıkarılmayan nadir bir sürümdür.

## Ayrıca bakınız

- [[Skana]] — başlangıç kılıcı
- [[Yeni Başlayanlar Rehberi]]`,
  },
  {
    title: 'Mag',
    category: 'warframe',
    summary: 'Manyetizmayı kontrol eden, kalkan odaklı bir Warframe.',
    infobox: {
      abilities: 'Pull, Magnetize, Polarize, Crush',
      release: 'Lansman (2013)',
    },
    body: `**Mag**, manyetik güçleri kullanan bir Warframe'dir. Corpus kalkanlarına karşı özellikle etkilidir.

## Yetenekler

1. **Pull** — Düşmanları kendine çeker.
2. **Magnetize** — Mermileri ve hasarı toplayan bir manyetik alan oluşturur.
3. **Polarize** — Düşman kalkan ve zırhını söker, müttefik kalkanlarını yeniler.
4. **Crush** — Çevredeki düşmanları manyetik güçle ezer.

## Kullanım

[[Corpus]] görevlerinde *Polarize* hem saldırı hem destek olarak öne çıkar.`,
  },
  {
    title: 'Volt',
    category: 'warframe',
    summary: 'Elektrik ve hız ustası.',
    infobox: {
      abilities: 'Shock, Speed, Electric Shield, Discharge',
      release: 'Lansman (2013)',
    },
    body: `**Volt**, elektrik enerjisini silaha dönüştüren bir Warframe'dir.

## Yetenekler

1. **Shock** — Düşmanlar arasında zincirlenen bir elektrik şoku.
2. **Speed** — Kendisinin ve müttefiklerin hareket ve saldırı hızını artırır.
3. **Electric Shield** — Mermileri durduran ve içinden ateş edilen mermilere elektrik hasarı ekleyen bir kalkan.
4. **Discharge** — Çevredeki düşmanları sersemleten bir elektrik dalgası.

## İpuçları

*Electric Shield* ile [[Braton]] gibi silahların hasarını artırabilirsin.`,
  },
  {
    title: 'Braton',
    category: 'silah',
    summary: 'Tenno\'nun standart saldırı tüfeği.',
    infobox: { type: 'Saldırı Tüfeği', slot: 'Birincil', mastery: '0' },
    body: `**Braton**, yeni oyuncuların ilk birincil silahlarından biridir. Güvenilir, dengeli ve modlamaya uygun bir saldırı tüfeğidir.

## Varyantlar

- **Braton** — temel sürüm
- **MK1-Braton** — eğitim sürümü
- **Braton Vandal** — etkinlik ödülü
- **Braton Prime** — Void relic'lerinden toplanan Prime sürümü

## Önerilen modlar

- [[Serration]] — temel hasar artışı
- Split Chamber — çoklu atış

Ayrıca bkz: [[Hücum Tüfekleri Karşılaştırması]]`,
  },
  {
    title: 'Skana',
    category: 'silah',
    summary: 'Başlangıç kılıcı.',
    infobox: { type: 'Kılıç', slot: 'Yakın Dövüş', mastery: '0' },
    body: `**Skana**, Tenno'nun başlangıç yakın dövüş silahıdır. [[Excalibur]] ile tematik olarak sıkça eşleştirilir.

## Modlama

[[Pressure Point]] yakın dövüş hasarını artırmak için temel moddur.`,
  },
  {
    title: 'Lato',
    category: 'silah',
    summary: 'Başlangıç tabancası.',
    infobox: { type: 'Tabanca', slot: 'İkincil', mastery: '0' },
    body: `**Lato**, Tenno'nun standart yarı otomatik tabancasıdır. [[Hornet Strike]] ile güçlendirilir.`,
  },
  {
    title: 'Serration',
    category: 'mod',
    summary: 'Tüfek hasarını artıran temel mod.',
    infobox: { polarity: 'Madurai', rarity: 'Yaygın', max_rank: '10', effect: '+%165 hasar', compat: 'Tüfekler' },
    body: `**Serration**, tüfekler için en önemli hasar modudur. Mod kapasitesi maliyeti yüksektir ama neredeyse her tüfek yapısında yer alır.

Uyumlu silah örneği: [[Braton]].`,
  },
  {
    title: 'Hornet Strike',
    category: 'mod',
    summary: 'Tabanca hasarını artıran temel mod.',
    infobox: { polarity: 'Madurai', rarity: 'Yaygın', max_rank: '10', effect: '+%220 hasar', compat: 'Tabancalar' },
    body: `**Hornet Strike**, ikincil silahlar için [[Serration]]'ın karşılığıdır. Örnek: [[Lato]].`,
  },
  {
    title: 'Pressure Point',
    category: 'mod',
    summary: 'Yakın dövüş hasarını artıran temel mod.',
    infobox: { polarity: 'Madurai', rarity: 'Yaygın', max_rank: '5', effect: '+%120 yakın dövüş hasarı', compat: 'Yakın dövüş silahları' },
    body: `**Pressure Point**, yakın dövüş yapıları için temel hasar modudur. Örnek: [[Skana]], [[Excalibur]]'un *Exalted Blade*'i.`,
  },
  {
    title: 'Vitality',
    category: 'mod',
    summary: 'Warframe sağlığını artırır.',
    infobox: { polarity: 'Vazarin', rarity: 'Yaygın', max_rank: '10', effect: '+%440 sağlık', compat: 'Warframe' },
    body: `**Vitality**, Warframe'lerin dayanıklılığını artırmak için kullanılan temel bir moddur.`,
  },
  {
    title: 'Kubrow',
    category: 'companion',
    summary: 'Sadık bir köpek benzeri yoldaş.',
    infobox: { type: 'Evcil hayvan (Beast)' },
    body: `**Kubrow**'lar Dünya'da yaşayan, Tenno'nun eğitebildiği köpek benzeri yaratıklardır. Yumurtadan Incubator'da (Orbiter'daki kuluçka makinesi) yetiştirilirler.

Bilinen ırklar: Sunika, Huras, Raksa, Sahasa, Chesa, Helminth (enfekte).`,
  },
  {
    title: 'Merkür',
    category: 'gezegen',
    summary: 'Origin Sistemi\'nin ilk gezegeni.',
    infobox: { faction: 'Grineer', level: 'Düşük', boss: 'Captain Vor (Tolstoj)', resources: 'Ferrite, Polymer Bundle, Morphics' },
    body: `**Merkür**, yeni Tenno'nun yıldız haritasında ilk açtığı gezegendir. [[Grineer]] kontrolündedir.

Sonraki: [[Venüs]].`,
  },
  {
    title: 'Venüs',
    category: 'gezegen',
    summary: 'Corpus kontrolündeki buzlu dünya; Orb Vallis burada.',
    infobox: { faction: 'Corpus', level: 'Düşük', boss: 'Jackal (Fossa)', hub: 'Fortuna', resources: 'Alloy Plate, Circuits, Polymer Bundle' },
    body: `**Venüs**, [[Corpus]]'un hakimiyetindedir. Açık dünya bölgesi **Orb Vallis** ve merkez **Fortuna** buradadır.

Önceki: [[Merkür]] · Sonraki: [[Dünya]].`,
  },
  {
    title: 'Dünya',
    category: 'gezegen',
    summary: 'Ormanlarla kaplı Grineer bölgesi; Plains of Eidolon burada.',
    infobox: { faction: 'Grineer', level: 'Düşük', boss: 'Councilor Vay Hek (Oro)', hub: 'Cetus', resources: 'Ferrite, Rubedo, Neurodes' },
    body: `**Dünya**, Tenno'nun ana gezegenidir; [[Grineer]] kontrolündedir. Açık dünya bölgesi **Plains of Eidolon** ve köy **Cetus** buradadır.

Burada [[Kubrow]] yumurtaları bulunabilir.`,
  },
  {
    title: 'Grineer',
    category: 'fraksiyon',
    summary: 'Klonlanmış askerlerden oluşan militarist imparatorluk.',
    infobox: { leader: 'İkiz Kraliçeler (Twin Queens)', weakness: 'Corrosive (zırhlı birimler)', territory: 'Merkür, Dünya, Mars, Satürn ve dahası' },
    body: `**Grineer**, sürekli klonlama nedeniyle bozulan genlere sahip, ağır zırhlı birliklerden oluşan bir imparatorluktur.

Zırhları nedeniyle *Corrosive* hasarı etkilidir. Bölgelerinden bazıları: [[Merkür]], [[Dünya]].`,
  },
  {
    title: 'Corpus',
    category: 'fraksiyon',
    summary: 'Kâr odaklı tüccar konsorsiyumu.',
    infobox: { leader: 'Yönetim Kurulu (Board of Directors)', weakness: 'Magnetic (kalkanlar)', territory: 'Venüs, Jüpiter, Neptün ve dahası' },
    body: `**Corpus**, ticaret ve kârı kutsal kabul eden bir dini-ticari örgüttür. Robotik birimler (Proxies) ve güçlü kalkanlar kullanırlar.

Kalkanlara karşı *Magnetic* hasar ve [[Mag]]'in *Polarize*'ı etkilidir. Bölgeleri arasında [[Venüs]] vardır.`,
  },
  {
    title: 'Yeni Başlayanlar Rehberi',
    category: 'rehber',
    summary: 'İlk saatlerde bilmen gerekenler.',
    infobox: { difficulty: 'Kolay', mr: '0+' },
    body: `Bu rehber, Warframe'e yeni başlayan Tenno'lar için temel kavramları özetler.

## İlk Warframe seçimi

- [[Excalibur]] — yakın dövüş ve hareketlilik
- [[Mag]] — Corpus'a karşı güçlü
- [[Volt]] — hız ve elektrik

## Modlar

Modlar, silah ve Warframe'lerin gücünün asıl kaynağıdır. İlk öncelikler:

- Tüfek için [[Serration]]
- Tabanca için [[Hornet Strike]]
- Yakın dövüş için [[Pressure Point]]
- Warframe için [[Vitality]]

Modlar *Endo* ve *Credits* ile yükseltilir.

## Mastery Rank (MR)

Yeni silah ve Warframe'leri seviye 30'a çıkararak Mastery puanı kazanılır. MR yükseldikçe yeni ekipmanlar açılır.

## Void Relic'leri

Prime parçalar **Lith**, **Meso**, **Neo**, **Axi** ve **Requiem** relic'lerinden çıkar. Ayrıntılar: [[Void Relic'leri]].

## İlerleme

Yıldız haritasında [[Merkür]] → [[Venüs]] → [[Dünya]] sırasıyla ilerleyerek yeni gezegenler açılır.`,
  },
];

function seed(repo) {
  for (const page of PAGES) {
    repo.savePage({ ...page, author: 'Tenno Arşivi', comment: 'İlk içerik' });
  }
  return PAGES.length;
}

module.exports = { seed, PAGES };

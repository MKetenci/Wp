'use strict';

/**
 * Wiki categories and the infobox fields each one shows.
 * Add a new category here and it appears everywhere (nav, forms, listings).
 */
const CATEGORIES = [
  {
    key: 'warframe',
    name: 'Warframe\'ler',
    singular: 'Warframe',
    icon: '◆',
    fields: [
      ['health', 'Sağlık'],
      ['shield', 'Kalkan'],
      ['armor', 'Zırh'],
      ['energy', 'Enerji'],
      ['sprint', 'Koşu Hızı'],
      ['polarity', 'Aura Polaritesi'],
      ['abilities', 'Yetenekler'],
      ['release', 'Çıkış'],
    ],
  },
  {
    key: 'silah',
    name: 'Silahlar',
    singular: 'Silah',
    icon: '⚔',
    fields: [
      ['type', 'Tür'],
      ['slot', 'Yuva'],
      ['mastery', 'Ustalık Rütbesi'],
      ['damage', 'Hasar'],
      ['crit_chance', 'Kritik Şansı'],
      ['crit_mult', 'Kritik Çarpanı'],
      ['status', 'Durum Şansı'],
      ['fire_rate', 'Atış Hızı'],
    ],
  },
  {
    key: 'mod',
    name: 'Modlar',
    singular: 'Mod',
    icon: '▣',
    fields: [
      ['polarity', 'Polarite'],
      ['rarity', 'Nadirlik'],
      ['max_rank', 'Maks. Rütbe'],
      ['effect', 'Etki (maks.)'],
      ['compat', 'Uyumluluk'],
    ],
  },
  {
    key: 'companion',
    name: 'Yoldaşlar',
    singular: 'Yoldaş',
    icon: '✦',
    fields: [
      ['type', 'Tür'],
      ['health', 'Sağlık'],
      ['shield', 'Kalkan'],
      ['armor', 'Zırh'],
      ['precepts', 'Komutlar'],
    ],
  },
  {
    key: 'gezegen',
    name: 'Gezegenler',
    singular: 'Gezegen',
    icon: '◉',
    fields: [
      ['faction', 'Hakim Fraksiyon'],
      ['level', 'Seviye Aralığı'],
      ['boss', 'Boss'],
      ['hub', 'Merkez / Relay'],
      ['resources', 'Kaynaklar'],
    ],
  },
  {
    key: 'fraksiyon',
    name: 'Fraksiyonlar',
    singular: 'Fraksiyon',
    icon: '⬢',
    fields: [
      ['leader', 'Lider'],
      ['weakness', 'Zayıflık'],
      ['territory', 'Bölge'],
    ],
  },
  {
    key: 'rehber',
    name: 'Rehberler',
    singular: 'Rehber',
    icon: '✎',
    fields: [
      ['difficulty', 'Zorluk'],
      ['mr', 'Önerilen MR'],
    ],
  },
];

const BY_KEY = Object.fromEntries(CATEGORIES.map((c) => [c.key, c]));

module.exports = { CATEGORIES, BY_KEY };

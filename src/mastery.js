'use strict';
/**
 * Mastery rules. Source: https://wiki.warframe.com/w/Mastery_Rank
 * Pure functions, shared by the data build and (later) the web app.
 */

const MR_MAX = 30;
const LEGENDARY_STEP = 147_500;
const JUNCTION_XP = 1_000;
const INTRINSIC_XP_PER_RANK = 1_500;

/**
 * Item categories. Item names stay in English (as in game); labels are Turkish.
 * perRank: mastery XP per rank (100 weapons, 200 frames/companions/vehicles).
 * gild: must be gilded at rank 30 and ranked again before mastery is granted.
 */
const CATEGORIES = {
  warframe:     { label: 'Warframe',          group: 'warframe',  perRank: 200 },
  primary:      { label: 'Birincil silah',    group: 'silah',     perRank: 100 },
  secondary:    { label: 'İkincil silah',     group: 'silah',     perRank: 100 },
  melee:        { label: 'Yakın dövüş silahı', group: 'silah',    perRank: 100 },
  zaw:          { label: 'Zaw',               group: 'modüler',   perRank: 100, gild: true },
  kitgun:       { label: 'Kitgun',            group: 'modüler',   perRank: 100, gild: true },
  amp:          { label: 'Amp',               group: 'modüler',   perRank: 100, gild: true },
  archwing:     { label: 'Archwing',          group: 'archwing',  perRank: 200 },
  archgun:      { label: 'Arch-gun',          group: 'archwing',  perRank: 100 },
  archmelee:    { label: 'Arch-melee',        group: 'archwing',  perRank: 100 },
  necramech:    { label: 'Necramech',         group: 'araç',      perRank: 200 },
  kdrive:       { label: 'K-Drive',           group: 'araç',      perRank: 200 },
  plexus:       { label: 'Plexus',            group: 'araç',      perRank: 200 },
  sentinel:     { label: 'Sentinel',          group: 'yoldaş',    perRank: 200 },
  robotic:      { label: 'Sentinel silahı',   group: 'yoldaş',    perRank: 100 },
  hound_weapon: { label: 'Hound silahı',      group: 'yoldaş',    perRank: 100 },
  kubrow:       { label: 'Kubrow',            group: 'yoldaş',    perRank: 200 },
  kavat:        { label: 'Kavat',             group: 'yoldaş',    perRank: 200 },
  predasite:    { label: 'Predasite',         group: 'yoldaş',    perRank: 200, gild: true },
  vulpaphyla:   { label: 'Vulpaphyla',        group: 'yoldaş',    perRank: 200, gild: true },
  moa:          { label: 'MOA',               group: 'yoldaş',    perRank: 200, gild: true },
  hound:        { label: 'Hound',             group: 'yoldaş',    perRank: 200 },
};

/** Mastery an item grants when fully ranked. Rank-40 items need 5 Forma. */
function itemMastery(category, maxRank = 30) {
  const cat = CATEGORIES[category];
  if (!cat) throw new Error(`Bilinmeyen kategori: ${category}`);
  return cat.perRank * maxRank;
}

/** Forma needed to reach max rank (2 extra ranks per Forma above 30). */
function formaForMaxRank(maxRank = 30) {
  return Math.max(0, Math.ceil((maxRank - 30) / 2));
}

/** Total mastery XP needed to reach a rank. Ranks > 30 are Legendary (31 = L1). */
function xpForRank(rank) {
  if (rank <= 0) return 0;
  if (rank <= MR_MAX) return 2_500 * rank * rank;
  return xpForRank(MR_MAX) + (rank - MR_MAX) * LEGENDARY_STEP;
}

/** Highest rank whose threshold is <= xp. */
function rankForXp(xp) {
  if (xp >= xpForRank(MR_MAX)) return MR_MAX + Math.floor((xp - xpForRank(MR_MAX)) / LEGENDARY_STEP);
  return Math.floor(Math.sqrt(xp / 2_500));
}

/** "MR 12", "MR 30", "L3" */
function rankLabel(rank) {
  return rank > MR_MAX ? `L${rank - MR_MAX}` : `MR ${rank}`;
}

module.exports = {
  MR_MAX, LEGENDARY_STEP, JUNCTION_XP, INTRINSIC_XP_PER_RANK, CATEGORIES,
  itemMastery, formaForMaxRank, xpForRank, rankForXp, rankLabel,
};

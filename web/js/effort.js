/**
 * Effort model: how long it takes to obtain and master an item.
 *
 * Input is the `acq` object the data build attaches to each item
 * (see scripts/lib/acquisition.js). Output is an estimate in hours.
 * Every number here is an ASSUMPTION, collected in DEFAULTS so it can be
 * shown to (and later tuned by) the player. Pure functions: runs in Node and
 * in the browser.
 */

/** Acquisition methods. `limited` = availability depends on rotations/events. */
export const METHODS = {
  market:      { label: 'Market (kredi ile plan)' },
  market_plat: { label: 'Market (platin)' },
  drop:        { label: 'Görev / düşman dropu' },
  bounty:      { label: 'Bounty (açık dünya vb.)' },
  relic:       { label: 'Void Relic (Prime)' },
  dojo:        { label: 'Klan Dojo araştırması' },
  vendor:      { label: 'Syndicate / itibar satıcısı' },
  quest:       { label: 'Görev zinciri (quest) ödülü' },
  adversary:   { label: 'Kuva Lich / Sister / Technocyte Coda' },
  invasion:    { label: 'Invasion ödülü', limited: true },
  companion:   { label: 'Yetiştirme / evcilleştirme' },
  prime_vault: { label: 'Prime Vault (takas / Prime Resurgence)', limited: true },
  baro:        { label: 'Baro Ki\'Teer', limited: true },
  etkinlik:    { label: 'Etkinlik ödülü', limited: true },
  nightwave:   { label: 'Nightwave / özel', limited: true },
  gunluk_odul: { label: 'Günlük giriş ödülü', limited: true },
  market_kaldirildi: { label: 'Market dışı (nadir etkinlik)', limited: true },
  founders:    { label: 'Founders — elde edilemez', impossible: true },
  unknown:     { label: 'Bilinmiyor' },
};

/**
 * Assumptions (hours unless noted). Rough community-typical values for a
 * mid-game player; NOT measured. Change them here, not in the formulas.
 */
export const DEFAULTS = {
  // Levelling one 0→30 cycle (Steel Path / good XP spots).
  levelHours: {
    weapon: 0.5, warframe: 0.75, companion: 0.75, archwing: 1, kdrive: 1, necramech: 1, plexus: 2,
  },
  formaHours: 0.2,              // getting one Forma (blueprint + build), active time
  // Minutes per attempt at a drop source, by mission/source type (first match wins).
  attemptMinutes: [
    [/Relic/, 8],                                        // fissure run incl. relic farming
    [/Bounty|Bounties/, 15],
    [/\(Survival\)|Survival\)?, Rotation C/, 20],
    [/\(Defense\)|Mirror Defense/, 15],
    [/Disruption/, 16],
    [/Interception|Excavation|Alchemy|Void Flood|Void Cascade/, 12],
    [/Caches|Spy|Sabotage/, 9],
    [/Assassination|Assassinate|\(Ascension\)/, 8],
    [/Skirmish|Railjack|Orphix/, 15],
    [/Duviri|Circuit/, 12],
    [/Sanctuary Onslaught/, 10],
    [/Exterminate|Capture|Rescue|Mobile Defense/, 6],
  ],
  defaultAttemptMinutes: 12,    // bosses, special spawns, containers, anything unmatched
  // Plain enemy names ("Arid Heavy Gunner") are per-kill drops: one attempt = one kill.
  enemyKillMinutes: 1,
  notAnEnemy: /Relic|Coffer|Cache|Container|Cannister|Formation|Drum|Duviri|Circuit|Stalker|\bVor\b|Jackal|Hunhow|Erra|Wolf|Kela|Lephantis|Ambulas|Alad|Lech Kril|Tyl Regor|Ruk|\bHek\b|Raptor|Sargas|Ropalolyst|Exploiter|Profit-Taker|lyst$|Grustrag|Zanuka|Harvester|Lich|Sister|Juggernaut|Thumper|Archon|Coda|Itzam|Particles|Orb\b/,
  // Fixed active hours per method when there is no drop data to compute from.
  methodHours: {
    market: 0, market_plat: 0, dojo: 0.25, vendor: 1.5, quest: 2, adversary: 4,
    invasion: 1.5, companion: 1.5, prime_vault: 0.5, baro: 0.25, etkinlik: 2,
    nightwave: 2, gunluk_odul: 0, market_kaldirildi: 2, unknown: 2, founders: Infinity,
  },
  // Resource farming, hours per unit. Commons are near-free for a mid-game player.
  resourceHours: {
    _common: 0.00003,   // Ferrite, Alloy Plate, Rubedo, Salvage, Circuits, Polymer, Plastids, Nano Spores, Cryotic…
    _rareDefault: 0.03, // small-count special resources not listed below
    _bulkDefault: 0.0005, // large-count special resources not listed below
    'Orokin Cell': 0.04, 'Argon Crystal': 0.05, 'Neural Sensors': 0.06, 'Neurodes': 0.04,
    'Morphics': 0.03, 'Gallium': 0.03, 'Control Module': 0.02, 'Tellurium': 0.12,
    'Nitain Extract': 0.15, 'Fieldron': 0.04, 'Detonite Injector': 0.04, 'Mutagen Mass': 0.04,
    'Forma': 0.2, 'Oxium': 0.002,
  },
  commonResources: [
    'Ferrite', 'Alloy Plate', 'Rubedo', 'Salvage', 'Circuits', 'Polymer Bundle', 'Plastids',
    'Nano Spores', 'Cryotic', 'Hexenon', 'Kuva', 'Credits',
  ],
};

const LEVEL_GROUP = {
  warframe: 'warframe', archwing: 'archwing', necramech: 'necramech', kdrive: 'kdrive', plexus: 'plexus',
  sentinel: 'companion', kubrow: 'companion', kavat: 'companion', predasite: 'companion',
  vulpaphyla: 'companion', moa: 'companion', hound: 'companion',
};

export function attemptMinutes(location, cfg = DEFAULTS) {
  for (const [re, min] of cfg.attemptMinutes) if (re.test(location)) return min;
  if (!/[/,(]/.test(location) && !cfg.notAnEnemy.test(location)) return cfg.enemyKillMinutes;
  return cfg.defaultAttemptMinutes;
}

/**
 * Expected number of attempts to collect every part when each attempt yields
 * at most one of them (part i with probability p[i]). Exact, by
 * inclusion–exclusion over subsets: E = Σ_{S≠∅} (-1)^{|S|+1} / Σ_{i∈S} p_i.
 */
export function expectedAttempts(probs) {
  const p = probs.filter((x) => x > 0);
  if (p.length !== probs.length) return Infinity;
  if (p.length > 12) throw new Error('çok fazla parça');
  let e = 0;
  for (let mask = 1; mask < 1 << p.length; mask++) {
    let sum = 0;
    let bits = 0;
    for (let i = 0; i < p.length; i++) if (mask & (1 << i)) { sum += p[i]; bits++; }
    e += (bits % 2 ? 1 : -1) / sum;
  }
  return e;
}

/** Hours to collect parts. Parts sharing one source location compete for the same reward roll. */
export function partsHours(parts, cfg = DEFAULTS) {
  const byLoc = new Map();
  for (const part of parts) {
    if (!byLoc.has(part.location)) byLoc.set(part.location, []);
    byLoc.get(part.location).push(part.chance / 100);
  }
  let hours = 0;
  for (const [loc, probs] of byLoc) hours += (expectedAttempts(probs) * attemptMinutes(loc, cfg)) / 60;
  return hours;
}

export function resourceHours(resources = [], cfg = DEFAULTS) {
  let h = 0;
  for (const { name, count } of resources) {
    let per = cfg.resourceHours[name];
    if (per == null) {
      if (cfg.commonResources.includes(name)) per = cfg.resourceHours._common;
      else per = count > 100 ? cfg.resourceHours._bulkDefault : cfg.resourceHours._rareDefault;
    }
    h += per * count;
  }
  return h;
}

/** Hours for one 0→cap levelling cycle of this item. */
export function levelCycleHours(item, cfg = DEFAULTS) {
  return cfg.levelHours[LEVEL_GROUP[item.category] || 'weapon'];
}

export function levelHours(item, cfg = DEFAULTS) {
  const one = levelCycleHours(item, cfg);
  const cycles = 1 + (item.forma || 0) + (item.gild ? 1 : 0);
  return one * cycles + (item.forma || 0) * cfg.formaHours;
}

/**
 * Full estimate for one item.
 * Returns { method, label, acquireHours, levelHours, totalHours, calendarHours, xpPerHour, steps, limited, impossible }
 */
export function estimateEffort(item, acq, cfg = DEFAULTS) {
  const method = acq?.method || 'unknown';
  const meta = METHODS[method] || METHODS.unknown;
  const steps = [];

  let acquire;
  if (acq?.parts?.length) {
    acquire = partsHours(acq.parts, cfg);
    steps.push({ label: 'Parça/plan farmı', hours: acquire });
  } else {
    acquire = cfg.methodHours[method] ?? cfg.methodHours.unknown;
    if (acquire > 0 && Number.isFinite(acquire)) steps.push({ label: meta.label, hours: acquire });
  }
  const res = resourceHours(acq?.resources, cfg);
  if (res >= 0.05) steps.push({ label: 'Kaynaklar', hours: res });
  acquire += res;

  const level = levelHours(item, cfg);
  steps.push({ label: item.forma ? `Seviye atlatma (${item.forma} Forma ile ${1 + item.forma} tur)` : item.gild ? 'Seviye atlatma (gilding ile 2 tur)' : 'Seviye atlatma', hours: level });

  const totalHours = acquire + level;
  const calendarHours = (acq?.buildHours || 0) + (item.forma ? 24 : 0);
  return {
    method,
    label: meta.label,
    acquireHours: acquire,
    levelHours: level,
    totalHours,
    calendarHours,
    xpPerHour: Number.isFinite(totalHours) && totalHours > 0 ? item.mastery / totalHours : 0,
    steps,
    limited: !!meta.limited,
    impossible: !!meta.impossible,
  };
}

/** Player-specific speed settings (1 = defaults). */
export const SPEED_DEFAULTS = { levelSpeed: 1, farmSpeed: 1 };

/**
 * DEFAULTS scaled by the player's speed: `levelSpeed` multiplies levelling
 * time, `farmSpeed` multiplies every acquisition time (mission minutes, fixed
 * method hours, resources, Forma). 0.5 = twice as fast, 2 = twice as slow.
 */
export function configFor(speed = SPEED_DEFAULTS, base = DEFAULTS) {
  const lv = speed.levelSpeed ?? 1;
  const fm = speed.farmSpeed ?? 1;
  const scale = (obj, f) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v * f]));
  return {
    ...base,
    levelHours: scale(base.levelHours, lv),
    formaHours: base.formaHours * fm,
    attemptMinutes: base.attemptMinutes.map(([re, min]) => [re, min * fm]),
    defaultAttemptMinutes: base.defaultAttemptMinutes * fm,
    enemyKillMinutes: base.enemyKillMinutes * fm,
    methodHours: scale(base.methodHours, fm),
    resourceHours: scale(base.resourceHours, fm),
  };
}

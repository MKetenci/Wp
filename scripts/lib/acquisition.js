/**
 * Classifies how each item is obtained, from (in priority order):
 *   1. manual overrides (data/acquisition-overrides.json)
 *   2. wiki Exclusive Mastery groups
 *   3. wiki weapon traits (Kuva Lich, Tenet, Technocyte Coda, Invasion Reward)
 *   4. wiki Dojo research list
 *   5. @wfcd/items drop locations of the blueprint and parts
 *      (relics, syndicate vendors, quests, bounties, missions, enemies)
 *   6. @wfcd/items Market prices
 * and returns the `acq` object consumed by web/js/effort.js.
 */
import { attemptMinutes } from '../../web/js/effort.js';

const PART_RE = /Blueprint|Chassis|Neuroptics|Systems|Harness|Wings|Barrel|Receiver|Stock|Blades?$|Handle|Hilt|Guard|Head|Grip|String|Limb|Pouch|Stars|Disc|Link|Chain|Ornament|Gauntlet|Boot|Carapace|Cerebrum|Capsule|Casing|Engine|Weapon Pod|Core|Bracket|Stabilizer|Model|Hook|Heatsink|Motor|Buckle|Band/;
const VENDOR_RE = /^(Ostron|Solaris United|Vox Solaris|Entrati|NecraLoid|Red Veil|Steel Meridian|Arbiters of Hexis|Cephalon Suda|New Loka|The Perrin Sequence|Conclave|Ventkids|Kahl's Garrison|The Quills|The Holdfasts|Cavia|The Hex|Cephalon Simaris)\b(?: \(([^)]+)\))?(?:, (.+))?$/;
const QUEST_RE = /^(?:Cephalon Simaris, )?(?:Complete|Unlock through|Defeat) (?:the )?(.+?)(?: \(Quest\))?$/;
const SYNDICATE_OF_WEAPONS = new Set(['Steel Meridian', 'Arbiters of Hexis', 'Cephalon Suda', 'The Perrin Sequence', 'Red Veil', 'New Loka']);

// Resources that can appear with count 1 (so the count alone can't tell them from parts).
const SINGLE_RESOURCES = /^(Orokin Cell|Forma|Argon Crystal|Neural Sensors|Neurodes|Morphics|Gallium|Control Module|Tellurium|Nitain Extract)$/;

export function classifyLocation(location) {
  if (/Relic/.test(location)) return { kind: 'relic' };
  if (/^Operation:|^Operational Supply/.test(location)) return { kind: 'event' };
  const quest = location.match(QUEST_RE);
  if (quest) {
    if (/Daily Tribute/.test(quest[1])) return { kind: 'gunluk_odul' };
    return { kind: 'quest', quest: quest[1] };
  }
  const vendor = location.match(VENDOR_RE);
  if (vendor && !/Rotation|Bounty|\//.test(location)) return { kind: 'vendor', syndicate: vendor[1], npc: vendor[2] || null, rank: vendor[3] || null };
  if (/Bounty|Bounties/.test(location)) return { kind: 'bounty' };
  return { kind: 'drop' };
}

/** The source with the lowest expected time per success (minutes per attempt / chance). */
const best = (drops, kinds) =>
  drops
    .map((d) => ({ ...d, cls: classifyLocation(d.location) }))
    .filter((d) => kinds.includes(d.cls.kind) && d.chance > 0)
    .sort((a, b) => attemptMinutes(a.location) / a.chance - attemptMinutes(b.location) / b.chance)[0] || null;

/**
 * @param item  built item (name, category, traits, isPrime, exclusive, acquisition from WFCD)
 * @param ctx   { research: Map(name → research entry), overrides: {}, itemNames: Set }
 */
export function classify(item, ctx) {
  const wf = item.acquisition || { drops: [], components: [] };
  const acq = {
    method: 'unknown',
    source: null,
    parts: [],
    resources: [],
    requires: [],
    platCost: wf.marketCost ?? null,
    tradable: !!wf.tradable || wf.components.some((c) => c.tradable),
    buildHours: 0,
    confidence: 'düşük',
    note: null,
  };

  // Split components into parts, consumed items and resources.
  const partComps = [];
  for (const c of wf.components) {
    if (ctx.itemNames.has(c.name) && c.name !== item.name) acq.requires.push(`${c.name} (üretimde tüketilir)`);
    else if (c.count === 1 && !SINGLE_RESOURCES.test(c.name) && (PART_RE.test(c.name) || c.drops.length)) partComps.push(c);
    else acq.resources.push({ name: c.name, count: c.count });
  }
  const hasBuiltParts = partComps.some((c) => c.name !== 'Blueprint');
  acq.buildHours = (wf.buildTimeSec || 0) / 3600 + (hasBuiltParts ? 12 : 0);
  if (item.masteryReq) acq.requires.unshift(`MR ${item.masteryReq}`);

  const set = (method, confidence, extra = {}) => Object.assign(acq, { method, confidence }, extra);
  const traits = item.traits || [];
  const override = ctx.overrides[item.name];

  if (override) {
    set(override.method, override.confidence || 'orta', { source: override.source || null, note: override.note || null });
    if (override.requires) acq.requires.push(...override.requires);
  } else if (item.exclusive) {
    set(item.exclusive.group, 'yüksek', { source: item.exclusive.acquisition });
  } else if (traits.includes('Kuva Lich')) {
    set('adversary', 'yüksek', { source: 'Kuva Lich' });
  } else if (traits.includes('Tenet')) {
    set('adversary', 'yüksek', { source: 'Sisters of Parvos' });
  } else if (traits.includes('Technocyte Coda')) {
    set('adversary', 'yüksek', { source: 'Technocyte Coda' });
  } else if (ctx.research.has(item.name)) {
    const r = ctx.research.get(item.name);
    set('dojo', 'yüksek', { source: r.labName });
    acq.requires.push(`Klan Dojo: ${r.labName} araştırması`);
  } else {
    classifyFromDrops(item, acq, partComps, wf, set);
  }

  if (!['relic', 'drop', 'bounty'].includes(acq.method)) acq.parts = [];
  acq.requires = [...new Set(acq.requires)];
  return acq;
}

function classifyFromDrops(item, acq, partComps, wf, set) {
  const traits = item.traits || [];
  const allDrops = [...wf.drops, ...partComps.flatMap((c) => c.drops)];
  const kinds = allDrops.map((d) => classifyLocation(d.location));

  // Prime: parts from relics.
  if (item.isPrime && kinds.some((k) => k.kind === 'relic')) {
    for (const c of partComps) {
      const b = best(c.drops, ['relic']);
      if (b) acq.parts.push({ name: c.name, location: b.location, chance: b.chance });
    }
    return set('relic', 'yüksek');
  }

  // A quest may give the blueprint while the parts are still farmed: keep it as a requirement
  // and only call it a quest reward when nothing else has to be farmed.
  const quest = kinds.find((k) => k.kind === 'quest');
  if (quest) {
    acq.requires.push(`Görev: ${quest.quest}`);
    acq.source = quest.quest;
  }
  if (kinds.some((k) => k.kind === 'gunluk_odul')) return set('gunluk_odul', 'yüksek');

  // Vendor requirements (a blueprint sold by a syndicate) apply even when parts drop elsewhere.
  const vendor = kinds.find((k) => k.kind === 'vendor');
  if (vendor) {
    const who = vendor.npc ? `${vendor.syndicate} (${vendor.npc})` : vendor.syndicate;
    acq.requires.push(vendor.rank ? `${who}: ${vendor.rank} rütbesi` : who);
    acq.source = acq.source || who;
  }

  // Per part: bought from a vendor (no farming), else farmed in missions/bounties/from enemies.
  let anyBounty = false;
  let missing = false;
  let eventOnly = false;
  for (const c of partComps) {
    if (best(c.drops, ['vendor'])) continue;
    if (c.name === 'Blueprint' && wf.bpCost) continue; // sold in the Market for credits
    const b = best(c.drops, ['drop', 'bounty']);
    if (b) {
      acq.parts.push({ name: c.name, location: b.location, chance: b.chance });
      if (b.cls.kind === 'bounty') anyBounty = true;
    } else if (best(c.drops, ['event'])) {
      eventOnly = true;
    } else if (!(c.name === 'Blueprint' && wf.bpCost)) {
      missing = true;
    }
  }
  if (acq.parts.length) {
    if (missing) acq.note = 'Bazı parçaların kaynağı veride yok; süre eksik hesaplanmış olabilir.';
    return set(anyBounty ? 'bounty' : 'drop', missing ? 'orta' : 'yüksek');
  }

  if (quest) return set('quest', 'yüksek');
  if (vendor) return set('vendor', missing ? 'orta' : 'yüksek');
  if (eventOnly) return set('etkinlik', 'orta', { note: 'Yalnızca süreli bir etkinlikte (Operation) bulunuyor.' });
  if (traits.includes('Syndicate')) return set('vendor', 'orta', { source: traits.find((t) => SYNDICATE_OF_WEAPONS.has(t)) || 'Syndicate' });
  if (traits.includes('Invasion Reward') || /(Vandal|Wraith)$/.test(item.name)) return set('invasion', traits.includes('Invasion Reward') ? 'yüksek' : 'orta');
  if (wf.bpCost) {
    // A Market Warframe blueprint does not include the part blueprints.
    if (missing && item.category === 'warframe') return set('market', 'orta', { note: 'Ana plan Market\'te; parçaların kaynağı veride yok.' });
    return set('market', 'yüksek');
  }
  if (wf.marketCost) return set('market_plat', 'orta', { note: 'Planın kaynağı veride yok; Market\'te platinle hazır satılıyor.' });
  if (['sentinel', 'robotic'].includes(item.category)) return set('market', 'orta', { note: 'Sentinel silahları genelde kendi sentineli ile birlikte gelir.' });
  if (['primary', 'secondary', 'melee'].includes(item.category)) {
    return set('market', 'düşük', { note: 'Kaynak verisi yok; başlangıç/Market silahı olduğu varsayıldı.' });
  }
  return set('unknown', 'düşük');
}

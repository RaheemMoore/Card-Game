import type { ArchetypeName, Rank } from '../types/card';

/**
 * Per-archetype companion / servant / unit pools, from
 * Archetype_Weapon_and_Companion_Reference.md §2 (canonical terminology) + the
 * per-archetype servant/unit type lists. Only the five archetypes that HAVE a
 * companion system are populated (Barbarian/Monk/Druid/Lycanthrope/Seraph/Human
 * have none by default — their "allies are people/peers", not equipment).
 *
 * A companion TYPE is rolled + LOCKED at Foundation (this necromancer commands
 * skeletons; that one commands wraiths). The QUANTITY scales with rank via
 * companionPresence() — none at Foundation (restraint), a few at Forged, a
 * legion at Ascended — and the assembler keeps them subordinate/background so
 * they never fight the hero silhouette (env doc §2.1).
 */
export interface CompanionEntry {
  id: string;
  /** Short plural noun phrase for the background, e.g. "hooded oathbound dead". */
  descriptor: string;
}

const NECROMANCER_SERVANTS: readonly CompanionEntry[] = [
  { id: 'skeleton_warriors', descriptor: 'armored skeleton warriors with rusted blades' },
  { id: 'bone_archers', descriptor: 'skeletal bone-archers with drawn bows' },
  { id: 'hooded_dead', descriptor: 'silent hooded oathbound dead in tattered shrouds' },
  { id: 'drifting_wraiths', descriptor: 'drifting translucent wraiths trailing soul-mist' },
  { id: 'corpse_guards', descriptor: 'hulking stitched corpse-guards standing sentinel' },
  { id: 'bone_hounds', descriptor: 'four-legged skeletal hound-beasts prowling on all fours (canine animals, NOT humanoid)' },
  { id: 'grave_poltergeists', descriptor: 'flickering poltergeists rattling grave-debris in the air' },
  // Bone Colossus (Raheem, 2026-07-23) — a summoned towering bone-giant the
  // Necromancer commands at higher ranks. Phrased plural so rank-scaling reads
  // ("a few …" at Forged, "a massed legion of …" at Ascendant = multiple colossi).
  { id: 'bone_colossus', descriptor: 'towering bone-colossus giants, each built from hundreds of fused skeletons, looming over the field' },
];

const BEASTMASTER_BEASTS: readonly CompanionEntry[] = [
  { id: 'war_beast', descriptor: 'a powerful bonded war-beast moving in step with them' },
  { id: 'flying_beast', descriptor: 'a great bonded flying beast wheeling overhead' },
  { id: 'tracker_pack', descriptor: 'a lean bonded tracker-beast pacing at their side' },
  { id: 'guardian_beast', descriptor: 'a massive guardian-beast shielding their flank' },
  { id: 'mythic_beast', descriptor: 'a rare mythic beast half-seen in the mist' },
];

const VAMPIRE_SERVANTS: readonly CompanionEntry[] = [
  { id: 'bloodbound_thralls', descriptor: 'pale bloodbound thralls kneeling in attendance' },
  { id: 'winged_familiars', descriptor: 'winged crimson familiars circling above' },
  { id: 'gargoyle_wardens', descriptor: 'stone gargoyle-wardens perched and watching' },
  { id: 'blood_golem', descriptor: 'a towering blood-golem looming behind' },
  { id: 'court_attendants', descriptor: 'elegant enthralled court attendants at a distance' },
];

const MECHPILOT_UNITS: readonly CompanionEntry[] = [
  { id: 'assault_drones', descriptor: 'a flight of assault drones in formation, signal-lines to the pilot' },
  { id: 'shield_drones', descriptor: 'hovering shield-drones projecting a barrier' },
  { id: 'sniper_drones', descriptor: 'perched sniper-drones covering the angles' },
  { id: 'support_units', descriptor: 'trundling support-units and ammunition carriers' },
];

const ANDROID_UNITS: readonly CompanionEntry[] = [
  { id: 'combat_robots', descriptor: 'autonomous combat-robots acting on their own initiative' },
  { id: 'hunter_drones', descriptor: 'independent hunter-drones sweeping the area' },
  { id: 'guardian_drones', descriptor: 'guardian-drones holding a protective perimeter' },
  { id: 'ai_swarm', descriptor: 'a distributed sensor-swarm blinking through the air' },
];

const COMPANION_POOLS: Partial<Record<ArchetypeName, readonly CompanionEntry[]>> = {
  Necromancer: NECROMANCER_SERVANTS,
  Beastmaster: BEASTMASTER_BEASTS,
  Vampire: VAMPIRE_SERVANTS,
  'Mech Pilot': MECHPILOT_UNITS,
  Android: ANDROID_UNITS,
};

export function getCompanionPool(archetype: ArchetypeName): readonly CompanionEntry[] {
  return COMPANION_POOLS[archetype] ?? [];
}

export function getCompanionById(archetype: ArchetypeName, id: string): CompanionEntry | undefined {
  return getCompanionPool(archetype).find((c) => c.id === id);
}

/**
 * Whether THIS character has a companion retinue at all — a 50/50 roll per card
 * (Raheem 2026-07-21: companions should be a chance, not on every card). Rolled
 * ONCE and locked. Beastmaster always has its bonded beast (that IS the
 * archetype). Archetypes with no pool never have one. Pass a [0,1) roll so this
 * stays pure + testable.
 */
export function companionAppears(archetype: ArchetypeName, roll: number): boolean {
  if (getCompanionPool(archetype).length === 0) return false;
  if (archetype === 'Beastmaster') return true;
  return roll < 0.5;
}

/**
 * Rank-scaled quantity phrasing. Foundation shows NONE (restraint — the power
 * hasn't reached command scale yet); Forged shows a few; Ascended a legion.
 * Beastmaster is the exception — a bonded beast is a lifelong partner, present
 * from the start — so it appears at every rank (singular, growing in presence).
 */
export function companionPresence(archetype: ArchetypeName, rank: Rank, descriptor: string): string {
  if (!descriptor) return '';
  if (archetype === 'Beastmaster') {
    return rank === 'Ascendant'
      ? `${descriptor}, at the peak of their bond`
      : descriptor;
  }
  if (rank === 'Foundation') return '';
  if (rank === 'Forged') return `a few ${descriptor} gathering in the mid-ground`;
  return `a massed legion of ${descriptor} arrayed behind them`;
}

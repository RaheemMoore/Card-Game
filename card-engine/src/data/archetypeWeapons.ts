import type { ArchetypeName, Rank } from '../types/card';

/**
 * Curated per-archetype weapon pools with a three-tier visual evolution, from
 * Archetype_Weapon_and_Companion_Reference.md (families) +
 * Archetype_Weapon_and_Companion_Upgrade_Paths.md (per-rank progression).
 *
 * A weapon is rolled from the pool at Foundation and LOCKED across ranks — it
 * stays the SAME weapon family, but its descriptor GROWS per rank (Ritual →
 * Soul-Bound → Death-Sovereign for Necromancer). Descriptors are element-neutral
 * (the element wreath is added by the assembler from the card's element) and
 * avoid the §4.4 "same sword with a different glow" trap.
 */
export interface WeaponEntry {
  /** Stable id used to persist the locked weapon across ranks. */
  id: string;
  name: string;
  /** Full visual descriptor per rank — same family, visibly upgraded. */
  byRank: Record<Rank, string>;
}

const NECROMANCER_WEAPONS: readonly WeaponEntry[] = [
  {
    id: 'grave_scythe',
    name: 'Grave Scythe',
    byRank: {
      Foundation: 'a Grave Scythe — a long curved polearm of blackened funeral steel and bone, faint grave-runes, contained and practical',
      Forged: 'the SAME Grave Scythe, now Soul-Bound — its edge exhaling pale spirit-vapor, grave-runes lit, cutting curses as well as flesh (unmistakably the same scythe, upgraded)',
      Ascendant: 'the SAME Grave Scythe, now Death-Sovereign — a chorus of bound spectral names circling the blade, cold radiance along the edge (the same scythe at mythic power)',
    },
  },
  {
    id: 'reliquary_staff',
    name: 'Reliquary Staff',
    byRank: {
      Foundation: 'a Reliquary Staff — a tall staff with a sealed relic chamber holding one fragment of bone or memory, contained',
      Forged: 'the SAME Reliquary Staff, now Soul-Bound — its reliquary awakened, an advising spirit’s face flickering within the crystal',
      Ascendant: 'the SAME Reliquary Staff, now Death-Sovereign — several luminous ancestor-memories orbiting the staff, each an individual face',
    },
  },
  {
    id: 'soul_lantern',
    name: 'Soul Lantern',
    byRank: {
      Foundation: 'a Soul Lantern — an iron-and-glass lantern on a bone pole that reveals nearby spirit-traces, still and empty',
      Forged: 'the SAME Soul Lantern, now Soul-Bound — one captured soul burning inside as a cold guiding flame',
      Ascendant: 'the SAME Soul Lantern, now Death-Sovereign — a stable constellation of individually visible souls powering it',
    },
  },
  {
    id: 'mourning_bell',
    name: 'Mourning Bell',
    byRank: {
      Foundation: 'a Mourning Bell — a dark tarnished-bronze handbell on a carved bone handle whose tone exposes hidden spirits',
      Forged: 'the SAME Mourning Bell, now Soul-Bound — each ring releasing visible memory-ripples and summoning a chosen dead witness',
      Ascendant: 'the SAME Mourning Bell, now Death-Sovereign — tolling without being struck, the veil itself resonating around it',
    },
  },
  {
    id: 'epitaph_blade',
    name: 'Epitaph Blade',
    byRank: {
      Foundation: 'an Epitaph Blade — a straight double-edged one-handed SWORD (never an axe) of dull funerary steel, the names of the dead scratched down the blade, contained',
      Forged: 'the SAME Epitaph Blade (a straight double-edged SWORD, never an axe), now Soul-Bound — fresh inscriptions glowing along the blade as it records final memories mid-strike',
      Ascendant: 'the SAME Epitaph Blade (a straight double-edged SWORD), now Death-Sovereign — spectral echoes of every recorded bearer manifesting along the long blade',
    },
  },
];

const WEAPON_POOLS: Partial<Record<ArchetypeName, readonly WeaponEntry[]>> = {
  Necromancer: NECROMANCER_WEAPONS,
};

export function getWeaponPool(archetype: ArchetypeName): readonly WeaponEntry[] {
  return WEAPON_POOLS[archetype] ?? [];
}

export function getWeaponById(archetype: ArchetypeName, id: string): WeaponEntry | undefined {
  return getWeaponPool(archetype).find((w) => w.id === id);
}

/** The rank-appropriate descriptor for a locked weapon, or empty if unknown. */
export function getWeaponDescriptor(archetype: ArchetypeName, id: string, rank: Rank): string {
  return getWeaponById(archetype, id)?.byRank[rank] ?? '';
}

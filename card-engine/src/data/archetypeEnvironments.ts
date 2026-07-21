import type { ArchetypeName, Rank } from '../types/card';

/**
 * Curated per-archetype environment families, from
 * Archetype_Environment_and_Background_Reference.md.
 *
 * A family is rolled at Foundation and LOCKED across ranks; its descriptor
 * ESCALATES in scale/consequence per rank (env doc §2.3: local → wider stakes →
 * mythic) while staying the same place. Necromancer settings stay dark/nocturnal
 * and varied — NOT "an evil graveyard" every time (env doc §Necromancer avoid).
 * Element colour comes from the assembler's scene-palette lead; these supply the
 * SPECIFIC setting + a piece of environmental storytelling (§5.3).
 */
export interface EnvironmentFamily {
  id: string;
  name: string;
  /** Full setting descriptor per rank — same place, escalating consequence. */
  byRank: Record<Rank, string>;
}

const NECROMANCER_ENVIRONMENTS: readonly EnvironmentFamily[] = [
  {
    id: 'cemetery_district',
    name: 'Rain-Soaked Cemetery District',
    byRank: {
      Foundation: 'a rain-soaked working cemetery district at night, headstones and iron railings, the lamplit windows of an ordinary city beyond',
      Forged: 'the same cemetery district at night, now thick with unquiet spirits and fog rolling between the crypts, a gathering haunting',
      Ascendant: 'the whole necropolis-city risen at midnight, avenues of tombs stretching out and a sky adrift with souls',
    },
  },
  {
    id: 'archive_testimonies',
    name: 'Archive of Last Testimonies',
    byRank: {
      Foundation: 'a candlelit crypt-archive of death-masks and sealed testimonies, tall shelves of funerary records in deep shadow',
      Forged: 'the archive stirring awake, pages turning themselves as spectral witnesses gather between the shelves',
      Ascendant: 'a vast floating archive of spectral pages, countless dead witnesses testifying at once in the dark',
    },
  },
  {
    id: 'battlefield_first_dawn',
    name: 'Battlefield at First Dawn',
    byRank: {
      Foundation: 'a quiet war-torn field before dawn, scattered arms and hasty cairns, lingering battlefield mist',
      Forged: 'the battlefield thick with rising war-ghosts, fragmented memories replaying across the churned ground',
      Ascendant: 'an endless spectral army rising from the war-field beneath a torn, sunless pre-dawn sky',
    },
  },
  {
    id: 'ancestral_memory_court',
    name: 'Ancestral Memory Court',
    byRank: {
      Foundation: 'a shadowed spirit-court where a few ancestral dead gather as quiet witnesses around a low dais',
      Forged: 'the memory-court in full session, ranks of luminous ancestors advising, accusing, and remembering',
      Ascendant: 'a boundless court of the dead, a sea of ancestral spirits stretching past the horizon',
    },
  },
  {
    id: 'veil_breach_threshold',
    name: 'Veil-Breach Threshold',
    byRank: {
      Foundation: 'a narrow tear in reality where the living world overlaps the realm of the dead, cold light bleeding through',
      Forged: 'the veil-breach widening, spirits pouring through a growing rift between the two worlds',
      Ascendant: 'a colossal veil-breach, the boundary between life and death torn wide open across the sky',
    },
  },
];

const ENVIRONMENT_POOLS: Partial<Record<ArchetypeName, readonly EnvironmentFamily[]>> = {
  Necromancer: NECROMANCER_ENVIRONMENTS,
};

export function getEnvironmentPool(archetype: ArchetypeName): readonly EnvironmentFamily[] {
  return ENVIRONMENT_POOLS[archetype] ?? [];
}

export function getEnvironmentById(archetype: ArchetypeName, id: string): EnvironmentFamily | undefined {
  return getEnvironmentPool(archetype).find((e) => e.id === id);
}

/** The rank-appropriate setting for a locked environment family, or empty. */
export function getEnvironmentDescriptor(archetype: ArchetypeName, id: string, rank: Rank): string {
  return getEnvironmentById(archetype, id)?.byRank[rank] ?? '';
}

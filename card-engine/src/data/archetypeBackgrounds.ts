import type { ArchetypeName } from '../types/card';

const BASE = '/assets/backgrounds/archetypes';

const SLUGS: Record<ArchetypeName, string> = {
  Barbarian: 'barbarian',
  Monk: 'monk',
  Beastmaster: 'beastmaster',
  Druid: 'druid',
  Necromancer: 'necromancer',
  Vampire: 'vampire',
  Lycanthrope: 'lycanthrope',
  'Mech Pilot': 'mech-pilot',
  Android: 'android',
  Seraph: 'seraph',
  Human: 'human',
};

/**
 * One static background per archetype (landscape + portrait), shown for the
 * whole forge flow once an archetype is chosen. Replaces the old dynamic
 * forge-scene system that swapped art again when the element was picked.
 */
export function archetypeBackgroundFor(
  archetype: ArchetypeName | null,
): { landscape: string; portrait: string } | null {
  if (!archetype) return null;
  const slug = SLUGS[archetype];
  return {
    landscape: `${BASE}/landscape/${slug}.jpg`,
    portrait: `${BASE}/portrait/${slug}.jpg`,
  };
}

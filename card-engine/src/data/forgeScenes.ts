import type { ArchetypeName } from '../types/card';
import type { ElementName } from '../types/bible';

/**
 * Dynamic forge-scene backgrounds. As the player moves through the forge, the
 * world transforms: an entry scene once an archetype is chosen, then the chosen
 * element's scene. Flat composites (background + anvil + element plume) exported
 * from the Figma forge-scene template — see scripts/bg-harness/FORGE_MANIFEST.md.
 *
 * Only archetypes with authored scenes appear here; others fall back to null
 * (the app keeps its default background).
 */
interface ArchetypeScenes {
  entry: string;
  elements: Partial<Record<ElementName, string>>;
}

const BASE = '/assets/forge';

export const FORGE_SCENES: Partial<Record<ArchetypeName, ArchetypeScenes>> = {
  Druid: {
    entry: `${BASE}/druid/entry.jpg`,
    elements: {
      Nature: `${BASE}/druid/nature.jpg`,
      Poison: `${BASE}/druid/poison.jpg`,
    },
  },
  Vampire: {
    entry: `${BASE}/vampire/entry.jpg`,
    elements: {
      Blood: `${BASE}/vampire/blood.jpg`,
      Shadow: `${BASE}/vampire/shadow.jpg`,
      Nocturne: `${BASE}/vampire/nocturne.jpg`,
      Sanguine: `${BASE}/vampire/sanguine.jpg`,
    },
  },
  Necromancer: {
    entry: `${BASE}/necromancer/entry.jpg`,
    elements: {
      Blood: `${BASE}/necromancer/blood.jpg`,
      Poison: `${BASE}/necromancer/poison.jpg`,
      Shadow: `${BASE}/necromancer/shadow.jpg`,
      Bone: `${BASE}/necromancer/bone.jpg`,
    },
  },
};

/**
 * The scene to show for the current forge state. Before an element is chosen,
 * the entry scene; after, the element's scene. Returns null when the archetype
 * has no authored scenes yet (keep the default background).
 */
export function forgeSceneFor(
  archetype: ArchetypeName | null,
  element: ElementName | null,
): string | null {
  if (!archetype) return null;
  const scenes = FORGE_SCENES[archetype];
  if (!scenes) return null;
  if (element && scenes.elements[element]) return scenes.elements[element]!;
  return scenes.entry;
}

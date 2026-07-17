import type { ArchetypeName } from '../types/card';

export type EmblemStatus =
  | 'not_started'
  | 'prompt_ready'
  | 'draft_generated'
  | 'revision_requested'
  | 'approved'
  | 'integrated';

export interface EmblemMeta {
  status: EmblemStatus;
  assetPath: string | null;
  primarySymbol: string;
  palette: string;
}

/**
 * Archetype selection emblems — canonical spec in
 * `card-engine-archetype-emblem-library.md`. The ten shipped emblems are
 * `integrated`; Lycanthrope has no emblem yet and falls back to the
 * first-letter tile in ArchetypeSelector until `design-archetype-emblem`
 * runs against it.
 *
 * `assetPath` values are served from `card-engine/public/assets/`.
 */
export const ARCHETYPE_EMBLEMS: Record<ArchetypeName, EmblemMeta> = {
  Barbarian: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/barbarian.jpg',
    primarySymbol: 'Blood-Iron ancestral clan crest',
    palette: 'Blackened iron, aged silver, red enamel, bone ivory, worn leather',
  },
  Monk: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/monk.jpg',
    primarySymbol: 'Circular monastery seal with clenched-fist medallion',
    palette: 'Burnt orange, deep amber, dark brown, warm gold-brown, aged bronze, ivory',
  },
  Beastmaster: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/beastmaster.jpg',
    primarySymbol: 'Owl-bear-wolf ceremonial beast totem',
    palette: 'Walnut, bark brown, aged bronze, bone ivory, forest green, polished gold',
  },
  Druid: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/druid.jpg',
    primarySymbol: 'Rootweaver open hand grown from roots',
    palette: 'Deep forest green, moss green, bark brown, weathered stone, aged bronze, warm gold',
  },
  Necromancer: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/necromancer.jpg',
    primarySymbol: 'Left-facing skull inside a black crescent moon',
    palette: 'Bone ivory, near-black, aged silver, midnight purple',
  },
  Vampire: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/vampire.jpg',
    primarySymbol: 'Bat-face-and-dagger relic backed by a blood moon',
    palette: 'Blood red, deep crimson, near-black, aged silver, bone ivory, garnet',
  },
  Lycanthrope: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/lycanthrope.jpg',
    primarySymbol: 'Snarling front-facing wolf head over full silver moon in carved-stone lunar frame',
    palette: 'Cold moonlight silver, bone white, slate gray fur, deep charcoal stone, cool blue-silver',
  },
  'Mech Pilot': {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/mech-pilot.jpg',
    primarySymbol: 'Techno-arcane visored pilot helmet in forged ring',
    palette: 'Cobalt, midnight blue, gunmetal silver, restrained amber visor light',
  },
  Android: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/android.png',
    primarySymbol: 'Synthetic mechanical eye (emblem IS the eye)',
    palette: 'Pearl white, pale silver, soft gray, icy cyan, luminous cerulean',
  },
  Seraph: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/seraph.jpg',
    primarySymbol: 'Six-winged celestial mask with contained hellfire in gold ring',
    palette: 'Radiant gold, ivory-white, pale celestial blue, aged silver, crimson',
  },
  Human: {
    status: 'integrated',
    assetPath: '/assets/archetype-emblems/human.jpg',
    primarySymbol: 'Fingerprint-ridge knight in stitched leather circle',
    palette: 'Charcoal, warm gray, silver-gray, saddle brown, dark chocolate-brown, worn tan',
  },
};

export function getEmblem(name: ArchetypeName): EmblemMeta {
  return ARCHETYPE_EMBLEMS[name];
}

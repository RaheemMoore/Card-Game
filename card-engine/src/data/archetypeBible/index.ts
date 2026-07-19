import type { ArchetypeName } from '../../types/card';
import type { ArchetypeBibleChapter } from '../../types/bible';
import { BARBARIAN_BIBLE } from './barbarian';
import { MONK_BIBLE } from './monk';
import { BEASTMASTER_BIBLE } from './beastmaster';
import { DRUID_BIBLE } from './druid';
import { NECROMANCER_BIBLE } from './necromancer';
import { VAMPIRE_BIBLE } from './vampire';
import { LYCANTHROPE_BIBLE } from './lycanthrope';
import { MECH_PILOT_BIBLE } from './mechPilot';
import { ANDROID_BIBLE } from './android';
import { SERAPH_BIBLE } from './seraph';
import { HUMAN_BIBLE } from './human';

/**
 * Central Bible registry. All character-generation code, UI, and the Codex
 * read archetype identity from here — never from the retired data/archetypes.ts
 * (which is being wound down in Phase M3).
 *
 * Source of truth for any interpretive question is the Lore & Fantasy Director
 * agent (.claude/agents/lore-fantasy-director.md).
 */
export const ARCHETYPE_BIBLE: Record<ArchetypeName, ArchetypeBibleChapter> = {
  Barbarian: BARBARIAN_BIBLE,
  Monk: MONK_BIBLE,
  Beastmaster: BEASTMASTER_BIBLE,
  Druid: DRUID_BIBLE,
  Necromancer: NECROMANCER_BIBLE,
  Vampire: VAMPIRE_BIBLE,
  Lycanthrope: LYCANTHROPE_BIBLE,
  'Mech Pilot': MECH_PILOT_BIBLE,
  Android: ANDROID_BIBLE,
  Seraph: SERAPH_BIBLE,
  Human: HUMAN_BIBLE,
};

export function getBibleChapter(archetype: ArchetypeName): ArchetypeBibleChapter {
  return ARCHETYPE_BIBLE[archetype];
}

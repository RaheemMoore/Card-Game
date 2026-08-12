import type { CuratedCharacter } from '../../../types/curatedCard';
import type { HiddenFate } from '../../../types/bible';

/**
 * DEV-only named scenario: `/admin/lore-desk?dev_admin=1&dev_seed=1`.
 *
 * Seeds the roster store with one deterministic awaiting_lore character so the
 * desk's layout, rank sync, claim grid, Question Forge, and confirm gate can
 * be exercised without Supabase env keys. Same philosophy as the castle's
 * studioBridge scenarios — a repeatable state a human can be pointed at, not a
 * lucky local database. Never bundled into production paths: the caller gates
 * on import.meta.env.DEV.
 *
 * Art uses the checked-in archetype emblems — three DIFFERENT images so the
 * rank-tab portrait swap is visible at a glance.
 */
export function devSeedCharacter(): CuratedCharacter {
  const identity: Partial<HiddenFate> = {
    age: 'middle-aged',
    sex: 'female presenting',
    bodyType: 'broad, heavy-set, visibly strong',
    skinTone: 'deep brown, warm undertone',
    hair: 'grey-streaked black braids, tied back',
    scars: 'a healed burn across the left forearm',
    disabilityOrCondition: 'none visible',
    posture: 'planted, unhurried',
    clothingConstruction: 'layered hide and riveted iron, full coverage',
  };
  const rankArt = (rank: 'Foundation' | 'Forged' | 'Ascendant', file: string) => ({
    rank,
    portraitUrl: `/assets/archetype-emblems/${file}`,
    storagePath: `dev/${file}`,
    cardName: '',
    nameAndTitle: '',
    lore: '',
  });
  return {
    id: 'char_barbarian_dev_probe',
    archetype: 'Barbarian',
    slotIndex: 1,
    status: 'awaiting_lore',
    displayName: 'DEV — Ravenna',
    identity: identity as HiddenFate,
    identityAcceptedAt: '2026-08-11T00:00:00.000Z',
    proposedAt: '2026-08-11T00:00:00.000Z',
    coreLore: '',
    loreDrafts: [],
    answerBindings: [],
    masterArt: {
      Foundation: rankArt('Foundation', 'barbarian.jpg'),
      Forged: rankArt('Forged', 'beastmaster.jpg'),
      Ascendant: rankArt('Ascendant', 'druid.jpg'),
    },
    provenance: { source: 'upload', authoredBy: 'dev-seed' },
    reviewThread: [
      {
        id: 'dev_note_1',
        author: 'raheem (dev fixture)',
        authoredAt: '2026-08-11T00:00:00.000Z',
        kind: 'send_back',
        origin: 'workshop',
        body: 'Forged reads too soft for what the art shows — she is planted, not wandering.',
      },
    ],
  };
}

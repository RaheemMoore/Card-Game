import type { CuratedCharacter } from '../../../types/curatedCard';
import type { HiddenFate } from '../../../types/bible';

/**
 * DEV-only named scenario: `/admin/lore-desk?dev_admin=1&dev_seed=1`.
 *
 * Seeds the roster store with deterministic characters so the desk's layout,
 * rank sync, claim stepper, tiebreaker questions, name assist and confirm
 * gate can be exercised without Supabase env keys. Same philosophy as the
 * castle's studioBridge scenarios — a repeatable state a human can be pointed
 * at, not a lucky local database. Never bundled into production paths: the
 * caller gates on import.meta.env.DEV.
 *
 * TWO characters, both Barbarian, and that is the point. One is on the desk
 * awaiting lore; the other is already finished. With only one character the
 * sibling branches — the "her sisters" block in the question prompt and the
 * name-collision list — are unreachable locally, so the half of this feature
 * that does the actual work would only ever be exercised against production
 * data.
 */
export function devSeedRoster(): CuratedCharacter[] {
  return [devSeedCharacter(), devSeedSibling()];
}

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

/**
 * A finished sibling in the same archetype. Exists so the desk's sibling
 * paths are reachable in dev: she is who the tiebreaker questions must
 * separate Ravenna from, and her name is what the name candidates must not
 * collide with.
 */
function devSeedSibling(): CuratedCharacter {
  return {
    id: 'char_barbarian_dev_sister',
    archetype: 'Barbarian',
    slotIndex: 2,
    status: 'approved',
    displayName: 'DEV — Veska',
    identity: {
      age: 'elderly',
      sex: 'female presenting',
      bodyType: 'small, wiry, stooped',
      skinTone: 'pale olive, cool undertone',
      posture: 'leaning on a staff, head tilted to listen',
      clothingConstruction: 'quilted layers under a hide apron, full coverage',
    } as HiddenFate,
    identityAcceptedAt: '2026-08-01T00:00:00.000Z',
    coreLore: 'A field surgeon who stayed when the clan moved on.',
    lore: {
      cardName: 'Veska Bone-Mender',
      nameAndTitle: 'Veska Bone-Mender',
      rankLore: {
        Foundation: 'She learned early that the ones who run are the ones who live, and decided to be wrong on purpose.',
        Forged: 'The camp that grew around her was never planned; people simply stopped leaving.',
        Ascendant: 'She has outlived every warrior she ever patched, and says so without triumph.',
      },
    },
    loreDrafts: [],
    loreConfirmedBy: 'dev-seed',
    loreConfirmedAt: '2026-08-02T00:00:00.000Z',
    answerBindings: [],
    provenance: { source: 'upload', authoredBy: 'dev-seed' },
    reviewThread: [],
  };
}

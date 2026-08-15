import { describe, it, expect } from 'vitest';
import type { ArchetypeName, Rank } from '../../types/card';
import type { HiddenFate, StoryPillarAnswers } from '../../types/bible';
import type {
  CuratedCharacter,
  CuratedRankArt,
  CuratedVariant,
  CuratedVariantStatus,
} from '../../types/curatedCard';
import {
  scoreCharacter,
  matchCharacter,
  pickVariant,
  getForgeableRoster,
  buildCuratedCard,
  EmptyRosterError,
} from './curatedMatcher';
import { generateStats } from '../cardGenerator';

// ---------- Fixtures ----------

const IDENTITY: HiddenFate = {
  age: 'late thirties',
  sex: 'female',
  bodyType: 'broad-shouldered, heavyset',
  skinTone: 'deep brown',
  facialStructure: 'square jaw, wide-set eyes',
  hair: 'shaved close, greying at the temple',
  disabilityOrCondition: 'walks with a cane; old hip injury',
  posture: 'weight on the left leg',
  scars: 'burn across the right forearm',
  weather: 'overcast',
  lighting: 'flat grey daylight',
  clothingConstruction: 'layered wool, buckled leather over-tunic',
  minorAccessories: 'iron pilgrim badge',
  environmentDetails: 'a wet stone courtyard',
};

function art(rank: Rank, name: string): CuratedRankArt {
  return {
    rank,
    portraitUrl: `https://example.supabase.co/curated-art/${name}/${rank.toLowerCase()}.png`,
    storagePath: `${name}/${rank.toLowerCase()}.png`,
    cardName: `${name} ${rank}`,
    nameAndTitle: `${name}, the ${rank}`,
    lore: `${name} at ${rank}.`,
  };
}

function character(overrides: Partial<CuratedCharacter> = {}): CuratedCharacter {
  return {
    id: 'char_monk_stone',
    archetype: 'Monk' as ArchetypeName,
    slotIndex: 1,
    status: 'approved',
    displayName: 'the stone one',
    identity: IDENTITY,
    coreLore: 'She kept the gate.',
    loreDrafts: [],
    answerBindings: [],
    provenance: { source: 'upload', authoredBy: 'raheem' },
    reviewThread: [],
    ...overrides,
  };
}

function variant(overrides: Partial<CuratedVariant> = {}): CuratedVariant {
  return {
    id: 'var_monk_stone_fire',
    characterId: 'char_monk_stone',
    element: 'Fire',
    bond: 'Sworn' as CuratedVariant['bond'],
    status: 'permanent' as CuratedVariantStatus,
    artMode: 'bespoke',
    ranks: {
      Foundation: art('Foundation', 'stone'),
      Forged: art('Forged', 'stone'),
      Ascendant: art('Ascendant', 'stone'),
    },
    ...overrides,
  };
}

function answers(pairs: Array<[string, string]>): StoryPillarAnswers {
  return {
    answers: pairs.map(([questionId, optionId]) => ({
      questionId,
      optionId,
      answer: `text for ${optionId}`,
    })),
  };
}

// ---------- Scoring ----------

describe('scoreCharacter', () => {
  it('sums the weights of bindings whose option the player chose', () => {
    const c = character({
      answerBindings: [
        { questionId: 'q1', optionIds: ['q1_a'], weight: 10 },
        { questionId: 'q2', optionIds: ['q2_b'], weight: 25 },
      ],
    });

    const result = scoreCharacter(c, answers([['q1', 'q1_a'], ['q2', 'q2_b']]));

    expect(result.score).toBe(35);
    expect(result.bindingsMatched).toBe(2);
  });

  it('ignores a binding whose question the player answered differently', () => {
    const c = character({
      answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }],
    });

    expect(scoreCharacter(c, answers([['q1', 'q1_z']])).score).toBe(0);
  });

  it('matches when the player picked any one of several bound options', () => {
    const c = character({
      answerBindings: [{ questionId: 'q1', optionIds: ['q1_a', 'q1_b'], weight: 10 }],
    });

    expect(scoreCharacter(c, answers([['q1', 'q1_b']])).score).toBe(10);
  });

  it('falls back to the default weight when a binding was authored without one', () => {
    const c = character({
      answerBindings: [
        { questionId: 'q1', optionIds: ['q1_a'] } as CuratedCharacter['answerBindings'][number],
      ],
    });

    // DEFAULT_BINDING_WEIGHT — a hand-written row missing the field must still
    // count, not silently score zero.
    expect(scoreCharacter(c, answers([['q1', 'q1_a']])).score).toBe(10);
  });

  it('reports whether the visual tiebreaker claim was hit', () => {
    const c = character({ visualTiebreaker: { questionId: 'vq', optionId: 'vq_2' } });

    expect(scoreCharacter(c, answers([['vq', 'vq_2']])).visualTiebreakerHit).toBe(true);
    expect(scoreCharacter(c, answers([['vq', 'vq_9']])).visualTiebreakerHit).toBe(false);
  });
});

// ---------- Matching + tiebreaks ----------

describe('matchCharacter', () => {
  it('returns null for an empty candidate list', () => {
    expect(matchCharacter([], answers([['q1', 'q1_a']]))).toBeNull();
  });

  it('picks the highest scorer', () => {
    const low = character({
      id: 'char_a',
      slotIndex: 1,
      answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }],
    });
    const high = character({
      id: 'char_b',
      slotIndex: 2,
      answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 40 }],
    });

    const result = matchCharacter([low, high], answers([['q1', 'q1_a']]));

    expect(result?.character.id).toBe('char_b');
    expect(result?.score).toBe(40);
    expect(result?.runnersUp.map((r) => r.character.id)).toEqual(['char_a']);
  });

  it('breaks a score tie on the visual tiebreaker claim', () => {
    const base = { questionId: 'q1', optionIds: ['q1_a'], weight: 10 };
    const plain = character({ id: 'char_a', slotIndex: 1, answerBindings: [base] });
    const claimed = character({
      id: 'char_b',
      slotIndex: 2,
      answerBindings: [base],
      visualTiebreaker: { questionId: 'vq', optionId: 'vq_1' },
    });

    const result = matchCharacter(
      [plain, claimed],
      answers([['q1', 'q1_a'], ['vq', 'vq_1']]),
    );

    // Loses on slotIndex, wins on the claim — the claim is checked first.
    expect(result?.character.id).toBe('char_b');
  });

  it('prefers broad agreement over one heavy binding at equal score', () => {
    const heavy = character({
      id: 'char_a',
      slotIndex: 1,
      answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 20 }],
    });
    const broad = character({
      id: 'char_b',
      slotIndex: 2,
      answerBindings: [
        { questionId: 'q1', optionIds: ['q1_a'], weight: 10 },
        { questionId: 'q2', optionIds: ['q2_a'], weight: 10 },
      ],
    });

    const result = matchCharacter([heavy, broad], answers([['q1', 'q1_a'], ['q2', 'q2_a']]));

    expect(result?.character.id).toBe('char_b');
    expect(result?.score).toBe(20);
  });

  it('falls through to slotIndex, then id, so an unbound roster still resolves', () => {
    const c3 = character({ id: 'char_c', slotIndex: 3 });
    const c1 = character({ id: 'char_a', slotIndex: 1 });
    const c1dup = character({ id: 'char_b', slotIndex: 1 });

    const result = matchCharacter([c3, c1dup, c1], answers([['q1', 'q1_a']]));

    expect(result?.character.id).toBe('char_a');
    expect(result?.score).toBe(0);
  });

  it('is deterministic: the same answers always yield the same character', () => {
    const roster = [
      character({ id: 'char_a', slotIndex: 1, answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }] }),
      character({ id: 'char_b', slotIndex: 2, answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }] }),
      character({ id: 'char_c', slotIndex: 3, answerBindings: [{ questionId: 'q2', optionIds: ['q2_a'], weight: 30 }] }),
    ];
    const given = answers([['q1', 'q1_a'], ['q2', 'q2_a']]);

    const ids = Array.from({ length: 25 }, () => matchCharacter(roster, given)?.character.id);

    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe('char_c');
  });

  it('does not depend on the order candidates arrive in', () => {
    const a = character({ id: 'char_a', slotIndex: 1, answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }] });
    const b = character({ id: 'char_b', slotIndex: 2, answerBindings: [{ questionId: 'q1', optionIds: ['q1_a'], weight: 10 }] });
    const given = answers([['q1', 'q1_a']]);

    expect(matchCharacter([a, b], given)?.character.id).toBe(
      matchCharacter([b, a], given)?.character.id,
    );
  });
});

// ---------- Variant selection ----------

describe('pickVariant', () => {
  it('selects the permanent variant for the chosen element', () => {
    const fire = variant({ id: 'v_fire', element: 'Fire' });
    const ice = variant({ id: 'v_ice', element: 'Ice' });

    expect(pickVariant('char_monk_stone', 'Ice', [fire, ice])?.id).toBe('v_ice');
  });

  it('returns null when the element has no variant', () => {
    expect(pickVariant('char_monk_stone', 'Void', [variant()])).toBeNull();
  });

  it('never returns a draft or hidden variant', () => {
    const draft = variant({ id: 'v_draft', status: 'draft' });
    const hidden = variant({ id: 'v_hidden', status: 'hidden' });

    expect(pickVariant('char_monk_stone', 'Fire', [draft, hidden])).toBeNull();
  });
});

// ---------- Forgeable roster ----------

describe('getForgeableRoster', () => {
  const fire = variant();

  it('includes an approved character with permanent Foundation art', () => {
    const roster = getForgeableRoster([character()], [fire], 'Monk' as ArchetypeName, 'Fire');
    expect(roster.map((c) => c.id)).toEqual(['char_monk_stone']);
  });

  it('excludes characters that have not passed review', () => {
    for (const status of ['draft', 'seeded', 'awaiting_lore', 'lore_ready', 'retired'] as const) {
      const roster = getForgeableRoster(
        [character({ status })],
        [fire],
        'Monk' as ArchetypeName,
        'Fire',
      );
      expect(roster, `status ${status} must not be forgeable`).toHaveLength(0);
    }
  });

  it('excludes a character whose variant has no Foundation art yet', () => {
    const unfinished = variant({ ranks: { Forged: art('Forged', 'stone') } });
    const roster = getForgeableRoster([character()], [unfinished], 'Monk' as ArchetypeName, 'Fire');
    expect(roster).toHaveLength(0);
  });

  it('excludes other archetypes', () => {
    const roster = getForgeableRoster([character()], [fire], 'Seraph' as ArchetypeName, 'Fire');
    expect(roster).toHaveLength(0);
  });
});

describe('EmptyRosterError', () => {
  it('names the pool that is unstocked', () => {
    const err = new EmptyRosterError('Monk' as ArchetypeName, 'Void');
    expect(err.name).toBe('EmptyRosterError');
    expect(err.message).toContain('Monk');
    expect(err.message).toContain('Void');
  });
});

// ---------- Card instantiation ----------

describe('buildCuratedCard', () => {
  const inputs = () => ({
    archetype: 'Monk' as ArchetypeName,
    stats: generateStats('Monk' as ArchetypeName),
    storyPillars: answers([['q1', 'q1_a']]),
    element: { element: 'Fire' as const, bond: 'Sworn', compatibility: 'Naturally Compatible' } as never,
    cardId: 'card_job123',
  });

  it('copies the Foundation art, name and lore onto the card', () => {
    const card = buildCuratedCard(inputs(), character(), variant());

    expect(card.cardName).toBe('stone Foundation');
    expect(card.nameAndTitle).toBe('stone, the Foundation');
    expect(card.lore).toBe('stone at Foundation.');
    expect(card.portraitAsset).toBe(variant().ranks.Foundation!.portraitUrl);
  });

  it('uses a remote URL, not a data URL, for the portrait', () => {
    const card = buildCuratedCard(inputs(), character(), variant());

    expect(card.portraitAsset).toMatch(/^https:\/\//);
    expect(card.portraitAsset).not.toMatch(/^data:/);
  });

  it('stamps the curated ids so the card is distinguishable from a legacy one', () => {
    const card = buildCuratedCard(inputs(), character(), variant());

    expect(card.curatedCharacterId).toBe('char_monk_stone');
    expect(card.curatedVariantId).toBe('var_monk_stone_fire');
  });

  it('honours the deterministic card id from the forge job', () => {
    expect(buildCuratedCard(inputs(), character(), variant()).cardId).toBe('card_job123');
  });

  it('takes identity verbatim from the curated character', () => {
    const card = buildCuratedCard(inputs(), character(), variant());

    expect(card.hiddenFate).toEqual(IDENTITY);
    // Bible §Rank continuity: advancement must never quietly revise who someone
    // is. The sheet was authored by reading all three ranks at once.
    expect(card.hiddenFate?.disabilityOrCondition).toBe('walks with a cane; old hip injury');
  });

  it('keeps the player-rolled stats rather than any authored statline', () => {
    const given = inputs();
    const card = buildCuratedCard(given, character(), variant());

    expect(card.stats).toEqual(given.stats);
  });

  it('carries the player answers and element selection onto the card', () => {
    const given = inputs();
    const card = buildCuratedCard(given, character(), variant());

    expect(card.storyPillars).toEqual(given.storyPillars);
    expect(card.elementSelection).toEqual(given.element);
  });

  it('can mint a later rank when asked', () => {
    const card = buildCuratedCard(inputs(), character(), variant(), 'Ascendant');

    expect(card.cardName).toBe('stone Ascendant');
    expect(card.portraitAsset).toContain('ascendant');
  });

  it('throws rather than minting a card with no portrait', () => {
    const noArt = variant({ ranks: {} });

    expect(() => buildCuratedCard(inputs(), character(), noArt)).toThrow(/no Foundation art/);
  });

  it('carries an authored prestige role through, and omits it when absent', () => {
    const prestige = {
      title: 'Grandmaster',
      justification: 'She kept the gate for thirty years.',
      inferredAtRank: 'Ascendant' as const,
    };

    expect(buildCuratedCard(inputs(), character({ prestige }), variant()).prestige).toEqual(
      prestige,
    );
    expect(buildCuratedCard(inputs(), character(), variant()).prestige).toBeUndefined();
  });

  describe('Seraph forge-lock (gameplay, not generation)', () => {
    // Real option ids from SERAPH_PATH_OPTION in data/visualPillars.ts — the
    // matcher delegates to resolveNarrativePath, which keys on these exactly.
    const FALLEN = 'vf_seraph_fallen';
    const GOOD = 'vf_seraph_good';
    const BALANCED = 'vf_seraph_balanced';

    const seraphInputs = (element: 'Light' | 'Fire', optionId: string) => ({
      archetype: 'Seraph' as ArchetypeName,
      stats: generateStats('Seraph' as ArchetypeName),
      storyPillars: answers([['vf_seraph_path', optionId]]),
      element: { element, bond: 'Sworn', compatibility: 'Naturally Compatible' } as never,
      cardId: 'card_seraph1',
    });

    const seraph = character({ id: 'char_seraph_a', archetype: 'Seraph' as ArchetypeName });
    const seraphVariant = variant({ characterId: 'char_seraph_a' });

    it('leaves a non-Seraph card with no narrative axis', () => {
      expect(buildCuratedCard(inputs(), character(), variant()).narrativeAxis).toBeUndefined();
    });

    it('transmutes a Fallen + Light Seraph to Infernal, recording the origin', () => {
      const card = buildCuratedCard(seraphInputs('Light', FALLEN), seraph, seraphVariant);

      expect(card.currentElement).toBe('Infernal');
      expect(card.originalElement).toBe('Light');
      // The player's own selection is preserved untouched — the transmutation
      // is expressed through currentElement so a later revert stays coherent.
      expect(card.elementSelection?.element).toBe('Light');
    });

    it('locks the Fallen path at Foundation with a negative score', () => {
      const card = buildCuratedCard(seraphInputs('Light', FALLEN), seraph, seraphVariant);

      expect(card.narrativeAxis).toEqual({
        axisId: 'seraph_alignment',
        score: -4,
        path: 'fallen',
        resolvedAtRank: 'Foundation',
      });
    });

    it('does not transmute a Fallen Seraph whose element is not Light', () => {
      const card = buildCuratedCard(seraphInputs('Fire', FALLEN), seraph, seraphVariant);

      expect(card.narrativeAxis?.path).toBe('fallen');
      expect(card.currentElement).toBeUndefined();
      expect(card.originalElement).toBeUndefined();
    });

    it('does not transmute a Good Seraph holding Light', () => {
      const card = buildCuratedCard(seraphInputs('Light', GOOD), seraph, seraphVariant);

      expect(card.narrativeAxis?.score).toBe(4);
      expect(card.currentElement).toBeUndefined();
    });

    it('scores the Balanced path at centre', () => {
      const card = buildCuratedCard(seraphInputs('Light', BALANCED), seraph, seraphVariant);

      expect(card.narrativeAxis?.path).toBe('balanced');
      expect(card.narrativeAxis?.score).toBe(0);
      expect(card.currentElement).toBeUndefined();
    });

    it('leaves a Seraph who answered no path question unresolved', () => {
      const card = buildCuratedCard(seraphInputs('Light', 'unrelated_option'), seraph, seraphVariant);

      expect(card.narrativeAxis).toBeUndefined();
      expect(card.currentElement).toBeUndefined();
    });
  });
});

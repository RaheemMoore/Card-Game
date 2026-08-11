import { describe, it, expect } from 'vitest';
import {
  checkPermanence, unclaimedAnswers, coverageIsEnforced, MAX_SHARE_OF_A_QUESTION,
} from './permanenceGate';
import { READABLE_FIELDS } from './readArt';
import type { CuratedCharacter, CuratedVariant, CuratedRankArt } from '../../types/curatedCard';
import type { HiddenFate } from '../../types/bible';
import type { Rank } from '../../types/card';

/**
 * The gate is the whole point of the Workshop, so it gets a test per criterion:
 * a complete card, then the same card missing exactly one thing. A single
 * happy-path test plus an empty-object test would pass while any individual
 * rule silently stopped working.
 */

const QUESTIONS = ['q1', 'q2', 'q3'];
const OPTION_COUNTS = { q1: 10, q2: 10, q3: 10 };

function art(rank: Rank): CuratedRankArt {
  return {
    rank,
    portraitUrl: `https://example.test/${rank}.png`,
    storagePath: `x/${rank}.png`,
    cardName: '', nameAndTitle: '', lore: '',
  };
}

function identity(): HiddenFate {
  const base: Record<string, string> = {};
  for (const f of READABLE_FIELDS) base[f] = `${f} described`;
  return base as unknown as HiddenFate;
}

function character(over: Partial<CuratedCharacter> = {}): CuratedCharacter {
  return {
    id: 'char_barbarian_ready',
    archetype: 'Barbarian',
    slotIndex: 1,
    status: 'approved',
    displayName: 'Ready',
    identity: identity(),
    identityAcceptedAt: '2026-08-10T00:00:00Z',
    coreLore: 'A premise.',
    lore: {
      cardName: 'Gryndak',
      nameAndTitle: 'Gryndak, the Last Watch',
      rankLore: { Foundation: 'f', Forged: 'g', Ascendant: 'a' },
    },
    loreDrafts: [],
    loreConfirmedAt: '2026-08-10T01:00:00Z',
    loreConfirmedBy: 'tori',
    answerBindings: QUESTIONS.map((questionId) => ({ questionId, optionIds: ['o1'], weight: 10 })),
    visualTiebreaker: { questionId: 'vt_barbarian', optionId: 'char_barbarian_ready' },
    masterArt: { Foundation: art('Foundation'), Forged: art('Forged'), Ascendant: art('Ascendant') },
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
    ...over,
  };
}

function variant(over: Partial<CuratedVariant> = {}): CuratedVariant {
  return {
    id: 'var_barbarian_ready_fire',
    characterId: 'char_barbarian_ready',
    element: 'Fire',
    bond: 'It is my purpose.',
    status: 'draft',
    artMode: 'derived',
    ranks: {},
    signOff: { by: 'raheem', at: '2026-08-10T02:00:00Z', note: 'Good enough to keep.' },
    ...over,
  };
}

const run = (c = character(), v = variant(), siblings: CuratedCharacter[] = []) =>
  checkPermanence({ character: c, variant: v, questionIds: QUESTIONS, siblings, optionCounts: OPTION_COUNTS });

const failing = (r: ReturnType<typeof run>) => r.blocking.map((b) => b.id);

describe('checkPermanence', () => {
  it('passes a complete card', () => {
    const r = run();
    expect(failing(r)).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.waitingOn).toBeNull();
  });

  // ---- the Workshop's half ----

  it('blocks a missing rank image, and says the master set is the source', () => {
    const c = character({ masterArt: { Foundation: art('Foundation'), Forged: art('Forged') } });
    const r = run(c);
    expect(failing(r)).toContain('art');
    expect(r.criteria.find((x) => x.id === 'art')?.detail).toContain('master set');
  });

  it('reads bespoke art off the variant, not the master', () => {
    // A bespoke variant with its own three images passes even when the
    // character's master set is empty.
    const c = character({ masterArt: {} });
    const v = variant({
      artMode: 'bespoke',
      ranks: { Foundation: art('Foundation'), Forged: art('Forged'), Ascendant: art('Ascendant') },
    });
    expect(failing(run(c, v))).not.toContain('art');
  });

  it('blocks when nobody accepted the identity sheet', () => {
    expect(failing(run(character({ identityAcceptedAt: undefined })))).toContain('identity');
  });

  it('blocks an accepted-but-blank identity sheet', () => {
    const thin = { ...identity(), hair: '', scars: '   ' };
    const r = run(character({ identity: thin }));
    expect(failing(r)).toContain('identity');
    expect(r.criteria.find((x) => x.id === 'identity')?.detail).toContain('2 fields');
  });

  it('blocks a variant with no bond', () => {
    expect(failing(run(character(), variant({ bond: undefined as never })))).toContain('element');
  });

  // ---- the lore director's half ----

  it('blocks missing rank lore and names which rank', () => {
    const c = character({
      lore: { cardName: 'X', nameAndTitle: 'X, the Y', rankLore: { Foundation: 'f', Forged: '', Ascendant: 'a' } },
    });
    const r = run(c);
    expect(failing(r)).toContain('lore');
    expect(r.criteria.find((x) => x.id === 'lore')?.detail).toContain('Forged');
  });

  it('blocks a question no answer leads to, and says why that matters', () => {
    const c = character({ answerBindings: [{ questionId: 'q1', optionIds: ['o1'], weight: 10 }] });
    const r = run(c);
    expect(failing(r)).toContain('bindings');
    expect(r.criteria.find((x) => x.id === 'bindings')?.detail).toMatch(/never be matched/);
  });

  it('treats an empty option list as unclaimed', () => {
    const c = character({ answerBindings: QUESTIONS.map((q) => ({ questionId: q, optionIds: [], weight: 10 })) });
    expect(failing(run(c))).toContain('bindings');
  });

  it('blocks a missing picture-question claim', () => {
    expect(failing(run(character({ visualTiebreaker: undefined })))).toContain('tiebreaker');
  });

  it('blocks lore that was written but never confirmed', () => {
    expect(failing(run(character({ loreConfirmedAt: undefined })))).toContain('confirmed');
  });

  // ---- coverage ----

  it('blocks a character that swallows a question', () => {
    const greedy = Array.from({ length: 5 }, (_, i) => `o${i}`); // 5 of 10 = 50%
    const c = character({
      answerBindings: [
        { questionId: 'q1', optionIds: greedy, weight: 10 },
        { questionId: 'q2', optionIds: ['o1'], weight: 10 },
        { questionId: 'q3', optionIds: ['o1'], weight: 10 },
      ],
    });
    const r = run(c);
    expect(failing(r)).toContain('not-greedy');
    expect(r.criteria.find((x) => x.id === 'not-greedy')?.detail)
      .toContain(`${Math.round(MAX_SHARE_OF_A_QUESTION * 100)}%`);
  });

  it('allows a claim exactly at the threshold', () => {
    const atLimit = Array.from({ length: 4 }, (_, i) => `o${i}`); // 4 of 10 = 40%
    const c = character({
      answerBindings: [
        { questionId: 'q1', optionIds: atLimit, weight: 10 },
        { questionId: 'q2', optionIds: ['o1'], weight: 10 },
        { questionId: 'q3', optionIds: ['o1'], weight: 10 },
      ],
    });
    expect(failing(run(c))).not.toContain('not-greedy');
  });

  it('blocks two characters that answer identically', () => {
    const twin = character({ id: 'char_barbarian_twin', displayName: 'Twin' });
    const r = run(character(), variant(), [twin]);
    expect(failing(r)).toContain('distinct');
    expect(r.criteria.find((x) => x.id === 'distinct')?.detail).toContain('Twin');
  });

  it('does not report a character as its own twin', () => {
    expect(failing(run(character(), variant(), [character()]))).not.toContain('distinct');
  });

  // ---- the human decision ----

  it('blocks a card nobody approved, and says where it actually is', () => {
    const r = run(character({ status: 'lore_ready' }));
    expect(failing(r)).toContain('approved');
    expect(r.criteria.find((x) => x.id === 'approved')?.detail).toContain('lore ready');
  });

  it('blocks a sign-off with no note', () => {
    const v = variant({ signOff: { by: 'raheem', at: 'now', note: '  ' } });
    const r = run(character(), v);
    expect(failing(r)).toContain('signoff');
    expect(r.criteria.find((x) => x.id === 'signoff')?.detail).toContain('no note');
  });

  // ---- who is it waiting on ----

  it('names the single owner a card is waiting on', () => {
    expect(run(character({ loreConfirmedAt: undefined })).waitingOn).toBe('lore');
    expect(run(character({ identityAcceptedAt: undefined, status: 'draft' })).waitingOn).toBeNull();
  });

  it('reports every criterion every time, so the list cannot silently shrink', () => {
    expect(run().criteria.map((c) => c.id)).toEqual([
      'art', 'identity', 'element',
      'lore', 'bindings', 'tiebreaker', 'confirmed', 'not-greedy', 'distinct',
      'approved', 'signoff',
    ]);
  });
});

describe('unclaimedAnswers', () => {
  it('finds answers that lead nowhere', () => {
    const c = character({ answerBindings: [{ questionId: 'q1', optionIds: ['a'], weight: 10 }] });
    const dead = unclaimedAnswers({
      characters: [c],
      questionIds: ['q1'],
      optionIds: { q1: ['a', 'b', 'c'] },
    });
    expect(dead.map((d) => d.optionId)).toEqual(['b', 'c']);
  });

  it('counts an answer as claimed if ANY character claims it', () => {
    const a = character({ id: 'a', answerBindings: [{ questionId: 'q1', optionIds: ['x'], weight: 10 }] });
    const b = character({ id: 'b', answerBindings: [{ questionId: 'q1', optionIds: ['y'], weight: 10 }] });
    expect(unclaimedAnswers({ characters: [a, b], questionIds: ['q1'], optionIds: { q1: ['x', 'y'] } }))
      .toEqual([]);
  });
});

describe('coverageIsEnforced', () => {
  it('stays advisory while an archetype is filling up', () => {
    expect(coverageIsEnforced(0)).toBe(false);
    expect(coverageIsEnforced(9)).toBe(false);
  });

  it('bites once the archetype is full', () => {
    expect(coverageIsEnforced(10)).toBe(true);
  });
});

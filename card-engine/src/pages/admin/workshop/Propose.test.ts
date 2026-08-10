import { describe, it, expect } from 'vitest';
import { proposalChecks } from './Propose';
import { READABLE_FIELDS } from '../../../services/workshop/readArt';
import type { CuratedCharacter, CuratedRankArt } from '../../../types/curatedCard';
import type { HiddenFate } from '../../../types/bible';
import type { Rank } from '../../../types/card';

/**
 * The Workshop's half of the permanence gate. Sending an incomplete proposal
 * spends the lore director's time on a character that will bounce, so each
 * check is tested for the case it exists to catch — one missing thing at a
 * time, rather than one happy path and one empty object.
 */

function art(rank: Rank): CuratedRankArt {
  return {
    rank,
    portraitUrl: `https://example.test/${rank}.png`,
    storagePath: `char/x/${rank}.png`,
    cardName: '',
    nameAndTitle: '',
    lore: '',
  };
}

function fullIdentity(): HiddenFate {
  const base = {} as Record<string, string>;
  for (const field of READABLE_FIELDS) base[field] = `${field} described`;
  return base as unknown as HiddenFate;
}

function character(overrides: Partial<CuratedCharacter> = {}): CuratedCharacter {
  return {
    id: 'char_lycanthrope_probe',
    archetype: 'Lycanthrope',
    slotIndex: 1,
    status: 'draft',
    displayName: 'Probe',
    identity: fullIdentity(),
    identityAcceptedAt: '2026-08-10T00:00:00Z',
    coreLore: '',
    loreDrafts: [],
    answerBindings: [],
    masterArt: { Foundation: art('Foundation'), Forged: art('Forged'), Ascendant: art('Ascendant') },
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
    ...overrides,
  };
}

const failing = (c: CuratedCharacter) => proposalChecks(c).filter((x) => !x.ok).map((x) => x.id);

describe('proposalChecks', () => {
  it('passes a complete character', () => {
    expect(failing(character())).toEqual([]);
  });

  it('blocks when a rank image is missing, and names which', () => {
    const c = character({ masterArt: { Foundation: art('Foundation'), Forged: art('Forged') } });
    expect(failing(c)).toContain('art');
    expect(proposalChecks(c).find((x) => x.id === 'art')?.detail).toContain('Ascendant');
  });

  it('blocks when there is no art at all', () => {
    expect(failing(character({ masterArt: undefined }))).toContain('art');
  });

  it('blocks when a human has not accepted the identity sheet', () => {
    // The sheet can be full of model output and still be unreviewed. Accepting
    // is the human step, and it is the one that matters.
    expect(failing(character({ identityAcceptedAt: undefined }))).toContain('identity-accepted');
  });

  it('blocks when the identity sheet is accepted but still has blanks', () => {
    const thin = { ...fullIdentity(), hair: '', scars: '   ' };
    const c = character({ identity: thin });
    expect(failing(c)).toContain('identity-filled');
    expect(proposalChecks(c).find((x) => x.id === 'identity-filled')?.detail).toContain('2 fields');
  });

  it('blocks a character with no working name', () => {
    expect(failing(character({ displayName: '   ' }))).toContain('name');
  });

  it('blocks re-sending something already on her desk', () => {
    const c = character({ status: 'awaiting_lore' });
    expect(failing(c)).toContain('not-sent');
    expect(proposalChecks(c).find((x) => x.id === 'not-sent')?.detail).toContain('desk');
  });

  it('blocks re-sending something she has already finished', () => {
    const c = character({ status: 'lore_ready' });
    expect(failing(c)).toContain('not-sent');
    expect(proposalChecks(c).find((x) => x.id === 'not-sent')?.detail).toContain('review space');
  });

  it('does NOT check anything that belongs to the lore director', () => {
    // A proposal is meant to be sent BEFORE the lore exists. If this gate ever
    // starts demanding lore or bindings, nothing can ever be proposed.
    const c = character({ coreLore: '', lore: undefined, answerBindings: [], visualTiebreaker: undefined });
    expect(failing(c)).toEqual([]);
  });

  it('reports every check every time, so the list never silently shrinks', () => {
    expect(proposalChecks(character()).map((c) => c.id)).toEqual([
      'art', 'identity-accepted', 'identity-filled', 'name', 'not-sent',
    ]);
  });
});

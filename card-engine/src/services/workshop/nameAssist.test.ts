import { describe, it, expect } from 'vitest';
import { buildNameCandidatePrompt, parseNameCandidates } from './nameAssist';
import { buildNamingBibleBlock } from '../naming/namingPrompt';
import { EPITHET_BY_RANK } from '../../data/namingBible';
import type { CuratedCharacter } from '../../types/curatedCard';

function character(overrides: Partial<CuratedCharacter> = {}): CuratedCharacter {
  return {
    id: 'char_barbarian_probe',
    archetype: 'Barbarian',
    slotIndex: 1,
    status: 'awaiting_lore',
    displayName: 'Probe',
    identity: {
      age: 'middle-aged',
      scars: 'a burn across the left forearm',
    } as unknown as CuratedCharacter['identity'],
    coreLore: 'A war-leader who buried her axe.',
    lore: {
      cardName: '',
      nameAndTitle: '',
      rankLore: { Foundation: 'She left the war and stayed at the pass.' },
    },
    loreDrafts: [],
    answerBindings: [],
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
    ...overrides,
  };
}

function sister(name: string): CuratedCharacter {
  return character({
    id: `char_${name}`,
    lore: { cardName: name, nameAndTitle: name, rankLore: {} },
  });
}

const FOUNDATION_BLOCK = buildNamingBibleBlock({
  archetype: 'Barbarian',
  rank: 'Foundation',
  offset: 0,
  sampleCount: 6,
  fullCount: 4,
  registerCount: 3,
  recentNamesStr: '',
});

describe('buildNameCandidatePrompt', () => {
  it('carries the art facts and the written life — the name must fit the person', () => {
    const prompt = buildNameCandidatePrompt(character(), [], FOUNDATION_BLOCK);
    expect(prompt).toContain('a burn across the left forearm');
    expect(prompt).toContain('She left the war and stayed at the pass.');
    expect(prompt).toContain('BARBARIAN CANON');
  });

  it('carries the Bible block, banned tropes and all', () => {
    const prompt = buildNameCandidatePrompt(character(), [], FOUNDATION_BLOCK);
    expect(prompt).toContain('BANNED TROPES');
    expect(prompt).toContain('Draven');
    expect(prompt).toContain('DO NOT copy verbatim');
  });

  it('uses Foundation epithet guidance regardless of which rank tab is open', () => {
    const prompt = buildNameCandidatePrompt(character(), [], FOUNDATION_BLOCK);
    expect(prompt).toContain(EPITHET_BY_RANK.Foundation);
    expect(prompt).not.toContain(EPITHET_BY_RANK.Ascendant);
    expect(prompt).toContain('At Foundation there is usually NO epithet');
  });

  it('asks for an Ascendant preview but marks it unsaved and non-influencing', () => {
    const prompt = buildNameCandidatePrompt(character(), [], FOUNDATION_BLOCK);
    expect(prompt).toContain('ascendantPreview');
    expect(prompt).toContain('NOT saved');
  });

  it('lists every sibling name so a new name cannot collide', () => {
    const prompt = buildNameCandidatePrompt(
      character(),
      [sister('Veska Bone-Mender'), sister('Imani Red-Cliff')],
      FOUNDATION_BLOCK,
    );
    expect(prompt).toContain('Veska Bone-Mender');
    expect(prompt).toContain('Imani Red-Cliff');
  });

  it('says so plainly when she is the first in her archetype', () => {
    const prompt = buildNameCandidatePrompt(character(), [], FOUNDATION_BLOCK);
    expect(prompt).toContain('she is the first character in this archetype');
  });

  it('skips a sibling that has not been named yet rather than listing a blank', () => {
    const unnamed = character({ id: 'char_x', lore: undefined });
    const prompt = buildNameCandidatePrompt(character(), [unnamed], FOUNDATION_BLOCK);
    expect(prompt).toContain('she is the first character in this archetype');
    expect(prompt).not.toMatch(/^ {2}- *$/m);
  });
});

describe('parseNameCandidates', () => {
  it('parses a fenced response and keeps every field', () => {
    const raw = [
      'Here are six:',
      '```json',
      JSON.stringify({
        candidates: [
          {
            cardName: '  Ravenna  ',
            nameAndTitle: 'Ravenna of the White Pass',
            ascendantPreview: 'Ravenna, the Pass That Held',
            reason: 'the burn on her forearm came from the fire she refused to leave',
            register: 'Balkan / Carpathian highland',
            structure: 'personal_order_place',
          },
        ],
      }),
      '```',
    ].join('\n');
    const out = parseNameCandidates(raw);
    expect(out).toHaveLength(1);
    expect(out[0].cardName).toBe('Ravenna');
    expect(out[0].structure).toBe('personal_order_place');
    expect(out[0].ascendantPreview).toBe('Ravenna, the Pass That Held');
  });

  it('drops a candidate with no usable name rather than rendering an empty button', () => {
    const raw = JSON.stringify({
      candidates: [
        { cardName: '   ', nameAndTitle: 'Nobody' },
        { cardName: 'Dren' },
        'not an object',
        null,
      ],
    });
    const out = parseNameCandidates(raw);
    expect(out).toHaveLength(1);
    expect(out[0].cardName).toBe('Dren');
  });

  it('defaults nameAndTitle to the card name when the model omits it', () => {
    const out = parseNameCandidates(JSON.stringify({ candidates: [{ cardName: 'Orsa' }] }));
    expect(out[0].nameAndTitle).toBe('Orsa');
  });

  it('nulls an unknown structure instead of rendering a bogus caption', () => {
    const out = parseNameCandidates(
      JSON.stringify({ candidates: [{ cardName: 'Orsa', structure: 'personal_vibes' }] }),
    );
    expect(out[0].structure).toBeNull();
  });

  it('throws on no JSON at all and on a missing candidates array', () => {
    expect(() => parseNameCandidates('sorry, no')).toThrow(/readable JSON/);
    expect(() => parseNameCandidates('{"nope":1}')).toThrow(/no candidates array/);
  });
});

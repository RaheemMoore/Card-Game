import { describe, it, expect } from 'vitest';
import { continuityPrompts, loreIsBlank } from './continuityPrompts';
import type { CuratedCharacter } from '../../types/curatedCard';

function character(
  identity: Record<string, string>,
  lore?: Partial<{ coreLore: string; Foundation: string; Forged: string; Ascendant: string }>,
): CuratedCharacter {
  return {
    id: 'char_barbarian_probe',
    archetype: 'Barbarian',
    slotIndex: 1,
    status: 'awaiting_lore',
    displayName: 'Probe',
    identity: identity as unknown as CuratedCharacter['identity'],
    coreLore: lore?.coreLore ?? '',
    lore: {
      cardName: '',
      nameAndTitle: '',
      rankLore: {
        Foundation: lore?.Foundation ?? '',
        Forged: lore?.Forged ?? '',
        Ascendant: lore?.Ascendant ?? '',
      },
    },
    loreDrafts: [],
    answerBindings: [],
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
  };
}

describe('continuityPrompts', () => {
  it('lists every usable art fact when nothing is written — a starting palette', () => {
    const prompts = continuityPrompts(
      character({
        scars: 'a healed burn across the left forearm',
        age: 'middle-aged',
        posture: 'planted, unhurried',
      }),
    );
    expect(prompts.map((p) => p.id).sort()).toEqual(['age', 'posture', 'scars']);
  });

  it('drops a fact once any distinctive word from it appears in the lore', () => {
    const prompts = continuityPrompts(
      character(
        { scars: 'a healed burn across the left forearm' },
        { Foundation: 'The burn never stopped aching in winter.' },
      ),
    );
    expect(prompts).toHaveLength(0);
  });

  it('searches the premise and every rank, not just one', () => {
    const inAscendant = continuityPrompts(
      character({ posture: 'planted, unhurried' }, { Ascendant: 'She stayed planted where others ran.' }),
    );
    expect(inAscendant).toHaveLength(0);

    const inPremise = continuityPrompts(
      character({ posture: 'planted, unhurried' }, { coreLore: 'A planted woman.' }),
    );
    expect(inPremise).toHaveLength(0);
  });

  it('ignores facts that assert an absence', () => {
    const prompts = continuityPrompts(
      character({ disabilityOrCondition: 'none visible', scars: 'no scarring' }),
    );
    expect(prompts).toHaveLength(0);
  });

  it('leads with the continuity fields the Bible protects', () => {
    const prompts = continuityPrompts(
      character({
        hair: 'grey-streaked braids',
        disabilityOrCondition: 'a prosthetic lower leg',
        scars: 'a brand on the shoulder',
      }),
    );
    expect(prompts[0].id).toBe('disabilityOrCondition');
    expect(prompts[1].id).toBe('scars');
  });

  it('ignores scene fields — they describe a moment, not a person', () => {
    const prompts = continuityPrompts(
      character({ weather: 'driving sleet', lighting: 'low sun from the west' }),
    );
    expect(prompts).toHaveLength(0);
  });

  it('does not let a common word count as having addressed a fact', () => {
    // "left" and "across" are stopwords; the burn itself is still unwritten.
    const prompts = continuityPrompts(
      character(
        { scars: 'a healed burn across the left forearm' },
        { Foundation: 'She left the pass and walked across the valley.' },
      ),
    );
    expect(prompts.map((p) => p.id)).toEqual(['scars']);
  });

  it('caps the list so the panel cannot become a wall', () => {
    const prompts = continuityPrompts(
      character({
        disabilityOrCondition: 'a prosthetic lower leg',
        scars: 'a brand on the shoulder',
        age: 'elderly',
        bodyType: 'wiry frame',
        posture: 'stooped',
        clothingConstruction: 'quilted layers',
        hair: 'shaven',
        minorAccessories: 'a bone whistle',
      }),
      3,
    );
    expect(prompts).toHaveLength(3);
  });

  it('skips a fact with no distinctive words rather than prompting forever', () => {
    // Every token is a stopword or too short, so it could never be marked done.
    expect(continuityPrompts(character({ age: 'old' }))).toHaveLength(0);
  });
});

describe('loreIsBlank', () => {
  it('is true before anything is written and false after one word', () => {
    expect(loreIsBlank(character({ age: 'elderly' }))).toBe(true);
    expect(loreIsBlank(character({ age: 'elderly' }, { coreLore: 'Someone.' }))).toBe(false);
  });
});

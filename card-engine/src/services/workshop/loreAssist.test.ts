import { describe, it, expect } from 'vitest';
import {
  buildSuggestionPrompt,
  buildQuestionPrompt,
  parseSuggestions,
  parseGeneratedQuestions,
  nextQuestionIndex,
} from './loreAssist';
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
      cardName: 'Ravenna',
      nameAndTitle: 'Ravenna, the Unraised Axe',
      rankLore: { Foundation: 'She left the war.', Forged: '', Ascendant: '' },
    },
    loreDrafts: [],
    answerBindings: [],
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
    ...overrides,
  };
}

describe('buildSuggestionPrompt', () => {
  it('carries the identity facts, the canon, and the draft', () => {
    const prompt = buildSuggestionPrompt(character());
    expect(prompt).toContain('a burn across the left forearm');
    expect(prompt).toContain('BARBARIAN CANON');
    expect(prompt).toContain('She left the war.');
    expect(prompt).toContain('(not written yet)');
  });

  it('includes the last send-back note when one exists', () => {
    const c = character({
      reviewThread: [
        { id: 'n1', author: 'r', authoredAt: 't', kind: 'note', origin: 'workshop', body: 'fine' },
        { id: 'n2', author: 'r', authoredAt: 't', kind: 'send_back', origin: 'workshop', body: 'Forged reads too soft.' },
      ],
    });
    expect(buildSuggestionPrompt(c)).toContain('Forged reads too soft.');
    expect(buildSuggestionPrompt(character())).not.toContain('SENT THIS BACK');
  });
});

describe('parseSuggestions', () => {
  it('parses a fenced response and drops junk entries', () => {
    const raw = [
      'Here you go:',
      '```json',
      JSON.stringify({
        suggestions: [
          { kind: 'angle', text: 'What did the axe cost her?', about: 'Forged' },
          { kind: 'phrase', text: ' iron gone quiet ', about: null },
          { kind: 'continuity', text: 'Draft says young; sheet says middle-aged.', about: 'Nonsense' },
          { kind: 'sonnet', text: 'not a real kind' },
          { kind: 'angle', text: '   ' },
          'not an object',
        ],
      }),
      '```',
    ].join('\n');
    const out = parseSuggestions(raw);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ kind: 'angle', text: 'What did the axe cost her?', about: 'Forged' });
    expect(out[1].text).toBe('iron gone quiet');
    // An invalid rank collapses to null rather than rendering a bad chip.
    expect(out[2].about).toBeNull();
  });

  it('throws on no JSON object at all', () => {
    expect(() => parseSuggestions('sorry, no')).toThrow(/readable JSON/);
  });

  it('throws when the suggestions array is missing', () => {
    expect(() => parseSuggestions('{"nope":true}')).toThrow(/no suggestions array/);
  });
});

describe('buildQuestionPrompt', () => {
  it('carries the lore and real story-pillar style examples', () => {
    const prompt = buildQuestionPrompt(character());
    expect(prompt).toContain('She left the war.');
    expect(prompt).toContain('STYLE');
    // At least one real Barbarian question made it in as an example.
    expect(prompt).toMatch(/Q: .+\?/);
  });
});

describe('parseGeneratedQuestions', () => {
  const NOW = '2026-08-11T00:00:00.000Z';

  it('assigns ids, keeps claimed indexes aligned after option drops', () => {
    const raw = JSON.stringify({
      questions: [
        {
          prompt: 'What do you do with a weapon you have outgrown?',
          // index 1 is junk and gets dropped; claimed index 2 must survive as
          // the SECOND kept option, not the third.
          options: ['Keep it sharp.', 42, 'Bury it.', 'Give it away.', 'Melt it down.'],
          trueOfThisCharacter: [2, 1],
        },
      ],
    });
    const out = parseGeneratedQuestions(raw, 'char_barbarian_probe', 0, NOW);
    expect(out).toHaveLength(1);
    const { question, trueOptionIds } = out[0];
    expect(question.id).toBe('gq_char_barbarian_probe_0');
    expect(question.status).toBe('draft');
    expect(question.options.map((o) => o.text)).toEqual([
      'Keep it sharp.', 'Bury it.', 'Give it away.', 'Melt it down.',
    ]);
    // Original index 2 ("Bury it.") is kept option 1; original index 1 was junk.
    expect(trueOptionIds).toEqual(['gq_char_barbarian_probe_0_a1']);
  });

  it('drops a question with fewer than 3 surviving options', () => {
    const raw = JSON.stringify({
      questions: [
        { prompt: 'Too thin?', options: ['One.', 'Two.'], trueOfThisCharacter: [0] },
        { prompt: 'Fine?', options: ['A.', 'B.', 'C.'], trueOfThisCharacter: [] },
      ],
    });
    const out = parseGeneratedQuestions(raw, 'c', 5, NOW);
    expect(out).toHaveLength(1);
    expect(out[0].question.id).toBe('gq_c_5');
    expect(out[0].trueOptionIds).toEqual([]);
  });

  it('throws when the questions array is missing', () => {
    expect(() => parseGeneratedQuestions('{"x":1}', 'c', 0, NOW)).toThrow(/no questions array/);
  });
});

describe('nextQuestionIndex', () => {
  it('is max suffix + 1, never reusing a deleted id', () => {
    const c = character({
      generatedQuestions: [
        { id: 'gq_char_barbarian_probe_0', prompt: 'p', options: [], status: 'discarded', generatedAt: 't' },
        { id: 'gq_char_barbarian_probe_7', prompt: 'p', options: [], status: 'approved', generatedAt: 't' },
      ],
    });
    expect(nextQuestionIndex(c)).toBe(8);
    expect(nextQuestionIndex(character())).toBe(0);
  });
});

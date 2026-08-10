import { describe, it, expect } from 'vitest';
import { loreProblems } from './LoreDesk';
import type { CuratedCharacter } from '../../card-engine/src/types/curatedCard';

/**
 * `loreProblems` mirrors `curated_character_lore_is_ready()` in
 * 20260811_curated_roster_lore_workflow.sql. The button and the database gate
 * must agree — if the button lets her confirm something the gate will later
 * refuse, she finds out via a rejected write on work she thought was finished.
 *
 * These tests are the pin holding the two in sync. Changing the SQL predicate
 * without changing this file should break something here.
 */

const QUESTIONS = ['q1', 'q2', 'q3'];

function character(overrides: Partial<CuratedCharacter> = {}): CuratedCharacter {
  return {
    id: 'char_lycanthrope_probe',
    archetype: 'Lycanthrope',
    slotIndex: 1,
    status: 'awaiting_lore',
    displayName: 'Probe',
    identity: {} as CuratedCharacter['identity'],
    coreLore: 'A hunter who stayed behind.',
    lore: {
      cardName: 'Thornhowl',
      nameAndTitle: 'Thornhowl, the Last Watch',
      rankLore: { Foundation: 'f', Forged: 'g', Ascendant: 'a' },
    },
    loreDrafts: [],
    answerBindings: QUESTIONS.map((questionId) => ({ questionId, optionIds: ['o1'], weight: 10 })),
    provenance: { source: 'upload', authoredBy: 'test' },
    reviewThread: [],
    ...overrides,
  };
}

describe('loreProblems', () => {
  it('passes a finished character', () => {
    expect(loreProblems(character(), QUESTIONS)).toEqual([]);
  });

  it('catches a missing card name', () => {
    const c = character({ lore: { ...character().lore!, cardName: '  ' } });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/no name/i);
  });

  it('catches a missing name and title', () => {
    const c = character({ lore: { ...character().lore!, nameAndTitle: '' } });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/name and title/i);
  });

  it('catches a missing premise', () => {
    expect(loreProblems(character({ coreLore: '' }), QUESTIONS).join(' ')).toMatch(/premise/i);
  });

  it('catches each rank separately, so partial lore cannot slip through', () => {
    const c = character({
      lore: { ...character().lore!, rankLore: { Foundation: 'f', Forged: '', Ascendant: '   ' } },
    });
    const problems = loreProblems(c, QUESTIONS);
    expect(problems.some((p) => p.startsWith('Forged'))).toBe(true);
    expect(problems.some((p) => p.startsWith('Ascendant'))).toBe(true);
    expect(problems.some((p) => p.startsWith('Foundation'))).toBe(false);
  });

  it('catches no lore object at all', () => {
    const problems = loreProblems(character({ lore: undefined }), QUESTIONS);
    // Name, title, and all three ranks.
    expect(problems).toHaveLength(5);
  });

  it('catches a question with no claimed answer, and says why it matters', () => {
    const c = character({
      answerBindings: [{ questionId: 'q1', optionIds: ['o1'], weight: 10 }],
    });
    const message = loreProblems(c, QUESTIONS).join(' ');
    expect(message).toMatch(/2 questions have no claimed answer/);
    expect(message).toMatch(/never be matched/);
  });

  it('treats a binding with an empty option list as unclaimed', () => {
    // Unchecking the last option leaves an empty array behind if the caller is
    // careless; an empty claim matches nobody and must not read as claimed.
    const c = character({
      answerBindings: QUESTIONS.map((questionId) => ({ questionId, optionIds: [], weight: 10 })),
    });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/3 questions have no claimed answer/);
  });

  it('uses the singular when exactly one question is unclaimed', () => {
    const c = character({
      answerBindings: [
        { questionId: 'q1', optionIds: ['o1'], weight: 10 },
        { questionId: 'q2', optionIds: ['o1'], weight: 10 },
      ],
    });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/1 question has no claimed answer/);
  });
});

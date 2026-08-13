import { describe, it, expect } from 'vitest';
import {
  loreProblems,
  withTiebreaker,
  approveGeneratedQuestion,
  discardGeneratedQuestion,
  removeGeneratedQuestion,
} from './loreReadiness';
import type { CuratedCharacter, GeneratedQuestion } from '../../types/curatedCard';

/**
 * `loreProblems` mirrors `curated_character_lore_is_ready()` in
 * 20260812_lore_desk_generated_questions.sql. The confirm button and the
 * database gate must agree — if the button lets her confirm something the gate
 * refuses, she finds out via a rejected write on work she thought was
 * finished. These tests are the pin holding the two in sync.
 *
 * Ported from studio-wiki/src/loreProblems.test.ts when the desk moved into
 * the admin app (2026-08-11), extended with the bespoke-question gate.
 */

const QUESTIONS = ['q1', 'q2', 'q3'];

function gq(n: number, status: GeneratedQuestion['status'] = 'approved'): GeneratedQuestion {
  const id = `gq_char_lycanthrope_probe_${n}`;
  return {
    id,
    prompt: `Prompt ${n}?`,
    options: [0, 1, 2, 3].map((i) => ({ id: `${id}_a${i}`, text: `Option ${i}` })),
    status,
    generatedAt: '2026-08-11T00:00:00.000Z',
    ...(status === 'approved'
      ? { approvedAt: '2026-08-11T00:00:00.000Z', approvedBy: 'tori@test' }
      : {}),
  };
}

function character(overrides: Partial<CuratedCharacter> = {}): CuratedCharacter {
  const approved = [gq(0), gq(1), gq(2)];
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
    answerBindings: [
      ...QUESTIONS.map((questionId) => ({ questionId, optionIds: ['o1'], weight: 10 })),
      ...approved.map((q) => ({ questionId: q.id, optionIds: [q.options[0].id], weight: 10 })),
    ],
    generatedQuestions: approved,
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

  it('catches a story-pillar question with no claimed answer, and says why', () => {
    const c = character();
    c.answerBindings = c.answerBindings.filter(
      (b) => b.questionId !== 'q2' && b.questionId !== 'q3',
    );
    const message = loreProblems(c, QUESTIONS).join(' ');
    expect(message).toMatch(/2 questions have no claimed answer/);
    expect(message).toMatch(/never be matched/);
  });

  it('treats a binding with an empty option list as unclaimed', () => {
    const c = character();
    c.answerBindings = c.answerBindings.map((b) =>
      QUESTIONS.includes(b.questionId) ? { ...b, optionIds: [] } : b,
    );
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/3 questions have no claimed answer/);
  });

  // ---- The bespoke-question gate ----

  it('blocks with zero approved bespoke questions', () => {
    const c = character({ generatedQuestions: [], answerBindings: character().answerBindings });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/0 of 3 bespoke questions approved/);
  });

  it('blocks at two approved bespoke questions', () => {
    const base = character();
    const c = {
      ...base,
      generatedQuestions: [gq(0), gq(1), gq(2, 'draft')],
    };
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/2 of 3 bespoke questions approved/);
  });

  it('drafted and discarded questions do not count as approved', () => {
    const c = character({ generatedQuestions: [gq(0), gq(1, 'draft'), gq(2, 'discarded')] });
    expect(loreProblems(c, QUESTIONS).join(' ')).toMatch(/1 of 3 bespoke questions approved/);
  });

  it('blocks an approved question with no option marked true of the character', () => {
    const base = character();
    const c = {
      ...base,
      answerBindings: base.answerBindings.filter((b) => !b.questionId.startsWith('gq_')),
    };
    const message = loreProblems(c, QUESTIONS).join(' ');
    expect(message).toMatch(/3 approved bespoke questions have no answer marked true/);
  });
});

describe('withTiebreaker', () => {
  it('fills the structural tiebreaker on a character without one', () => {
    const c = withTiebreaker(character());
    expect(c.visualTiebreaker).toEqual({
      questionId: 'vt_lycanthrope',
      optionId: 'char_lycanthrope_probe',
    });
  });

  it('never overwrites an existing tiebreaker', () => {
    const existing = { questionId: 'vt_lycanthrope', optionId: 'someone_else' };
    expect(withTiebreaker(character({ visualTiebreaker: existing })).visualTiebreaker).toBe(existing);
  });
});

describe('question lifecycle helpers', () => {
  it('approve stamps the question and writes its binding in one edit', () => {
    const base = character({ generatedQuestions: [gq(0, 'draft')], answerBindings: [] });
    const next = approveGeneratedQuestion(
      base,
      base.generatedQuestions![0].id,
      [base.generatedQuestions![0].options[1].id],
      'tori@test',
    );
    expect(next.generatedQuestions![0].status).toBe('approved');
    expect(next.generatedQuestions![0].approvedBy).toBe('tori@test');
    expect(next.answerBindings).toHaveLength(1);
    expect(next.answerBindings[0].optionIds).toEqual([base.generatedQuestions![0].options[1].id]);
  });

  it('discard removes the binding so nothing orphaned keeps matching', () => {
    const base = character();
    const target = base.generatedQuestions![0].id;
    const next = discardGeneratedQuestion(base, target);
    expect(next.generatedQuestions!.find((q) => q.id === target)!.status).toBe('discarded');
    expect(next.answerBindings.some((b) => b.questionId === target)).toBe(false);
  });

  it('remove deletes both the question and its binding', () => {
    const base = character();
    const target = base.generatedQuestions![0].id;
    const next = removeGeneratedQuestion(base, target);
    expect(next.generatedQuestions!.some((q) => q.id === target)).toBe(false);
    expect(next.answerBindings.some((b) => b.questionId === target)).toBe(false);
  });
});

import type { Rank } from '../../types/card';
import {
  MIN_APPROVED_GENERATED_QUESTIONS,
  DEFAULT_BINDING_WEIGHT,
  type AnswerBinding,
  type CuratedCharacter,
  type GeneratedQuestion,
} from '../../types/curatedCard';

/**
 * Is the lore half of a curated character finished?
 *
 * ⚠ PAIRED with curated_character_lore_is_ready() in
 * supabase/migrations/20260812_lore_desk_generated_questions.sql (which
 * supersedes the 20260811 version). The confirm button and the database gate
 * must never disagree — change them together. Moved here from the studio
 * wiki's LoreDesk.tsx when the desk moved into the admin app (2026-08-11).
 */

const RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

export function approvedQuestions(character: CuratedCharacter): GeneratedQuestion[] {
  return (character.generatedQuestions ?? []).filter((q) => q.status === 'approved');
}

function bindingFor(character: CuratedCharacter, questionId: string): AnswerBinding | undefined {
  return (character.answerBindings ?? []).find((b) => b.questionId === questionId);
}

/** Every reason the lore cannot be confirmed yet, in reading order. */
export function loreProblems(character: CuratedCharacter, questionIds: string[]): string[] {
  const out: string[] = [];
  if (!character.lore?.cardName?.trim()) out.push('The card has no name.');
  if (!character.lore?.nameAndTitle?.trim()) out.push('The name and title is empty.');
  if (!character.coreLore?.trim()) out.push('The premise is empty.');
  for (const rank of RANKS) {
    if (!character.lore?.rankLore?.[rank]?.trim()) out.push(`${rank} has no lore yet.`);
  }

  const bindings = character.answerBindings ?? [];
  const unclaimed = questionIds.filter(
    (id) => !bindings.some((b) => b.questionId === id && b.optionIds.length > 0),
  );
  if (unclaimed.length > 0) {
    out.push(
      `${unclaimed.length} question${unclaimed.length === 1 ? ' has' : 's have'} no claimed answer — ` +
        'a player who answers those can never be matched to this character.',
    );
  }

  const approved = approvedQuestions(character);
  if (approved.length < MIN_APPROVED_GENERATED_QUESTIONS) {
    out.push(
      `${approved.length} of ${MIN_APPROVED_GENERATED_QUESTIONS} bespoke questions approved — ` +
        'draft them from the lore and approve the ones worth keeping.',
    );
  }
  const unclaimedApproved = approved.filter((q) => {
    const binding = bindingFor(character, q.id);
    return !binding || binding.optionIds.length === 0;
  });
  if (unclaimedApproved.length > 0) {
    out.push(
      `${unclaimedApproved.length} approved bespoke question${unclaimedApproved.length === 1 ? ' has' : 's have'} ` +
        'no answer marked true of this character.',
    );
  }

  return out;
}

/**
 * The visual tiebreaker is structural rather than authored.
 *
 * This is the LAST round and the last resort. The NARRATIVE tiebreaker runs
 * before it — the bespoke questions in `generatedQuestions`, drafted from the
 * character's lore (see buildQuestionPrompt in loreAssist.ts). Those separate
 * the finalists by what a player believes; this one separates them by which
 * face a player is drawn to, when the answers still tie. Two different
 * tiebreakers, deliberately, and only one of them is written by hand.
 *
 * The tiebreaker question is "which of these calls to you", and the OPTIONS
 * are the archetype's characters themselves, shown by their Foundation art. So
 * every character is automatically its own option and there is nothing for the
 * lore director to write. Recorded on confirm so the matcher has the field it
 * expects.
 */
export function withTiebreaker(character: CuratedCharacter): CuratedCharacter {
  if (character.visualTiebreaker?.optionId) return character;
  return {
    ...character,
    visualTiebreaker: {
      questionId: `vt_${character.archetype.toLowerCase().replace(/\s+/g, '_')}`,
      optionId: character.id,
    },
  };
}

/**
 * Approve a drafted question: stamp it and write its AnswerBinding in the same
 * edit, so the two arrays cannot drift apart.
 */
export function approveGeneratedQuestion(
  character: CuratedCharacter,
  questionId: string,
  trueOptionIds: string[],
  approvedBy: string,
): CuratedCharacter {
  const generatedQuestions = (character.generatedQuestions ?? []).map((q) =>
    q.id === questionId
      ? { ...q, status: 'approved' as const, approvedAt: new Date().toISOString(), approvedBy }
      : q,
  );
  const others = (character.answerBindings ?? []).filter((b) => b.questionId !== questionId);
  const answerBindings = trueOptionIds.length
    ? [...others, { questionId, optionIds: trueOptionIds, weight: DEFAULT_BINDING_WEIGHT }]
    : others;
  return { ...character, generatedQuestions, answerBindings };
}

/**
 * Discard a question (draft or approved). Its binding is removed in the same
 * edit — an orphan binding on a discarded question would silently keep
 * matching players to it.
 */
export function discardGeneratedQuestion(
  character: CuratedCharacter,
  questionId: string,
): CuratedCharacter {
  return {
    ...character,
    generatedQuestions: (character.generatedQuestions ?? []).map((q) =>
      q.id === questionId ? { ...q, status: 'discarded' as const } : q,
    ),
    answerBindings: (character.answerBindings ?? []).filter((b) => b.questionId !== questionId),
  };
}

/** Hard removal, for cleanup. Ids are never reused — see nextQuestionIndex. */
export function removeGeneratedQuestion(
  character: CuratedCharacter,
  questionId: string,
): CuratedCharacter {
  return {
    ...character,
    generatedQuestions: (character.generatedQuestions ?? []).filter((q) => q.id !== questionId),
    answerBindings: (character.answerBindings ?? []).filter((b) => b.questionId !== questionId),
  };
}

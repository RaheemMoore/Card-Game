import { RANKS } from '../../types/card';
import type { CuratedCharacter, CuratedVariant } from '../../types/curatedCard';
import { READABLE_FIELDS } from './readArt';

/**
 * The filter.
 *
 * Raheem, 2026-08-10: *"It's like a filter. A card should have to reach a
 * certain state before it gets through this."* This is that state, written
 * down, so becoming permanent is a check rather than a habit.
 *
 * Three owners, and the split matters — a blocked card should say WHO it is
 * waiting on, not merely that it is blocked:
 *
 *   workshop  the pictures and the description of them
 *   lore      the name, the story, and which players are led here
 *   review    the human decision, with a name against it
 *
 * The database enforces a subset of this in RLS
 * (20260811_curated_roster_lore_workflow.sql) so a direct API call cannot skip
 * the UI. It cannot check the archetype-wide coverage rules or per-question
 * completeness, because it has no access to the question pools — those live
 * only here. The two must be changed together.
 */

export type GateOwner = 'workshop' | 'lore' | 'review';

export interface GateCriterion {
  id: string;
  owner: GateOwner;
  label: string;
  ok: boolean;
  /** Why it is not satisfied. Absent when it is. */
  detail?: string;
}

export interface GateResult {
  criteria: GateCriterion[];
  blocking: GateCriterion[];
  ok: boolean;
  /** Who the card is waiting on, when it is waiting on exactly one of them. */
  waitingOn: GateOwner | null;
}

export interface GateInput {
  character: CuratedCharacter;
  variant: CuratedVariant;
  /** Every question id for this archetype — the coverage denominator. */
  questionIds: readonly string[];
  /** Every OTHER character in this archetype, for the collision rules. */
  siblings?: readonly CuratedCharacter[];
  /** Options per question, so "claims too much of a question" can be judged. */
  optionCounts?: Readonly<Record<string, number>>;
}

/** A character may not claim more than this share of one question's answers. */
export const MAX_SHARE_OF_A_QUESTION = 0.4;

/** Rule 1 only bites once an archetype is full; early on, gaps are expected. */
export const COVERAGE_ENFORCED_AT = 10;

export function checkPermanence(input: GateInput): GateResult {
  const { character, variant, questionIds, siblings = [], optionCounts = {} } = input;
  const criteria: GateCriterion[] = [];

  // ---- The Workshop's half ------------------------------------------------

  const artSource = variant.artMode === 'derived' ? (character.masterArt ?? {}) : variant.ranks;
  const missingArt = RANKS.filter((r) => !artSource[r]?.portraitUrl?.trim());
  criteria.push({
    id: 'art',
    owner: 'workshop',
    label: 'All three rank images are in',
    ok: missingArt.length === 0,
    detail: missingArt.length > 0
      ? `Missing ${missingArt.join(', ')}${variant.artMode === 'derived' ? ' from the master set' : ''}`
      : undefined,
  });

  const blankIdentity = READABLE_FIELDS.filter((f) => {
    const value = (character.identity as unknown as Record<string, string>)[f];
    return !value || !value.trim();
  });
  criteria.push({
    id: 'identity',
    owner: 'workshop',
    label: 'The character has been described from its art, and a human accepted it',
    ok: Boolean(character.identityAcceptedAt) && blankIdentity.length === 0,
    detail: !character.identityAcceptedAt
      ? 'Nobody has accepted the identity sheet yet'
      : blankIdentity.length > 0
        ? `${blankIdentity.length} field${blankIdentity.length === 1 ? '' : 's'} still blank`
        : undefined,
  });

  criteria.push({
    id: 'element',
    owner: 'workshop',
    label: 'This version has an element and a bond',
    ok: Boolean(variant.element) && Boolean(variant.bond),
    detail: !variant.element ? 'No element' : !variant.bond ? 'No bond' : undefined,
  });

  // ---- The lore director's half ------------------------------------------

  const missingLore = RANKS.filter((r) => !character.lore?.rankLore?.[r]?.trim());
  const namedOk = Boolean(character.lore?.cardName?.trim() && character.lore?.nameAndTitle?.trim());
  criteria.push({
    id: 'lore',
    owner: 'lore',
    label: 'It has a name and a story for all three ranks',
    ok: namedOk && missingLore.length === 0,
    detail: !namedOk
      ? 'No card name yet'
      : missingLore.length > 0
        ? `No lore for ${missingLore.join(', ')}`
        : undefined,
  });

  const unclaimed = questionIds.filter(
    (id) => !(character.answerBindings ?? []).some((b) => b.questionId === id && b.optionIds.length > 0),
  );
  criteria.push({
    id: 'bindings',
    owner: 'lore',
    label: 'Every question can lead a player here',
    ok: unclaimed.length === 0,
    detail: unclaimed.length > 0
      ? `${unclaimed.length} question${unclaimed.length === 1 ? '' : 's'} with no claimed answer — a player answering those could never be matched to this character`
      : undefined,
  });

  criteria.push({
    id: 'tiebreaker',
    owner: 'lore',
    label: 'It is an option in the picture question',
    ok: Boolean(character.visualTiebreaker?.optionId),
    detail: character.visualTiebreaker?.optionId ? undefined : 'Not claimed',
  });

  criteria.push({
    id: 'confirmed',
    owner: 'lore',
    label: 'The lore director has confirmed it',
    ok: Boolean(character.loreConfirmedAt),
    detail: character.loreConfirmedAt ? undefined : 'Still on her desk',
  });

  // ---- Coverage, which is about the archetype, not this card --------------

  const greedy = (character.answerBindings ?? []).filter((b) => {
    const total = optionCounts[b.questionId];
    return total ? b.optionIds.length / total > MAX_SHARE_OF_A_QUESTION : false;
  });
  criteria.push({
    id: 'not-greedy',
    owner: 'lore',
    label: 'It does not swallow a whole question',
    ok: greedy.length === 0,
    detail: greedy.length > 0
      ? `Claims over ${Math.round(MAX_SHARE_OF_A_QUESTION * 100)}% of the answers to ${greedy.length} question${greedy.length === 1 ? '' : 's'}, crowding out every other character`
      : undefined,
  });

  const fingerprint = (c: CuratedCharacter) =>
    (c.answerBindings ?? [])
      .map((b) => `${b.questionId}:${[...b.optionIds].sort().join(',')}`)
      .sort()
      .join('|');
  const mine = fingerprint(character);
  const twin = siblings.find((s) => s.id !== character.id && fingerprint(s) === mine && mine !== '');
  criteria.push({
    id: 'distinct',
    owner: 'lore',
    label: 'No other character answers identically',
    ok: !twin,
    detail: twin ? `Identical claims to ${twin.displayName || twin.id} — players could never be sent to one rather than the other` : undefined,
  });

  // ---- The human decision -------------------------------------------------

  criteria.push({
    id: 'approved',
    owner: 'review',
    label: 'It passed review',
    ok: character.status === 'approved',
    detail: character.status === 'approved' ? undefined : `Still ${character.status.replace(/_/g, ' ')}`,
  });

  criteria.push({
    id: 'signoff',
    owner: 'review',
    label: 'Someone put their name to it',
    ok: Boolean(variant.signOff?.by?.trim() && variant.signOff?.note?.trim()),
    detail: !variant.signOff?.by?.trim()
      ? 'Not signed'
      : !variant.signOff?.note?.trim()
        ? 'Signed with no note'
        : undefined,
  });

  const blocking = criteria.filter((c) => !c.ok);
  const owners = new Set(blocking.map((c) => c.owner));

  return {
    criteria,
    blocking,
    ok: blocking.length === 0,
    waitingOn: owners.size === 1 ? [...owners][0] : null,
  };
}

/**
 * The archetype-wide check: an answer no character claims is a dead end — a
 * player can pick it and be matched to nobody.
 *
 * Advisory until the archetype is full, because early on most answers are
 * legitimately unclaimed and a wall of warnings just trains you to ignore them.
 */
export function unclaimedAnswers(input: {
  characters: readonly CuratedCharacter[];
  questionIds: readonly string[];
  optionIds: Readonly<Record<string, readonly string[]>>;
}): { questionId: string; optionId: string }[] {
  const claimed = new Set<string>();
  for (const c of input.characters) {
    for (const b of c.answerBindings ?? []) {
      for (const id of b.optionIds) claimed.add(`${b.questionId}:${id}`);
    }
  }
  const out: { questionId: string; optionId: string }[] = [];
  for (const questionId of input.questionIds) {
    for (const optionId of input.optionIds[questionId] ?? []) {
      if (!claimed.has(`${questionId}:${optionId}`)) out.push({ questionId, optionId });
    }
  }
  return out;
}

export function coverageIsEnforced(characterCount: number): boolean {
  return characterCount >= COVERAGE_ENFORCED_AT;
}

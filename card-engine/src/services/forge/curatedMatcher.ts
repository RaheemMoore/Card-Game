import type {
  ArchetypeName,
  Card,
  CardStats,
  NarrativeAxisState,
  Rank,
} from '../../types/card';
import type {
  ElementName,
  ElementSelection,
  StoryPillarAnswers,
} from '../../types/bible';
import type { CuratedCharacter, CuratedVariant } from '../../types/curatedCard';
import { DEFAULT_BINDING_WEIGHT } from '../../types/curatedCard';
import { buildCardShell } from '../cardGenerator';
import { resolveNarrativePath } from '../../data/visualPillars';
import { getCuratedRosterStore } from '../persistence/CuratedRosterStore';

/**
 * The player-side matcher — the far half of the curated roster.
 *
 * Direction change (Raheem, 2026-08-10): the game stops generating characters
 * at runtime. The forge ritual is unchanged from the player's side, but the
 * answers no longer feed a generator:
 *
 *   Story Pillar answers  →  which CHARACTER you get   (scoreCharacter/matchCharacter)
 *   Element choice        →  which VARIANT of them     (pickVariant)
 *
 * types/curatedCard.ts anticipated this module by name ("the future matcher")
 * and shaped AnswerBinding for it: bindings are keyed on `optionId`, so
 * matching is a set-membership test rather than the tag re-resolution
 * collectImagePins needs or the answer-text substring matching that
 * elements.ts and prestigeInference.ts still rely on.
 *
 * MATCHING IS DETERMINISTIC BY DESIGN. The same answers always yield the same
 * character — no seeding on cardId, no randomness anywhere in the chain. Two
 * players who answer identically get the same person; what differs is their
 * stats, which are rolled fresh per pull inside the archetype's CLASS_AFFINITY
 * bias tiers (see the long NOTE in curatedCard.ts about why characters carry no
 * statline). Determinism is what makes a bad match reproducible, and therefore
 * fixable by editing bindings rather than by guesswork.
 */

// ---------- Hydration ----------

/**
 * Make sure the roster cache is filled before a match is attempted.
 *
 * Deliberately lazy rather than hydrated at app boot. The roster is only needed
 * by the forge (and, from PR 3, tier-up), so a player who never opens the forge
 * never pays for the read — and PersistenceGate's four boot paths stay
 * untouched.
 *
 * Idempotent: the store hydrates once and reports it, so repeat calls are free.
 * Errors propagate — an unreadable roster must NOT render as an empty one, or
 * "the database is down" becomes indistinguishable from "nothing is published
 * yet" and the player is told the wrong thing. Same reasoning as
 * CuratedRosterStore.hydrate's unconfigured-client throw.
 */
export async function ensureCuratedRosterHydrated(): Promise<void> {
  const store = getCuratedRosterStore();
  if (store.isHydrated()) return;
  await store.hydrate();
}

// ---------- Scoring ----------

export interface CharacterScore {
  character: CuratedCharacter;
  /** Sum of matched binding weights. */
  score: number;
  /** How many distinct bindings matched — the first tiebreak after score. */
  bindingsMatched: number;
  /** Whether the player's answers satisfied this character's visual tiebreaker. */
  visualTiebreakerHit: boolean;
}

/**
 * Score one character against a player's answers.
 *
 * A binding contributes its weight when the player picked ANY of its bound
 * options for that question. Weight defaults to DEFAULT_BINDING_WEIGHT when a
 * binding was authored without one, so a hand-written row missing the field
 * still counts rather than silently scoring zero.
 */
export function scoreCharacter(
  character: CuratedCharacter,
  answers: StoryPillarAnswers,
): CharacterScore {
  const chosen = new Map<string, string>();
  for (const a of answers.answers) chosen.set(a.questionId, a.optionId);

  let score = 0;
  let bindingsMatched = 0;

  for (const binding of character.answerBindings ?? []) {
    const optionId = chosen.get(binding.questionId);
    if (optionId === undefined) continue;
    if (!binding.optionIds.includes(optionId)) continue;
    score += binding.weight ?? DEFAULT_BINDING_WEIGHT;
    bindingsMatched += 1;
  }

  const claim = character.visualTiebreaker;
  const visualTiebreakerHit =
    claim !== undefined && chosen.get(claim.questionId) === claim.optionId;

  return { character, score, bindingsMatched, visualTiebreakerHit };
}

export interface MatchResult {
  character: CuratedCharacter;
  score: number;
  /** Every other candidate, best first. Useful for dev diagnostics. */
  runnersUp: CharacterScore[];
}

/**
 * Pick the character whose bindings the player's answers best support.
 *
 * Tiebreak chain, applied in order and fully deterministic:
 *   1. higher score
 *   2. the authored visual tiebreaker claim was hit
 *   3. more distinct bindings matched (broad agreement beats one heavy weight)
 *   4. lower slotIndex
 *   5. lexicographic id
 *
 * Steps 4 and 5 are arbitrary but STABLE — they exist so that a roster with no
 * bindings authored yet still returns something rather than throwing, and so
 * the same tie never resolves two different ways.
 *
 * Returns null only when there are no candidates at all.
 */
export function matchCharacter(
  candidates: CuratedCharacter[],
  answers: StoryPillarAnswers,
): MatchResult | null {
  if (candidates.length === 0) return null;

  const scored = candidates
    .map((c) => scoreCharacter(c, answers))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.visualTiebreakerHit !== b.visualTiebreakerHit) {
        return a.visualTiebreakerHit ? -1 : 1;
      }
      if (b.bindingsMatched !== a.bindingsMatched) {
        return b.bindingsMatched - a.bindingsMatched;
      }
      if (a.character.slotIndex !== b.character.slotIndex) {
        return a.character.slotIndex - b.character.slotIndex;
      }
      return a.character.id.localeCompare(b.character.id);
    });

  const [winner, ...runnersUp] = scored;
  return { character: winner.character, score: winner.score, runnersUp };
}

// ---------- Variant selection ----------

/**
 * The player's element choice selects which produced version of the character
 * they receive. Only `permanent` variants are eligible — draft and hidden ones
 * exist but are not in the game (curatedCard.ts: the permanent boundary).
 */
export function pickVariant(
  characterId: string,
  element: ElementName,
  permanentVariants: CuratedVariant[],
): CuratedVariant | null {
  return (
    permanentVariants.find(
      (v) => v.characterId === characterId && v.element === element && v.status === 'permanent',
    ) ?? null
  );
}

// ---------- Forgeable roster ----------

/**
 * Which characters can actually be pulled for this archetype + element right
 * now: approved, and carrying a permanent variant for that element whose
 * Foundation art exists.
 *
 * The Foundation check is not paranoia — a variant is published per element on
 * its own schedule, and a character whose art is still being made would
 * otherwise match and then mint a card with an empty portrait.
 */
export function getForgeableRoster(
  characters: CuratedCharacter[],
  permanentVariants: CuratedVariant[],
  archetype: ArchetypeName,
  element: ElementName,
): CuratedCharacter[] {
  return characters.filter((c) => {
    if (c.archetype !== archetype) return false;
    if (c.status !== 'approved') return false;
    const variant = pickVariant(c.id, element, permanentVariants);
    return Boolean(variant?.ranks.Foundation?.portraitUrl);
  });
}

/** Thrown before any currency is reserved when a pool has nothing to give. */
export class EmptyRosterError extends Error {
  readonly archetype: ArchetypeName;
  readonly element: ElementName;

  constructor(archetype: ArchetypeName, element: ElementName) {
    super(
      `No ${archetype} has been published for ${element} yet. ` +
        'This pool is still being stocked.',
    );
    this.name = 'EmptyRosterError';
    this.archetype = archetype;
    this.element = element;
  }
}

// ---------- Card instantiation ----------

export interface CuratedCardInputs {
  archetype: ArchetypeName;
  stats: CardStats;
  storyPillars: StoryPillarAnswers;
  element: ElementSelection;
  /** Deterministic per forge job, so a resumed run upserts rather than duplicates. */
  cardId: string;
}

/**
 * Mint a playable Card from a curated character + variant.
 *
 * Everything about WHO the character is comes from the curated record;
 * everything about WHAT THIS PLAYER'S COPY CAN DO is rolled or earned. The
 * `stats` passed in are the dice-stage roll, untouched by this module.
 *
 * The Seraph forge-lock below is moved verbatim from forgeController.runForge.
 * It is gameplay, not generation: the moral path is chosen and LOCKED at the
 * forge (image-first, 2026-07-24), and a Fallen + Light Seraph transmutes to
 * Infernal once, here, with the origin recorded so the tier-up element resolver
 * stays coherent.
 */
export function buildCuratedCard(
  inputs: CuratedCardInputs,
  character: CuratedCharacter,
  variant: CuratedVariant,
  rank: Rank = 'Foundation',
): Card {
  const { archetype, stats, storyPillars, element, cardId } = inputs;

  const art = variant.ranks[rank];
  if (!art) {
    throw new Error(
      `Curated variant ${variant.id} has no ${rank} art. A permanent variant must carry every rank.`,
    );
  }

  const shell = buildCardShell(archetype, stats);
  shell.cardId = cardId;

  const seraphPath = resolveNarrativePath(archetype, storyPillars);
  let narrativeAxis: NarrativeAxisState | undefined;
  let currentElement: ElementName | undefined;
  let originalElement: ElementName | undefined;
  if (seraphPath) {
    narrativeAxis = {
      axisId: 'seraph_alignment',
      score: seraphPath === 'fallen' ? -4 : seraphPath === 'good' ? 4 : 0,
      path: seraphPath,
      resolvedAtRank: 'Foundation',
    };
    if (seraphPath === 'fallen' && element.element === 'Light') {
      originalElement = 'Light';
      currentElement = 'Infernal';
    }
  }

  return {
    ...shell,
    cardName: art.cardName,
    nameAndTitle: art.nameAndTitle,
    lore: art.lore,
    portraitAsset: art.portraitUrl,
    storyPillars,
    elementSelection: element,
    ...(narrativeAxis ? { narrativeAxis } : {}),
    ...(currentElement ? { currentElement } : {}),
    ...(originalElement ? { originalElement } : {}),
    // The identity sheet was authored by READING the finished art, so it is
    // already true of every rank — no inference, and nothing to preserve
    // across tier-ups beyond carrying it forward.
    hiddenFate: character.identity,
    ...(character.prestige ? { prestige: character.prestige } : {}),
    curatedCharacterId: character.id,
    curatedVariantId: variant.id,
  };
}

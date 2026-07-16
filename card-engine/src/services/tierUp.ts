import type { Card, CardStats, StatName, Rank, ArtSnapshot, ModifierStack } from '../types/card';
import {
  BIAS_RANGES,
  deriveRank,
  deriveStatRanks,
  getOverallRank,
  getDominantStat,
  getBorderForDominantStat,
  getStatNames,
} from '../data/powerSystem';
import { generatePortraitStrict } from './leonardoApi';
import { generateCardText } from './claudeApi';
import { saveCard } from './storage';
import {
  MODIFIER_CATEGORIES,
  getClassSignaturePool,
  rollSurprise,
  rollWeighted,
} from '../data/modifierPools';

const NEXT_RANK: Partial<Record<Rank, Rank>> = {
  Foundation: 'Forged',
  Forged: 'Ascendant',
};

function bumpStatsToNextRank(stats: CardStats, archetype: string, activeStats: StatName[]): CardStats {
  const newStats = structuredClone(stats);

  for (const name of activeStats) {
    const entry = newStats[name]!;
    const currentRank = deriveRank(entry.value, entry.bias);
    const target = NEXT_RANK[currentRank];
    if (!target) continue;

    const range = BIAS_RANGES[entry.bias];
    const floor = target === 'Forged' ? range.forgedFloor : range.ascendantFloor;
    const ceiling = target === 'Ascendant' ? range.hardCap : range.ascendantFloor - 1;
    entry.value = floor + Math.floor(Math.random() * (ceiling - floor + 1));
  }

  return newStats;
}

function snapshotCurrentState(card: Card, activeStats: StatName[]): Card['evolutionHistory'] {
  const history = structuredClone(card.evolutionHistory);
  const ranks = deriveStatRanks(card.stats);
  const snapshot: ArtSnapshot = {
    portraitUrl: card.portraitAsset,
    cardName: card.cardName,
    nameAndTitle: card.nameAndTitle,
    lore: card.lore,
  };

  for (const name of activeStats) {
    const rank = ranks[name]!;
    if (!history[name]) history[name] = {};
    history[name]![rank] = snapshot;
  }

  return history;
}

export function canTierUp(card: Card): boolean {
  const overallRank = getOverallRank(card.stats);
  return overallRank !== 'Ascendant';
}

export interface TierUpResult {
  card: Card;
  portraitRegenerated: boolean;
  portraitError?: string;
}

export async function tierUpCard(
  card: Card,
  /**
   * Ascendant tier-up only: the fused-whisper narrative the user picked in the
   * pre-tier-up modal. Gets passed to Claude as the organizing image for the
   * portrait + lore. Omit for Forged tier-ups.
   */
  ascendantNarrative?: string,
): Promise<TierUpResult> {
  const activeStats = getStatNames(card.archetype);
  const history = snapshotCurrentState(card, activeStats);
  const newStats = bumpStatsToNextRank(card.stats, card.archetype, activeStats);
  const newOverallRank = getOverallRank(newStats);
  const newDominant = getDominantStat(newStats);
  const newBorder = getBorderForDominantStat(newDominant);
  const borderSource = `/assets/borders/${newBorder.toLowerCase()}.png`;

  const baseModifiers: ModifierStack = card.modifiers ?? {
    setting: rollSurprise(MODIFIER_CATEGORIES[0].pool, []).text,
    demeanor: rollSurprise(MODIFIER_CATEGORIES[1].pool, []).text,
    signatureDetail: rollSurprise(MODIFIER_CATEGORIES[2].pool, []).text,
    lighting: rollSurprise(MODIFIER_CATEGORIES[3].pool, []).text,
  };

  // Class Signature unlocks at Forged+. Roll one now if crossing that threshold
  // (or the card was made before signatures existed).
  const classPool = getClassSignaturePool(card.archetype);
  const modifiers: ModifierStack = {
    ...baseModifiers,
    classSignature:
      newOverallRank !== 'Foundation' && !baseModifiers.classSignature && classPool.length > 0
        ? rollWeighted(classPool).text
        : baseModifiers.classSignature,
  };

  // Claude composes lore AND the Leonardo prompt (guaranteed <= 1300 chars) — this
  // replaces the local prompt assembler for tier-up so we can't blow the 1500 cap.
  // Passing card.identity keeps the same person across ranks — Claude weaves the
  // gender/ethnicity/hair/eyes verbatim into the new portraitPrompt.
  // shouldEvolve=true asks Claude to escalate each modifier string to fit the
  // new rank ("Storm" → "Tempest" at Forged, etc.) and to use the escalated
  // values inside portraitPrompt so image + lore stay coherent.
  const text = await generateCardText(
    card.archetype,
    newStats,
    card.whisperWords,
    modifiers,
    card.cardName,
    card.identity,
    true,
    ascendantNarrative,
  );

  // Adopt the evolved modifiers if Claude returned them; otherwise stick with
  // the input (safe fallback — nothing breaks, just no escalation this turn).
  const finalModifiers: ModifierStack = text.evolvedModifiers ?? modifiers;

  // Populate the modifier lineage so we can show the escalation history later.
  // Initialize the current rank's snapshot too, in case the card predates this feature.
  const oldRank = getOverallRank(card.stats);
  const priorLineage = card.modifierLineage ?? {};
  const modifierLineage: Partial<Record<Rank, ModifierStack>> = {
    ...priorLineage,
    [oldRank]: priorLineage[oldRank] ?? modifiers,
    [newOverallRank]: finalModifiers,
  };

  // Portrait can fail (nsfw filter, API errors) — capture the failure reason
  // and preserve the previous portrait so the tier-up doesn't leave the card
  // with a broken image. The caller surfaces the reason to the user.
  let portraitError: string | undefined;
  let portraitRegenerated = true;

  // Only use the previous portrait as an init image if it's actually an image.
  // Cards created before the NSFW-null fix may have `data:text/html` stored
  // here — sending that as an init image would break the whole tier-up call.
  const previousIsUsableImage =
    typeof card.portraitAsset === 'string' &&
    (card.portraitAsset.startsWith('data:image/') || card.portraitAsset.startsWith('/assets/'));
  const initImage = previousIsUsableImage ? card.portraitAsset : undefined;

  const portrait = await generatePortraitStrict(text.portraitPrompt, text.negativePrompt, initImage)
    .catch((err: unknown) => {
      portraitRegenerated = false;
      portraitError = err instanceof Error ? err.message : String(err);
      console.warn('Tier-up portrait generation failed, keeping previous portrait:', err);
      console.info(`Failed prompt (length ${text.portraitPrompt.length}):`, text.portraitPrompt);
      return card.portraitAsset;
    });

  const updatedCard: Card = {
    ...card,
    stats: newStats,
    dominantStat: newDominant,
    border: { baseVariant: newBorder, baseSource: borderSource },
    nameAndTitle: text.nameAndTitle,
    lore: text.lore,
    portraitAsset: portrait,
    modifiers: finalModifiers,
    modifierLineage,
    // Persist identity — either the pre-existing one (unchanged) or the fresh
    // one Claude generated for cards created before identity-lock existed.
    identity: card.identity ?? text.identity,
    evolutionHistory: history,
  };

  saveCard(updatedCard);
  return { card: updatedCard, portraitRegenerated, portraitError };
}

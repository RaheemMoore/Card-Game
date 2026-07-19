import type { Card, CardStats, StatName, Rank, ArtSnapshot, AbilityHistorySnapshot } from '../types/card';
import type { HiddenFate } from '../types/bible';
import type { AbilitySlotType, CardAbilityReference } from '../types/abilities';
import {
  BIAS_RANGES,
  deriveRank,
  deriveStatRanks,
  getOverallRank,
  getDominantStat,
  getBorderForDominantStat,
  getStatNames,
} from '../data/powerSystem';
import { generatePortraitStrict, getInitStrengthForArchetype } from './leonardoApi';
import { generateCardText } from './claudeApi';
import { saveCard } from './storage';
import { emptyHiddenFate } from './hiddenFate';
import { inferPrestige } from './prestigeInference';
import { proposeAbility } from './abilities/proposalService';
import { getAbilityStore, saveReference, getReferencesForCard } from './abilities/registry';
import { grantDiscoveryReward } from './abilities/discoveryLedger';
import { getCurrentUserId } from './persistence/supabaseClient';

/**
 * Bible-driven tier-up.
 *
 * Bible §Rank continuity is inviolable:
 *   - Same sex, age, body type, ancestry, disability, physical condition,
 *     defining scars, core identity.
 *   - Advancement must NOT automatically make the character younger, thinner,
 *     more muscular, healthier, less disabled, or more conventionally
 *     attractive.
 *   - No forced "MORE machine each rank", no forced "MORE wolf each rank",
 *     no forced apotheosis.
 *
 * Ascendant tier-ups run prestige inference — if the completed Story Pillar
 * answers narratively support one of the archetype's approved titles, the
 * card gains a PrestigeRole. This is never player-selected.
 */

const NEXT_RANK: Partial<Record<Rank, Rank>> = {
  Foundation: 'Forged',
  Forged: 'Ascendant',
};

function bumpStatsToNextRank(stats: CardStats, activeStats: StatName[]): CardStats {
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
  return getOverallRank(card.stats) !== 'Ascendant';
}

export interface TierUpResult {
  card: Card;
  portraitRegenerated: boolean;
  portraitError?: string;
  /** Bible §Prestige — assigned only when the narrative supports it, at Ascendant. */
  prestigeAwarded?: string;
  newAbilityDiscovery?: {
    abilityId: string;
    slotType: AbilitySlotType;
    resource?: 'mana' | 'tech';
  };
}

export async function tierUpCard(card: Card): Promise<TierUpResult> {
  const activeStats = getStatNames(card.archetype);
  const history = snapshotCurrentState(card, activeStats);
  const newStats = bumpStatsToNextRank(card.stats, activeStats);
  const newOverallRank = getOverallRank(newStats);
  const oldRank = getOverallRank(card.stats);
  const newDominant = getDominantStat(newStats);
  const newBorder = getBorderForDominantStat(newDominant);
  const borderSource = `/assets/borders/${newBorder.toLowerCase()}.png`;

  // Bible cards MUST have storyPillars + elementSelection to tier up.
  // Legacy cards (pre-Bible) are wiped in Phase M3; between M2 and M3 we
  // return a graceful error so the caller can surface it.
  if (!card.storyPillars || !card.elementSelection) {
    throw new Error(
      'This card was created before the Character Generation Bible integration and cannot be tiered up. It will be reset when the new pipeline ships.',
    );
  }

  const abilitySlotToFill: AbilitySlotType | undefined =
    newOverallRank === 'Forged' && oldRank === 'Foundation'
      ? 'signature'
      : newOverallRank === 'Ascendant' && oldRank === 'Forged'
        ? 'ultimate'
        : undefined;

  // Preserve Hidden Fate identity anchors across ranks — Claude receives
  // the previous card's HiddenFate and is instructed to keep locked
  // fields verbatim (see claudeApi.ts).
  const existingHiddenFate: HiddenFate = card.hiddenFate ?? emptyHiddenFate();

  // Pass the card's current-rank ability refs so Claude can weave each
  // ability's visual signature into the new portrait per M3.5.
  const existingAbilityRefs = getReferencesForCard(card.cardId).filter(
    (r) => r.localTier === oldRank,
  );

  const text = await generateCardText({
    archetype: card.archetype,
    stats: newStats,
    answers: card.storyPillars,
    element: card.elementSelection,
    existingName: card.cardName,
    existingHiddenFate,
    abilitySlotToFill,
    existingAbilityRefs,
  });

  // Ascendant tier-up runs prestige inference. Non-Ascendant returns null.
  const prestigeResult = inferPrestige(card.archetype, card.storyPillars, newOverallRank);
  const prestige = prestigeResult.role ?? undefined;

  // Portrait — Bible-compliant fallback preserves previous portrait on
  // Leonardo/NSFW failure, same as before.
  let portraitError: string | undefined;
  let portraitRegenerated = true;
  const previousIsUsableImage =
    typeof card.portraitAsset === 'string' &&
    (card.portraitAsset.startsWith('data:image/') || card.portraitAsset.startsWith('/assets/'));
  const initImage = previousIsUsableImage ? card.portraitAsset : undefined;
  const initStrength = getInitStrengthForArchetype(card.archetype);

  const portrait = await generatePortraitStrict(
    text.portraitPrompt,
    text.negativePrompt,
    initImage,
    initStrength,
  ).catch((err: unknown) => {
    portraitRegenerated = false;
    portraitError = err instanceof Error ? err.message : String(err);
    console.warn('Tier-up portrait generation failed, keeping previous portrait:', err);
    return card.portraitAsset;
  });

  // Ability carry-forward + slot fill — unchanged from before, still
  // reads from ability registry.
  const abilitySnapshots: AbilityHistorySnapshot[] = [];
  let newAbilityDiscovery: TierUpResult['newAbilityDiscovery'];
  try {
    const priorRefs = getReferencesForCard(card.cardId);
    for (const priorRef of priorRefs) {
      if (priorRef.localTier !== oldRank) continue;
      const carried: CardAbilityReference = { ...priorRef, localTier: newOverallRank };
      saveReference(carried);
      abilitySnapshots.push({
        abilityId: carried.abilityId,
        abilityVersionId: carried.abilityVersionId,
        slotType: carried.slotType,
      });
    }

    if (abilitySlotToFill && text.abilityCandidate) {
      const outcome = proposeAbility(getAbilityStore(), {
        candidate: text.abilityCandidate,
        userId: getCurrentUserId() ?? 'anon',
      });
      if (outcome.kind === 'attached') {
        const displayOrder = abilitySlotToFill === 'signature' ? 1 : 2;
        const newRef: CardAbilityReference = {
          cardId: card.cardId,
          abilityId: outcome.abilityId,
          abilityVersionId: outcome.abilityVersionId,
          slotType: abilitySlotToFill,
          localTier: newOverallRank,
          displayOrder,
        };
        saveReference(newRef);
        abilitySnapshots.push({
          abilityId: outcome.abilityId,
          abilityVersionId: outcome.abilityVersionId,
          slotType: abilitySlotToFill,
        });
        if (outcome.firstDiscoveryForPlayer) {
          const reward = grantDiscoveryReward(getAbilityStore(), outcome.abilityId);
          if (reward.kind === 'granted') {
            const summary = reward.items.map((i) => `+${i.amount} ${i.currency}`).join(', ');
            if (import.meta.env.DEV) console.debug(`[tier-up] discovery reward granted: ${summary}`);
          }
          const version = getAbilityStore().getCurrentVersion(outcome.abilityId);
          newAbilityDiscovery = {
            abilityId: outcome.abilityId,
            slotType: abilitySlotToFill,
            resource:
              version?.resourceType === 'mana' || version?.resourceType === 'tech'
                ? version.resourceType
                : undefined,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[tier-up] ability handling failed:', err);
  }

  const priorAbilityHistory = card.abilityHistory ?? {};
  const abilityHistory: Partial<Record<Rank, AbilityHistorySnapshot[]>> =
    abilitySnapshots.length > 0
      ? { ...priorAbilityHistory, [newOverallRank]: abilitySnapshots }
      : priorAbilityHistory;

  const updatedCard: Card = {
    ...card,
    stats: newStats,
    dominantStat: newDominant,
    border: { baseVariant: newBorder, baseSource: borderSource },
    nameAndTitle: text.nameAndTitle,
    lore: text.lore,
    portraitAsset: portrait,
    hiddenFate: text.hiddenFate,
    prestige: prestige ?? card.prestige,
    evolutionHistory: history,
    abilityHistory: Object.keys(abilityHistory).length > 0 ? abilityHistory : undefined,
  };

  saveCard(updatedCard);
  return {
    card: updatedCard,
    portraitRegenerated,
    portraitError,
    prestigeAwarded: prestige?.title,
    newAbilityDiscovery,
  };
}

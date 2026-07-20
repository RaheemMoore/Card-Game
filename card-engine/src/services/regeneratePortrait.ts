import type { Card } from '../types/card';
import { generatePortraitStrict, getInitStrengthForArchetype } from './leonardoApi';
import { generateCardTextWithRetry } from './claudeApi';
import { getDominantStat, getBorderForDominantStat } from '../data/powerSystem';
import { saveCard } from './storage';
import { emptyHiddenFate } from './hiddenFate';
import { resolveCurrentElement } from './elementResolver';
import { SERAPH_ALIGNMENT } from '../data/narrativeAxes';

/**
 * Regenerates ONLY the portrait for a card at its current rank. Preserves
 * name, lore, stats, storyPillars, elementSelection, and (per Bible §Rank
 * continuity) the locked HiddenFate identity anchors.
 *
 * Used when a previous portrait was corrupted or the user wants a re-roll.
 * Does NOT re-roll Story Pillars — those are immutable generation facts.
 */
export async function regeneratePortrait(card: Card): Promise<Card> {
  if (!card.storyPillars || !card.elementSelection) {
    throw new Error(
      'This card was created before the Character Generation Bible integration. It will be reset when the new pipeline ships.',
    );
  }

  // P6 — art pipeline consumes the resolved element (a Fallen Seraph's
  // transmuted Infernal, otherwise the origin element).
  const resolvedElement = resolveCurrentElement(card) ?? card.elementSelection.element;
  const narrativeAxis =
    card.narrativeAxis && SERAPH_ALIGNMENT.appliesToArchetypes.includes(card.archetype)
      ? { path: card.narrativeAxis.path }
      : undefined;

  const text = await generateCardTextWithRetry({
    archetype: card.archetype,
    stats: card.stats,
    answers: card.storyPillars,
    element: { ...card.elementSelection, element: resolvedElement },
    existingName: card.cardName,
    existingHiddenFate: card.hiddenFate ?? emptyHiddenFate(),
    narrativeAxis,
  });

  const initImage =
    typeof card.portraitAsset === 'string' &&
    (card.portraitAsset.startsWith('data:image/') || card.portraitAsset.startsWith('/assets/'))
      ? card.portraitAsset
      : undefined;

  const initStrength = getInitStrengthForArchetype(card.archetype);
  const regenModelKey =
    (card.generationModel as import('./leonardoApi').LeonardoModelKey | undefined) ?? 'phoenix_1_0';
  const { dataUrl: portrait } = await generatePortraitStrict(
    text.portraitPrompt,
    text.negativePrompt,
    initImage,
    initStrength,
    regenModelKey,
  );

  const dominant = getDominantStat(card.stats);
  const border = getBorderForDominantStat(dominant);

  const updated: Card = {
    ...card,
    portraitAsset: portrait,
    dominantStat: dominant,
    border: { baseVariant: border, baseSource: `/assets/borders/${border.toLowerCase()}.png` },
    hiddenFate: text.hiddenFate,
  };

  saveCard(updated);
  return updated;
}

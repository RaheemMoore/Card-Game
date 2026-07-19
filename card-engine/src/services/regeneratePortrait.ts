import type { Card } from '../types/card';
import { generatePortraitStrict, getInitStrengthForArchetype } from './leonardoApi';
import { generateCardText } from './claudeApi';
import { getDominantStat, getBorderForDominantStat } from '../data/powerSystem';
import { saveCard } from './storage';
import { emptyHiddenFate } from './hiddenFate';

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

  const text = await generateCardText({
    archetype: card.archetype,
    stats: card.stats,
    answers: card.storyPillars,
    element: card.elementSelection,
    existingName: card.cardName,
    existingHiddenFate: card.hiddenFate ?? emptyHiddenFate(),
  });

  const initImage =
    typeof card.portraitAsset === 'string' &&
    (card.portraitAsset.startsWith('data:image/') || card.portraitAsset.startsWith('/assets/'))
      ? card.portraitAsset
      : undefined;

  const initStrength = getInitStrengthForArchetype(card.archetype);
  const portrait = await generatePortraitStrict(
    text.portraitPrompt,
    text.negativePrompt,
    initImage,
    initStrength,
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

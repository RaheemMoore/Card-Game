import type { Card, ModifierStack } from '../types/card';
import { generatePortraitStrict } from './leonardoApi';
import { generateCardText } from './claudeApi';
import { getOverallRank, getDominantStat, getBorderForDominantStat } from '../data/powerSystem';
import {
  MODIFIER_CATEGORIES,
  getClassSignaturePool,
  rollSurprise,
  rollWeighted,
} from '../data/modifierPools';
import { saveCard } from './storage';

/**
 * Regenerates ONLY the portrait for a card at its current rank. Does not
 * change stats, name, lore, or history. Use when a previous portrait was
 * corrupted (nsfw filter, old data:text/html bug) or the user wants a re-roll.
 */
export async function regeneratePortrait(card: Card): Promise<Card> {
  const overallRank = getOverallRank(card.stats);

  const baseModifiers: ModifierStack = card.modifiers ?? {
    setting: rollSurprise(MODIFIER_CATEGORIES[0].pool, []).text,
    demeanor: rollSurprise(MODIFIER_CATEGORIES[1].pool, []).text,
    signatureDetail: rollSurprise(MODIFIER_CATEGORIES[2].pool, []).text,
    lighting: rollSurprise(MODIFIER_CATEGORIES[3].pool, []).text,
  };

  const classPool = getClassSignaturePool(card.archetype);
  const modifiers: ModifierStack = {
    ...baseModifiers,
    classSignature:
      overallRank !== 'Foundation' && !baseModifiers.classSignature && classPool.length > 0
        ? rollWeighted(classPool).text
        : baseModifiers.classSignature,
  };

  // Claude composes the Leonardo prompt (guaranteed <= 1300 chars). We pass
  // the existing card name AND identity so the same character is preserved.
  const text = await generateCardText(
    card.archetype,
    card.stats,
    card.whisperWords,
    modifiers,
    card.cardName,
    card.identity,
  );

  // Only pass a valid image as init image. Corrupted portraitAsset (empty or
  // legacy data:text/html) is not usable and would break the whole call.
  const initImage =
    typeof card.portraitAsset === 'string' &&
    (card.portraitAsset.startsWith('data:image/') || card.portraitAsset.startsWith('/assets/'))
      ? card.portraitAsset
      : undefined;

  const portrait = await generatePortraitStrict(text.portraitPrompt, text.negativePrompt, initImage);

  // Also re-derive dominant/border in case older cards weren't computed post-fix.
  const dominant = getDominantStat(card.stats);
  const border = getBorderForDominantStat(dominant);

  const updated: Card = {
    ...card,
    portraitAsset: portrait,
    modifiers,
    dominantStat: dominant,
    border: { baseVariant: border, baseSource: `/assets/borders/${border.toLowerCase()}.png` },
    // Preserve prior identity if we had one; otherwise adopt what Claude produced.
    identity: card.identity ?? text.identity,
  };

  saveCard(updated);
  return updated;
}

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
import { ARCHETYPES } from '../data/archetypes';
import { generatePortrait } from './leonardoApi';
import { generateCardText } from './claudeApi';
import { assemblePortraitPrompt } from './promptAssembler';
import { saveCard } from './storage';
import {
  MODIFIER_CATEGORIES,
  rollSurprise,
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

export async function tierUpCard(card: Card): Promise<Card> {
  const activeStats = getStatNames(card.archetype);
  const history = snapshotCurrentState(card, activeStats);
  const newStats = bumpStatsToNextRank(card.stats, card.archetype, activeStats);
  const newOverallRank = getOverallRank(newStats);
  const newDominant = getDominantStat(newStats);
  const newBorder = getBorderForDominantStat(newDominant);
  const borderSource = `/assets/borders/${newBorder.toLowerCase()}.png`;

  const modifiers: ModifierStack = card.modifiers ?? {
    setting: rollSurprise(MODIFIER_CATEGORIES[0].pool, []).text,
    demeanor: rollSurprise(MODIFIER_CATEGORIES[1].pool, []).text,
    signatureDetail: rollSurprise(MODIFIER_CATEGORIES[2].pool, []).text,
    lighting: rollSurprise(MODIFIER_CATEGORIES[3].pool, []).text,
  };

  const { prompt, negativePrompt } = assemblePortraitPrompt(
    card.archetype,
    newOverallRank,
    newStats,
    modifiers,
  );

  const [portrait, text] = await Promise.all([
    generatePortrait(prompt, negativePrompt, card.archetype, newOverallRank, card.portraitAsset),
    generateCardText(card.archetype, newStats, card.whisperWords, modifiers, card.cardName),
  ]);

  const updatedCard: Card = {
    ...card,
    stats: newStats,
    dominantStat: newDominant,
    border: { baseVariant: newBorder, baseSource: borderSource },
    nameAndTitle: text.nameAndTitle,
    lore: text.lore,
    portraitAsset: portrait,
    modifiers,
    evolutionHistory: history,
  };

  saveCard(updatedCard);
  return updatedCard;
}

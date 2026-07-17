import type { Card, CardStats, StatEntry, ArchetypeName, BiasTier, StatName } from '../types/card';
import { ARCHETYPE_NAMES } from '../types/card';
import { CLASS_AFFINITY, BIAS_RANGES, getDominantStat, getBorderForDominantStat } from '../data/powerSystem';

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollStat(bias: BiasTier): StatEntry {
  const range = BIAS_RANGES[bias];
  return {
    value: randomInRange(...range.foundation),
    bias,
    hardCap: range.hardCap,
  };
}

export function generateStats(archetype: ArchetypeName): CardStats {
  const affinity = CLASS_AFFINITY[archetype];
  const stats: CardStats = {
    Atk: rollStat(affinity.Atk!),
    Def: rollStat(affinity.Def!),
  };

  if (affinity.Tech) {
    stats.Tech = rollStat(affinity.Tech);
  } else {
    stats.Mana = rollStat(affinity.Mana!);
  }

  return stats;
}

export function getStatValue(stats: CardStats, name: StatName): number {
  const entry = stats[name];
  return entry ? entry.value : 0;
}

export function buildCardShell(
  archetype: ArchetypeName,
  stats: CardStats,
  whisperWords: string[],
): Omit<Card, 'cardName' | 'nameAndTitle' | 'lore'> {
  const dominant = getDominantStat(stats);
  const borderVariant = getBorderForDominantStat(dominant);

  return {
    cardId: crypto.randomUUID(),
    archetype,
    portraitAsset: '',
    stats,
    dominantStat: dominant,
    border: {
      baseVariant: borderVariant,
      baseSource: dominant ?? 'none',
    },
    whisperWords,
    evolutionHistory: {},
    createdAt: new Date().toISOString(),
  };
}

export function randomArchetype(): ArchetypeName {
  return ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
}

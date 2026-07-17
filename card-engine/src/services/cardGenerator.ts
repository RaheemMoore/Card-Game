import type {
  Card,
  CardStats,
  StatEntry,
  ArchetypeName,
  BiasTier,
  StatName,
  LycanthropeIdentity,
  LycanFurColor,
  LycanMoonPhase,
} from '../types/card';
import { ARCHETYPE_NAMES, LYCAN_FUR_COLORS, LYCAN_MOON_PHASES } from '../types/card';
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

export function rollLycanthropeIdentity(): LycanthropeIdentity {
  const furColor: LycanFurColor = LYCAN_FUR_COLORS[Math.floor(Math.random() * LYCAN_FUR_COLORS.length)];
  const moonPhase: LycanMoonPhase = LYCAN_MOON_PHASES[Math.floor(Math.random() * LYCAN_MOON_PHASES.length)];
  return { furColor, moonPhase };
}

export function buildCardShell(
  archetype: ArchetypeName,
  stats: CardStats,
  whisperWords: string[],
): Omit<Card, 'cardName' | 'nameAndTitle' | 'lore'> {
  const dominant = getDominantStat(stats);
  const borderVariant = getBorderForDominantStat(dominant);

  const shell: Omit<Card, 'cardName' | 'nameAndTitle' | 'lore'> = {
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

  if (archetype === 'Lycanthrope') {
    shell.lycanIdentity = rollLycanthropeIdentity();
  }

  return shell;
}

export function randomArchetype(): ArchetypeName {
  return ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
}

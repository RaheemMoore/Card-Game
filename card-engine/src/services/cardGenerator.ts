import type { Card, CombatStats, Rank, ArchetypeName, BorderVariant } from '../types/card';
import { ARCHETYPE_NAMES, RANKS } from '../types/card';

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const RANK_STAT_RANGES: Record<Rank, { atk: [number, number]; def: [number, number]; mana: [number, number] }> = {
  Foundation: { atk: [1, 4], def: [1, 4], mana: [1, 3] },
  Forged: { atk: [3, 7], def: [3, 7], mana: [2, 5] },
  Ascendant: { atk: [5, 10], def: [5, 10], mana: [4, 8] },
};

export function generateCombatStats(rank: Rank): { stats: CombatStats; manaCost: number } {
  const ranges = RANK_STAT_RANGES[rank];
  const atk = randomInRange(...ranges.atk);
  const def = randomInRange(...ranges.def);
  const manaCost = randomInRange(...ranges.mana);
  return { stats: { atk, def }, manaCost };
}

export function getBorderForArchetype(archetype: ArchetypeName): BorderVariant {
  const mapping: Partial<Record<ArchetypeName, BorderVariant>> = {
    Barbarian: 'Dominance',
    Monk: 'Conscientiousness',
    Beastmaster: 'Steadiness',
    Druid: 'Steadiness',
    Necromancer: 'Influencing',
    Vampire: 'Dominance',
    'Mech Pilot': 'Conscientiousness',
    Android: 'Conscientiousness',
    Seraph: 'Influencing',
    Human: 'Default',
  };
  return mapping[archetype] ?? 'Default';
}

export function buildCardShell(
  archetype: ArchetypeName,
  rank: Rank,
  stats: CombatStats,
  manaCost: number,
  whisperWords: string[],
): Omit<Card, 'cardName' | 'nameAndTitle' | 'lore'> {
  const borderVariant = getBorderForArchetype(archetype);

  return {
    cardId: crypto.randomUUID(),
    archetype,
    rank,
    portraitAsset: '',
    stats,
    manaCost,
    border: {
      baseVariant: borderVariant,
      baseSource: archetype,
    },
    whisperWords,
    createdAt: new Date().toISOString(),
  };
}

export function randomArchetype(): ArchetypeName {
  return ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
}

export function randomRank(): Rank {
  return RANKS[Math.floor(Math.random() * RANKS.length)];
}

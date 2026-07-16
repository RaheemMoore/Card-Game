export const RANKS = ['Foundation', 'Forged', 'Ascendant'] as const;
export type Rank = typeof RANKS[number];

export const ARCHETYPE_NAMES = [
  'Barbarian', 'Monk', 'Beastmaster', 'Druid', 'Necromancer',
  'Vampire', 'Mech Pilot', 'Android', 'Seraph', 'Human',
] as const;
export type ArchetypeName = typeof ARCHETYPE_NAMES[number];

export const BORDER_VARIANTS = ['Dominance', 'Influencing', 'Steadiness', 'Conscientiousness', 'Default'] as const;
export type BorderVariant = typeof BORDER_VARIANTS[number];

export const BIAS_TIERS = ['Very Low', 'Low', 'Mid', 'Mid-High', 'High', 'Very High'] as const;
export type BiasTier = typeof BIAS_TIERS[number];

export const STAT_NAMES = ['Atk', 'Def', 'Mana', 'Tech'] as const;
export type StatName = typeof STAT_NAMES[number];

export interface StatEntry {
  value: number;
  bias: BiasTier;
  hardCap: number;
}

export interface CardStats {
  Atk: StatEntry;
  Def: StatEntry;
  Mana?: StatEntry;
  Tech?: StatEntry;
}

export interface ArtSnapshot {
  portraitUrl: string;
  cardName: string;
  nameAndTitle: string;
  lore: string;
}

export type EvolutionHistory = Partial<Record<StatName, Partial<Record<Rank, ArtSnapshot | null>>>>;

export interface ModifierStack {
  setting: string;
  demeanor: string;
  signatureDetail: string;
  lighting: string;
}

export interface CardBorder {
  baseVariant: BorderVariant;
  baseSource: string;
}

export interface Card {
  cardId: string;
  archetype: ArchetypeName;
  cardName: string;
  nameAndTitle: string;
  portraitAsset: string;
  stats: CardStats;
  dominantStat: StatName | null;
  border: CardBorder;
  lore: string;
  whisperWords: string[];
  modifiers?: ModifierStack;
  evolutionHistory: EvolutionHistory;
  createdAt: string;
}

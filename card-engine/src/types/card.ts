export const RANKS = ['Foundation', 'Forged', 'Ascendant'] as const;
export type Rank = typeof RANKS[number];

export const ARCHETYPE_NAMES = [
  'Barbarian', 'Monk', 'Beastmaster', 'Druid', 'Necromancer',
  'Vampire', 'Mech Pilot', 'Android', 'Seraph', 'Human',
] as const;
export type ArchetypeName = typeof ARCHETYPE_NAMES[number];

export const BORDER_VARIANTS = ['Dominance', 'Influencing', 'Steadiness', 'Conscientiousness', 'Default'] as const;
export type BorderVariant = typeof BORDER_VARIANTS[number];

export interface CombatStats {
  atk: number;
  def: number;
}

export interface Card {
  cardId: string;
  archetype: ArchetypeName;
  rank: Rank;
  cardName: string;
  nameAndTitle: string;
  portraitAsset: string;
  stats: CombatStats;
  manaCost: number;
  border: CardBorder;
  lore: string;
  whisperWords: string[];
  createdAt: string;
}

export interface CardBorder {
  baseVariant: BorderVariant;
  baseSource: string;
}

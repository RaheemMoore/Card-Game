import type { ArchetypeName, BiasTier, StatName, StatEntry, Rank, CardStats, BorderVariant } from '../types/card';

export const CLASS_AFFINITY: Record<ArchetypeName, Partial<Record<StatName, BiasTier>>> = {
  Barbarian:    { Atk: 'High',      Def: 'Mid',       Mana: 'Very Low' },
  Monk:         { Atk: 'Mid-High',  Def: 'Mid',       Mana: 'Mid-High' },
  Beastmaster:  { Atk: 'Mid-High',  Def: 'Mid',       Mana: 'Mid' },
  Druid:        { Atk: 'Low',       Def: 'Mid',       Mana: 'High' },
  Necromancer:  { Atk: 'Low',       Def: 'Low',       Mana: 'Very High' },
  Vampire:      { Atk: 'High',      Def: 'Low',       Mana: 'High' },
  'Mech Pilot': { Atk: 'High',      Def: 'Very High', Tech: 'Very High' },
  Android:      { Atk: 'Mid',       Def: 'High',      Tech: 'Very High' },
  Seraph:       { Atk: 'Mid',       Def: 'High',      Mana: 'High' },
  Human:        { Atk: 'Mid',       Def: 'Mid',       Mana: 'Mid' },
};

export interface BiasRange {
  foundation: [number, number];
  forgedFloor: number;
  ascendantFloor: number;
  hardCap: number;
}

export const BIAS_RANGES: Record<BiasTier, BiasRange> = {
  'Very Low':  { foundation: [5, 25],   forgedFloor: 26, ascendantFloor: 41, hardCap: 55 },
  'Low':       { foundation: [15, 35],  forgedFloor: 36, ascendantFloor: 56, hardCap: 70 },
  'Mid':       { foundation: [30, 50],  forgedFloor: 51, ascendantFloor: 71, hardCap: 85 },
  'Mid-High':  { foundation: [40, 60],  forgedFloor: 61, ascendantFloor: 76, hardCap: 90 },
  'High':      { foundation: [50, 65],  forgedFloor: 66, ascendantFloor: 81, hardCap: 100 },
  'Very High': { foundation: [60, 75],  forgedFloor: 76, ascendantFloor: 86, hardCap: 100 },
};

export function deriveRank(value: number, bias: BiasTier): Rank {
  const range = BIAS_RANGES[bias];
  if (value >= range.ascendantFloor) return 'Ascendant';
  if (value >= range.forgedFloor) return 'Forged';
  return 'Foundation';
}

function getActiveStats(stats: CardStats): [StatName, BiasTier, number][] {
  const entries: [StatName, BiasTier, number][] = [
    ['Atk', stats.Atk.bias, stats.Atk.value],
    ['Def', stats.Def.bias, stats.Def.value],
  ];
  if (stats.Mana) entries.push(['Mana', stats.Mana.bias, stats.Mana.value]);
  if (stats.Tech) entries.push(['Tech', stats.Tech.bias, stats.Tech.value]);
  return entries;
}

const RANK_POINTS: Record<Rank, number> = { Foundation: 1, Forged: 2, Ascendant: 3 };

export function deriveStatRanks(stats: CardStats): Partial<Record<StatName, Rank>> {
  const result: Partial<Record<StatName, Rank>> = {};
  for (const [name, bias, value] of getActiveStats(stats)) {
    result[name] = deriveRank(value, bias);
  }
  return result;
}

export function computeRankSum(stats: CardStats): number {
  const ranks = deriveStatRanks(stats);
  let sum = 0;
  for (const rank of Object.values(ranks)) {
    sum += RANK_POINTS[rank];
  }
  return sum;
}

export function getDominantStat(stats: CardStats): StatName | null {
  const entries = getActiveStats(stats);
  let max = -1;
  let dominant: StatName | null = null;
  let tied = false;

  for (const [name, , value] of entries) {
    if (value > max) {
      max = value;
      dominant = name;
      tied = false;
    } else if (value === max) {
      tied = true;
    }
  }

  return tied ? null : dominant;
}

export function getBorderForDominantStat(dominant: StatName | null): BorderVariant {
  if (!dominant) return 'Default';
  const map: Record<StatName, BorderVariant> = {
    Atk: 'Dominance',
    Def: 'Steadiness',
    Mana: 'Conscientiousness',
    Tech: 'Influencing',
  };
  return map[dominant];
}

export function getOverallRank(stats: CardStats): Rank {
  const ranks = deriveStatRanks(stats);
  const values = Object.values(ranks);
  if (values.includes('Ascendant')) return 'Ascendant';
  if (values.includes('Forged')) return 'Forged';
  return 'Foundation';
}

export function getStatNames(archetype: ArchetypeName): StatName[] {
  const affinity = CLASS_AFFINITY[archetype];
  const names: StatName[] = ['Atk', 'Def'];
  if (affinity.Tech) names.push('Tech');
  else names.push('Mana');
  return names;
}

export function isOrganic(archetype: ArchetypeName): boolean {
  return archetype !== 'Mech Pilot' && archetype !== 'Android';
}

export function getResourceStat(stats: CardStats): { name: 'Mana' | 'Tech'; entry: StatEntry } {
  if (stats.Tech) return { name: 'Tech', entry: stats.Tech };
  return { name: 'Mana', entry: stats.Mana! };
}

// Specialization suffix lookup for prompt assembly
const SPECIALIZATION_SUFFIX: Record<StatName, Record<Rank, string>> = {
  Atk: {
    Foundation: '',
    Forged: 'Reforged [Archetype] of Greater Might',
    Ascendant: 'Ascended [Archetype] War-Lord',
  },
  Def: {
    Foundation: '',
    Forged: 'Reforged Sentinel [Archetype]',
    Ascendant: 'Ascended Bulwark [Archetype]',
  },
  Mana: {
    Foundation: '',
    Forged: 'Reforged Mana-Touched [Archetype]',
    Ascendant: 'Ascended Mana [Archetype]',
  },
  Tech: {
    Foundation: '',
    Forged: 'Reforged Tech-Bound [Archetype]',
    Ascendant: 'Ascended Tech-Sovereign [Archetype]',
  },
};

const VISUAL_MOTIFS: Partial<Record<StatName, Partial<Record<Rank, string>>>> = {
  Atk: {
    Foundation: 'basic weapon held ready, untested grip, latent strength',
    Forged: 'battle scars glowing faintly, larger weapons crackling with aggressive energy, combat-ready tension in every muscle',
    Ascendant: 'blazing weapon aura engulfing the frame, devastating strike pose, shockwave energy radiating outward, weapon trails of pure destructive force',
  },
  Def: {
    Foundation: 'simple guard, basic protective stance, cautious posture',
    Forged: 'reinforced layered armor, energy-traced shield raised, stance rooted and unyielding, glowing defensive runes',
    Ascendant: 'impenetrable fortress of layered glowing shields, absolute unmovable stance, ground cracking beneath their weight, barrier energy cascading around them',
  },
  Mana: {
    Foundation: 'faint magical shimmer around the hands, dormant arcane potential',
    Forged: 'arcane sigils swirling around the body, hands glowing with channeled power, eyes beginning to shine with inner light',
    Ascendant: 'arcane sigils orbiting body in a blazing vortex, eyes erupting with raw power, levitating with devastating energy pouring from outstretched hands, reality warping around them',
  },
  Tech: {
    Foundation: 'basic interface panels, simple HUD flicker, early-stage augmentation',
    Forged: 'visible cybernetic enhancements glowing with power, tactical HUD overlay active, integrated weapon systems powering up',
    Ascendant: 'fully integrated combat mech form, targeting HUD blazing across the visor, all weapon systems deployed and firing, energy core overclocked and radiating',
  },
};

const ABSENCE_MOTIFS: Partial<Record<StatName, string>> = {
  Mana: 'no arcane elements, cracked or absent mystical implements',
  Atk: 'gaunt frame, no weapons, hands trembling with fatigue rather than power',
  Def: 'exposed flesh, no armor, vulnerable posture',
  Tech: 'no technological elements, purely organic',
};

export function getSpecializationSuffix(
  archetype: ArchetypeName,
  dominantStat: StatName | null,
  dominantRank: Rank,
): string {
  if (!dominantStat) return '';
  const template = SPECIALIZATION_SUFFIX[dominantStat][dominantRank];
  if (!template) return '';
  return template.replace('[Archetype]', archetype);
}

export function getVisualMotif(dominantStat: StatName | null, dominantRank: Rank): string {
  if (!dominantStat) return '';
  return VISUAL_MOTIFS[dominantStat]?.[dominantRank] ?? '';
}

export function getAbsenceMotifs(stats: CardStats): string[] {
  const motifs: string[] = [];
  for (const [name, bias, value] of getActiveStats(stats)) {
    if (bias !== 'Very Low') continue;
    const range = BIAS_RANGES['Very Low'];
    const midpoint = (range.foundation[0] + range.foundation[1]) / 2;
    if (value <= midpoint && ABSENCE_MOTIFS[name]) {
      motifs.push(ABSENCE_MOTIFS[name]!);
    }
  }
  return motifs;
}

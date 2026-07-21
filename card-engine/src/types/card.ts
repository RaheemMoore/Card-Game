export const RANKS = ['Foundation', 'Forged', 'Ascendant'] as const;
export type Rank = typeof RANKS[number];

export const ARCHETYPE_NAMES = [
  'Barbarian', 'Monk', 'Beastmaster', 'Druid', 'Necromancer',
  'Vampire', 'Lycanthrope', 'Mech Pilot', 'Android', 'Seraph', 'Human',
] as const;
export type ArchetypeName = typeof ARCHETYPE_NAMES[number];

export const LYCAN_FUR_COLORS = ['Black', 'Brown', 'Gray', 'White'] as const;
export type LycanFurColor = typeof LYCAN_FUR_COLORS[number];

export const LYCAN_MOON_PHASES = ['Crescent', 'Half', 'Full', 'Blood', 'Eclipse'] as const;
export type LycanMoonPhase = typeof LYCAN_MOON_PHASES[number];

/**
 * Lycanthrope-only. Rolled once at Foundation forge, locked to the card, and
 * re-injected verbatim into every regeneration so the same wolf carries across
 * ranks despite the human→lycan morphology change. eyeColor + identityToken
 * live on the standard CharacterIdentity (eyes + distinctiveFeatures).
 */
export interface LycanthropeIdentity {
  furColor: LycanFurColor;
  moonPhase: LycanMoonPhase;
}

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
  element?: string;
  physique?: string;
  lineage?: string;
  classSignature?: string;
}

export interface CardBorder {
  baseVariant: BorderVariant;
  baseSource: string;
}

/**
 * Fixed identity of the character, locked at Foundation creation. Passed to
 * Claude on every tier-up / regenerate so the same face carries across ranks —
 * only aging and battle-hardening should change, not gender or ethnicity.
 */
export interface CharacterIdentity {
  gender: string;                // e.g. "female", "male", "androgynous"
  apparentAge: string;           // e.g. "early 20s" (will read as older at Forged/Ascendant via rank aging)
  ethnicity: string;             // e.g. "warm brown skin, West African-inspired features"
  hair: string;                  // e.g. "long braided black hair"
  eyes: string;                  // e.g. "amber eyes"
  bodyType: string;              // e.g. "heavyset and powerfully built", "tall with a lean prosthetic leg", "short and stocky"
  distinctiveFeatures: string;   // e.g. "small scar over left brow, chipped canine"
}

// ---------- Narrative axes (Seraph corruption arc, P4) ----------

export type NarrativeAxisId = 'seraph_alignment';

/**
 * Persisted state of a card's narrative axis (currently only Seraph
 * alignment). Score is the sum of alignmentWeight tags on the player's
 * Story Pillar answers, recomputed at tier-up. Path is the band id at
 * last recompute: 'good' | 'fallen' | 'balanced'.
 */
export interface NarrativeAxisState {
  axisId: NarrativeAxisId;
  /** Clamped to the axis definition's scoreRange. */
  score: number;
  /** Band id at last recompute: 'good' | 'fallen' | 'balanced'. */
  path: string;
  resolvedAtRank: Rank;
  /** Audit only — set when the player paid to Resist the Fall. */
  resistedFall?: boolean;
}

/**
 * Forge Strike training progress. Additive and jsonb-safe (no SQL migration),
 * exactly like narrativeAxis — legacy cards read as "no progress" until first
 * write. Only the Very Low per-stat win accumulator needs to persist; ordinary
 * +1/−1 outcomes write straight to the stat value. See
 * services/minigames/forge-strike/training.ts.
 */
export interface TrainingProgress {
  /** Wins banked toward the next +1 on a Very Low stat (0..threshold−1). */
  veryLowWins?: Partial<Record<StatName, number>>;
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
  /** Bible-era Story Pillar answers. Immutable generation facts per Bible §Guided Narrative Chains. */
  storyPillars?: import('./bible').StoryPillarAnswers;
  /** Bible-era element + bond selection. */
  elementSelection?: import('./bible').ElementSelection;
  /** Bible-era Hidden Fate — details Claude inferred. Preserved across ranks. */
  hiddenFate?: import('./bible').HiddenFate;
  /**
   * Which Leonardo model produced the current portrait. Used for the
   * post-M3.5 A/B model comparison so the Collection can tag each card
   * with its generator. Values are LeonardoModelKey from services/leonardoApi.
   */
  generationModel?: string;
  /**
   * Bible-era prestige role — earned through narrative, never player-selected.
   * Set only when prestigeInference finds the character's completed answers
   * support one of the archetype's approved titles.
   */
  prestige?: import('./bible').PrestigeRole;
  /** @deprecated legacy pre-Bible whisper word list — kept for grandfathered cards. */
  whisperWords: string[];
  /** @deprecated legacy pre-Bible modifier stack — kept for grandfathered cards. */
  modifiers?: ModifierStack;
  identity?: CharacterIdentity;
  /**
   * Per-rank snapshot of the modifiers so we can trace the escalation over
   * tier-ups: Foundation "Storm" → Forged "Tempest" → Ascendant "Savage Storm".
   * `card.modifiers` always reflects the current rank's values.
   */
  modifierLineage?: Partial<Record<Rank, ModifierStack>>;
  /** Lycanthrope only. See LycanthropeIdentity. */
  lycanIdentity?: LycanthropeIdentity;
  /**
   * Seraph corruption arc (P4). Populated lazily at the next tier-up for
   * archetypes covered by a narrative axis definition; legacy cards read
   * as neutral until then. No SQL migration needed (jsonb blob).
   */
  narrativeAxis?: NarrativeAxisState;
  /** Forge Strike training accumulator (Very Low grind). See TrainingProgress. */
  trainingProgress?: TrainingProgress;
  /** What the art/prompt pipeline consumes. Set only by transmutation (e.g. Fallen Seraph Light → Infernal). */
  currentElement?: import('./bible').ElementName;
  /** Set ONLY once, at first transmutation — records the pre-transmute element. */
  originalElement?: import('./bible').ElementName;
  evolutionHistory: EvolutionHistory;
  /**
   * Per-rank snapshot of the card's CardAbilityReference rows. Ability refs
   * live in their own store (services/abilities/registry) so combat can
   * resolve without loading the card blob — this map is a historical trace
   * only. Populated at tier-up in A5.
   *
   * Keyed by Rank → array of ability id + slot type (thin snapshot; the full
   * version details live in the ability library).
   */
  abilityHistory?: Partial<Record<Rank, AbilityHistorySnapshot[]>>;
  createdAt: string;
}

/**
 * Thin snapshot recorded on tier-up. Enough to render a "what abilities did
 * this card have at Foundation" view without joining against the live
 * CardAbilityReference table.
 */
export interface AbilityHistorySnapshot {
  abilityId: string;
  abilityVersionId?: string;
  slotType: 'core' | 'signature' | 'ultimate';
}

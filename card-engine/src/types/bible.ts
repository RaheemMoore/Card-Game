/**
 * Character Generation Bible — runtime types.
 *
 * These types encode the Bible's canonical concepts as TypeScript so the
 * generation pipeline, UI, and Codex all read from one shape.
 *
 * Source of truth: /Character_Generation_Bible_Canonical_v1.md
 * Consult the Lore & Fantasy Director agent (.claude/agents/lore-fantasy-director.md)
 * for interpretive questions.
 */

import type { ArchetypeName } from './card';

// ---------- Elements & bonds ----------

/**
 * Master element list per Bible — twenty-six elements. Every element appears
 * across the eleven archetypes' Compatibility bucketing (§Step 12), gated per
 * archetype into Naturally Compatible, Compatible Through Reinterpretation,
 * Rare, or Not Available.
 */
export const ELEMENT_NAMES = [
  'Fire', 'Water', 'Earth', 'Wind', 'Ice', 'Lightning', 'Stone', 'Storm',
  'Nature', 'Beast', 'Blood', 'Poison', 'Metal', 'Spirit', 'Shadow',
  'Light', 'Sound', 'Ash', 'Holy', 'Void', 'Time', 'Cosmic', 'Tech',
  'Psychic', 'Moon', 'Dream',
] as const;
export type ElementName = typeof ELEMENT_NAMES[number];

/** Bible §Global Element Pillar approved bond pool. */
export const ELEMENT_BONDS = [
  'It is my greatest ally.',
  'It is my greatest burden.',
  'It is my inheritance.',
  'It is my curse.',
  'It is my purpose.',
  'It is my prison.',
  'It is my teacher.',
  'It is my weapon.',
  'It is part of who I am.',
  'I still do not understand it.',
] as const;
export type ElementBond = typeof ELEMENT_BONDS[number];

/**
 * Bible §Element rarity. Compatibility is per-archetype. Rarity affects
 * discovery frequency, NEVER power. See elementCompatibilityBucket() in
 * data/elements.ts.
 */
export type ElementCompatibility =
  | 'naturally_compatible'
  | 'compatible_through_reinterpretation'
  | 'rare'
  | 'not_available';

/** Player's final element choice, plus their bond with it. */
export interface ElementSelection {
  element: ElementName;
  bond: ElementBond;
  /**
   * Bucket at the time of selection — persisted so downstream systems can
   * reference how the element was gated (a Rare pick reads differently in
   * lore than a Naturally Compatible one).
   */
  compatibility: ElementCompatibility;
}

// ---------- Story Pillars ----------

/**
 * Bible §Guided Narrative Chains. Each archetype defines its own pillars —
 * see data/storyPillars.ts. A pillar may have a follow-up (indexed via
 * `followUp: true` and referenced by parentPillarId at answer time).
 */
export interface StoryPillarQuestion {
  /** Stable machine id, e.g. "barbarian_pillar_1", "barbarian_pillar_1_followup". */
  id: string;
  /** Human question exactly as the Bible presents it. */
  prompt: string;
  /** Pillar this belongs to (1, 2, 3, or optional 4 per archetype). */
  pillarIndex: number;
  /** True when this is a nested follow-up to another question. */
  followUp?: boolean;
  /** For follow-ups, the parent question id. */
  parentId?: string;
}

/**
 * A single answer the player selected. Answers are immutable generation
 * facts per Bible §Guided Narrative Chains — Claude may connect and
 * interpret them but must not ignore, replace, soften, or contradict them.
 *
 * The wizard does NOT accept free-form input. Players who dislike the
 * shown options refresh (unlimited during initial implementation) until a
 * pool answer fits.
 */
export interface StoryPillarAnswer {
  questionId: string;
  /** The chosen option id (StoryPillarOption.id). */
  optionId: string;
  /** The chosen option's text at selection time — snapshotted so future edits to the pool don't rewrite existing cards. */
  answer: string;
}

/**
 * A pre-authored option shown in the wizard. Options are seed material — the
 * player may accept, refresh, lock, or write their own.
 */
export interface StoryPillarOption {
  /** Stable id so we can tell when the same option comes back on refresh. */
  id: string;
  questionId: string;
  text: string;
  /**
   * Optional tags used by the element eligibility check and by Claude to
   * classify tension. e.g. ["protective", "clan", "inherited-burden"].
   */
  tags?: string[];
}

/** Full set of a card's Story Pillar answers, keyed by pillar index. */
export interface StoryPillarAnswers {
  /** All answered questions, ordered by pillarIndex then followUp. */
  answers: StoryPillarAnswer[];
}

// ---------- Hidden Fate ----------

/**
 * Bible §Hidden Fate. Claude infers the supporting details the player did
 * not select. These must reinforce the player's story rather than compete
 * with it. Persisted so future tier-ups honor the same body, age, scars, and
 * environment.
 *
 * Body/age/disability/condition on this object are the anchors that rank
 * continuity preserves — Bible §Rank continuity forbids automatic
 * younger/thinner/muscular/healthier changes across ranks.
 */
export interface HiddenFate {
  /** Free-form narrative fields — Claude fills them per Bible §Hidden Fate. */
  age: string;
  sex: string;
  bodyType: string;
  skinTone: string;
  facialStructure: string;
  hair: string;
  disabilityOrCondition: string;
  posture: string;
  scars: string;
  weather: string;
  lighting: string;
  clothingConstruction: string;
  minorAccessories: string;
  environmentDetails: string;
}

// ---------- Prestige roles ----------

/**
 * Bible §Prestige roles — earned through narrative, never player-selected.
 * The card's prestige is null unless prestigeInference finds the completed
 * narrative supports one of the archetype's approved titles.
 */
export interface PrestigeRole {
  /** Approved title, e.g. "Alpha", "Grandmaster", "Archdruid", "Clan Chief", "Blood Regent". */
  title: string;
  /** One-sentence justification citing the Story Pillar answers that support it. */
  justification: string;
  /** Rank at which the prestige was first inferred — typically Ascendant. */
  inferredAtRank: 'Foundation' | 'Forged' | 'Ascendant';
}

// ---------- Structured Bible chapter ----------

/**
 * One archetype's fourteen Bible sections, encoded for runtime.
 * See data/archetypeBible/<archetype>.ts.
 */
export interface ArchetypeBibleChapter {
  archetype: ArchetypeName;
  /** Bible §Archetype Identity Matrix — one-sentence identity anchor. */
  identityThrough: string;
  /** Bible §Archetype Identity Matrix — core fantasy in one sentence. */
  coreFantasy: string;

  // §1 Selection-Screen Lore
  selectionScreen: {
    /** Short label per Bible §Step 1 (e.g. "Warriors of the old clans who turn hardship into strength."). */
    tagline: string;
    /** Body prose. */
    body: string;
    /** Pull-quote used on the tile hover / preview. */
    pullQuote: string;
  };

  // §2 Core Fantasy Promise
  coreFantasyPromise: {
    /** Single-sentence promise. */
    promise: string;
    /** Bible-approved emotional pillars, e.g. ["Resilience", "Belonging", "Burden", "Conviction", "Legacy"]. */
    emotionalPillars: string[];
    /** Optional evocative closer from Bible §2. */
    closer?: string;
  };

  // §3 Origins
  origins: string;

  // §4 Culture and Daily Life
  cultureAndDailyLife: string;

  // §5 Beliefs, Virtues, Taboos, Fears
  beliefs: {
    virtues: string[];
    taboos: string[];
    fears: string[];
    /** Any Bible §5 evocative closer. */
    closer?: string;
  };

  // §6 Internal Diversity
  internalDiversity: {
    /** Named traditions, orders, houses, packs, etc. */
    groups: string[];
    /** Bible §6 closer if present. */
    closer?: string;
  };

  // §7 Visual DNA
  visualDNA: {
    recognitionCues: string;
    avoid: string;
    closer?: string;
  };

  // §8 Symbol and Material Language
  symbolAndMaterial: {
    materials: string;
    symbols: string;
    closer?: string;
  };

  // §9 Rank Evolution
  rankEvolution: {
    Foundation: string;
    Forged: string;
    Ascendant: string;
    /** Bible §9 continuity note — what progression must NOT do. */
    continuityNote?: string;
  };

  // §11 Story Pillar Compatibility framework already lives in storyPillars.ts.
  // §12 Element compatibility already lives in elements.ts.

  // §13 Future Design Space
  futureDesignSpace: string;

  // §14 Claude Generation Guidance and Recognition Checklist
  claudeGuidance: {
    generationPriorities: string[];
    avoid: string[];
    recognitionChecklist: string[];
  };

  // Approved prestige roles for this archetype (see prestigeInference).
  approvedPrestigeRoles: string[];
}

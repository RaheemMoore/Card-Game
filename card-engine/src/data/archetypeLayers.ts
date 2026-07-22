import type {
  ProposalArea,
  ProposalEngine,
  ProposalFailureType,
  ProposalLayer,
} from '../types/archetypeProposal';
import type { ArchetypeName } from '../types/card';

/**
 * The four layers where lore/art change actually happens. This copy is
 * what makes the Archetype Workshop understandable — a lore director opens
 * the page, reads a layer card, and knows what changing it does. Keep the
 * language plain; no code references.
 */
export interface LayerCopy {
  id: ProposalLayer;
  name: string;
  tagline: string;
  color: string;
  accentBg: string;
  accentBorder: string;
  controls: string;
  affects: string;
  changeWhen: string;
  whereItLives: string;
  example: (archetype: ArchetypeName) => string;
}

export const ARCHETYPE_LAYERS: Record<ProposalLayer, LayerCopy> = {
  A: {
    id: 'A',
    name: 'Canon',
    tagline: "The archetype's soul",
    color: '#d4a94a',
    accentBg: 'rgba(212, 169, 74, 0.10)',
    accentBorder: 'rgba(212, 169, 74, 0.55)',
    controls:
      "What makes a Necromancer a Necromancer and not a Vampire. The Bible chapter (14 sections: identity, core fantasy, origins, culture, virtues/taboos, symbols, etc.). This is the source of truth for who the archetype IS.",
    affects:
      "Every future card of this archetype. Existing cards keep their old canon; new forges get the new one. The Lore & Fantasy Director agent is the standing authority for interpretive questions.",
    changeWhen:
      "The archetype concept itself is wrong. Lycanthrope going from 'cursed monster' to 'blessed by the Moon Goddess' was a Layer A change.",
    whereItLives:
      "data/archetypeBible/<archetype>.ts (14 sections per chapter) + Character_Generation_Bible_Canonical_v1.md",
    example: (a) =>
      `Rewriting ${a}'s Bible chapter — identityThrough, coreFantasy, selection-screen lore, virtues/taboos/fears, symbol language. The DNA every ${a} card is built from.`,
  },
  B: {
    id: 'B',
    name: 'Rank & Stat Visuals',
    tagline: 'The power language of ranks',
    color: '#7db3c9',
    accentBg: 'rgba(125, 179, 201, 0.10)',
    accentBorder: 'rgba(125, 179, 201, 0.55)',
    controls:
      "How 'dominant stat' reads visually at each tier. Blazing weapon auras for high-ATK Ascendants, layered glowing shields for high-DEF Ascendants, arcane vortex for high-Mana Ascendants.",
    affects:
      "Every archetype whose card is dominant in that stat. Change high-Mana Ascendant visuals and every Necromancer, Druid, and Seraph Ascendant with dominant Mana gets the new look.",
    changeWhen:
      "Ascendants across the board don't feel powerful enough, or a stat's visual grammar feels generic.",
    whereItLives:
      "powerSystem.ts (VISUAL_MOTIFS + SPECIALIZATION_SUFFIX)",
    example: (a) =>
      `The visual clauses appended when a ${a} is dominant in ATK/DEF/Mana/Tech at Foundation/Forged/Ascendant.`,
  },
  C: {
    id: 'C',
    name: 'Story Pillars & Elements',
    tagline: 'The player-authored generation facts',
    color: '#6ea36e',
    accentBg: 'rgba(110, 163, 110, 0.10)',
    accentBorder: 'rgba(110, 163, 110, 0.55)',
    controls:
      "The Guided Narrative Chain questions the player answers at forge time, and which of the 26 elements are available in which bucket (native/compatible/uncommon/rare). Player answers become IMMUTABLE generation facts.",
    affects:
      "Only NEW cards. Existing cards keep the answers they were forged with. Adding a Story Pillar option, changing an element bucket, or tightening the narrative-eligibility gate for a Rare element shows up in the next forge.",
    changeWhen:
      "The archetype needs more or better narrative variety. Options feel same-y. An element that should be native is stuck in Rare. A pillar question doesn't land for this archetype.",
    whereItLives:
      "data/storyPillars.ts (questions + tagged seed options) + data/elements.ts (buckets + bonds)",
    example: (a) =>
      `Adding a Story Pillar option for ${a}, moving an element between buckets, or adjusting the Rare narrative-eligibility tags.`,
  },
  D: {
    id: 'D',
    name: 'Meta-Prompt & Escalation',
    tagline: 'How Claude weaves it all together',
    color: '#b06a70',
    accentBg: 'rgba(176, 106, 112, 0.10)',
    accentBorder: 'rgba(176, 106, 112, 0.60)',
    controls:
      "How Claude Haiku composes A + B + C into the final image prompt. Includes locked-identity handling, lore-portrait alignment rules, and per-archetype escalation blocks (like the Lycanthrope wolf-anatomy mandate).",
    affects:
      "Every future generation of this archetype. Doesn't touch canon or pools — changes HOW they get combined and how strongly each clause weighs.",
    changeWhen:
      "Tier evolution looks wrong. Same character breaks across ranks. Lore mentions X but the portrait doesn't show it. Forged/Ascendant art looks like a totally different person. MOST FORGED/ASCENDANT PROBLEMS LIVE HERE.",
    whereItLives:
      "claudeApi.ts (the big template around lines 225–410)",
    example: (a) =>
      `Adding a Lycanthrope-style escalation block for ${a} — a hard mandate about what MUST be visible at Forged/Ascendant, placed early in the prompt so Leonardo can't down-weight it.`,
  },
};

export const LAYER_ORDER: ProposalLayer[] = ['A', 'B', 'C', 'D'];

// ─── Engine-first model (2026-07-21 image/lore decoupling) ────────────────
// Directors pick an ENGINE, then a plain-language AREA. The A/B/C/D layer is
// derived silently (areaToLayer) and kept internal for the approval console +
// regen-verify. See types/archetypeProposal.ts ProposalEngine / ProposalArea.

export interface EngineCopy {
  id: ProposalEngine;
  name: string;
  tagline: string;
  /** One-line "what this engine is" shown under the segmented control. */
  blurb: string;
  color: string;
}

export const ENGINES: Record<ProposalEngine, EngineCopy> = {
  image: {
    id: 'image',
    name: 'Image',
    tagline: 'What the portrait shows',
    blurb:
      'The deterministic portrait assembler — poses, props, element spectacle, and the Leonardo prompt. Changes here need a before/after regen.',
    color: '#7db3c9',
  },
  lore: {
    id: 'lore',
    name: 'Lore',
    tagline: 'What the words say',
    blurb:
      'The Claude call — canon, the pillars/elements a player picks, and the name/title/lore writing. No image needed to review.',
    color: '#d4a94a',
  },
};

export interface AreaCopy {
  id: ProposalArea;
  engine: ProposalEngine;
  /** Internal coarse layer this area maps onto (approval console / regen-verify). */
  layer: ProposalLayer;
  name: string;
  controls: string;
  whereItLives: string;
  example: (archetype: ArchetypeName) => string;
}

export const AREAS: Record<ProposalArea, AreaCopy> = {
  // ── Image engine ──
  look_escalation: {
    id: 'look_escalation',
    engine: 'image',
    layer: 'D',
    name: 'Look & escalation',
    controls:
      "The archetype's must-render rules and how the portrait escalates Foundation → Forged → Ascendant (per-archetype hooks like the Lycan anatomy lock or Mech mandatory-mech, plus the generic rank action/element ladders for archetypes with no hook).",
    whereItLives: 'services/portrait/archetypeHooks.ts + portraitAssembler.ts (buildPosePrefix / element scale ladders)',
    example: (a) => `A hard rule about what MUST be visible for ${a} at Ascendant, or fixing an escalation that goes the wrong direction.`,
  },
  props: {
    id: 'props',
    engine: 'image',
    layer: 'D',
    name: 'Props',
    controls:
      'The curated weapon / environment / pose / companion pools an archetype draws from. Weapon/environment/companion are locked at Foundation and carried across ranks; poses are rolled per rank.',
    whereItLives: 'data/archetypeWeapons.ts, archetypeEnvironments.ts, archetypePoses.ts, archetypeCompanions.ts',
    example: (a) => `Adding or retiring a weapon/environment/companion option for ${a}, or fixing a pose that reads wrong at a rank.`,
  },
  element_visuals: {
    id: 'element_visuals',
    engine: 'image',
    layer: 'D',
    name: 'Element visuals',
    controls:
      'The per-element visual language — colors, motion, lighting, atmosphere — that the element spectacle pulls from.',
    whereItLives: 'data/elementVisualLanguage.ts',
    example: () => `Retuning an element's colour palette or how its power reads in the frame.`,
  },
  global_rules: {
    id: 'global_rules',
    engine: 'image',
    layer: 'D',
    name: 'Global image rules',
    controls:
      'Cross-archetype assembler rules: segment priority order, style leads (Druid photoreal vs painterly), the modesty tail, the negative-prompt leads, the bare-chest gate, and fire-family handling.',
    whereItLives: 'services/portraitAssembler.ts',
    example: () => `Adjusting the modesty tail, a negative-prompt lead, or the bare-chest gate that applies across the set.`,
  },
  // ── Lore engine ──
  canon: {
    id: 'canon',
    engine: 'lore',
    layer: 'A',
    name: 'Canon',
    controls:
      "The archetype's Bible chapter (14 sections: identity, core fantasy, origins, virtues/taboos, symbols…) — the source of truth for who the archetype IS.",
    whereItLives: 'data/archetypeBible/<archetype>.ts + Character_Generation_Bible_Canonical_v1.md',
    example: (a) => `Rewriting ${a}'s identity, core fantasy, virtues/taboos, or symbol language.`,
  },
  pillars_elements: {
    id: 'pillars_elements',
    engine: 'lore',
    layer: 'C',
    name: 'Story Pillars & Elements',
    controls:
      'The Guided Narrative Chain questions a player answers at forge time, and which of the 26 elements sit in which bucket. Answers become immutable generation facts; changes show up on the NEXT forge only.',
    whereItLives: 'data/storyPillars.ts + data/elements.ts',
    example: (a) => `Adding a Story Pillar option for ${a}, moving an element between buckets, or adjusting the Rare eligibility gate.`,
  },
  lore_writing: {
    id: 'lore_writing',
    engine: 'lore',
    layer: 'D',
    name: 'Lore writing',
    controls:
      "How Claude writes the name / title / lore, and how it infers the Hidden Fate + storyMotifs the Image Engine later reads. Tone, phrasing, and the shape of the inferred identity.",
    whereItLives: 'services/claudeApi.ts (the generation prompt)',
    example: (a) => `Fixing a lore tone that's too flowery for ${a}, or a Hidden Fate inference that keeps landing wrong.`,
  },
};

/** Ordered areas for a given engine — drives the filing form's radio list. */
export const AREAS_BY_ENGINE: Record<ProposalEngine, ProposalArea[]> = {
  image: ['look_escalation', 'props', 'element_visuals', 'global_rules'],
  lore: ['canon', 'pillars_elements', 'lore_writing'],
};

/** Derive the internal coarse layer from the director-facing area. */
export function areaToLayer(area: ProposalArea): ProposalLayer {
  return AREAS[area].layer;
}

export interface FailureTypeCopy {
  id: ProposalFailureType;
  engine: ProposalEngine;
  label: string;
  description: string;
  /** Pre-selects (does not lock) an area when this failure is chosen. */
  hintArea: ProposalArea;
}

/**
 * Failure-type copy, engine-scoped. The form shows only the set matching the
 * chosen engine. hintArea pre-selects a sensible area the director can override.
 */
export const FAILURE_TYPES: FailureTypeCopy[] = [
  // ── Image engine ──
  {
    id: 'not_same_character',
    engine: 'image',
    label: "Doesn't look like the same character",
    description:
      'Face, body type, hair, or ethnicity drift between tiers. The Ascendant looks like a different person than the Foundation.',
    hintArea: 'look_escalation',
  },
  {
    id: 'evolution_wrong',
    engine: 'image',
    label: 'Evolution invisible or wrong',
    description:
      'Forged/Ascendant looks basically like Foundation, or the escalation goes the wrong direction (e.g., a Tech class getting more organic instead of more machine).',
    hintArea: 'look_escalation',
  },
  {
    id: 'wrong_archetype_vibe',
    engine: 'image',
    label: "Doesn't look like the archetype",
    description:
      "A Necromancer that reads as a generic mage. A Barbarian that could be any warrior. The archetype's visual signature is missing or watered down.",
    hintArea: 'props',
  },
  {
    id: 'lore_portrait_misaligned',
    engine: 'image',
    label: "Lore says X, portrait doesn't show it",
    description:
      'The flavor text names a specific rival, weapon, or event that never appears as a visual detail in the art.',
    hintArea: 'props',
  },
  {
    id: 'off_brand',
    engine: 'image',
    label: 'Beautiful but off-brand',
    description:
      "The art looks good but wrong for the game — anime cheesecake, cheap fantasy stock look, wrong palette, tone doesn't match the world.",
    hintArea: 'global_rules',
  },
  // ── Lore engine ──
  {
    id: 'lore_off_canon',
    engine: 'lore',
    label: 'Words drift from canon',
    description:
      "The name / title / lore contradicts the archetype's Bible chapter, or the writing reaches for a concept the archetype isn't.",
    hintArea: 'canon',
  },
  {
    id: 'pillar_options_weak',
    engine: 'lore',
    label: 'Pillar or element options feel wrong',
    description:
      "A Story Pillar question doesn't land for this archetype, the options feel same-y, or an element is stuck in the wrong bucket.",
    hintArea: 'pillars_elements',
  },
  {
    id: 'tone_or_motifs_off',
    engine: 'lore',
    label: 'Tone or inferred motifs are off',
    description:
      'The lore tone is wrong (too flowery, too flat), or the Hidden Fate / storyMotifs Claude infers keep landing wrong.',
    hintArea: 'lore_writing',
  },
];

/** Failure types for a given engine, in display order. */
export function failureTypesForEngine(engine: ProposalEngine): FailureTypeCopy[] {
  return FAILURE_TYPES.filter((f) => f.engine === engine);
}

/** Derive the engine for a legacy row that predates the engine column, from
 *  its coarse layer (A/C are lore-authored, B/D are art). Display-only. */
export function engineFromLayer(layer: ProposalLayer): ProposalEngine {
  return layer === 'A' || layer === 'C' ? 'lore' : 'image';
}

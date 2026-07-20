import type { ProposalLayer } from '../types/archetypeProposal';
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
      "What makes a Necromancer a Necromancer and not a Vampire. Core identity, defining visual motifs, and how the archetype looks at each tier.",
    affects:
      "Every future card of this archetype. Existing cards keep their old canon; new forges get the new one.",
    changeWhen:
      "The archetype concept itself is wrong. Lycanthrope going from 'cursed monster' to 'blessed by the Moon Goddess' was a Layer A change.",
    whereItLives:
      "archetypes.ts + card-engine-archetype-prompt-library.md",
    example: (a) =>
      `Rewriting ${a}'s identity, motifs, or rankProgression strings — the DNA every ${a} card is built from.`,
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
    name: 'Modifier Pools',
    tagline: 'The random flavor rolls',
    color: '#6ea36e',
    accentBg: 'rgba(110, 163, 110, 0.10)',
    accentBorder: 'rgba(110, 163, 110, 0.55)',
    controls:
      "The rolled surface variety per card. Setting, lighting, physique, lineage, demeanor, signature detail, and the archetype's class-trait pool.",
    affects:
      "Only NEW cards. Existing cards keep what they rolled. Adding 'Silver moon-sigil branded into shoulder' to the Lycanthrope class-trait pool means future Lycans can (rarely) roll it.",
    changeWhen:
      "The archetype needs more or better variety. Not enough distinctive class traits. Too many crypts in the setting pool. A specific evocative detail is missing.",
    whereItLives:
      "modifierPools.ts",
    example: (a) =>
      `Adding, removing, or rarity-adjusting entries in the ${a} class-trait pool, or in the shared setting / demeanor / lighting pools.`,
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

export interface FailureTypeCopy {
  id:
    | 'not_same_character'
    | 'wrong_archetype_vibe'
    | 'evolution_wrong'
    | 'lore_portrait_misaligned'
    | 'off_brand';
  label: string;
  description: string;
  hintLayer: ProposalLayer;
}

/**
 * Failure-type dropdown copy + which layer usually fixes it. The hintLayer
 * doesn't force the layer picker — it just pre-selects a sensible default
 * that the lore director can override.
 */
export const FAILURE_TYPES: FailureTypeCopy[] = [
  {
    id: 'not_same_character',
    label: "Doesn't look like the same character",
    description:
      'Face, body type, hair, or ethnicity drift between tiers. The Ascendant looks like a different person than the Foundation.',
    hintLayer: 'D',
  },
  {
    id: 'wrong_archetype_vibe',
    label: "Doesn't feel like the archetype",
    description:
      "A Necromancer that reads as a generic mage. A Barbarian that could be any warrior. The archetype's signature is missing or watered down.",
    hintLayer: 'A',
  },
  {
    id: 'evolution_wrong',
    label: 'Evolution invisible or wrong',
    description:
      "Forged/Ascendant looks basically like Foundation, or the escalation goes the wrong direction (e.g., a Tech class getting more organic instead of more machine).",
    hintLayer: 'D',
  },
  {
    id: 'lore_portrait_misaligned',
    label: "Lore says X, portrait doesn't show it",
    description:
      'The flavor text mentions a specific rival, weapon, or event that never appears as a visual detail in the art.',
    hintLayer: 'D',
  },
  {
    id: 'off_brand',
    label: 'Beautiful but off-brand',
    description:
      "The art looks good but wrong for the game — anime cheesecake, cheap fantasy stock look, wrong palette, tone doesn't match the world.",
    hintLayer: 'A',
  },
];

import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Lycanthrope — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 * Bible reframes Lycans as guardians of the Moon Goddess, NOT cursed monsters.
 * Prestige (Alpha) is emergent from narrative, never player-selected.
 */
export const LYCANTHROPE_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Lycanthrope',
  identityThrough: 'Duality',
  coreFantasy: 'Join instinct, pack duty, and lunar faith',

  selectionScreen: {
    tagline: 'Guardians marked by the Moon Goddess who walk between instinct and duty.',
    body: 'The first Lycans were chosen guardians, not cursed monsters.',
    pullQuote:
      'The strongest guardian knows when to unleash the beast — and when to remain human.',
  },

  coreFantasyPromise: {
    promise:
      'To carry the strength of the beast without losing the person beneath it.',
    emotionalPillars: ['Duality', 'Duty', 'Instinct', 'Loyalty', 'Self-Control'],
  },

  origins:
    'The Moon Goddess selected guardians able to protect the boundary between civilization and the wild. Packs developed traditions of loyalty, responsibility, lunar faith, and restraint. The Moon chooses guardians, not monsters.',

  cultureAndDailyLife:
    'Pack life emphasizes cooperation. Hunters, healers, scouts, storytellers, artisans, guardians, and caretakers share survival. Lunar festivals center service, storytelling, and communal rites rather than dominance.',

  beliefs: {
    virtues: ['loyalty', 'duty', 'courage', 'self-control', 'trust', 'service'],
    taboos: [
      'turning on the pack',
      'abandoning dependents',
      'selfish cruelty',
      'power without responsibility',
      'dominance for its own sake',
    ],
    fears: [
      'losing control',
      'failing the pack',
      'becoming a feared monster',
      'dishonoring the Moon Goddess',
      'isolation',
    ],
  },

  internalDiversity: {
    groups: [
      'Wardens',
      'Hunters',
      'Watchers',
      'Pilgrims',
      'Moonkeepers',
      'Trailblazers',
    ],
  },

  visualDNA: {
    recognitionCues:
      'Player-selected Moon Goddess symbol, transformation-ready clothing, pack markings, role-specific tools, controlled instinct, communal identity, and human/bestial continuity.',
    avoid:
      'Muscular werewolf defaults, torn trousers, constant snarling, Alpha imagery, chains, solitary-monster framing.',
  },

  symbolAndMaterial: {
    materials:
      'Silver, dark iron, reinforced cloth, leather, wool, moonstone, wood, red thread, blue-gray pigment.',
    symbols:
      'Crescents, lunar phases, paired human/beast forms, pack knots, role emblems, trail marks, communal symbols.',
  },

  rankEvolution: {
    Foundation: 'Learns to recognize and survive transformation.',
    Forged: 'Performs a trusted pack role while integrating instinct and judgment.',
    Ascendant:
      'Becomes a symbol of lunar responsibility; prestige such as Alpha may emerge only when the narrative supports it.',
    continuityNote:
      'Progression must not equate rank with size, muscle, aggression, or dominance.',
  },

  futureDesignSpace:
    'Future additions may introduce new packs, moon-phase traditions, historical events, and Story Pillar answers. New content must preserve the guardian-of-the-Moon-Goddess framing and reject "monster" defaults.',

  claudeGuidance: {
    generationPriorities: [
      'Pack role',
      'Moon Goddess symbol',
      'Controlled duality',
      'Communal trust',
      'Transformation continuity',
      'Service rather than dominance',
    ],
    avoid: [
      'Alpha as selectable',
      'Huge muscular werewolf default',
      'Chains',
      'Constant snarling',
      'Solitary monster framing',
      'Moon effects replacing culture',
    ],
    recognitionChecklist: [
      'Is the Moon Goddess bond visible?',
      'Can the pack role be inferred?',
      'Is trust reflected in the design?',
      'Do human and beast identities remain connected?',
      'Does the element fit lunar and pack culture?',
      'Would the Lycan remain recognizable without a full transformation?',
    ],
  },

  approvedPrestigeRoles: ['Alpha', 'Moonkeeper Prime', 'Pack Elder', 'Warden of the Boundary'],
};

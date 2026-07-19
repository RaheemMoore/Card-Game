import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Vampire — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const VAMPIRE_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Vampire',
  identityThrough: 'Hunger',
  coreFantasy: 'Preserve identity through restraint',

  selectionScreen: {
    tagline:
      'Immortals who struggle to preserve their humanity while enduring an endless hunger.',
    body: 'Every Vampire carries the person they were and the hunger that follows them.',
    pullQuote: 'The greatest hunger is not always for blood.',
  },

  coreFantasyPromise: {
    promise:
      'To endure eternal hunger without surrendering the person you refuse to stop being.',
    emotionalPillars: ['Temptation', 'Restraint', 'Identity', 'Loneliness', 'Redemption'],
  },

  origins:
    'Vampires formed lineages and Houses rather than a single nation. Houses interpret immortality as responsibility, curse, preservation, ambition, or punishment. Eternity magnifies every choice.',

  cultureAndDailyLife:
    'Vampires manage identity, hunger, relationships, eras, and the passage of time. Many preserve art, music, places, or routines that anchor them to a mortal self.',

  beliefs: {
    virtues: [
      'restraint',
      'patience',
      'loyalty',
      'self-awareness',
      'determination',
      'preservation',
    ],
    taboos: [
      'feeding without conscience',
      'betrayal',
      'broken promises',
      'wasting immortal life',
      'surrendering entirely to hunger',
    ],
    fears: [
      'monstrosity',
      'forgetting the former self',
      'loneliness',
      'endless hunger',
      'purposeless eternity',
    ],
  },

  internalDiversity: {
    groups: [
      'House of Memory',
      'House of Discipline',
      'House of Dominion',
      'House of Preservation',
      'House of Redemption',
      'House of Shadows',
    ],
  },

  visualDNA: {
    recognitionCues:
      'Preserved objects across eras, controlled presentation, subtle hunger, personal relics, restraint rituals, and evidence of time.',
    avoid:
      'Aristocracy as default, pale-skin requirements, seductive posing, red-and-black-only palettes, capes, castles, universal youth or beauty.',
  },

  symbolAndMaterial: {
    materials:
      'Era-specific fabric, aged silver, dark glass, red thread, blackened metal, ceramic, wax, wood, personal relics.',
    symbols:
      'Sealed mouths, interrupted bloodlines, closed circles, thorns, hourglasses, moons, locked vessels, mirrors, broken reflections.',
  },

  rankEvolution: {
    Foundation: 'Newly understands the hunger and relies on external restraint.',
    Forged:
      'Has built rituals, relationships, or convictions strong enough to survive temptation.',
    Ascendant:
      'Defines immortality on their own terms and becomes a stabilizing or terrifying force without losing narrative complexity.',
    continuityNote:
      'Progression must not automatically increase beauty, wealth, aristocratic styling, or predatory display.',
  },

  futureDesignSpace:
    'Future additions may introduce new Houses, historical eras, mortal anchors, and Story Pillar answers. New content must resist "sexy vampire" defaults and preserve the tension between humanity and hunger.',

  claudeGuidance: {
    generationPriorities: [
      'Hunger and restraint',
      'Personal mortal anchor',
      'Time and preservation',
      'Moral boundary',
      'House philosophy',
      'Identity beyond predation',
    ],
    avoid: [
      'Aristocrat default',
      'Pale skin requirement',
      'Sexualization',
      'Capes and castles',
      'Blood as sole personality',
      'Beauty equated with rank',
    ],
    recognitionChecklist: [
      'Is the hunger specific?',
      'Can the restraint be seen or inferred?',
      'Is the connection to the living present?',
      'Does time appear through meaningful objects?',
      'Does the element reinforce hunger or restraint?',
      'Would the character remain a Vampire without fangs or red effects?',
    ],
  },

  approvedPrestigeRoles: ['House Elder', 'Blood Regent', 'Keeper of the Long Vigil'],
};

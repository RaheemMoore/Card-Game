import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Vampire — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const VAMPIRE_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Vampire',
  identityThrough: 'Hunger',
  coreFantasy: 'Rise from feral hunger into a self you author — without losing the person underneath',

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
      'Pale-skin defaults or any narrowing of ancestry/skin-tone diversity; universal youth or beauty as a rank reward; seductive or bare-skin posing (M5.7 modesty); daylight, direct sun, or noon settings; blood as sole personality. Capes, high collars, castle halls, blood-red/black palettes, and aristocratic sovereignty are PERMITTED at Forged/Ascendant when the narrative earns them.',
  },

  symbolAndMaterial: {
    materials:
      'Era-specific fabric, aged silver, dark glass, red thread, blackened metal, ceramic, wax, wood, personal relics.',
    symbols:
      'Sealed mouths, interrupted bloodlines, closed circles, thorns, hourglasses, moons, locked vessels, mirrors, broken reflections.',
  },

  rankEvolution: {
    Foundation:
      'Newly turned and closest to the beast — the hunger is loudest here. Roughly a third begin as a feral, half-sentient predator (a hunched bat-form or worse); the rest still pass for the mortal they were, barely holding the self together.',
    Forged:
      'The self has returned and steadied — a composed, humanoid vampire who has built rituals, relationships, or convictions strong enough to command the hunger instead of being commanded by it.',
    Ascendant:
      'A sentient blood-sovereign who defines immortality on their own terms — at once the most powerful AND the most self-possessed they have ever been, a stabilizing or terrifying force without losing narrative complexity.',
    continuityNote:
      'SANCTIONED RANK-CONTINUITY EXCEPTION (Bible §Rank continuity, Lycanthrope-class): the Vampire FORM escalates across ranks — feral beast → humanoid → blood-sovereign — but the person underneath is preserved. Sex, ancestry and skin tone, body type, disability or physical condition, and defining scars carry across every form and must NOT drift. Progression must not make the character younger, thinner, healthier, or more conventionally beautiful as a reward; power and sovereignty are earned by the narrative, not handed out by rank.',
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
      'Aristocracy as a default for EVERY card (must be earned by Forged/Ascendant)',
      'Pale skin requirement',
      'Sexualization',
      'Daylight or sunlit settings',
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

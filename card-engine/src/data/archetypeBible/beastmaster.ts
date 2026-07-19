import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Beastmaster — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const BEASTMASTER_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Beastmaster',
  identityThrough: 'Relationship',
  coreFantasy: "Earn a companion's trust and act as partners",

  selectionScreen: {
    tagline:
      'Guardians who forge lifelong bonds with creatures that choose to stand beside them.',
    body:
      'The companion is not a pet, weapon, or servant. The strongest bonds are built through mutual respect, patience, and shared hardship.',
    pullQuote: 'The greatest companions are never owned — only trusted.',
  },

  coreFantasyPromise: {
    promise:
      'To build an unbreakable partnership with a companion whose trust must be earned rather than commanded.',
    emotionalPillars: ['Trust', 'Loyalty', 'Partnership', 'Responsibility', 'Mutual Respect'],
    closer: 'The strongest bond is one both sides choose to protect.',
  },

  origins:
    'Beast bonds began wherever people survived by understanding the creatures sharing their world. Rare mutual bonds became respected traditions centered on protection, exploration, rescue, and stewardship. Trust cannot be commanded. It must be freely given.',

  cultureAndDailyLife:
    'Travel, meals, shelter, work, training, and healing are planned for both partners. Young Beastmasters learn observation before command. Every great bond begins with trust, not obedience.',

  beliefs: {
    virtues: ['loyalty', 'patience', 'empathy', 'responsibility', 'trust', 'cooperation'],
    taboos: [
      'abandoning a companion',
      'breaking trust for personal gain',
      'cruelty',
      'disposable treatment',
      'hunting without purpose',
    ],
    fears: [
      'betrayal',
      'loss',
      'isolation',
      'failure of protection',
      'trust that cannot be rebuilt',
    ],
    closer: 'Every partnership carries two promises, not one.',
  },

  internalDiversity: {
    groups: ['Wardens', 'Rangers', 'Keepers', 'Explorers', 'Guardians', 'Trackers'],
    closer: 'The bond matters more than the method.',
  },

  visualDNA: {
    recognitionCues:
      'The Beastmaster and companion read as one relationship through shared wear, adapted equipment, mutual awareness, signs of care, biome-specific clothing, and visible agency from both partners.',
    avoid:
      'Random wolves, cages, leashes, domination poses, identical armor, treating the companion as background.',
    closer: 'A Beastmaster should look incomplete without their companion.',
  },

  symbolAndMaterial: {
    materials:
      'Leather or hide when appropriate, woven cord, wood, shed materials, cloth, metal fittings, resin, wax, stone, mineral beads.',
    symbols:
      'Paired marks, mirrored shapes, tracks, interlocking forms, migration lines, two-part tokens, knots completed by two ends.',
    closer:
      'A Beastmaster object should reveal how two lives learned to move together.',
  },

  rankEvolution: {
    Foundation: 'The bond exists but communication and trust are still developing.',
    Forged: 'Partners anticipate one another and share responsibility under pressure.',
    Ascendant:
      'The partnership becomes legendary because neither identity is diminished by the other.',
    continuityNote:
      'Progression should deepen reciprocity, coordinated movement, and shared history — not simply enlarge the animal or add armor.',
  },

  futureDesignSpace:
    'Future additions may introduce new orders, biomes, companion species, ritual bonds, historical events, and Story Pillar answers. New content must center reciprocity rather than dominion.',

  claudeGuidance: {
    generationPriorities: [
      'Reciprocal bond',
      'Companion agency',
      'Biome specificity',
      'Shared history',
      'Care and cooperation',
      'Two distinct identities',
    ],
    avoid: [
      'Animal ownership fantasy',
      'Domination imagery',
      'Random wolf defaults',
      'Companion as prop',
      'Matching armor by default',
      'Beastmaster replacing Druid identity',
    ],
    recognitionChecklist: [
      'Does the companion visibly choose the relationship?',
      'Is the bond legible in posture and composition?',
      'Does the setting fit where paths crossed?',
      'Do both partners retain distinct identities?',
      'Does the element affect both coherently?',
      'Would the bond remain clear without effects?',
    ],
  },

  approvedPrestigeRoles: ['Warden Prime', 'Elder Ranger', 'Bond-Speaker'],
};

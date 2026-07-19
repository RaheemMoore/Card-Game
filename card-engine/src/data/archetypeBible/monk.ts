import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Monk — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const MONK_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Monk',
  identityThrough: 'Discipline',
  coreFantasy: 'Transform oneself through lifelong practice',

  selectionScreen: {
    tagline:
      'Masters of discipline who transform body, mind, and spirit through lifelong devotion.',
    body:
      'Monks believe true strength is earned through discipline, reflection, and commitment. Their paths may preserve healing, scholarship, craftsmanship, service, ritual, movement, martial practice, or spiritual teaching.',
    pullQuote: 'Every disciplined life becomes a lesson for those who follow.',
  },

  coreFantasyPromise: {
    promise:
      'To become someone whose greatest strength is earned through discipline rather than inherited power.',
    emotionalPillars: ['Discipline', 'Balance', 'Wisdom', 'Patience', 'Self-Mastery'],
    closer: 'Master yourself, and nothing else can truly control you.',
  },

  origins:
    'Monastic traditions began as places of preservation during war, disaster, and cultural collapse. Different orders protected medicine, philosophy, martial traditions, astronomy, engineering, diplomacy, agriculture, music, and spiritual teachings. Knowledge survives because someone chooses to practice it every day.',

  cultureAndDailyLife:
    'Monastic life revolves around routine, intention, teaching, and continual improvement. Preparing food, tending gardens, copying manuscripts, repairing clothing, healing, and practicing a discipline are all part of the path. A disciplined life is built from countless ordinary moments.',

  beliefs: {
    virtues: [
      'discipline',
      'patience',
      'humility',
      'compassion',
      'self-control',
      'lifelong learning',
    ],
    taboos: [
      'mastery for personal glory',
      'abandoning sincere students',
      'reckless use of knowledge',
      'pretending unfinished mastery is complete',
    ],
    fears: [
      'losing oneself',
      'wasting potential',
      'passing on harmful teachings',
      'arrogance',
      'forgetting why the journey began',
    ],
    closer: 'The greatest lesson is knowing there is always another lesson to learn.',
  },

  internalDiversity: {
    groups: ['Keepers', 'Healers', 'Wanderers', 'Guardians', 'Artisans', 'Contemplatives'],
    closer: 'Many paths exist. All require discipline.',
  },

  visualDNA: {
    recognitionCues:
      'Controlled posture, economical movement, repeated wear, practical clothing, training tools, carefully repaired items, and visible signs of a specific discipline.',
    avoid:
      'Lean-body requirements, shaved-head defaults, generic East Asian clothing, constant meditation poses, glowing fists.',
    closer:
      'A Monk should look like someone whose daily practice changed how they inhabit the world.',
  },

  symbolAndMaterial: {
    materials:
      'Worn cloth, repaired fabric, wood, bronze, clay, stone, paper, ink, thread, cord.',
    symbols:
      'Open circles, balanced lines, knots, breath marks, beads, seals, bells, practice tallies, incomplete geometry.',
    closer:
      "A Monk's belongings should look changed by repetition, not decorated to imitate wisdom.",
  },

  rankEvolution: {
    Foundation: 'Follows a discipline and depends heavily on instruction.',
    Forged: 'Has internalized the discipline and adapts it under pressure.',
    Ascendant:
      'Becomes a living interpretation of the discipline and may teach a new path.',
    continuityNote:
      'Progression should deepen intentionality, authority, and practiced ease — not automatically add muscle, youth, ornament, or aura.',
  },

  futureDesignSpace:
    'Future additions may introduce new orders, disciplines, mentorships, relics, historical events, and Story Pillar answers. New content must deepen practice-as-identity rather than return to generic martial-artist stereotypes.',

  claudeGuidance: {
    generationPriorities: [
      'Specific discipline',
      'Intentional posture',
      'Practice made visible',
      'Internal conflict',
      'Vow-driven symbolism',
      'Continuity across ranks',
    ],
    avoid: [
      'Generic martial artist',
      'Body-type requirements',
      'Cultural pastiche',
      'Glow as mastery',
      'Combat as the only discipline',
      'Ornament replacing practice',
    ],
    recognitionChecklist: [
      'Is the discipline visible without explanation?',
      "Does the character's body remain their own?",
      'Do objects show repetition and use?',
      'Does the element appear integrated or mastered?',
      'Is the vow reflected subtly?',
      'Would the character remain a Monk without effects?',
    ],
  },

  approvedPrestigeRoles: ['Grandmaster', 'Abbot', 'Elder Teacher', 'Master of the Path'],
};

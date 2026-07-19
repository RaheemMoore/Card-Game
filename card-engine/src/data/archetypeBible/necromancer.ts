import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Necromancer — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const NECROMANCER_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Necromancer',
  identityThrough: 'Death',
  coreFantasy: 'Seek truth and memory beyond mortality',

  selectionScreen: {
    tagline:
      'Seekers who walk beside death to preserve memory, uncover truth, and confront what others fear.',
    body:
      'Necromancers are defined by questions they refuse to abandon, not by corpse command.',
    pullQuote: 'Every soul carries a story that deserves to be remembered.',
  },

  coreFantasyPromise: {
    promise:
      'To walk beside death without allowing it to consume your humanity.',
    emotionalPillars: ['Curiosity', 'Consequence', 'Remembrance', 'Sacrifice', 'Acceptance'],
  },

  origins:
    'Necromancy grew from grief, medicine, history, justice, and the desire to understand mortality. Schools range from compassionate spirit guidance to forbidden research. Every ending leaves behind another question.',

  cultureAndDailyLife:
    'Necromancer halls may be archives, observatories, memorials, laboratories, libraries, courts, or resting places. Many preserve family records, lost histories, epidemic accounts, and the voices of unsettled spirits.',

  beliefs: {
    virtues: [
      'curiosity',
      'honesty',
      'remembrance',
      'responsibility',
      'perseverance',
      'acceptance',
    ],
    taboos: [
      'erasing the dead',
      'disturbance for amusement',
      'exploiting grief',
      'ignoring consequences',
      'immortality without reflection',
    ],
    fears: [
      'meaningless death',
      'forgotten civilizations',
      'lost knowledge',
      'numbness to mortality',
      'unanswered questions',
    ],
  },

  internalDiversity: {
    groups: ['Historians', 'Guides', 'Researchers', 'Judges', 'Archivists', 'Caretakers'],
    closer: 'Every school asks different questions of the same mystery.',
  },

  visualDNA: {
    recognitionCues:
      'Memorial objects, names, ledgers, reliquaries, spirit vessels, mourning cloth, funerary tools, scholarship, ritual, caretaking, investigation, and a visible relationship with the following spirit.',
    avoid:
      'Skeletal armor, skull-covered clothing, evil smiles, green smoke, corpse decoration, villain defaults.',
  },

  symbolAndMaterial: {
    materials:
      'Aged paper, wax, darkened silver, bone used with purpose, stone, glass, mourning cloth, iron, ash, salt.',
    symbols:
      'Names, broken circles, open doors, veils, empty chairs, unfinished lines, dates, connecting thread.',
  },

  rankEvolution: {
    Foundation: 'Has crossed the boundary enough to hear what others cannot.',
    Forged: 'Carries the consequences of knowledge and can distinguish truth from obsession.',
    Ascendant:
      'Becomes an authority on death whose work changes how the living remember and grieve.',
    continuityNote:
      'Progression should deepen consequence, responsibility, and relationship with the dead — not merely increase corpses or skulls.',
  },

  futureDesignSpace:
    'Future additions may introduce new schools, following spirits, historical grief-events, and Story Pillar answers. New content must center memory, truth, and consequence rather than villainy or spectacle.',

  claudeGuidance: {
    generationPriorities: [
      'Death as memory and consequence',
      'Specific following spirit',
      'Ethical position',
      'Research or caretaking role',
      'Visible records',
      'Cost of knowledge',
    ],
    avoid: [
      'Automatic villainy',
      'Skull overload',
      'Corpse decoration',
      'Green smoke shorthand',
      'Power without consequence',
      'Necromancer reduced to summoner',
    ],
    recognitionChecklist: [
      'Is the following spirit narratively present?',
      "Can the Necromancer's purpose be inferred?",
      'Do objects preserve names or evidence?',
      'Is the price they accept reflected?',
      'Does the element alter the relationship with death?',
      'Would the character remain recognizable without corpses or effects?',
    ],
  },

  approvedPrestigeRoles: ['High Archivist', 'Speaker for the Dead', 'Master Judge'],
};

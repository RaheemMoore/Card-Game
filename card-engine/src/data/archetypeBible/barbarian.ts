import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Barbarian — Bible v1.0 canonical archetype template.
 * Source: /Character_Generation_Bible_Canonical_v1.md — Barbarian chapter.
 * All prose is Bible-verbatim; edits require Raheem approval + Lore Director review.
 */
export const BARBARIAN_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Barbarian',
  identityThrough: 'Inheritance',
  coreFantasy: 'Carry a living legacy through hardship',

  selectionScreen: {
    tagline: 'Warriors of the old clans who turn hardship into strength.',
    body:
      'Barbarians are heirs of old clan cultures shaped by harsh lands, long memory, and traditions built to survive catastrophe. Every warrior inherits more than a weapon: names, debts, victories, losses, responsibilities, and stories that began before their birth. Their strength may appear as endurance, courage, craftsmanship, memory, leadership, adaptability, pain tolerance, or the will to protect others.',
    pullQuote: 'Every Barbarian inherits a story. Their life determines what will be added to it.',
  },

  coreFantasyPromise: {
    promise:
      'To embody a person forged by hardship who carries the strength, memory, and unfinished story of their people.',
    emotionalPillars: ['Resilience', 'Belonging', 'Burden', 'Conviction', 'Legacy'],
    closer:
      'Endure hardship, carry a living legacy, and decide what your name will mean to those who come after you.',
  },

  origins:
    'There is no original Barbarian race, kingdom, or ethnicity. Barbarian cultures arose independently wherever survival could not be entrusted to distant rulers or institutions that might collapse. They preserved civilization through people, relics, songs, scars, repeated stories, and communal ritual. Barbarian cultures are portable civilizations built to survive the collapse of kingdoms.',

  cultureAndDailyLife:
    'Daily life centers on shared responsibility, portable tradition, practical craft, public memory, and earned belonging. Combat is only one contribution. Healers, builders, cooks, navigators, storytellers, caretakers, and craftspeople may hold equal influence. A clan survives because everyone carries part of its weight.',

  beliefs: {
    virtues: [
      'endurance',
      'loyalty without blind obedience',
      'courage',
      'contribution',
      'truthful remembrance',
      'hospitality with boundaries',
    ],
    taboos: [
      'abandoning the helpless without necessity',
      'erasing a name',
      'falsifying communal history',
      'breaking witnessed oaths',
      "stealing another person's earned relic",
      'wasting essential resources',
      'harming a protected guest',
    ],
    fears: ['erasure'],
    closer: 'Nothing entrusted to you should disappear without a fight.',
  },

  internalDiversity: {
    groups: [
      'Keepers — the past must be preserved',
      'Forgers — the past exists to build something better',
      'Wanderers — people matter more than places',
      'Guardians — some places must never fall',
    ],
    closer: 'These are broad traditions, not races, governments, or uniforms.',
  },

  visualDNA: {
    recognitionCues:
      'Inherited objects, practical silhouettes, visible repair, regional adaptation, layered materials, role-specific tools, and evidence of duty, mourning, travel, craft, and survival.',
    avoid:
      'Exposed muscle, roaring poses, fur armor, giant axes, bodybuilder anatomy as defaults.',
    closer:
      'A Barbarian should look like a person carrying a lived history, not a costume carrying a stereotype.',
  },

  symbolAndMaterial: {
    materials:
      'Blackened iron (endurance, protection, inherited burden). Aged silver (memory, witness, mourning, authority). Blood-red thread, cloth, enamel, or paint (sacrifice, kinship, oath, vengeance). Leather (adaptation, travel, repair). Wood (home, ancestry, regional craft). Bone, horn, tooth, shell (remembrance and respectful use). Stone (place, burial, permanence, guardianship). Woven material (communal labor and portable record).',
    symbols:
      'Clan sigils, oath knots, name-marks, mourning cloth patterns, regional weaving, family beads, ancestor totems, portable altars.',
    closer: 'Repair is not a sign of poverty; it is visible continuity.',
  },

  rankEvolution: {
    Foundation: 'Carries a legacy not yet fully understood.',
    Forged: 'Has been changed by trials and earned greater trust.',
    Ascendant:
      'Becomes a living reference point who changes what the legacy will become.',
    continuityNote:
      'Foundation carries the legacy. Forged is changed by the legacy. Ascendant changes what the legacy will become. Progression preserves sex, age, body type, ancestry, disability, physical condition, and defining scars.',
  },

  futureDesignSpace:
    'Future additions may introduce new orders, factions, regions, roles, relics, historical events, Story Pillar answers, elemental traditions, bosses, Codex entries, and visual variants. New content must deepen the Barbarian identity rather than return to generic Viking or fantasy-berserker stereotypes.',

  claudeGuidance: {
    generationPriorities: [
      'Lived history',
      'Inherited responsibility',
      'Meaningful repair',
      'Cultural specificity',
      'Practical equipment',
      'Continuity across ranks',
    ],
    avoid: [
      'Generic rage',
      'Random fur',
      'Bodybuilder anatomy',
      'Oversized axes by default',
      'Generic Viking imagery',
      'Glow replacing story',
    ],
    recognitionChecklist: [
      'Does the character visibly carry history?',
      'Can their role or responsibility be inferred?',
      'Do materials and equipment tell a story?',
      'Does the element reinforce rather than replace the archetype?',
      'Would they remain recognizable without magical effects?',
      'Are age, body type, disability, and condition preserved?',
    ],
  },

  approvedPrestigeRoles: ['Clan Chief', 'Keeper of Names', 'Warband Leader', 'Elder'],
};

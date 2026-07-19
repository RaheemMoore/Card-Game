import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Druid — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const DRUID_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Druid',
  identityThrough: 'Stewardship',
  coreFantasy: 'Protect the cycles that allow life to endure',

  selectionScreen: {
    tagline:
      'Stewards of the living world who protect the balance between growth, decay, and renewal.',
    body:
      'Druids listen to nature rather than command it. They protect cycles, restore damaged lands, guide migrations, and preserve ecosystems.',
    pullQuote:
      'Nature flourishes when every part of its cycle is allowed to endure.',
  },

  coreFantasyPromise: {
    promise:
      'To become a guardian of the living world whose purpose is preserving the balance that allows all life to endure.',
    emotionalPillars: ['Harmony', 'Stewardship', 'Balance', 'Renewal', 'Reverence'],
  },

  origins:
    'Druidic traditions emerged wherever people recognized that civilization depends on healthy natural systems. Independent circles formed around forests, coasts, deserts, tundra, mountains, rivers, storms, and migration routes. Every living thing depends upon countless others that may never be seen.',

  cultureAndDailyLife:
    'Druids follow migrations, seasons, tides, rainfall, flowering, and ecological change. Their work includes restoration, observation, medicine, recordkeeping, and teaching. To understand nature is to understand change.',

  beliefs: {
    virtues: ['stewardship', 'patience', 'observation', 'adaptability', 'respect', 'balance'],
    taboos: [
      'needless destruction',
      'hoarding resources',
      'disrupting cycles for selfish gain',
      'taking without restoring',
      'domination of nature',
    ],
    fears: [
      'ecological collapse',
      'endless imbalance',
      'extinction',
      'lost knowledge',
      'renewal becoming impossible',
    ],
  },

  internalDiversity: {
    groups: [
      'Forest circles',
      'River circles',
      'Mountain circles',
      'Storm circles',
      'Tide circles',
      'Renewal circles',
      'Season circles',
      'Fungal circles',
      'Desert circles',
    ],
    closer: 'Every circle guards one part of a greater whole.',
  },

  visualDNA: {
    recognitionCues:
      'Biome-specific materials, climate adaptation, restoration tools, medicine, observation, evidence of growth and decay, and a clear relationship to the part of nature that calls.',
    avoid:
      'Universal antlers, green robes, leaf costumes, forest-only settings, overlap with Beastmaster.',
  },

  symbolAndMaterial: {
    materials:
      'Living fibers, reeds, bark, wood, stone, clay, shells, seeds, fungi, glass vessels, soil pigments.',
    symbols:
      'Spirals, branching networks, seasonal circles, seed forms, river lines, root patterns, growth rings.',
    closer: "A Druid's materials should identify the living system they understand.",
  },

  rankEvolution: {
    Foundation: 'Learns to hear one part of the natural world.',
    Forged: 'Accepts responsibility for complex cycles and visible damage.',
    Ascendant:
      'Becomes a steward whose decisions reshape how communities coexist with nature.',
    continuityNote:
      'Progression should broaden understanding and responsibility, not merely add vines, antlers, or larger magical effects.',
  },

  futureDesignSpace:
    'Future additions may introduce new circles, biomes, restoration projects, historical events, and Story Pillar answers. New content must deepen stewardship rather than default to generic nature-mage aesthetics.',

  claudeGuidance: {
    generationPriorities: [
      'Specific ecosystem',
      'Stewardship',
      'Cycles of growth and decay',
      'Ecological work',
      'Climate adaptation',
      'Consequences of imbalance',
    ],
    avoid: [
      'Generic nature mage',
      'Forest-only identity',
      'Leaves as shorthand',
      'Beastmaster overlap',
      'Nature as decoration',
      'Endless green palette',
    ],
    recognitionChecklist: [
      'Can the protected natural system be identified?',
      'Does the character look like a steward rather than a conqueror?',
      'Are growth and decay both acknowledged?',
      'Do materials belong to the biome?',
      'Does the element behave as a natural force?',
      'Would the Druid remain recognizable without effects?',
    ],
  },

  approvedPrestigeRoles: ['Archdruid', 'Circle Keeper', 'Season-Speaker'],
};

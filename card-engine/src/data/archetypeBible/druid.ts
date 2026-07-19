import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Druid — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const DRUID_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Druid',
  identityThrough: 'Being of the forest',
  coreFantasy:
    'You are born of the forest and always return to it — you take human form for fun and for work, but your true body is root, wood, and canopy',

  selectionScreen: {
    tagline:
      'Guardians of the forest who wear human form as a convenience. They meld into trees, control wood and root, and always return to the grove.',
    body:
      'A Druid is not a human who studies nature. A Druid IS nature — born of the forest, always returning to it. The human shape is a costume they put on for travel, teaching, or negotiation. Their real body is old wood, deep roots, and the canopy overhead.',
    pullQuote:
      'The forest is not something we protect — it is what we are pretending not to be.',
  },

  coreFantasyPromise: {
    promise:
      'To become one with the living forest — to walk among mortals in a human shape when it suits, and to melt back into wood, root, and canopy when the forest calls you home.',
    emotionalPillars: ['Rooted-ness', 'Kinship-with-the-grove', 'Renewal', 'Guardianship', 'Reverence'],
  },

  origins:
    'The first Druids were the forests themselves learning to walk. They put on human bodies to move faster, speak with mortals, and defend their groves from those who would raze them. Independent groves formed wherever old growth remembered its own name — deep woods, mangroves, high-alpine pine, mist forests, kelp forests, coral gardens, mycorrhizal networks under prairie. Every Druid can name the grove that dreamed them into shape.',

  cultureAndDailyLife:
    'Druids follow the rhythms of the grove that dreamed them — seasons, sap-flow, canopy-light, root-conversation, seedfall. Their work is guardianship: keeping their forest whole, negotiating with mortals who live near it, punishing those who harm it. They MELD back into their grove for rest, weeks or years at a time, taking human form again only when the grove asks them to walk the outside world.',

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
      'Biome-specific materials, evidence the human form is a costume (bark showing at wrists or neck, moss on the skin, root-vein instead of blood-vein, leaves in the hair mid-motion, eyes the color of the grove they came from). At Foundation the human form is convincing but tells slip. At Forged the wood is visibly reclaiming the body. At Ascendant the character is mid-melding-into-tree or fully returned to root-and-canopy form.',
    avoid:
      'Universal antlers, green robes as costume-shorthand, leaf-cape stereotypes, "human wizard in nature colors," overlap with Beastmaster (Beastmasters bond with beasts; Druids ARE the forest).',
  },

  symbolAndMaterial: {
    materials:
      'Living fibers, reeds, bark, wood, stone, clay, shells, seeds, fungi, glass vessels, soil pigments.',
    symbols:
      'Spirals, branching networks, seasonal circles, seed forms, river lines, root patterns, growth rings.',
    closer: "A Druid's materials should identify the living system they understand.",
  },

  rankEvolution: {
    Foundation:
      'The human form is convincing — a Druid walking the outside world as a mortal would. But tells slip through: leaves stuck in the hair, bark at the wrists, root-veins glimpsed under the skin. They still speak with wood and root but they mostly wear the person-shape.',
    Forged:
      'The grove is reclaiming them. Wood visibly grows on the arms and shoulders, moss on the neck, roots trailing at the feet. They can meld into any tree and re-emerge from any other tree in the same grove. Half-human, half-forest.',
    Ascendant:
      'They ARE the forest — a walking grove-being with canopy for hair, roots for legs, bark for skin, and wildlife nesting in their shoulders. Or mid-transformation, actively melding into a great tree with human form dissolving into wood. The grove speaks through them. They can call every root in a hundred miles.',
    continuityNote:
      'Progression means the human costume is peeled off and the tree-being underneath becomes visible. Do not just add vines or antlers — the character LITERALLY becomes forest.',
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

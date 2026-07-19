import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Human — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 * Bible: Human's fantasy is CHOICE, not "the realistic option."
 */
export const HUMAN_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Human',
  identityThrough: 'Choice',
  coreFantasy: 'Become extraordinary through adaptation and decision',

  selectionScreen: {
    tagline: 'Ordinary people whose choices shape extraordinary destinies.',
    body:
      'Humans possess no single supernatural birthright. Their strength lies in adaptation, perseverance, learning, and chosen purpose.',
    pullQuote: '',
  },

  coreFantasyPromise: {
    promise:
      'To prove that ordinary beginnings can lead to extraordinary destinies through determination, resilience, and choice.',
    emotionalPillars: ['Choice', 'Determination', 'Growth', 'Adaptability', 'Legacy'],
  },

  origins:
    'Humanity has no single defining origin. Human cultures arose across every landscape and repeatedly reshaped themselves through exchange, invention, conflict, migration, and cooperation.',

  cultureAndDailyLife:
    'Human communities vary through history, geography, profession, economics, values, and ambition. Humans adopt and reinterpret ideas more readily than any other archetype.',

  beliefs: {
    virtues: [
      'determination',
      'adaptability',
      'courage',
      'curiosity',
      'community',
      'hope',
    ],
    taboos: [
      'surrender without trying',
      'wasted opportunity',
      'exploiting the powerless',
      'refusing to learn',
      'choosing comfort over growth',
    ],
    fears: [
      'purposeless life',
      'leaving nothing behind',
      'wasted potential',
      'loss of loved ones',
      'giving up too soon',
    ],
  },

  internalDiversity: {
    groups: [
      'Merchant leagues',
      'Academic societies',
      'Explorer guilds',
      'Artisan communities',
      'Frontier settlements',
      'Kingdoms and republics',
      'Nomadic societies',
    ],
  },

  visualDNA: {
    recognitionCues:
      'Path-specific tools, visible adaptation, evidence of growth, mixed cultural influences, improvisation, and objects tied to what the person fights for.',
    avoid:
      'Generic adventurers, brown leather, swords as default, medieval-soldier shorthand, Human as the plain option.',
  },

  symbolAndMaterial: {
    materials:
      'No universal material language. Materials follow local environment, profession, economics, culture, travel, values, and available technology.',
    symbols:
      'Family marks, professional insignia, memorial objects, mottos, protest symbols, maps, tools, religious symbols, invented crests.',
  },

  rankEvolution: {
    Foundation: 'Has chosen a path but is still shaped heavily by circumstance.',
    Forged: 'Has adapted through a defining challenge and made the path their own.',
    Ascendant:
      'Proves that sustained choice can create a legacy without supernatural origin.',
    continuityNote:
      'Progression should deepen specificity, competence, and consequence — not add generic armor, magic, or chosen-one symbolism.',
  },

  futureDesignSpace:
    'Future additions may introduce new professions, communities, historical inflection points, and Story Pillar answers. New content must resist "Human as blank slate" defaults and preserve chosen-path specificity.',

  claudeGuidance: {
    generationPriorities: [
      'Specific chosen path',
      'Adaptation',
      'Growth through challenge',
      'Personal conviction',
      'Cultural specificity',
      'Resourcefulness',
    ],
    avoid: [
      'Generic adventurer',
      'Human as blank slate',
      'Brown leather default',
      'Sword default',
      'Lack of magic as identity',
      'Chosen-one shortcuts',
    ],
    recognitionChecklist: [
      'Can the chosen path be identified?',
      'Is the growth challenge reflected?',
      'What they fight for is present?',
      'Does the design feel culturally specific?',
      'Does the element remain an adopted tool or expression?',
      'Would the Human still feel extraordinary without supernatural spectacle?',
    ],
  },

  approvedPrestigeRoles: ['Guild Master', 'Path-Breaker', 'Council Elder', 'Founder'],
};

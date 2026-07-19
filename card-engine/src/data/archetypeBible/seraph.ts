import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Seraph — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const SERAPH_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Seraph',
  identityThrough: 'Conviction',
  coreFantasy: 'Carry hope and sacred responsibility into darkness',

  selectionScreen: {
    tagline: 'Divine guardians who carry hope into the darkest corners of the world.',
    body:
      'Seraphs devote themselves to ideals greater than themselves and accept burdens others cannot carry alone.',
    pullQuote: '',
  },

  coreFantasyPromise: {
    promise:
      'To carry hope into darkness, even when doing so demands great personal sacrifice.',
    emotionalPillars: ['Faith', 'Hope', 'Duty', 'Conviction', 'Compassion'],
  },

  origins:
    'Early guardians formed sacred orders around service, healing, justice, guidance, scholarship, and protection. No one order speaks for every Seraph.',

  cultureAndDailyLife:
    'Seraph halls may be sanctuaries, hospitals, schools, courts, shelters, and places of refuge. Daily life combines mentorship, reflection, training, and service.',

  beliefs: {
    virtues: ['hope', 'compassion', 'conviction', 'mercy', 'justice', 'service'],
    taboos: [
      'selfish divine power',
      'abandoning the helpless',
      'twisting faith for control',
      'despair without resistance',
      'judgment without understanding',
    ],
    fears: [
      'loss of hope',
      'indifference',
      'sacred failure',
      'misuse of responsibility',
      'a world without light',
    ],
  },

  internalDiversity: {
    groups: [
      'Order of Mercy',
      'Order of Justice',
      'Order of Guidance',
      'Order of Healing',
      'Order of Illumination',
      'Order of the Vigil',
    ],
  },

  visualDNA: {
    recognitionCues:
      'Story-Pillar-specific symbols, service-worn clothing, evidence of healing or guardianship, meaningful celestial features, and the visible burden of conviction.',
    avoid:
      'White-and-gold armor, symmetrical wings, universal halos, beautiful young angels, floating poses, and divinity equated with youth, whiteness, thinness, or beauty.',
  },

  symbolAndMaterial: {
    materials:
      'Gold, silver, white, blue, red, stone, glass, crystal, wood, iron, feathers with role-specific meanings.',
    symbols:
      'Open hands, lanterns, stars, eyes, scales, gates, rays, broken chains, circles, oath seals, burden marks.',
  },

  rankEvolution: {
    Foundation: 'Carries an oath or truth but has not yet borne its full cost.',
    Forged: 'Has protected hope through failure, sacrifice, or moral uncertainty.',
    Ascendant:
      'Becomes a living source of courage whose authority comes from service rather than spectacle.',
    continuityNote:
      'Progression should deepen burden, witness, and earned sacred authority — not simply add wings, halos, armor, or radiance.',
  },

  futureDesignSpace:
    'Future additions may introduce new orders, oaths, sanctuaries, historical events, and Story Pillar answers. New content must resist "beautiful young angel" defaults and preserve service-earned authority.',

  claudeGuidance: {
    generationPriorities: [
      'Specific truth and oath',
      'Service',
      'Hope under pressure',
      'Burden and sacrifice',
      'Order-specific role',
      'Meaningful celestial symbols',
    ],
    avoid: [
      'White-and-gold perfection',
      'Young beautiful angel default',
      'Paladin shorthand',
      'Radiance erasing detail',
      'Judgment without context',
      'Wings as entire identity',
    ],
    recognitionChecklist: [
      'Can the guiding truth be inferred?',
      'Is the oath connected to service?',
      'Does the opposed darkness affect the design?',
      'Is burden visible alongside hope?',
      'Does the element support conviction?',
      'Would the Seraph remain recognizable without wings or halo?',
    ],
  },

  approvedPrestigeRoles: ['High Oathbearer', 'Order Prime', 'Living Witness'],
};

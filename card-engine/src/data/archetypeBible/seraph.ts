import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Seraph — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 */
export const SERAPH_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Seraph',
  identityThrough: 'Contested Conviction',
  coreFantasy:
    "Bear a contested divine spark, and become — across the ranks — the world's hope, its ruin, or the razor's edge between.",

  selectionScreen: {
    tagline: 'Divine guardians who carry hope into the darkest corners of the world.',
    body:
      'Seraphs devote themselves to ideals greater than themselves and accept burdens others cannot carry alone.',
    pullQuote: '',
  },

  coreFantasyPromise: {
    promise:
      'To answer a divine summons whose alignment is not yet decided, and to shape — through burden, choice, and sacrifice — whether that summons redeems the world, damns it, or refuses to close.',
    emotionalPillars: [
      'Contested Conviction',
      'Devotion',
      'Burden',
      'Sacrifice',
      'Choice',
      'Hope or Wrath',
      'Mercy or Ruin',
    ],
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
      'White-and-gold armor (Good path only, Forged onward — never on Foundation or the Fallen/Balanced paths), symmetrical wings, universal halos, beautiful young angels, floating poses, and divinity equated with youth, whiteness, thinness, or beauty.',
  },

  symbolAndMaterial: {
    materials:
      'Gold, silver, white, blue, red, stone, glass, crystal, wood, iron, feathers with role-specific meanings.',
    symbols:
      'Open hands, lanterns, stars, eyes, scales, gates, rays, broken chains, circles, oath seals, burden marks.',
  },

  rankEvolution: {
    Foundation:
      'Wears the plain habit of a seed unfulfilled — unbleached linen or a monastic robe. No armor, no halo, no horns, no aura, no wings visibly deployed. Carries an oath or truth but has not yet borne its cost, and alignment has not yet declared: the divine spark could turn either way.',
    Forged:
      'Alignment has begun to declare itself, but the Seraph is still primarily robed. Exactly one piece of ceremonial gear sits over the cloth base: gilded ceremonial armor or a gold-veined implement (Good); a blackened obsidian piece or a soot-veined weapon (Fallen); a single grey-lacquered piece (Balanced).',
    Ascendant:
      'The Seraph has fully committed. Good — full radiant regalia in gold and white. Fallen — full obsidian regalia with Infernal-wreathed weapons (Infernal is Fallen-Seraph-exclusive), radiance replaced by molten black light and a broken or inverted halo. Balanced — asymmetric split-crown regalia, half gold and half obsidian, mismatched wings. All three paths remain organized by the six Orders, which are independent of the alignment axis.',
    continuityNote:
      'Progression should deepen burden, witness, and earned authority — sacred, forsaken, or contested — never merely add radiance, halos, horns, wings, or armor. The Foundation Seraph carries no visible divinity of either kind; those signs are earned across ranks.',
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
      'White-and-gold perfection (Good path only, Forged onward)',
      'Young beautiful angel default',
      'Paladin shorthand',
      'Radiance erasing detail',
      'Judgment without context',
      'Wings as entire identity',
      'Foundation Seraph rendered with any armor, halo, wings, horns, or aura',
      'Generic devil / horned-red-imp shorthand for Fallen',
      'Pentagram or inverted-cross cliché',
      'Sexy demoness or edgelord-goth shorthand',
      'Cartoonish evil signaling',
      'Fire-orange palette for Infernal — Infernal is molten obsidian and black light',
      'Collapsing the six Orders into good vs evil',
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

  approvedPrestigeRoles: [
    'High Oathbearer',
    'Order Prime',
    'Living Witness',
    'Anathema',
    'Broken Oathbearer',
    'Ashen Witness',
    'Threshold Warden',
  ],
};

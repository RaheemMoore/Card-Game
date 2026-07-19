import type { ArchetypeBibleChapter } from '../../types/bible';

/**
 * Mech Pilot — Bible v1.0. Source: /Character_Generation_Bible_Canonical_v1.md.
 * Bible reframes as machine PARTNERSHIP — not "more machine each rank."
 */
export const MECH_PILOT_BIBLE: ArchetypeBibleChapter = {
  archetype: 'Mech Pilot',
  identityThrough: 'Machine partnership',
  coreFantasy: 'Carry responsibility through a chosen machine',

  selectionScreen: {
    tagline:
      'Pilots chosen by extraordinary machines whose destinies become forever intertwined.',
    body:
      'A pilot is more than an operator. The chosen machine becomes an extension of judgment, responsibility, and resolve.',
    pullQuote: 'A machine remembers every person who answered its call.',
  },

  coreFantasyPromise: {
    promise: 'To become one with a machine that trusts you as completely as you trust it.',
    emotionalPillars: ['Responsibility', 'Innovation', 'Partnership', 'Courage', 'Sacrifice'],
  },

  origins:
    'Great machines were built to extend what people could accomplish together. Many outlived their creators and now recognize only rare compatible pilots.',

  cultureAndDailyLife:
    'Pilots maintain, repair, calibrate, study, and preserve their machines. Pilot communities exchange diagnostics, historical records, safety practices, and stories of previous operators.',

  beliefs: {
    virtues: [
      'responsibility',
      'precision',
      'teamwork',
      'courage',
      'innovation',
      'reliability',
    ],
    taboos: [
      'reckless technology',
      'abandoning crew',
      'glory over safety',
      'hiding failures',
      'disposable treatment of machines',
    ],
    fears: [
      'failing trust',
      'loss of control',
      'repeated historical mistakes',
      'unethical technology',
      'dependence on power',
    ],
  },

  internalDiversity: {
    groups: [
      'Guardians',
      'Explorers',
      'Rescue Corps',
      'Engineering Divisions',
      'Recon Units',
      'Peacekeeping Corps',
    ],
  },

  visualDNA: {
    recognitionCues:
      'Machine-specific gear, interface wear, diagnostics, access keys, harnesses, maintenance tools, former-pilot history, and visible connection between pilot and machine design language.',
    avoid:
      'Generic power armor, cyberpunk neon, military-only framing, perfect machinery, Android overlap.',
  },

  symbolAndMaterial: {
    materials:
      'Brushed metal, ceramic plating, composites, technical fabric, copper, glass, identification panels, warning markings, fasteners, labels, patched wiring.',
    symbols:
      'Serial marks, cockpit keys, paired insignia, mission tallies, repair dates, former-pilot marks, handprints, promise tokens.',
  },

  rankEvolution: {
    Foundation: 'Has been chosen but is still learning the machine\'s history, limits, and language.',
    Forged:
      'Pilot and machine operate as a trusted partnership marked by repaired failures and earned synchronization.',
    Ascendant:
      'The partnership becomes historically significant, changing how the machine\'s purpose is understood.',
    continuityNote:
      'Progression should deepen synchronization, responsibility, and machine history — not simply enlarge the mech or cover it in weapons.',
  },

  futureDesignSpace:
    'Future additions may introduce new pilot corps, machine lineages, historical events, and Story Pillar answers. New content must preserve pilot AND machine as distinct partners.',

  claudeGuidance: {
    generationPriorities: [
      'Specific chosen machine',
      'Pilot-machine reciprocity',
      'Maintenance and repair',
      'Promise and responsibility',
      'Historical continuity',
      'Functional equipment',
    ],
    avoid: [
      'Generic power armor',
      'Neon cyberpunk shorthand',
      'Fire element availability',
      'Military-only identity',
      'Perfect machinery',
      'Pilot interchangeable with Android',
    ],
    recognitionChecklist: [
      'Can the chosen machine be identified?',
      'Why this pilot was selected is visually plausible?',
      'Does gear belong to this machine?',
      'Are repair and history present?',
      'Does the promise influence design?',
      'Would the pilot remain recognizable without holograms or mech weapons?',
    ],
  },

  approvedPrestigeRoles: ['Senior Wing Commander', 'Master Pilot', 'Chief Machinist'],
};

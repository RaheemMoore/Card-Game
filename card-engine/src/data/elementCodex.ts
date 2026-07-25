import type { ArchetypeName } from '../types/card';
import type { ElementName } from '../types/bible';
import { ELEMENT_COMPATIBILITY } from './elements';
import { ELEMENT_VISUAL_LANGUAGE } from './elementVisualLanguage';

/**
 * Elemental Codex — player-facing lore blurbs for the /codex/elements gallery.
 *
 * Descriptions are synthesized from the canonical `theme` + `symbolism` fields
 * in `elementVisualLanguage.ts` (the visual-language Bible) — they re-express
 * approved canon in reader prose, they do not invent new lore. When the two
 * disagree, `elementVisualLanguage.ts` wins; update this file to match.
 *
 * Only elements that carry crystal artwork appear here (Tech is not an element;
 * Time has no art and no wielder). Elements are grouped into categories purely
 * for presentation.
 */

export interface ElementCodexEntry {
  /** Short evocative epithet, shown under the name. */
  tagline: string;
  /** One–two sentence reader blurb. */
  description: string;
}

export interface ElementCategory {
  id: string;
  title: string;
  blurb: string;
  elements: ElementName[];
}

export const ELEMENT_CODEX: Partial<Record<ElementName, ElementCodexEntry>> = {
  // ---- Primal Forces ----
  Fire: {
    tagline: 'Creation Through Destruction',
    description:
      'Passion and power made manifest — the forge-heat that razes the old to temper something stronger. Fire is courage, wrath, and the promise of rebirth from ash.',
  },
  Water: {
    tagline: 'The Patient Depths',
    description:
      'Adaptable and unhurried, water wears down every obstacle it cannot flow around. It carries healing, wisdom, and the quiet pressure of the deep.',
  },
  Earth: {
    tagline: 'The Unmoving Root',
    description:
      'Ancient strength and stubborn permanence — the weight of mountains given will. Earth endures, shelters, and outlasts every storm that breaks upon it.',
  },
  Wind: {
    tagline: 'The Unseen Hand',
    description:
      'Freedom and motion, a presence felt but never held. Wind is the breath of travelers and the herald of change — the force that moves what will not be moved.',
  },
  Ice: {
    tagline: 'Silence Made Sharp',
    description:
      'Control and precision frozen into perfect stillness. Ice preserves what it claims and disciplines all it touches, patient as a glacier and just as unyielding.',
  },
  Storm: {
    tagline: 'Sky-Fury Unleashed',
    description:
      'Chaos and wrath crowned in lightning. The storm cleanses through violence — an untamed judgment that answers to nothing but its own fury.',
  },

  // ---- Life & Wild ----
  Nature: {
    tagline: 'The Turning Cycle',
    description:
      'Growth, balance, and the slow green patience of the living world. Nature restores what is broken and reclaims what is abandoned, always returning to the grove.',
  },
  Beast: {
    tagline: 'Primal Kinship',
    description:
      'The feral will and blood-loyalty of the wild made ally. Beast is instinct honored — a bond forged not through mastery but through mutual trust.',
  },
  Blood: {
    tagline: 'The Price of Kinship',
    description:
      'Vitality and sacrifice bound in a single vein. Blood is the power of lineage and life-cost — strength paid for in something precious.',
  },
  Poison: {
    tagline: 'Patient Ruin',
    description:
      'Corrosion that works in silence, a warning coiled in beauty. Poison is slow revenge and inevitable decay — the ruin that waits.',
  },

  // ---- Death & Spirit ----
  Bone: {
    tagline: 'The Frame Beneath the Flesh',
    description:
      'The permanence of death — the architecture that remains when all else rots. Bone is memento mori made weapon, the enduring truth under every living thing.',
  },
  Shadow: {
    tagline: 'The Kept Secret',
    description:
      'Mystery, fear, and the comfort of the unseen. Shadow guards secrets and unmakes certainty, thriving in every place the light forgets.',
  },
  Spirit: {
    tagline: 'Presence Beyond Flesh',
    description:
      'Memory and the thin veil between the living and the departed. Spirit is what lingers past death — a presence that remembers, watches, and endures.',
  },
  Void: {
    tagline: 'The Unmaking',
    description:
      'Cosmic silence and the tear in reality where things simply cease. Void is not darkness but absence — the end toward which all things drift.',
  },

  // ---- Celestial ----
  Light: {
    tagline: 'Revelation',
    description:
      'Clarity and radiance that leaves nothing hidden. Light is truth made visible, purpose given form — the dawn that scatters every doubt.',
  },
  Holy: {
    tagline: 'The Sacred Mandate',
    description:
      'Divine duty and radiant guardianship, power held in sacred trust. Holy is the watch kept over the weak and the mandate that cannot be forsaken.',
  },
  Moon: {
    tagline: 'The Watchful Tide',
    description:
      'The silver cycle that calls the tides and governs the turning of nights. Moon is a patient, watchful presence — always changing, never gone.',
  },
  Lunar: {
    tagline: "The Goddess's Blessing",
    description:
      "Divine lunar sovereignty — silver-fire granted to the chosen. Lunar is ascension itself, the Moon Goddess's authority blazing through her champion.",
  },
  Cosmic: {
    tagline: 'Serenity Gone Vast',
    description:
      'Transcendence — the enlightened mind dissolved into the starfield. Cosmic is serenity beyond mortal concern, a self grown as wide as the dark between stars.',
  },

  // ---- Mind & Mystery ----
  Psychic: {
    tagline: 'The Unseen Touch',
    description:
      "The mind reaching outward past the body's edge. Psychic is influence without contact — insight, empathy, and precision applied to thought itself.",
  },
  Dream: {
    tagline: 'Wish-Lit Truth',
    description:
      'Shifting, iridescent, a memory of things that never were. Dream is unreliable truth — the beautiful uncertainty between what happened and what was hoped.',
  },

  // ---- Forged & Machine ----
  Metal: {
    tagline: 'The Discipline of the Forge',
    description:
      'Craftsmanship and precision, strength shaped by patient hands. Metal is progress made solid — the union of discipline, artistry, and unbreakable will.',
  },
  Plasma: {
    tagline: 'The Caged Star',
    description:
      'Engineered energy mastered and held on a leash. Plasma is raw stellar power tamed by craft — the star pulled down and made to obey.',
  },
  Nanite: {
    tagline: 'The Endless Remaking',
    description:
      'A living swarm of countless machines, forever rebuilding itself. Nanite is the death that cannot stick — power that reshapes faster than it can be destroyed.',
  },
  Prism: {
    tagline: 'The Manufactured Soul',
    description:
      'Refracted light given structure — a synthetic spirit that shines. Prism is the ghost in beautiful machine-light, an artificial soul made of every color at once.',
  },

  // ---- Cursed & Exclusive ----
  Nocturne: {
    tagline: 'Dominion of Eternal Night',
    description:
      'Sovereignty over the dark — the sun devoured and the blood-moon crowned. Nocturne is the endless night itself, ruled by those who no longer fear it.',
  },
  Sanguine: {
    tagline: 'Vitality Made Jewel',
    description:
      'Blood hardened into faceted crystal, lineage crystallized into power. Sanguine is vitality made permanent — the gemstone heart of an immortal bloodline.',
  },
  Infernal: {
    tagline: 'Fallen Grace',
    description:
      'Corrupted radiance and oath-broken glory — hellfire held in regal restraint. Infernal is judgment inverted, damnation worn like a crown.',
  },
};

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  {
    id: 'primal',
    title: 'Primal Forces',
    blurb: 'The raw elements of the living world — the powers that shaped the land before anyone walked it.',
    elements: ['Fire', 'Water', 'Earth', 'Wind', 'Ice', 'Storm'],
  },
  {
    id: 'life-wild',
    title: 'Life & the Wild',
    blurb: 'Growth, kinship, and the price that living power demands.',
    elements: ['Nature', 'Beast', 'Blood', 'Poison'],
  },
  {
    id: 'death-spirit',
    title: 'Death & Spirit',
    blurb: 'What remains when the flesh is gone — memory, secret, and silence.',
    elements: ['Bone', 'Shadow', 'Spirit', 'Void'],
  },
  {
    id: 'celestial',
    title: 'Celestial',
    blurb: 'Light, duty, and the turning of the heavens.',
    elements: ['Light', 'Holy', 'Moon', 'Lunar', 'Cosmic'],
  },
  {
    id: 'mind',
    title: 'Mind & Mystery',
    blurb: 'Powers of thought, influence, and the truths that shift when you look at them.',
    elements: ['Psychic', 'Dream'],
  },
  {
    id: 'machine',
    title: 'Forged & Machine',
    blurb: 'Power that is built rather than born — the works of craft, engineering, and manufactured souls.',
    elements: ['Metal', 'Plasma', 'Nanite', 'Prism'],
  },
  {
    id: 'cursed',
    title: 'Cursed & Exclusive',
    blurb: 'Rare powers bound to a single bloodline or a single fall from grace.',
    elements: ['Nocturne', 'Sanguine', 'Infernal'],
  },
];

/** Archetypes that can wield this element (natural or rare bucket), in canon order. */
export function archetypesForElement(element: ElementName): ArchetypeName[] {
  return (Object.keys(ELEMENT_COMPATIBILITY) as ArchetypeName[]).filter((arch) => {
    const b = ELEMENT_COMPATIBILITY[arch];
    return b.naturally_compatible.includes(element) || b.rare.includes(element);
  });
}

/** A few "essence" keywords for an element, drawn from its canonical theme line. */
export function essenceTags(element: ElementName, max = 3): string[] {
  const theme = ELEMENT_VISUAL_LANGUAGE[element]?.theme ?? '';
  return theme
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    // Drop long descriptive clauses; keep tight single-concept words/phrases.
    .filter((t) => t.split(' ').length <= 2)
    .slice(0, max);
}

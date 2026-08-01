import type { ElementName } from '../../../types/bible';
import type { MaterialFamily, MaterialKit } from '../../../services/combat/performance/types';

/**
 * The combat-side material table — what each element is MADE OF when an
 * ability is cast with it.
 *
 * ## Why this is authored by hand
 *
 * `data/elementVisualLanguage.ts` is canonical for how an element looks, and
 * everything below is written from it. But it is a Leonardo prompt-assembly
 * module: 29 elements × 12 fields of English prose, e.g. Blood's
 * `textures: 'glossy wet sheen, syrup-thick viscous drips, beading droplets'`.
 * A renderer cannot consume that. Every kit here therefore names the entry it
 * was authored from in `citesVisualLanguage`, and the two are kept in step by
 * review. There is no parser and there should not be one — a parser over prose
 * would silently degrade every element toward the same mush, which is exactly
 * the failure the Bible was written to stop.
 *
 * ## The rule these kits exist to satisfy
 *
 * Bible principle, verbatim: "Every element should be recognizable even
 * without color. A player should identify an element by silhouette, materials,
 * lighting, motion, textures, atmosphere. Color should reinforce an element,
 * not define it."
 *
 * So `palette` is the LAST field of every kit and the least load-bearing one.
 * If two kits differ only in palette, the kit is not finished. The Ability
 * Theater's material comparison exists specifically to test this by hiding the
 * swatch.
 *
 * ## Coverage
 *
 * Five elements are authored in full for Delivery 1 — the ones the pilots
 * actually cast: Blood, Water, Fire, Nature, Holy. Every other element routes
 * to its family default and is flagged `provisional: true`, which the Ability
 * Theater renders as visible debt rather than passing off as finished art
 * direction. Filling them in is a tracked thread, not a silent TODO.
 *
 * Deliberately typed `Record<ElementName, MaterialKit>` rather than a partial
 * map with a fallback, matching the convention `ELEMENT_TO_DAMAGE_TYPE` set:
 * adding a 30th element should be a COMPILE ERROR that forces a decision, not
 * a silent demotion to a grey default.
 */

/* ------------------------------------------------------------------ */
/*  Authored kits — the five the pilots cast                           */
/* ------------------------------------------------------------------ */

/**
 * Blood — heavy, wet, and reluctant to leave.
 *
 * The Bible's motion field is unusually specific: "coiling ribbons, spraying
 * arcs, hovering droplets, slow DOWNWARD drip". The downward drip is the tell
 * that separates Blood from every other umbral element at a glance, so it is
 * the residue, and the coil is the silhouette. Its `avoid` field explicitly
 * forbids "orange fire flame" and "purple" — the second of those is why this
 * kit exists at all, since Blood shares the `umbral` damage type with Shadow
 * and Void and used to render as the same violet bolt as both.
 */
const BLOOD: MaterialKit = {
  element: 'Blood',
  family: 'umbral',
  silhouette: 'coiling_ribbon',
  edgeProfile: 'heavy_rounded',
  particle: 'droplet',
  impact: 'wet_splash',
  residue: 'dripping',
  chargeForm: 'pool',
  streamFlow: 'jet',
  palette: ['#7d1220', '#c8203a', '#f2b8bd'],
  provisional: false,
  citesVisualLanguage: 'BLOOD',
};

/**
 * Water — continuous where blood is beaded.
 *
 * Same broad "curved ribbon" family as Blood and it must not be mistaken for
 * it: the separator is the FOAM CREST along the edge and the fact that water
 * collapses outward into a fan on contact where blood beads and clings. The
 * Bible's `avoid` warns against "flat blue energy" and "blue fire", which is
 * why the impact is a `foam_fan` rather than a radial burst.
 */
const WATER: MaterialKit = {
  element: 'Water',
  family: 'primal',
  silhouette: 'cresting_ribbon',
  edgeProfile: 'foam_crest',
  particle: 'spray',
  impact: 'foam_fan',
  residue: 'misting',
  chargeForm: 'pool',
  streamFlow: 'jet',
  palette: ['#0e5a72', '#2aa6c4', '#eaf7fb'],
  provisional: false,
  citesVisualLanguage: 'WATER',
};

/**
 * Fire — the only kit whose core is brighter than its edge.
 *
 * Bright core, dark edge, tapering forks. Everything else in this table is
 * darker in the middle. That inversion is most of the no-colour read: a fire
 * lash is legible as fire in greyscale because it is a light shape with a
 * ragged dark rim, and nothing else here is.
 */
const FIRE: MaterialKit = {
  element: 'Fire',
  family: 'searing',
  silhouette: 'jagged_tongue',
  edgeProfile: 'tapering_forks',
  particle: 'ember',
  // Fire CRAWLS across what it hits; Infernal detonates off it. Both were
  // 'ember_burst' until Infernal was authored, at which point the two kits
  // became structurally identical and separable only by hue — which the
  // no-colour guard caught immediately.
  impact: 'spreading_sheet',
  residue: 'smouldering',
  // Fire does not puddle. It catches, and it is blown rather than sprayed.
  chargeForm: 'flame',
  streamFlow: 'wisp',
  palette: ['#ffd88a', '#e8541c', '#3a1408'],
  provisional: false,
  citesVisualLanguage: 'FIRE',
};

/**
 * Nature — fibrous and branching, never a smooth ribbon.
 *
 * The Bible is emphatic that Nature green is "DARKER and RICHER than
 * Wind-green ... the color of a shaded forest floor", and its `avoid` field
 * names "green fire" and "pale-mint-green (that is Wind)". Hence a fibrous
 * bundle with barbs rather than anything that flows: roots are made of many
 * strands and they splinter, which is what `splintering` impact encodes.
 */
const NATURE: MaterialKit = {
  element: 'Nature',
  family: 'primal',
  silhouette: 'fibrous_bundle',
  edgeProfile: 'barbed',
  particle: 'leaf',
  impact: 'splintering',
  residue: 'binding',
  // A plant that blooms on the card, with the roots reaching out of it —
  // Raheem's brief. Earth keeps the soil-stirring 'ground' tell.
  chargeForm: 'bloom',
  streamFlow: 'creep',
  palette: ['#1e3d1a', '#4a7c2f', '#c9a227'],
  // Roots are wood, not leaf. Bible NATURE secondaries: 'brown, amber, moss'.
  structure: '#6b4423',
  provisional: false,
  citesVisualLanguage: 'NATURE',
};

/**
 * Holy — the barrier pilot's material.
 *
 * Faceted planes and a bevelled edge, from the Bible's "stained-glass
 * jewel-tone" accent and symmetrical/radiant shape language. This is what lets
 * Bearing Witness extend the existing `CardShieldPane` honestly instead of
 * inventing a second glass vocabulary: the pane is already faceted, bevelled
 * glass, which is Holy's silhouette exactly.
 */
const HOLY: MaterialKit = {
  element: 'Holy',
  family: 'radiant',
  silhouette: 'faceted_plane',
  edgeProfile: 'bevelled',
  particle: 'mote',
  impact: 'refracting_flare',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'jet',
  palette: ['#f7e7a8', '#d9a625', '#fffdf2'],
  provisional: false,
  citesVisualLanguage: 'HOLY',
};

/* ------------------------------------------------------------------ */
/*  Family defaults                                                    */
/* ------------------------------------------------------------------ */

/**
 * The per-family stand-in for an element nobody has authored yet.
 *
 * These are deliberately PLAUSIBLE rather than good. A family default should
 * be obviously a placeholder when seen next to an authored kit — that is what
 * keeps the debt visible. Every kit built from one carries `provisional: true`
 * and the Ability Theater badges it.
 */
const FAMILY_DEFAULT: Record<MaterialFamily, Omit<MaterialKit, 'element' | 'citesVisualLanguage'>> = {
  searing: {
    family: 'searing',
    silhouette: 'jagged_tongue',
    edgeProfile: 'tapering_forks',
    particle: 'ember',
    impact: 'ember_burst',
    residue: 'smouldering',
    chargeForm: 'flame',
    streamFlow: 'wisp',
    palette: ['#ffd88a', '#e8541c', '#3a1408'],
    provisional: true,
  },
  primal: {
    family: 'primal',
    silhouette: 'fibrous_bundle',
    edgeProfile: 'barbed',
    particle: 'leaf',
    impact: 'splintering',
    residue: 'binding',
    chargeForm: 'ground',
    streamFlow: 'jet',
    palette: ['#1e3d1a', '#4a7c2f', '#c9a227'],
    provisional: true,
  },
  radiant: {
    family: 'radiant',
    silhouette: 'faceted_plane',
    edgeProfile: 'bevelled',
    particle: 'mote',
    impact: 'refracting_flare',
    residue: 'lingering_glow',
    chargeForm: 'halo',
    streamFlow: 'jet',
    palette: ['#f7e7a8', '#d9a625', '#fffdf2'],
    provisional: true,
  },
  umbral: {
    family: 'umbral',
    silhouette: 'coiling_ribbon',
    edgeProfile: 'heavy_rounded',
    particle: 'mote',
    impact: 'radial_burst',
    residue: 'misting',
    chargeForm: 'motes',
    streamFlow: 'wisp',
    palette: ['#2a1b3d', '#6d4aa8', '#d9c8f2'],
    provisional: true,
  },
  tech: {
    family: 'tech',
    silhouette: 'smooth_bolt',
    edgeProfile: 'clean',
    particle: 'shard',
    impact: 'radial_burst',
    residue: 'lingering_glow',
    chargeForm: 'motes',
    streamFlow: 'jet',
    palette: ['#0b3a4a', '#38bdf8', '#e0f7ff'],
    provisional: true,
  },
  astral: {
    family: 'astral',
    silhouette: 'smooth_bolt',
    edgeProfile: 'clean',
    particle: 'mote',
    impact: 'refracting_flare',
    residue: 'lingering_glow',
    chargeForm: 'motes',
    streamFlow: 'wisp',
    palette: ['#3b1152', '#c026d3', '#fce7ff'],
    provisional: true,
  },
  kinetic: {
    family: 'kinetic',
    silhouette: 'smooth_bolt',
    edgeProfile: 'clean',
    particle: 'shard',
    impact: 'radial_burst',
    residue: 'none',
    chargeForm: 'motes',
    streamFlow: 'jet',
    provisional: true,
    palette: ['#4a4a52', '#c8c2b4', '#f5f2ea'],
  },
};

/** Build a provisional kit for an element from its family default. */
function fromFamily(element: ElementName, family: MaterialFamily): MaterialKit {
  return {
    ...FAMILY_DEFAULT[family],
    element,
    citesVisualLanguage: `${element.toUpperCase()} (not yet authored — family default)`,
  };
}

/* ------------------------------------------------------------------ */
/*  The table                                                          */
/* ------------------------------------------------------------------ */

/**
 * Every element's combat material.
 *
 * The family assignment mostly mirrors `ELEMENT_TO_DAMAGE_TYPE`, because the
 * damage families were themselves drawn along sensible thematic lines. It is
 * NOT derived from it, though, and must not be: Infernal resolves as `umbral`
 * damage specifically so it does not drag the fire palette in through the
 * mechanics, but visually it is molten obsidian and black light and belongs
 * nowhere near the umbral coiling-ribbon default. Where the two disagree, the
 * visual choice wins here and the comment says why.
 */
export const MATERIAL_KITS: Record<ElementName, MaterialKit> = {
  // --- authored -----------------------------------------------------------
  Fire: FIRE,
  Water: WATER,
  Nature: NATURE,
  Blood: BLOOD,
  Holy: HOLY,

  // --- provisional --------------------------------------------------------
  Earth: fromFamily('Earth', 'primal'),
  Wind: fromFamily('Wind', 'primal'),
  Ice: fromFamily('Ice', 'kinetic'),
  Storm: fromFamily('Storm', 'kinetic'),
  Beast: fromFamily('Beast', 'primal'),
  Poison: fromFamily('Poison', 'primal'),
  Moon: fromFamily('Moon', 'primal'),
  Lunar: fromFamily('Lunar', 'primal'),

  Light: fromFamily('Light', 'radiant'),
  Spirit: fromFamily('Spirit', 'radiant'),
  Prism: fromFamily('Prism', 'radiant'),

  /**
   * Shadow — the hardest no-colour test in the game so far.
   *
   * Blood, Shadow, Void, Bone, Nocturne, Sanguine, Dream, Psychic and Infernal
   * ALL resolve as `umbral` damage. If any two of them are separable only by
   * hue, the whole material axis is decoration. So Shadow is authored as the
   * structural opposite of Blood, the one it is most likely to be confused
   * with:
   *
   *   Blood  — defined glossy edge, heavy beads, wet specular highlights, drips
   *   Shadow — no edge at all, frays into nothing, near-zero specular, hangs
   *
   * The distinguishing cue is therefore VALUE and EDGE rather than colour:
   * blood is a mid-tone with bright highlights, shadow is near-black with
   * almost none. That survives greyscale; hue would not.
   *
   * Cites Bible SHADOW — fear-dark and absence, distinct from Nocturne's
   * blood-moon night and Void's nothing.
   */
  Shadow: {
    element: 'Shadow',
    family: 'umbral',
    silhouette: 'fraying_smoke',
    edgeProfile: 'dissolving',
    particle: 'mote',
    impact: 'engulfing',
    residue: 'misting',
    chargeForm: 'motes',
    // Smoke is air, not liquid — it billows rather than pours.
    streamFlow: 'wisp',
    palette: ['#1a1424', '#4a3a63', '#9d8fb5'],
    provisional: false,
    citesVisualLanguage: 'SHADOW',
  },
  Void: fromFamily('Void', 'umbral'),
  Bone: fromFamily('Bone', 'umbral'),
  Nocturne: fromFamily('Nocturne', 'umbral'),
  /**
   * Sanguine — blood that has been hardened, and the first SOLID in the set.
   *
   * Bible SANGUINE, Vampire-exclusive: "a vampire's vitality hardened into
   * faceted ruby/garnet crystal. Distinct from Blood (wet liquid crimson) and
   * Nocturne (blood-moon night)." Raheem's brief: "the Sanguine texture is a
   * crystal. The other ones are wet, some are airy and flowy. Sanguine is the
   * occurrence of when the vampire has the strength to crystallise the blood."
   *
   * Every field here is chosen against Blood, because they are the pair most
   * likely to collapse into each other — same source substance, same damage
   * type, adjacent lore:
   *
   *   Blood    — coiling ribbon, rounded, wet, drips, flows as a jet
   *   Sanguine — faceted shard, bevelled, hard, shatters, thrown as a volley
   *
   * `volley` is the delivery nothing else uses: discrete solid bodies with air
   * between them, rather than one continuous body spanning the gap. Crystal
   * cannot flow, blow or grow, so it needed its own.
   */
  Sanguine: {
    element: 'Sanguine',
    family: 'umbral',
    silhouette: 'faceted_shard',
    edgeProfile: 'bevelled',
    particle: 'shard',
    // Crystal breaks. It does not splash, spread or engulf.
    impact: 'splintering',
    residue: 'none',
    chargeForm: 'crystallize',
    streamFlow: 'volley',
    palette: ['#8c0f2a', '#d4224a', '#ffd9e2'],
    provisional: false,
    citesVisualLanguage: 'SANGUINE',
  },
  Dream: fromFamily('Dream', 'umbral'),
  Psychic: fromFamily('Psychic', 'umbral'),
  /**
   * Infernal — molten rock, and the one element whose art arrived by accident.
   *
   * A "Fire" set was generated that came back as lava: a solid black-and-orange
   * band, a spiked starburst, heavy and mineral. Raheem's call on seeing it
   * (2026-08-01): "that is Inferno — lava, rocks, a lava puddle that pops up,
   * a black and orange stream, then it hits with a spark." So it was rehomed
   * here rather than discarded, and Fire was re-briefed as something airy.
   *
   * That history is why this is a LIQUID (`pool`, `jet`) while Fire is not:
   * lava pools and pours, flame catches and blows. Damage-typed `umbral` per
   * Seraph Bible §14, which keeps fire-orange from reaching it through the
   * mechanics — the material is visibly molten, so it takes the searing
   * silhouette but keeps its own darker, mineral colour.
   */
  Infernal: {
    element: 'Infernal',
    family: 'searing',
    silhouette: 'jagged_tongue',
    edgeProfile: 'tapering_forks',
    particle: 'ember',
    impact: 'ember_burst',
    residue: 'smouldering',
    chargeForm: 'pool',
    streamFlow: 'jet',
    palette: ['#ffb347', '#7a2408', '#1a0f0a'],
    provisional: false,
    citesVisualLanguage: 'INFERNAL',
  },

  Metal: fromFamily('Metal', 'tech'),
  Plasma: fromFamily('Plasma', 'tech'),
  Nanite: fromFamily('Nanite', 'tech'),

  Cosmic: fromFamily('Cosmic', 'astral'),
  Time: fromFamily('Time', 'astral'),
};

/**
 * The material for a card with no element at all — legacy cards forged before
 * the Global Element Pillar landed. Mirrors `damageTypeForElement`'s choice of
 * `kinetic` for the same case, so the mechanical and visual fallbacks agree.
 */
export const UNELEMENTED_KIT: MaterialKit = {
  ...FAMILY_DEFAULT.kinetic,
  element: 'Ice',
  provisional: true,
  citesVisualLanguage: 'none — card has no element',
};

/** Resolve a material kit, tolerating a card with no element. */
export function materialKitFor(element: ElementName | undefined): MaterialKit {
  return element ? MATERIAL_KITS[element] : UNELEMENTED_KIT;
}

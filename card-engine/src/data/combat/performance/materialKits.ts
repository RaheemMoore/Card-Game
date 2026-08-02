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
 * module: 29 elements × 12 fields of English prose (e.g. Blood's
 * `textures: 'glossy wet sheen, syrup-thick viscous drips, beading droplets'`).
 * A renderer cannot consume prose. So each kit here therefore names the entry
 * it was authored from in `citesVisualLanguage`, and the two are kept in step
 * by review. There is no parser and there should not be one — a parser over
 * prose would silently degrade every element toward the same mush, which is
 * exactly the failure the Bible was written to stop.
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
 * 28 of 29 elements are authored (2026-08-01). The one exception is `Time`,
 * which `data/elements.ts ELEMENT_COMPATIBILITY` gives to NO archetype — no
 * player card can ever hold it, so it stays on the `astral` family default
 * rather than spending design effort on a look nobody will see. If Raheem ever
 * builds an archetype that reaches it, author it then.
 *
 * `Void` is a partial exception in spirit, not in code: it is authored below
 * (so it renders distinctly today) but its Bible entry describes a "cuts
 * through resistances" mechanic that has not been built — see the standing
 * note in `data/elements.ts`. Its visual identity does not depend on that
 * mechanic landing, so there was no reason to leave it provisional, but its
 * kit should be revisited once the mechanic is real.
 *
 * Deliberately typed `Record<ElementName, MaterialKit>` rather than a partial
 * map with a fallback, matching the convention `ELEMENT_TO_DAMAGE_TYPE` set:
 * adding a 30th element should be a COMPILE ERROR that forces a decision, not
 * a silent demotion to a grey default.
 */

/* ------------------------------------------------------------------ */
/*  Authored kits                                                       */
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
 * Fire — one of two kits whose core is brighter than its edge (see Lunar).
 *
 * Bright core, dark edge, tapering forks. Almost everything else in this
 * table is darker in the middle. That inversion is most of the no-colour
 * read: a fire lash is legible as fire in greyscale because it is a light
 * shape with a ragged dark rim.
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

/**
 * Earth — blocky and heavy where every other silhouette here tapers, coils or
 * fades.
 *
 * Bible EARTH shapes, verbatim: "blocky-heavy, columnar, angular." Textures
 * "chunky rocky-plate, mineral-vein pits, weathered and cracked" gave the
 * `jagged_block` silhouette and the `chunky` edge their names directly.
 * `avoid` explicitly forbids "smooth featureless boulders" and "glowing
 * volcanic Earth (that is Fire)" — the second is why nothing here glows.
 */
const EARTH: MaterialKit = {
  element: 'Earth',
  family: 'primal',
  silhouette: 'jagged_block',
  edgeProfile: 'chunky',
  particle: 'shard',
  impact: 'splintering',
  residue: 'none',
  // "Heaving stone plates, rising rock pillars, rock-fists forming" — the
  // ground stirs before the strike, per Bible motion.
  chargeForm: 'ground',
  // "Rock-fists forming" reads as thrown force, not a slow creep.
  streamFlow: 'jet',
  palette: ['#6b6459', '#3f382e', '#c9a227'],
  provisional: false,
  citesVisualLanguage: 'EARTH',
};

/**
 * Wind — ribbon-like but never wet, because it is air rather than water.
 *
 * Bible WIND shapes: "ribbon-like, unfurling, spiraling, half-translucent."
 * Shares Water's `cresting_ribbon` silhouette on purpose — both are curved,
 * flowing ribbons — and is told apart by everything downstream of it: a
 * dissolving translucent edge instead of a foam crest, a scattering gust
 * instead of a fan of spray, and `wisp` instead of a pressurised `jet`.
 * `avoid`: "solid opaque wind... warm colors, blue-magic default."
 */
const WIND: MaterialKit = {
  element: 'Wind',
  family: 'primal',
  silhouette: 'cresting_ribbon',
  edgeProfile: 'dissolving',
  particle: 'mote',
  impact: 'gust_scatter',
  residue: 'misting',
  chargeForm: 'motes',
  streamFlow: 'wisp',
  palette: ['#8fbf9e', '#c9e8d6', '#eaf9f2'],
  provisional: false,
  citesVisualLanguage: 'WIND',
};

/**
 * Ice — the second faceted-crystal material, and deliberately NOT a recolour
 * of Sanguine.
 *
 * Bible ICE shapes: "angular, faceted, spike-and-shard", motion "ice
 * crystallizing OUTWARD in sharp spikes." Sharing `faceted_shard` with
 * Sanguine is the correct call — they are both crystal — but Ice fires as a
 * coherent freezing `jet` where Sanguine throws a discrete `volley`, which is
 * the difference between a freeze-ray and a hail of thrown shards.
 */
const ICE: MaterialKit = {
  element: 'Ice',
  family: 'kinetic',
  silhouette: 'faceted_shard',
  edgeProfile: 'bevelled',
  particle: 'shard',
  // Reused for its geometry (a sharp, many-lobed radial burst), not its name —
  // ice crystallising outward in spikes is the same shape as an ember burst.
  impact: 'ember_burst',
  // "Freezing mist creeping" — explicit in the Bible motion field.
  residue: 'misting',
  chargeForm: 'motes',
  streamFlow: 'jet',
  palette: ['#a8d8e8', '#4a9bc4', '#eaf9ff'],
  provisional: false,
  citesVisualLanguage: 'ICE',
};

/**
 * Storm — the only branching, forked silhouette in the set.
 *
 * Bible STORM shapes: "spiraling, chaotic-billowing, forked", textures
 * "lightning-arc." Reusing `jagged_tongue` (Fire's smooth-tapering flame)
 * would have been a lie about the shape — lightning does not taper, it
 * branches at hard angles — so this is the one element that earned a
 * dedicated silhouette, `branching_bolt`.
 */
const STORM: MaterialKit = {
  element: 'Storm',
  family: 'kinetic',
  silhouette: 'branching_bolt',
  edgeProfile: 'tapering_forks',
  particle: 'droplet',
  impact: 'radial_burst',
  residue: 'misting',
  chargeForm: 'motes',
  streamFlow: 'wisp',
  palette: ['#4a5568', '#7a8fa8', '#eaf2ff'],
  provisional: false,
  citesVisualLanguage: 'STORM',
};

/**
 * Beast — physical, never magical. The Bible's `avoid` field for this one is
 * the most absolute in the whole table: "ABSOLUTELY NEVER fire or flame or
 * ember or heat-shimmer, NEVER lightning arcs, NEVER magical rune circles,
 * NEVER any glow-based magic."
 *
 * So `residue: 'none'` is load-bearing, not a default — nothing about a claw
 * swipe should linger as a glow. Fur is fibrous, claws are barbs, and the
 * charge is a low crouching tension rather than anything gathering in the air.
 *
 * `travelPace: 'instant'` was added after watching a real cast: a beam
 * crossing the arena is a projectile, and a predator does not project
 * anything — it closes the distance. Raheem: "I don't think Beast needs a
 * beam for his attack. It should look more like a lunge... it should just
 * appear on the [boss]."
 */
const BEAST: MaterialKit = {
  element: 'Beast',
  family: 'primal',
  silhouette: 'fibrous_bundle',
  edgeProfile: 'barbed',
  particle: 'droplet',
  impact: 'splintering',
  residue: 'none',
  // "Crouched-and-springing, low-shouldered, poised-to-strike" — tension
  // gathering low, not a magical pool.
  chargeForm: 'ground',
  streamFlow: 'jet',
  travelPace: 'instant',
  palette: ['#8a6b47', '#4a3826', '#e8b923'],
  provisional: false,
  citesVisualLanguage: 'BEAST',
};

/**
 * Poison — the Bible's own word for its motion is "creeping", which is used
 * here verbatim as the `streamFlow`.
 *
 * Shares Blood's silhouette and charge form (both are liquid-adjacent, both
 * pool before release) but is told apart by a dissolving vapour edge instead
 * of Blood's glossy beads, and by seeping outward rather than firing.
 */
const POISON: MaterialKit = {
  element: 'Poison',
  family: 'primal',
  silhouette: 'coiling_ribbon',
  edgeProfile: 'dissolving',
  particle: 'spray',
  impact: 'foam_fan',
  // "Warning... patient decay" — venom that lingers and clings rather than
  // dripping away.
  residue: 'binding',
  chargeForm: 'pool',
  streamFlow: 'creep',
  palette: ['#5a7a1a', '#4a2a5a', '#c4d43a'],
  provisional: false,
  citesVisualLanguage: 'POISON',
};

/**
 * Metal — rigid, machined, and the first kit to actually use `smooth_bolt`,
 * which had sat unused since the type was introduced.
 *
 * Bible METAL shapes: "mechanical, rigid, geometric-bladed." `avoid`:
 * "molten-metal-only compositions (that reads as Fire)" — nothing here glows
 * or drips for that reason.
 */
const METAL: MaterialKit = {
  element: 'Metal',
  family: 'tech',
  silhouette: 'smooth_bolt',
  edgeProfile: 'clean',
  particle: 'shard',
  impact: 'radial_burst',
  residue: 'none',
  chargeForm: 'motes',
  streamFlow: 'jet',
  palette: ['#8a8f96', '#c4a668', '#e8c468'],
  provisional: false,
  citesVisualLanguage: 'METAL',
};

/**
 * Spirit — a ribbon, per the Bible's own shape language ("ribbon-and-wisp,
 * half-there silhouettes, drifting-tendril"), told apart from Shadow mainly
 * by VALUE rather than hue: pale near-white against Shadow's near-black.
 *
 * That is a deliberate, greyscale-safe distinction — the same principle that
 * makes Fire's bright core legible without colour makes a pale ghost legible
 * against a dark one. Palette carries real weight here, which the Bible
 * itself sanctions: it says color should REINFORCE identity, not that it can
 * never help establish it when the difference is brightness, not hue.
 */
const SPIRIT: MaterialKit = {
  element: 'Spirit',
  family: 'radiant',
  silhouette: 'cresting_ribbon',
  edgeProfile: 'dissolving',
  particle: 'mote',
  impact: 'engulfing',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'wisp',
  palette: ['#a8c4d8', '#e8f4f8', '#f8fbff'],
  provisional: false,
  citesVisualLanguage: 'SPIRIT',
};

/**
 * Light — Holy's un-sanctified cousin, and deliberately allowed to share real
 * vocabulary with it (both `radiant`, both a `halo` charge, both a coherent
 * `jet`) because the Bible itself treats them as siblings — Light is one of
 * Holy's own naturally-compatible elements.
 *
 * The moment of contact still had to differ: `sunburst` (many sharp points)
 * against Holy's `refracting_flare` (a softer radiant flare), and
 * `smooth_bolt` instead of Holy's `faceted_plane` for a cleaner, less
 * ornamented beam — Bible LIGHT shapes are "radial-beam, sunburst,
 * prismatic", plainer than Holy's "symmetrical, radiant, halo-crowned."
 */
const LIGHT: MaterialKit = {
  element: 'Light',
  family: 'radiant',
  silhouette: 'smooth_bolt',
  edgeProfile: 'clean',
  particle: 'mote',
  impact: 'sunburst',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'jet',
  palette: ['#fff4d4', '#e8d488', '#ffffff'],
  provisional: false,
  citesVisualLanguage: 'LIGHT',
};

/**
 * Void — authored now for a distinct look today; the "cuts through
 * resistances" MECHANIC Raheem has described for it is explicitly NOT built
 * yet (see the standing note in `data/elements.ts`). This kit should be
 * revisited once that mechanic lands, since the performance may need to sell
 * the cutting-through in a way nothing here yet does.
 *
 * Shares Shadow's formless `fraying_smoke` silhouette — both are absence
 * rather than substance — but sheds hard `shard` fragments of torn reality
 * rather than soft motes, and leaves NOTHING behind (`residue: 'none'`)
 * where Shadow leaves a haze, per Bible VOID: "unmaking... the end of
 * things."
 */
const VOID: MaterialKit = {
  element: 'Void',
  family: 'umbral',
  silhouette: 'fraying_smoke',
  edgeProfile: 'dissolving',
  particle: 'shard',
  impact: 'engulfing',
  residue: 'none',
  chargeForm: 'motes',
  streamFlow: 'wisp',
  palette: ['#0a0612', '#3a1a52', '#8a4ac9'],
  provisional: false,
  citesVisualLanguage: 'VOID',
};

/**
 * Cosmic — the Monk's PEACE culmination, and the one impact in the set
 * explicitly required to NOT be a burst.
 *
 * Bible COSMIC motion is unusually direct about this: "calm and vast, NOT a
 * violent burst." `engulfing` is reused here for its slow BLOOM arrival (see
 * `materialStyle.ts impactArrival`) rather than for its Shadow association —
 * a nebula settling in in an unhurried fade is exactly the same animation
 * shape Shadow needed, for an unrelated reason.
 */
const COSMIC: MaterialKit = {
  element: 'Cosmic',
  family: 'astral',
  silhouette: 'faceted_plane',
  edgeProfile: 'clean',
  particle: 'mote',
  impact: 'engulfing',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'wisp',
  palette: ['#1a1a3a', '#4a3a6a', '#f0c848'],
  provisional: false,
  citesVisualLanguage: 'COSMIC',
};

/**
 * Psychic — sharp-edged and intact, which the Bible states as an explicit
 * CONTRAST requirement against Dream: "Psychic is sharp-edged and intact;
 * Dream is soft-edged and coming apart." That sentence alone decided every
 * field here — `faceted_plane` and `clean` instead of anything that frays,
 * and `none` residue instead of Dream's lingering mist.
 */
const PSYCHIC: MaterialKit = {
  element: 'Psychic',
  family: 'umbral',
  silhouette: 'faceted_plane',
  edgeProfile: 'clean',
  particle: 'mote',
  impact: 'radial_burst',
  residue: 'none',
  chargeForm: 'motes',
  streamFlow: 'jet',
  palette: ['#7a3a9a', '#c44ab8', '#c896e8'],
  provisional: false,
  citesVisualLanguage: 'PSYCHIC',
};

/**
 * Moon — calm and orbital, borrowing Water's curved silhouette for the same
 * reason the Bible does: Moon's own symbolism field says "tides", tying it to
 * water's motion even though it is silver rather than blue.
 *
 * `clean` edge (unused by any other authored kit before this one) matches the
 * Bible's "calm-still" theme — nothing frays or foams, it simply glows.
 */
const MOON: MaterialKit = {
  element: 'Moon',
  family: 'primal',
  silhouette: 'cresting_ribbon',
  edgeProfile: 'clean',
  particle: 'mote',
  impact: 'foam_fan',
  residue: 'lingering_glow',
  chargeForm: 'motes',
  streamFlow: 'jet',
  palette: ['#c8d4e8', '#2a3a5a', '#f0f4ff'],
  provisional: false,
  citesVisualLanguage: 'MOON',
};

/**
 * Dream — a corrupted nightmare given form: a black-and-purple ghost.
 *
 * Redesigned 2026-08-02. The first pass inverted Shadow's near-black into an
 * iridescent PASTEL for a greyscale-safe value contrast — defensible on
 * paper, wrong in practice. Raheem, on review: "Dream is the worst one. It
 * has a very fantasy, happy, girly vibe at the moment, and it's supposed to
 * be dark, nightmarey. Dream is a very corrupted way of attacking people —
 * it brings their nightmares to life. Look at the element ID we made for
 * it. It's a black and purple ghost." The canonical Dream crystal
 * (`public/assets/elements/dream.jpg`) was never pastel; the material kit
 * should never have drifted from it.
 *
 * Still shares the broader umbral-dark family with Shadow, Void and
 * Nocturne, but is now told apart by SHAPE rather than by inverting value:
 * `coiling_ribbon` reads as a trailing spectral figure — a ghost's ragged
 * robe — where Shadow and Void are `fraying_smoke`, an abstract formless
 * column. `shard` particles (nightmare fragments) and `residue: 'none'`
 * (it vanishes completely once the horror passes, unlike Shadow's lingering
 * haze) keep the full signature distinct from Nocturne, which also uses
 * `coiling_ribbon`.
 */
const DREAM: MaterialKit = {
  element: 'Dream',
  family: 'umbral',
  silhouette: 'coiling_ribbon',
  edgeProfile: 'dissolving',
  particle: 'shard',
  impact: 'engulfing',
  residue: 'none',
  chargeForm: 'motes',
  streamFlow: 'wisp',
  palette: ['#0d0512', '#3a1550', '#a855e8'],
  provisional: false,
  citesVisualLanguage: 'DREAM',
};

/**
 * Bone — Necromancer's exclusive natural element, and the second material to
 * use `volley`: bones are discrete solid fragments, not a flowing body, per
 * Bible motion "bone-shards orbiting."
 *
 * `splintering` impact is a literal read of "bones assembling and rattling" —
 * this is the one kit in the table where the mechanical damage type
 * (`umbral`, from sharing a resolved shape with the dead) and the visual
 * material agree completely.
 */
const BONE: MaterialKit = {
  element: 'Bone',
  family: 'umbral',
  silhouette: 'fibrous_bundle',
  edgeProfile: 'barbed',
  particle: 'shard',
  impact: 'splintering',
  residue: 'none',
  chargeForm: 'motes',
  streamFlow: 'volley',
  palette: ['#e8e0d0', '#8a8478', '#6ac4a8'],
  provisional: false,
  citesVisualLanguage: 'BONE',
};

/**
 * Nocturne — Vampire's OTHER exclusive element, and deliberately built to
 * share almost nothing with Blood beyond the silhouette, since the same
 * archetype can naturally hold both and they must not read as variations on
 * one look.
 *
 * Blood: heavy_rounded / droplet / wet_splash / dripping / pool / jet.
 * Nocturne: dissolving / mote / engulfing / lingering_glow / halo / wisp —
 * six of seven fields differ. The blood-moon itself supplies the `halo`
 * charge and the `engulfing` "dominating the sky" arrival.
 */
const NOCTURNE: MaterialKit = {
  element: 'Nocturne',
  family: 'umbral',
  silhouette: 'coiling_ribbon',
  edgeProfile: 'dissolving',
  particle: 'mote',
  impact: 'engulfing',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'wisp',
  palette: ['#4a0f18', '#8a1428', '#c4a8a8'],
  provisional: false,
  citesVisualLanguage: 'NOCTURNE',
};

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
const SANGUINE: MaterialKit = {
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
};

/**
 * Lunar — the SUPERIOR version of Moon, and the second kit whose core is
 * brighter than its edge (see Fire).
 *
 * Bible LUNAR is explicit that this must out-shine Moon: "far brighter than
 * Moon's soft glow... Lunar BLAZES, divine and radiant, never calm." So it
 * borrows Fire's fire-like shape language on purpose — `jagged_tongue`,
 * `tapering_forks`, `ember` — because the Bible calls it "silver-FIRE"
 * verbatim, and differs from actual Fire in the fields that matter most:
 * `refracting_flare` instead of a spreading sheet, `halo` instead of a bare
 * flame (the full-moon corona), `lingering_glow` instead of smouldering ash.
 */
const LUNAR: MaterialKit = {
  element: 'Lunar',
  family: 'primal',
  silhouette: 'jagged_tongue',
  edgeProfile: 'tapering_forks',
  particle: 'ember',
  impact: 'refracting_flare',
  residue: 'lingering_glow',
  chargeForm: 'halo',
  streamFlow: 'wisp',
  palette: ['#f0f4ff', '#a8c4e8', '#ffffff'],
  provisional: false,
  citesVisualLanguage: 'LUNAR',
};

/**
 * Plasma — Mech Pilot's sole forge-path element, and the one that earned a
 * dedicated `contained` charge form.
 *
 * Bible PLASMA will not let this be loose: "a caged plasma-sphere held in
 * glowing magnetic RINGS... CONTAINED not loose... NOT free lightning bolts,
 * NOT open orange flame." None of the other six charge forms carry that idea
 * — a pool spreads, a flame flickers freely — so this is a genuinely new
 * shape, not a recolour of Fire's or Storm's.
 */
const PLASMA: MaterialKit = {
  element: 'Plasma',
  family: 'tech',
  silhouette: 'smooth_bolt',
  edgeProfile: 'clean',
  particle: 'mote',
  impact: 'refracting_flare',
  residue: 'lingering_glow',
  chargeForm: 'contained',
  streamFlow: 'jet',
  palette: ['#e8f8ff', '#4a1a8a', '#8affff'],
  provisional: false,
  citesVisualLanguage: 'PLASMA',
};

/**
 * Nanite — Android's sole natural element, and the material the Bible is most
 * insistent about: "a SWARM of MANY small and medium robots... NEVER one big
 * machine."
 *
 * `volley` is the only delivery that can honestly carry that instruction — a
 * jet or a wisp is one continuous body, and Nanite is explicitly forbidden
 * from reading as one thing. Shares Sanguine's and Bone's "hard, thrown,
 * discrete" family on purpose (all three are solid fragments in flight); the
 * chrome/cyan palette is what keeps a robot swarm from reading as a hail of
 * bones or crystal.
 */
const NANITE: MaterialKit = {
  element: 'Nanite',
  family: 'tech',
  silhouette: 'faceted_shard',
  edgeProfile: 'clean',
  particle: 'shard',
  impact: 'radial_burst',
  residue: 'none',
  // "Crawling, flying and assembling in mid-air" — many small units
  // converging, the same visual grammar the charge tell already has for
  // motes, applied to machines instead of dust.
  chargeForm: 'motes',
  streamFlow: 'volley',
  palette: ['#c4c8cc', '#6a6e74', '#4ae8e8'],
  provisional: false,
  citesVisualLanguage: 'NANITE',
};

/**
 * Prism — Android's rare, and the most deliberately "manufactured" palette in
 * the table: white through cyan to magenta, spanning the visible spectrum the
 * way nothing else here does, per Bible: "iridescent rainbow-white, prismatic
 * full-spectrum, holographic cyan-magenta."
 *
 * Shares Holy's `faceted_plane` (both are crystal-adjacent radiant materials)
 * but takes a `clean` edge instead of Holy's organic `bevelled` glass — Bible
 * PRISM insists on reading "STRIKING and CLEARLY MANUFACTURED", never like
 * stained glass.
 */
const PRISM: MaterialKit = {
  element: 'Prism',
  family: 'radiant',
  silhouette: 'faceted_plane',
  edgeProfile: 'clean',
  particle: 'shard',
  impact: 'refracting_flare',
  residue: 'lingering_glow',
  chargeForm: 'motes',
  streamFlow: 'wisp',
  palette: ['#f8f4ff', '#4ae8c8', '#e84ac8'],
  provisional: false,
  citesVisualLanguage: 'PRISM',
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
 *
 * Only `Time` still draws on these — see the coverage note at the top of this
 * file for why that is a deliberate choice and not an oversight.
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
  Fire: FIRE,
  Water: WATER,
  Earth: EARTH,
  Wind: WIND,
  Ice: ICE,
  Storm: STORM,
  Nature: NATURE,
  Beast: BEAST,
  Blood: BLOOD,
  Poison: POISON,
  Metal: METAL,
  Spirit: SPIRIT,
  Shadow: {
    /**
     * Shadow — the hardest no-colour test in the game so far.
     *
     * Blood, Shadow, Void, Bone, Nocturne, Sanguine, Dream, Psychic and
     * Infernal ALL resolve as `umbral` damage. If any two of them are
     * separable only by hue, the whole material axis is decoration. So
     * Shadow is authored as the structural opposite of Blood, the one it is
     * most likely to be confused with:
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
  Light: LIGHT,
  Holy: HOLY,
  Void: VOID,
  Time: fromFamily('Time', 'astral'),
  Cosmic: COSMIC,
  Psychic: PSYCHIC,
  Moon: MOON,
  Dream: DREAM,
  Bone: BONE,
  Nocturne: NOCTURNE,
  Sanguine: SANGUINE,
  Lunar: LUNAR,
  Plasma: PLASMA,
  Nanite: NANITE,
  Prism: PRISM,
  /**
   * Infernal — molten rock, and the one element whose art arrived by
   * accident.
   *
   * A "Fire" set was generated that came back as lava: a solid
   * black-and-orange band, a spiked starburst, heavy and mineral. Raheem's
   * call on seeing it (2026-08-01): "that is Inferno — lava, rocks, a lava
   * puddle that pops up, a black and orange stream, then it hits with a
   * spark." So it was rehomed here rather than discarded, and Fire was
   * re-briefed as something airy.
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

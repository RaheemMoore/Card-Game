import type { ElementName } from '../../../types/bible';
import type { DamageType } from '../../../types/abilities';

/**
 * The Ability Performance System's type contract.
 *
 * The governing idea is that a performance is composed from TWO INDEPENDENT
 * AXES:
 *
 *     delivery form × material/element = ability performance
 *
 * `form` is what the ability DOES in space — a lash travels along a curve and
 * snaps, a growth emerges in stages from the ground, a barrier interposes and
 * persists. `material` is what it is MADE OF — blood is viscous and drips,
 * water crests and splashes, fire licks upward and scatters embers.
 *
 * Keeping them independent is the whole point. Before this system every attack
 * in the game drew the same rotated gradient bar coloured by `DamageType`
 * (see the pre-existing `AttackVFX.tsx`), which meant Blood, Void and Bone —
 * three unrelated elements that happen to share the `umbral` damage type —
 * were literally the same violet streak. Damage type is MECHANICAL. It decides
 * resistances and numbers. It must never decide what something looks like.
 *
 * The corollary is that material comes from the CASTER'S CARD, not from the
 * ability. `AbilityDefinition` carries no element and deliberately never will:
 * the same Rootgrasp legitimately looks like grasping roots cast by a Nature
 * druid and like something else entirely cast by a Blood vampire, because the
 * caster is what supplies the substance.
 */

/* ------------------------------------------------------------------ */
/*  Axis 1 — delivery form                                             */
/* ------------------------------------------------------------------ */

/**
 * How an ability delivers itself through space.
 *
 * Deliberately narrowed to the six shapes Delivery 1 actually proves. The
 * original design sketch listed eleven (adding `wave`, `eruption`, `summon`,
 * `field`, `weapon_strike`); those are real shapes and will land, but a form
 * with no renderer behind it is a promise, not a type. Add one when its
 * renderer is written, so the union is always an honest inventory of what the
 * game can draw.
 */
export type AbilityForm =
  | 'lash'
  | 'projectile'
  | 'growth'
  | 'barrier'
  | 'drain'
  | 'generic';

/* ------------------------------------------------------------------ */
/*  Axis 2 — material                                                  */
/* ------------------------------------------------------------------ */

/**
 * The combat-side visual identity of one element.
 *
 * This is AUTHORED, not derived. `data/elementVisualLanguage.ts` is the
 * canonical Bible for how an element looks, but it is a Leonardo
 * prompt-assembly module: 29 elements × 12 fields of English prose
 * (`materials: 'lava, magma, molten iron, ...'`). A renderer cannot consume
 * prose. So each kit below is written BY HAND from those fields, with the
 * source fields cited in a comment, and the two are kept in step by review
 * rather than by code. Deriving one from the other is not possible; pretending
 * otherwise would produce a parser that silently degrades to mush.
 *
 * Bible principle this must satisfy, verbatim: "Every element should be
 * recognizable even without color." That is why `silhouette`, `edgeProfile`,
 * `particle`, `impact` and `residue` all exist and why colour is last. If two
 * kits differ only in `palette`, the kit is not finished.
 */
export interface MaterialKit {
  /** The element this kit renders. */
  element: ElementName;
  /**
   * Which broad family this kit falls back FROM, when an element has no
   * authored kit of its own. Never used to choose colour — only to pick a
   * plausible motion/silhouette default.
   */
  family: MaterialFamily;
  /** Outline character of the delivery body. The primary no-colour read. */
  silhouette: MaterialSilhouette;
  /** How the body's edge behaves along its length. */
  edgeProfile: MaterialEdgeProfile;
  /** Shape of the secondary particles this material sheds. */
  particle: MaterialParticle;
  /** Character of the moment of contact. */
  impact: MaterialImpact;
  /** What is left behind afterwards, if anything. */
  residue: MaterialResidue;
  /**
   * How the material GATHERS at the cast point before firing.
   *
   * Added after the charge tell shipped drawing a pool for everything, which
   * was a liquid assumption hiding in what looked like a generic component.
   * Fire does not puddle — it catches and flickers. Nature does not puddle —
   * the ground stirs. Getting this wrong makes every element feel like the
   * same substance in a different colour, which is the exact failure this
   * whole axis exists to prevent.
   */
  chargeForm: ChargeForm;
  /**
   * How the delivery BODY behaves along its length.
   *
   * `jet` is pressurised and coherent — blood, water, lava. `wisp` is airy and
   * blown, undulating and semi-transparent, layered rather than solid — fire
   * and wind. The same tiled texture reads completely differently under the
   * two, which is what stops every stream looking like a hose.
   */
  streamFlow: StreamFlow;
  /**
   * Core / edge / accent. Reinforces identity; never establishes it.
   * Ordered dark-to-light is NOT guaranteed — fire is bright-cored and
   * dark-edged, blood is the reverse.
   */
  palette: readonly [core: string, edge: string, accent: string];
  /**
   * Colour for the material's STRUCTURAL parts, when they differ from the
   * living ones.
   *
   * Exists because Nature's roots were being drawn in leaf-green. Raheem, on
   * review: "the roots that pop out the ground should be brown, not green. The
   * plant's green. Roots are brown." He is right, and the Bible agrees — Nature
   * lists brown and amber among its secondary colours. Wood, bark, bone and
   * metal armature are structure; foliage, flame and blood are not. Optional,
   * because most materials have no structural part at all.
   */
  structure?: string;
  /**
   * True when this kit is a family default rather than authored art
   * direction. Surfaced in the Ability Theater so the debt is visible instead
   * of quietly shipping as if it were finished.
   */
  provisional: boolean;
  /** Which `elementVisualLanguage.ts` entry this was authored from. */
  citesVisualLanguage: string;
}

export type MaterialFamily =
  | 'searing'
  | 'primal'
  | 'radiant'
  | 'umbral'
  | 'tech'
  | 'astral'
  | 'kinetic';

/**
 * What appears at the cast point while an ability is being held.
 *
 * `pool` was the original and only option, which is why Fire briefly charged
 * with a puddle of flame. A material that is not a liquid must not gather like
 * one.
 */
export type ChargeForm =
  /** Liquid collects and hangs. Blood, water, lava. */
  | 'pool'
  /** A flame catches and flickers upward. Fire. */
  | 'flame'
  /** The ground stirs and cracks. Earth. */
  | 'ground'
  /**
   * A plant grows and opens. Nature.
   *
   * Raheem's brief, 2026-08-01: "a plant blooms, and then the roots reach out
   * of the plant, go toward the boss, and spread." So Nature's tell is a thing
   * that GREW, and the delivery visibly comes out of it — which is a stronger
   * causal read than any other element has, and worth keeping distinct from
   * `ground` (soil stirring, which belongs to Earth).
   */
  | 'bloom'
  /** Light assembles into a ring. Holy, light. */
  | 'halo'
  /** Motes converge on a point. The neutral fallback. */
  | 'motes'
  /**
   * Liquid hardens into facets. Sanguine.
   *
   * The lore beat made visible: a vampire with the strength to crystallise
   * their own blood. It starts as a pool like Blood's and then sets, which is
   * the one charge tell that CHANGES STATE while you watch it rather than
   * simply growing.
   */
  | 'crystallize'
  /**
   * A sphere held inside visible rings. Plasma.
   *
   * Bible PLASMA is emphatic that this energy is never loose: "a caged
   * plasma-sphere held in glowing magnetic RINGS ... CONTAINED not loose."
   * None of the other six forms carry that idea — a pool spreads, a flame
   * flickers freely, a halo is the ring with nothing inside it. Plasma is a
   * ring holding something down, and that containment is the whole read for
   * a faction whose entire identity (Bible METAL/PLASMA/NANITE) is "engineered
   * power, never open flame."
   */
  | 'contained';

/** How the travelling body behaves along its length. */
export type StreamFlow =
  /** Pressurised and coherent — a hose. Blood, water, lava. */
  | 'jet'
  /** Airy, blown, undulating and layered — windswept. Fire. */
  | 'wisp'
  /**
   * Grows along its path and stays. Nature.
   *
   * The distinction that matters: a jet and a wisp both have material moving
   * THROUGH a body that is already there, so they scroll. A root does not
   * flow — it IS the reaching. So a creep barely scrolls at all; what changes
   * is how much of it exists, and once grown it holds rather than streaming.
   */
  | 'creep'
  /**
   * Discrete solid bodies thrown in sequence. Sanguine.
   *
   * The one delivery here that is not a continuous body at all. A jet, a wisp
   * and a creep are all ONE thing spanning the gap; a volley is several
   * separate things crossing it one after another, with air between them.
   *
   * Crystal cannot flow, blow or grow, so none of the existing three could
   * carry it — and the gaps are the read: you see individual shards leave, fly
   * and land, which is what makes it feel thrown rather than poured.
   */
  | 'volley';

export type MaterialSilhouette =
  | 'coiling_ribbon'
  | 'cresting_ribbon'
  | 'jagged_tongue'
  | 'fibrous_bundle'
  | 'faceted_plane'
  | 'smooth_bolt'
  /** Hard angular facets with flat planes and sharp corners. Sanguine. */
  | 'faceted_shard'
  /**
   * Soft, formless, with an edge that frays into nothing. Shadow.
   *
   * The point of it is that it has no edge at all, which is the one thing no
   * other silhouette here does — everything else is defined by its outline.
   */
  | 'fraying_smoke'
  /**
   * A chunky, blocky mass — heavy plates of material rather than a taper or a
   * ribbon. Earth.
   *
   * Bible EARTH shapes, verbatim: "blocky-heavy, columnar, angular." Nothing
   * else in the set is heavy in that way — the closest neighbour,
   * `coiling_ribbon`, is heavy but round and flowing; this is heavy and rigid.
   */
  | 'jagged_block'
  /**
   * A forked, angular zigzag rather than a smooth taper. Storm.
   *
   * Distinct from `jagged_tongue` on purpose: fire's tongue is a continuous
   * curve that happens to fork at the tip, where lightning is a hard-angled
   * branch its whole length — Bible STORM shapes: "spiraling, chaotic-
   * billowing, forked" with textures "lightning-arc."
   */
  | 'branching_bolt';

export type MaterialEdgeProfile =
  | 'heavy_rounded'
  | 'foam_crest'
  | 'tapering_forks'
  | 'barbed'
  | 'bevelled'
  | 'clean'
  /** Frays and thins into nothing rather than terminating. Shadow. */
  | 'dissolving'
  /** Broken into discrete blocky notches, like fractured rock. Earth. */
  | 'chunky';

export type MaterialParticle =
  | 'droplet'
  | 'spray'
  | 'ember'
  | 'leaf'
  | 'shard'
  | 'mote';

export type MaterialImpact =
  | 'wet_splash'
  | 'foam_fan'
  | 'ember_burst'
  | 'splintering'
  | 'refracting_flare'
  | 'radial_burst'
  /**
   * A low, wide sheet that spreads ALONG the surface it hits. Fire.
   *
   * Added because Fire and Infernal were otherwise structurally identical —
   * same silhouette, edge, particle, impact and residue — which meant the only
   * thing telling them apart was hue, the one thing the Bible says must never
   * carry identity. They are genuinely different events: flame crawls outward
   * across a surface, molten rock detonates off it.
   */
  | 'spreading_sheet'
  /**
   * Billows outward and hangs, swallowing what it covers. Shadow.
   *
   * Every other impact here is an EVENT that resolves. This one is a thing
   * that arrives and stays over the target, which is the read Shadow needs
   * and the reason it does not simply reuse `radial_burst`.
   */
  | 'engulfing'
  /**
   * Debris scattered irregularly outward, rather than a clean ring. Wind.
   *
   * `radial_burst` is even in every direction; a gust throws leaves and dust
   * unevenly, which is what separates "something exploded" from "something
   * was blown through."
   */
  | 'gust_scatter'
  /**
   * A sharp many-pointed star, more pointed than `ember_burst`'s rounder
   * spikes. Light.
   *
   * Needed once Light and Holy both wanted `refracting_flare` for their
   * radiant payoff — the two are lore-cousins and are allowed to share most of
   * their vocabulary, but the moment of contact is the single most-seen frame
   * of a performance and could not be identical for both.
   */
  | 'sunburst';

export type MaterialResidue =
  | 'dripping'
  | 'misting'
  | 'smouldering'
  | 'binding'
  | 'lingering_glow'
  | 'none';

/* ------------------------------------------------------------------ */
/*  Stages                                                             */
/* ------------------------------------------------------------------ */

/**
 * The beats a performance moves through.
 *
 * A stage is a SLOT, not a duration — the stage plan assigns each authoritative
 * consequence to the stage it belongs in, so damage lands on `impact` and a
 * lifesteal heal lands on `arrival`, which is what makes Sanguine Tithe read as
 * "take, carry back, gain" rather than as two numbers appearing at once.
 */
export type PerformanceStage =
  | 'charge'
  | 'cast'
  | 'travel'
  | 'manifest'
  | 'impact'
  | 'return'
  | 'arrival'
  | 'aftermath'
  | 'recover';

export type PerformanceIntensity = 'normal' | 'heavy' | 'ultimate';

/** One stage of an authored recipe. */
export interface StageRecipe {
  stage: PerformanceStage;
  /** Nominal duration at full motion, ms. Reduced motion re-times, not skips. */
  durationMs: number;
  /**
   * Which consequence kinds may resolve during this stage. The stage planner
   * places a scope member in the FIRST stage that accepts its kind, so order
   * within the recipe is meaningful.
   */
  accepts: readonly ConsequenceKind[];
}

/**
 * The categories of authoritative consequence a performance can present.
 * A narrowing of `BattleEvent['kind']` down to the ones that are visible.
 */
export type ConsequenceKind =
  | 'damage'
  | 'healing'
  | 'shield'
  | 'status_applied'
  | 'status_removed'
  | 'resource'
  | 'defeat';

/* ------------------------------------------------------------------ */
/*  Recipes                                                            */
/* ------------------------------------------------------------------ */

/** A named point on the battlefield. Renderers ask for these by name and
 *  never compute a percentage themselves — see `pages/battle/combatAnchors.ts`. */
export type AnchorName =
  | 'boss_center'
  | 'boss_feet'
  | 'boss_ground'
  | 'caster_card'
  | 'caster_card_edge'
  | 'caster_card_front'
  | 'target_card'
  | 'target_card_front';

/**
 * How a recipe decides which material to use.
 *
 * `caster_element` is the default and the confirmed direction: the material is
 * whatever the casting card's live element is. `fixed` exists for the rare
 * ability whose substance is authored into the ability itself regardless of who
 * casts it.
 */
export type MaterialResolver =
  | { kind: 'caster_element' }
  | { kind: 'fixed'; element: ElementName };

/**
 * The PATH the delivery takes between cast point and target.
 *
 * Separate from `form` because one form supports several. A lash can be
 * cracked like a whip, fired like a hose, or lobbed in an arc, and those are
 * three completely different reads of the same ability — but they share all the
 * spline, tracking and impact code.
 *
 * Added after the first review: the whip trajectory's wobble, seen frozen
 * mid-flight, read as "a squiggle" rather than as something being thrown. A
 * travelling effect has to be legible as TRAVELLING, and for a pressurised
 * material like blood under force, a directed stream says that far better than
 * an undulating ribbon does.
 */
export type Trajectory =
  /** Straight, pressurised, barely any lateral play. A hose or a beam. */
  | 'beam'
  /** Thrown in a ballistic arc. Reads as weight and distance. */
  | 'arc'
  /** Cracked sideways like a whip. The original lash motion. */
  | 'whip';

export interface AbilityPerformanceRecipe {
  id: string;
  version: number;
  /** Set when this recipe is the exact match for one authored ability. */
  abilityDefinitionId?: string;
  form: AbilityForm;
  /** How it crosses the gap. Defaults per form when omitted. */
  trajectory?: Trajectory;
  material: MaterialResolver;
  stages: readonly StageRecipe[];
  /** Optional asset kit id, resolved through `assetKits.ts`. */
  assetKitId?: string;
  castAnchor: AnchorName;
  targetAnchor: AnchorName;
  /** `'derive'` reads the beat severity the queue already computed. */
  intensity: PerformanceIntensity | 'derive';
  /** Recipe to use when this one's assets are unavailable. */
  fallbackRecipeId: string;
  approvalStatus: 'placeholder' | 'candidate' | 'approved';
}

/* ------------------------------------------------------------------ */
/*  Resolved output                                                    */
/* ------------------------------------------------------------------ */

/** One authoritative consequence, placed on a stage. */
export interface PlacedConsequence {
  kind: ConsequenceKind;
  stage: PerformanceStage;
  /** Index into the raw event array — the audit trail back to the reducer. */
  eventIndex: number;
  targetActorId?: string;
  amount?: number;
  damageType?: DamageType;
  statusId?: string;
}

/** A stage with its consequences and resolved timing. */
export interface PlannedStage {
  stage: PerformanceStage;
  durationMs: number;
  startMs: number;
  consequences: readonly PlacedConsequence[];
}

/**
 * Everything a renderer needs, and nothing it does not. Deliberately carries
 * no `BattleState` and no `Card` — a renderer that can reach the card store can
 * accidentally read live data mid-animation, which is how a cosmetic layer
 * starts disagreeing with the frozen snapshot the reducer used.
 */
export interface ResolvedPerformance {
  /** Stable across replays of the same scope — used as the React key. */
  id: string;
  recipeId: string;
  form: AbilityForm;
  trajectory: Trajectory;
  material: MaterialKit;
  intensity: PerformanceIntensity;
  castAnchor: AnchorName;
  targetAnchor: AnchorName;
  stages: readonly PlannedStage[];
  totalMs: number;
  /** True when resolution fell below precedence level 2 — visible debt. */
  isFallback: boolean;
  /** Why, when `isFallback`. Shown in the Ability Theater readout. */
  fallbackReason?: string;
}

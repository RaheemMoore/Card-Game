import type { AbilityForm } from '../../../services/combat/performance/types';
import type { ElementName } from '../../../types/bible';
import { resolveCombatAssetPath } from '../types';

/**
 * Effect-art manifest for the Ability Performance System.
 *
 * ## Nothing here is generated yet
 *
 * Every row is `approvalStatus: 'placeholder'` and every `path` points at a
 * file that does not exist. That is deliberate and is the whole shape of
 * Delivery 1: the renderers must be able to draw a complete, reviewable
 * performance from CODE alone, with art as an enhancement that slots in later.
 * A renderer that only works once its PNG lands is a renderer that cannot be
 * reviewed before money is spent.
 *
 * `assetAvailable()` therefore returns false for every row today, and every
 * renderer takes its procedural path. When PixelLab assets land in Delivery 3
 * the rows flip to `'candidate'` and the same renderers start compositing them
 * without further change.
 *
 * ## Provenance is not optional
 *
 * The `provenance` block is required on any row that reaches `'candidate'`.
 * The acquisition contract is explicit: preserve tool, job/object id, seed,
 * prompt/config, size, frame count, direction, cost, and candidate choice.
 * PixelLab download URLs are provenance, NEVER a runtime dependency — assets
 * are downloaded into `/public/assets/combat/` and the shipped game never
 * touches a remote URL.
 */

export type PerformanceAssetKind =
  /** One transparent frame. Position/rotation/scale animated in code. */
  | 'still'
  /** A small set of discrete condition states — intact/cracked/shattered. */
  | 'state_set'
  /** Real internal deformation across frames — flame flicker, water churn. */
  | 'flipbook';

export interface PerformanceAssetProvenance {
  provider: 'pixellab' | 'leonardo' | 'code';
  /** The exact MCP tool or script that produced it. */
  tool: string;
  jobOrObjectId?: string;
  seed?: number;
  /** Repo-relative path to the prompt or config that produced it. */
  promptOrConfigPath?: string;
  /** Generations charged. */
  generationCost?: number;
  selectedCandidate?: number;
  rejectionReason?: string;
}

export interface PerformanceAsset {
  id: string;
  kind: PerformanceAssetKind;
  /** Resolves against `/assets/combat/`. */
  path: string;
  dimensions: { width: number; height: number };
  /** Origin within the frame, in px — where the piece attaches to its path. */
  pivot: { x: number; y: number };
  frameCount?: number;
  fps?: number;
  loop?: boolean;
  /**
   * Frames as SEPARATE files, rather than one packed strip.
   *
   * Packed strips are the norm and `SpriteClipPlayer` steps them by offsetting
   * a background — but that technique needs `background-repeat: no-repeat`,
   * which is exactly what a TILED stream cannot use. A stream repeats along its
   * length, so the frame has to be selectable independently of the tiling, and
   * the simplest correct way to do that is one file per frame swapped on an
   * `<img>` src. The browser caches all of them after the first pass.
   *
   * Also the pragmatic choice: PixelLab's `animate_image` returns frames as
   * individual images, and this repo has no image-composition dependency to
   * pack them with.
   */
  frames?: readonly string[];
  intendedForms: readonly AbilityForm[];
  intendedMaterials: readonly ElementName[];
  approvalStatus: 'placeholder' | 'candidate' | 'approved' | 'rejected';
  provenance?: PerformanceAssetProvenance;
  notes?: string;
}

export interface PerformanceAssetKit {
  id: string;
  form: AbilityForm;
  element: ElementName;
  /** The travelling body's leading piece. */
  head?: PerformanceAsset;
  /**
   * A tileable texture for a continuous stream body, scrolled along the path.
   *
   * Distinct from `segment` on purpose. A `segment` is a discrete piece placed
   * at intervals — the Batch A approach, which failed because the generator
   * returns finished objects with closed ends that will not butt together. A
   * `stream` is a texture that only has to repeat in one axis, and mirror-
   * tiling makes that seam unconditionally invisible. Different contract,
   * different slot, so the two can never be confused at a call site.
   */
  stream?: PerformanceAsset;
  /** Burst at the cast point, where the effect leaves the card. */
  muzzle?: PerformanceAsset;
  /**
   * What gathers on the card while the ability is held.
   *
   * Usually absent — the charge tell is drawn procedurally from the material
   * kit and costs nothing. It exists for the case where the charge should be
   * visibly THE SAME OBJECT as something the ability later produces: Nature's
   * card plant and the plant that blooms on the boss are one design, at two
   * sizes, so that the player reads the second as having come from the first.
   * Pointing both slots at the same files is the cheapest way to say that, and
   * it says it in data rather than in a renderer.
   */
  charge?: PerformanceAsset;
  /** A repeated segment laid along the path. */
  segment?: PerformanceAsset;
  /** Shed particles. */
  particle?: PerformanceAsset;
  /** The contact burst. */
  impact?: PerformanceAsset;
  /** What remains afterwards. */
  residue?: PerformanceAsset;
}

/**
 * Placeholder rows for the three lash materials the pilot compares, plus the
 * growth and barrier pilots.
 *
 * Sizes and pivots are the SPEC the generation phase will be held to, not
 * measurements of anything that exists — writing them now is what lets the
 * renderers lay out real geometry today and makes Gate 3's cost proposal
 * concrete rather than hand-waved.
 */
const placeholder = (
  id: string,
  kind: PerformanceAssetKind,
  path: string,
  width: number,
  height: number,
  forms: readonly AbilityForm[],
  materials: readonly ElementName[],
): PerformanceAsset => ({
  id,
  kind,
  path,
  dimensions: { width, height },
  pivot: { x: Math.round(width / 2), y: Math.round(height / 2) },
  intendedForms: forms,
  intendedMaterials: materials,
  approvalStatus: 'placeholder',
  notes: 'Spec only — no file on disk. Renderers use their procedural path.',
});

export const PERFORMANCE_ASSET_KITS: Record<string, PerformanceAssetKit> = {
  lash_blood: {
    id: 'lash_blood',
    form: 'lash',
    element: 'Blood',
    // Batch B, 2026-08-01. A continuous band rather than a piece — the prompt
    // asked for "no ends, no tip, no tapering", which is what finally got a
    // texture back instead of an object.
    stream: {
      id: 'lash_blood_stream',
      kind: 'flipbook',
      path: 'effects/lash/blood/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/blood/stream-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Blood'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'a3feb0b1-39c7-47db (still) / 288ba71c-0d31-4fb6 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#blood_stream_strip',
      },
      notes:
        'Tiled with mirror-flipping and scrolled along the beam; frames swap on the tiles ' +
        'for internal churn. `path` is frame 0, used when motion is off.',
    },
    segment: placeholder('lash_blood_segment', 'still', 'effects/lash/blood/segment.png', 32, 32, ['lash', 'drain'], ['Blood']),
    particle: placeholder('lash_blood_droplet', 'still', 'effects/lash/blood/droplet.png', 16, 16, ['lash', 'drain'], ['Blood']),
    // First real asset in the game. Batch A, 2026-08-01 — the one probe of six
    // that worked, and it worked because an impact IS a self-contained object,
    // which is exactly what PixelLab returns when you ask for a fragment.
    impact: {
      id: 'lash_blood_impact',
      kind: 'still',
      path: 'effects/lash/blood/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Blood'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '439190a0-403e-47ed-a075-d11fd659b50d',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#blood_impact_pixen64',
      },
      notes:
        'Radial splatter, heavy rounded droplets, wet highlight. Reads as blood rather than ' +
        'a generic red burst, and survives the colour being removed.',
    },
  },
  /*
   * Water — Batch C, 2026-08-01. Four generations, and NO code changed to
   * support it: the renderers read the manifest, so a new element is a data
   * change. That is the payoff for the form/material split, and it is the
   * cheapest possible evidence that the split was worth making.
   */
  lash_water: {
    id: 'lash_water',
    form: 'lash',
    element: 'Water',
    stream: {
      id: 'lash_water_stream',
      kind: 'flipbook',
      path: 'effects/lash/water/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/water/stream-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Water'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '4e8d8d15-9ba9 (still) / fae1eb10-ef49 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#water_stream_strip',
      },
      notes:
        'Rolling foam crests along the top edge — the cue that separates it from Blood in ' +
        'greyscale, where Blood is a smooth beaded band. Faster fps than Blood: water is thin.',
    },
    impact: {
      id: 'lash_water_impact',
      kind: 'flipbook',
      path: 'effects/lash/water/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/water/impact-f${i}.png`),
      frameCount: 9,
      fps: 18,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Water'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '61a3ca07-4d3b (still) / e5053dab-b989 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#water_impact',
      },
      notes:
        'An upward crown rather than Blood radial splatter — water throws itself up and ' +
        'outward off a surface. Does not loop: a splash resolves once.',
    },
    particle: placeholder('lash_water_spray', 'still', 'effects/lash/water/spray.png', 16, 16, ['lash'], ['Water']),
  },
  /*
   * Fire — Batch E, 2026-08-01, and a re-brief rather than a first attempt.
   *
   * The first "Fire" set came back as lava and became Infernal below. Raheem's
   * correction: "this one is a fire, not a liquid ... more of a wind flowing
   * looking beam, more airy, more wispy than watery," and an impact that is
   * "a little spread of flames instead of a firecracker."
   *
   * So this kit is deliberately the opposite of Infernal in every structural
   * field except family: `chargeForm: 'flame'` rather than a pool,
   * `streamFlow: 'wisp'` rather than a jet, a low spreading impact rather than
   * a starburst. Two elements in the same damage family sharing none of their
   * behaviour is the clearest proof the material axis does real work rather
   * than tinting.
   */
  lash_fire: {
    id: 'lash_fire',
    form: 'lash',
    element: 'Fire',
    stream: {
      id: 'lash_fire_stream',
      kind: 'flipbook',
      path: 'effects/lash/fire/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/fire/stream-f${i}.png`),
      frameCount: 9,
      fps: 20,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Fire'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '98af3835-58f6 (still) / ef54825c-a406 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#fire_stream_wispy',
      },
      notes:
        'Thin feathery streamers, generated with outline `lineless` — the outline setting ' +
        'that made every other tile solid is a large part of why fire looked like a hose. ' +
        'Rendered with the wisp flow: translucent, glowing, per-tile undulation.',
    },
    impact: {
      id: 'lash_fire_impact',
      kind: 'flipbook',
      path: 'effects/lash/fire/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/fire/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Fire'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'de0b4445-63e8 (still) / 8c09a86e-e823 (animation)',
        seed: 4412,
        generationCost: 3,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt (674c60bc) came back as a radial starburst — the firecracker read ' +
          'that was rejected. The reroll needed explicit negations: NOT a star, NOT radial, ' +
          'NOT symmetrical, wider than it is tall.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#fire_impact_spread',
      },
      notes:
        'A low wide sheet of flame with tongues licking up — fire spreads along a surface ' +
        'rather than detonating off it.',
    },
    particle: placeholder('lash_fire_ember', 'still', 'effects/lash/fire/ember.png', 16, 16, ['lash'], ['Fire']),
  },

  /*
   * Sanguine — Batch H, 2026-08-01. The first SOLID material.
   *
   * Note the `stream` slot holds a 32px SHARD rather than a 128x32 band. That
   * is not an inconsistency: a volley is discrete objects, so its "stream" is
   * one object repeated through the air, not a texture repeated along a line.
   * The slot means "what the delivery is made of", and for a volley that is a
   * thing rather than a strip.
   *
   * It also plays to the generator's strength. The lesson from Batch A was
   * that PixelLab insists on returning finished objects with resolved edges,
   * which is why lash segments failed — but a crystal shard SHOULD be exactly
   * that, so the failure mode becomes the feature.
   */
  lash_sanguine: {
    id: 'lash_sanguine',
    form: 'lash',
    element: 'Sanguine',
    stream: {
      id: 'lash_sanguine_shard',
      kind: 'still',
      path: 'effects/lash/sanguine/stream.png',
      dimensions: { width: 32, height: 32 },
      pivot: { x: 16, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Sanguine'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: 'fe32b415-19a4',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#sanguine_shard',
      },
      notes:
        'One shard, thrown five times with a stagger and a tumble. A still rather than a ' +
        'flipbook because a crystal has no internal motion — it is rigid, and animating it ' +
        'would contradict the material.',
    },
    impact: {
      id: 'lash_sanguine_impact',
      kind: 'still',
      path: 'effects/lash/sanguine/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Sanguine'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: 'f9cd9cf2-f929',
        seed: 4412,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#sanguine_impact',
      },
      notes:
        'Angular fragments bursting outward. Watch item: it is radial like Infernal’s ' +
        'starburst — the separator is geometric facets against glowing rays, which is a real ' +
        'difference but a narrower one than the rest of the set enjoys.',
    },
  },

  /*
   * Shadow — Batch G, 2026-08-01. Authored to be the structural opposite of
   * Blood, because the two share the `umbral` damage type and would otherwise
   * be separable only by hue. See the Shadow entry in materialKits.ts.
   */
  lash_shadow: {
    id: 'lash_shadow',
    form: 'lash',
    element: 'Shadow',
    stream: {
      id: 'lash_shadow_stream',
      kind: 'flipbook',
      path: 'effects/lash/shadow/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/shadow/stream-f${i}.png`),
      frameCount: 9,
      fps: 12,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Shadow'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '929a61ee-1122 (still) / 2794ecc6-884b (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#shadow_stream',
      },
      notes:
        'Generated `lineless` like Fire — the setting that stops a tile reading as a solid ' +
        'object. Near-black with almost no specular, which is what separates it from Blood ' +
        'in greyscale where hue cannot help.',
    },
    /*
     * Still, NOT a flipbook — deliberately, and only for now.
     *
     * Two impacts were rejected before this one, both for the same reason: they
     * came back as weather. "It's okay for it to look like a cloud or a haze,
     * but not that little tail coming down from it. Shadow is not weather."
     * The word `cloud` in a prompt reliably produces a cloud WITH A BASE and
     * something hanging off it, and adding "no rain, no tail" did not shift it.
     * Dropping the word entirely and asking for ink dispersing in water did.
     *
     * Held as a still until the SHAPE is approved. Animating an unapproved
     * shape is how you pay twice.
     */
    impact: {
      id: 'lash_shadow_impact',
      kind: 'still',
      path: 'effects/lash/shadow/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Shadow'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: 'ae983f8a-ca1f',
        seed: 5150,
        generationCost: 3,
        selectedCandidate: 3,
        rejectionReason:
          'v1 (74c32545) and v2 (fb6abd40) both returned a cloud with a hanging tail — read ' +
          'as a storm, and Shadow is not weather. Rejected frames kept under ' +
          '_candidates/batch-g/rejected.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#shadow_impact',
      },
      notes:
        'Curling tendrils radiating outward. Open question for review: the even radial ' +
        'symmetry may read as tentacles rather than as wisps.',
    },
  },

  /*
   * Infernal — the lava set. Was generated as "Fire" and rehomed here; see the
   * Infernal entry in materialKits.ts for the full story.
   */
  lash_infernal: {
    id: 'lash_infernal',
    form: 'lash',
    element: 'Infernal',
    stream: {
      id: 'lash_infernal_stream',
      kind: 'flipbook',
      path: 'effects/lash/infernal/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/infernal/stream-f${i}.png`),
      frameCount: 9,
      fps: 18,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Infernal'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '3eaf75f7-e992 (still) / ff35770c-ca40 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#infernal_stream_strip',
      },
      notes:
        'Jagged tongues licking upward along the top edge — against Water rounded foam ' +
        'crests and Blood smooth beads. Fastest fps of the three: fire is the least coherent.',
    },
    impact: {
      id: 'lash_infernal_impact',
      kind: 'flipbook',
      path: 'effects/lash/infernal/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/infernal/impact-f${i}.png`),
      frameCount: 9,
      fps: 18,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Infernal'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'b8626cb3-7305 (still) / e0b8333f-01e0 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#infernal_impact',
      },
      notes:
        'A spiked starburst — against Water upward crown and Blood flat splatter. Three ' +
        'impacts, three silhouettes, no colour required to tell them apart.',
    },
    particle: placeholder('lash_infernal_ember', 'still', 'effects/lash/infernal/ember.png', 16, 16, ['lash'], ['Fire']),
  },
  /*
   * Nature — Batch F, 2026-08-01, and the only element that does not travel.
   *
   * Roots erupt from the ground around the boss rather than being fired at it.
   * Raheem reversed onto this deliberately: "that's kinda different — it would
   * make this element stand out from the other elements a lot."
   *
   * Note the slots are reused rather than renamed. `stream` is a tileable band
   * of roots, and it is used here as the WRAP around the target — wrapping is
   * the same problem as running along a path, a texture repeated over an
   * arbitrary span, so it needs no new contract. `impact` is the plant that
   * forms on the boss.
   */
  growth_nature: {
    id: 'growth_nature',
    form: 'growth',
    element: 'Nature',
    stream: {
      id: 'growth_nature_wrap',
      kind: 'flipbook',
      path: 'effects/growth/nature/wrap.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/growth/nature/wrap-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['growth'],
      intendedMaterials: ['Nature'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '5cbe54bc-b052 (still) / 5f6125dc-3522 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nature_wrap',
      },
      notes:
        'Interwoven roots with leaves. Slowest fps in the set — vines writhe, they do not ' +
        'churn. Tiled horizontally ACROSS the target rather than along a path.',
    },
    /*
     * The card's plant IS the boss's plant, at a smaller size.
     *
     * Same files as `impact` below, deliberately. Raheem on review: "that plant
     * should maybe be the same as the plant that pops up on the card ... just
     * make it a little bit smaller so we can understand that that plant comes
     * from that card." Two different plants would have been two objects; one
     * plant at two sizes is a sentence.
     *
     * Held on frame 0 rather than played — it is a thing that grew and is now
     * waiting, not a thing performing.
     */
    charge: {
      id: 'growth_nature_charge',
      kind: 'still',
      path: 'effects/growth/nature/bloom.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['growth'],
      intendedMaterials: ['Nature'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '8e0fe3c1-0625',
        seed: 4412,
        generationCost: 0,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nature_bloom',
      },
      notes: 'Reuses the bloom art at a smaller scale. Cost 0 — no new generation.',
    },
    impact: {
      id: 'growth_nature_bloom',
      kind: 'flipbook',
      path: 'effects/growth/nature/bloom.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/growth/nature/bloom-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['growth'],
      intendedMaterials: ['Nature'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '8e0fe3c1-0625 (still) / b5dfd8a8-cb49 (animation)',
        seed: 4412,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nature_bloom',
      },
      notes:
        'A tangle of vines splaying outward with a flower opening at its centre — the ' +
        'ability does not merely damage the target, it colonises it.',
    },
    // A state set rather than a flipbook on purpose: staged emergence reads
    // better as curated condition changes than as continuous motion, and it is
    // far cheaper to generate and to reject.
    segment: placeholder('growth_nature_root', 'state_set', 'effects/growth/nature/root-states.png', 48, 96, ['growth'], ['Nature']),
    particle: placeholder('growth_nature_leaf', 'still', 'effects/growth/nature/leaf.png', 16, 16, ['growth'], ['Nature']),
    residue: placeholder('growth_nature_bind', 'still', 'effects/growth/nature/bind.png', 64, 64, ['growth'], ['Nature']),
  },
  barrier_holy: {
    id: 'barrier_holy',
    form: 'barrier',
    element: 'Holy',
    segment: placeholder('barrier_holy_pane', 'state_set', 'effects/barrier/holy/pane-states.png', 128, 176, ['barrier'], ['Holy']),
    particle: placeholder('barrier_holy_mote', 'still', 'effects/barrier/holy/mote.png', 16, 16, ['barrier'], ['Holy']),
  },

  /*
   * Batch I, 2026-08-01 — ten elements wired at once, all `approvalStatus:
   * 'candidate'`, matching every prior batch's convention: candidate means
   * "generated and live for testing", not "Raheem has signed off." That
   * happens at promotion to `'approved'`, a separate step. See
   * `pages/dev/artCandidates.ts` for the review writeups, verdicts and the
   * three cross-cutting issues (Earth/Metal/Bone's impacts sharing a
   * PixelLab-default spiky-burst silhouette; Cosmic's stream reporting
   * opaque rather than transparent; Metal's and Plasma's streams showing a
   * visible resolved end) that make some of these deliberately incomplete.
   */
  lash_earth: {
    id: 'lash_earth',
    form: 'lash',
    element: 'Earth',
    stream: {
      id: 'lash_earth_stream',
      kind: 'flipbook',
      path: 'effects/lash/earth/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/earth/stream-f${i}.png`),
      frameCount: 9,
      fps: 8,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Earth'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'e305592a-61a6 (still) / 5d477528-edc8 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#earth_stream',
      },
      notes:
        'Overlapping stone chunks, chunky and grey-brown, no lava glow. Slowest fps in the ' +
        'set — plates grind against each other, they do not flow.',
    },
    // Still, not a flipbook — this impact fell into the spiky-urchin default
    // PixelLab reaches for on "fragments bursting outward" (see the
    // batch-level note in artCandidates.ts). Held as a still pending a
    // decision on whether it needs a reroll before it is worth animating.
    impact: {
      id: 'lash_earth_impact',
      kind: 'still',
      path: 'effects/lash/earth/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Earth'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '854d651a',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#earth_impact',
      },
      notes:
        'Grey-brown and mineral, but an even spiky-urchin burst rather than Bible EARTH’s ' +
        '"blocky-heavy." Watch item: shares its silhouette with Metal’s impact below.',
    },
    particle: placeholder('lash_earth_shard', 'still', 'effects/lash/earth/shard.png', 16, 16, ['lash'], ['Earth']),
  },

  lash_storm: {
    id: 'lash_storm',
    form: 'lash',
    element: 'Storm',
    stream: {
      id: 'lash_storm_stream',
      kind: 'flipbook',
      path: 'effects/lash/storm/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/storm/stream-f${i}.png`),
      frameCount: 9,
      fps: 22,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Storm'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '945541bc-6848 (still) / 65bc8fb2-53f8 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#storm_stream',
      },
      notes:
        'First real test of `branching_bolt` — a genuine jagged zigzag chain rather than a ' +
        'smooth ribbon. Fastest stream fps in the set: current moves through the bolt.',
    },
    impact: {
      id: 'lash_storm_impact',
      kind: 'flipbook',
      path: 'effects/lash/storm/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/storm/impact-f${i}.png`),
      frameCount: 9,
      fps: 20,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Storm'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'f28eb5a1-6d6e (still) / 8f2ea0f0-f91b (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#storm_impact',
      },
      notes:
        'Escaped the spiky-urchin default — softer, more irregular rays than Earth/Metal, ' +
        'saturated blue-white. Crackles outward then fades to a soft glow.',
    },
    particle: placeholder('lash_storm_droplet', 'still', 'effects/lash/storm/droplet.png', 16, 16, ['lash'], ['Storm']),
  },

  lash_void: {
    id: 'lash_void',
    form: 'lash',
    element: 'Void',
    stream: {
      id: 'lash_void_stream',
      kind: 'flipbook',
      path: 'effects/lash/void/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/void/stream-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Void'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'e2944f9b-a054 (still) / b13a128a-e4ef (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#void_stream',
      },
      notes:
        'Shares Shadow’s `fraying_smoke` silhouette on purpose — both formless umbral ' +
        'absence — told apart by darker value and a faint violet undertone. Worth a direct ' +
        'side-by-side against Shadow with colour hidden.',
    },
    impact: {
      id: 'lash_void_impact',
      kind: 'flipbook',
      path: 'effects/lash/void/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/void/impact-f${i}.png`),
      frameCount: 9,
      fps: 12,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Void'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'ab17a348-d254 (still) / e987392f-0e04 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#void_impact',
      },
      notes:
        'Strongest impact in the batch. Wispy violet-black tendrils around total darkness, ' +
        'pulsing and dissipating rather than punching — reads as absence, not an explosion.',
    },
    particle: placeholder('lash_void_shard', 'still', 'effects/lash/void/shard.png', 16, 16, ['lash'], ['Void']),
  },

  lash_ice: {
    id: 'lash_ice',
    form: 'lash',
    element: 'Ice',
    stream: {
      id: 'lash_ice_stream',
      kind: 'flipbook',
      path: 'effects/lash/ice/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/ice/stream-f${i}.png`),
      frameCount: 9,
      fps: 12,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Ice'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'fe3bbb84-c09d (still) / d921cbcb-dda1 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#ice_stream',
      },
      notes:
        'A tight chain of angular pale-blue crystal shards. Shares `faceted_shard` with ' +
        'Sanguine on purpose (both crystal); told apart by being a continuous jet rather ' +
        'than a discrete thrown volley.',
    },
    impact: {
      id: 'lash_ice_impact',
      kind: 'flipbook',
      path: 'effects/lash/ice/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/ice/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Ice'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '1520e5e1-9908 (still) / 20933bf9-1ad3 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#ice_impact',
      },
      notes:
        'A bright white-blue faceted starburst — sharper and colder-reading than Storm’s ' +
        'electric burst or Sanguine’s garnet shatter.',
    },
    particle: placeholder('lash_ice_shard', 'still', 'effects/lash/ice/shard.png', 16, 16, ['lash'], ['Ice']),
  },

  lash_metal: {
    id: 'lash_metal',
    form: 'lash',
    element: 'Metal',
    // Watch item: came back closer to a segmented rod than a repeating band —
    // two bulbous ball-joint ends are visible. Mirror-tiling should hide it;
    // check at the tiling-test zoom in the Generated art tab before trusting it.
    stream: {
      id: 'lash_metal_stream',
      kind: 'flipbook',
      path: 'effects/lash/metal/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/metal/stream-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Metal'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '6e2918bb-9ff1 (still) / c8010c5a-542f (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#metal_stream',
      },
      notes:
        'Rigid, geometric, rivets rather than facets — reads as metal. See the watch item ' +
        'above on tiling.',
    },
    // Still — same spiky-urchin default as Earth's impact. See batch note.
    impact: {
      id: 'lash_metal_impact',
      kind: 'still',
      path: 'effects/lash/metal/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Metal'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: 'b5c8ae8d',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#metal_impact',
      },
      notes:
        'Grey-silver with gold sparks — palette carries most of the separation from Earth’s ' +
        'impact, since the silhouette is the same spiky-urchin default.',
    },
    particle: placeholder('lash_metal_shard', 'still', 'effects/lash/metal/shard.png', 16, 16, ['lash'], ['Metal']),
  },

  /*
   * Cosmic — Monk's PEACE culmination. Watch item: the stream animation
   * reports `transparent: False — auto (input is opaque)` from PixelLab,
   * which likely means it composites as an opaque box rather than blending
   * over the arena. Verify before treating this as ready.
   */
  lash_cosmic: {
    id: 'lash_cosmic',
    form: 'lash',
    element: 'Cosmic',
    stream: {
      id: 'lash_cosmic_stream',
      kind: 'flipbook',
      path: 'effects/lash/cosmic/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/cosmic/stream-f${i}.png`),
      frameCount: 9,
      fps: 8,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Cosmic'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '7ba2f0c1 reroll of 6ae5c874 (still) / 5e8e797d (animation)',
        seed: 4412,
        generationCost: 3,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt put a bright starburst cluster at one edge — a resolved "head," ' +
          'which is an end by another name. Asking for even density with no cluster fixed it.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#cosmic_stream',
      },
      notes:
        'CHECK TRANSPARENCY before trusting this in a real cast — see the kit-level note. ' +
        'Indigo starfield with scattered gold stars, twinkling.',
    },
    impact: {
      id: 'lash_cosmic_impact',
      kind: 'flipbook',
      path: 'effects/lash/cosmic/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/cosmic/impact-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Cosmic'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'f9cfa704-7195 (still) / b12afba8-9913 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#cosmic_impact',
      },
      notes:
        'The best single piece in the batch. A jewel-toned flower opening outward rather ' +
        'than detonating — calm and vast, exactly what Bible COSMIC asks for. Slowest ' +
        'impact fps in the set on purpose.',
    },
    particle: placeholder('lash_cosmic_mote', 'still', 'effects/lash/cosmic/mote.png', 16, 16, ['lash'], ['Cosmic']),
  },

  /*
   * Plasma — Mech Pilot's sole element, and the first test of the new
   * `contained` charge form. Watch item: the stream shows a visible violet
   * orb at one end, a resolved end-cap rather than a repeating texture.
   * Mirror-tiling usually saves this; check at the tiling-test zoom.
   */
  lash_plasma: {
    id: 'lash_plasma',
    form: 'lash',
    element: 'Plasma',
    stream: {
      id: 'lash_plasma_stream',
      kind: 'flipbook',
      path: 'effects/lash/plasma/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/plasma/stream-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Plasma'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'd6d1c1e1 reroll of 347733d4 (still) / 8507214e (animation)',
        seed: 4412,
        generationCost: 3,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt came back jagged — read as Storm’s lightning, not a coherent ' +
          'contained beam. Explicitly forbidding "zigzag" and "lightning" fixed it.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#plasma_stream',
      },
      notes:
        'A genuinely smooth glowing tube now, cyan-white with a violet core, pulsing in the ' +
        'animation. See the kit-level watch item on the visible end-cap.',
    },
    impact: {
      id: 'lash_plasma_impact',
      kind: 'flipbook',
      path: 'effects/lash/plasma/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/plasma/impact-f${i}.png`),
      frameCount: 9,
      fps: 18,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Plasma'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '4cefa930-e2df (still) / 3875c0d7-46aa (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#plasma_impact',
      },
      notes:
        'Energetic cyan-to-magenta flare, thin numerous rays — distinct from Ice’s cooler ' +
        'burst and Holy’s softer stained-glass flare.',
    },
    particle: placeholder('lash_plasma_mote', 'still', 'effects/lash/plasma/mote.png', 16, 16, ['lash'], ['Plasma']),
  },

  /*
   * Light — Holy's un-sanctified cousin. Watch item: the stream's first
   * attempt came back as a golden vine with thorns; the reroll produced a
   * beaded chain rather than a smooth beam. Genuinely radiant, but a
   * different shape than briefed — Raheem's call on whether it needs a
   * third attempt.
   */
  lash_light: {
    id: 'lash_light',
    form: 'lash',
    element: 'Light',
    stream: {
      id: 'lash_light_stream',
      kind: 'flipbook',
      path: 'effects/lash/light/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/light/stream-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Light'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'f47a4d1f reroll of 72dc9241 (still) / 30982ccd (animation)',
        seed: 4412,
        generationCost: 3,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt returned a golden vine with thorns and leaves — completely wrong ' +
          'material. Forbidding "vine," "plant," "thorns," "leaves" by name fixed the material ' +
          'but produced a beaded chain rather than a smooth beam.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#light_stream',
      },
      notes: 'A string of golden diamond beads, warm and radiant. See kit-level watch item.',
    },
    impact: {
      id: 'lash_light_impact',
      kind: 'flipbook',
      path: 'effects/lash/light/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/light/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Light'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'e0913fd5-c612 (still) / 7436c1a9-f8de (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#light_impact',
      },
      notes:
        'Thin, numerous, piercing rays — visibly sharper than Holy’s softer refracting_flare, ' +
        'which is the reason `sunburst` was authored as its own impact type.',
    },
    particle: placeholder('lash_light_mote', 'still', 'effects/lash/light/mote.png', 16, 16, ['lash'], ['Light']),
  },

  /*
   * Nanite — Android's sole natural element. Same volley shape as Sanguine:
   * discrete solid fragments, stills rather than flipbooks, because a
   * SWARM of many small machines is the Bible brief — never one big body
   * with internal motion.
   */
  lash_nanite: {
    id: 'lash_nanite',
    form: 'lash',
    element: 'Nanite',
    stream: {
      id: 'lash_nanite_shard',
      kind: 'still',
      path: 'effects/lash/nanite/stream.png',
      dimensions: { width: 32, height: 32 },
      pivot: { x: 16, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Nanite'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '53d7fa25 reroll of e2ebb188',
        seed: 4412,
        generationCost: 2,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt came back as an ice-blue crystal despite an explicit "mechanical ' +
          'nanobot" description. Forbidding "crystal" and "gem" by name fixed it.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nanite_shard',
      },
      notes: 'A grey metal chip with rivets and a cyan light — reads mechanical, not crystalline.',
    },
    impact: {
      id: 'lash_nanite_impact',
      kind: 'still',
      path: 'effects/lash/nanite/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Nanite'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '3b400e88',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nanite_impact',
      },
      notes:
        'The most distinct silhouette in the whole set — a ring of small discrete particle-' +
        'dots around a dark core, rather than any variety of burst. Reads as a scatter, ' +
        'never one big detonation.',
    },
  },

  /*
   * Bone — Necromancer's exclusive natural element. Volley, like Sanguine
   * and Nanite, but organic rather than faceted or machined — bones are
   * discrete solid fragments, not a flowing or crystalline body.
   */
  lash_bone: {
    id: 'lash_bone',
    form: 'lash',
    element: 'Bone',
    stream: {
      id: 'lash_bone_shard',
      kind: 'still',
      path: 'effects/lash/bone/stream.png',
      dimensions: { width: 32, height: 32 },
      pivot: { x: 16, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Bone'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '642e5e13',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#bone_shard',
      },
      notes:
        'A curved, pale ivory claw-or-tooth shape — organic rather than faceted or machined, ' +
        'so it does not collapse into Sanguine’s crystal or Nanite’s metal despite sharing ' +
        'the volley delivery.',
    },
    // Still, same spiky-urchin default as Earth's and Metal's impacts — the
    // third of three in this batch. See the batch-level note.
    impact: {
      id: 'lash_bone_impact',
      kind: 'still',
      path: 'effects/lash/bone/impact.png',
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Bone'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen',
        jobOrObjectId: '572eda6b',
        seed: 7331,
        generationCost: 1,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#bone_impact',
      },
      notes:
        'Pale ivory against Earth’s grey-brown and Metal’s grey-gold — palette separates it, ' +
        'but the silhouette is the third to fall into the spiky-urchin default this batch.',
    },
  },

  /*
   * Batch J, 2026-08-02 — the other ten of the twenty elements authored in
   * materialKits.ts. Raheem approved the second half of the generation
   * budget after reviewing Batch I live: "I like them... let's go ahead and
   * move on to the next." ~103 generations spent, all `approvalStatus:
   * 'candidate'`. See `pages/dev/artCandidates.ts` for the review writeups.
   *
   * Two cross-cutting findings worth stating once:
   *
   * 1. **PixelLab strongly resists an abstract "impact burst" reading for
   *    certain materials.** Beast's impact came back as a literal monster
   *    face TWICE before a third attempt — dropping "claw" and "bursting
   *    outward" language entirely in favour of "gash marks" — finally
   *    produced an abstract slash. Wind's impact came back as a leaf wreath
   *    THREE times despite explicit "NOT a wreath, NOT a ring" negations, and
   *    was accepted as-is rather than spending a fourth attempt.
   * 2. **One prompted-and-generated piece was never used.** Wind's third
   *    impact reroll (job `5240d614`) exists as a generation but was
   *    superseded by the second attempt before it could be reviewed — the
   *    second attempt was already in the animation queue. Recorded here so
   *    the spend is traceable even though the file was never wired in.
   */
  lash_wind: {
    id: 'lash_wind',
    form: 'lash',
    element: 'Wind',
    stream: {
      id: 'lash_wind_stream',
      kind: 'flipbook',
      path: 'effects/lash/wind/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/wind/stream-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Wind'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'c009df91 (still) / d0572866 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#wind_stream',
      },
      notes: 'Translucent green ribbons twisting — reads as airy and gusting, clean first attempt.',
    },
    // Watch item: three attempts all came back as a leaf wreath/ring rather
    // than an asymmetric scatter, despite explicit negation. Accepted rather
    // than spending a fourth generation — see the batch-level note above.
    impact: {
      id: 'lash_wind_impact',
      kind: 'flipbook',
      path: 'effects/lash/wind/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/wind/impact-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Wind'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'bb3a83a1 reroll of c9b58009 (still) / 55e0e48c (animation)',
        seed: 4412,
        generationCost: 2,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt was a full leaf wreath. Reroll asked explicitly for asymmetric, ' +
          'NOT a wreath/circle/ring — still came back circular. Kept rather than a third ' +
          'reroll; a fourth attempt (5240d614) was generated but never reviewed or used.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#wind_impact',
      },
      notes: 'Leaves scattered in a ring rather than an uneven gust. Honest watch item, not hidden.',
    },
    particle: placeholder('lash_wind_mote', 'still', 'effects/lash/wind/mote.png', 16, 16, ['lash'], ['Wind']),
  },

  lash_beast: {
    id: 'lash_beast',
    form: 'lash',
    element: 'Beast',
    stream: {
      id: 'lash_beast_stream',
      kind: 'flipbook',
      path: 'effects/lash/beast/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/beast/stream-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Beast'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '49a42ca8 (still) / e9865b18 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#beast_stream',
      },
      notes:
        'Striped brown-orange fur texture, physical and unglowing — satisfies Bible BEAST’s ' +
        '"absolutely never fire, ember, glow-based magic" rule. Clean first attempt.',
    },
    // Two rejects before this: both attempts at "claw marks bursting
    // outward" returned a literal monster face. Dropping "claw" and
    // "bursting outward" for "gash marks... NOT a face, NOT a creature" on
    // the third try finally produced an abstract slash.
    impact: {
      id: 'lash_beast_impact',
      kind: 'flipbook',
      path: 'effects/lash/beast/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/beast/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Beast'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '0c521f97, third of three (still) / 11d01602 (animation)',
        seed: 5150,
        generationCost: 3,
        selectedCandidate: 3,
        rejectionReason:
          'v1 (5d1f359a) and v2 (473673d1) both returned a literal monster/demon face despite ' +
          '"NOT a face, NOT an animal head" — "claw marks... bursting outward" was reliably ' +
          'read as a creature portrait. v3 dropped that phrasing for "gash marks... wound ' +
          'slash shapes, abstract graphic" and produced clean diagonal claw slashes.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#beast_impact',
      },
      notes: 'Two sharp diagonal red gashes — physical, not magical, and finally not a face.',
    },
    particle: placeholder('lash_beast_droplet', 'still', 'effects/lash/beast/droplet.png', 16, 16, ['lash'], ['Beast']),
  },

  lash_poison: {
    id: 'lash_poison',
    form: 'lash',
    element: 'Poison',
    stream: {
      id: 'lash_poison_stream',
      kind: 'flipbook',
      path: 'effects/lash/poison/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/poison/stream-f${i}.png`),
      frameCount: 9,
      fps: 8,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Poison'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '43f8c9fb (still) / 597d8d4f (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#poison_stream',
      },
      notes: 'Twisting toxic green-purple vine shape — reads venomous. Clean first attempt.',
    },
    impact: {
      id: 'lash_poison_impact',
      kind: 'flipbook',
      path: 'effects/lash/poison/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/poison/impact-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Poison'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '81abba19 reroll of 85654803 (still) / 06db580d (animation)',
        seed: 4412,
        generationCost: 2,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt at "venom splashing... foam" returned a dark bush with berries — the ' +
          'model read the shape as a plant. "Liquid burst... chemical splatter, NOT a plant, ' +
          'NOT a bush" on the reroll fixed it completely.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#poison_impact',
      },
      notes: 'A genuine toxic green-purple splash burst, bubbling and asymmetric.',
    },
    particle: placeholder('lash_poison_spray', 'still', 'effects/lash/poison/spray.png', 16, 16, ['lash'], ['Poison']),
  },

  lash_moon: {
    id: 'lash_moon',
    form: 'lash',
    element: 'Moon',
    stream: {
      id: 'lash_moon_stream',
      kind: 'flipbook',
      path: 'effects/lash/moon/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/moon/stream-f${i}.png`),
      frameCount: 9,
      fps: 8,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Moon'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'b467c95f reroll of 2752749c (still) / c45861de (animation)',
        seed: 4412,
        generationCost: 2,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt ended in a resolved circular "moon" shape at one end — an end by ' +
          'another name. Explicitly forbidding "circle," "orb," "moon shape" fixed it into an ' +
          'even wave.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#moon_stream',
      },
      notes: 'A calm, even, pale silver-grey wave — no resolved ends. Reads as the calmest stream in the set.',
    },
    impact: {
      id: 'lash_moon_impact',
      kind: 'flipbook',
      path: 'effects/lash/moon/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/moon/impact-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Moon'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '4efe61cc (still) / 7ad1b19a (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#moon_impact',
      },
      notes:
        'A genuine crescent moon shape with a gentle wave beneath it — calm, glowing, NOT ' +
        'violent, exactly per brief. One of the best pieces in the batch.',
    },
    particle: placeholder('lash_moon_mote', 'still', 'effects/lash/moon/mote.png', 16, 16, ['lash'], ['Moon']),
  },

  /*
   * Lunar — the Lycanthrope's rare, "silver-fire." Faint in these swatches by
   * design (Bible LUNAR: brighter than white); should read strongly once
   * composited over the dark arena rather than a light preview background.
   */
  lash_lunar: {
    id: 'lash_lunar',
    form: 'lash',
    element: 'Lunar',
    stream: {
      id: 'lash_lunar_stream',
      kind: 'flipbook',
      path: 'effects/lash/lunar/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/lunar/stream-f${i}.png`),
      frameCount: 9,
      fps: 12,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Lunar'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '7a5c8283 reroll of 90d791b0 (still) / 14be8d8e (animation)',
        seed: 4412,
        generationCost: 2,
        selectedCandidate: 2,
        rejectionReason:
          'First attempt at "brilliant silver-white flame" came back dark instead of bright — ' +
          'the opposite of the brief. "Pure white light... extremely bright... NOT dark, NOT ' +
          'black, NOT shadow" on the reroll fixed the value inversion.',
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#lunar_stream',
      },
      notes: 'Faint sparkle in this swatch — check against the dark arena background before judging brightness.',
    },
    impact: {
      id: 'lash_lunar_impact',
      kind: 'flipbook',
      path: 'effects/lash/lunar/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/lunar/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Lunar'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'e9bf8b2e (still) / 29d797b4 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#lunar_impact',
      },
      notes: 'A delicate radiant white star-flare — same brightness caveat as the stream.',
    },
    particle: placeholder('lash_lunar_ember', 'still', 'effects/lash/lunar/ember.png', 16, 16, ['lash'], ['Lunar']),
  },

  lash_spirit: {
    id: 'lash_spirit',
    form: 'lash',
    element: 'Spirit',
    stream: {
      id: 'lash_spirit_stream',
      kind: 'flipbook',
      path: 'effects/lash/spirit/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/spirit/stream-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Spirit'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'dddb9e82 (still) / b59ac466 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#spirit_stream',
      },
      notes:
        'Pale blue wavy ribbon, translucent and ghostly. Shares its wave silhouette with Moon ' +
        'on purpose — told apart by cooler blue tint vs Moon’s grey-silver. Clean first attempt.',
    },
    impact: {
      id: 'lash_spirit_impact',
      kind: 'flipbook',
      path: 'effects/lash/spirit/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/spirit/impact-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Spirit'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'af6e61ee (still) / 8086b796 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#spirit_impact',
      },
      notes: 'A pale cyan-teal flower-like bloom, calm and ethereal. Clean first attempt.',
    },
    particle: placeholder('lash_spirit_mote', 'still', 'effects/lash/spirit/mote.png', 16, 16, ['lash'], ['Spirit']),
  },

  lash_dream: {
    id: 'lash_dream',
    form: 'lash',
    element: 'Dream',
    stream: {
      id: 'lash_dream_stream',
      kind: 'flipbook',
      path: 'effects/lash/dream/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/dream/stream-f${i}.png`),
      frameCount: 9,
      fps: 8,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Dream'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'c3c93b16 (still) / ce574bdb (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#dream_stream',
      },
      notes:
        'Soft pastel pink-green smoke — the palette inversion against Shadow’s near-black is ' +
        'the whole no-colour cue for this element. Clean first attempt.',
    },
    // The impact still and its animation were generated separately from the
    // stream — a genuine "a soft pastel cloud blooming outward" prompt,
    // rather than reusing the stream texture (an internal mistake caught and
    // fixed before this landed: the first impact animation attempt
    // accidentally animated the STREAM still instead of a real impact piece).
    impact: {
      id: 'lash_dream_impact',
      kind: 'flipbook',
      path: 'effects/lash/dream/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/dream/impact-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Dream'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'd1a5935b (still) / b4ded4b6 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#dream_impact',
      },
      notes: 'A pastel pink-green rose blooming open — soft, iridescent, unmistakably dreamlike.',
    },
    particle: placeholder('lash_dream_mote', 'still', 'effects/lash/dream/mote.png', 16, 16, ['lash'], ['Dream']),
  },

  lash_nocturne: {
    id: 'lash_nocturne',
    form: 'lash',
    element: 'Nocturne',
    stream: {
      id: 'lash_nocturne_stream',
      kind: 'flipbook',
      path: 'effects/lash/nocturne/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/nocturne/stream-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Nocturne'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '3708b13d (still) / 1e9be15f (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nocturne_stream',
      },
      notes:
        'Watch item: a red circular "eye" glow resolves at one end, the same kind of resolved-' +
        'head issue Moon’s first attempt had — kept because the blood-moon glow is thematically ' +
        'apt for Nocturne specifically, unlike Moon. Worth a second look at the tiling zoom.',
    },
    impact: {
      id: 'lash_nocturne_impact',
      kind: 'flipbook',
      path: 'effects/lash/nocturne/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/nocturne/impact-f${i}.png`),
      frameCount: 9,
      fps: 10,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Nocturne'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '916eea4b (still) / 3d01f0fe (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#nocturne_impact',
      },
      notes: 'A dark crimson rose-like bloom — reads as blood-moon night, distinct from Blood’s wet splatter.',
    },
    particle: placeholder('lash_nocturne_mote', 'still', 'effects/lash/nocturne/mote.png', 16, 16, ['lash'], ['Nocturne']),
  },

  /*
   * Psychic — the explicit Bible contrast against Dream: "sharp-edged and
   * intact" vs "soft-edged and coming apart." Both pieces came back as a
   * jagged zigzag rather than literal flat planes; kept because "sharp,
   * angular, intact" is the load-bearing part of the contrast, not the
   * literal geometry.
   */
  lash_psychic: {
    id: 'lash_psychic',
    form: 'lash',
    element: 'Psychic',
    stream: {
      id: 'lash_psychic_stream',
      kind: 'flipbook',
      path: 'effects/lash/psychic/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/psychic/stream-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Psychic'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: 'b1b864a8 (still) / 50241525 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#psychic_stream',
      },
      notes:
        'A sharp jagged purple-magenta zigzag — angular and intact, though closer to a bolt ' +
        'than literal flat facets. Distinct from Storm by colour and by tighter, denser zigzags.',
    },
    impact: {
      id: 'lash_psychic_impact',
      kind: 'flipbook',
      path: 'effects/lash/psychic/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/psychic/impact-f${i}.png`),
      frameCount: 9,
      fps: 18,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Psychic'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '44272479 (still) / 72f9c496 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#psychic_impact',
      },
      notes:
        'A sharp many-pointed purple-white star — crisp and intact, the explicit visual ' +
        'opposite of Dream’s soft bloom. Clean first attempt.',
    },
    particle: placeholder('lash_psychic_mote', 'still', 'effects/lash/psychic/mote.png', 16, 16, ['lash'], ['Psychic']),
  },

  lash_prism: {
    id: 'lash_prism',
    form: 'lash',
    element: 'Prism',
    stream: {
      id: 'lash_prism_stream',
      kind: 'flipbook',
      path: 'effects/lash/prism/stream.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/prism/stream-f${i}.png`),
      frameCount: 9,
      fps: 14,
      loop: true,
      dimensions: { width: 128, height: 32 },
      pivot: { x: 0, y: 16 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Prism'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '950b06a6 (still) / 41a64bc9 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#prism_stream',
      },
      notes:
        'A vibrant chain of overlapping rainbow diamond facets — the most colour-saturated ' +
        'piece in the whole project, matching Bible PRISM’s "clearly manufactured" brief. ' +
        'Clean first attempt.',
    },
    impact: {
      id: 'lash_prism_impact',
      kind: 'flipbook',
      path: 'effects/lash/prism/impact.png',
      frames: Array.from({ length: 9 }, (_, i) => `effects/lash/prism/impact-f${i}.png`),
      frameCount: 9,
      fps: 16,
      loop: false,
      dimensions: { width: 64, height: 64 },
      pivot: { x: 32, y: 32 },
      intendedForms: ['lash', 'drain'],
      intendedMaterials: ['Prism'],
      approvalStatus: 'candidate',
      provenance: {
        provider: 'pixellab',
        tool: 'create_image_pixen + animate_image',
        jobOrObjectId: '80f5b0e1 (still) / 4c536844 (animation)',
        seed: 7331,
        generationCost: 2,
        promptOrConfigPath: 'src/pages/dev/artCandidates.ts#prism_impact',
      },
      notes: 'A bright holographic rainbow flare refracting outward. Clean first attempt.',
    },
    particle: placeholder('lash_prism_shard', 'still', 'effects/lash/prism/shard.png', 16, 16, ['lash'], ['Prism']),
  },
};

/** Kit id for a form + element pair, if one is manifested. */
export function assetKitIdFor(form: AbilityForm, element: ElementName | undefined): string | undefined {
  if (!element) return undefined;
  const id = `${form}_${element.toLowerCase()}`;
  return id in PERFORMANCE_ASSET_KITS ? id : undefined;
}

export function getAssetKit(kitId: string | undefined): PerformanceAssetKit | undefined {
  return kitId ? PERFORMANCE_ASSET_KITS[kitId] : undefined;
}

/**
 * Whether an asset can actually be drawn right now.
 *
 * Returns false for `'placeholder'` and `'rejected'`, which today is every
 * row. Renderers MUST call this rather than testing `path` for truthiness —
 * every row has a path, and a path is a spec, not a file.
 */
export function assetAvailable(asset: PerformanceAsset | undefined): asset is PerformanceAsset {
  return !!asset && (asset.approvalStatus === 'candidate' || asset.approvalStatus === 'approved');
}

/** Public URL for an available asset. */
export function performanceAssetUrl(asset: PerformanceAsset): string {
  return resolveCombatAssetPath(asset.path);
}

/** Flat list for the Ability Theater's provenance readout. */
export const ALL_PERFORMANCE_ASSETS: readonly PerformanceAsset[] = Object.values(
  PERFORMANCE_ASSET_KITS,
).flatMap((kit) =>
  [kit.head, kit.segment, kit.particle, kit.impact, kit.residue].filter(
    (a): a is PerformanceAsset => !!a,
  ),
);

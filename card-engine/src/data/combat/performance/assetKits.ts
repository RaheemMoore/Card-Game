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

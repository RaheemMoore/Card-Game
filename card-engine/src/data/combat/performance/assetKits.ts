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
  lash_water: {
    id: 'lash_water',
    form: 'lash',
    element: 'Water',
    segment: placeholder('lash_water_segment', 'still', 'effects/lash/water/segment.png', 32, 32, ['lash'], ['Water']),
    particle: placeholder('lash_water_spray', 'still', 'effects/lash/water/spray.png', 16, 16, ['lash'], ['Water']),
    impact: placeholder('lash_water_impact', 'flipbook', 'effects/lash/water/impact.png', 64, 64, ['lash'], ['Water']),
  },
  lash_fire: {
    id: 'lash_fire',
    form: 'lash',
    element: 'Fire',
    segment: placeholder('lash_fire_segment', 'still', 'effects/lash/fire/segment.png', 32, 32, ['lash'], ['Fire']),
    particle: placeholder('lash_fire_ember', 'still', 'effects/lash/fire/ember.png', 16, 16, ['lash'], ['Fire']),
    impact: placeholder('lash_fire_impact', 'flipbook', 'effects/lash/fire/impact.png', 64, 64, ['lash'], ['Fire']),
  },
  growth_nature: {
    id: 'growth_nature',
    form: 'growth',
    element: 'Nature',
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

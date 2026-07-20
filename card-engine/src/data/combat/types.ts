import type { ArchetypeName } from '../../types/card';

/**
 * Typed manifests for combat visuals. Populated in C5 with placeholder rows
 * so the runtime can render `<img src={...}/>` today; the same rows are
 * updated to `approvalStatus: 'approved'` when Leonardo / Figma-exported
 * assets land in C6.
 *
 * Schema per Combat_Art_Acquisition_and_Integration_Plan.md. No component
 * should hardcode an asset path — always resolve through a manifest.
 */

export type CombatArtSource = 'leonardo' | 'figma_community' | 'code';

export type CombatArtApprovalStatus = 'placeholder' | 'candidate' | 'approved';

export type CombatArtKind =
  | 'arena'
  | 'boss_sprite'
  | 'boss_card'
  | 'hero_sprite'
  | 'effect'
  | 'projectile';

export interface CombatArtAsset {
  id: string;
  kind: CombatArtKind;
  source: CombatArtSource;
  /** Public path — resolves against /assets/combat/. */
  path: string;
  /** Approved dimensions. Used for aspect-ratio boxes; not validated at load. */
  dimensions: { width: number; height: number };
  /** Set to the Leonardo prompt version once C6 fires the generation. */
  promptVersion?: string;
  approvalStatus: CombatArtApprovalStatus;
  notes?: string;
}

/** Arena assets — background art for a battle scene. Keyed by arenaId. */
export type ArenaManifest = Record<string, CombatArtAsset>;

/** Boss sprite states. Keyed by `${bossId}:${state}`; state is idle/attack/hit/rage/defeat. */
export type BossSpriteManifest = Record<string, CombatArtAsset>;

/** Boss card portraits (Picker/Codex use only — never during active combat). */
export type BossCardManifest = Record<string, CombatArtAsset>;

/** Hero combat sprites — one per archetype (currently sourced from a Figma community pack). */
export type HeroSpriteManifest = Record<ArchetypeName, CombatArtAsset>;

/** Effect assets — mostly code-first in C7; the manifest carries the exceptions. */
export type EffectManifest = Record<string, CombatArtAsset>;

/** Base URL — join with `path` to build the src for an <img>. */
export const COMBAT_ASSET_ROOT = '/assets/combat';

export function resolveCombatAssetUrl(asset: CombatArtAsset): string {
  return `${COMBAT_ASSET_ROOT}/${asset.path.replace(/^\/+/, '')}`;
}

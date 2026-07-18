import type { AbilityArtCrops } from '../../types/abilities';

/**
 * Approved visual benchmarks from the Ability Tile Art Direction Spec
 * (Gate 7A). Keyed by AbilityDefinition.slug so it survives id changes.
 *
 * Only slugs listed here get real approved art. Everything else falls back
 * to the family-tinted placeholder SVG (see canonicalArtPipeline).
 *
 * Files live under `card-engine/public/assets/abilities/approved/` and are
 * mirrored from `Card Images/Boss and Ability Visual Assets/`. Do not
 * embed UI text into the canonical artwork (see manifest.json rules).
 */
export const APPROVED_ABILITY_ART: Record<string, AbilityArtCrops> = {
  'ember-cleave': {
    combat: { url: '/assets/abilities/approved/ember-cleave/combat.jpg' },
    detail: { url: '/assets/abilities/approved/ember-cleave/detail.jpg' },
    relic: { url: '/assets/abilities/approved/ember-cleave/relic.jpg' },
  },
  'aegis-ward': {
    combat: { url: '/assets/abilities/approved/aegis-ward/combat.jpg' },
    detail: { url: '/assets/abilities/approved/aegis-ward/detail.jpg' },
    relic: { url: '/assets/abilities/approved/aegis-ward/relic.jpg' },
  },
};

export function getApprovedArt(slug: string | undefined): AbilityArtCrops | undefined {
  if (!slug) return undefined;
  return APPROVED_ABILITY_ART[slug];
}

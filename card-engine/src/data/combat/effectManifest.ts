import type { EffectManifest } from './types';

/**
 * Effect visuals — C7 does damage numbers, hit-shake, boss-glow in code
 * (CSS/SVG). This manifest carries the exceptions where a real asset is
 * unavoidable (currently: a single fire projectile for the Ember Wraith's
 * heavy attack, per Combat_Art_Acquisition plan).
 */
export const EFFECT_MANIFEST: EffectManifest = {
  fire_projectile: {
    id: 'fire_projectile',
    kind: 'projectile',
    source: 'code',
    path: 'projectiles/fire-projectile.svg',
    dimensions: { width: 96, height: 96 },
    approvalStatus: 'placeholder',
    notes: 'Placeholder SVG — replaced by code-first CSS/SVG in C7, or Leonardo if a gap remains.',
  },
};

export function getEffect(effectId: string) {
  return EFFECT_MANIFEST[effectId];
}

import type { BlastDef, Projectile } from '../combat/blast';
import { scaleBlast } from '../combat/blast';
import { severityForCharge, type HitSeverity } from '../combat/feel';
import type { ActionPhase } from '../combat/actionState';
import type { FixtureCard } from './types';

/**
 * Gate 1 is one move from one element: a reusable Fire Card creates a classic
 * round fireball. These are four training copies of that SAME card so the
 * existing knockdown/scatter proof can keep exercising a full hand without
 * quietly reintroducing ice, storm or shadow attacks.
 */
export const FIRE_CARD_FIXTURES: readonly FixtureCard[] = [
  { cardId: 'front-v4-fire-1', name: 'Fire Card', element: 'Fire' },
  { cardId: 'front-v4-fire-2', name: 'Fire Card', element: 'Fire' },
  { cardId: 'front-v4-fire-3', name: 'Fire Card', element: 'Fire' },
  { cardId: 'front-v4-fire-4', name: 'Fire Card', element: 'Fire' },
];

/**
 * Simulation truth for the Fire Card, before charge scaling.
 *
 * Full charge resolves to 616 px/s, a 16 px collision radius and 20 damage.
 * That is fast enough to feel decisive in the side-view lane while leaving a
 * visible half-second flight from the benchmark position to the jelly.
 */
export const FIREBALL_BASE: BlastDef = {
  speed: 560,
  rangePx: 760,
  radiusPx: 12,
  damage: 10,
  visualKey: 'front-v4-fireball',
};

export const FIREBALL_LAUNCH_GAP_PX = 18;

const clampCharge = (charge01: number) => Math.max(0, Math.min(1, charge01));

/** The charged simulation values used by the projectile stepper. */
export function fireballDef(charge01: number): BlastDef {
  return scaleBlast(FIREBALL_BASE, clampCharge(charge01));
}

export interface FireballVisualFootprint {
  bodyDiameterPx: number;
  tailLengthPx: number;
  totalLengthPx: number;
  heightPx: number;
}

/**
 * The picture grows with the same charge that grows damage and collision.
 * Full charge is intentionally about half the 138 px hero's height: unmistakable
 * as a fireball, but not yet a screen-filling signature effect.
 */
export function fireballVisual(charge01: number): FireballVisualFootprint {
  const t = clampCharge(charge01);
  const bodyDiameterPx = Math.round(34 + 28 * t);
  const tailLengthPx = Math.round(14 + 28 * t);
  return {
    bodyDiameterPx,
    tailLengthPx,
    totalLengthPx: bodyDiameterPx + tailLengthPx,
    heightPx: bodyDiameterPx,
  };
}

export interface FireCardHeat {
  visible: boolean;
  charge01: number;
  alpha: number;
  radiusPx: number;
  coreAlpha: number;
  gatherRadiusPx: number;
  flameHeightPx: number;
  /** Charge-only wind that gathers into the flame, then becomes the launch wake. */
  windGatherAlpha: number;
}

/**
 * A separate glow sits over the card baked into the casting sheet. The card
 * remains in the hand; this only says how hot it looks while it is being used.
 */
export function fireCardHeat(
  phase: ActionPhase,
  charge01: number,
  elapsedMs: number,
  recoveryMs: number,
): FireCardHeat {
  const charge = clampCharge(charge01);
  if (phase === 'explore' || phase === 'knockdown' || phase === 'standUp' || phase === 'summoning') {
    return {
      visible: false,
      charge01: 0,
      alpha: 0,
      radiusPx: 0,
      coreAlpha: 0,
      gatherRadiusPx: 0,
      flameHeightPx: 0,
      windGatherAlpha: 0,
    };
  }

  if (phase === 'recovery') {
    const remaining = 1 - Math.max(0, Math.min(1, elapsedMs / Math.max(1, recoveryMs)));
    return {
      visible: remaining > 0,
      charge01: charge * remaining,
      alpha: 0.88 * remaining,
      radiusPx: 15 + 13 * charge * remaining,
      coreAlpha: remaining,
      gatherRadiusPx: 30 + 26 * charge * remaining,
      flameHeightPx: 18 + 24 * charge * remaining,
      windGatherAlpha: 0,
    };
  }

  const commitment = phase === 'charging' ? charge : clampCharge(charge01);
  return {
    visible: true,
    charge01: commitment,
    alpha: 0.58 + 0.34 * commitment,
    radiusPx: 13 + 17 * commitment,
    coreAlpha: 0.76 + 0.24 * commitment,
    gatherRadiusPx: 38 + 30 * commitment,
    flameHeightPx: 20 + 28 * commitment,
    windGatherAlpha:
      phase === 'charging' || phase === 'windup'
        ? 0.1 + commitment * commitment * 0.78
        : 0,
  };
}

/** Exact payload the enemy presentation consumes at contact. */
export interface FireballContact {
  position: { x: number; y: number };
  direction: { x: number; y: number };
  charge01: number;
  severity: HitSeverity;
  damage: number;
  travelSpeedPxPerSec: number;
  visualFootprint: FireballVisualFootprint & { collisionRadiusPx: number };
}

export function fireballContact(projectile: Projectile, charge01: number): FireballContact {
  const length = Math.hypot(projectile.dir.x, projectile.dir.y) || 1;
  const charge = clampCharge(charge01);
  return {
    position: { ...projectile.pos },
    direction: { x: projectile.dir.x / length, y: projectile.dir.y / length },
    charge01: charge,
    severity: severityForCharge(charge),
    damage: projectile.def.damage,
    travelSpeedPxPerSec: projectile.def.speed,
    visualFootprint: {
      ...fireballVisual(charge),
      collisionRadiusPx: projectile.def.radiusPx,
    },
  };
}

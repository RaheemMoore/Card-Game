import { describe, expect, it } from 'vitest';
import { spawnProjectile } from '../combat/blast';
import {
  FIREBALL_BASE,
  FIRE_CARD_FIXTURES,
  fireCardHeat,
  fireballContact,
  fireballDef,
  fireballVisual,
} from './fireballGate1';

describe('Fire Card Gate 1 contract', () => {
  it('keeps a full training hand without introducing another element or attack identity', () => {
    expect(FIRE_CARD_FIXTURES).toHaveLength(4);
    expect(new Set(FIRE_CARD_FIXTURES.map((card) => card.cardId)).size).toBe(4);
    expect(new Set(FIRE_CARD_FIXTURES.map((card) => card.name))).toEqual(new Set(['Fire Card']));
    expect(new Set(FIRE_CARD_FIXTURES.map((card) => card.element))).toEqual(new Set(['Fire']));
  });

  it('makes a full fireball faster, larger and stronger than a tap without changing its range', () => {
    const tap = fireballDef(0.25);
    const full = fireballDef(1);
    expect(full.speed).toBeGreaterThan(tap.speed);
    expect(full.radiusPx).toBeGreaterThan(tap.radiusPx);
    expect(full.damage).toBeGreaterThan(tap.damage);
    expect(full.rangePx).toBe(FIREBALL_BASE.rangePx);
    expect(full.speed).toBe(616);
  });

  it('keeps the basic fireball round and readable at both tap and full charge', () => {
    const tap = fireballVisual(0.25);
    const full = fireballVisual(1);
    expect(tap.bodyDiameterPx).toBeGreaterThanOrEqual(40);
    expect(full.bodyDiameterPx).toBe(62);
    expect(full.totalLengthPx).toBe(104);
    expect(full.heightPx).toBe(full.bodyDiameterPx);
  });

  it('heats the held card during charge and cools it during recovery', () => {
    const cold = fireCardHeat('explore', 0, 0, 250);
    const warming = fireCardHeat('charging', 0.25, 80, 250);
    const hot = fireCardHeat('charging', 1, 900, 250);
    const cooling = fireCardHeat('recovery', 1, 125, 250);
    expect(cold.visible).toBe(false);
    expect(hot.alpha).toBeGreaterThan(warming.alpha);
    expect(hot.radiusPx).toBeGreaterThan(warming.radiusPx);
    expect(hot.gatherRadiusPx).toBeGreaterThan(warming.gatherRadiusPx);
    expect(hot.flameHeightPx).toBeGreaterThan(warming.flameHeightPx);
    expect(hot.windGatherAlpha).toBeGreaterThan(warming.windGatherAlpha);
    expect(fireCardHeat('windup', 1, 80, 250).windGatherAlpha).toBeGreaterThan(0.8);
    expect(fireCardHeat('active', 1, 0, 250).windGatherAlpha).toBe(0);
    expect(cooling.windGatherAlpha).toBe(0);
    expect(Math.abs(hot.radiusPx * 2 - fireballVisual(1).bodyDiameterPx)).toBeLessThanOrEqual(2);
    expect(cooling.alpha).toBeGreaterThan(0);
    expect(fireCardHeat('recovery', 1, 250, 250).visible).toBe(false);
  });

  it('reports the projectile actual contact point, direction, charge, speed and footprint', () => {
    const def = fireballDef(1);
    const projectile = {
      ...spawnProjectile({ x: 100, y: 200 }, { x: 4, y: 0 }, def),
      pos: { x: 318, y: 204 },
      outcome: 'hitTarget' as const,
      hitTargetIndex: 0,
    };
    const contact = fireballContact(projectile, 1);
    expect(contact.position).toEqual({ x: 318, y: 204 });
    expect(contact.direction).toEqual({ x: 1, y: 0 });
    expect(contact.severity).toBe('heavy');
    expect(contact.damage).toBe(def.damage);
    expect(contact.travelSpeedPxPerSec).toBe(def.speed);
    expect(contact.visualFootprint).toEqual({
      ...fireballVisual(1),
      collisionRadiusPx: def.radiusPx,
    });
  });
});

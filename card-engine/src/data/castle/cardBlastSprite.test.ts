import { describe, expect, it } from 'vitest';
import {
  CARD_BLAST_MUZZLE,
  CARD_BLAST_EXIT_BLEND_MS,
  CARD_BLAST_RETRACT_MS,
  CARD_BLAST_SHEETS,
  cardBlastFrame,
  cardBlastFacingForAim,
  cardBlastLayerOffsetsForAim,
  cardBlastMuzzleForAim,
  leftCardBlastOrigin,
  usesLeftCardBlast,
} from './cardBlastSprite';

describe('directional card-blast performance', () => {
  it('selects the nearest cardinal art without losing continuous aim', () => {
    expect(usesLeftCardBlast({ x: -1, y: 0 })).toBe(true);
    expect(usesLeftCardBlast({ x: -0.8, y: 0.4 })).toBe(true);
    expect(usesLeftCardBlast({ x: 1, y: 0 })).toBe(false);
    expect(usesLeftCardBlast({ x: -0.4, y: -0.9 })).toBe(false);
    expect(cardBlastFacingForAim({ x: 0.8, y: 0.4 })).toBe('right');
    expect(cardBlastFacingForAim({ x: 0.2, y: -0.9 })).toBe('up');
    expect(cardBlastFacingForAim({ x: 0.2, y: 0.9 })).toBe('down');
    expect(Object.keys(CARD_BLAST_SHEETS)).toEqual(['left', 'right', 'up', 'down']);
  });

  it('slides the card and muzzle between neighboring cardinal measurements', () => {
    const feet = { x: 100, y: 200 };
    const left = cardBlastMuzzleForAim(feet, { x: -1, y: 0 });
    const up = cardBlastMuzzleForAim(feet, { x: 0, y: -1 });
    const diagonal = cardBlastMuzzleForAim(feet, { x: -1, y: -1 });
    expect(left.origin.x).toBe(71);
    expect(diagonal.origin.x).toBeCloseTo((left.origin.x + up.origin.x) / 2);
    expect(diagonal.origin.y).toBeCloseTo((left.origin.y + up.origin.y) / 2);
    expect(diagonal.drawHeightPx).toBeCloseTo((left.drawHeightPx + up.drawHeightPx) / 2);
  });

  it('puts the shot on the generated card while keeping truth on the ground plane', () => {
    expect(leftCardBlastOrigin({ x: 100, y: 200 })).toEqual({ x: 71, y: 200 });
    expect(CARD_BLAST_MUZZLE.heightPx).toBeGreaterThan(0);
  });

  it('layers an upward shot behind the hero and a downward shot in front', () => {
    expect(cardBlastLayerOffsetsForAim({ x: 0, y: -1 })).toEqual({
      heldCard: -1,
      chargeFlash: -2,
    });
    expect(cardBlastLayerOffsetsForAim({ x: 0, y: 1 })).toEqual({
      heldCard: 1,
      chargeFlash: 2,
    });
    expect(cardBlastLayerOffsetsForAim({ x: 1, y: 0 })).toEqual({
      heldCard: 1,
      chargeFlash: 2,
    });
  });

  it('enters the stance, fires from full extension, and recovers', () => {
    expect(CARD_BLAST_EXIT_BLEND_MS).toBe(60);
    expect(cardBlastFrame('charging', 0, 0)).toBe(0);
    expect(cardBlastFrame('charging', 282, 0.5)).toBeGreaterThanOrEqual(6);
    expect(cardBlastFrame('active', 0, 1)).toBe(10);
    expect(cardBlastFrame('recovery', 0, 1)).toBe(11);
    expect(cardBlastFrame('recovery', CARD_BLAST_RETRACT_MS - 1, 1)).toBe(11);
    expect(cardBlastFrame('recovery', CARD_BLAST_RETRACT_MS, 1)).toBe(12);
    expect(cardBlastFrame('recovery', 200, 1)).toBe(12);
  });

  it('uses stable key poses when motion is reduced', () => {
    expect(cardBlastFrame('charging', 20, 0.2, true)).toBe(6);
    expect(cardBlastFrame('active', 0, 1, true)).toBe(10);
    expect(cardBlastFrame('recovery', 0, 1, true)).toBe(12);
  });
});

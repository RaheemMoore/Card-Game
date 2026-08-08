import { describe, expect, it } from 'vitest';
import { pointAwayFrom, randomPointInBounds, stepToward } from './movement';

describe('wildlife movement', () => {
  it('chooses destinations inside the roaming area', () => {
    expect(randomPointInBounds({ x: 100, y: 200, width: 80, height: 60 }, () => 0.5, 10)).toEqual({
      x: 140,
      y: 230,
    });
  });

  it('moves at a frame-rate-independent speed', () => {
    const step = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 40, 250, 1);
    expect(step.position).toEqual({ x: 10, y: 0 });
    expect(step.facing).toBe('right');
    expect(step.arrived).toBe(false);
  });

  it('clamps a flee target to the roaming area', () => {
    expect(
      pointAwayFrom(
        { x: 110, y: 110 },
        { x: 150, y: 150 },
        { x: 100, y: 100, width: 60, height: 60 },
        200,
      ),
    ).toEqual({ x: 100, y: 100 });
  });
});

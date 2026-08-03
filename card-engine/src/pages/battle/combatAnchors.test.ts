import { describe, expect, it } from 'vitest';
import { BOSS_POINT, partyVolleyBossAnchor, resolveAnchor } from './combatAnchors';

describe('party volley boss anchors', () => {
  it('places three releases in a readable upper-left, upper-right, lower-center triangle', () => {
    const points = [0, 1, 2].map((order) =>
      resolveAnchor(partyVolleyBossAnchor(order), { viewportWidth: 1440 }),
    );

    expect(points[0].x).toBeLessThan(BOSS_POINT.x);
    expect(points[0].y).toBeLessThan(BOSS_POINT.y);
    expect(points[1].x).toBeGreaterThan(BOSS_POINT.x);
    expect(points[1].y).toBe(points[0].y);
    expect(points[2].x).toBe(BOSS_POINT.x);
    expect(points[2].y).toBeGreaterThan(BOSS_POINT.y);
    expect(new Set(points.map((point) => `${point.x},${point.y}`))).toHaveLength(3);
  });

  it('keeps later releases on the lower-center fallback instead of stacking at center', () => {
    expect(partyVolleyBossAnchor(4)).toBe('boss_impact_lower_center');
  });
});

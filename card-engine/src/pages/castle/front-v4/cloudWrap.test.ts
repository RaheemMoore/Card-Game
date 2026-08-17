import { describe, expect, it } from 'vitest';
import { CLOUD_ACTORS } from './backdrop';
import { CLOUD_OFFSCREEN_LEAD_PCT, cloudLeftPct } from './cloudWrap';

const LEAD = CLOUD_OFFSCREEN_LEAD_PCT;

describe('cloudLeftPct', () => {
  it('starts each cloud at its authored phase', () => {
    expect(cloudLeftPct(7, 0, 231)).toBe(7);
    expect(cloudLeftPct(70, 0, 243)).toBe(70);
  });

  it('carries a cloud leftwards as it travels', () => {
    expect(cloudLeftPct(70, 20, 243)).toBe(50);
    expect(cloudLeftPct(70, 100, 243)).toBe(-30);
  });

  /**
   * The bug this whole module exists to prevent. Travel only ever grows, so the
   * naive `%` runs negative almost immediately, and JavaScript keeps the sign of
   * the dividend — every cloud would make one pass and then sit just off the left
   * edge forever, and the sky would be empty for the rest of the session.
   */
  it('brings a cloud back round instead of stranding it at negative travel', () => {
    expect(cloudLeftPct(7, 1000, 231)).toBeGreaterThan(-LEAD);
    for (const travel of [0, 37, 260, 1000, 12_345, 999_999]) {
      const x = cloudLeftPct(7, travel, 231);
      expect(x).toBeGreaterThanOrEqual(-LEAD);
      expect(x).toBeLessThan(231 - LEAD);
    }
  });

  it('repeats exactly once per period', () => {
    expect(cloudLeftPct(34, 500, 239)).toBeCloseTo(cloudLeftPct(34, 500 + 239, 239), 10);
  });

  it('re-enters from beyond the right edge, never mid-screen', () => {
    // One step past the point where it disappears, it must be off the right side.
    const justGone = 7 + LEAD;
    expect(cloudLeftPct(7, justGone + 0.001, 231)).toBeGreaterThan(100);
  });
});

describe('CLOUD_ACTORS', () => {
  /**
   * The lead has to swallow the widest cloud whole. At 28% versus a 30% lead there
   * is two points of headroom, so a future cloud drawn any wider would pop out of
   * existence on screen — a defect that looks like a rendering glitch and would be
   * hunted in the renderer rather than in a constant.
   */
  it('has no cloud wider than the offscreen lead', () => {
    for (const actor of CLOUD_ACTORS) {
      expect(actor.widthPct).toBeLessThan(LEAD);
    }
  });

  /**
   * Shared periods would make two clouds keep station with each other forever,
   * which is the one arrangement that reads as a repeating background.
   */
  it('gives every cloud its own period', () => {
    const periods = CLOUD_ACTORS.map((a) => a.periodPct);
    expect(new Set(periods).size).toBe(periods.length);
  });
});

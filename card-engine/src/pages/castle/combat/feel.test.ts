import { describe, expect, it } from 'vitest';
import { MIN_CHARGE_LEVEL } from './actionState';
import {
  HEAVY_CHARGE,
  HITSTOP_CAP_MS,
  getAttackFeel,
  getHitFeel,
  severityForCharge,
  type HitSeverity,
} from './feel';

const TIERS: readonly HitSeverity[] = ['light', 'normal', 'heavy'];

describe('severity from charge', () => {
  it('reads a tap as light', () => {
    // A quick release fires at exactly MIN_CHARGE_LEVEL by actionState's rule.
    // If that constant moves and this threshold does not, taps silently become
    // normal hits and the quiet tier stops existing — so assert against the
    // real constant rather than a copy of its value.
    expect(severityForCharge(MIN_CHARGE_LEVEL)).toBe('light');
  });

  it('reads a full hold as heavy', () => {
    expect(severityForCharge(1)).toBe('heavy');
    expect(severityForCharge(HEAVY_CHARGE)).toBe('heavy');
  });

  it('reads a partial hold as normal', () => {
    expect(severityForCharge(0.45)).toBe('normal');
  });

  it("agrees with the runtime's heavy test at the boundary", () => {
    // The construct's knockback reaction asks `charge >= 0.6`. The two must
    // never disagree about which shots are the big ones.
    expect(severityForCharge(HEAVY_CHARGE - 0.0001)).not.toBe('heavy');
  });
});

describe('hit feel', () => {
  it('escalates every weight axis with severity', () => {
    const [light, normal, heavy] = TIERS.map((t) => getHitFeel(t, 'full'));
    for (const key of ['hitstopMs', 'flashMs', 'knockbackEaseMs', 'particleCount'] as const) {
      expect(light[key]).toBeLessThan(normal[key]);
      expect(normal[key]).toBeLessThan(heavy[key]);
    }
  });

  it('never exceeds the hitstop cap', () => {
    // The cap is what stops a crowd of simultaneous hits freezing the game.
    for (const t of TIERS) {
      expect(getHitFeel(t, 'full').hitstopMs).toBeLessThanOrEqual(HITSTOP_CAP_MS);
    }
  });

  it('does not shake the world for a tap', () => {
    // If everything shakes, nothing does — and taps are what the player fires
    // constantly.
    expect(getHitFeel('light', 'full').shakeIntensity).toBe(0);
    expect(getHitFeel('heavy', 'full').shakeIntensity).toBeGreaterThan(0);
  });

  it('drops world motion but keeps sprite motion on subtle', () => {
    const s = getHitFeel('heavy', 'subtle');
    expect(s.shakeIntensity).toBe(0);
    expect(s.shakeMs).toBe(0);
    expect(s.hitstopMs).toBeGreaterThan(0);
    expect(s.hitstopMs).toBeLessThan(getHitFeel('heavy', 'full').hitstopMs);
  });

  it('keeps the hit READABLE with motion off', () => {
    // The rule the whole motion ladder exists to protect: losing motion costs
    // movement, never information. A hit with no flash at all would be a hit
    // the player cannot see.
    for (const t of TIERS) {
      const off = getHitFeel(t, 'off');
      expect(off.hitstopMs).toBe(0);
      expect(off.shakeIntensity).toBe(0);
      expect(off.particleCount).toBe(0);
      expect(off.staticFallback).toBe(true);
      expect(off.flashPeakAlpha).toBeGreaterThan(0);
      expect(off.flashMs).toBeGreaterThan(getHitFeel(t, 'full').flashMs);
    }
  });

  it('defaults to full motion when nothing is passed', () => {
    expect(getHitFeel('heavy')).toEqual(getHitFeel('heavy', 'full'));
  });
});

describe('attack feel', () => {
  it('leans further and lunges harder as the shot gets heavier', () => {
    const [light, normal, heavy] = TIERS.map((t) => getAttackFeel(t, 'full'));
    for (const key of ['windupLeanPx', 'lungePx', 'squash'] as const) {
      expect(light[key]).toBeLessThan(normal[key]);
      expect(normal[key]).toBeLessThan(heavy[key]);
    }
  });

  it('is silent with motion off', () => {
    // Unlike the flash, a lunge carries nothing the player cannot read from the
    // card leaving his hand, so it is safe to drop entirely.
    expect(getAttackFeel('heavy', 'off')).toEqual({ windupLeanPx: 0, lungePx: 0, squash: 0 });
  });
});

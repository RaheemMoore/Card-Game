import { describe, expect, it } from 'vitest';
import { scatterArc, scatterPoints, PICKUP_RADIUS, SCATTER_FLIGHT_MS } from './scatter';
import type { Vec2 } from './aim';

/** A deterministic stand-in for Math.random, so a scatter can be replayed. */
const seeded = (seed = 1) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
};

const origin: Vec2 = { x: 1000, y: 1000 };
const anywhere = () => true;
const nowhere = () => false;

describe('scatterPoints', () => {
  it('always produces one point per card', () => {
    for (const count of [1, 2, 3, 4]) {
      const pts = scatterPoints({ origin, count, isValid: anywhere, random: seeded() });
      expect(pts).toHaveLength(count);
    }
  });

  it('never loses a card, even when nowhere is standable', () => {
    // The outcome this module exists to prevent. A card that cannot be placed is
    // a CHARACTER deleted by a physics accident, so the fallback is his own feet:
    // a poor pickup, and a reachable one.
    const pts = scatterPoints({ origin, count: 4, isValid: nowhere, random: seeded() });
    expect(pts).toHaveLength(4);
    for (const p of pts) expect(p).toEqual(origin);
  });

  it('only ever lands cards on valid ground', () => {
    // Water on the whole eastern half: nothing may land there.
    const isValid = (p: Vec2) => p.x < origin.x;
    const pts = scatterPoints({ origin, count: 4, isValid, random: seeded(7) });
    for (const p of pts) expect(p.x).toBeLessThan(origin.x);
  });

  it('keeps cards within running distance and off his feet', () => {
    const pts = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(3) });
    for (const p of pts) {
      const d = Math.hypot(p.x - origin.x, p.y - origin.y);
      expect(d).toBeGreaterThanOrEqual(50);
      expect(d).toBeLessThanOrEqual(160);
    }
  });

  it('does not stack two cards on the same spot', () => {
    // Two pickups occupying one point look like one card and play like a bug.
    const pts = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(11) });
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('tightens the scatter rather than giving up in a cramped corner', () => {
    // Only a small ring near him is standable — a courtyard corner, a doorway.
    // That should still scatter, just closer in, instead of dumping everything
    // on the fallback point.
    const isValid = (p: Vec2) => Math.hypot(p.x - origin.x, p.y - origin.y) <= 80;
    const pts = scatterPoints({ origin, count: 3, isValid, random: seeded(5) });
    const onFallback = pts.filter((p) => p.x === origin.x && p.y === origin.y);
    expect(onFallback.length).toBeLessThan(3);
  });

  it('spreads a four-card burst around him rather than to one side', () => {
    const pts = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(2) });
    const left = pts.filter((p) => p.x < origin.x).length;
    expect(left).toBeGreaterThan(0);
    expect(left).toBeLessThan(4);
  });

  it('replays identically for the same seed, and differs for another', () => {
    const a = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(42) });
    const b = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(42) });
    const c = scatterPoints({ origin, count: 4, isValid: anywhere, random: seeded(99) });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('scatterArc', () => {
  const from: Vec2 = { x: 0, y: 0 };
  const to: Vec2 = { x: 100, y: 40 };

  it('starts on him and ends on the landing point', () => {
    expect(scatterArc(from, to, 0)).toMatchObject({ x: 0, y: 0, heightPx: 0 });
    const end = scatterArc(from, to, 1);
    expect(end.x).toBeCloseTo(100);
    expect(end.y).toBeCloseTo(40);
    expect(end.heightPx).toBeCloseTo(0);
  });

  it('peaks in the middle, and height is separate from position', () => {
    // Height is a drawing offset. Folding it into y would sort the card as though
    // it had landed further north than it did — the same rule the blast follows.
    const mid = scatterArc(from, to, 0.5);
    expect(mid.heightPx).toBeGreaterThan(0);
    expect(mid.y).toBeCloseTo(20);
  });

  it('clamps rather than overshooting on a late frame', () => {
    const late = scatterArc(from, to, 1.8);
    expect(late.x).toBeCloseTo(100);
    expect(late.heightPx).toBeCloseTo(0);
  });
});

describe('recovery tuning', () => {
  it('is forgiving enough to sweep a card up while running', () => {
    // A precise walk-over turns a playful scramble into a chore.
    expect(PICKUP_RADIUS).toBeGreaterThanOrEqual(20);
    expect(SCATTER_FLIGHT_MS).toBeLessThan(800);
  });
});

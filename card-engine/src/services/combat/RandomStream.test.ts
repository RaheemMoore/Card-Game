import { describe, it, expect } from 'vitest';
import { RandomStream } from './RandomStream';

describe('RandomStream', () => {
  it('produces identical sequences for the same seed', () => {
    const a = new RandomStream(42);
    const b = new RandomStream(42);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new RandomStream(1);
    const b = new RandomStream(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('advances cursor monotonically on each roll', () => {
    const rng = new RandomStream(7);
    expect(rng.cursor).toBe(0);
    rng.next();
    expect(rng.cursor).toBe(1);
    rng.nextInt(0, 10);
    expect(rng.cursor).toBe(2);
    rng.pick([1, 2, 3]);
    expect(rng.cursor).toBe(3);
  });

  it('nextInt stays within [min, max] inclusive', () => {
    const rng = new RandomStream(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(10);
    }
  });

  it('nextInt throws on inverted range', () => {
    expect(() => new RandomStream(1).nextInt(10, 5)).toThrow();
  });

  it('pick throws on empty array', () => {
    expect(() => new RandomStream(1).pick([])).toThrow();
  });

  it('fork produces independent stream without perturbing parent', () => {
    const parent = new RandomStream(123);
    parent.next(); // cursor = 1
    const child = parent.fork(10);
    expect(child.seed).toBe(123);
    expect(child.cursor).toBe(11);
    // Parent unaffected.
    expect(parent.cursor).toBe(1);
    child.next();
    child.next();
    expect(parent.cursor).toBe(1);
  });

  it('resuming from a cursor produces the same future rolls', () => {
    const a = new RandomStream(555);
    a.next(); a.next(); a.next();
    const midCursor = a.cursor;
    const nextFromA = [a.next(), a.next()];

    const b = new RandomStream(555, midCursor);
    const nextFromB = [b.next(), b.next()];
    expect(nextFromA).toEqual(nextFromB);
  });

  it('snapshot round-trips through a new stream', () => {
    const a = new RandomStream(9);
    for (let i = 0; i < 5; i++) a.next();
    const snap = a.snapshot();
    const b = new RandomStream(snap.seed, snap.cursor);
    expect(b.next()).toBe(a.next());
  });
});

/**
 * Small deterministic PRNG, shared by every "code rolls it, seeded from an id"
 * system in the app.
 *
 * Extracted from `imageEngine/identityRoller.ts`, which established the
 * pattern: roll from `cardId` so a resumed forge — or a reassignment months
 * later — reproduces exactly the same result, and so nothing depends on
 * `Math.random` at a point where reproducibility matters.
 *
 * NOT for combat. The battle reducer has its own `RandomStream` with an
 * explicit cursor, because replay requires knowing how many numbers were
 * drawn and in what order. Use that there; use this for one-shot rolls.
 */

/** FNV-style string hash → 32-bit unsigned seed. */
export function hashString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, deterministic. Returns [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A generator seeded from a string — the usual entry point. */
export function seededRng(seed: string): () => number {
  return mulberry32(hashString(seed));
}

/** Uniform pick. Returns undefined for an empty list rather than `items[NaN]`. */
export function pickOne<T>(items: readonly T[], rng: () => number): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}

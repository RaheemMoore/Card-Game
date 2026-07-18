/**
 * Mulberry32 seeded PRNG with an explicit cursor.
 *
 * Deterministic contract (Boss Battle spec §13):
 *   - Two streams constructed with the same seed produce identical sequences.
 *   - `cursor` starts at 0 and increments on every roll, so a battle's roll
 *     history is fully reconstructable from (seed, cursor).
 *   - `fork(offset)` creates an independent stream at a fixed cursor advance;
 *     lets sub-systems (e.g. boss action tiebreaks) draw without perturbing
 *     the main stream.
 */
export class RandomStream {
  readonly seed: number;
  private _cursor: number;

  constructor(seed: number, cursor = 0) {
    this.seed = seed >>> 0;
    this._cursor = cursor >>> 0;
  }

  get cursor(): number {
    return this._cursor;
  }

  /** Uniform float in [0, 1). Advances cursor by 1. */
  next(): number {
    this._cursor = (this._cursor + 1) >>> 0;
    let t = (this.seed + this._cursor * 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. Advances cursor by 1. */
  nextInt(min: number, max: number): number {
    if (max < min) throw new Error(`nextInt: max ${max} < min ${min}`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Random element of array. Advances cursor by 1. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('RandomStream.pick: empty array');
    return items[this.nextInt(0, items.length - 1)];
  }

  /** Independent stream at (seed, cursor + offset). Does not affect this cursor. */
  fork(offset: number): RandomStream {
    return new RandomStream(this.seed, this._cursor + offset);
  }

  /** Snapshot state for logging/replay diffing. */
  snapshot(): { seed: number; cursor: number } {
    return { seed: this.seed, cursor: this._cursor };
  }
}

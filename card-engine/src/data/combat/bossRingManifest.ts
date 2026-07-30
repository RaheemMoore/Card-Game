/**
 * Per-boss orbiting effect rings.
 *
 * A ring is a set of INDIVIDUAL pieces laid out by code, never one pre-composed
 * image. That is the whole reason it exists as data: a single ring image can
 * only ever rotate as a lump, whereas separate pieces can be counted, dimmed
 * and — the point — detached one at a time so a weapon flies at a hero as its
 * move resolves. The ring then reads as the boss's remaining move set rather
 * than as decoration.
 *
 * The Debt-Bearer's pieces were CUT FROM HER OWN CONCEPT ART rather than
 * generated, so they cost nothing and are exactly the approved design.
 *
 * ── Two things here are load-bearing, not styling ────────────────────────
 *
 * `arcDegrees` is deliberately less than 360. A full circle puts its lowest
 * pieces below the boss's feet, where they read as objects lying on the floor
 * instead of orbiting behind — the first version did exactly that and was
 * rejected on sight. Leaving the bottom open keeps the low pieces at hip height
 * beside the figure.
 *
 * The pieces are ADDITIVE GLOW PLATES on black, composited with `screen`, not
 * alpha cut-outs. Screen-blending drops the black for free and lets the fire
 * add light to the arena rather than sitting on top of it as a sticker. An
 * alpha-matted flame has a hard edge and reads as pasted; the first attempt
 * proved it.
 */

export interface BossRingSpec {
  /** Piece paths, in clockwise order. Resolved against /assets/combat/. */
  pieces: readonly string[];
  /** Arc swept, in degrees. Under 360 leaves the bottom open — see above. */
  arcDegrees: number;
  /** Where the arc starts, degrees clockwise from straight up. */
  startDegrees: number;
  /** Radii as a fraction of the boss sprite box. */
  radiusX: number;
  radiusY: number;
  /** Piece width as a fraction of the boss sprite box width. */
  pieceScale: number;
  /** Centre offset from the sprite box centre, as a fraction of its height. */
  centerYOffset: number;
  /** CSS colour for the glow bloom. */
  glow: string;
}

const DEBT_BEARER_RING: BossRingSpec = {
  pieces: [
    'bosses/debt-bearer/ring/weapon-0.png',
    'bosses/debt-bearer/ring/weapon-1.png',
    'bosses/debt-bearer/ring/weapon-2.png',
    'bosses/debt-bearer/ring/weapon-3.png',
    'bosses/debt-bearer/ring/weapon-4.png',
    'bosses/debt-bearer/ring/weapon-5.png',
    'bosses/debt-bearer/ring/weapon-6.png',
  ],
  arcDegrees: 310,
  startDegrees: -155,
  // Radii are >0.5, i.e. the arc deliberately extends BEYOND the sprite box.
  // The boss fills that box, so anything inside it hides behind him — the first
  // pass used 0.62/0.46 and the ring was invisible in play.
  radiusX: 1.02,
  radiusY: 0.72,
  pieceScale: 0.34,
  centerYOffset: -0.08,
  glow: 'rgba(255,120,40,',
};

export const BOSS_RING_MANIFEST: Record<string, BossRingSpec> = {
  boss_champion_barbarian: DEBT_BEARER_RING,
};

export function getBossRing(bossId: string): BossRingSpec | null {
  return BOSS_RING_MANIFEST[bossId] ?? null;
}

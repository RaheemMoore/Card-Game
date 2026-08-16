import type { Vec2 } from '../../pages/castle/combat/aim';

/** Four gameplay facings, each approved from the same persistent PixelLab hero. */
export type CardBlastFacing = 'left' | 'right' | 'up' | 'down';

export interface CardBlastSheet {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frameCount: number;
  anchor: { x: number; y: number };
}

/**
 * Independent strips preserve each generated canvas and measured feet baseline.
 * Phaser aligns them at the feet and briefly cross-fades neighboring poses while
 * aim changes; forcing unlike canvases into one grid would reintroduce foot pop.
 */
export const CARD_BLAST_SHEETS: Record<CardBlastFacing, CardBlastSheet> = {
  left: {
    key: 'hero-card-blast',
    path: '/assets/castle/hero/card-blast/card-blast-sheet.png',
    frameWidth: 86,
    frameHeight: 111,
    columns: 13,
    frameCount: 13,
    anchor: { x: 0.5, y: 87 / 111 },
  },
  right: {
    key: 'hero-card-blast-right',
    path: '/assets/castle/hero/card-blast/card-blast-right-sheet.png',
    frameWidth: 86,
    frameHeight: 109,
    columns: 13,
    frameCount: 13,
    anchor: { x: 0.5, y: 87 / 109 },
  },
  up: {
    key: 'hero-card-blast-up',
    path: '/assets/castle/hero/card-blast/card-blast-up-sheet.png',
    frameWidth: 95,
    frameHeight: 112,
    columns: 13,
    frameCount: 13,
    anchor: { x: 0.5, y: 94 / 112 },
  },
  down: {
    key: 'hero-card-blast-down',
    path: '/assets/castle/hero/card-blast/card-blast-down-sheet.png',
    frameWidth: 86,
    frameHeight: 111,
    columns: 13,
    frameCount: 13,
    anchor: { x: 0.5, y: 88 / 111 },
  },
};

/** Backward-compatible name for the first approved left-facing proof. */
export const CARD_BLAST_SHEET = CARD_BLAST_SHEETS.left;
export const CARD_BLAST_ANCHOR = CARD_BLAST_SHEETS.left.anchor;

/** Short enough to feel aimed, long enough that a held turn is not a hard cut. */
export const CARD_BLAST_TURN_MS = 120;

/** Post-shot timing within ACTION_TIMING.recoveryMs (90 + 100 + 60 = 250). */
export const CARD_BLAST_RETRACT_MS = 90;
export const CARD_BLAST_EXIT_BLEND_MS = 60;

/**
 * Measured card locations at the fully braced frame.
 * `groundOffset` remains collision/depth truth; `heightPx` lifts only the art.
 */
export const CARD_BLAST_MUZZLES: Record<
  CardBlastFacing,
  { groundOffsetX: number; groundOffsetY: number; heightPx: number }
> = {
  left: { groundOffsetX: -29, groundOffsetY: 0, heightPx: 36 },
  right: { groundOffsetX: 33, groundOffsetY: 0, heightPx: 34 },
  up: { groundOffsetX: 25, groundOffsetY: -14, heightPx: 28 },
  down: { groundOffsetX: -10, groundOffsetY: 14, heightPx: 50 },
};

/** Backward-compatible name for the first approved left-facing muzzle. */
export const CARD_BLAST_MUZZLE = {
  offsetX: CARD_BLAST_MUZZLES.left.groundOffsetX,
  heightPx: CARD_BLAST_MUZZLES.left.heightPx,
} as const;

export type CardBlastPhase = 'explore' | 'charging' | 'windup' | 'active' | 'recovery';

/** Nearest cardinal art pose; continuous aim is preserved separately for the muzzle. */
export function cardBlastFacingForAim(aim: Vec2): CardBlastFacing {
  if (Math.abs(aim.x) >= Math.abs(aim.y)) return aim.x < 0 ? 'left' : 'right';
  return aim.y < 0 ? 'up' : 'down';
}

export function usesLeftCardBlast(aim: Vec2): boolean {
  return cardBlastFacingForAim(aim) === 'left';
}

export function leftCardBlastOrigin(feet: Vec2) {
  return { x: feet.x + CARD_BLAST_MUZZLE.offsetX, y: feet.y };
}

/**
 * Interpolate the four measured card positions by the continuous aim vector.
 * The body may be between two rendered facings, but charge, selected-card art,
 * particles, and the projectile never snap to a cardinal angle.
 */
export function cardBlastMuzzleForAim(feet: Vec2, aim: Vec2) {
  const length = Math.hypot(aim.x, aim.y) || 1;
  const x = aim.x / length;
  const y = aim.y / length;
  const horizontal = x < 0 ? CARD_BLAST_MUZZLES.left : CARD_BLAST_MUZZLES.right;
  const vertical = y < 0 ? CARD_BLAST_MUZZLES.up : CARD_BLAST_MUZZLES.down;
  const total = Math.abs(x) + Math.abs(y) || 1;
  const horizontalWeight = Math.abs(x) / total;
  const verticalWeight = Math.abs(y) / total;
  return {
    origin: {
      x:
        feet.x +
        horizontal.groundOffsetX * horizontalWeight +
        vertical.groundOffsetX * verticalWeight,
      y:
        feet.y +
        horizontal.groundOffsetY * horizontalWeight +
        vertical.groundOffsetY * verticalWeight,
    },
    drawHeightPx:
      horizontal.heightPx * horizontalWeight + vertical.heightPx * verticalWeight,
  };
}

/**
 * Put the card and its gathered light on the same side of the body as the hand.
 * Up-screen is behind the hero in this top-down view; down-screen is in front.
 * Horizontal aim keeps the existing foreground treatment because the card is
 * beside the silhouette and should continue to cover the baked placeholder.
 */
export function cardBlastLayerOffsetsForAim(aim: Vec2) {
  const behindHero = aim.y < 0;
  return behindHero
    ? { heldCard: -1, chargeFlash: -2 }
    : { heldCard: 1, chargeFlash: 2 };
}

/**
 * Drive every facing from one gameplay clock. Turning while charging therefore
 * changes only direction; it never restarts the draw or loses charge progress.
 */
export function cardBlastFrame(
  phase: CardBlastPhase,
  elapsedMs: number,
  chargeLevel: number,
  reducedMotion = false,
): number {
  if (phase === 'explore') return 0;
  if (reducedMotion) {
    if (phase === 'recovery') return 12;
    return phase === 'charging' ? 6 : 10;
  }

  if (phase === 'charging') {
    const enterFrame = Math.min(6, Math.floor(Math.max(0, elapsedMs) / 47));
    if (enterFrame < 6) return enterFrame;
    return 6 + (Math.floor((elapsedMs - 282) / 120) % 3);
  }

  if (phase === 'windup') {
    const start = Math.round(4 + Math.max(0, Math.min(1, chargeLevel)) * 4);
    const t = Math.max(0, Math.min(1, elapsedMs / 180));
    return Math.min(10, Math.round(start + (10 - start) * t));
  }

  if (phase === 'active') return 10;
  return elapsedMs < CARD_BLAST_RETRACT_MS ? 11 : 12;
}

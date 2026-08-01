import type { Point } from '../combatAnchors';

/**
 * Percent-space anchors → pixel-space geometry for an A→B effect.
 *
 * ## The bug this exists to fix
 *
 * Every beam in the game so far has been laid out like this:
 *
 * ```ts
 * const length = Math.hypot(to.x - from.x, to.y - from.y);   // in PERCENT
 * // ...  width: `${length}%`, transform: `rotate(${angle}deg)`
 * ```
 *
 * (`AttackVFX.tsx`, `GenericRenderer.tsx`, and the dev tiling preview.)
 *
 * That is only correct in a **square** container. Anchors are percentages of
 * two different axes, so on a 900×560 arena one horizontal percent is 9px and
 * one vertical percent is 5.6px — mixing them in a single `hypot` produces a
 * length that is neither, and `width: N%` then resolves against the WIDTH
 * only, while the rotation was computed from the mismatched pair. The line
 * lands short or long and at a slightly wrong angle.
 *
 * Thin, fast, short-lived bolts get away with it — nobody measures a 220ms
 * streak. A thick stream that has to START at the card edge and END on the
 * boss does not: both ends are visibly attached to something, so any error
 * reads immediately as the effect missing.
 *
 * ## Why a pure function
 *
 * The fix needs the container's pixel size, which is a layout read — and the
 * performance budget forbids layout reads inside animation loops. So the
 * measurement happens once per resize (a `ResizeObserver` in the component)
 * and is passed in here, where the maths is pure and can be tested against
 * several aspect ratios without a DOM.
 */

export interface Size {
  width: number;
  height: number;
}

export interface StreamGeometry {
  /** Start, in pixels relative to the container's top-left. */
  x: number;
  y: number;
  /** True distance between the two anchors, in pixels. */
  length: number;
  /** Rotation from the +x axis, in degrees. */
  angle: number;
}

/**
 * Resolve two percent-space anchors into a pixel-space box to rotate.
 *
 * The returned box is positioned at `from` and rotated by `angle` about its
 * left-middle (`transform-origin: 0 50%`), which is the idiom every beam in
 * this codebase already uses — the only change is that the numbers are now
 * pixels and therefore correct on a non-square stage.
 */
export function resolveStreamGeometry(
  from: Point,
  to: Point,
  container: Size,
): StreamGeometry {
  const x0 = (from.x / 100) * container.width;
  const y0 = (from.y / 100) * container.height;
  const x1 = (to.x / 100) * container.width;
  const y1 = (to.y / 100) * container.height;

  const dx = x1 - x0;
  const dy = y1 - y0;

  return {
    x: x0,
    y: y0,
    length: Math.hypot(dx, dy),
    angle: (Math.atan2(dy, dx) * 180) / Math.PI,
  };
}

/**
 * How many tile widths fit along the stream, rounded UP.
 *
 * Rounded up rather than down so the stream always reaches its target — a
 * partial tile at the far end is hidden under the impact splash, whereas a
 * missing one leaves a visible gap short of the boss.
 */
export function tileCount(length: number, tileWidth: number): number {
  if (tileWidth <= 0) return 1;
  return Math.max(1, Math.ceil(length / tileWidth));
}

/**
 * Scroll offset for a given moment, in pixels, wrapped to one tile width.
 *
 * Wrapping is what makes the scroll seamless forever rather than drifting off
 * after a few seconds: the texture only ever moves within a single tile's
 * worth of travel, and the tiling covers the rest.
 */
export function scrollOffset(elapsedMs: number, pxPerSecond: number, tileWidth: number): number {
  if (tileWidth <= 0) return 0;
  const travelled = (elapsedMs / 1000) * pxPerSecond;
  return travelled % tileWidth;
}

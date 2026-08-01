import { useEffect, useRef, useState } from 'react';
import type { MotionLevel } from '../../../vfx/types';
import type { MaterialKit } from '../../../services/combat/performance/types';
import type { Point } from '../combatAnchors';
import { resolveStreamGeometry, scrollOffset, tileCount } from './streamGeometry';
import { streamScrollSpeed, streamThickness } from './materialStyle';

/**
 * A gushing stream between two points — the hose, not the sine wave.
 *
 * ## Why this is not one generated clip
 *
 * A generated animation is a fixed size. This stream is not: it spans from
 * whichever card is casting to the boss, and that length and angle change with
 * the hero slot and the window width. A pre-rendered beam would stretch or
 * squash. So the art is a short **tile** and the length is made of however
 * many tiles fit, scrolling toward the target.
 *
 * ## Why tiling works here when the Batch A segments failed
 *
 * The segments failed because each was a finished object with two closed ends
 * that had to meet other closed ends at arbitrary points along a curve. A
 * scrolling texture never has to meet anything — it is one continuous strip,
 * and it only has to repeat in ONE axis.
 *
 * And that one axis is guaranteed by **mirror-tiling**: every other copy is
 * flipped horizontally, so tile N's right edge is always adjacent to a copy of
 * itself. The seam is mathematically identical on both sides and therefore
 * invisible, no matter what the generator returned. That safeguard is why this
 * was worth attempting rather than a rerun of a known failure.
 *
 * ## Motion
 *
 * The scroll is one rAF writing a single `transform` on the tile row — not a
 * state update per tile per frame, and no layout reads inside the loop (the
 * container is measured once per resize by a `ResizeObserver`). At
 * `motionLevel: 'off'` the stream renders as a held static connection: the
 * information (this card is connected to that target, by this material) must
 * survive, only the movement goes away.
 */

interface Props {
  from: Point;
  to: Point;
  kit: MaterialKit;
  motionLevel: MotionLevel;
  /** 0 → 1 across the whole performance; the stream extends with it. */
  progressRef: React.RefObject<number>;
  /** Tile source — frame 0, and the only frame used when motion is off. */
  src: string;
  /**
   * Per-frame tile sources for internal churn, if the material has them.
   *
   * Swapped on the tile `<img>` elements rather than stepped through a packed
   * strip: a strip needs `background-repeat: no-repeat` to isolate a frame,
   * which is precisely what a tiled stream cannot use. Scroll and churn are
   * then independent — `transform` moves the row, `src` changes the substance.
   */
  frames?: readonly string[];
  fps?: number;
  tile: { width: number; height: number };
  intensity: 'normal' | 'heavy' | 'ultimate';
}

export function StreamBody({
  from,
  to,
  kit,
  motionLevel,
  progressRef,
  src,
  frames,
  fps = 12,
  tile,
  intensity,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [frame, setFrame] = useState(0);

  /*
   * Measure the stage once, and again only when it resizes.
   *
   * This is the layout read that makes the geometry correct on a non-square
   * arena (see streamGeometry.ts). Doing it here — outside the animation loop —
   * is what keeps it inside the performance budget.
   */
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = size ? resolveStreamGeometry(from, to, size) : null;
  const thickness = streamThickness(kit) * (intensity === 'ultimate' ? 1.5 : intensity === 'heavy' ? 1.25 : 1);
  // Tile drawn at the stream's thickness, keeping the source aspect so the
  // texture is never squashed — a stretched tile stops reading as a material.
  const tileW = Math.max(8, Math.round(tile.width * (thickness / tile.height)));
  const still = motionLevel === 'off';

  useEffect(() => {
    if (!geo || still) return;

    let raf = 0;
    let cancelled = false;
    const startedAt = performance.now();
    const speed = streamScrollSpeed(kit);

    const tick = () => {
      if (cancelled) return;
      const row = rowRef.current;
      if (row) {
        const p = progressRef.current ?? 0;
        // The stream reaches the target fast and then holds while the impact
        // resolves — a jet arrives, it does not creep across.
        const extend = Math.min(1, p / 0.4);
        const offset = scrollOffset(performance.now() - startedAt, speed, tileW);
        // One transform on the row, not per tile. The negative X is the flow
        // travelling toward the target; the row is over-long by one tile so the
        // scroll never exposes its tail.
        row.style.transform = `translateX(${-offset}px)`;
        row.style.clipPath = `inset(0 ${(1 - extend) * 100}% 0 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [geo?.length, still, kit, tileW, progressRef]);

  /*
   * Churn. One interval for the whole row, not one per tile — every tile shows
   * the same frame, which is correct: it is one body of moving liquid, not a
   * queue of independently animating objects.
   */
  const churn = !still && frames && frames.length > 1;
  useEffect(() => {
    if (!churn) {
      setFrame(0);
      return;
    }
    const id = window.setInterval(
      () => setFrame((f) => (f + 1) % frames.length),
      1000 / Math.max(1, fps),
    );
    return () => window.clearInterval(id);
  }, [churn, frames, fps]);

  const tileSrc = churn ? frames[frame] : src;

  // +2 so the row is longer than the stream: one spare tile absorbs the scroll,
  // and one covers the rounding at the far end under the splash.
  const n = geo ? tileCount(geo.length, tileW) + 2 : 0;

  return (
    <div ref={hostRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 22 }} aria-hidden>
      {geo && (
        <div
          style={{
            position: 'absolute',
            left: geo.x,
            top: geo.y,
            width: geo.length,
            height: thickness,
            marginTop: -thickness / 2,
            transformOrigin: '0 50%',
            transform: `rotate(${geo.angle}deg)`,
            overflow: 'hidden',
            // A soft falloff at the muzzle end so the stream emerges from the
            // card rather than starting with a hard cut edge.
            maskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 6%, black 100%)',
          }}
        >
          <div
            ref={rowRef}
            style={{
              display: 'flex',
              height: '100%',
              width: n * tileW,
              // Static variant holds the full connection; see the motion note
              // in the docstring.
              clipPath: still ? undefined : 'inset(0 100% 0 0)',
            }}
          >
            {Array.from({ length: n }, (_, i) => (
              <img
                key={i}
                src={tileSrc}
                alt=""
                style={{
                  width: tileW,
                  height: thickness,
                  flex: '0 0 auto',
                  // Mirror-tiling: every other copy is flipped, so each seam
                  // meets its own mirror image and cannot show a discontinuity.
                  transform: i % 2 === 1 ? 'scaleX(-1)' : undefined,
                  imageRendering: 'pixelated',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

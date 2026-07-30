import { useEffect, useRef, useState } from 'react';
import type { BossClip } from '../../data/combat/bossSpriteManifest';
import type { MotionLevel } from '../../vfx/types';

/**
 * Plays a horizontal strip sheet by stepping `background-position`.
 *
 * ── Why DOM and not canvas ───────────────────────────────────────────────
 * The battle view is DOM: the arena, the shelf, the dock, the HUD, the shake
 * layers and the impact flash are all elements in a z-index stack, and the
 * boss has to sit INSIDE that stack (above the arena, below the chrome). A
 * canvas would have to be composited into the same stack anyway, and would
 * then need its own scaling, DPI and reduced-motion handling that the DOM
 * already gives us. Stepping a background offset is the whole technique.
 *
 * ── A 1-frame clip is the point ──────────────────────────────────────────
 * With `frameCount: 1` this renders identically to the plain `<img>` it
 * replaced: no timer is ever started, no stepping happens. That is what lets
 * the player ship and be verified against the CURRENT static art, before any
 * generation is spent. If the battle looks any different today, the wiring is
 * wrong.
 *
 * ── Reduced motion ───────────────────────────────────────────────────────
 * At `MotionLevel: 'off'` the clip renders frame 0 and never advances.
 * Reduced motion means no MOTION, not no TIME — the beat still holds for its
 * full duration, matching REDUCED_MOTION_BY_CUE. The player just doesn't move.
 */
interface SpriteClipPlayerProps {
  clip: BossClip;
  /** Public URL for the sheet. */
  src: string;
  /**
   * Changing this restarts playback from frame 0. Pass the state name (and,
   * for one-shots that can repeat, something that varies per firing) — a
   * second `attack` in a row must replay, not sit on its held last frame.
   */
  clipKey: string;
  motion: MotionLevel;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
}

export function SpriteClipPlayer({
  clip,
  src,
  clipKey,
  motion,
  className,
  style,
  alt,
}: SpriteClipPlayerProps) {
  const [frame, setFrame] = useState(0);
  // Kept in a ref so the stepping effect doesn't re-subscribe every frame.
  const frameRef = useRef(0);

  const { frameCount, fps, frame: box, loop } = clip;
  const animated = frameCount > 1 && motion !== 'off';

  useEffect(() => {
    setFrame(0);
    frameRef.current = 0;
  }, [clipKey]);

  useEffect(() => {
    if (!animated) return;
    const stepMs = 1000 / fps;
    const id = window.setInterval(() => {
      const next = frameRef.current + 1;
      if (next >= frameCount) {
        // A held one-shot parks on its last frame; the interval is cleared so
        // a finished defeat pose isn't re-rendering forever behind the
        // result modal.
        if (!loop) {
          window.clearInterval(id);
          return;
        }
        frameRef.current = 0;
      } else {
        frameRef.current = next;
      }
      setFrame(frameRef.current);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [animated, fps, frameCount, loop, clipKey]);

  /**
   * Percentage stepping rather than pixel maths, so the sprite stays
   * responsive inside the arena's `clamp()` sizing with no measurement.
   *
   * With the element one frame wide, `background-size: N*100% 100%` scales the
   * strip so each frame exactly fills it, and frame `i` sits at
   * `i/(N-1) * 100%` — the standard sprite-sheet percentage trick, where 100%
   * means "align the sheet's right edge to the element's right edge", not
   * "one frame across".
   */
  const positionX = frameCount > 1 ? `${(frame / (frameCount - 1)) * 100}%` : '0%';

  return (
    <div
      role="img"
      aria-label={alt}
      className={className}
      style={{
        height: '100%',
        maxWidth: '100%',
        // Preserves the frame's aspect the way `object-contain` did for the
        // <img> this replaced — a strip cannot use background-size: contain.
        aspectRatio: `${box.width} / ${box.height}`,
        margin: '0 auto',
        backgroundImage: `url(${src})`,
        backgroundSize: `${frameCount * 100}% 100%`,
        backgroundPosition: `${positionX} 0`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}

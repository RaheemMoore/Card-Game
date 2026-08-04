import { useEffect, useRef, useState } from 'react';
import type { MotionLevel } from '../../../vfx/types';

/**
 * Plays a performance asset that has separate per-frame files.
 *
 * ## Why not `SpriteClipPlayer`
 *
 * That player steps a PACKED strip by offsetting a background, which requires
 * `background-repeat: no-repeat` to isolate one frame. It is the right tool for
 * a boss sprite and the wrong one here for two reasons: the stream tiles need
 * `repeat-x`, and PixelLab's `animate_image` returns frames as individual
 * images with no packing step available in this repo. Swapping `src` costs one
 * attribute write per frame and the browser caches every frame after the first
 * pass.
 *
 * ## One-shots hold their last frame
 *
 * A splash resolves once — it must not loop, and it must not disappear when it
 * finishes, because the aftermath stage keeps it on the boss for most of a
 * second. So a non-looping clip parks on its final frame and clears its timer,
 * exactly as `SpriteClipPlayer` does for a defeat pose.
 */

interface Props {
  /** Frame 0 / the still, used when motion is off or there are no frames. */
  src: string;
  frames?: readonly string[];
  fps?: number;
  loop?: boolean;
  motionLevel: MotionLevel;
  /** Changing this restarts from frame 0 so a repeat cast replays. */
  playKey?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function AssetFrames({
  src,
  frames,
  fps = 14,
  loop = false,
  motionLevel,
  playKey,
  className,
  style,
}: Props) {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);

  const animated = !!frames && frames.length > 1 && motionLevel !== 'off';

  useEffect(() => {
    setFrame(0);
    frameRef.current = 0;
  }, [playKey]);

  useEffect(() => {
    if (!animated) return;
    const id = window.setInterval(() => {
      const next = frameRef.current + 1;
      if (next >= frames.length) {
        if (!loop) {
          // Park on the last frame. The splash has to stay on the boss for the
          // whole aftermath; clearing the timer stops it re-rendering forever.
          window.clearInterval(id);
          return;
        }
        frameRef.current = 0;
      } else {
        frameRef.current = next;
      }
      setFrame(frameRef.current);
    }, 1000 / Math.max(1, fps));
    return () => window.clearInterval(id);
  }, [animated, frames, fps, loop, playKey]);

  return (
    <img
      src={animated ? frames[frame] : src}
      alt=""
      className={className}
      style={{ imageRendering: 'pixelated', ...style }}
    />
  );
}

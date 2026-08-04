import type { CSSProperties, ReactNode } from 'react';

/**
 * The one framed-surface primitive for the pixel UI kit.
 *
 * Art: `public/assets/ui/kit/panel-frame.png` — PixelLab, Round 3, approved by
 * Raheem 2026-08-04. Wood body, slim gold trim, turquoise crystal corners.
 * See `public/assets/ui/PROVENANCE.md`. NOT REPRODUCIBLE — do not overwrite it.
 *
 * WHY `border-image` AND NOT A BACKGROUND: the source frame's centre is
 * genuinely hollow (measured: 0 opaque px of 1849 in the centre third), and
 * `border-image` without `fill` paints only the ring. That means the element's
 * own `background` shows through the middle, so one 128px asset serves a
 * 40px pill and an 860px menu without the interior ever being baked in.
 *
 * THE 32px SLICE IS MEASURED, NOT GUESSED. The frame's top-edge brightness runs
 * flat from x=32 to x=96 while its gold ornaments sit at x≈16-24 and 104-112 —
 * inside the corners. A 32px corner slice therefore captures the ornament and
 * leaves a middle that repeats cleanly. Change it and the ornaments smear.
 *
 * `image-rendering: pixelated` is not optional. Without it the browser
 * smooths the upscale and the art stops being pixel art.
 */

const FRAME_SRC = '/assets/ui/kit/panel-frame.png';
/** Corner region in the 128px source. Measured — see the note above. */
const SLICE_PX = 32;

export type PanelVariant = 'hud' | 'shelf' | 'sheet' | 'tile' | 'pill';

/**
 * Variants are RENDER SIZE ONLY — every one of them uses the same art file.
 * That is the mechanism that keeps a whole-game UI to a handful of pieces
 * instead of one asset per surface. Adding a variant must not mean adding art.
 */
/**
 * `hud` at 16 is the REFERENCE WEIGHT — Raheem, 2026-08-04, reviewing all five
 * side by side: "the third one that says HUD is probably the best one, is the
 * good width of frame." The others are tuned around it rather than spanning a
 * wide range; `sheet` was 32 and read as a heavy picture frame rather than a
 * game menu. Keep changes here relative to 16.
 */
const VARIANTS: Record<PanelVariant, { borderWidth: number }> = {
  hud: { borderWidth: 16 },
  shelf: { borderWidth: 16 },
  sheet: { borderWidth: 18 },
  tile: { borderWidth: 12 },
  pill: { borderWidth: 10 },
};

interface Props {
  children?: ReactNode;
  variant?: PanelVariant;
  /** Overrides the variant's rendered ring thickness. */
  borderWidth?: number;
  /** Shows through the hollow centre. */
  background?: string;
  className?: string;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
}

export function Panel({
  children,
  variant = 'sheet',
  borderWidth,
  background = 'rgba(38,28,22,0.96)',
  className = '',
  style,
  role,
  ariaLabel,
}: Props) {
  const width = borderWidth ?? VARIANTS[variant].borderWidth;
  return (
    <div
      className={className}
      role={role}
      aria-label={ariaLabel}
      style={{
        position: 'relative',
        background,
        borderStyle: 'solid',
        borderWidth: width,
        borderImageSource: `url(${FRAME_SRC})`,
        borderImageSlice: SLICE_PX,
        borderImageRepeat: 'repeat',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

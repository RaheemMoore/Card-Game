import type { CSSProperties, ReactNode } from 'react';

/**
 * Real painted 9-slice frame art replacing the CSS-drawn CombatFrame
 * primitive for the command shelf band. `bronze-frame.png` and
 * `parchment.png` are cropped directly from this game's own card border
 * art (`public/assets/borders/dominance.png` — the bronze molding + gem
 * corners already used on every card), not a separate downloaded pack —
 * so the shelf shares the same painted-metal-and-parchment language as
 * the cards it's dealing abilities from, and there's nothing new to
 * license. See the game-systems `card-engine-power-system-spec.md`
 * border-variant table for where the source art comes from in-app.
 *
 * Uses CSS `border-image`: the source PNG's corner+edge region paints the
 * border ring only (no `fill`), so the element's own `background` still
 * shows through the interior — same layering model as the old CombatFrame,
 * just with painted art for the ring instead of a CSS stroke.
 *
 * `borderWidth` controls the ON-SCREEN thickness independent of the source
 * slice size — the same art asset can render as a thin outer shelf frame
 * and a heavier, more dominant ability-slot frame just by changing this
 * prop, without needing two separate image files.
 */

const PANEL_SRC = '/assets/combat/shelf/bronze-frame.png';
/** Pixel size of the corner/trim region in the 300×205 source image. */
const PANEL_SLICE_PX = 26;

// A small, evenly-lit patch of the same card-parchment texture, cropped
// well clear of the source art's corner vignette (an earlier version used
// the full vignetted banner crop stretched with `background-size: cover`,
// which put visible dark fades right at each ability slot's edges). Tiled
// via `repeat` instead of stretched — a repeating swatch scales cleanly to
// any box size, so the same background works at any shelf/button width
// instead of warping to fit one fixed aspect ratio.
const PARCHMENT_TILE = '/assets/combat/shelf/parchment.png';
const PARCHMENT_TILE_SIZE = '210px 162px';

/** Muted parchment fill (outer shelf, utility tray) — recedes behind the
 *  ability slots' warmer tone so the abilities still read as the star.
 *
 *  NB: the `background` shorthand requires `<position> / <size>` together —
 *  `repeat / <size>` with no position before the slash is invalid CSS and
 *  gets the whole declaration dropped silently (computed style falls back
 *  to `background: none`). Learned this the hard way: shipped it without
 *  checking computed styles, and every shelf surface rendered fully
 *  transparent with the boss arena bleeding through behind it. */
export const PARCHMENT_MUTED =
  `linear-gradient(rgba(8,6,5,0.6), rgba(8,6,5,0.6)), url(${PARCHMENT_TILE}) left top / ${PARCHMENT_TILE_SIZE} repeat`;

/** Warm parchment fill (ability slots) — same texture, amber-washed so it
 *  reads as the shelf's most important surface without a different asset. */
export const PARCHMENT_WARM =
  `linear-gradient(rgba(140,80,20,0.16), rgba(140,80,20,0.16)), url(${PARCHMENT_TILE}) left top / ${PARCHMENT_TILE_SIZE} repeat`;

interface Props {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Final rendered border thickness (px). Bigger = more visually dominant. */
  borderWidth?: number;
  /** Background behind the interior (border-image only paints the ring). */
  background?: string;
  /** Source art for the 9-slice ring. Defaults to the shelf stone panel. */
  src?: string;
  /** Pixel size of the corner region in `src`. Must match `src`'s own dimensions. */
  slicePx?: number;
  role?: string;
  ariaLabel?: string;
}

export function PaintedPanel({
  children,
  className = '',
  style,
  borderWidth = 24,
  background = '#0d0c0e',
  src = PANEL_SRC,
  slicePx = PANEL_SLICE_PX,
  role,
  ariaLabel,
}: Props) {
  return (
    // No default `position` class here — this primitive has no internal
    // absolutely-positioned children (unlike the old CombatFrame), so it
    // doesn't need one, and hardcoding `relative` previously fought with
    // callers that need `absolute` via className (Tailwind's cascade order
    // let `relative` win regardless of className string order, silently
    // breaking the command shelf's bottom-pinned positioning).
    <div
      className={className}
      role={role}
      aria-label={ariaLabel}
      style={{
        background,
        borderStyle: 'solid',
        borderWidth,
        borderImageSource: `url(${src})`,
        borderImageSlice: slicePx,
        borderImageWidth: `${borderWidth}px`,
        borderImageRepeat: 'stretch',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

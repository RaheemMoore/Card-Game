import type { CSSProperties, ReactNode } from 'react';

/**
 * Real painted 9-slice frame art (CC0, Foozle "RPG UI Set 1 - Diablo Style",
 * sourced from itch.io / OpenGameArt — see
 * public/assets/combat/shelf/SOURCE-LICENSE.txt) replacing the CSS-drawn
 * CombatFrame primitive for the command shelf band. Carved gold/bronze
 * panel with real filigree corners — the thing CSS gradients couldn't
 * fake. The source pack shipped a gray-stone tone that read as flat and
 * un-fantasy; `panel-1.png`/`panel-2.png`/`corner.png` are the same art,
 * recolored in place (hue mix toward warm gold, +saturation) so the frame
 * itself carries color instead of relying on a filter or a different asset.
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

const PANEL_SRC = '/assets/combat/shelf/panel-1.png';
/** Pixel size of the corner region in the 624×436 source image. */
const PANEL_SLICE_PX = 140;

interface Props {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Final rendered border thickness (px). Bigger = more visually dominant. */
  borderWidth?: number;
  /** Background behind the interior (border-image only paints the ring). */
  background?: string;
  role?: string;
  ariaLabel?: string;
}

export function PaintedPanel({
  children,
  className = '',
  style,
  borderWidth = 24,
  background = '#0d0c0e',
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
        borderImageSource: `url(${PANEL_SRC})`,
        borderImageSlice: PANEL_SLICE_PX,
        borderImageWidth: `${borderWidth}px`,
        borderImageRepeat: 'stretch',
        ...style,
      }}
    >
      {/* Inner gold hairline — sits just inside the painted border so the
          frame reads as a layered, carved metal edge rather than one flat
          stroke. Kept separate from `boxShadow` (which callers already use
          for glow/elevation) so it can't be silently clobbered by a
          caller's own shadow value.
          NB: relies on the caller already establishing a containing block
          (the shelf has `absolute` in its className; ability slots always
          set a non-'none' `transform`) — deliberately NOT adding a default
          `position` here, since an inline `position: relative` would beat
          the shelf's Tailwind `.absolute` class outright (inline style
          always wins over a stylesheet class) and reintroduce the exact
          shelf-renders-at-top bug fixed earlier. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 2,
          boxShadow: 'inset 0 0 0 1px rgba(255,224,168,0.22)',
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}

import type { CSSProperties } from 'react';

/**
 * Meter bar — the generated trough, with the fill drawn INSIDE its channel.
 *
 * Rebuilt after Raheem: "the bars are absolutely terrible. They're lifeless,
 * they're tiny that you can't see any design, they're surrounded by these giant
 * dark boxes."
 *
 * All three complaints were one mistake. The trough was rendered as a
 * `border-image` ring with no `fill`, so the art's own channel and gold end caps
 * were discarded and a dark CSS `background` showed through instead — the "giant
 * dark box". The art was also 120x30 inside a 128x128 canvas, so the slice
 * sampled mostly empty space and what survived was a hairline.
 *
 * Now: the trough is a scaled background image (the whole art, not a ring), and
 * the fill is inset to sit within the channel rather than covering the rim. The
 * bar has a real minimum height so the generated detail is actually visible —
 * a 22px bar cannot show 30px of art.
 */

const TROUGH_SRC = '/assets/ui/kit/bar-trough.png';
/** Native art size, post-trim. The bar renders at integer multiples of this so
 *  the pixels stay square — a fractional scale is what makes pixel art fuzz. */
const NATIVE = { w: 120, h: 30 };
/** Rim thickness in native pixels — the fill must not cover the gold caps. */
const CHANNEL_INSET = { x: 13, y: 6 };

export type BarTone = 'hp' | 'rage' | 'resource';

/**
 * Fill colours only — never a second art file.
 *
 * HARD STOPS, NOT SMOOTH GRADIENTS. A continuous gradient with a glow is the
 * single most obvious way to make CSS look like CSS sitting inside pixel art,
 * and it is exactly what Raheem called out: the fill "does not fit within the
 * actual design of the pixelated health bar." Pixel art shades in discrete
 * bands, so these are three flat bands with abrupt boundaries — highlight,
 * body, shadow — matching how the generated trough itself is shaded.
 */
const TONES: Record<BarTone, [string, string, string]> = {
  hp: ['#8fe6a4', '#4bb069', '#2c7444'],
  rage: ['#ffc178', '#e8722c', '#a83a12'],
  resource: ['#9ceff9', '#3aaec6', '#1d7186'],
};

/** Three flat bands: 25% highlight, 50% body, 25% shadow. No interpolation. */
function bandedFill([hi, body, lo]: [string, string, string]): string {
  return `linear-gradient(180deg, ${hi} 0 25%, ${body} 25% 75%, ${lo} 75% 100%)`;
}

interface Props {
  /** 0–1. Clamped, so a bad upstream value can't overflow the channel. */
  value: number;
  tone?: BarTone;
  /**
   * Integer multiplier on the art's native size. 2 = 240x60.
   * Default is 2 — Raheem, once the fill sat correctly in the channel: "they
   * actually don't need to be that big now that they're fitting properly."
   */
  scale?: number;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function Bar({ value, tone = 'hp', scale = 2, label, className = '', style }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const s = Math.max(1, Math.round(scale));
  const inset = { x: CHANNEL_INSET.x * s, y: CHANNEL_INSET.y * s };

  return (
    <div
      className={className}
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative',
        width: NATIVE.w * s,
        height: NATIVE.h * s,
        // The WHOLE art, scaled — not a ring. `pixelated` keeps it crisp.
        backgroundImage: `url(${TROUGH_SRC})`,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      {/* Fill sits under the rim, clipped to the channel. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: inset.x,
          right: inset.x,
          top: inset.y,
          bottom: inset.y,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            background: bandedFill(TONES[tone]),
            // No glow. A soft bloom around a pixel fill is the other half of
            // what made this read as CSS-in-a-sprite.
            transition: 'width 220ms ease',
          }}
        />
      </div>
    </div>
  );
}

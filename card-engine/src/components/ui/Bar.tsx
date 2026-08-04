import type { CSSProperties } from 'react';

/**
 * Meter bar — trough art plus a component-drawn fill.
 *
 * Art: `public/assets/ui/kit/bar-trough.png` (PixelLab R3). The trough is
 * generated EMPTY on purpose. A trough with a fill baked in can only ever show
 * one value, and the round-1 attempt that shipped a filled channel was
 * unusable for exactly that reason. The fill below is a plain div, so HP, rage
 * and resource all share one asset and differ only by colour.
 *
 * `role="meter"` with the aria value trio is what makes this readable to
 * assistive tech — a coloured div alone announces nothing.
 */

const TROUGH_SRC = '/assets/ui/kit/bar-trough.png';
const SLICE_PX = 24;

export type BarTone = 'hp' | 'rage' | 'resource';

/** Fill colours only. Never a second art file. */
const TONES: Record<BarTone, string> = {
  hp: 'linear-gradient(180deg,#6fd98a 0%,#3f9c5c 100%)',
  rage: 'linear-gradient(180deg,#ff9a4d 0%,#d1471f 100%)',
  resource: 'linear-gradient(180deg,#63d7e8 0%,#2b8fa8 100%)',
};

interface Props {
  /** 0–1. Clamped, so a bad upstream value can't overflow the trough. */
  value: number;
  tone?: BarTone;
  height?: number;
  label: string;
  className?: string;
  style?: CSSProperties;
}

export function Bar({ value, tone = 'hp', height = 22, label, className = '', style }: Props) {
  const pct = Math.max(0, Math.min(1, value));
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
        height,
        borderStyle: 'solid',
        borderWidth: 10,
        borderImageSource: `url(${TROUGH_SRC})`,
        borderImageSlice: SLICE_PX,
        borderImageRepeat: 'repeat',
        imageRendering: 'pixelated',
        background: 'rgba(20,12,8,0.92)',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: `${pct * 100}%`,
          background: TONES[tone],
          transition: 'width 220ms ease',
        }}
      />
    </div>
  );
}

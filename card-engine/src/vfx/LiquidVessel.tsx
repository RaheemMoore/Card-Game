import { useEffect, useRef, useState } from 'react';
import type { MotionLevel } from './types';

/**
 * A vessel of moving liquid, filled 0..1.
 *
 * ── Portable ─────────────────────────────────────────────────────────────
 * Per `src/vfx/types.ts`, nothing in this folder may import from
 * `types/combat`, `services/combat`, or `types/bible`. This component has
 * never heard of mana, a hero, or a battle — it takes a fraction, a palette
 * and a motion level. That is what lets it be reused for forge heat, boss
 * rage, or a minigame charge without modification.
 *
 * ── Why the surface is two waves, not one ────────────────────────────────
 * A single translating wave reads as a scrolling texture. Two, at different
 * speeds and opacities, never repeat in phase over any short window, so the
 * surface looks disturbed rather than looped. This is the cheapest honest
 * liquid: no simulation, no canvas, two SVG paths and a transform.
 *
 * ── Why the level overshoots ─────────────────────────────────────────────
 * Liquid has mass. Snapping the level to its new height reads as a progress
 * bar; overshooting and settling reads as something sloshing in a container.
 * The overshoot lives in the transition's cubic-bezier (final control point
 * past 1), not in JS.
 */

export interface LiquidPalette {
  /** Bottom of the body — the deepest, darkest tone. */
  deep: string;
  /** Mid body. */
  mid: string;
  /** The bright line riding the surface. */
  crest: string;
  /** Outer bloom colour. */
  glow: string;
}

interface Props {
  /** 0..1. Values outside are clamped. */
  fill: number;
  palette: LiquidPalette;
  motion: MotionLevel;
  /** Rendered above the vessel. */
  label?: string;
  /** Shown large over the body — usually `value` / `max`. */
  readout?: string;
  width?: number;
  height?: number;
  className?: string;
}

/** One period of a wave, drawn wide enough to tile twice inside the vessel. */
const WAVE_PATH =
  'M0,10 C 15,2 35,2 50,10 C 65,18 85,18 100,10 C 115,2 135,2 150,10 ' +
  'C 165,18 185,18 200,10 L200,40 L0,40 Z';

export function LiquidVessel({
  fill,
  palette,
  motion,
  label,
  readout,
  width = 52,
  height = 104,
  className,
}: Props) {
  const pct = Math.max(0, Math.min(1, fill));
  const still = motion === 'off';

  // A brief surge whenever the level RISES, so gaining is felt and not merely
  // observed. Losing is already dramatic — the surface drops away.
  const [surge, setSurge] = useState(0);
  const prev = useRef(pct);
  useEffect(() => {
    if (pct > prev.current + 0.001) setSurge((n) => n + 1);
    prev.current = pct;
  }, [pct]);

  return (
    <div className={className} style={{ width, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && (
        <span
          style={{
            fontSize: 8,
            letterSpacing: 1.4,
            textAlign: 'center',
            color: palette.crest,
            opacity: 0.85,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}

      <div
        key={surge}
        className={still ? undefined : 'lv-vessel'}
        style={{
          position: 'relative',
          width,
          height,
          borderRadius: 7,
          overflow: 'hidden',
          // Forged metal housing, matching the game's existing vessel language.
          background: 'linear-gradient(to bottom, #0e0b09 0%, #16110d 100%)',
          border: '2px solid #4a382f',
          boxShadow: `inset 0 0 14px rgba(0,0,0,0.9), 0 0 10px ${palette.glow}44`,
        }}
      >
        {/* The body of liquid. Height is the level; the transition's final
            control point (1.55) is what makes it overshoot and settle. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${pct * 100}%`,
            transition: still
              ? 'height 200ms linear'
              : 'height 620ms cubic-bezier(0.34, 1.55, 0.64, 1)',
            background: `linear-gradient(to top, ${palette.deep} 0%, ${palette.mid} 70%, ${palette.crest} 100%)`,
            boxShadow: `0 0 16px 2px ${palette.glow}99`,
          }}
        >
          {/* Surface. Sits ABOVE the body's top edge so the waves break the
              straight line that would otherwise give it away as a bar. */}
          {pct > 0.02 && (
            <svg
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                left: '-50%',
                width: '200%',
                height: 14,
                top: -7,
                overflow: 'visible',
              }}
            >
              <path
                d={WAVE_PATH}
                fill={palette.mid}
                opacity={0.9}
                className={still ? undefined : 'lv-wave-a'}
              />
              <path
                d={WAVE_PATH}
                fill={palette.crest}
                opacity={0.45}
                className={still ? undefined : 'lv-wave-b'}
              />
            </svg>
          )}
        </div>

        {/* Glass: a highlight down one side, so the vessel reads as a rounded
            container rather than a flat slot. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 5,
            background:
              'linear-gradient(105deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 42%, rgba(255,255,255,0.06) 100%)',
            pointerEvents: 'none',
          }}
        />

        {readout && (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 600,
              color: '#f4e8d2',
              textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.8)',
              pointerEvents: 'none',
            }}
          >
            {readout}
          </span>
        )}
      </div>

      <style>{`
        /* Two waves, different speeds and directions. In phase they would
           read as one scrolling texture; out of phase the surface churns. */
        @keyframes lv-wave-a { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes lv-wave-b { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .lv-wave-a { animation: lv-wave-a 2.6s linear infinite; }
        .lv-wave-b { animation: lv-wave-b 3.9s linear infinite; }

        /* Gaining resource kicks the housing. Keyed remount replays it. */
        @keyframes lv-surge {
          0%   { filter: brightness(1); }
          25%  { filter: brightness(1.5); }
          100% { filter: brightness(1); }
        }
        .lv-vessel { animation: lv-surge 420ms ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .lv-wave-a, .lv-wave-b, .lv-vessel { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { MotionLevel } from './types';

/**
 * A hexagonal reactor lattice that CHARGES, filled 0..1.
 *
 * ── Why not a battery, and why not liquid ────────────────────────────────
 * This is the counterpart to `LiquidVessel`, and the contrast is the point:
 * mana FLOWS, tech CHARGES. Liquid is continuous and obeys gravity; a lattice
 * is discrete and obeys wiring. Rendering both resources as the same rising
 * fluid in two colours would say they are the same substance, which is exactly
 * the distinction the two-chamber economy exists to make.
 *
 * The hexagon is not an arbitrary choice — it is already this game's tech
 * shape. `AbilityResourceBadge` draws tech as a hexagon in
 * `--ability-resource-tech-surface` blue while mana is a violet circle, so a
 * hex lattice extends existing iconography rather than inventing a second
 * visual language for the same idea.
 *
 * Cells ignite from the bottom up. The cell row AT the charge line pulses,
 * which is what gives the eye a moving frontier to read instead of a static
 * count of lit cells.
 *
 * ── Portable ─────────────────────────────────────────────────────────────
 * Per `src/vfx/types.ts` nothing here may import from `types/combat`,
 * `services/combat` or `types/bible`. This knows nothing about tech, heroes or
 * battles — a fraction, a palette, a motion level.
 */

export interface LatticePalette {
  /** Unlit cell interior. */
  dormant: string;
  /** Lit cell interior. */
  charged: string;
  /** Cell outline + the frontier pulse. */
  edge: string;
  /** Outer bloom. */
  glow: string;
}

interface Props {
  /** 0..1. Values outside are clamped. */
  fill: number;
  palette: LatticePalette;
  motion: MotionLevel;
  label?: string;
  readout?: string;
  width?: number;
  height?: number;
  className?: string;
}

/** Lattice geometry, in viewBox units. */
const COLS = 3;
const ROWS = 7;
const R = 7; // hex circumradius
const H_STEP = R * 1.74; // horizontal spacing for a flat-top grid
const V_STEP = R * 1.5;

/** Flat-top hexagon points centred on (cx, cy). */
function hexPoints(cx: number, cy: number, r: number): string {
  return [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    })
    .join(' ');
}

interface Cell {
  cx: number;
  cy: number;
  /** 0 at the bottom row, 1 at the top — the threshold at which it lights. */
  threshold: number;
  row: number;
}

function buildCells(): Cell[] {
  const cells: Cell[] = [];
  const vbW = COLS * H_STEP + R;
  for (let row = 0; row < ROWS; row++) {
    // Offset alternate rows so the cells interlock rather than sitting in a
    // plain grid — an aligned grid reads as a spreadsheet, not a lattice.
    const odd = row % 2 === 1;
    const cols = odd ? COLS - 1 : COLS;
    for (let col = 0; col < cols; col++) {
      const cx = R + col * H_STEP + (odd ? H_STEP / 2 : 0) + (vbW - (cols * H_STEP)) / 2 - R / 2;
      const cy = R + row * V_STEP;
      cells.push({ cx, cy, threshold: 1 - (row + 0.5) / ROWS, row });
    }
  }
  return cells;
}

const CELLS = buildCells();
const VB_W = COLS * H_STEP + R;
const VB_H = (ROWS - 1) * V_STEP + R * 2;

export function LatticeCore({
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

  const [surge, setSurge] = useState(0);
  const prev = useRef(pct);
  useEffect(() => {
    if (pct > prev.current + 0.001) setSurge((n) => n + 1);
    prev.current = pct;
  }, [pct]);

  // The frontier: the row whose threshold the charge line currently sits in.
  const frontierRow = CELLS.reduce<number | null>((acc, c) => {
    if (pct > c.threshold) return acc === null ? c.row : Math.min(acc, c.row);
    return acc;
  }, null);

  return (
    <div className={className} style={{ width, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {label && (
        <span
          style={{
            fontSize: 8,
            letterSpacing: 1.4,
            textAlign: 'center',
            color: palette.edge,
            opacity: 0.85,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      )}

      <div
        key={surge}
        className={still ? undefined : 'lc-core'}
        style={{
          position: 'relative',
          width,
          height,
          borderRadius: 7,
          overflow: 'hidden',
          background: 'linear-gradient(to bottom, #080d12 0%, #0d141c 100%)',
          border: '2px solid #2f4150',
          boxShadow: `inset 0 0 14px rgba(0,0,0,0.9), 0 0 10px ${palette.glow}44`,
        }}
      >
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 4 }}
        >
          {CELLS.map((c, i) => {
            const lit = pct > c.threshold;
            const isFrontier = frontierRow !== null && c.row === frontierRow && lit;
            return (
              <polygon
                key={i}
                points={hexPoints(c.cx, c.cy, R * 0.86)}
                fill={lit ? palette.charged : palette.dormant}
                stroke={lit ? palette.edge : '#24313d'}
                strokeWidth={0.7}
                className={isFrontier && !still ? 'lc-frontier' : undefined}
                style={{
                  // Staggered so a rising charge sweeps up the lattice instead
                  // of every cell switching on together.
                  transition: still ? 'none' : `fill 220ms ease-out ${c.row * 22}ms, stroke 220ms ease-out`,
                  filter: lit ? `drop-shadow(0 0 3px ${palette.glow})` : undefined,
                }}
              />
            );
          })}
        </svg>

        {/* Conduit spine: a vertical trace the charge visibly climbs. Without
            it the lit cells look independent rather than wired together. */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: 2,
            marginLeft: -1,
            height: `${pct * 100}%`,
            background: `linear-gradient(to top, ${palette.glow}00, ${palette.edge})`,
            transition: still ? 'height 200ms linear' : 'height 480ms cubic-bezier(0.2,0.9,0.3,1)',
            boxShadow: `0 0 6px ${palette.glow}`,
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
              textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
            }}
          >
            {readout}
          </span>
        )}
      </div>

      <style>{`
        /* The charge frontier breathes, so the eye has a moving edge to track
           rather than a static tally of lit cells. */
        @keyframes lc-frontier {
          0%, 100% { opacity: 0.72; }
          50%      { opacity: 1; }
        }
        .lc-frontier { animation: lc-frontier 1.1s ease-in-out infinite; }

        @keyframes lc-surge {
          0%   { filter: brightness(1); }
          22%  { filter: brightness(1.6); }
          100% { filter: brightness(1); }
        }
        .lc-core { animation: lc-surge 420ms ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .lc-frontier, .lc-core { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

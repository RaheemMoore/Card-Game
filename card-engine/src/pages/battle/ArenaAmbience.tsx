import { useMemo } from 'react';
import type { MotionLevel } from '../../vfx/types';

/**
 * Ambient life for an arena plate — drifting embers and a slow breath on the
 * arena's own fire light.
 *
 * ── Why this is code and not art ─────────────────────────────────────────
 * A background plate is a still image and always will be: there is no
 * animation endpoint for scenery, and generating frames of a burning horizon
 * would drift between them. Motion over a static plate is the standing answer
 * in this repo (the playbook reached the same conclusion for the courtyard),
 * and it costs zero generations and no extra assets.
 *
 * The embers are deterministic rather than random per mount, so the arena does
 * not reshuffle itself every time the component re-renders mid-fight.
 *
 * At `MotionLevel: 'off'` nothing is rendered at all. This is pure decoration —
 * unlike a beat hold, there is no information here to preserve, so the honest
 * reduced-motion behaviour is to omit it.
 */
interface Props {
  motionLevel: MotionLevel;
  /** Ember tint. Should come from the arena's own palette. */
  color?: string;
  /** How many embers. Kept low — this sits under a busy combat UI. */
  count?: number;
}

export function ArenaAmbience({
  motionLevel,
  color = 'rgba(255,150,60,0.85)',
  count = 22,
}: Props) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // A cheap hash, not Math.random: a re-render mid-battle must not
        // teleport every ember to a new position.
        const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
        return {
          left: r(1) * 100,
          size: 1 + Math.round(r(2) * 2),
          delay: -r(3) * 14,
          duration: 9 + r(4) * 9,
          drift: (r(5) - 0.5) * 60,
          opacity: 0.35 + r(6) * 0.5,
        };
      }),
    [count],
  );

  if (motionLevel === 'off') return null;

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
      {embers.map((e, i) => (
        <span
          key={i}
          className="arena-ember"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            background: color,
            opacity: e.opacity,
            animationDelay: `${e.delay}s`,
            animationDuration: `${e.duration}s`,
            ['--drift' as string]: `${e.drift}px`,
          }}
        />
      ))}
      <style>{`
        .arena-ember {
          position: absolute;
          bottom: -6px;
          border-radius: 50%;
          animation-name: arena-ember-rise;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
        }
        /* Rising, not falling: these are embers off the ground fire, and the
           fade-out near the top is what stops them reading as snow. */
        @keyframes arena-ember-rise {
          0%   { transform: translate(0, 0);                    opacity: 0; }
          12%  {                                                opacity: 1; }
          80%  {                                                opacity: 0.5; }
          100% { transform: translate(var(--drift), -78vh);     opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arena-ember { animation: none; opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { getGameFeel } from '../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../vfx/types';
import { resolveImpactAnchors } from './combatAnchors';
import { useViewportWidth } from './useViewportWidth';

interface Props {
  state: BattleState;
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
}

/**
 * A bloom of light centred on the point of impact, on heavy and ultimate
 * hits only.
 *
 * PLACEMENT IS THE WHOLE TRICK. This sits at z 14 — beneath the command
 * shelf (15), party dock (20), sprites (21), VFX (22), boss HUD (30) and the
 * ability preview (35), but above the arena background and the boss stage.
 * So the light appears to come from BEHIND and AROUND the fighters, its
 * bottom edge is the shelf's own painted frame line rather than an arbitrary
 * rectangle, and the dock's card art can never wash out. Insetting a flash
 * by the shelf height instead would draw a visible seam across the
 * composition and read as "a div flashed".
 *
 * Radial, not a flat fill: drama at the contact point, falling to roughly
 * 0.1 at the corners, which is what keeps the HUD readable through it.
 *
 * Never pure white — a full-white frame against this palette reads as a
 * broken render rather than as force.
 */
const FLASH_COLOR = '#fff3d9';

/** Minimum gap between flashes. An area attack emits one `damage_dealt` per
 *  target; without this, a three-hero sweep strobes three times in ~200ms. */
const RATE_LIMIT_MS = 400;

export function ImpactFlash({ state, currentBeat, motionLevel }: Props) {
  const [flash, setFlash] = useState<
    { key: number; x: number; y: number; peak: number; ms: number } | null
  >(null);
  const lastBeatId = useRef<string | null>(null);
  const lastFlashAt = useRef<number>(0);
  const viewportWidth = useViewportWidth();

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastBeatId.current) return;
    if (currentBeat.suppressEffects) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    lastBeatId.current = currentBeat.id;

    const feel = getGameFeel(currentBeat.severity, motionLevel);
    if (feel.flashPeak === 0) return;

    const now = performance.now();
    if (now - lastFlashAt.current < RATE_LIMIT_MS) return;

    const anchors = resolveImpactAnchors(state, e.sourceActorId, e.targetActorId, viewportWidth);
    if (!anchors) return;

    lastFlashAt.current = now;
    setFlash((cur) => ({
      key: (cur?.key ?? 0) + 1,
      x: anchors.to.x,
      y: anchors.to.y,
      peak: feel.flashPeak,
      ms: feel.flashMs,
    }));
  }, [currentBeat, motionLevel, state, viewportWidth]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), flash.ms);
    return () => window.clearTimeout(t);
  }, [flash]);

  if (!flash) return null;

  return (
    <div
      key={flash.key}
      aria-hidden
      className="absolute inset-0 pointer-events-none impact-flash"
      style={{
        zIndex: 14,
        background: `radial-gradient(circle 70% at ${flash.x}% ${flash.y}%, ${FLASH_COLOR} 0%, ${FLASH_COLOR}00 62%)`,
        ...({
          '--flash-peak': `${flash.peak}`,
          '--flash-ms': `${flash.ms}ms`,
        } as React.CSSProperties),
      }}
    >
      <style>{`
        /* Fast in, slower out. The peak is held for a single short moment —
           a lingering full-screen bloom is a strobe risk and stops reading
           as an impact. */
        @keyframes impact-flash {
          0%   { opacity: 0; }
          22%  { opacity: var(--flash-peak); }
          45%  { opacity: var(--flash-peak); }
          100% { opacity: 0; }
        }
        .impact-flash { animation: impact-flash var(--flash-ms) ease-out forwards; }

        @media (prefers-reduced-motion: reduce) {
          .impact-flash { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
}

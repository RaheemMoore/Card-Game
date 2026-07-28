import { useEffect, useRef, useState } from 'react';
import type { AnimationBeat } from '../../services/combat/presentation/types';

interface Props {
  currentBeat: AnimationBeat | null;
  actorId: string;
}

/** Must match the `float-damage` keyframes' own duration below. */
const ANIMATION_MS = 1500;
/** Reduced-motion: no animation, just a plain readable hold before it clears. */
const REDUCED_MOTION_HOLD_MS = 900;

/**
 * Rises + fades over its parent. Rendered as an absolutely-positioned
 * overlay; parent must be `position: relative`.
 *
 * Deliberately does NOT derive its render output directly from
 * `currentBeat` (the original implementation did, and that was the actual
 * bug behind "goes up too fast / not far enough / disappears too soon" —
 * the presentation queue advances past a damage/heal/shield beat after
 * just 350-400ms (`TIMINGS.impact`/`TIMINGS.floating`), so the element was
 * unmounting at ~400ms regardless of how long the CSS animation itself was
 * declared to run — it never got anywhere near its later keyframes).
 * Instead this latches the triggering beat into local state on a fresh
 * beat id (same pattern HeroForeground.tsx already uses for its hit-shake/
 * flash effects) and clears it on its own timer matching the animation's
 * real duration, independent of how fast the beat queue moves on.
 */
export function FloatingDamage({ currentBeat, actorId }: Props) {
  const [active, setActive] = useState<{ key: string; text: string; color: string } | null>(null);
  const lastBeatId = useRef<string | null>(null);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!currentBeat || currentBeat.id === lastBeatId.current) return;
    const info = describe(currentBeat, actorId);
    if (!info) return;
    lastBeatId.current = currentBeat.id;

    if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    setActive({ key: currentBeat.id, ...info });

    let reduced = false;
    try {
      reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    } catch {
      reduced = false;
    }
    clearTimer.current = window.setTimeout(
      () => setActive(null),
      reduced ? REDUCED_MOTION_HOLD_MS : ANIMATION_MS,
    );
  }, [currentBeat, actorId]);

  useEffect(
    () => () => {
      if (clearTimer.current !== null) window.clearTimeout(clearTimer.current);
    },
    [],
  );

  if (!active) return null;

  return (
    <div
      key={active.key}
      className="absolute inset-0 pointer-events-none flex items-start justify-center z-20"
      aria-hidden
    >
      <span
        className="font-fantasy font-bold text-2xl select-none floating-damage"
        style={{
          color: active.color,
          textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 12px rgba(0,0,0,0.55)',
        }}
      >
        {active.text}
      </span>
      <style>{`
        @keyframes float-damage {
          0%   { opacity: 0;   transform: translateY(28px) scale(0.85); }
          12%  { opacity: 1;   transform: translateY(0)    scale(1.08); }
          65%  { opacity: 1;   transform: translateY(-55px) scale(1); }
          100% { opacity: 0;   transform: translateY(-85px) scale(0.92); }
        }
        .floating-damage {
          animation: float-damage ${ANIMATION_MS}ms ease-out forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-damage {
            animation: none;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function describe(
  beat: AnimationBeat,
  actorId: string,
): { text: string; color: string } | null {
  const e = beat.event;
  switch (e.kind) {
    case 'damage_dealt':
      if (e.targetActorId !== actorId) return null;
      return { text: `-${e.amount}`, color: '#ff6b6b' };
    case 'healing_applied':
      if (e.targetActorId !== actorId) return null;
      return { text: `+${e.amount}`, color: '#5adf85' };
    case 'shield_gained':
      if (e.targetActorId !== actorId) return null;
      return { text: `🛡 +${e.amount}`, color: '#8ec5ff' };
    default:
      return null;
  }
}

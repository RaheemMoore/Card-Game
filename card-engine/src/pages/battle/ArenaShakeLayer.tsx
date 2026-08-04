import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { AnimationBeat, BeatSeverity } from '../../services/combat/presentation/types';
import { getGameFeel } from '../../services/combat/presentation/gameFeel';
import type { MotionLevel } from '../../vfx/types';

interface Props {
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
  /** Arena background, atmosphere, boss — everything that sits BEHIND the
   *  command shelf. */
  backdrop: ReactNode;
  /** Hero sprites and attack VFX — everything that sits IN FRONT of the
   *  party dock. */
  foreground: ReactNode;
}

/**
 * Wraps the DIEGETIC world — arena background, atmosphere, boss, heroes —
 * and shakes it on a heavy or ultimate hit.
 *
 * Why this wrapper exists rather than shaking the scene root: the command
 * shelf, party dock, boss HUD and journal are all anchored to the viewport
 * edge. Translating them would open a gap at the screen border, which reads
 * instantly as a broken render rather than as force. Chrome must stay nailed
 * down; only the world moves.
 *
 * WHY TWO WRAPPERS AND NOT ONE. A transform creates a stacking context, so
 * everything inside one wrapper shares a single z-index — and the world does
 * not live at a single depth. The required order is:
 *
 *     arena background  <  command shelf (15)  <  party dock (22)  <  VFX
 *
 * The backdrop must stay BEHIND the shelf; the sprites must stay IN FRONT of
 * the dock, which is what stops them being hidden by the fanned cards. Those
 * are opposite sides of the chrome, so a single wrapper cannot satisfy both:
 * hoisting it high enough for the sprites drags the arena background up over
 * the shelf and the dock, and the entire bottom bar disappears. Hence two
 * wrappers at z 1 and z 23, driven by one shake so they move as one world.
 *
 * The permanent `scale(1.02)` is NOT a zoom. It is overscan — ~14px of hidden
 * bleed per side at 1440px — so displacement never exposes the background's
 * own edge. Set once, never animated.
 *
 * Translate only, never rotate: rotating a `cover` background exposes corners
 * almost immediately and reads as cheap arcade jitter rather than weight.
 */
export function ArenaShakeLayer({ currentBeat, motionLevel, backdrop, foreground }: Props) {
  const [shake, setShake] = useState<{ key: number; severity?: BeatSeverity } | null>(null);
  const lastBeatId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastBeatId.current) return;
    if (currentBeat.suppressEffects) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    lastBeatId.current = currentBeat.id;
    // Normal hits resolve to zero amplitude in gameFeel. If every blow shook
    // the world, none of them would land.
    if (getGameFeel(currentBeat.severity, motionLevel).arenaShakeX === 0) return;
    setShake((cur) => ({ key: (cur?.key ?? 0) + 1, severity: currentBeat.severity }));
  }, [currentBeat, motionLevel]);

  const feel = getGameFeel(shake?.severity, motionLevel);
  const shaking = shake !== null && feel.arenaShakeX > 0;

  const vars = {
    '--arena-shake-x': `${feel.arenaShakeX}px`,
    '--arena-shake-y': `${feel.arenaShakeY}px`,
    '--arena-shake-ms': `${feel.arenaShakeMs}ms`,
  } as React.CSSProperties;

  /**
   * One shakeable layer.
   *
   * ── Both wrappers MUST be pointer-events: none ───────────────────────────
   * These are presentation only — they exist to translate the world on impact
   * and nothing inside them is meant to be clicked. But they are full-arena
   * `inset: 0` boxes, and the FOREGROUND slot sits at z-23, above the command
   * shelf's z-15. With default `pointer-events: auto` they therefore swallowed
   * every click aimed at the shelf: Strike, End Turn and the ability list all
   * looked enabled and did nothing.
   *
   * That bug survived a preview deploy because it is invisible to scripted
   * testing — `element.click()` dispatches straight at the node and bypasses
   * hit-testing entirely, so the buttons "worked" in every automated check and
   * failed for every human. Only a real cursor reproduces it.
   *
   * Interactive content placed in a slot must re-enable pointer events on
   * itself. Nothing does today: the foreground holds only `AttackVFX`, which is
   * decorative and already `aria-hidden`.
   */
  const slot = (content: ReactNode, zIndex: number) => (
    <div
      className="absolute inset-0"
      style={{
        zIndex,
        transform: 'scale(1.02)',
        willChange: 'transform',
        pointerEvents: 'none',
      }}
    >
      <div
        key={shake?.key ?? 0}
        className={shaking ? 'arena-shake' : undefined}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...vars }}
      >
        {content}
      </div>
    </div>
  );

  return (
    <>
      {slot(backdrop, 1)}
      {slot(foreground, 23)}

      <style>{`
        /* Decaying oscillation — each swing smaller than the last, so it
           reads as an impact settling rather than a vibration. Transform
           only: animating a filter on a box this large drops frames on
           phones, and iPhone portrait is a launch target. */
        @keyframes arena-shake {
          0%   { transform: translate(0, 0); }
          12%  { transform: translate(calc(var(--arena-shake-x) * -1), var(--arena-shake-y)); }
          28%  { transform: translate(var(--arena-shake-x), calc(var(--arena-shake-y) * -0.7)); }
          46%  { transform: translate(calc(var(--arena-shake-x) * -0.6), calc(var(--arena-shake-y) * 0.5)); }
          64%  { transform: translate(calc(var(--arena-shake-x) * 0.4), calc(var(--arena-shake-y) * -0.3)); }
          82%  { transform: translate(calc(var(--arena-shake-x) * -0.15), 0); }
          100% { transform: translate(0, 0); }
        }
        .arena-shake { animation: arena-shake var(--arena-shake-ms) cubic-bezier(0.25, 0.8, 0.35, 1); }

        @media (prefers-reduced-motion: reduce) {
          .arena-shake { animation: none !important; }
        }
      `}</style>
    </>
  );
}

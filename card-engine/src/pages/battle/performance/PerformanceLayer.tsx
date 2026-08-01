import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import { resolveAnchor, type AnchorContext, type Point } from '../combatAnchors';
import { LashRenderer } from './LashRenderer';
import { GrowthRenderer } from './GrowthRenderer';
import { BarrierRenderer } from './BarrierRenderer';
import { GenericRenderer } from './GenericRenderer';
import { ChargeTell } from './ChargeTell';
import { useStageClock, type StageClockOptions } from './useStageClock';

/**
 * Mounts one resolved performance and dispatches it to its family renderer.
 *
 * Owns the three things every renderer would otherwise each get wrong:
 *
 *  - **Keying.** The React key is the performance id, which is derived from
 *    the opener's event index. A repeat cast of the same ability later in the
 *    battle is a different index, so it mounts fresh instead of being
 *    reconciled onto the previous cast's half-finished DOM.
 *  - **Anchors.** Resolved here, once, from the named registry. No renderer
 *    ever sees `computeDockCardXPercents`, and none can drift.
 *  - **Cleanup.** `useStageClock` cancels its rAF on unmount, so an
 *    interrupted, skipped or battle-ending performance leaves no live loop.
 */

interface PerformanceProps {
  performance: ResolvedPerformance;
  motionLevel: MotionLevel;
  anchorContext: AnchorContext;
  /** Live shield integrity for the protected card, when the form is a barrier. */
  shieldIntegrity?: number;
  clock?: StageClockOptions;
}

export function PerformanceView({
  performance: perf,
  motionLevel,
  anchorContext,
  shieldIntegrity = 1,
  clock: clockOptions,
}: PerformanceProps) {
  const clock = useStageClock(perf, clockOptions);

  const from = resolveAnchor(perf.castAnchor, anchorContext);
  const to = resolveAnchor(perf.targetAnchor, anchorContext);
  const stageName = clock.stage?.stage ?? null;

  /*
   * Renderers get stage DURATIONS, not live stage progress.
   *
   * `stageProgressRef` is a ref by design (see useStageClock) — reading it
   * during render would hand every renderer a value frozen at the last stage
   * change, so a growth animation would jump between stages instead of
   * growing. Only the lash reads the ref, and it does so inside its own rAF
   * where the value is current. Everything else expresses its motion in CSS
   * from a known duration, which is both correct and cheaper.
   */
  const manifestMs =
    perf.stages.find((s) => s.stage === 'manifest')?.durationMs ?? 260;
  const chargeMs = perf.stages.find((s) => s.stage === 'charge')?.durationMs ?? 260;

  /*
   * The charge tell is drawn for EVERY form, not per renderer.
   *
   * Gathering material at the cast point before anything happens is universal —
   * a growth gathers in the ground, a barrier gathers in front of the card, a
   * lash gathers at the card edge. Putting it here means a new form inherits
   * it, and no renderer can forget it. It stays up while the effect fires (the
   * delivery emerges THROUGH the pool) and clears in the aftermath.
   */
  const chargeVisible =
    stageName === 'charge' || stageName === 'cast' || stageName === 'travel' ||
    stageName === 'manifest' || stageName === 'impact' || stageName === 'return' ||
    stageName === 'arrival';
  const chargeTell = chargeVisible ? (
    <ChargeTell
      at={resolveAnchor(perf.castAnchor, anchorContext)}
      kit={perf.material}
      motionLevel={motionLevel}
      chargeMs={chargeMs}
      firing={stageName !== 'charge'}
      intensity={perf.intensity}
    />
  ) : null;

  // A finished performance unmounts itself. Leaving it up would accumulate
  // one dead SVG layer per cast for the whole battle — the "unbounded DOM
  // nodes per effect" the budget forbids.
  if (clock.finished && clockOptions?.pinnedStageIndex === undefined) return null;

  return (
    <>
      {chargeTell}
      {renderBody()}
    </>
  );

  function renderBody() {
  switch (perf.form) {
    case 'lash':
    case 'drain':
      return (
        <LashRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          progressRef={clock.progressRef}
          stageName={stageName}
        />
      );

    case 'growth':
      return (
        <GrowthRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          stageName={stageName}
          manifestMs={manifestMs}
        />
      );

    case 'barrier':
      return (
        <BarrierRenderer
          performance={perf}
          at={to}
          motionLevel={motionLevel}
          stageName={stageName}
          manifestMs={manifestMs}
          integrity={shieldIntegrity}
        />
      );

    case 'projectile':
    case 'generic':
    default:
      return (
        <GenericRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          stageName={stageName}
        />
      );
  }
  }
}

/** Convenience for anywhere that renders several at once. */
export function PerformanceLayer({
  performances,
  motionLevel,
  anchorContext,
  shieldIntegrity,
}: {
  performances: readonly ResolvedPerformance[];
  motionLevel: MotionLevel;
  anchorContext: AnchorContext;
  shieldIntegrity?: number;
}) {
  return (
    <>
      {performances.map((p) => (
        <PerformanceView
          key={p.id}
          performance={p}
          motionLevel={motionLevel}
          anchorContext={anchorContext}
          shieldIntegrity={shieldIntegrity}
        />
      ))}
      <PerformanceStyles />
    </>
  );
}

/**
 * One stylesheet for every performance renderer.
 *
 * Mounted once by the layer rather than per renderer, following the precedent
 * `CardCombatFxStyles` set: three effects each injecting an identical
 * `<style>` block is three copies of the same rules in the document, and any
 * future edit has to keep them in step.
 *
 * Note there is NO `@media (prefers-reduced-motion)` block here. That is
 * deliberate. Every animation below is gated in JSX on the resolved
 * `motionLevel`, which honours both the OS flag AND the in-game Motion
 * setting. A raw media query would silently ignore a player who turned motion
 * off in the game without setting the OS flag — which is exactly the bug this
 * work fixes in `CardCombatFx`, `PartyDock` and `AttackVFX`.
 */
export function PerformanceStyles() {
  return (
    <style>{`
      @keyframes perf-particle-fly {
        0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--pdx, 0), var(--pdy, 0)) scale(0.9); }
      }
      .perf-particle { animation: perf-particle-fly 460ms ease-out forwards; }

      @keyframes perf-bolt-travel {
        0%   { opacity: 0; transform: scaleX(0); }
        18%  { opacity: 1; }
        70%  { opacity: 1; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }
      /* transform-origin and rotate come from the inline style; the keyframe
         only drives scaleX, so it composes with the element's own rotation. */
      .perf-bolt { animation: perf-bolt-travel 240ms ease-in forwards; }

      @keyframes perf-burst-out {
        0%, 40% { opacity: 0; transform: scale(0.3); }
        60%     { opacity: 1; transform: scale(1.15); }
        100%    { opacity: 0; transform: scale(1.6); }
      }
      .perf-burst { animation: perf-burst-out 380ms ease-out forwards; }

      /* Generated impact art. Punches in slightly oversized and settles, which
         is what makes a still image read as a hit rather than as a sticker
         appearing. Never fades to nothing during the impact beat — the splash
         is the payoff and it has to stay legible for the whole beat. */
      /* Fast in, then HOLD. The gap between the beam arriving and the splash
         appearing has to be tight or contact feels mushy — so the punch is
         240ms — but the splash then sits at full opacity for the rest of the
         aftermath, because that is the art the player is meant to enjoy. */
      @keyframes perf-impact-art-hit {
        0%   { opacity: 0; transform: scale(0.5); }
        18%  { opacity: 1; transform: scale(1.2); }
        40%  { transform: scale(1); }
        100% { opacity: 1; transform: scale(1); }
      }
      .perf-impact-art { animation: perf-impact-art-hit 240ms cubic-bezier(0.2,0.8,0.3,1) forwards; }

      @keyframes perf-bloom-rise {
        0%   { opacity: 0; transform: translateY(6px) scale(0.7); }
        40%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-10px) scale(1.25); }
      }
      .perf-bloom { animation: perf-bloom-rise 520ms ease-out forwards; }

      @keyframes perf-cleanse-lift {
        0%   { opacity: 0; transform: translateY(0) scale(0.96); }
        30%  { opacity: 0.9; }
        100% { opacity: 0; transform: translateY(var(--cleanse-rise, -16px)) scale(1.08); }
      }
      .perf-cleanse { animation: perf-cleanse-lift 460ms ease-out forwards; }

      /* The gather. Material collects at the cast point over the charge stage,
         overshooting slightly so it reads as swelling under pressure rather
         than fading in. Holds at full once gathered — the delivery emerges
         THROUGH the pool, so it must still be there when the beam fires. */
      @keyframes perf-charge-gather {
        0%   { opacity: 0; transform: scale(0.25); }
        70%  { opacity: 1; transform: scale(1.12); }
        100% { opacity: 1; transform: scale(1); }
      }
      .perf-charge-gather {
        animation: perf-charge-gather var(--charge-ms, 260ms) cubic-bezier(0.2,0.7,0.3,1) forwards;
      }

      /* Armed: the card is holding a chosen ability and waiting for the round
         to run. Breathes indefinitely rather than resolving, because this state
         has no known duration — it lasts as long as the player takes. */
      @keyframes perf-charge-breathe {
        0%, 100% { opacity: 0.72; transform: scale(0.96); }
        50%      { opacity: 1;    transform: scale(1.04); }
      }
      .perf-charge-pulse { animation: perf-charge-breathe 1400ms ease-in-out infinite; }

      /* Only materials that drip get drips — a silhouette cue, not a colour one. */
      @keyframes perf-charge-drip-fall {
        0%   { opacity: 0; transform: translateY(0) scaleY(0.7); }
        25%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(14px) scaleY(1.4); }
      }
      .perf-charge-drip { animation: perf-charge-drip-fall 900ms ease-in infinite; }

      /* Staged emergence: each root is drawn from the ground outward. The
         stagger comes from a per-branch animation-delay, which is what makes
         this growth rather than one shape scaling up. */
      @keyframes perf-root-draw {
        from { stroke-dashoffset: 140; }
        to   { stroke-dashoffset: 0; }
      }

      @keyframes perf-barrier-arrive {
        0%   { opacity: 0; transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      .perf-barrier-form {
        animation: perf-barrier-arrive var(--barrier-form-ms, 260ms) ease-out forwards;
      }

      @keyframes perf-brace-set {
        0%   { opacity: 0.15; }
        100% { opacity: 0.9; }
      }
      .perf-brace { animation: perf-brace-set 260ms ease-out forwards; }

      @keyframes perf-mote-converge {
        0%   { opacity: 0; transform: translateY(0) scale(0.5); }
        30%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(0) scale(1); }
      }
      .perf-barrier-mote { animation: perf-mote-converge 320ms ease-in forwards; }
    `}</style>
  );
}

export type { Point };

import { useEffect, useRef, useState } from 'react';
import type { PlannedStage, ResolvedPerformance } from '../../../services/combat/performance/types';

/**
 * The clock every performance renderer runs on.
 *
 * ## The budget rule this exists to enforce
 *
 * The performance contract forbids "one React state update per particle per
 * frame" and "layout reads inside animation loops". So this hook deliberately
 * does two DIFFERENT things at two DIFFERENT rates:
 *
 *  - `progressRef` / `stageProgressRef` update every frame and are REFS. A
 *    renderer reads them inside its own rAF and writes straight to a DOM
 *    attribute (an SVG `d`, a transform). React never re-renders for these.
 *  - `stage` updates only when the performance crosses a stage boundary — a
 *    handful of times per cast — and IS state, because changing stage changes
 *    what is mounted.
 *
 * Getting that split wrong is the difference between a lash costing three
 * renders and costing a hundred and eighty.
 *
 * ## Time source
 *
 * `performance.now()` deltas, not a frame counter, so the animation runs at
 * the same speed on a 60Hz and a 144Hz display. A dropped frame shortens the
 * NEXT step rather than stretching the whole performance.
 */
export interface StageClock {
  /** 0 → 1 across the whole performance. Ref: read inside rAF only. */
  progressRef: React.RefObject<number>;
  /** 0 → 1 within the current stage. Ref: read inside rAF only. */
  stageProgressRef: React.RefObject<number>;
  /** The stage on screen now. React state — changes are rare. */
  stage: PlannedStage | null;
  /** Index of `stage` within the plan, or -1 before the first frame. */
  stageIndex: number;
  /** True once the whole plan has elapsed. */
  finished: boolean;
}

export interface StageClockOptions {
  /**
   * Hold on one stage instead of playing. The Ability Theater's step mode —
   * lets a reviewer sit inside `manifest` for as long as they need to judge
   * whether staged growth actually reads as growth.
   */
  pinnedStageIndex?: number;
  /** Restarting key. Changing it rewinds the clock. */
  replayKey?: number;
  paused?: boolean;
  /**
   * Playback rate. 1 is real time; 0.25 is quarter-speed.
   *
   * Review-only. A performance is ~600ms, which is right for play and far too
   * fast to judge — you cannot tell whether a lash reads as being FIRED at that
   * speed, only whether it registered at all. Slowing the clock changes nothing
   * about the plan, the stages or the consequences; it only stretches the wall
   * clock the renderers are reading against.
   */
  speed?: number;
}

export function useStageClock(
  performance_: ResolvedPerformance,
  options: StageClockOptions = {},
): StageClock {
  const { pinnedStageIndex, replayKey = 0, paused = false, speed = 1 } = options;

  const progressRef = useRef(0);
  const stageProgressRef = useRef(0);
  const [stageIndex, setStageIndex] = useState(pinnedStageIndex ?? -1);
  const [finished, setFinished] = useState(false);

  const stages = performance_.stages;
  const totalMs = performance_.totalMs;

  useEffect(() => {
    // Pinned: no clock at all. Sit at the middle of the chosen stage so the
    // reviewer sees the stage's characteristic pose rather than its first
    // frame, which for most stages is "nothing has happened yet".
    if (pinnedStageIndex !== undefined) {
      progressRef.current = midpointProgress(stages, totalMs, pinnedStageIndex);
      stageProgressRef.current = 0.5;
      setStageIndex(pinnedStageIndex);
      setFinished(false);
      return;
    }

    if (paused) return;

    let raf = 0;
    let cancelled = false;
    const startedAt = performance.now();

    progressRef.current = 0;
    stageProgressRef.current = 0;
    setFinished(false);

    // Tracked locally rather than read back from state: reading `stageIndex`
    // inside the loop would capture the value from the render that started
    // the effect and re-fire setState on every frame.
    let lastStageIndex = -1;

    const tick = () => {
      if (cancelled) return;
      // Scaling elapsed time rather than the plan keeps the stage boundaries,
      // the consequence placement and the totals exactly as combat computed
      // them — slow-mo shows the real performance, not a different one.
      const elapsed = (performance.now() - startedAt) * (speed || 1);
      const clamped = Math.min(elapsed, totalMs);

      progressRef.current = totalMs > 0 ? clamped / totalMs : 1;

      const idx = stageIndexAt(stages, clamped);
      const stage = stages[idx];
      stageProgressRef.current =
        stage && stage.durationMs > 0
          ? Math.min(1, Math.max(0, (clamped - stage.startMs) / stage.durationMs))
          : 1;

      if (idx !== lastStageIndex) {
        lastStageIndex = idx;
        setStageIndex(idx);
      }

      if (elapsed >= totalMs) {
        setFinished(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [stages, totalMs, pinnedStageIndex, paused, replayKey, speed]);

  return {
    progressRef,
    stageProgressRef,
    stage: stages[stageIndex] ?? null,
    stageIndex,
    finished,
  };
}

/** Which stage is on screen at `ms` into the plan. */
export function stageIndexAt(stages: readonly PlannedStage[], ms: number): number {
  for (let i = stages.length - 1; i >= 0; i--) {
    if (ms >= stages[i].startMs) return i;
  }
  return 0;
}

function midpointProgress(
  stages: readonly PlannedStage[],
  totalMs: number,
  index: number,
): number {
  const stage = stages[index];
  if (!stage || totalMs <= 0) return 0;
  return (stage.startMs + stage.durationMs / 2) / totalMs;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyStrike,
  countSuccesses,
  createRun,
  gradeStrike,
  markerSpeedFactor,
  positionAt,
} from '../../../services/minigames/forge-strike/engine';
import { FORGE_STRIKE_CONFIG_V1 } from '../../../services/minigames/forge-strike/config';
import type {
  ForgeStrikeConfig,
  RunState,
  StrikeGrade,
  StrikePattern,
} from '../../../services/minigames/forge-strike/types';

/**
 * Forge Strike controller.
 *
 * Owns everything the pure engine must not: rAF timing, the accepted
 * input event, and presentation sequencing after a grade is fixed. The
 * marker position shown on screen and the position handed to the engine
 * come from the same performance.now() sample, so what the player sees
 * is what is scored.
 *
 * Phases:
 *   practice → (guided, non-scored, replayable)
 *   run      → 5 scored strikes with a short resolve pause between
 *   complete → results
 */

export type SessionPhase = 'practice' | 'practice_done' | 'run' | 'complete';

/** ms the marker freezes + result label shows before the next strike arms. */
const RESOLVE_PAUSE_MS = 900;

const PRACTICE_DONE_KEY = 'forgeStrike.practiceDone.v1';

export function hasCompletedPractice(): boolean {
  try {
    return localStorage.getItem(PRACTICE_DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function markPracticeDone(): void {
  try {
    localStorage.setItem(PRACTICE_DONE_KEY, '1');
  } catch {
    /* storage unavailable — practice will simply re-show */
  }
}

export interface ForgeStrikeView {
  phase: SessionPhase;
  run: RunState;
  /** Normalized marker position for rendering, 0..1. */
  markerPos: number;
  /** True while input is accepted for the armed strike. */
  armed: boolean;
  /** Grade of the most recently resolved strike (scored or practice). */
  lastGrade: StrikeGrade | null;
  /** Practice-strike grade, shown during the guided phase. */
  practiceGrade: StrikeGrade | null;
  /** True while the strike-3 reversal telegraph cue should show. */
  telegraph: boolean;
  config: ForgeStrikeConfig;
  strike: () => void;
  startRun: () => void;
  replayPractice: () => void;
  reset: () => void;
}

export function useForgeStrike(
  config: ForgeStrikeConfig = FORGE_STRIKE_CONFIG_V1,
  skipPractice = false,
): ForgeStrikeView {
  const [phase, setPhase] = useState<SessionPhase>(skipPractice ? 'run' : 'practice');
  const [run, setRun] = useState<RunState>(() => createRun(config));
  const [markerPos, setMarkerPos] = useState(0);
  const [armed, setArmed] = useState(true);
  const [lastGrade, setLastGrade] = useState<StrikeGrade | null>(null);
  const [practiceGrade, setPracticeGrade] = useState<StrikeGrade | null>(null);
  const [telegraph, setTelegraph] = useState(false);

  // Refs mirror state read inside the rAF loop / input handler so the
  // handlers never see stale closures.
  const phaseRef = useRef(phase);
  const runRef = useRef(run);
  const armedRef = useRef(armed);
  phaseRef.current = phase;
  runRef.current = run;
  armedRef.current = armed;

  const rafId = useRef(0);
  const patternStart = useRef(performance.now());
  const resolveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activePattern = useCallback((): StrikePattern => {
    if (phaseRef.current === 'practice' || phaseRef.current === 'practice_done') {
      return config.practicePattern;
    }
    const idx = Math.min(runRef.current.nextStrikeIndex, config.patterns.length - 1);
    return config.patterns[idx];
  }, [config]);

  // Successes landed so far — the ramp input for the armed strike. Practice
  // is always base difficulty (never ramps).
  const currentSuccessCount = useCallback((): number => {
    if (phaseRef.current === 'practice' || phaseRef.current === 'practice_done') return 0;
    return countSuccesses(runRef.current);
  }, []);

  // Single rAF loop for the whole session; samples the marker while armed.
  useEffect(() => {
    const tick = (now: number) => {
      if (armedRef.current && phaseRef.current !== 'complete') {
        const pattern = activePattern();
        // Success-ramp quickens the marker: compress elapsed time.
        const speed = markerSpeedFactor(config, currentSuccessCount());
        const elapsed = (now - patternStart.current) * speed;
        setMarkerPos(positionAt(pattern, elapsed));
        if (pattern.telegraphAtMs !== undefined) {
          const loopMs = pattern.waypoints[pattern.waypoints.length - 1].t;
          const inLoop = elapsed % loopMs;
          setTelegraph(inLoop >= pattern.telegraphAtMs && inLoop <= pattern.telegraphAtMs + 700);
        } else {
          setTelegraph(false);
        }
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [activePattern, config, currentSuccessCount]);

  // Clear any pending resolve timer on unmount so nothing fires after exit.
  useEffect(
    () => () => {
      if (resolveTimer.current) clearTimeout(resolveTimer.current);
    },
    [],
  );

  const armNext = useCallback(() => {
    patternStart.current = performance.now();
    setLastGrade(null);
    setArmed(true);
  }, []);

  const strike = useCallback(() => {
    // Only the first accepted input resolves a strike; duplicates are
    // dropped here (disarmed) AND in the engine (index check).
    if (!armedRef.current || phaseRef.current === 'complete') return;
    const pattern = activePattern();
    const speed = markerSpeedFactor(config, currentSuccessCount());
    const pos = positionAt(pattern, (performance.now() - patternStart.current) * speed);

    if (phaseRef.current === 'practice') {
      const grade = gradeStrike(config, pos, 0);
      setArmed(false);
      setMarkerPos(pos);
      setPracticeGrade(grade);
      setPhase('practice_done');
      markPracticeDone();
      return;
    }

    const out = applyStrike(config, runRef.current, {
      strikeIndex: runRef.current.nextStrikeIndex,
      markerPos: pos,
    });
    if (!out.accepted) return;

    setArmed(false);
    setMarkerPos(pos);
    setRun(out.state);
    setLastGrade(out.result.grade);

    if (out.state.phase === 'complete') {
      resolveTimer.current = setTimeout(() => setPhase('complete'), RESOLVE_PAUSE_MS);
    } else {
      resolveTimer.current = setTimeout(armNext, RESOLVE_PAUSE_MS);
    }
  }, [activePattern, armNext, config, currentSuccessCount]);

  const startRun = useCallback(() => {
    setPhase('run');
    setPracticeGrade(null);
    setRun(createRun(config));
    armNext();
  }, [armNext, config]);

  const replayPractice = useCallback(() => {
    setPhase('practice');
    setPracticeGrade(null);
    armNext();
  }, [armNext]);

  const reset = useCallback(() => {
    if (resolveTimer.current) clearTimeout(resolveTimer.current);
    setPhase(skipPractice ? 'run' : 'practice');
    setPracticeGrade(null);
    setRun(createRun(config));
    armNext();
  }, [armNext, config, skipPractice]);

  return {
    phase,
    run,
    markerPos,
    armed,
    lastGrade,
    practiceGrade,
    telegraph,
    config,
    strike,
    startRun,
    replayPractice,
    reset,
  };
}

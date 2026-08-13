import type Phaser from 'phaser';
import { HITSTOP_CAP_MS } from '../combat/feel';

/**
 * The world holds still for a moment when something lands.
 *
 * WHICH CLOCK THIS STOPS, and why it matters more than the effect itself.
 * The pure state machines — actionState.ts, construct.ts — ALWAYS receive real
 * elapsed milliseconds. They are never scaled, never paused, never told a frame
 * took zero time. Three reasons, in order of how expensive getting it wrong
 * would be:
 *
 *  1. `telegraphIsAvoidable()` is arithmetic over `telegraphMs` and the hero's
 *     walk speed. Scaling gameplay time would make the telegraph window elastic
 *     — longer in real seconds whenever anything happened to land — and the one
 *     fairness guarantee this enemy has would quietly stop being a guarantee.
 *  2. Every existing test drives those machines with fixed dt. A presentation
 *     feature has no business changing what they compute.
 *  3. The construct's damage frame is the FIRST step of its attack phase, not
 *     the last, so freezing the VIEW at contact cannot change whether a strike
 *     that already resolved was fair.
 *
 * So this freezes tweens, animations and the presenters, and nothing else. The
 * simulation runs straight through it. A player mid-walk keeps walking; what
 * stops is the picture, for long enough to read as weight.
 *
 * NON-STACKING, BY CONSTRUCTION. `trigger` takes the MAX of what is pending and
 * what is asked for, never the sum, and the result is capped. This is not a
 * refinement — the courtyard is an idle game where several shots can land in one
 * frame, and summed hitstop would freeze it solid exactly when the most is
 * happening. See the concurrency tests.
 *
 * `scene.time` is deliberately left UNSCALED. Every timed effect in this
 * codebase carries a `delayedCall` backstop so nothing waits on an animation
 * event to finish — scaling the timer clock would stop those backstops firing
 * during a freeze, which is the one failure the pattern exists to prevent.
 */
export interface Hitstop {
  /** Freeze for `ms`, or extend an existing freeze to it. Never additive. */
  trigger(ms: number): void;
  /**
   * Advance by one frame of REAL time, and say whether the picture is frozen.
   *
   * Returns the dt presenters should use: 0 while frozen, the real delta
   * otherwise. The caller passes that on rather than reading the clock again,
   * so there is exactly one answer per frame about whether time is moving.
   */
  step(realDeltaMs: number): number;
  /** Is the picture currently held? For the dev readout. */
  active(): boolean;
  remainingMs(): number;
  /** Let go of everything, whatever state it was in. */
  destroy(): void;
}

export function createHitstop(scene: Phaser.Scene): Hitstop {
  let remaining = 0;
  let frozen = false;

  const setFrozen = (next: boolean) => {
    if (next === frozen) return;
    frozen = next;
    // Zeroed rather than paused: `timeScale` restores cleanly even if a tween
    // was created DURING the freeze, whereas pausing a manager means tracking
    // which tweens were already paused before it and putting only those back.
    scene.tweens.timeScale = next ? 0 : 1;
    scene.anims.globalTimeScale = next ? 0 : 1;
  };

  return {
    trigger(ms) {
      if (!(ms > 0)) return;
      remaining = Math.min(HITSTOP_CAP_MS, Math.max(remaining, ms));
      setFrozen(true);
    },

    step(realDeltaMs) {
      if (remaining <= 0) return realDeltaMs;
      remaining -= realDeltaMs;
      if (remaining <= 0) {
        remaining = 0;
        setFrozen(false);
        // The frame that ENDS the freeze still runs at full dt rather than
        // swallowing it. Dropping it would make every hitstop cost one extra
        // frame of motion, which accumulates into visible stutter when hits
        // come quickly.
        return realDeltaMs;
      }
      return 0;
    },

    active: () => frozen,
    remainingMs: () => remaining,

    destroy() {
      // A scene torn down mid-freeze must not leave a global time scale at
      // zero — the animation manager outlives the scene, and the next one to
      // start would render nothing moving with no obvious cause.
      setFrozen(false);
    },
  };
}

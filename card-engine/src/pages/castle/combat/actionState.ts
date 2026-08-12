import type { Vec2 } from './aim';

/**
 * What the Card-wright is doing, as authoritative state.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: the state advances on ELAPSED TIME, never
 * on an animation event. It is normal for a sprite to be swapped, an animation to
 * be skipped under reduced motion, or a clip to be interrupted by a scene change —
 * and every one of those means an `animationcomplete` handler that never fires. If
 * the state waited on that event, the player would stand frozen mid-swing with no
 * error anywhere and no way out but reloading. Visuals read this state; this state
 * never reads visuals.
 *
 * The phases are handoff §7.2. Summoning is deliberately absent: it is a later
 * milestone, and a phase nothing can enter is a phase nobody maintains.
 *
 * Pure: no Phaser, no clock. The caller passes elapsed milliseconds.
 */

export type ActionPhase =
  | 'explore'
  | 'charging'
  | 'windup'
  | 'active'
  | 'recovery'
  | 'knockdown'
  | 'standUp';

/**
 * Timings, in milliseconds.
 *
 * Deliberately short: at zoom 1.5 the hero is about a seventh of the screen, and
 * a windup long enough to read on a character that size is long enough to feel
 * unresponsive. These are a starting point to be tuned in play, which is why they
 * are one exported object rather than scattered literals.
 */
export const ACTION_TIMING = {
  /**
   * How long a full charge takes to build. Player-controlled: this is the only
   * duration in the game the player sets, by deciding when to let go.
   */
  chargeMaxMs: 900,
  /** Release to the projectile leaving the card — the thrust, not the draw. */
  windupMs: 180,
  activeMs: 60,
  recoveryMs: 320,
  knockdownMs: 900,
  standUpMs: 320,
} as const;

/**
 * What a bare tap is worth, as a fraction of a full charge.
 *
 * Not zero. A tap has to DO something or the weapon feels broken while the
 * player is still learning that holding matters; it just has to be visibly worse
 * than waiting. Consumed by scaleBlast() in blast.ts.
 */
export const MIN_CHARGE_LEVEL = 0.25;

export interface ActionState {
  phase: ActionPhase;
  /** Milliseconds spent in the current phase. */
  elapsedMs: number;
  /**
   * The aim vector this shot was committed with.
   *
   * Captured when the windup begins and used when the projectile spawns, so that
   * moving the mouse mid-swing cannot bend a shot that has already been thrown.
   * Handoff §7.3.
   */
  committedAim: Vec2 | null;
  /**
   * Set for exactly one step, on the frame the projectile should be created.
   *
   * A flag rather than a callback so that stepping the machine has no side
   * effects and can be unit-tested by asserting on its output.
   */
  fireThisStep: boolean;
  /**
   * How much charge the shot carries, 0 to 1.
   *
   * While `charging` this rises with the hold and is what the gather effect reads
   * to grow. It is FROZEN at the moment of release, for the same reason the aim
   * is: what the player let go of is what they should get, regardless of what
   * happens over the following frames.
   */
  chargeLevel: number;
}

export interface ActionInput {
  /** Fire was pressed this frame. */
  firePressed: boolean;
  /** A card is selected and available to fire. */
  hasReadyCard: boolean;
  /** A hit landed hard enough to put him down. */
  heavyHit: boolean;
  /** Current aim, committed if this frame starts a windup. */
  aim: Vec2;
}

export function initialAction(): ActionState {
  return { phase: 'explore', elapsedMs: 0, committedAim: null, fireThisStep: false, chargeLevel: 0 };
}

/** Phases during which the player cannot start another attack. */
export const isBusy = (phase: ActionPhase) => phase !== 'explore';

/** Phases during which the player keeps full walking control. */
export const canWalk = (phase: ActionPhase) =>
  phase === 'explore' || phase === 'charging' || phase === 'windup' || phase === 'recovery';

/**
 * Movement multiplier for the phase.
 *
 * Firing slows rather than roots. Rooting a deliberately weak character while a
 * projectile is in flight makes the fantasy "helpless", which is the failure mode
 * the handoff warns about in §12.8 — he is supposed to be fragile and mobile.
 */
export function walkScale(phase: ActionPhase): number {
  switch (phase) {
    case 'explore':
      return 1;
    case 'charging':
      // Slower than a walk, faster than a crawl. Charging while repositioning is
      // the interesting decision; charging while rooted is just waiting.
      return 0.6;
    case 'windup':
      return 0.45;
    case 'recovery':
      return 0.7;
    default:
      // active, knockdown, standUp: he is not going anywhere.
      return 0;
  }
}

const enter = (
  phase: ActionPhase,
  committedAim: Vec2 | null,
  chargeLevel = 0,
  fireThisStep = false,
): ActionState => ({
  phase,
  elapsedMs: 0,
  committedAim,
  fireThisStep,
  chargeLevel,
});

/** Charge held so far, as a fraction of a full one, floored at a tap's worth. */
export function chargeFrom(heldMs: number): number {
  const t = Math.min(1, heldMs / ACTION_TIMING.chargeMaxMs);
  return MIN_CHARGE_LEVEL + (1 - MIN_CHARGE_LEVEL) * t;
}

/**
 * Advance one frame.
 *
 * A heavy hit is checked before anything else and interrupts every phase,
 * including the active frame — there is no invulnerability window here, and a
 * shot already committed is simply lost. That is the intended feel: he is weak,
 * and being hit while casting costs the cast.
 */
export function stepAction(state: ActionState, input: ActionInput, dtMs: number): ActionState {
  if (input.heavyHit && state.phase !== 'knockdown' && state.phase !== 'standUp') {
    return enter('knockdown', null);
  }

  const elapsedMs = state.elapsedMs + dtMs;
  const t = ACTION_TIMING;

  switch (state.phase) {
    case 'explore':
      // No card, no attack — the cards ARE the offense, so an empty hand is a
      // character with nothing to do but run.
      if (input.firePressed && input.hasReadyCard) {
        return enter('charging', null, chargeFrom(0));
      }
      return { ...state, elapsedMs, fireThisStep: false, chargeLevel: 0 };

    case 'charging': {
      // Losing the card mid-charge cancels it. Otherwise he would keep winding up
      // something he is no longer holding.
      if (!input.hasReadyCard) return enter('explore', null);

      // RELEASE IS THE COMMIT. Both the charge and the aim are frozen here, and
      // for the same reason: the shot should be the one the player let go of, not
      // whatever the inputs happen to say two frames later.
      if (!input.firePressed) {
        return enter('windup', { ...input.aim }, state.chargeLevel);
      }

      // Holding past full does not overcharge. It holds, so a player can charge
      // fully and then take their time choosing where to point it.
      return { ...state, elapsedMs, fireThisStep: false, chargeLevel: chargeFrom(elapsedMs) };
    }

    case 'windup':
      if (elapsedMs >= t.windupMs) {
        // The projectile is born on entry to `active`, carrying the aim and the
        // charge captured at release rather than anything current.
        return enter('active', state.committedAim, state.chargeLevel, true);
      }
      return { ...state, elapsedMs, fireThisStep: false };

    case 'active':
      if (elapsedMs >= t.activeMs) return enter('recovery', state.committedAim, state.chargeLevel);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'recovery':
      if (elapsedMs >= t.recoveryMs) return enter('explore', null);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'knockdown':
      if (elapsedMs >= t.knockdownMs) return enter('standUp', null);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'standUp':
      if (elapsedMs >= t.standUpMs) return enter('explore', null);
      return { ...state, elapsedMs, fireThisStep: false };
  }
}

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
  | 'summoning'
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
  /**
   * The fall itself — and the MINIMUM time on the ground, not the total.
   *
   * He now lies there until the player asks to get up (see `getUpRequested`),
   * so this is the floor rather than the duration: long enough for the fall to
   * finish playing, after which standing is his to choose. Matches
   * KNOCKDOWN_TOTAL_MS by construction.
   */
  knockdownMs: 1200,
  standUpMs: 320,
  /**
   * The grounded summoning ritual, matching the approved 17-frame card slam
   * exactly (CARD_SLAM_TOTAL_MS). The art is the clock here: he draws, raises,
   * steps in, crouches and plants the card, and the phase cannot end before the
   * palm reaches the ground or the character would appear out of a gesture that
   * had not finished.
   */
  summonMs: 2330,
  /**
   * The line between a tap and a hold, measured from the moment fire went down.
   *
   * Releasing before this is a QUICK action; releasing after it is a HEAVY one.
   * Handoff §6.3 wants both to exist per card, and the threshold is the only
   * thing that tells them apart — there is no second button. 220ms is above a
   * deliberate click (~80-120ms) and below the point where a player who meant to
   * tap has started to feel they are holding.
   *
   * Tuning knob, not canon.
   */
  holdThresholdMs: 220,
  /**
   * How long he cannot be knocked down again after getting up.
   *
   * Handoff §11.1 step 8 and §16.15: without it, a construct standing over him
   * puts him straight back on the floor and the player watches four cards
   * scatter twice with no move available in between — the "repeated unavoidable
   * knockdown" the slice is required not to have. Long enough to walk clear at
   * 190 units/sec, which is about 280 units of ground.
   */
  knockdownGraceMs: 1500,
} as const;

/**
 * What a bare tap is worth, as a fraction of a full charge.
 *
 * Not zero. A tap has to DO something or the weapon feels broken while the
 * player is still learning that holding matters; it just has to be visibly worse
 * than waiting. Consumed by scaleBlast() in blast.ts.
 */
export const MIN_CHARGE_LEVEL = 0.25;

/**
 * Which of a card's two action slots this shot came from.
 *
 * The player never picks this directly — it is inferred from how long they held
 * fire, which is why it is decided at release and then frozen alongside the aim
 * and the charge. `null` outside a shot.
 */
export type ReleaseKind = 'quick' | 'heavy';

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
  /**
   * Which action slot the in-flight shot came from, decided at release.
   *
   * Frozen with the aim and the charge, and for the same reason: the slot is a
   * property of the press the player finished, not of the inputs two frames
   * later. Read on the `fireThisStep` frame to dispatch the card's action.
   */
  releaseKind: ReleaseKind | null;
  /**
   * How long he still cannot be knocked down for, counting down.
   *
   * Starts when he finishes getting up, NOT when he goes down — the point is to
   * protect the moment he is back on his feet and has to walk to his cards,
   * which is precisely when he is standing next to whatever put him there.
   */
  graceRemainingMs: number;
}

export interface ActionInput {
  /** Fire is being held down. */
  firePressed: boolean;
  /** The summon key was pressed this frame. */
  summonPressed: boolean;
  /** A card is selected and available to fire. */
  hasReadyCard: boolean;
  /** A hit landed hard enough to put him down. */
  heavyHit: boolean;
  /** Current aim, committed if this frame starts a windup. */
  aim: Vec2;
  /**
   * Abandon the shot without firing it.
   *
   * Raised when the window loses focus, the tab is hidden, the game pauses, or a
   * stall opens — every case where the key-up that would have ended the charge
   * will never arrive. Without it a player who alt-tabs mid-charge comes back to
   * a character holding a card forever, which reads as a hung game.
   */
  cancelRequested: boolean;
  /**
   * The player is asking to get up — any movement key, held or tapped.
   *
   * Knockdown does NOT expire on its own. Raheem, watching himself bounce
   * straight back up: "he should stay on the ground until you hit an arrow to
   * make him get up." Getting up is the first thing he does after losing
   * everything, and taking that beat away made the knockdown feel like a
   * stumble rather than a defeat.
   *
   * It reads as HELD rather than pressed, so leaning on the stick through the
   * fall stands him the moment he is allowed to move — which is what a player
   * mashing forward expects, and it costs nothing to honour.
   */
  getUpRequested: boolean;
}

export function initialAction(): ActionState {
  return {
    phase: 'explore',
    elapsedMs: 0,
    committedAim: null,
    fireThisStep: false,
    chargeLevel: 0,
    releaseKind: null,
    graceRemainingMs: 0,
  };
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
  releaseKind: ReleaseKind | null = null,
): ActionState => ({
  phase,
  elapsedMs: 0,
  committedAim,
  fireThisStep,
  chargeLevel,
  releaseKind,
  // Overwritten by the stepAction wrapper, which is where grace actually lives.
  // Zero here so a phase transition can never accidentally GRANT protection.
  graceRemainingMs: 0,
});

/** Charge held so far, as a fraction of a full one, floored at a tap's worth. */
export function chargeFrom(heldMs: number): number {
  const t = Math.min(1, heldMs / ACTION_TIMING.chargeMaxMs);
  return MIN_CHARGE_LEVEL + (1 - MIN_CHARGE_LEVEL) * t;
}

/** Which slot a hold of `heldMs` released into. */
export const releaseKindFrom = (heldMs: number): ReleaseKind =>
  heldMs < ACTION_TIMING.holdThresholdMs ? 'quick' : 'heavy';

/**
 * Advance one frame.
 *
 * A heavy hit is checked before anything else and interrupts every phase,
 * including the active frame — there is no invulnerability window here, and a
 * shot already committed is simply lost. That is the intended feel: he is weak,
 * and being hit while casting costs the cast.
 */
export function stepAction(state: ActionState, input: ActionInput, dtMs: number): ActionState {
  // Grace is handled OUTSIDE the phase machine, in a wrapper, because it has to
  // survive phase changes and `enter()` resets everything it touches. Threading
  // it through every call site instead would mean a dozen chances to forget it,
  // and forgetting it silently restores the chain-knockdown this exists to stop.
  const graceRemainingMs = Math.max(0, state.graceRemainingMs - dtMs);
  const graced = graceRemainingMs > 0;

  const next = stepPhase(
    state,
    // A heavy hit during the grace window is simply not a hit. Swallowing it
    // here rather than in the runtime means every source of knockdown — the
    // construct, the K key, a scenario — gets the protection for free.
    graced && input.heavyHit ? { ...input, heavyHit: false } : input,
    dtMs,
  );

  // The window opens when he is BACK ON HIS FEET, not when he goes down: the
  // moment that needs protecting is the walk to his scattered cards, which
  // starts next to whatever knocked him over.
  const standingUp = state.phase === 'standUp' && next.phase === 'explore';
  return {
    ...next,
    graceRemainingMs: standingUp ? ACTION_TIMING.knockdownGraceMs : graceRemainingMs,
  };
}

function stepPhase(state: ActionState, input: ActionInput, dtMs: number): ActionState {
  if (input.heavyHit && state.phase !== 'knockdown' && state.phase !== 'standUp') {
    return enter('knockdown', null);
  }

  // A cancel outranks everything except being hit. It exists for the cases where
  // the key-up is never coming — focus lost, tab hidden, a stall opened over the
  // canvas — so it must be able to reach the phases that are waiting for one.
  if (input.cancelRequested && (state.phase === 'charging' || state.phase === 'windup')) {
    return enter('explore', null);
  }

  const elapsedMs = state.elapsedMs + dtMs;
  const t = ACTION_TIMING;

  switch (state.phase) {
    case 'explore':
      // The ritual outranks the shot: pressing both should plant the card, not
      // fire it, because summoning is the deliberate act and firing is the reflex.
      if (input.summonPressed && input.hasReadyCard) {
        return enter('summoning', { ...input.aim });
      }
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

      // RELEASE IS THE COMMIT. The charge, the aim and the action slot are all
      // frozen here, and for the same reason: the shot should be the one the
      // player let go of, not whatever the inputs happen to say two frames later.
      if (!input.firePressed) {
        // `state.elapsedMs` is the hold that produced `state.chargeLevel`, so
        // classifying from it keeps the slot and the power telling one story.
        const kind = releaseKindFrom(state.elapsedMs);
        // A tap is fast but weak: it fires at a tap's worth of charge no matter
        // how far the meter had crept, which is what makes holding worth doing.
        const charge = kind === 'quick' ? MIN_CHARGE_LEVEL : state.chargeLevel;
        return enter('windup', { ...input.aim }, charge, false, kind);
      }

      // Holding past full does not overcharge. It holds, so a player can charge
      // fully and then take their time choosing where to point it.
      return { ...state, elapsedMs, fireThisStep: false, chargeLevel: chargeFrom(elapsedMs) };
    }

    case 'windup':
      if (elapsedMs >= t.windupMs) {
        // The projectile is born on entry to `active`, carrying the aim, the
        // charge and the slot captured at release rather than anything current.
        return enter('active', state.committedAim, state.chargeLevel, true, state.releaseKind);
      }
      return { ...state, elapsedMs, fireThisStep: false };

    case 'active':
      if (elapsedMs >= t.activeMs) {
        return enter('recovery', state.committedAim, state.chargeLevel, false, state.releaseKind);
      }
      return { ...state, elapsedMs, fireThisStep: false };

    case 'recovery':
      if (elapsedMs >= t.recoveryMs) return enter('explore', null);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'summoning':
      if (elapsedMs >= t.summonMs) return enter('explore', null);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'knockdown':
      // He does NOT get up on his own. The fall has to finish first — standing
      // out of a half-played fall looks like a glitch — and after that it is
      // the player's move to make.
      if (elapsedMs >= t.knockdownMs && input.getUpRequested) return enter('standUp', null);
      return { ...state, elapsedMs, fireThisStep: false };

    case 'standUp':
      if (elapsedMs >= t.standUpMs) return enter('explore', null);
      return { ...state, elapsedMs, fireThisStep: false };
  }
}

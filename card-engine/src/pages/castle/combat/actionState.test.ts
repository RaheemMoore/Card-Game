import { describe, expect, it } from 'vitest';
import {
  chargeFrom,
  MIN_CHARGE_LEVEL,
  initialAction,
  releaseKindFrom,
  stepAction,
  walkScale,
  canWalk,
  isBusy,
  ACTION_TIMING,
  type ActionInput,
  type ActionState,
} from './actionState';

const input = (over: Partial<ActionInput> = {}): ActionInput => ({
  firePressed: false,
  summonPressed: false,
  hasReadyCard: true,
  heavyHit: false,
  aim: { x: 1, y: 0 },
  cancelRequested: false,
  getUpRequested: false,
  ...over,
});

/** Hold fire for `heldMs`, release, then run to the shot. Returns the fired state. */
function fireAfterHolding(heldMs: number): ActionState {
  let s = stepAction(initialAction(), input({ firePressed: true }), 16);
  const frames = Math.round(heldMs / 16);
  for (let i = 0; i < frames; i++) s = stepAction(s, input({ firePressed: true }), 16);
  s = stepAction(s, input({ firePressed: false }), 16);
  for (let i = 0; i < 40; i++) {
    s = stepAction(s, input(), 16);
    if (s.fireThisStep) return s;
  }
  throw new Error('never fired');
}

/** Run the machine forward in 16ms frames until `predicate`, or give up. */
function run(
  state: ActionState,
  frames: number,
  over: Partial<ActionInput> = {},
): { state: ActionState; fired: number } {
  let s = state;
  let fired = 0;
  for (let i = 0; i < frames; i++) {
    s = stepAction(s, input(over), 16);
    if (s.fireThisStep) fired++;
  }
  return { state: s, fired };
}

describe('action state', () => {
  it('starts exploring and stays there until something happens', () => {
    const { state } = run(initialAction(), 60);
    expect(state.phase).toBe('explore');
  });

  it('refuses to attack with no ready card', () => {
    // The cards ARE the offense. An empty hand is a character who can only run.
    const s = stepAction(initialAction(), input({ firePressed: true, hasReadyCard: false }), 16);
    expect(s.phase).toBe('explore');
  });

  it('runs windup, active, recovery and returns control', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    expect(s.phase).toBe('charging');
    s = stepAction(s, input({ firePressed: false }), 16);
    expect(s.phase).toBe('windup');

    const total = ACTION_TIMING.windupMs + ACTION_TIMING.activeMs + ACTION_TIMING.recoveryMs;
    const after = run(s, Math.ceil(total / 16) + 4);
    expect(after.state.phase).toBe('explore');
  });

  it('spawns exactly one projectile per press', () => {
    // A flag that stuck on for the whole active phase would fire four shots at
    // 60fps for one button press.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ firePressed: false }), 16);
    const { fired } = run(s, 60);
    expect(fired).toBe(1);
  });

  it('commits the aim at release so a shot cannot be bent afterwards', () => {
    // Handoff §7.3: moving the mouse after the throw must not curve the throw.
    let s = stepAction(initialAction(), input({ firePressed: true, aim: { x: 1, y: 0 } }), 16);
    s = stepAction(s, input({ firePressed: false, aim: { x: 1, y: 0 } }), 16);
    const frames = Math.ceil(ACTION_TIMING.windupMs / 16) + 1;
    for (let i = 0; i < frames; i++) {
      s = stepAction(s, input({ aim: { x: -1, y: 0 } }), 16);
      if (s.fireThisStep) break;
    }
    expect(s.fireThisStep).toBe(true);
    expect(s.committedAim).toEqual({ x: 1, y: 0 });
  });

  it('advances on elapsed time, not on an animation event', () => {
    // The whole reason this module is pure. One long frame — a tab regaining
    // focus, a GC pause — must resolve the phase, not strand the player in it.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ firePressed: false }), 16);
    s = stepAction(s, input(), 5000);
    expect(s.phase).not.toBe('windup');
  });

  it('lets a heavy hit interrupt any phase, including the active frame', () => {
    for (const setup of ['explore', 'windup', 'recovery'] as const) {
      let s = initialAction();
      if (setup !== 'explore') {
        s = stepAction(s, input({ firePressed: true }), 16);
        s = stepAction(s, input({ firePressed: false }), 16);
        if (setup === 'recovery') s = run(s, 20).state;
      }
      const hit = stepAction(s, input({ heavyHit: true }), 16);
      expect(hit.phase).toBe('knockdown');
    }
  });

  it('drops a committed shot when the hit lands mid-cast', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ firePressed: false }), 16);
    s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.committedAim).toBeNull();
    expect(s.fireThisStep).toBe(false);
  });

  it('stays on the ground until the player asks to get up', () => {
    // Raheem: "he should stay on the ground until you hit an arrow to make him
    // get up." Getting up is the first thing he does after losing everything,
    // and taking that beat away made a defeat read as a stumble.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    const waited = run(s, 400); // ~6.4 seconds of doing nothing
    expect(waited.state.phase).toBe('knockdown');
  });

  it('gets up when asked, and can always do so — no frozen pose', () => {
    // The invariant did not disappear when the exit became player-driven; it
    // moved. He must always be ABLE to get up, or the phase has no exit and the
    // failure is indistinguishable from a hung game.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    for (let i = 0; i < 5; i++) s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.phase).toBe('knockdown');

    const frames = Math.ceil(
      (ACTION_TIMING.knockdownFallMs +
        ACTION_TIMING.knockdownGroundedMs +
        ACTION_TIMING.standUpMs) /
        16,
    ) + 4;
    const recovered = run(s, frames, { getUpRequested: true });
    expect(recovered.state.phase).toBe('explore');
  });

  it('requires time fully grounded even when get-up input is already held', () => {
    // Mashing forward during the fall must not erase the punishment on the floor.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    const early = run(
      s,
      Math.ceil(ACTION_TIMING.knockdownFallMs / 16) + 4,
      { getUpRequested: true },
    );
    expect(early.state.phase).toBe('knockdown');
  });

  it('ignores a further hit once he is already down', () => {
    // Otherwise every frame of an overlapping hitbox restarts the knockdown and
    // he never gets up.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    const early = s.elapsedMs;
    s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.elapsedMs).toBeGreaterThan(early);
  });

  it('charges while held and only fires on release', () => {
    // "You're gonna have to charge up, let go of your attack." Holding must not
    // spray shots, and letting go must produce exactly one.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    expect(s.phase).toBe('charging');

    const held = run(s, 20, { firePressed: true });
    expect(held.state.phase).toBe('charging');
    expect(held.fired).toBe(0);

    const released = run(held.state, 40, { firePressed: false });
    expect(released.fired).toBe(1);
  });

  it('grows the charge with the hold, and stops at full', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    const early = s.chargeLevel;
    s = run(s, 10, { firePressed: true }).state;
    const mid = s.chargeLevel;
    s = run(s, 200, { firePressed: true }).state;

    expect(mid).toBeGreaterThan(early);
    expect(s.chargeLevel).toBeCloseTo(1);
    // Holding past full must not overcharge, so a player can charge fully and
    // then take their time aiming.
    s = run(s, 200, { firePressed: true }).state;
    expect(s.chargeLevel).toBeCloseTo(1);
  });

  it('still gives a tap something to fire', () => {
    // A tap that did nothing would read as a broken weapon while the player is
    // still learning that holding matters.
    expect(chargeFrom(0)).toBe(MIN_CHARGE_LEVEL);
    expect(MIN_CHARGE_LEVEL).toBeGreaterThan(0);
    expect(chargeFrom(0)).toBeLessThan(chargeFrom(9999));
  });

  it('carries the released charge all the way to the shot', () => {
    // Frozen at release, like the aim. What the player let go of is what fires.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = run(s, 60, { firePressed: true }).state;
    const atRelease = s.chargeLevel;

    let fired: number | null = null;
    for (let i = 0; i < 40 && fired === null; i++) {
      s = stepAction(s, input({ firePressed: false }), 16);
      if (s.fireThisStep) fired = s.chargeLevel;
    }
    expect(fired).toBeCloseTo(atRelease);
  });

  it('cancels the charge if the card leaves his hand', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ firePressed: true, hasReadyCard: false }), 16);
    expect(s.phase).toBe('explore');
  });

  it('loses the charge to a heavy hit', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = run(s, 40, { firePressed: true }).state;
    s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.phase).toBe('knockdown');
    expect(s.chargeLevel).toBe(0);
  });

  it('lets him keep moving while charging, but slower', () => {
    expect(walkScale('charging')).toBeGreaterThan(0);
    expect(walkScale('charging')).toBeLessThan(walkScale('explore'));
    expect(canWalk('charging')).toBe(true);
  });

  it('runs the whole summoning ritual, then hands control back', () => {
    // The art is the clock: the phase cannot end before the palm reaches the
    // ground, or the character appears out of a gesture that never finished.
    let s = stepAction(initialAction(), input({ summonPressed: true }), 16);
    expect(s.phase).toBe('summoning');

    const nearlyDone = run(s, Math.floor(ACTION_TIMING.summonMs / 16) - 2, {});
    expect(nearlyDone.state.phase).toBe('summoning');

    const done = run(nearlyDone.state, 6, {});
    expect(done.state.phase).toBe('explore');
  });

  it('plants the card rather than firing it when both are pressed', () => {
    // Summoning is the deliberate act; firing is the reflex.
    const s = stepAction(
      initialAction(),
      input({ summonPressed: true, firePressed: true }),
      16,
    );
    expect(s.phase).toBe('summoning');
  });

  it('will not start a ritual with no card to plant', () => {
    const s = stepAction(initialAction(), input({ summonPressed: true, hasReadyCard: false }), 16);
    expect(s.phase).toBe('explore');
  });

  it('lets a heavy hit interrupt the ritual', () => {
    let s = stepAction(initialAction(), input({ summonPressed: true }), 16);
    s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.phase).toBe('knockdown');
  });

  it('roots him for the ritual, unlike firing', () => {
    // Planting a card is a commitment. Firing is not.
    expect(walkScale('summoning')).toBe(0);
    expect(walkScale('windup')).toBeGreaterThan(0);
  });

  it('reads a tap as the quick slot and a hold as the heavy one', () => {
    // Handoff §6.3: one input, two slots. The threshold is the only thing that
    // tells them apart — there is no second button.
    expect(fireAfterHolding(0).releaseKind).toBe('quick');
    expect(fireAfterHolding(ACTION_TIMING.holdThresholdMs + 100).releaseKind).toBe('heavy');
  });

  it('puts the threshold boundary itself on the heavy side', () => {
    // Stated so the edge is a decision rather than an accident of rounding.
    expect(releaseKindFrom(ACTION_TIMING.holdThresholdMs - 1)).toBe('quick');
    expect(releaseKindFrom(ACTION_TIMING.holdThresholdMs)).toBe('heavy');
  });

  it('fires a tap at a tap\'s worth of charge, however far the meter had crept', () => {
    // Otherwise a quick action is just a slightly weaker heavy one, and there is
    // no reason to ever tap deliberately.
    const quick = fireAfterHolding(ACTION_TIMING.holdThresholdMs - 32);
    expect(quick.chargeLevel).toBe(MIN_CHARGE_LEVEL);

    const heavy = fireAfterHolding(ACTION_TIMING.holdThresholdMs + 100);
    expect(heavy.chargeLevel).toBeGreaterThan(MIN_CHARGE_LEVEL);
  });

  it('carries the slot from release all the way to the shot', () => {
    // Frozen with the aim and the charge: the slot belongs to the press the
    // player finished, not to the inputs two frames later.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = run(s, 40, { firePressed: true }).state;
    s = stepAction(s, input({ firePressed: false }), 16);
    expect(s.phase).toBe('windup');
    expect(s.releaseKind).toBe('heavy');

    for (let i = 0; i < 40; i++) {
      s = stepAction(s, input(), 16);
      if (s.fireThisStep) break;
    }
    expect(s.fireThisStep).toBe(true);
    expect(s.releaseKind).toBe('heavy');
  });

  it('clears the slot once control comes back', () => {
    const s = run(fireAfterHolding(0), 60).state;
    expect(s.phase).toBe('explore');
    expect(s.releaseKind).toBeNull();
  });

  it('abandons a charge on cancel without firing anything', () => {
    // The alt-tab case: the key-up is never coming, so without this he holds the
    // card forever and it reads as a hung game.
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = run(s, 20, { firePressed: true }).state;
    expect(s.phase).toBe('charging');

    s = stepAction(s, input({ firePressed: true, cancelRequested: true }), 16);
    expect(s.phase).toBe('explore');
    expect(s.chargeLevel).toBe(0);

    // And the abandoned charge must not turn into a shot a few frames later.
    const after = run(s, 60, { firePressed: true });
    expect(after.fired).toBe(0);
  });

  it('cancels a windup too, losing the shot rather than firing it blind', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ firePressed: false }), 16);
    expect(s.phase).toBe('windup');

    s = stepAction(s, input({ cancelRequested: true }), 16);
    expect(s.phase).toBe('explore');
    const after = run(s, 60);
    expect(after.fired).toBe(0);
  });

  it('does not let a cancel rescue him from a knockdown', () => {
    // Losing focus while down must not skip the recovery he owes.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    s = stepAction(s, input({ cancelRequested: true }), 16);
    expect(s.phase).toBe('knockdown');
  });

  it('lets a heavy hit win over a cancel raised on the same frame', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
    s = stepAction(s, input({ heavyHit: true, cancelRequested: true }), 16);
    expect(s.phase).toBe('knockdown');
  });

  it('cannot be knocked down again the instant he stands up', () => {
    // §16.15: ten loops with no repeated unavoidable knockdown. Whatever put him
    // down is standing right there when he gets up, and without a grace window
    // he watches four cards scatter twice with no move in between.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    const upright = run(
      s,
      Math.ceil(
        (ACTION_TIMING.knockdownFallMs +
          ACTION_TIMING.knockdownGroundedMs +
          ACTION_TIMING.standUpMs) /
          16,
      ) + 4,
      { getUpRequested: true },
    );
    expect(upright.state.phase).toBe('explore');
    expect(upright.state.graceRemainingMs).toBeGreaterThan(0);

    const hitAgain = stepAction(upright.state, input({ heavyHit: true }), 16);
    expect(hitAgain.phase).toBe('explore');
  });

  it('is put down once by something swinging at him throughout the recovery', () => {
    // A construct standing over him keeps attacking. From the hit that fells him
    // to the end of the grace he must go down exactly once — that whole span is
    // knockdown, stand-up, and the walk to his cards.
    const protectedMs =
      ACTION_TIMING.knockdownFallMs +
      ACTION_TIMING.knockdownGroundedMs +
      ACTION_TIMING.standUpMs +
      ACTION_TIMING.knockdownGraceMs;
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    let knockdowns = 1;
    for (let i = 0; i < Math.floor(protectedMs / 16) - 2; i++) {
      const before = s.phase;
      // Swinging every half second.
      s = stepAction(s, input({ heavyHit: i % 31 === 30, getUpRequested: true }), 16);
      if (s.phase === 'knockdown' && before !== 'knockdown') knockdowns++;
    }
    expect(knockdowns).toBe(1);
  });

  it('lets the grace run out, so he is not permanently safe', () => {
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    s = run(
      s,
      Math.ceil(
        (ACTION_TIMING.knockdownFallMs +
          ACTION_TIMING.knockdownGroundedMs +
          ACTION_TIMING.standUpMs) /
          16,
      ) + 4,
      { getUpRequested: true },
    ).state;
    s = run(s, Math.ceil(ACTION_TIMING.knockdownGraceMs / 16) + 4).state;
    expect(s.graceRemainingMs).toBe(0);

    const down = stepAction(s, input({ heavyHit: true }), 16);
    expect(down.phase).toBe('knockdown');
  });

  it('starts with no grace, so the first hit always lands', () => {
    expect(initialAction().graceRemainingMs).toBe(0);
    expect(stepAction(initialAction(), input({ heavyHit: true }), 16).phase).toBe('knockdown');
  });

  it('does not hand out grace for firing or being interrupted', () => {
    // Only standing up grants it. A charge cancelled by a hit must not leave him
    // briefly invincible.
    const fired = run(fireAfterHolding(0), 60).state;
    expect(fired.graceRemainingMs).toBe(0);
  });

  it('slows the walk while firing instead of rooting him', () => {
    // §12.8: a deliberately weak character who cannot move while attacking reads
    // as helpless rather than fragile.
    expect(walkScale('explore')).toBe(1);
    expect(walkScale('windup')).toBeGreaterThan(0);
    expect(walkScale('windup')).toBeLessThan(1);
    expect(walkScale('knockdown')).toBe(0);
    expect(canWalk('windup')).toBe(true);
    expect(canWalk('knockdown')).toBe(false);
    expect(isBusy('explore')).toBe(false);
    expect(isBusy('windup')).toBe(true);
  });
});

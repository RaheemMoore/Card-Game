import { describe, expect, it } from 'vitest';
import {
  chargeFrom,
  MIN_CHARGE_LEVEL,
  initialAction,
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
  ...over,
});

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

  it('always stands back up, and cannot be stun-locked into a frozen pose', () => {
    // Repeated hits should keep him down but never leave him in a phase with no
    // exit — the failure mode is indistinguishable from a hung game.
    let s = stepAction(initialAction(), input({ heavyHit: true }), 16);
    for (let i = 0; i < 5; i++) s = stepAction(s, input({ heavyHit: true }), 16);
    expect(s.phase).toBe('knockdown');

    const recovered = run(s, Math.ceil((ACTION_TIMING.knockdownMs + ACTION_TIMING.standUpMs) / 16) + 4);
    expect(recovered.state.phase).toBe('explore');
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

import { describe, expect, it } from 'vitest';
import {
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
    expect(s.phase).toBe('windup');

    const total = ACTION_TIMING.windupMs + ACTION_TIMING.activeMs + ACTION_TIMING.recoveryMs;
    const after = run(s, Math.ceil(total / 16) + 4);
    expect(after.state.phase).toBe('explore');
  });

  it('spawns exactly one projectile per press', () => {
    // A flag that stuck on for the whole active phase would fire four shots at
    // 60fps for one button press.
    const s = stepAction(initialAction(), input({ firePressed: true }), 16);
    const { fired } = run(s, 60);
    expect(fired).toBe(1);
  });

  it('commits the aim at windup so a shot cannot be bent afterwards', () => {
    // Handoff §7.3: moving the mouse after the throw must not curve the throw.
    let s = stepAction(initialAction(), input({ firePressed: true, aim: { x: 1, y: 0 } }), 16);
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
    s = stepAction(s, input(), 5000);
    expect(s.phase).not.toBe('windup');
  });

  it('lets a heavy hit interrupt any phase, including the active frame', () => {
    for (const setup of ['explore', 'windup', 'recovery'] as const) {
      let s = initialAction();
      if (setup !== 'explore') {
        s = stepAction(s, input({ firePressed: true }), 16);
        if (setup === 'recovery') s = run(s, 20).state;
      }
      const hit = stepAction(s, input({ heavyHit: true }), 16);
      expect(hit.phase).toBe('knockdown');
    }
  });

  it('drops a committed shot when the hit lands mid-cast', () => {
    let s = stepAction(initialAction(), input({ firePressed: true }), 16);
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

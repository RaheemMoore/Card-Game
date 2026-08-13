import { describe, expect, it } from 'vitest';
import { ACTION_TIMING, MIN_CHARGE_LEVEL, type ActionPhase } from './actionState';
import { NEUTRAL_POSE, attackPose, cardPose, type AttackPoseInput } from './attackPose';
import { getAttackFeel } from './feel';

const AIM = { x: 1, y: 0 };
const FEEL = getAttackFeel('heavy', 'full');

const pose = (over: Partial<AttackPoseInput> = {}) =>
  attackPose({
    phase: 'active',
    elapsedMs: ACTION_TIMING.activeMs,
    chargeLevel: 1,
    aim: AIM,
    feel: FEEL,
    ...over,
  });

describe('attack pose', () => {
  it('stands neutral in every non-attacking phase', () => {
    // Knockdown, stand-up and the summon all have their own authored clips.
    // Leaning on top of one would fight art that was made to be seen straight.
    const idle: ActionPhase[] = ['explore', 'summoning', 'knockdown', 'standUp'];
    for (const phase of idle) {
      expect(pose({ phase })).toEqual(NEUTRAL_POSE);
    }
  });

  it('stays neutral with no aim rather than guessing a direction', () => {
    expect(pose({ aim: null })).toEqual(NEUTRAL_POSE);
  });

  it('pulls BACK while charging — anticipation, not commitment', () => {
    const p = pose({ phase: 'charging', elapsedMs: 400 });
    expect(p.offsetX).toBeLessThan(0);
  });

  it('leans further the longer the shot is held', () => {
    const tap = pose({ phase: 'charging', chargeLevel: MIN_CHARGE_LEVEL });
    const full = pose({ phase: 'charging', chargeLevel: 1 });
    // Both back, but the full hold is visibly further back — the lean has to
    // report the same thing the charge particles do.
    expect(full.offsetX).toBeLessThan(tap.offsetX);
    expect(tap.offsetX).toBeLessThan(0);
  });

  it('is already committed forward on the first frame of the strike', () => {
    // THE load-bearing assertion. The projectile is born on entry to `active`,
    // so if the body were still travelling here it would read as reacting to
    // its own shot rather than throwing it.
    const first = pose({ phase: 'active', elapsedMs: 0 });
    const last = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs });
    expect(last.offsetX).toBeGreaterThan(0);
    expect(last.offsetX).toBeCloseTo(FEEL.lungePx, 5);
    // It starts from the wound-up position and covers the whole distance in
    // 60ms, which is what makes the throw snap.
    expect(first.offsetX).toBeLessThan(0);
  });

  it('squashes at the contact frame and unwinds through recovery', () => {
    const strike = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs });
    expect(strike.scaleY).toBeLessThan(1);
    expect(strike.scaleX).toBeGreaterThan(1);

    const settled = pose({ phase: 'recovery', elapsedMs: ACTION_TIMING.recoveryMs });
    expect(settled.scaleX).toBeCloseTo(1, 5);
    expect(settled.scaleY).toBeCloseTo(1, 5);
    expect(settled.offsetX).toBeCloseTo(0, 5);
  });

  it('returns all the way home by the end of recovery', () => {
    // A pose that did not fully unwind would leave him permanently off his own
    // feet — and because the offset is a lie told to the sprite, that lie would
    // never be corrected by anything else.
    const end = pose({ phase: 'recovery', elapsedMs: ACTION_TIMING.recoveryMs * 3 });
    expect(end).toEqual(NEUTRAL_POSE);
  });

  it('throws along the aim, in both axes', () => {
    const up = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs, aim: { x: 0, y: -1 } });
    expect(up.offsetY).toBeLessThan(0);
    expect(up.offsetX).toBeCloseTo(0, 5);
    // Damped vertically: this is a low top-down camera, and matching the axes
    // one-for-one makes an upward throw look like a hop.
    expect(Math.abs(up.offsetY)).toBeLessThan(FEEL.lungePx);
  });

  it('lunges further for a heavier shot', () => {
    const light = attackPose({
      phase: 'active',
      elapsedMs: ACTION_TIMING.activeMs,
      chargeLevel: MIN_CHARGE_LEVEL,
      aim: AIM,
      feel: getAttackFeel('light', 'full'),
    });
    expect(pose().offsetX).toBeGreaterThan(light.offsetX);
  });

  it('is completely still when motion is off', () => {
    const off = attackPose({
      phase: 'active',
      elapsedMs: ACTION_TIMING.activeMs,
      chargeLevel: 1,
      aim: AIM,
      feel: getAttackFeel('heavy', 'off'),
    });
    expect(off).toEqual(NEUTRAL_POSE);
  });

  it('tilts BACKWARD winding up and FORWARD at the strike', () => {
    // The wind-up and the throw have to be visibly opposite, not merely
    // different sizes — opposition is what makes an anticipation read as an
    // anticipation rather than as a smaller version of the same move.
    const wind = pose({ phase: 'charging', chargeLevel: 1 });
    const strike = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs });
    expect(wind.rotation).toBeLessThan(0);
    expect(strike.rotation).toBeGreaterThan(0);
  });

  it('mirrors the tilt when he throws the other way', () => {
    // Leaning right while throwing left would read as falling over.
    const right = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs, aim: { x: 1, y: 0 } });
    const left = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs, aim: { x: -1, y: 0 } });
    expect(right.rotation).toBeCloseTo(-left.rotation, 5);
  });

  it('does not tilt at all for a throw into or out of the screen', () => {
    // A lean toward the camera has no on-screen direction, so expressing it as
    // a roll would be inventing information the viewer cannot interpret.
    const up = pose({ phase: 'active', elapsedMs: ACTION_TIMING.activeMs, aim: { x: 0, y: -1 } });
    expect(up.rotation).toBeCloseTo(0, 5);
  });

  it('never exceeds the lunge it was given', () => {
    // The offset is applied to a sprite whose collider does not follow it, so
    // an unbounded pose would be a hero drawn somewhere he cannot be hit.
    const phases: ActionPhase[] = ['charging', 'windup', 'active', 'recovery'];
    for (const phase of phases) {
      for (let ms = 0; ms <= 1200; ms += 20) {
        const p = attackPose({ phase, elapsedMs: ms, chargeLevel: 1, aim: AIM, feel: FEEL });
        expect(Math.abs(p.offsetX)).toBeLessThanOrEqual(
          Math.max(FEEL.lungePx, FEEL.windupLeanPx) + 0.001,
        );
      }
    }
  });
});

describe('the card throws itself', () => {
  const card = (over: Partial<AttackPoseInput> = {}) =>
    cardPose({
      phase: 'windup',
      elapsedMs: 0,
      chargeLevel: 1,
      aim: AIM,
      feel: FEEL,
      ...over,
    });

  it('is only in his hand while he is winding one up', () => {
    // From `active` onward it IS the projectile. Drawing both would show the
    // player two cards for the length of the strike.
    expect(card({ phase: 'charging' }).visible).toBe(true);
    expect(card({ phase: 'windup' }).visible).toBe(true);
    expect(card({ phase: 'active' }).visible).toBe(false);
    expect(card({ phase: 'recovery' }).visible).toBe(false);
    expect(card({ phase: 'explore' }).visible).toBe(false);
  });

  it('draws BACK as the charge fills, and grows', () => {
    const tap = card({ phase: 'charging', chargeLevel: MIN_CHARGE_LEVEL });
    const full = card({ phase: 'charging', chargeLevel: 1 });
    expect(tap.offsetX).toBeLessThan(0);
    expect(full.offsetX).toBeLessThan(tap.offsetX);
    // Growth is the plainest possible statement of "this is getting stronger",
    // made on the object the player is already looking at.
    expect(full.scale).toBeGreaterThan(tap.scale);
  });

  it('travels from behind the hand to past it across the wind-up', () => {
    const start = card({ elapsedMs: 0 });
    const end = card({ elapsedMs: ACTION_TIMING.windupMs });
    expect(start.offsetX).toBeLessThan(0);
    expect(end.offsetX).toBeGreaterThan(0);
    expect(end.offsetX).toBeCloseTo(FEEL.cardThrowPx, 5);
  });

  it('reaches full extension exactly as the shot is born', () => {
    // The projectile spawns on entry to `active`, so the throw has to be
    // COMPLETE at the end of the wind-up. A card still travelling when its own
    // blast appears reads as two separate objects.
    const atRelease = card({ elapsedMs: ACTION_TIMING.windupMs });
    const past = card({ elapsedMs: ACTION_TIMING.windupMs * 2 });
    expect(past.offsetX).toBeCloseTo(atRelease.offsetX, 5);
  });

  it('spins on the way out', () => {
    // A card that translates without rotating reads as being carried.
    const start = card({ elapsedMs: 0 });
    const end = card({ elapsedMs: ACTION_TIMING.windupMs });
    expect(Math.abs(end.rotation - start.rotation)).toBeGreaterThan(1);
  });

  it('goes where the throw goes', () => {
    const left = card({ elapsedMs: ACTION_TIMING.windupMs, aim: { x: -1, y: 0 } });
    expect(left.offsetX).toBeLessThan(0);
  });

  it('stays in hand, still, when motion is off', () => {
    const off = cardPose({
      phase: 'windup',
      elapsedMs: ACTION_TIMING.windupMs,
      chargeLevel: 1,
      aim: AIM,
      feel: getAttackFeel('heavy', 'off'),
    });
    // Still VISIBLE — the card is information, not decoration, and a player
    // with motion off must still see what he is holding.
    expect(off.visible).toBe(true);
    expect(off.offsetX).toBeCloseTo(0, 5);
  });

  it('has no opinion without an aim', () => {
    expect(card({ aim: null }).visible).toBe(false);
  });
});

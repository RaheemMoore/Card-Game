import { describe, it, expect } from 'vitest';
import {
  CAN_JUMP,
  applyKnockback,
  initialPlayer,
  moveAxis,
  playerBody,
  stepPlayer,
} from './playerController';
import { ARENA, FRONT_V4_WALK_SPEED, GROUND_Y, HERO_BODY } from './layout';

const intent = (left: boolean, right: boolean) => ({ left, right });
const walking = { walkScale: 1 };

describe('moveAxis', () => {
  it('reads a single key as a direction', () => {
    expect(moveAxis(intent(true, false))).toBe(-1);
    expect(moveAxis(intent(false, true))).toBe(1);
  });

  it('cancels opposing keys instead of picking a winner', () => {
    // A player who panics during a telegraph and mashes both ways must stand
    // still, not slide into the landing zone.
    expect(moveAxis(intent(true, true))).toBe(0);
    expect(moveAxis(intent(false, false))).toBe(0);
  });
});

describe('stepPlayer', () => {
  it('moves at the walk speed the fairness proof is stated against', () => {
    const next = stepPlayer(initialPlayer(500), { intent: intent(false, true), ...walking }, 1000);
    expect(next.x).toBeCloseTo(500 + FRONT_V4_WALK_SPEED, 5);
  });

  it('is frame-rate independent', () => {
    const once = stepPlayer(initialPlayer(500), { intent: intent(false, true), ...walking }, 16);
    let twice = initialPlayer(500);
    twice = stepPlayer(twice, { intent: intent(false, true), ...walking }, 8);
    twice = stepPlayer(twice, { intent: intent(false, true), ...walking }, 8);
    expect(twice.x).toBeCloseTo(once.x, 6);
  });

  it('keeps facing through idle', () => {
    const west = stepPlayer(initialPlayer(500), { intent: intent(true, false), ...walking }, 16);
    expect(west.facing).toBe(-1);
    const stopped = stepPlayer(west, { intent: intent(false, false), ...walking }, 16);
    expect(stopped.facing).toBe(-1);
    expect(stopped.vx).toBe(0);
  });

  it('turns to look even while rooted, but does not travel', () => {
    // walkScale is 0 for every action phase: the firing stance is planted. He may
    // still face the thing that is about to land on him.
    const rooted = stepPlayer(initialPlayer(500), { intent: intent(true, false), walkScale: 0 }, 16);
    expect(rooted.facing).toBe(-1);
    expect(rooted.x).toBe(500);
  });

  it('clamps to the arena at both ends', () => {
    const west = stepPlayer(initialPlayer(ARENA.minX + 5), { intent: intent(true, false), ...walking }, 1000);
    expect(west.x).toBe(ARENA.minX);
    const east = stepPlayer(initialPlayer(ARENA.maxX - 5), { intent: intent(false, true), ...walking }, 1000);
    expect(east.x).toBe(ARENA.maxX);
  });

  it('has no input that produces height', () => {
    // The state has no vertical channel at all, which is the strongest form this
    // guarantee can take: there is nothing for a stray jump binding to write to.
    const next = stepPlayer(initialPlayer(500), { intent: intent(false, true), ...walking }, 16);
    expect(Object.keys(next).sort()).toEqual(['facing', 'vx', 'x']);
    expect(CAN_JUMP).toBe(false);
  });
});

describe('applyKnockback', () => {
  it('shoves him away from the contact', () => {
    expect(applyKnockback(initialPlayer(600), 1, 90).x).toBe(690);
    expect(applyKnockback(initialPlayer(600), -1, 90).x).toBe(510);
  });

  it('stops at the castle wall rather than passing through it', () => {
    const shoved = applyKnockback(initialPlayer(ARENA.minX + 20), -1, 400);
    expect(shoved.x).toBe(ARENA.minX);
  });

  it('stops at the eastern bound', () => {
    expect(applyKnockback(initialPlayer(ARENA.maxX - 20), 1, 400).x).toBe(ARENA.maxX);
  });
});

describe('playerBody', () => {
  it('stands on the ground line and rises to his drawn height', () => {
    const body = playerBody(initialPlayer(500), GROUND_Y, HERO_BODY);
    expect(body.bottom).toBe(GROUND_Y);
    expect(body.top).toBe(GROUND_Y - HERO_BODY.heightPx);
    expect(body.right - body.left).toBe(HERO_BODY.halfWidthPx * 2);
  });
});

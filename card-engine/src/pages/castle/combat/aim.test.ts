import { describe, expect, it } from 'vitest';
import {
  initialAim,
  resolveAim,
  releaseOverride,
  quantiseFacing,
  OVERRIDE_GRACE_MS,
  STICK_DEAD_ZONE,
  POINTER_INTENT_PX,
  type AimInputs,
  type AimState,
} from './aim';

const input = (over: Partial<AimInputs> = {}): AimInputs => ({
  move: { x: 0, y: 0 },
  pointer: null,
  pointerTravelPx: 0,
  stick: { x: 0, y: 0 },
  firePressed: false,
  now: 0,
  ...over,
});

/** Walk `state` forward through idle frames, so grace windows can lapse. */
const idleUntil = (state: AimState, now: number) => resolveAim(state, input({ now }));

describe('quantiseFacing', () => {
  it('maps each axis to the pose the sheet actually has', () => {
    expect(quantiseFacing({ x: 0, y: 1 })).toBe('down');
    expect(quantiseFacing({ x: 0, y: -1 })).toBe('up');
    expect(quantiseFacing({ x: -1, y: 0 })).toBe('left');
    expect(quantiseFacing({ x: 1, y: 0 })).toBe('right');
  });

  it('resolves an exact diagonal horizontally rather than arbitrarily', () => {
    // Has to land somewhere; left/right reads better on a mostly-silhouette body.
    expect(quantiseFacing({ x: 0.707, y: 0.707 })).toBe('right');
    expect(quantiseFacing({ x: -0.707, y: -0.707 })).toBe('left');
  });
});

describe('aim ownership', () => {
  it('lets movement set facing while walking', () => {
    const s = resolveAim(initialAim(0), input({ move: { x: -1, y: 0 }, now: 16 }));
    expect(s.owner).toBe('movement');
    expect(s.facing).toBe('left');
  });

  it('ignores a resting stick', () => {
    // The bug this prevents: a worn controller idling around 0.1 fights the walk
    // direction every frame, which reads as the character being drunk.
    const drift = STICK_DEAD_ZONE - 0.05;
    const s = resolveAim(
      initialAim(0),
      input({ move: { x: -1, y: 0 }, stick: { x: drift, y: 0 }, now: 16 }),
    );
    expect(s.owner).toBe('movement');
    expect(s.facing).toBe('left');
  });

  it('hands aim to a stick pushed past the dead zone', () => {
    const s = resolveAim(
      initialAim(0),
      input({ move: { x: -1, y: 0 }, stick: { x: 0.9, y: 0 }, now: 16 }),
    );
    expect(s.owner).toBe('stick');
    expect(s.facing).toBe('right');
  });

  it('ignores pointer jitter but obeys deliberate pointer movement', () => {
    const jitter = resolveAim(
      initialAim(0),
      input({
        move: { x: -1, y: 0 },
        pointer: { x: 1, y: 0 },
        pointerTravelPx: POINTER_INTENT_PX - 1,
        now: 16,
      }),
    );
    expect(jitter.owner).toBe('movement');

    const moved = resolveAim(
      initialAim(0),
      input({
        move: { x: -1, y: 0 },
        pointer: { x: 1, y: 0 },
        pointerTravelPx: POINTER_INTENT_PX,
        now: 16,
      }),
    );
    expect(moved.owner).toBe('pointer');
    expect(moved.facing).toBe('right');
  });

  it('treats pressing fire as pointer intent even with a motionless mouse', () => {
    // A player who lines up a shot and waits should shoot where the crosshair is,
    // not where his feet are pointing.
    const s = resolveAim(
      initialAim(0),
      input({ move: { x: -1, y: 0 }, pointer: { x: 0, y: -1 }, firePressed: true, now: 16 }),
    );
    expect(s.owner).toBe('pointer');
    expect(s.facing).toBe('up');
  });

  it('does not flip between crosshair and walk direction between shots', () => {
    // The regression this guards: strafing while firing makes the pointer live on
    // the fire frame and dead between shots. Without the grace window the body
    // snaps back and forth for as long as the fight lasts.
    let s = resolveAim(
      initialAim(0),
      input({ pointer: { x: 1, y: 0 }, firePressed: true, now: 1000 }),
    );
    expect(s.owner).toBe('pointer');

    s = resolveAim(s, input({ move: { x: 0, y: 1 }, now: 1000 + OVERRIDE_GRACE_MS - 100 }));
    expect(s.owner).toBe('pointer');
    expect(s.facing).toBe('right');
  });

  it('gives aim back to the walk keys once the override goes quiet', () => {
    let s = resolveAim(
      initialAim(0),
      input({ pointer: { x: 1, y: 0 }, firePressed: true, now: 1000 }),
    );
    s = resolveAim(s, input({ move: { x: 0, y: 1 }, now: 1000 + OVERRIDE_GRACE_MS + 1 }));
    expect(s.owner).toBe('movement');
    expect(s.facing).toBe('down');
  });

  it('holds the last real direction when every input goes idle', () => {
    // Letting go of everything should not spin him round to a default pose.
    const walking = resolveAim(initialAim(0), input({ move: { x: -1, y: 0 }, now: 16 }));
    const idle = idleUntil(walking, 5000);
    expect(idle.aim).toEqual(walking.aim);
    expect(idle.facing).toBe('left');
  });

  it('keeps ownedSince stable while one source stays in charge', () => {
    const first = resolveAim(initialAim(0), input({ stick: { x: 1, y: 0 }, now: 100 }));
    const second = resolveAim(first, input({ stick: { x: 0.8, y: 0.2 }, now: 200 }));
    expect(second.ownedSince).toBe(100);
    expect(second.ownerActiveAt).toBe(200);
  });

  it('normalises whatever the device reports', () => {
    const s = resolveAim(initialAim(0), input({ stick: { x: 0, y: 0.6 }, now: 16 }));
    expect(Math.hypot(s.aim.x, s.aim.y)).toBeCloseTo(1);
  });

  it('releases an override on demand', () => {
    const held = resolveAim(initialAim(0), input({ stick: { x: 1, y: 0 }, now: 100 }));
    const freed = releaseOverride(held, 500);
    expect(freed.owner).toBe('movement');
    // The direction survives — only who is allowed to change it has changed.
    expect(freed.aim).toEqual(held.aim);
  });
});

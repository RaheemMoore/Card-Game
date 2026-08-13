import { describe, expect, it } from 'vitest';
import { buildAimInputs, moveVector, newPointerTracker, type DeviceSample } from './inputIntent';

const sample = (over: Partial<DeviceSample> = {}): DeviceSample => ({
  move: { x: 0, y: 0 },
  pointerScreen: null,
  pointerWorld: null,
  stick: { x: 0, y: 0 },
  firePressed: false,
  ...over,
});

describe('moveVector', () => {
  it('normalises diagonals so they are not 41% faster', () => {
    const d = moveVector(false, true, false, true);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
  });

  it('cancels opposing keys', () => {
    expect(moveVector(true, true, false, false)).toEqual({ x: 0, y: 0 });
  });

  it('reports a full unit along a single axis', () => {
    expect(moveVector(false, false, true, false)).toEqual({ x: 0, y: -1 });
  });
});

describe('buildAimInputs', () => {
  const player = { x: 100, y: 100 };

  it('reports no pointer travel on the first frame it appears', () => {
    // Nothing to compare against yet — inventing travel here would hand aim to a
    // mouse the player has not touched.
    const t = newPointerTracker();
    const a = buildAimInputs(
      sample({ pointerScreen: { x: 400, y: 300 }, pointerWorld: { x: 200, y: 100 } }),
      player,
      t,
      0,
    );
    expect(a.pointerTravelPx).toBe(0);
  });

  it('measures pointer travel in screen space, not world space', () => {
    // The regression this guards: the camera follows the player, so a still mouse
    // sweeps the world constantly while walking. Measured in world units the
    // pointer would look "moved" every frame and permanently outrank the keys.
    const t = newPointerTracker();
    buildAimInputs(
      sample({ pointerScreen: { x: 400, y: 300 }, pointerWorld: { x: 200, y: 100 } }),
      player,
      t,
      0,
    );
    // Player walked 500 world units; the cursor did not move on screen at all.
    const a = buildAimInputs(
      sample({ pointerScreen: { x: 400, y: 300 }, pointerWorld: { x: 700, y: 100 } }),
      { x: 600, y: 100 },
      t,
      16,
    );
    expect(a.pointerTravelPx).toBe(0);
  });

  it('measures real pointer movement', () => {
    const t = newPointerTracker();
    buildAimInputs(sample({ pointerScreen: { x: 400, y: 300 } }), player, t, 0);
    const a = buildAimInputs(sample({ pointerScreen: { x: 403, y: 304 } }), player, t, 16);
    expect(a.pointerTravelPx).toBeCloseTo(5);
  });

  it('aims from the player toward the cursor', () => {
    const t = newPointerTracker();
    const a = buildAimInputs(
      sample({ pointerScreen: { x: 0, y: 0 }, pointerWorld: { x: 100, y: 500 } }),
      player,
      t,
      0,
    );
    expect(a.pointer).toEqual({ x: 0, y: 400 });
  });

  it('treats a cursor sitting on the player as no direction at all', () => {
    // A zero vector would normalise to something arbitrary and snap the body to
    // a pose the player never asked for.
    const t = newPointerTracker();
    const a = buildAimInputs(
      sample({ pointerScreen: { x: 0, y: 0 }, pointerWorld: { x: 100, y: 100 } }),
      player,
      t,
      0,
    );
    expect(a.pointer).toBeNull();
  });

  it('forgets the pointer when it goes away, so it cannot resume with stale travel', () => {
    const t = newPointerTracker();
    buildAimInputs(sample({ pointerScreen: { x: 400, y: 300 } }), player, t, 0);
    buildAimInputs(sample({ pointerScreen: null }), player, t, 16);
    expect(t.lastScreen).toBeNull();

    const back = buildAimInputs(sample({ pointerScreen: { x: 900, y: 800 } }), player, t, 32);
    expect(back.pointerTravelPx).toBe(0);
  });

  it('passes the stick and fire press through untouched', () => {
    const t = newPointerTracker();
    const a = buildAimInputs(
      sample({ stick: { x: 0.4, y: -0.9 }, firePressed: true }),
      player,
      t,
      99,
    );
    expect(a.stick).toEqual({ x: 0.4, y: -0.9 });
    expect(a.firePressed).toBe(true);
    expect(a.now).toBe(99);
  });
});

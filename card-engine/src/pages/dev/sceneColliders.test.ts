import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { COLLIDER_COLORS, readSceneColliders } from './sceneColliders';
import { feetBlocked, resolveWalk } from '../castle/v2-preview/walkBlocking';

/**
 * The Editor's rectangles are read by shape, not by class, so a plain object
 * with the same fields stands in for one exactly. That keeps these tests free of
 * a WebGL context while still testing the real geometry maths.
 */
function rect(props: Partial<Phaser.GameObjects.Rectangle> & { fillColor: number }) {
  return {
    x: 0, y: 0, width: 100, height: 100,
    originX: 0, originY: 0, scaleX: 1, scaleY: 1, rotation: 0,
    ...props,
  } as unknown as Phaser.GameObjects.Rectangle;
}

const sceneWith = (list: unknown[]) =>
  ({ l14_COLLIDERS: { list, getAll: () => list } }) as unknown as Phaser.Scene;

describe('readSceneColliders', () => {
  it('reports missing when the scene has no collider layer', () => {
    const found = readSceneColliders({} as Phaser.Scene);
    expect(found.missing).toBe(true);
    expect(found.blockers).toHaveLength(0);
  });

  it('sorts shapes by fill colour and ignores unrecognised ones', () => {
    const found = readSceneColliders(
      sceneWith([
        rect({ fillColor: COLLIDER_COLORS.block }),
        rect({ fillColor: COLLIDER_COLORS.zone }),
        rect({ fillColor: 0x00ff00 }),
      ]),
    );
    expect(found.missing).toBe(false);
    expect(found.blockers).toHaveLength(1);
    expect(found.zones).toHaveLength(1);
    // The green one is deliberately not a collider of any kind.
    expect(found.shapes).toHaveLength(2);
  });

  it('tolerates a colour nudged in the picker', () => {
    const found = readSceneColliders(sceneWith([rect({ fillColor: 0xff3457 })]));
    expect(found.blockers).toHaveLength(1);
  });

  it('reads origin, so a centre-origin rectangle blocks where it is drawn', () => {
    const { blockers } = readSceneColliders(
      sceneWith([
        rect({ fillColor: COLLIDER_COLORS.block, x: 500, y: 500, originX: 0.5, originY: 0.5 }),
      ]),
    );
    const feet = { x: 495, y: 495, width: 10, height: 10 };
    expect(feetBlocked(feet, blockers)).toBe(true);
    expect(feetBlocked({ ...feet, x: 300, y: 300 }, blockers)).toBe(false);
  });

  it('reads scale', () => {
    const { blockers } = readSceneColliders(
      sceneWith([rect({ fillColor: COLLIDER_COLORS.block, scaleX: 2, scaleY: 2 })]),
    );
    // Unscaled the shape ends at 100; doubled it reaches 200.
    expect(feetBlocked({ x: 150, y: 150, width: 10, height: 10 }, blockers)).toBe(true);
  });

  it('rotates — a leaning wall blocks along its lean, not along its bounding box', () => {
    const { blockers } = readSceneColliders(
      sceneWith([
        rect({
          fillColor: COLLIDER_COLORS.block,
          x: 0, y: 0, width: 400, height: 40,
          rotation: Math.PI / 4,
        }),
      ]),
    );
    // On the diagonal the wall runs: blocked.
    expect(feetBlocked({ x: 190, y: 200, width: 20, height: 20 }, blockers)).toBe(true);
    // Inside the bounding box but off the lean: open paving. This is the corner
    // an axis-aligned physics body would have sealed off.
    expect(feetBlocked({ x: 260, y: 30, width: 20, height: 20 }, blockers)).toBe(false);
  });
});

describe('walking against an editor-drawn wall', () => {
  const { blockers } = readSceneColliders(
    sceneWith([
      rect({ fillColor: COLLIDER_COLORS.block, x: 200, y: 0, width: 40, height: 400 }),
    ]),
  );

  it('stops the feet at the face', () => {
    const move = resolveWalk({ x: 160, y: 100, width: 34, height: 20 }, 10, 0, blockers);
    expect(move.blocked).toBe(true);
    expect(move.x).toBe(160);
  });

  it('slides along the face instead of stopping dead', () => {
    const move = resolveWalk({ x: 160, y: 100, width: 34, height: 20 }, 10, 10, blockers);
    expect(move.slid).toBe(true);
    expect(move.x).toBe(160);
    expect(move.y).toBe(110);
  });

  it('lets an unobstructed step through untouched', () => {
    const move = resolveWalk({ x: 20, y: 100, width: 34, height: 20 }, 10, 10, blockers);
    expect(move).toEqual({ x: 30, y: 110, blocked: false, slid: false });
  });
});

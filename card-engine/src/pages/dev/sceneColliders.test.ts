import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { COLLIDER_COLORS, DOOR_COLORS, readSceneColliders, readSceneDoors } from './sceneColliders';
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

  it('keeps water as its own category, and still stops a walk', () => {
    // The pond had no shape at all until 2026-08-13: the hero could wade in and
    // a knockdown could scatter a card into the middle of it. Water is its own
    // colour rather than another BLOCK so that a later "wadeable, but cards
    // still never land in it" ruling is one predicate changing its mind.
    const found = readSceneColliders(
      sceneWith([
        rect({ fillColor: COLLIDER_COLORS.block }),
        rect({ fillColor: COLLIDER_COLORS.water, x: 400 }),
      ]),
    );
    expect(found.blockers).toHaveLength(1);
    expect(found.water).toHaveLength(1);
    // …but walking must see both, which is the whole point of the third list.
    expect(found.walkBlockers).toHaveLength(2);
  });

  it('blocks feet standing in water', () => {
    // Guards the wiring rather than the parsing: a `walkBlockers` that parsed
    // correctly and was never consulted is exactly the bug being fixed.
    const found = readSceneColliders(sceneWith([rect({ fillColor: COLLIDER_COLORS.water })]));
    const feet = { x: 40, y: 40, width: 20, height: 10 };
    expect(feetBlocked(feet, found.walkBlockers)).toBe(true);
    // And `blockers` alone would have let him wade straight in.
    expect(feetBlocked(feet, found.blockers)).toBe(false);
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

describe('readSceneDoors', () => {
  const doorScene = (list: unknown[]) =>
    ({ l24_DOORS: { list, getAll: () => list } }) as unknown as Phaser.Scene;

  it('reads a destination off the fill colour', () => {
    const { doors } = readSceneDoors(
      doorScene([
        rect({ fillColor: DOOR_COLORS.forge }),
        rect({ fillColor: DOOR_COLORS.collection }),
      ]),
    );
    expect(doors.map((d) => d.destination)).toEqual(['forge', 'collection']);
  });

  it('ignores an uncoloured shape rather than opening whatever is first', () => {
    const { doors } = readSceneDoors(doorScene([rect({ fillColor: 0x123456 })]));
    expect(doors).toHaveLength(0);
  });

  it('returns nothing for a scene with no doors layer', () => {
    expect(readSceneDoors({} as Phaser.Scene).doors).toHaveLength(0);
  });

  it('keeps every destination colour distinguishable under the ±24 tolerance', () => {
    // A door that could be read as two destinations is a door that opens the
    // wrong building, and nothing in the Editor would show you why.
    const entries = Object.entries(DOOR_COLORS);
    for (const [nameA, a] of entries) {
      const matches = entries.filter(([, b]) => {
        const ch = (v: number, s: number) => (v >> s) & 0xff;
        return (
          Math.abs(ch(a, 16) - ch(b, 16)) <= 24 &&
          Math.abs(ch(a, 8) - ch(b, 8)) <= 24 &&
          Math.abs(ch(a, 0) - ch(b, 0)) <= 24
        );
      });
      expect(matches.map(([n]) => n)).toEqual([nameA]);
    }
  });
});

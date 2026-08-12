import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCTION_SCENE, EXPLORABLE_SCENES, ALWAYS_LOADED } from './v2/courtyardRuntime';
import { SCENE_BEHAVIORS } from '../dev/sceneBehaviors';
import { DOOR_COLORS, COLLIDER_COLORS } from '../dev/sceneColliders';

/**
 * The readiness gate for the courtyard `/castle` loads.
 *
 * CourtyardV3 replaced V2 on 2026-08-12, and the switch waited on this file
 * rather than on the scene merely existing. What it guards is not "does V3 look
 * finished" — that is a question for playing it — but the handful of ways a scene
 * can be swapped in and be silently broken for a player:
 *
 *   - the doors stop resolving, so the Forge and the Archive become unreachable
 *     and the courtyard is a room with no exits;
 *   - a registry is missed, and the animals stand still or the hero cannot walk;
 *   - the collision layer is absent, and the player strolls through the castle;
 *   - the ground tilemap is gone, so world bounds fall back to content bounds and
 *     the camera scrolls out over the authoring shelf parked off-map.
 *
 * Every one of those renders without an error. That is why they are asserted here
 * instead of being noticed in play.
 *
 * The scene files are the Editor's own output at the repository root, read as
 * text: this is the same artifact Phaser loads at runtime, so there is no fixture
 * to drift.
 */

const sceneFile = (name: string) =>
  readFileSync(resolve(__dirname, '../../../..', `${name}.scene`), 'utf8');

/** Editor colours are written as hex strings in the .scene JSON. */
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

describe('the courtyard /castle loads is ready to be the courtyard', () => {
  const scene = sceneFile(PRODUCTION_SCENE);

  it('is the scene the runtime and the shell agree on', () => {
    // Guards the rename trap: PRODUCTION_SCENE naming a file that is not there
    // fails the fetch at runtime with a blank courtyard and a network error.
    expect(scene.length).toBeGreaterThan(0);
    expect(PRODUCTION_SCENE).toBe('CourtyardV3');
  });

  it('is registered everywhere a walkable scene has to be registered', () => {
    // Four places in two files. sceneBehaviors/index.ts says it plainly: "A SCENE
    // MISSING FROM THIS TABLE IS SILENT."
    expect(EXPLORABLE_SCENES.has(PRODUCTION_SCENE)).toBe(true);
    expect(SCENE_BEHAVIORS[PRODUCTION_SCENE]).toBeTruthy();
    expect(ALWAYS_LOADED[PRODUCTION_SCENE]?.length ?? 0).toBeGreaterThan(0);
  });

  it('keeps a door to the Forge and a door to the Archive', () => {
    // The shell routes on destination, and the destination is the fill colour —
    // an Editor recolour is enough to strand a stall with nothing to report it.
    expect(scene).toContain(hex(DOOR_COLORS.forge));
    expect(scene).toContain(hex(DOOR_COLORS.collection));
  });

  it('carries a collision layer with blockers in it', () => {
    expect(scene).toContain('L14_COLLIDERS');
    expect(scene).toContain(hex(COLLIDER_COLORS.block));
  });

  it('owns a ground tilemap, so world bounds come from the map', () => {
    // Without one, computeContentBounds() takes over and the world grows to
    // include the off-map parts shelf — walkable void, from one deleted layer.
    expect(scene).toContain('courtyardGround');
    expect(scene).toContain('"type": "EditableTilemap"');
    expect(scene).toContain('"type": "EditableTilemapLayer"');
  });
});

import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { COLLIDER_COLORS } from './sceneColliders';
import { ROAM_COLOR, WATER_COLOR, readSceneWildlife } from './sceneWildlife';

/**
 * The Editor's objects are read by shape, not by class, so plain objects with the
 * same fields stand in exactly. That keeps these tests free of a WebGL context
 * while still testing the real geometry and the real assignment rule.
 */
function roamBox(props: Partial<Phaser.GameObjects.Rectangle> = {}) {
  return {
    x: 0, y: 0, width: 100, height: 100,
    originX: 0, originY: 0, scaleX: 1, scaleY: 1, rotation: 0,
    fillColor: ROAM_COLOR,
    ...props,
  } as unknown as Phaser.GameObjects.Rectangle;
}

function animal(key: string, x: number, y: number) {
  return { x, y, texture: { key } } as unknown as Phaser.GameObjects.Sprite;
}

const sceneWith = (list: unknown[]) =>
  ({ l15_WILDLIFE: { list, getAll: () => list } }) as unknown as Phaser.Scene;

describe('readSceneWildlife', () => {
  it('reports missing when the scene has no wildlife layer', () => {
    const found = readSceneWildlife({} as Phaser.Scene);
    expect(found.missing).toBe(true);
    expect(found.animals).toHaveLength(0);
  });

  it('gives an animal the roaming area it is standing in', () => {
    const found = readSceneWildlife(
      sceneWith([roamBox(), animal('wildlife-fox-trot', 50, 50)]),
    );
    expect(found.missing).toBe(false);
    expect(found.animals).toHaveLength(1);
    expect(found.animals[0].species).toBe('red-fox');
    expect(found.animals[0].roamBounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('sends each animal to its own box when there are several', () => {
    const found = readSceneWildlife(
      sceneWith([
        roamBox({ x: 0, y: 0 }),
        roamBox({ x: 500, y: 500 }),
        animal('wildlife-fox-trot', 50, 50),
        animal('wildlife-tortoise-toddle', 550, 550),
      ]),
    );
    expect(found.animals.map((a) => a.species)).toEqual(['red-fox', 'glowcap-tortoise']);
    expect(found.animals[1].roamBounds.x).toBe(500);
  });

  it('finds boxes declared after the animals — the author picks the list order', () => {
    const found = readSceneWildlife(
      sceneWith([animal('wildlife-rabbit-hop', 50, 50), roamBox()]),
    );
    expect(found.animals).toHaveLength(1);
    expect(found.animals[0].species).toBe('forest-rabbit');
  });

  it('gives an animal dropped outside every box a home range where it stands', () => {
    const found = readSceneWildlife(
      sceneWith([roamBox(), animal('wildlife-fox-trot', 900, 900)]),
    );
    // It lives, rather than standing frozen — dropping one in is enough.
    expect(found.animals).toHaveLength(1);
    expect(found.animals[0].improvised).toBe(true);
    expect(found.improvised[0]).toContain('900,900');

    const home = found.animals[0].roamBounds;
    expect(home.x + home.width / 2).toBeCloseTo(900);
    expect(home.y + home.height / 2).toBeCloseTo(900);
  });

  it('sizes the improvised range from the species, not one number for everyone', () => {
    const [fox] = readSceneWildlife(sceneWith([animal('wildlife-fox-trot', 0, 0)])).animals;
    const [tortoise] = readSceneWildlife(
      sceneWith([animal('wildlife-tortoise-toddle', 0, 0)]),
    ).animals;
    // A tortoise potters in a patch; a fox needs room to trot.
    expect(tortoise.roamBounds.width).toBeLessThan(fox.roamBounds.width);
  });

  it('prefers a box it is standing in over improvising', () => {
    const found = readSceneWildlife(sceneWith([roamBox(), animal('wildlife-fox-trot', 50, 50)]));
    expect(found.animals[0].improvised).toBe(false);
    expect(found.improvised).toHaveLength(0);
  });

  it('ignores rectangles that are not roam-coloured, including collider shapes', () => {
    const found = readSceneWildlife(
      sceneWith([
        roamBox({ fillColor: COLLIDER_COLORS.block }),
        roamBox({ fillColor: COLLIDER_COLORS.zone }),
        animal('wildlife-fox-trot', 50, 50),
      ]),
    );
    expect(found.areas).toHaveLength(0);
    expect(found.animals[0].improvised).toBe(true);
  });

  it('keeps the box as territory only — a fox in the tortoise box is still a fox', () => {
    const found = readSceneWildlife(
      sceneWith([
        roamBox({ x: 500, y: 500 }),
        animal('wildlife-fox-trot', 550, 550),
        animal('wildlife-tortoise-toddle', 560, 560),
      ]),
    );
    // Same territory, different species: identity comes from the texture.
    expect(found.animals.map((a) => a.species)).toEqual(['red-fox', 'glowcap-tortoise']);
    expect(found.animals[0].roamBounds).toEqual(found.animals[1].roamBounds);
  });

  it('tolerates a colour nudged in the picker', () => {
    const found = readSceneWildlife(sceneWith([roamBox({ fillColor: 0x3af18a })]));
    expect(found.areas).toHaveLength(1);
  });

  it('ignores a sprite that is not one of the animals', () => {
    const found = readSceneWildlife(
      sceneWith([roamBox(), animal('hero-chibi', 50, 50)]),
    );
    expect(found.animals).toHaveLength(0);
    expect(found.improvised).toHaveLength(0);
  });

  it('reads origin, so a centre-origin box covers where it is drawn', () => {
    const found = readSceneWildlife(
      sceneWith([
        roamBox({ x: 500, y: 500, originX: 0.5, originY: 0.5 }),
        animal('wildlife-fox-trot', 460, 460),
      ]),
    );
    expect(found.animals).toHaveLength(1);
    expect(found.animals[0].roamBounds).toEqual({ x: 450, y: 450, width: 100, height: 100 });
  });

  it('reads scale', () => {
    const found = readSceneWildlife(
      sceneWith([roamBox({ scaleX: 3, scaleY: 3 }), animal('wildlife-fox-trot', 250, 250)]),
    );
    expect(found.animals).toHaveLength(1);
    expect(found.animals[0].roamBounds.width).toBe(300);
  });

  it('reduces a rotated box to the area that contains it', () => {
    // A roaming area is a region, not a wall — the lean carries no meaning.
    const found = readSceneWildlife(
      sceneWith([roamBox({ width: 200, height: 100, rotation: Math.PI / 2 })]),
    );
    expect(found.areas[0].width).toBeCloseTo(100);
    expect(found.areas[0].height).toBeCloseTo(200);
  });
});

/**
 * The registration trap.
 *
 * A walkable scene has to be named in FOUR places in two files: three sets in
 * courtyardRuntime.ts and the SCENE_BEHAVIORS table. CourtyardV3 was in three of
 * them. Nothing errored — an unregistered scene looks exactly like a scene that
 * legitimately has no behaviour — so the animals simply stood still.
 *
 * This asserts the invariant that was implied and never checked: if you can walk
 * around in it, its behaviour is looked up.
 */
describe('every explorable scene has a behaviour registered', () => {
  it('leaves no walkable scene silently inert', async () => {
    const { EXPLORABLE_SCENES } = await import('../castle/v2/courtyardRuntime');
    const { SCENE_BEHAVIORS } = await import('./sceneBehaviors');

    const missing = [...EXPLORABLE_SCENES].filter((name) => !SCENE_BEHAVIORS[name]);
    expect(missing).toEqual([]);
  });

  it('runs both courtyards on the same brain', async () => {
    const { SCENE_BEHAVIORS } = await import('./sceneBehaviors');
    expect(SCENE_BEHAVIORS.CourtyardV3).toBe(SCENE_BEHAVIORS.CourtyardV2);
  });
});

/**
 * Water discovery.
 *
 * Raheem, 2026-08-09: "anywhere we place a pond and animals, they should just
 * know to use this action." These are that sentence, written down as checks — a
 * pond is recognised by its ART, wherever in the scene tree it happens to sit,
 * with nothing authored alongside it.
 */
function pond(x: number, y: number, props: Record<string, unknown> = {}) {
  return {
    x, y, width: 300, height: 270,
    displayWidth: 300, displayHeight: 270,
    originX: 0.5, originY: 0.5, scaleX: 1, scaleY: 1,
    texture: { key: 'nature-water-pond-basin' },
    ...props,
  } as unknown as Phaser.GameObjects.Sprite;
}

const waterBox = (props: Partial<Phaser.GameObjects.Rectangle> = {}) =>
  roamBox({ fillColor: WATER_COLOR, ...props } as Partial<Phaser.GameObjects.Rectangle>);

describe('water discovery', () => {
  it('finds a pond sitting on the ground layer, with nothing authored', () => {
    const ground = { list: [pond(500, 400)] };
    const found = readSceneWildlife({
      l15_WILDLIFE: { list: [roamBox(), animal('wildlife-fox-trot', 50, 50)] },
      children: { list: [ground] },
    } as unknown as Phaser.Scene);
    expect(found.water).toHaveLength(1);
    expect(found.water[0].bounds).toEqual({ x: 350, y: 265, width: 300, height: 270 });
    // No pixel access in a stubbed texture manager, so the shape falls back to
    // the box rather than failing — inside is inside, outside is outside.
    expect(found.water[0].contains({ x: 500, y: 400 })).toBe(true);
    expect(found.water[0].contains({ x: 10, y: 10 })).toBe(false);
  });

  it('counts one pond once, however many ways the tree reaches it', () => {
    const theOnePond = pond(500, 400);
    const layer = { list: [roamBox(), theOnePond] };
    const found = readSceneWildlife({
      l15_WILDLIFE: layer,
      children: { list: [layer] },
    } as unknown as Phaser.Scene);
    expect(found.water).toHaveLength(1);
  });

  it('accepts a hand-drawn blue box for water that is not its own sprite', () => {
    const found = readSceneWildlife(
      sceneWith([roamBox(), waterBox({ x: 400, y: 400 }), animal('wildlife-fox-trot', 50, 50)]),
    );
    expect(found.water).toHaveLength(1);
    expect(found.areas).toHaveLength(1);
  });

  it('does not mistake a pond for an animal', () => {
    const found = readSceneWildlife(sceneWith([roamBox(), pond(50, 50)]));
    expect(found.animals).toHaveLength(0);
  });

  it('reports water even in a scene with no wildlife layer at all', () => {
    const found = readSceneWildlife({
      children: { list: [{ list: [pond(500, 400)] }] },
    } as unknown as Phaser.Scene);
    expect(found.missing).toBe(true);
    expect(found.water).toHaveLength(1);
  });

  it('finds no water in a scene that has none', () => {
    const found = readSceneWildlife(sceneWith([roamBox(), animal('wildlife-fox-trot', 50, 50)]));
    expect(found.water).toHaveLength(0);
  });
});

import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { buildDepthBand, groundContactY, DEPTH } from './sceneDepth';

/**
 * Stand-ins shaped like the Phaser objects the code actually touches. Same
 * approach as sceneColliders.test.ts, and for the same reason: importing Phaser
 * for real needs a canvas.
 */
function obj(bottom: number, label = '') {
  return {
    label,
    depth: 0,
    visible: true,
    texture: { key: '' },
    getBounds: () => ({ bottom }),
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
    setVisible(v: boolean) {
      this.visible = v;
      return this;
    },
  };
}

function layer(list: unknown[], visible = true) {
  return {
    list,
    depth: 0,
    visible,
    getAll: () => list,
    add(child: unknown) {
      list.push(child);
      return this;
    },
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
  };
}

function sceneWith(
  rootLayers: Record<string, ReturnType<typeof layer>>,
  extraRoots: unknown[] = [],
) {
  const created: ReturnType<typeof layer>[] = [];
  return {
    ...rootLayers,
    created,
    children: { list: [...Object.values(rootLayers), ...extraRoots] },
    add: {
      layer: () => {
        const l = layer([]);
        created.push(l);
        return l;
      },
    },
  } as unknown as Phaser.Scene & { created: ReturnType<typeof layer>[] };
}

describe('groundContactY', () => {
  it('is the bottom of the rendered bounds', () => {
    expect(groundContactY(obj(1216) as unknown as Phaser.GameObjects.GameObject)).toBe(1216);
  });

  it('is 0 for something with no bounds, rather than throwing', () => {
    expect(groundContactY({} as Phaser.GameObjects.GameObject)).toBe(0);
  });
});

describe('buildDepthBand', () => {
  it('moves layer children into one band and depths them by ground contact', () => {
    const wall = obj(1216, 'wall');
    const tree = obj(613, 'tree');
    const scene = sceneWith({ l3_CASTLE: layer([wall]), l12_FOREST: layer([tree]) });

    const band = buildDepthBand(scene);

    expect(band.sorted).toBe(2);
    expect(band.layer.list).toContain(wall);
    expect(band.layer.list).toContain(tree);
    expect(wall.depth).toBe(1216);
    expect(tree.depth).toBe(613);
  });

  it('leaves ground, markers and colliders out of the band', () => {
    const paving = obj(500, 'pebble-decal');
    const marker = obj(900, 'scale-hero');
    const shape = obj(1000, 'BLOCK_wall');
    const wall = obj(1216, 'wall');

    const ground = layer([paving]);
    const markers = layer([marker]);
    const colliders = layer([shape]);
    const scene = sceneWith({
      l1_GROUND: ground,
      l11_MARKERS: markers,
      l14_COLLIDERS: colliders,
      l3_CASTLE: layer([wall]),
    });

    const band = buildDepthBand(scene);

    expect(band.sorted).toBe(1);
    // A floor decal sorted into the band would draw over the hero's head.
    expect(band.layer.list).not.toContain(paving);
    expect(band.layer.list).not.toContain(marker);
    expect(band.layer.list).not.toContain(shape);

    expect(ground.depth).toBe(DEPTH.ground);
    expect(markers.depth).toBe(DEPTH.markers);
    expect(colliders.depth).toBe(DEPTH.colliders);
    expect(band.layer.depth).toBe(DEPTH.band);
  });

  /**
   * The Editor's eye icon, honoured. Raheem turned off both canopy layers in
   * CourtyardV3, saved, launched, and the trees were still there — the band had
   * moved them out of the layer whose `visible:false` was hiding them.
   */
  it('carries a hidden layer onto its children as they are moved out', () => {
    const tree = obj(613, 'nature_tree_broadleaf_large');
    const wall = obj(1216, 'wall');
    const scene = sceneWith({
      l12_FOREST_CANOPY: layer([tree], false),
      l3_CASTLE: layer([wall]),
    });

    buildDepthBand(scene);

    expect(tree.visible).toBe(false);
    // Still sorted — hidden is not the same as absent, and unhiding must not
    // require rebuilding the band.
    expect(tree.depth).toBe(613);
    // A visible layer's children are untouched.
    expect(wall.visible).toBe(true);
  });

  it('leaves an object hidden on its own hidden inside a visible layer', () => {
    const shelved = obj(400, 'FORGE_booth');
    shelved.visible = false;
    const scene = sceneWith({ l9_SHELF_offmap: layer([shelved]) });

    buildDepthBand(scene);

    expect(shelved.visible).toBe(false);
  });

  /**
   * Interlocking architecture. The NW corner tower contacts at 279 and the north
   * wall at 337, so y-sort alone draws the wall across the tower's doorway.
   */
  it('honours a Depth authored in the Editor as a substitute contact line', () => {
    const tower = obj(279, 'towerCornerNW');
    tower.depth = 1000; // set in the Editor
    const wall = obj(337, 'wallNorthRun');
    const scene = sceneWith({ l3_CASTLE: layer([tower, wall]) });

    buildDepthBand(scene);

    expect(wall.depth).toBe(337);
    expect(tower.depth).toBe(1000);
    expect(tower.depth).toBeGreaterThan(wall.depth);
  });

  /**
   * The corner tower at its junction, with the side wall already segmented.
   * Done in code, not the .scene — the Editor rewrites that file on save and
   * erased two hand-set depths on 2026-08-09.
   */
  it('sorts a corner tower over the walls that arrive at it', () => {
    const tower = obj(279, 'towerCornerNW');
    tower.texture = { key: 'tower-corner-v3' };
    const northWall = obj(337, 'wallNorthRun');
    const battle = obj(966, 'battleTower');
    const scene = sceneWith({ l3_CASTLE: layer([northWall, tower, battle]) });

    buildDepthBand(scene);

    expect(tower.depth).toBe(339);
    expect(tower.depth).toBeGreaterThan(northWall.depth);
    // ...but still behind the battle tower, which really does stand in front.
    expect(tower.depth).toBeLessThan(battle.depth);
  });

  /**
   * Segmentation, which is what removed the need for a large bias. The top
   * segment must end ABOVE the tower's base or it draws across its doorway.
   */
  it('passes a side-wall segment behind the tower it tucks under', () => {
    const tower = obj(279, 'towerCornerNW');
    tower.texture = { key: 'tower-corner-v3' };
    const seg1 = obj(278, 'wallWest_seg1'); // 228..278
    const seg2 = obj(332, 'wallWest_seg2'); // 278..332
    const seg6 = obj(546, 'wallWest_seg6'); // 492..546
    const scene = sceneWith({ l3_CASTLE: layer([seg1, seg2, seg6, tower]) });

    buildDepthBand(scene);

    expect(seg1.depth).toBeLessThan(tower.depth);
    // Everything from the second segment down is south of the tower and in front,
    // which is what makes the hero visible walking beside the wall.
    expect(seg2.depth).toBe(332);
    expect(seg6.depth).toBe(546);
  });

  it('leaves an unauthored object on its real contact line', () => {
    const tree = obj(613, 'tree');
    const scene = sceneWith({ l8_NATURE: layer([tree]) });
    buildDepthBand(scene);
    expect(tree.depth).toBe(613);
  });

  it('does not swallow its own band layer while walking the children', () => {
    const scene = sceneWith({ l3_CASTLE: layer([obj(100)]) });
    const band = buildDepthBand(scene);
    expect(band.layer.list).not.toContain(band.layer);
    expect(band.sorted).toBe(1);
  });
});

describe('the castle question — in front of the wall or behind it', () => {
  /** Real numbers: the south wall art bottoms out at 1216. */
  const SOUTH_WALL_BASE = 1216;

  const depthOfHeroAt = (feetY: number) => {
    const wall = obj(SOUTH_WALL_BASE, 'southWall');
    const scene = sceneWith({ l3_CASTLE: layer([wall]) });
    buildDepthBand(scene);
    return { hero: feetY, wall: wall.depth };
  };

  it('draws the hero BEHIND the wall when he is in the courtyard', () => {
    const { hero, wall } = depthOfHeroAt(900);
    expect(hero).toBeLessThan(wall);
  });

  it('draws the hero IN FRONT of the wall once he is outside the gate', () => {
    const { hero, wall } = depthOfHeroAt(1300);
    expect(hero).toBeGreaterThan(wall);
  });

  it('flips at the wall base and nowhere else', () => {
    expect(depthOfHeroAt(1215).hero).toBeLessThan(SOUTH_WALL_BASE);
    expect(depthOfHeroAt(1217).hero).toBeGreaterThan(SOUTH_WALL_BASE);
  });
});

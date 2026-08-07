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
    getBounds: () => ({ bottom }),
    setDepth(d: number) {
      this.depth = d;
      return this;
    },
  };
}

function layer(list: unknown[]) {
  return {
    list,
    depth: 0,
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

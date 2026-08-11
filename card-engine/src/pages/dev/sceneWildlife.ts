/**
 * Where the animals live — read out of whatever the Phaser Editor saved.
 *
 * A companion to `sceneColliders.ts`, and deliberately built the same way, because
 * it solves the same problem: the Editor gives a game object no runtime name (the
 * label in the Outline becomes a variable name in the generated file and nothing
 * else), so meaning has to be carried by something that survives compilation.
 * Collision carries it in FILL COLOUR. So does this.
 *
 *   green  #33ff88  ROAM — a rectangle the animals inside it wander within.
 *
 * Anything else in the layer is ignored, so a scratch shape does nothing until it
 * is given a meaning colour.
 *
 * HOW AN ANIMAL IS RECOGNISED, AND HOW IT FINDS ITS HOME
 *
 * Animals are the Sprites in the same layer, identified by TEXTURE KEY — the one
 * piece of authored identity that does reach runtime. Each is assigned the roam
 * rectangle it is standing inside when the scene starts.
 *
 * That is the whole authoring model: **draw a green box, drop animals in it, and
 * they live there.** Several boxes are supported, so the forest underbrush and the
 * castle front are simply two boxes rather than two code paths.
 *
 * An animal in no box is NOT an error. It is given a home range around wherever it
 * was dropped, sized from its own roaming speed, so the quickest way to try an idea
 * stays "drag one in and press play". Boxes are then what you reach for when you
 * want several animals to share a territory, or want to say where a territory ends
 * — not a registration step you owe the system before anything will move.
 *
 * THE BOX IS TERRITORY, NEVER PERSONALITY
 *
 * A fox dropped in the tortoise's box behaves like a fox — its speed, its flight
 * distance, whether it runs or watches, and which clips play all come from its
 * SPECIES, which comes from its texture. The box only ever answers "where". Those
 * two staying orthogonal is what lets a new animal be a new profile rather than a
 * new system.
 *
 * WHY THE BOXES WANT TO BE DRAWN GENEROUSLY, NOT TRACED
 *
 * A roam box may overlap walls freely. A destination chosen inside a wall is
 * simply never reached — the animal walks up to the face and stops, because the
 * courtyard's own `resolveWalk` is what actually decides every step. So the box
 * says "this is your part of the world", not "this is the walkable floor"; the
 * collision layer already knows the floor and there is no reason to say it twice.
 *
 * WHEN THIS MUST BE READ
 *
 * Before `buildDepthBand()`. The band reparents every layer's children into itself
 * so they can sort against each other, which empties this layer. Reading first is
 * what lets the animals be y-sorted like everything else AND still be found.
 */

import type Phaser from 'phaser';
import {
  WILDLIFE_SPECIES,
  type WildlifeBounds,
  type WildlifeSpeciesId,
  type WildlifePoint,
  type WildlifeWater,
} from '../castle/wildlife';

/** The Editor label `L15_WILDLIFE` compiles to this class field. */
export const WILDLIFE_LAYER_VAR = 'l15_WILDLIFE';

/** Chosen to sit well clear of the collider colours under `near()`'s tolerance. */
export const ROAM_COLOR = 0x33ff88;

/**
 * Optional. Water is normally found from the ART (see WATER_TEXTURES below), so
 * this is only needed for water that is not its own sprite — a stream painted
 * into a background plate, or a trough that is part of a larger prop.
 */
export const WATER_COLOR = 0x33ccff;

/**
 * Textures that ARE water. A sprite using one is a drinking source wherever it is
 * dropped, in any layer, with nothing else authored.
 *
 * Raheem, 2026-08-09: "anywhere we place a pond and animals, they should just
 * know to use this action." That sentence is the whole reason this list exists
 * rather than a box you have to remember to draw over every pond.
 */
export const WATER_TEXTURES: ReadonlySet<string> = new Set(['nature-water-pond-basin']);

/**
 * A sprite's texture is what says which animal it is. The move sheet is used as
 * the identity because it is the one the Editor shows when the sprite is placed.
 */
export const SPECIES_BY_TEXTURE: Readonly<Record<string, WildlifeSpeciesId>> = {
  'wildlife-fox-trot': 'red-fox',
  'wildlife-rabbit-hop': 'forest-rabbit',
  'wildlife-tortoise-toddle': 'glowcap-tortoise',
  'wildlife-fish-swim': 'pond-fish',
};

export interface PlacedAnimal {
  sprite: Phaser.GameObjects.Sprite;
  species: WildlifeSpeciesId;
  /** The green rectangle this animal was standing in, or its improvised range. */
  roamBounds: WildlifeBounds;
  /** True when no box contained it and a home range was made up around it. */
  improvised: boolean;
}

/**
 * The home range given to an animal that was dropped outside every box.
 *
 * Sized from the species' own roaming speed, so it is always a few seconds of
 * walking across — a fox gets room to trot and a tortoise gets a patch to potter
 * in, which is the difference between "living here" and "commuting". The range is
 * wider than it is tall because a top-down world foreshortens vertical movement,
 * so an equal-sided box reads as taller than it is.
 */
export function improvisedRange(
  species: WildlifeSpeciesId,
  at: { x: number; y: number },
): WildlifeBounds {
  const speed = WILDLIFE_SPECIES[species].roamSpeed;
  const width = speed * 8;
  const height = speed * 5.5;
  return { x: at.x - width / 2, y: at.y - height / 2, width, height };
}

export interface SceneWildlife {
  animals: PlacedAnimal[];
  areas: WildlifeBounds[];
  /** Every patch of drinkable water found in the scene, from art or from a box. */
  water: WildlifeWater[];
  /** The green rectangles, so the preview can hide them as one. */
  shapes: Phaser.GameObjects.Rectangle[];
  /**
   * Animals that were given an improvised home range, named so the log can point
   * at them. Informational, not a failure — see the note on boxes above.
   */
  improvised: string[];
  /** True when the scene has no `L15_WILDLIFE` layer at all. */
  missing: boolean;
}

/**
 * Axis-aligned world bounds of an Editor rectangle.
 *
 * Origin is read off the object rather than assumed, which is not fussiness: the
 * courtyard's own traced shapes mix `origin 0,0` with Phaser's `0.5,0.5` default,
 * and picking either one would put half the boxes somewhere else entirely.
 *
 * A rotated rectangle is reduced to the box that contains it. A roaming area is
 * a region, not a wall, so the lean carries no meaning worth preserving — unlike
 * collision, where it is the whole point.
 */
function boundsOf(r: Phaser.GameObjects.Rectangle): WildlifeBounds {
  const w = r.width * r.scaleX;
  const h = r.height * r.scaleY;
  const ox = -r.originX * w;
  const oy = -r.originY * h;

  const cos = Math.cos(r.rotation ?? 0);
  const sin = Math.sin(r.rotation ?? 0);
  const corners: [number, number][] = [
    [ox, oy],
    [ox + w, oy],
    [ox + w, oy + h],
    [ox, oy + h],
  ].map(([lx, ly]) => [r.x + lx * cos - ly * sin, r.y + lx * sin + ly * cos]);

  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

const contains = (b: WildlifeBounds, x: number, y: number) =>
  x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;

const isRectangle = (o: unknown): o is Phaser.GameObjects.Rectangle =>
  typeof o === 'object' && o !== null && 'fillColor' in o && 'originX' in o && !('texture' in o);

const isSprite = (o: unknown): o is Phaser.GameObjects.Sprite =>
  typeof o === 'object' && o !== null && 'texture' in o;

/**
 * Colours are matched with the same per-channel tolerance the collision layer
 * uses, for the same reason: the Editor's colour picker is a picker, and a shape
 * nudged while fiddling should still mean what it was drawn to mean.
 */
function nearColor(fill: number, want: number, tolerance = 24): boolean {
  const ch = (v: number, shift: number) => (v >> shift) & 0xff;
  return (
    Math.abs(ch(fill, 16) - ch(want, 16)) <= tolerance &&
    Math.abs(ch(fill, 8) - ch(want, 8)) <= tolerance &&
    Math.abs(ch(fill, 0) - ch(want, 0)) <= tolerance
  );
}

function isRoamColor(fill: number, tolerance = 24): boolean {
  return nearColor(fill, ROAM_COLOR, tolerance);
}

function isWaterColor(fill: number, tolerance = 24): boolean {
  return nearColor(fill, WATER_COLOR, tolerance);
}

/**
 * Axis-aligned world bounds of a placed sprite, from its own origin and scale.
 *
 * Deliberately not `getBounds()`: the tests build plain objects rather than real
 * Phaser sprites, and a reader that only works against a live engine cannot be
 * unit-tested — which is exactly how the roam boxes would have shipped with the
 * origin bug the comment on `boundsOf` describes.
 */
function spriteBounds(s: Phaser.GameObjects.Sprite): WildlifeBounds {
  const w = (s.displayWidth ?? s.width * (s.scaleX ?? 1)) || 0;
  const h = (s.displayHeight ?? s.height * (s.scaleY ?? 1)) || 0;
  return { x: s.x - (s.originX ?? 0.5) * w, y: s.y - (s.originY ?? 0.5) * h, width: w, height: h };
}

/**
 * Walk the whole scene for water, not just the wildlife layer.
 *
 * A pond is scenery — it lives on the ground layer with the paving and the trees,
 * because that is where it belongs and where the author will naturally put it.
 * Looking for it only in `L15_WILDLIFE` would mean the one thing that must work
 * without being authored is the one thing that needs authoring.
 */
/**
 * The water's real shape, sampled out of the texture the Editor placed.
 *
 * Measured on `castle-pond-basin`: the water is 72% of the sprite and its outline
 * is irregular. A rectangle is therefore useless for this — it either lets an
 * animal wade to the middle or halts it out on the grass. The artwork already
 * knows exactly where the water is, so it is asked.
 *
 * Sampled onto a coarse grid ONCE per pond rather than read per step: a texture
 * pixel read goes through a canvas and is far too slow to do every frame for
 * every animal. `STEP` of 4 puts the shoreline within a few pixels, which is well
 * inside the width of a fox's foot.
 */
const WATER_GRID_STEP = 4;

function waterShapeOf(
  scene: Phaser.Scene,
  sprite: Phaser.GameObjects.Sprite,
  bounds: WildlifeBounds,
): WildlifeWater {
  const key = sprite.texture?.key ?? '';
  const source = scene.textures?.get?.(key)?.getSourceImage?.() as { width?: number; height?: number } | undefined;
  const tw = source?.width ?? 0;
  const th = source?.height ?? 0;
  const getPixel = scene.textures?.getPixel?.bind(scene.textures);

  // No pixel access (a stubbed texture manager in tests, a texture that failed to
  // load) means falling back to the box. Worse, but never worse than crashing —
  // and SAID OUT LOUD, because a silent fallback turns "the shoreline is sloppy"
  // into an unanswerable question: box-shaped collision and mask-shaped collision
  // look the same from the outside until you notice the animal stopping in grass.
  if (!tw || !th || !getPixel) {
    console.warn(
      `[wildlife] "${key}" gave no pixels; its water is a plain rectangle, not its real outline.`,
    );
    return { bounds, contains: (p: WildlifePoint) => contains(bounds, p.x, p.y) };
  }

  const cols = Math.max(1, Math.ceil(tw / WATER_GRID_STEP));
  const rows = Math.max(1, Math.ceil(th / WATER_GRID_STEP));
  const grid = new Uint8Array(cols * rows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const pixel = getPixel(
        Math.min(tw - 1, col * WATER_GRID_STEP),
        Math.min(th - 1, row * WATER_GRID_STEP),
        key,
      ) as { red: number; green: number; blue: number; alpha: number } | null;
      if (!pixel || pixel.alpha < 128) continue;
      // Water is the blue-green part. The bank is warm brown, so this separates
      // them cleanly without a hand-authored mask; verified against the pond art,
      // where it selects the pool and none of the earth rim.
      if (pixel.blue > pixel.red + 20 && pixel.green > pixel.red + 10) grid[row * cols + col] = 1;
    }
  }

  const wet = grid.reduce((n, cell) => n + cell, 0);
  console.info(
    `[wildlife] "${key}" water outline: ${wet}/${grid.length} cells wet ` +
      `(${Math.round((100 * wet) / grid.length)}% of the sprite), ${WATER_GRID_STEP}px grid`,
  );

  return {
    bounds,
    contains(point: WildlifePoint) {
      if (!contains(bounds, point.x, point.y)) return false;
      const u = (point.x - bounds.x) / bounds.width;
      const v = (point.y - bounds.y) / bounds.height;
      const col = Math.min(cols - 1, Math.max(0, Math.round((u * tw) / WATER_GRID_STEP)));
      const row = Math.min(rows - 1, Math.max(0, Math.round((v * th) / WATER_GRID_STEP)));
      return grid[row * cols + col] === 1;
    },
  };
}

function collectWater(
  scene: Phaser.Scene,
  root: { list?: unknown[] } | undefined,
  into: WildlifeWater[],
  // The same pond is reachable down more than one path — a layer is both a child
  // of the scene and a named field on it — so identity is tracked rather than
  // trusting the walk to visit each object once. Without it a single pond counts
  // twice and the readout says there are two.
  seen: Set<unknown> = new Set(),
): void {
  if (!root || !Array.isArray(root.list)) return;
  for (const child of root.list) {
    if (seen.has(child)) continue;
    seen.add(child);
    if (isSprite(child) && WATER_TEXTURES.has(child.texture?.key ?? '')) {
      into.push(waterShapeOf(scene, child, spriteBounds(child)));
    }
    collectWater(scene, child as { list?: unknown[] }, into, seen);
  }
}

/**
 * Every patch of drinkable water in a scene, found from the artwork alone.
 *
 * Exported separately because the Wildlife Lab does not use `readSceneWildlife`
 * — it names its cast directly rather than reading a layer — and it still has to
 * find ponds. The lab shipping without water while the courtyard had it is
 * exactly the drift a second private copy of this would have caused.
 */
export function readSceneWater(scene: Phaser.Scene): WildlifeWater[] {
  const water: WildlifeWater[] = [];
  const seen = new Set<unknown>();
  collectWater(scene, (scene as unknown as { children?: { list?: unknown[] } }).children, water, seen);
  const layer = (scene as unknown as Record<string, Phaser.GameObjects.Layer | undefined>)[
    WILDLIFE_LAYER_VAR
  ];
  collectWater(scene, layer as unknown as { list?: unknown[] }, water, seen);
  return water;
}

export function readSceneWildlife(scene: Phaser.Scene): SceneWildlife {
  const layer = (scene as unknown as Record<string, Phaser.GameObjects.Layer | undefined>)[
    WILDLIFE_LAYER_VAR
  ];

  // Found before the layer check, so a scene with a pond and no wildlife layer
  // still reports its water rather than returning a blank.
  const water = readSceneWater(scene);

  const empty: SceneWildlife = {
    animals: [],
    areas: [],
    water,
    shapes: [],
    improvised: [],
    missing: true,
  };
  if (!layer || !Array.isArray(layer.list)) return empty;

  const areas: WildlifeBounds[] = [];
  const shapes: Phaser.GameObjects.Rectangle[] = [];
  const sprites: Phaser.GameObjects.Sprite[] = [];

  // Two passes: every box has to exist before any animal can be asked which one
  // it is standing in, and the Editor's list order is the author's, not ours.
  for (const child of layer.list) {
    if (isRectangle(child)) {
      if (isWaterColor(child.fillColor)) {
        shapes.push(child);
        // A drawn box has no art to sample, so the whole box is water.
        const box = boundsOf(child);
        water.push({ bounds: box, contains: (p: WildlifePoint) => contains(box, p.x, p.y) });
        continue;
      }
      if (!isRoamColor(child.fillColor)) continue;
      shapes.push(child);
      areas.push(boundsOf(child));
    } else if (isSprite(child)) {
      sprites.push(child);
    }
  }

  const animals: PlacedAnimal[] = [];
  const improvised: string[] = [];

  for (const sprite of sprites) {
    const species = SPECIES_BY_TEXTURE[sprite.texture?.key ?? ''];
    if (!species) continue;

    // A FISH'S TERRITORY IS THE POND IT WAS DROPPED IN.
    //
    // Green boxes are for land. Asking someone to draw one over the pond as well
    // would break the promise the pond already keeps — place it and it works — and
    // a box drawn generously (as they are meant to be) would send a fish at the
    // grass. The water's own bounds are exactly the right territory, and they come
    // from the artwork.
    if (WILDLIFE_SPECIES[species].habitat === 'water') {
      const pool =
        water.find((w) => contains(w.bounds, sprite.x, sprite.y)) ??
        water.find((w) => w.contains({ x: sprite.x, y: sprite.y }));
      if (pool) {
        animals.push({ sprite, species, roamBounds: pool.bounds, improvised: false });
        continue;
      }
      console.warn(
        `[wildlife] ${species} at ${Math.round(sprite.x)},${Math.round(sprite.y)} is not in any ` +
          'water; it will stay put. Drop it inside a pond.',
      );
    }

    // Tested at the feet, not the centre — a sprite is anchored on the ground it
    // stands on, and its middle can sit well outside a box its feet are inside.
    const home = areas.find((area) => contains(area, sprite.x, sprite.y));
    if (home) {
      animals.push({ sprite, species, roamBounds: home, improvised: false });
      continue;
    }

    improvised.push(`${sprite.texture.key} at ${Math.round(sprite.x)},${Math.round(sprite.y)}`);
    animals.push({
      sprite,
      species,
      roamBounds: improvisedRange(species, sprite),
      improvised: true,
    });
  }

  return { animals, areas, water, shapes, improvised, missing: false };
}

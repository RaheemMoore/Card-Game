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
import { WILDLIFE_SPECIES, type WildlifeBounds, type WildlifeSpeciesId } from '../castle/wildlife';

/** The Editor label `L15_WILDLIFE` compiles to this class field. */
export const WILDLIFE_LAYER_VAR = 'l15_WILDLIFE';

/** Chosen to sit well clear of the collider colours under `near()`'s tolerance. */
export const ROAM_COLOR = 0x33ff88;

/**
 * A sprite's texture is what says which animal it is. The move sheet is used as
 * the identity because it is the one the Editor shows when the sprite is placed.
 */
export const SPECIES_BY_TEXTURE: Readonly<Record<string, WildlifeSpeciesId>> = {
  'wildlife-fox-trot': 'red-fox',
  'wildlife-rabbit-hop': 'forest-rabbit',
  'wildlife-tortoise-toddle': 'glowcap-tortoise',
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
function isRoamColor(fill: number, tolerance = 24): boolean {
  const ch = (v: number, shift: number) => (v >> shift) & 0xff;
  return (
    Math.abs(ch(fill, 16) - ch(ROAM_COLOR, 16)) <= tolerance &&
    Math.abs(ch(fill, 8) - ch(ROAM_COLOR, 8)) <= tolerance &&
    Math.abs(ch(fill, 0) - ch(ROAM_COLOR, 0)) <= tolerance
  );
}

export function readSceneWildlife(scene: Phaser.Scene): SceneWildlife {
  const layer = (scene as unknown as Record<string, Phaser.GameObjects.Layer | undefined>)[
    WILDLIFE_LAYER_VAR
  ];

  const empty: SceneWildlife = {
    animals: [],
    areas: [],
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

  return { animals, areas, shapes, improvised, missing: false };
}

/**
 * Y-sorting — who draws in front of whom.
 *
 * Raheem, 2026-08-07, standing in his own courtyard: "when I'm in the castle,
 * I'm like standing on top of the castle. Will the game change the character's
 * layer as they move, or will we make the inside of the castle another scene?"
 *
 * Neither. Both of those are special cases, and special cases have to be written
 * again for every wall, every tower, every tree. There is one rule instead:
 *
 *   **An object's depth is the Y where it touches the ground.**
 *
 * The hero's feet are at 900 inside the courtyard and the south wall's base is at
 * 1216, so he is behind it. Walk out the gate to 1300 and he is in front of it.
 * Nothing was written about the castle to make that happen — and the same rule
 * puts him behind a tower, in front of a shrub, and behind a tree he walks above,
 * including objects placed months from now that no code has ever heard of.
 *
 * WHY THE OBJECTS GET REPARENTED
 *
 * Phaser sorts by depth WITHIN a parent. Editor layers are parents, so a wall in
 * `L3_CASTLE` and a hero in the scene root can never sort against each other no
 * matter what depths they carry. So everything that stands on the floor is moved
 * into one runtime layer and sorted there. The Editor's layers keep doing what
 * they are good at — grouping work for a human — and stop deciding draw order,
 * which they were never able to do correctly anyway.
 *
 * WHAT STAYS OUT
 *
 *   L1_GROUND    paving and its decals. Floor is always under everything; a
 *                pebble decal sorted into the band would draw over the hero's
 *                head whenever he stood north of it.
 *   L11_MARKERS  scale references and MISSING-wall notes. Authoring aids.
 *   L14_COLLIDERS the collision layer, which has its own visibility rules.
 *
 * KNOWN LIMIT — north/south walls
 *
 * One sprite gets one depth. That is exact for a horizontal wall, whose base is a
 * single line. A wall running north-south has a base that spans hundreds of
 * pixels of Y, and the hero can stand level with its middle, where there is no
 * right answer. Those walls have to be cut into stacked segments in the Editor,
 * each with its own base. Until then the side walls will be wrong in the middle.
 */

import type Phaser from 'phaser';

/** Editor layers, by the class field their CLASS scope emits, that never y-sort. */
const EXCLUDED_LAYER_VARS = ['l1_GROUND', 'l11_MARKERS', 'l14_COLLIDERS'] as const;

export const DEPTH = {
  /** Floor. Always beneath the band. */
  ground: 0,
  /** The y-sorted band itself. Children carry ground-contact Y as their depth. */
  band: 10,
  /** Authoring aids, above the art so they can be seen when shown at all. */
  markers: 90000,
  /** Collision shapes, above everything, when `?colliders=show` asks for them. */
  colliders: 99000,
} as const;

export interface DepthBand {
  layer: Phaser.GameObjects.Layer;
  /** How many objects were moved in. Zero means the scene had nothing to sort. */
  sorted: number;
}

/**
 * The Y at which an object meets the floor.
 *
 * Read off the rendered bounds rather than computed from origin and height,
 * because bounds already account for scale, flip and rotation — all three of
 * which are in use in this scene, and any one of which would silently break a
 * hand-rolled formula.
 *
 * Transparent padding at the bottom of a sprite pushes this too low. That is a
 * packing problem, fixed in the art, not compensated for here — a fudge factor
 * would hide the bad sheet and then be wrong for the good ones.
 */
export function groundContactY(obj: Phaser.GameObjects.GameObject): number {
  const withBounds = obj as Phaser.GameObjects.Image;
  if (typeof withBounds.getBounds !== 'function') return 0;
  return withBounds.getBounds().bottom;
}

/**
 * Collapse the Editor's layers into one sorted band.
 *
 * Safe to call once, after the compiled `editorCreate()` has run and before the
 * hero is spawned. Returns the band so the hero can be added to it — he has to
 * sort against the walls, which means being their sibling.
 */
export function buildDepthBand(scene: Phaser.Scene): DepthBand {
  const fields = scene as unknown as Record<string, Phaser.GameObjects.Layer | undefined>;
  // Phaser types `Layer` as a display-list member without extending GameObject, so
  // the set is widened to `unknown` rather than fought with per-line casts.
  const excluded = new Set<unknown>();

  for (const name of EXCLUDED_LAYER_VARS) {
    const layer = fields[name];
    if (layer) excluded.add(layer);
  }

  fields.l1_GROUND?.setDepth(DEPTH.ground);
  fields.l11_MARKERS?.setDepth(DEPTH.markers);
  fields.l14_COLLIDERS?.setDepth(DEPTH.colliders);

  const band = scene.add.layer().setDepth(DEPTH.band);

  // Snapshot first: moving a child mutates the list being walked.
  const roots = [...scene.children.list];
  let sorted = 0;

  for (const root of roots) {
    if ((root as unknown) === (band as unknown) || excluded.has(root)) continue;

    const asLayer = root as unknown as Phaser.GameObjects.Layer;
    const movable: Phaser.GameObjects.GameObject[] =
      typeof asLayer.getAll === 'function' ? [...asLayer.list] : [root];

    for (const child of movable) {
      if (excluded.has(child)) continue;
      band.add(child);
      (child as Phaser.GameObjects.Image).setDepth?.(groundContactY(child));
      sorted += 1;
    }
  }

  return { layer: band, sorted };
}

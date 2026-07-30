import colliderData from '../../../../public/assets/castle/occluders/colliders.json';

/**
 * Solid scenery — painted objects that block movement but are not destinations.
 *
 * TRACED BY HAND, NOT GUESSED. Every box here is generated from Raheem's Figma
 * trace of the plate (scripts/sprite-lab/figma-traces/courtyard.json), via
 * scripts/sprite-lab/lib/import_traces.py. An earlier hand-authored version of
 * this file was wrong twice — lamp colliders traced from static crops landed
 * 25px below their posts, and two of four lamps were skipped entirely on a
 * mistaken "unreachable" argument that a screenshot promptly disproved.
 *
 * WHY MANY BOXES PER OBJECT. Arcade physics bodies are axis-aligned rectangles.
 * A single box around an L-shaped bush claims the empty corner of the L — and
 * that bug shipped, walling off open paving. So the traced shape is rasterised
 * and decomposed into a set of boxes that follow it. The author draws whatever
 * fits the object, including rotated and curved shapes, and the constraint stays
 * in the pipeline instead of in their head.
 *
 * WHY THIS IS SEPARATE FROM `STALLS`: that array drives three consumers at once
 * — colliders, focusable DOM buttons, and the Directory list. A lamp post needs
 * the first and must never appear in the other two.
 *
 * COLLIDERS SIT ON THE GROUND FOOTPRINT, never on the whole painted shape. In a
 * top-down world you walk on the floor: what stops you is where an object meets
 * the paving, not the part of it that leans overhead. The lamps make this vivid —
 * their crystals sit ~110px UP-SCREEN of the feet of their own posts. The post
 * covering you as you pass behind it is the OCCLUDER's job (see
 * data/castle/occluders.ts), not the collider's. Enlarging a collider to cover an
 * object's painted height walls off floor the player can see is empty.
 *
 * Re-trace in Figma and re-run the importer if the plate is ever regenerated.
 */

export interface SceneryRect {
  /** Identity for debugging only — never shown to the player. */
  id: string;
  /** Centre point, in plate coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Flattened to one entry per box. Ids carry the object name plus an index so a
 * stray collider in the debug overlay can be traced back to its object.
 */
export const SCENERY: SceneryRect[] = colliderData.colliders.flatMap((obj) =>
  obj.boxes.map((b, i) => ({
    id: `${obj.id}-${i}`,
    // The importer emits top-left boxes; Phaser rectangles are centre-anchored.
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    width: b.width,
    height: b.height,
  })),
);

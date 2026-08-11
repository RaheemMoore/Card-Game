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
 * ONE SPRITE GETS ONE DEPTH
 *
 * Exact for a horizontal wall, whose base is a single line. Meaningless for a
 * wall running north-south, whose base spans hundreds of pixels of Y — an actor
 * can stand level with its middle, where there is no right answer. The castle's
 * two side walls were cut into six stacked TileSprite segments each on
 * 2026-08-07 for exactly this reason. Any new north-south wall needs the same.
 *
 * ELEVATION
 *
 * Depth also carries a level, `level * LEVEL_STRIDE + contactY`. Without it, a
 * hero on top of a cliff and a hero at its foot have nearly the same Y and no
 * amount of Y-sorting can tell them apart. See `elevation.ts`.
 */

import type Phaser from 'phaser';
import { EMPTY_ELEVATION, levelAt, type ElevationMap } from '../castle/v2-preview/elevation';

/** Editor layers, by the class field their CLASS scope emits, that never y-sort. */
const EXCLUDED_LAYER_VARS = [
  'l1_GROUND',
  'l11_MARKERS',
  'l14_COLLIDERS',
  // Elevation plates are authoring shapes, not scenery. Sorted into the band they
  // would draw over the world they describe.
  'l20_GROUND_L0',
  'l21_GROUND_L1',
  'l22_GROUND_L2',
  'l23_RAMPS',
] as const;

/**
 * Depth added per elevation level.
 *
 * Bigger than any possible ground-contact Y, so a hero standing on a terrace
 * always sorts above everything on the level below regardless of where he is in
 * Y. That is the half of the cliff problem plain `bounds.bottom` could never
 * express: at the base of a cliff you are behind it, on top of it you are in
 * front, and those are the same Y.
 */
export const LEVEL_STRIDE = 100_000;

export const DEPTH = {
  /** Floor. Always beneath the band. */
  ground: 0,
  /** The y-sorted band itself. Children carry ground-contact Y as their depth. */
  band: 10,
  /**
   * Authoring aids and collision shapes, above EVERY level.
   *
   * These must stay above `LEVEL_STRIDE * maxLevel`. They were 90000/99000 while
   * the world was flat; leaving them there once the stride existed would have hidden
   * the collider overlay under any terrain on level 1 or above, and the symptom —
   * "the collider reader broke" — looks nothing like the cause.
   */
  markers: 900_000,
  colliders: 990_000,
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
 * THE ESCAPE HATCH — setting `Depth` on an object in the Editor.
 *
 * Y-sorting cannot resolve INTERLOCKING architecture, and pretending otherwise
 * was wrong. A corner tower and the wall that meets it have no correct order
 * derivable from their base Y: CourtyardV3's `towerCornerNW` contacts the ground
 * at 279 and `wallNorthRun` at 337, so the wall drew across the tower's doorway.
 * Raheem, 2026-08-09, comparing his Editor to the running game: "the towers and
 * things are out of order."
 *
 * So a non-zero `Depth` in the Editor's Game Object section means:
 *
 *   **"sort me as if I stood at this Y."**
 *
 * Not a raw depth — a substitute ground-contact line. It still gets the elevation
 * stride added, so an override interacts with terraces and with the hero exactly
 * the way a real base line would, and a tower pinned at 1000 is still correctly
 * behind someone standing at 1100. Leave it at 0 and nothing changes.
 *
 * Use it ONLY where geometry genuinely interlocks — towers into walls, an arch
 * over a road. Reaching for it because a shrub looks wrong is how a scene ends up
 * hand-ordered again, which is the thing the band exists to stop.
 */

/**
 * Pieces that sort lower than they stand, by texture key.
 *
 * A corner tower is the one shape y-sorting genuinely cannot place. Everything
 * else in the courtyard has a footprint you can reason about: a shrub is a point,
 * a wall run is a line. A tower is a JUNCTION — walls arrive at it from two
 * directions and all of them have to pass behind, but the tower's own base is
 * north of theirs, so contact-Y puts it behind every one of them.
 *
 * Two thirds of that problem was never the tower's fault and is now gone.
 * `castle-wall-side-v3` was ONE 318px-tall sprite spanning y 228..546 with a
 * single depth taken from its southern tip, so its whole length — including the
 * end tucked under the tower — drew in front of everything north of 546. That is
 * the failure this file's header describes, and on 2026-08-09 both side walls
 * were cut into six stacked TileSprite segments the way V2's already were. A wall
 * segment ending at 278 now correctly passes behind the tower's base at 279.
 *
 * What remains is only `wallNorthRun`, whose base at 337 is a TRUE horizontal
 * line 58px south of the tower's 279 — nothing to segment, no packing to fix, the
 * geometry simply says "wall in front" where the art needs "tower in front". So
 * the tower sorts as if it stood 60px further south: past 337, nowhere near the
 * battle tower at 965 that really does stand in front of it.
 *
 * Keyed on TEXTURE rather than on an object, deliberately. Raheem set depths by
 * hand in the .scene and his next Editor save erased them — the Editor rewrites
 * that file wholesale, so anything that must survive a save lives here. Keying on
 * texture also means the next corner tower is right the moment it is placed.
 */
export const CONTACT_BIAS_BY_TEXTURE: Record<
  string,
  number | ((obj: Phaser.GameObjects.Image) => number)
> = {
  'tower-corner-v3': 60,

  /**
   * AN OCCLUDER LIP SORTS ON ITS BASE, NOT ON ITS CANVAS.
   *
   * `split_occluder_lip.py` copies the pond's raised north rim onto a duplicate of
   * the FULL basin canvas — same size, same transform, so the two always line up
   * and a cut edge can never show. The cost is that its bounds say the sprite ends
   * at the pond's south shore, 375px of empty pixels below anything it draws.
   * Sorted on that, the lip covers the whole pond and every animal near it.
   *
   * The lip's real base is 13 rows down a 221-row canvas — the NORTHERNMOST point
   * of the waterline, deliberately, because the base is not a straight line. It
   * runs 92px further south on the east flank than the west, and one depth cannot
   * describe a curve. Taking the southernmost reading instead put the line behind
   * a fox on the west bank standing a full body-length in FRONT of the rim
   * (Raheem, 2026-08-11). The northernmost errs the harmless way: the lip occludes
   * only what is clearly north of the pond, and an animal on the far east rim
   * draws over a few pixels of lip it might have hidden behind.
   *
   * A function rather than a constant because the bias is in WORLD pixels and the
   * pond is placed at 1.2 in the Wildlife Lab and 1.8 in CourtyardV3. A number
   * would be correct in exactly one scene.
   *
   * This lives here rather than as an authored Depth in the Editor for the reason
   * given below: the Editor rewrites the .scene wholesale and erases hand-set
   * depths on the next save.
   */
  'nature-water-pond-cliff-north': (img) => -(221 - 13) * (img.scaleY || 1),
};

/**
 * Depth for a static object, including its elevation.
 *
 * The cliff-face rule: a face image belongs to the LOWER level and sorts on its
 * bottom edge, because it is a wall seen from the terrace below — everything on
 * that terrace must draw over it. `levelAt(bounds.bottom)` gives that for free.
 * The -1 bias resolves the equal-Y tie for an actor standing at the foot of it.
 */
export function depthOf(
  obj: Phaser.GameObjects.GameObject,
  map: ElevationMap = EMPTY_ELEVATION,
  contactOverride?: number,
): number {
  const key = (obj as Phaser.GameObjects.Image).texture?.key ?? '';
  // A Depth set in the Editor is an explicit instruction and beats the table —
  // which also means the table stops applying the moment the art is fixed
  // properly and someone authors a real value.
  const rule = CONTACT_BIAS_BY_TEXTURE[key];
  const bias =
    typeof rule === 'function' ? rule(obj as Phaser.GameObjects.Image) : (rule ?? 0);
  const contact = contactOverride ?? groundContactY(obj) + bias;
  const bounds = (obj as Phaser.GameObjects.Image).getBounds?.();
  const centreX = bounds ? bounds.centerX : 0;
  const level = levelAt(centreX, contact, map) ?? 0;

  const isTerrainFace = key.startsWith('terrain-wall-');

  return level * LEVEL_STRIDE + contact + (isTerrainFace ? -1 : 0);
}

/**
 * Collapse the Editor's layers into one sorted band.
 *
 * Safe to call once, after the compiled `editorCreate()` has run and before the
 * hero is spawned. Returns the band so the hero can be added to it — he has to
 * sort against the walls, which means being their sibling.
 *
 * `map` is optional and defaults to flat, so a scene with no elevation layers
 * sorts exactly as it did before levels existed.
 */
export function buildDepthBand(
  scene: Phaser.Scene,
  map: ElevationMap = EMPTY_ELEVATION,
): DepthBand {
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
  for (const name of ['l20_GROUND_L0', 'l21_GROUND_L1', 'l22_GROUND_L2', 'l23_RAMPS']) {
    fields[name]?.setDepth(DEPTH.markers);
  }

  const band = scene.add.layer().setDepth(DEPTH.band);

  // Snapshot first: moving a child mutates the list being walked.
  const roots = [...scene.children.list];
  let sorted = 0;

  for (const root of roots) {
    if ((root as unknown) === (band as unknown) || excluded.has(root)) continue;

    const asLayer = root as unknown as Phaser.GameObjects.Layer;
    const isLayer = typeof asLayer.getAll === 'function';
    const movable: Phaser.GameObjects.GameObject[] = isLayer ? [...asLayer.list] : [root];

    // A hidden layer hides its children by PARENTAGE, not by a flag on each child.
    // Move them out and the hiding evaporates — the eye is left switched off on a
    // layer that no longer contains anything. Raheem, 2026-08-09, having turned off
    // both canopy layers in the Editor and watched the trees turn up anyway: "I made
    // them invisible in the editor, so I thought when I launch it, they should also
    // be invisible."
    //
    // So the layer's visibility is folded into each child on the way past. Note this
    // is one-way and one-time: the Editor's eye is an authoring decision baked in at
    // load, and re-showing the layer afterwards will not bring them back. That is
    // the right trade — the alternative is not collapsing the layers at all, and
    // then a wall and the hero can never sort against each other.
    const hidden = isLayer && asLayer.visible === false;

    for (const child of movable) {
      if (excluded.has(child)) continue;
      band.add(child);
      const image = child as Phaser.GameObjects.Image;
      if (hidden) image.setVisible?.(false);
      // Read BEFORE the write below overwrites it.
      const authored = typeof image.depth === 'number' && image.depth !== 0 ? image.depth : undefined;
      image.setDepth?.(depthOf(child, map, authored));
      sorted += 1;
    }
  }

  return { layer: band, sorted };
}

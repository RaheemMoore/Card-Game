import manifest from '../../../public/assets/castle/occluders/occluders.json';

/**
 * Painted scenery that can draw IN FRONT of a character.
 *
 * THE PROBLEM. The courtyard plate is one image at depth 0, and every character
 * sits at `setDepth(y)` in the 300–1040 band. So the hero is painted over the
 * entire world, always — he walks "through" lamp posts, tables and bushes.
 * Raheem, with screenshots of the hero apparently standing on a crystal lamp:
 * "if you walk behind things it should show."
 *
 * THE FIX. Each object is cut out of the plate as its own transparent PNG and
 * drawn at the depth of ITS OWN GROUND LINE. Characters already sort by their
 * ground line, so the comparison is automatic: stand above an object's base and
 * it covers you, stand below and you cover it. Ordinary top-down occlusion.
 *
 * WHY THE ART CANNOT DRIFT. These are cut FROM the plate, not drawn to match it,
 * so they line up by construction. Draw each at its `(x, y)` with origin (0, 0)
 * and NO `setDisplaySize` — the plate is natively 1536×1152 and rendered 1:1,
 * with zoom applied at the camera, so every world object scales together.
 *
 * `groundY` IS NOT THE BOTTOM OF THE IMAGE. It is where the object meets the
 * paving. For the lamps that is the foot of the post, roughly 110px BELOW the
 * crystal, because the posts lean down-screen. Getting this wrong is the one way
 * to make occlusion look broken rather than absent — the character would pop in
 * front at the wrong moment.
 *
 * Regenerate with:
 *   python3 scripts/sprite-lab/lib/slice_occluders.py \
 *     public/assets/castle/courtyard.png public/assets/castle/occluders
 *
 * Every shape in that script is traced by hand, so re-run AND re-trace if the
 * plate is ever regenerated.
 */

export interface Occluder {
  id: string;
  /** Top-left corner in plate coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the object meets the paving. This is the depth it draws at. */
  groundY: number;
}

export const OCCLUDERS: Occluder[] = manifest.occluders;

/** Texture key for an occluder, kept in one place so preload and create agree. */
export const occluderKey = (id: string) => `occluder-${id}`;

/** Path the cutter writes to, mirrored here for the loader. */
export const occluderPath = (id: string) => `/assets/castle/occluders/${id}.png`;

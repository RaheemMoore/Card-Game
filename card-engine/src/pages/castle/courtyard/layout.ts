/**
 * Courtyard spatial contract — shared by the Phaser scene and the DOM overlay
 * so the two can never disagree about where a stall is on screen.
 *
 * The courtyard is ONE FIXED SCREEN. The painted plate is a 4:3 canvas, and it
 * is rendered SCALE-TO-FIT: the whole plate is always visible, whatever the
 * window shape, with the surrounding space filled by a blurred copy of the same
 * art (see CourtyardViewport).
 *
 * WHY NOT SCALE-TO-COVER, which this used to do. Cover fills the viewport and
 * crops the overflow, which sounds strictly better — no bars. But a 4:3 plate on
 * a wide laptop crops the axis you cannot spare: at aspect 1.91 it showed the
 * full 1536 width and only 804 of 1152 height, losing 30% of the world. Raheem,
 * playing it: "Bit too zoomed in on my laptop. I cant see the edges." The
 * castle entrance was clipped, and the lower lamps, south bushes and crates were
 * off screen entirely.
 *
 * It also quietly broke this file's own promise. There used to be a SAFE_BOX of
 * 1420x840 documented as "guaranteed visible on every supported device", with a
 * worked example that reasoned about 16:9 and stopped there. Anything wider than
 * about 1.83 showed less than 840px of height, so the guarantee failed and a
 * stall could sit off screen. Under fit-scale that whole concept is unnecessary:
 * everything is always visible, so there is nothing to guarantee and no second
 * box to keep in step. SAFE_BOX had no consumers and is gone.
 *
 * TARGET DEVICES: PC and tablet, both landscape. Phone portrait is explicitly
 * deferred — it needs its own crop of the art, not a compromise canvas.
 */

export const CANVAS_W = 1536;
export const CANVAS_H = 1152;

/**
 * The paved courtyard the hero may cross, traced onto the painted plate
 * (public/assets/castle/courtyard.png) rather than derived from the canvas.
 * The paving is not vertically centred — the top wall and the Battle Tower
 * steps eat into the upper third — so this is an explicit rect, not a
 * centered() box. Re-trace it if the plate is ever regenerated.
 */
export const WALKABLE_RECT = { x: 200, y: 300, width: 1140, height: 740 } as const;

export const WALKABLE = WALKABLE_RECT;

export const CANVAS_CENTER = { x: CANVAS_W / 2, y: CANVAS_H / 2 } as const;

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Fit scale: the SMALLER of the two axis ratios, so the entire plate fits and
 * the leftover space becomes margin rather than the plate being cropped.
 */
export function fitScale({ width, height }: Viewport): number {
  return Math.min(width / CANVAS_W, height / CANVAS_H);
}

/**
 * World point → screen pixels, using the same fit math the camera uses.
 *
 * The DOM stall buttons are positioned with this, which is why it lives beside
 * the camera's scale rather than inside the scene: if these two ever disagree,
 * the focusable buttons drift off the stalls they represent and keyboard
 * traversal starts landing on empty paving.
 */
export function worldToScreen(
  world: { x: number; y: number },
  viewport: Viewport,
): { x: number; y: number } {
  const scale = fitScale(viewport);
  return {
    x: (world.x - CANVAS_CENTER.x) * scale + viewport.width / 2,
    y: (world.y - CANVAS_CENTER.y) * scale + viewport.height / 2,
  };
}

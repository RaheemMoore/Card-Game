/**
 * Courtyard spatial contract — shared by the Phaser scene and the DOM overlay
 * so the two can never disagree about where a stall is on screen.
 *
 * The courtyard is ONE FIXED SCREEN. The painted plate is a square canvas;
 * desktop and phone each see a different crop of it, rendered scale-to-cover
 * so neither ever letterboxes.
 *
 * Two nested regions, and the distinction matters:
 *
 *   SAFE_BOX  — guaranteed visible on every supported device. Stalls, the
 *               hero spawn, and anything interactive must live here.
 *   WALKABLE  — larger. Desktop and tablet see well beyond the safe box, so
 *               confining movement to it would make the courtyard feel like a
 *               postage stamp on a wide screen. You may walk into scenery you
 *               can see; you just can't be required to.
 *
 * TARGET DEVICES: PC and tablet, both landscape. Phone portrait is explicitly
 * deferred — an earlier revision sized everything around iPhone portrait and
 * the result was a tiny safe box that wasted most of a monitor. If phone
 * support returns, it needs its own crop, not a compromise canvas.
 *
 * Sizing rule: under cover-scale a viewport of aspect `a` sees
 * `CANVAS_H * a` of world width and `CANVAS_W / a` of world height. The
 * bounds that matter now are 4:3 tablet (a ≈ 1.33) and 16:9 desktop
 * (a ≈ 1.78), against a 4:3 canvas:
 *
 *   4:3  → the whole canvas is visible.
 *   16:9 → full width, and 1536 / 1.78 ≈ 863 of height.
 *
 * So SAFE_H must stay under ~863. 840 leaves a little slack for 16:10 and
 * odd window shapes without letterboxing.
 */

export const CANVAS_W = 1536;
export const CANVAS_H = 1152;

/** Guaranteed-visible box. Interactive content only inside this. */
export const SAFE_W = 1420;
export const SAFE_H = 840;

/**
 * The paved courtyard the hero may cross, traced onto the painted plate
 * (public/assets/castle/courtyard.png) rather than derived from the canvas.
 * The paving is not vertically centred — the top wall and the Battle Tower
 * steps eat into the upper third — so this is an explicit rect, not a
 * centered() box. Re-trace it if the plate is ever regenerated.
 */
export const WALKABLE_RECT = { x: 200, y: 300, width: 1140, height: 740 } as const;

function centered(width: number, height: number) {
  return {
    x: (CANVAS_W - width) / 2,
    y: (CANVAS_H - height) / 2,
    width,
    height,
  } as const;
}

export const SAFE_BOX = centered(SAFE_W, SAFE_H);
export const WALKABLE = WALKABLE_RECT;

export const CANVAS_CENTER = { x: CANVAS_W / 2, y: CANVAS_H / 2 } as const;

export interface Viewport {
  width: number;
  height: number;
}

/**
 * Cover scale: the larger of the two axis ratios, so the plate always fills
 * the viewport and the overflow is cropped rather than letterboxed.
 */
export function coverScale({ width, height }: Viewport): number {
  return Math.max(width / CANVAS_W, height / CANVAS_H);
}

/**
 * World point → screen pixels, using the same cover math the camera uses.
 * The DOM stall buttons are positioned with this, which is why it lives here
 * rather than inside the scene.
 */
export function worldToScreen(
  world: { x: number; y: number },
  viewport: Viewport,
): { x: number; y: number } {
  const scale = coverScale(viewport);
  return {
    x: (world.x - CANVAS_CENTER.x) * scale + viewport.width / 2,
    y: (world.y - CANVAS_CENTER.y) * scale + viewport.height / 2,
  };
}

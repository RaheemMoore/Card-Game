/**
 * Where a cloud sits on screen, as a percentage of the viewport width.
 *
 * A cloud is not a tiling plane. The mountains and the tree line are strips whose
 * TEXTURE slides, so they are continuous by construction and there is nothing to
 * wrap; a cloud is a single cutout that crosses the frame, leaves, and has to come
 * back. That "comes back" is the only genuinely fiddly arithmetic in the whole
 * background, so it lives here as a pure function with a test rather than inside a
 * Phaser update loop where a sign error looks like weather.
 *
 * TWO THINGS PUSH IT and they are unrelated: the camera (scaled by the cloud's
 * parallax, and zero the instant the player stops walking) and the wind (which
 * never stops). They are summed into one travelled distance before wrapping,
 * because the cloud does not care which of them moved it.
 *
 * All percentages, deliberately. The composition was approved in a browser harness
 * that laid the clouds out in `vw`, and keeping the same unit means the numbers in
 * `CLOUD_ACTORS` are the numbers Raheem signed off on rather than a translation of
 * them.
 */

/**
 * How far off the left edge a cloud runs before it is considered gone, in percent
 * of the viewport width.
 *
 * MUST EXCEED THE WIDEST CLOUD or the widest one is still partly on screen when it
 * teleports, which reads as a cloud blinking out. The widest actor is the sweep at
 * 28%, so 30 is correct and has almost no headroom — `CLOUD_ACTORS` is checked
 * against it in the test rather than left as a hope.
 */
export const CLOUD_OFFSCREEN_LEAD_PCT = 30;

/**
 * @param startPct   the cloud's phase — where it sits at zero travel
 * @param travelPct  camera×parallax plus wind, in percent of viewport width
 * @param periodPct  how far apart its repeats are; large, so the sky stays sparse
 * @returns the cloud's LEFT edge, in percent of viewport width, in
 *          `[-CLOUD_OFFSCREEN_LEAD_PCT, periodPct - CLOUD_OFFSCREEN_LEAD_PCT)`
 */
export function cloudLeftPct(startPct: number, travelPct: number, periodPct: number): number {
  const lead = CLOUD_OFFSCREEN_LEAD_PCT;
  // JavaScript's `%` keeps the sign of the dividend, so `-5 % 231` is `-5` and not
  // `226`. Travel only ever grows, so the dividend here is almost always negative
  // and the naive version would put every cloud at a small negative offset forever
  // — one pass across the screen and then a permanent pile at the left edge.
  const span = ((startPct - travelPct + lead) % periodPct + periodPct) % periodPct;
  return span - lead;
}

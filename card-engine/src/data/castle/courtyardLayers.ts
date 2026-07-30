/**
 * Animatable layers cut out of the painted courtyard plate.
 *
 * The machine-readable twin of this file is
 * public/assets/castle/layers/layers.json, written by
 * scripts/sprite-lab/lib/slice_plate.py. Keep them in step, and re-run the
 * slicer if the plate is ever regenerated — these boxes are TRACED onto the
 * painting, not derived from it.
 *
 * Why layers are cut from the plate rather than generated: a pixel prop next to
 * a painted prop reads as a bug. A layer taken out of the painting matches it
 * exactly, by construction. (The chibi hero gets away with being a sprite on a
 * painting because players read characters as actors; they don't extend that
 * licence to scenery.)
 */

export const WATER_LAYER = {
  key: 'courtyard-water',
  path: '/assets/castle/layers/water.png',
  /** Where the water sits, for proximity and particle bounds. */
  box: { x: 658, y: 545, width: 216, height: 153 },
  /** Top of the central spout — droplets fall from here. */
  spout: { x: 768, y: 566 },
  /** Where ripple rings originate, on the water surface below the spout. */
  rippleCentre: { x: 768, y: 618 },
  /** Ripples stop growing here so they never crawl over the stone rim. */
  rippleMaxRadius: 88,
} as const;

export interface GlowSpot {
  x: number;
  y: number;
  radius: number;
  color: number;
  /**
   * The ground line of the POST this crystal sits on — matching the lamp's entry
   * in data/castle/occluders.ts, and well below `y` because the posts lean
   * down-screen.
   *
   * The glow used to draw at a fixed depth of 4–5, under every character. That
   * was invisible while nothing in the painting could occlude anyone. Once a
   * lamp post can cover the hero, a glow still rendering *under* him is an
   * obvious contradiction: the light would pass through a body that the post
   * hides. Sorting the light with the thing emitting it fixes that.
   */
  groundY: number;
}

/**
 * Crystal lamppost heads. Deliberately NOT cut out of the plate — a procedural
 * additive glow drawn over the painted crystal needs no asset, can't fall out of
 * sync, and reads better than a re-tinted crop.
 */
export const GLOW_SPOTS: GlowSpot[] = [
  // groundY values come from the traced occluders (occluders.json), so the light
  // and the post it sits on always sort together. Do not hand-edit — re-run
  // scripts/sprite-lab/lib/import_traces.py and copy the reported ground lines.
  { x: 333, y: 398, radius: 46, color: 0x8fe6ff, groundY: 521 },
  { x: 315, y: 600, radius: 46, color: 0xc9a8ff, groundY: 712 },
  { x: 333, y: 952, radius: 50, color: 0xffb3e6, groundY: 1044 },
  { x: 1083, y: 948, radius: 50, color: 0x8fe6ff, groundY: 1044 },
];

/**
 * Motion budget, and these numbers are the budget — not suggestions.
 *
 * Project rule is minimal motion: the camera never drifts or zooms; things move
 * in the world, the world never moves relative to the frame. The UX review added
 * that nothing should animate within ~80px of the hero or the eye loses the
 * character you are steering, and that more than about three visible ambient
 * sources reads as noise however legal each one is individually.
 */
export const AMBIENT = {
  /** Ambient effects fade out this close to the hero (world px). */
  muteRadius: 80,

  /**
   * Lamp breathing. The first version was invisible for two reasons worth
   * remembering: the amplitude was too shallow to read at all, AND the
   * per-frame proximity-mute overwrote the tween's alpha every frame, so the
   * glow was mathematically constant. Amplitude now spans a visible range and
   * the mute multiplies the pulse instead of replacing it.
   */
  glowPeriodMs: 1900,
  glowAlpha: { min: 0.18, max: 0.95 },
  glowScale: { min: 0.78, max: 1.35 },
  /** A second, larger halo breathing on a different period so it never strobes. */
  haloPeriodMs: 3100,
  haloAlpha: { min: 0.05, max: 0.3 },
  haloScale: { min: 1.5, max: 2.4 },

  /**
   * Water. Cross-fading two copies of the SAME cut-out only changed overall
   * brightness — invisible, as reported. Motion has to come from things that
   * actually move: expanding ripple rings and falling spout droplets.
   */
  ripplePeriodMs: 1500,
  rippleGrowMs: 2100,
  spoutFrequencyMs: 55,

  /** Sparse, or it becomes snow. */
  sparkleFrequencyMs: 420,
  moteFrequencyMs: 1600,

  /** Dust kicked up while walking — cheap, and reads as real weight. */
  footDustFrequencyMs: 190,

  /**
   * A cloud shadow drifting across the courtyard. Very low contrast and very
   * slow, but it does more for "this is a real place" than any single effect —
   * it makes the light feel like it comes from a sky.
   * Note this moves a thing IN the world; the camera still never moves.
   */
  cloudPeriodMs: 34000,
  cloudAlpha: 0.09,
} as const;

/** Contact shadow under the hero — the cheapest "he is standing there" cue. */
export const HERO_SHADOW = { widthRatio: 0.5, height: 9, alpha: 0.28 } as const;

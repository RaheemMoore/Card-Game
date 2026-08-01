import type { MaterialKit } from '../../../services/combat/performance/types';

/**
 * Turns a material kit into the concrete numbers a renderer draws with.
 *
 * The split matters: `materialKits.ts` is ART DIRECTION — "blood is a coiling
 * ribbon with heavy rounded droplets that drips" — and this file is the
 * GEOMETRY that expresses it. Keeping them apart means the art direction can
 * be reviewed and argued about by someone who does not read TypeScript, and
 * the geometry can be retuned without anybody relitigating what blood is.
 *
 * The hard requirement every function here serves: each material must be
 * identifiable WITHOUT ITS COLOUR. So these return widths, wobble amplitudes,
 * taper curves and particle counts — shape information — and colour is applied
 * separately and last.
 */

/** How the body's thickness varies from cast point (0) to head (1). */
export function thicknessAt(kit: MaterialKit, t: number, baseWidth: number): number {
  switch (kit.silhouette) {
    case 'coiling_ribbon':
      // Blood: heaviest at the head, where the weight of it gathers. A ribbon
      // that is fattest at the root reads as a beam, not as something thrown.
      return baseWidth * (0.45 + 0.85 * t);
    case 'cresting_ribbon':
      // Water: even body with a swell near the front where the crest builds.
      return baseWidth * (0.7 + 0.5 * Math.sin(t * Math.PI * 0.85));
    case 'jagged_tongue':
      // Fire: broad at the base, tapering to forks. The opposite of blood,
      // which is most of why the two are told apart in greyscale.
      return baseWidth * (1.15 - 0.75 * t);
    case 'fibrous_bundle':
      // Nature: near-constant, because a root does not taper much — it splits.
      return baseWidth * (0.85 + 0.15 * Math.cos(t * Math.PI * 3));
    case 'faceted_plane':
      return baseWidth;
    case 'smooth_bolt':
      return baseWidth * 0.8;
    default:
      return baseWidth;
  }
}

/**
 * Lateral displacement of the path at `t`, as a fraction of the span.
 *
 * This is the motion signature — what the body DOES on its way across — and
 * it is the strongest no-colour cue after silhouette. `phase` advances with
 * the animation so the shape is alive rather than a frozen squiggle.
 */
export function wobbleAt(kit: MaterialKit, t: number, phase: number): number {
  // Pinned at both ends: the cast point and the impact point must not drift,
  // or the lash appears to miss.
  const envelope = Math.sin(t * Math.PI);

  switch (kit.silhouette) {
    case 'coiling_ribbon':
      // A slow heavy coil — one big loop, not a vibration.
      return envelope * 0.16 * Math.sin(t * Math.PI * 1.6 + phase * 1.4);
    case 'cresting_ribbon':
      // Longer, flatter, more continuous — water flows rather than snaps.
      return envelope * 0.13 * Math.sin(t * Math.PI * 1.2 + phase);
    case 'jagged_tongue':
      // Fast, small, irregular. Fire licks; it does not undulate.
      return (
        envelope *
        (0.07 * Math.sin(t * Math.PI * 4.2 + phase * 3) +
          0.04 * Math.sin(t * Math.PI * 9 + phase * 5))
      );
    case 'fibrous_bundle':
      // Barely any. Roots go where they are going.
      return envelope * 0.05 * Math.sin(t * Math.PI * 2 + phase * 0.6);
    default:
      return 0;
  }
}

/** How many secondary particles this material sheds per performance. */
export function particleCount(kit: MaterialKit): number {
  switch (kit.particle) {
    case 'droplet':
      return 7;
    case 'spray':
      return 12;
    case 'ember':
      return 14;
    case 'leaf':
      return 6;
    case 'shard':
      return 8;
    case 'mote':
      return 9;
    default:
      return 8;
  }
}

/**
 * Where a shed particle goes, as a unit vector plus a speed.
 *
 * Gravity is the point here. Blood falls, embers rise, spray fans sideways —
 * the direction a material's particles travel after contact says what the
 * material weighs, and weight is legible in greyscale.
 */
export function particleDrift(kit: MaterialKit): { dx: number; dy: number; spread: number } {
  switch (kit.particle) {
    case 'droplet':
      return { dx: 0, dy: 1, spread: 0.5 };
    case 'spray':
      return { dx: 0, dy: 0.35, spread: 1.3 };
    case 'ember':
      return { dx: 0, dy: -1, spread: 0.8 };
    case 'leaf':
      return { dx: 0.2, dy: 0.55, spread: 0.9 };
    case 'shard':
      return { dx: 0, dy: 0.15, spread: 1.1 };
    case 'mote':
      return { dx: 0, dy: -0.4, spread: 0.7 };
    default:
      return { dx: 0, dy: 0.5, spread: 1 };
  }
}

/** Impact burst geometry — radius multiplier and how round it is. */
export function impactShape(kit: MaterialKit): {
  radiusScale: number;
  /** 1 = a circle, 0 = a flat fan. */
  roundness: number;
  /** Number of discrete lobes; 0 for a smooth burst. */
  lobes: number;
} {
  switch (kit.impact) {
    case 'wet_splash':
      return { radiusScale: 0.9, roundness: 0.75, lobes: 5 };
    case 'foam_fan':
      // Wide and low — water throws itself outward along the surface it hits.
      return { radiusScale: 1.15, roundness: 0.3, lobes: 0 };
    case 'ember_burst':
      return { radiusScale: 1.0, roundness: 0.85, lobes: 8 };
    case 'splintering':
      return { radiusScale: 0.8, roundness: 0.5, lobes: 6 };
    case 'refracting_flare':
      return { radiusScale: 1.1, roundness: 0.95, lobes: 4 };
    case 'spreading_sheet':
      // Wide and very low — flame crawls ALONG a surface. The flattest
      // roundness in the set, which is what stops it reading as an explosion.
      return { radiusScale: 1.25, roundness: 0.18, lobes: 0 };
    case 'radial_burst':
    default:
      return { radiusScale: 1, roundness: 1, lobes: 0 };
  }
}

/**
 * How fast the stream texture scrolls toward its target, in px/second.
 *
 * This is a weight cue, and it is the main reason a Blood jet and a Water jet
 * do not feel the same even when both are "a stream". Blood is viscous: it
 * moves slower and reads as heavy. Water is fast and thin. Fire is faster
 * still and barely coherent.
 */
export function streamScrollSpeed(kit: MaterialKit): number {
  switch (kit.silhouette) {
    case 'coiling_ribbon':
      return 190;
    case 'cresting_ribbon':
      return 320;
    case 'jagged_tongue':
      return 420;
    case 'fibrous_bundle':
      return 120;
    default:
      return 260;
  }
}

/** Thickness of the stream body in px, before intensity scaling. */
export function streamThickness(kit: MaterialKit): number {
  switch (kit.silhouette) {
    case 'coiling_ribbon':
      return 20;
    case 'cresting_ribbon':
      return 18;
    case 'jagged_tongue':
      return 22;
    case 'fibrous_bundle':
      return 16;
    default:
      return 16;
  }
}

/** Edge decoration along the body — the second silhouette cue. */
export function edgeDecoration(kit: MaterialKit): {
  kind: 'none' | 'beads' | 'crest' | 'forks' | 'barbs';
  density: number;
} {
  switch (kit.edgeProfile) {
    case 'heavy_rounded':
      return { kind: 'beads', density: 0.55 };
    case 'foam_crest':
      return { kind: 'crest', density: 0.8 };
    case 'tapering_forks':
      return { kind: 'forks', density: 0.7 };
    case 'barbed':
      return { kind: 'barbs', density: 0.9 };
    default:
      return { kind: 'none', density: 0 };
  }
}

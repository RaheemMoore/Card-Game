import type Phaser from 'phaser';
import { CASTLE_SILHOUETTE, DEPTH, DUSK, FRONT_V4_VIEW, GROUND_Y } from './layout';

/**
 * The provisional world behind the fight: sky, hills, castle, ground.
 *
 * EVERY LINE OF THIS FILE IS EXPECTED TO BE DELETED. It is code-drawn because the
 * repository contains no side-view façade, no sky and no parallax art, and none was
 * authorised for this proof. The one castle asset that exists — the Halo Stone gate
 * house — is a top-down kit piece: standing it on its edge would read as exactly
 * what it is, which is worse than an honest silhouette that admits to being a
 * placeholder. The wall kit is separately blocked on a projection ruling.
 *
 * It lives apart from the scene for that reason. When the real background arrives
 * (a parallel session is generating it through `bg-harness`), swapping it in should
 * be replacing one function, not picking painted rectangles out of a combat loop.
 *
 * Its only job is to let a human judge the COMPOSITION: is the castle the right
 * size, does it sit in the right place, is there enough open ground to the east,
 * does the dusk read as warm and welcoming rather than grim. All of those are
 * HUMAN REVIEW questions and the numbers behind them are in layout.ts.
 */
/**
 * Texture keys the scene tries to load before falling back to code.
 *
 * DROP A FILE IN AND IT WINS. Raheem is generating the real plates in his own
 * bg-harness workstream; when a PNG lands at the matching path the scene uses it
 * and the code-drawn stand-in for that layer disappears. Two independent layers,
 * so a finished sky can ship before a finished foreground — the alternative, one
 * all-or-nothing plate, would mean neither shows until both exist.
 *
 * The files are deliberately NOT in the asset pack: the pack is generated and
 * these arrive by hand, and a pack rebuild must not be the thing standing between
 * him and seeing his own art.
 */
export const BACKDROP_SLOTS = {
  sky: { key: 'front-v4-sky', path: '/assets/castle/front-v4/sky.png' },
  scenery: { key: 'front-v4-scenery', path: '/assets/castle/front-v4/background.png' },
} as const;

export interface ProvisionalBackdrop {
  /**
   * Drop the ground and castle stand-ins, because the authored Editor scene
   * supplies them.
   *
   * Only those two: the sky's gradient and the hills' curves are things a
   * rectangle cannot be, so they stay in code whatever the Editor contains.
   * Called after the world loads — which is asynchronous, so the stand-ins are
   * painted first and removed a frame or two later rather than being predicted.
   */
  yieldGroundToAuthoredWorld(): void;
}

export function paintProvisionalBackdrop(scene: Phaser.Scene): ProvisionalBackdrop {
  const { width, height } = FRONT_V4_VIEW;
  const groundAndCastle: Phaser.GameObjects.GameObject[] = [];

  // A supplied plate replaces its whole layer, stretched to the authored 16:9
  // frame — the composition is fixed and letterboxed, so the plate is authored
  // against the same 1280x720 and never needs cropping.
  if (scene.textures.exists(BACKDROP_SLOTS.sky.key)) {
    scene.add
      .image(width / 2, height / 2, BACKDROP_SLOTS.sky.key)
      .setDisplaySize(width, height)
      .setDepth(DEPTH.sky);
  } else {
    paintSky(scene);
  }

  if (scene.textures.exists(BACKDROP_SLOTS.scenery.key)) {
    scene.add
      .image(width / 2, height / 2, BACKDROP_SLOTS.scenery.key)
      .setDisplaySize(width, height)
      .setDepth(DEPTH.hills);
  } else {
    paintHills(scene);
    groundAndCastle.push(...paintCastle(scene), paintGround(scene));
  }

  return {
    yieldGroundToAuthoredWorld() {
      for (const object of groundAndCastle.splice(0)) object.destroy();
    },
  };
}

function paintSky(scene: Phaser.Scene) {
  const { width } = FRONT_V4_VIEW;
  const g = scene.add.graphics().setDepth(DEPTH.sky);

  // Banded manually through three stops rather than as two stacked
  // `fillGradientStyle` rects. The stacked version left a hard horizontal seam
  // across the sky where the lower rect began — Phaser's gradient fill
  // interpolates between four CORNERS, so it cannot pass through a midpoint
  // colour, and butting two of them together shows the join.
  const stops = [DUSK.skyTop, DUSK.skyMid, DUSK.skyLow];
  const bands = 96;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const scaled = t * (stops.length - 1);
    const lower = Math.min(stops.length - 2, Math.floor(scaled));
    g.fillStyle(mixColour(stops[lower], stops[lower + 1], scaled - lower), 1);
    // One unit of overlap: adjacent rects otherwise leave hairlines between bands.
    g.fillRect(0, (GROUND_Y * i) / bands, width, GROUND_Y / bands + 1);
  }

  g.fillStyle(DUSK.sun, 0.85);
  g.fillCircle(width * 0.74, GROUND_Y - 150, 46);
}

function paintHills(scene: Phaser.Scene) {
  const { width } = FRONT_V4_VIEW;
  const g = scene.add.graphics().setDepth(DEPTH.hills);

  // Two ridges of summed sines. Not parallax — they do not move, because nothing
  // scrolls yet; they exist to put something between the sky and the ground line
  // so the world has a middle distance to read against.
  const ridge = (fromX: number, colour: number, base: number, shape: (x: number) => number) => {
    g.fillStyle(colour, 1);
    g.beginPath();
    g.moveTo(fromX, GROUND_Y);
    for (let x = fromX; x <= width; x += 20) g.lineTo(x, GROUND_Y - base - shape(x));
    g.lineTo(width, GROUND_Y);
    g.closePath();
    g.fillPath();
  };

  ridge(340, DUSK.hillFar, 70, (x) => 38 * Math.sin(x / 190) + 20 * Math.sin(x / 61));
  ridge(300, DUSK.hillNear, 34, (x) => 22 * Math.sin(x / 120 + 1.4));
}

function paintCastle(scene: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const c = CASTLE_SILHOUETTE;
  const g = scene.add.graphics().setDepth(DEPTH.castle);

  g.fillStyle(DUSK.castle, 1);
  g.fillRect(c.left, c.wallTopY, c.right - c.left, GROUND_Y - c.wallTopY);
  for (const towerX of [c.left + 40, c.right - 86]) {
    g.fillRect(towerX, c.towerTopY, 86, GROUND_Y - c.towerTopY);
    g.fillTriangle(towerX - 12, c.towerTopY, towerX + 98, c.towerTopY, towerX + 43, c.towerTopY - 54);
  }
  // Crenellations along the curtain, so the mass reads as a wall rather than a block.
  for (let x = c.left + 130; x < c.right - 96; x += 34) {
    g.fillRect(x, c.wallTopY - 18, 20, 18);
  }

  // The gate: the western landmark that says "home". Lit from within so the eye
  // goes to it, and deliberately SHUT — there is no interior in this slice, and a
  // door that looked open would be a promise the scene cannot keep.
  g.fillStyle(DUSK.gateGlow, 0.5);
  g.fillRoundedRect(
    c.gate.centerX - c.gate.width / 2 - 8,
    c.gate.topY - 8,
    c.gate.width + 16,
    GROUND_Y - c.gate.topY + 8,
    { tl: 30, tr: 30, bl: 0, br: 0 },
  );
  g.fillStyle(DUSK.castleLit, 1);
  g.fillRoundedRect(
    c.gate.centerX - c.gate.width / 2,
    c.gate.topY,
    c.gate.width,
    GROUND_Y - c.gate.topY,
    { tl: 26, tr: 26, bl: 0, br: 0 },
  );

  // Says so on the page, so a screenshot of this can never be mistaken for art
  // that somebody approved.
  const label = scene.add
    .text(c.gate.centerX, c.wallTopY - 44, 'CASTLE — provisional silhouette', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#ffcf9a',
    })
    .setOrigin(0.5)
    .setAlpha(0.55)
    .setDepth(DEPTH.castle);

  return [g, label];
}

function paintGround(scene: Phaser.Scene): Phaser.GameObjects.GameObject {
  const { width, height } = FRONT_V4_VIEW;
  const g = scene.add.graphics().setDepth(DEPTH.ground);
  g.fillStyle(DUSK.groundBody, 1);
  g.fillRect(0, GROUND_Y, width, height - GROUND_Y);
  // A lit lip on the contact line. Without it the ground and the hills merge into
  // one dark mass and there is no visible floor to stand on — and the floor is the
  // single most important line in a side view.
  g.fillStyle(DUSK.groundTop, 1);
  g.fillRect(0, GROUND_Y, width, 7);
  return g;
}

/** Blend two packed RGB colours. Used only for the provisional sky. */
function mixColour(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const lerp = (shift: number) => {
    const from = (a >> shift) & 0xff;
    const to = (b >> shift) & 0xff;
    return Math.round(from + (to - from) * k) << shift;
  };
  return lerp(16) | lerp(8) | lerp(0);
}

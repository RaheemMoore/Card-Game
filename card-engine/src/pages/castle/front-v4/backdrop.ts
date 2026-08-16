import type Phaser from 'phaser';
import { CASTLE_SILHOUETTE, DEPTH, DUSK, FRONT_V4_VIEW, GROUND_Y, PARALLAX } from './layout';

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
export interface BackdropPlane {
  key: string;
  path: string;
  /**
   * How fast this plane travels against the camera. 0 never moves, 1 travels with
   * the ground. The DIFFERENCE between planes is the whole illusion of distance.
   */
  parallax: number;
  /**
   * World units per second this plane moves ON ITS OWN, with nobody walking.
   *
   * Only the clouds have it, and it is the thing that separates a living sky from
   * a painted one: stand still and the mountains and the tree line hold, while the
   * clouds keep going. Walk, and the drift and the parallax simply add together —
   * they are independent, so neither has to know about the other.
   */
  driftPerSecond: number;
  depth: number;
}

/**
 * The background, as four planes.
 *
 * DROP A FILE IN AND IT WINS. Raheem is building these separately: a continuous
 * walkable backdrop with a mountain line and a tree line, plus clouds that keep
 * moving when he does not. Each plane that lands replaces its code-drawn stand-in;
 * the ones that have not arrived stay provisional, so a finished sky can ship
 * before a finished tree line rather than neither showing until both exist.
 *
 * EVERY PLANE TILES, and none of them is sized to the level. Each is pinned to the
 * camera and its texture is OFFSET each frame instead — see `update()`. That is
 * what makes the world continuous no matter how far east the ground is stretched:
 * there is no plate to run out of, because the plate never moves.
 *
 * The files are deliberately NOT in the asset pack. The pack is generated and
 * these arrive by hand, and a pack rebuild must not stand between him and seeing
 * his own art.
 */
export const BACKDROP_SLOTS = {
  sky: {
    key: 'front-v4-sky',
    path: '/assets/castle/front-v4/sky.png',
    parallax: PARALLAX.sky,
    driftPerSecond: 0,
    depth: DEPTH.sky,
  },
  clouds: {
    key: 'front-v4-clouds',
    path: '/assets/castle/front-v4/clouds.png',
    // Barely any parallax — clouds are nearly as far off as the sky — but a real
    // drift, which is where all of their movement comes from.
    parallax: 0.08,
    driftPerSecond: 7,
    depth: DEPTH.clouds,
  },
  mountains: {
    key: 'front-v4-mountains',
    path: '/assets/castle/front-v4/mountains.png',
    parallax: PARALLAX.far,
    driftPerSecond: 0,
    depth: DEPTH.hills,
  },
  trees: {
    key: 'front-v4-trees',
    path: '/assets/castle/front-v4/trees.png',
    parallax: PARALLAX.near,
    driftPerSecond: 0,
    depth: DEPTH.trees,
  },
} as const satisfies Record<string, BackdropPlane>;

export interface ProvisionalBackdrop {
  /**
   * Advance the background one frame.
   *
   * Takes the camera's scroll so the planes can offset themselves by it, and the
   * elapsed time so the clouds keep moving when nothing else does. Called every
   * frame from the scene, which is the only place that knows both.
   */
  update(scrollX: number, dtMs: number): void;
  /**
   * Redraw the scenery to cover a level of this length.
   *
   * The backdrop is painted before the authored world has loaded, so it is drawn
   * one screen wide against the default arena. Once the ground's real extent is
   * known the hills have to reach the end of it, or the world visibly runs out
   * partway along and the player is running past a torn edge.
   *
   * The sky does not take part: it is pinned to the camera (PARALLAX.sky is 0) and
   * therefore already covers every screen there will ever be.
   */
  extendToLevel(levelWidth: number, groundY: number): void;
  /**
   * Move the hills to meet a ground line that is not the default one.
   *
   * The sky and the hills are painted before the authored world has loaded, so
   * they are drawn against `GROUND_Y`. If Raheem then puts his GROUND rectangle
   * somewhere else, the horizon stays where it was and the new ground slices
   * through the middle of the hills — which reads as a rendering bug rather than
   * as the placeholder following instructions. Only the hills move: the sky fills
   * the frame from the top regardless, and the sun is a position in the sky.
   */
  followGroundLine(groundY: number): void;
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
  let hills: Phaser.GameObjects.Graphics | null = null;

  let levelWidth: number = FRONT_V4_VIEW.width;
  const planes: Array<{ tile: Phaser.GameObjects.TileSprite; plane: BackdropPlane; drift: number }> = [];

  // EVERY supplied plane is pinned to the camera and scrolled by its TEXTURE, not
  // by its position. A plate placed in the world has to be long enough for the
  // level; a plate pinned to the camera with a moving texture offset is infinite
  // for free, which is what "you can just keep running to the right" requires.
  for (const plane of Object.values(BACKDROP_SLOTS) as BackdropPlane[]) {
    if (!scene.textures.exists(plane.key)) continue;
    const tile = scene.add
      .tileSprite(0, 0, width, height, plane.key)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(plane.depth);
    planes.push({ tile, plane, drift: 0 });
  }

  const supplied = new Set(planes.map((p) => p.plane.key));
  if (!supplied.has(BACKDROP_SLOTS.sky.key)) {
    paintSky(scene).setScrollFactor(PARALLAX.sky);
  }
  // The code hills stand in for the mountain line until the real one lands. They
  // stay in world space because they are a formula drawn across the level rather
  // than a texture, and redrawing is cheaper than pretending they tile.
  if (!supplied.has(BACKDROP_SLOTS.mountains.key)) {
    hills = paintHills(scene, levelWidth).setScrollFactor(PARALLAX.far);
  }
  groundAndCastle.push(...paintCastle(scene), paintGround(scene, levelWidth));

  return {
    update(scrollX, dtMs) {
      for (const entry of planes) {
        entry.drift += (entry.plane.driftPerSecond * dtMs) / 1000;
        // Parallax and drift are simply added. They are independent — one is a
        // response to the camera, the other happens regardless — so standing still
        // leaves only the drift, and walking gives both, with no special case for
        // either.
        entry.tile.tilePositionX = scrollX * entry.plane.parallax + entry.drift;
      }
    },

    extendToLevel(nextWidth, groundY) {
      levelWidth = Math.max(FRONT_V4_VIEW.width, nextWidth);
      // Only the code-drawn stand-ins need this. The supplied planes are pinned to
      // the camera and tile forever, so the level's length means nothing to them.
      const reach = Math.ceil(levelWidth * PARALLAX.far) + FRONT_V4_VIEW.width;
      if (hills) {
        hills.clear();
        drawHills(hills, reach);
        hills.setY(groundY - GROUND_Y);
      }
      for (const object of groundAndCastle) {
        const ground = object as Phaser.GameObjects.Graphics & { __isGround?: boolean };
        if (!ground.__isGround) continue;
        ground.clear();
        drawGround(ground, levelWidth);
      }
    },

    followGroundLine(groundY) {
      // Graphics were drawn in absolute coordinates against GROUND_Y, so shifting
      // the object is the whole move — no repaint, and no second copy.
      hills?.setY(groundY - GROUND_Y);
    },
    yieldGroundToAuthoredWorld() {
      for (const object of groundAndCastle.splice(0)) object.destroy();
    },
  };
}

function paintSky(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
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
  return g;
}

function paintHills(scene: Phaser.Scene, width: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(DEPTH.hills);
  drawHills(g, width);
  return g;
}

/**
 * Two ridges of summed sines, out to `width`.
 *
 * Separated from `paintHills` so the level can grow: the ridges are a formula
 * rather than an image, so covering another four thousand units costs a redraw and
 * nothing else. Not parallax by itself — the caller sets the scroll factor.
 */
function drawHills(g: Phaser.GameObjects.Graphics, width: number) {

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
  return g;
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

function paintGround(scene: Phaser.Scene, width: number): Phaser.GameObjects.GameObject {
  const g = scene.add.graphics().setDepth(DEPTH.ground) as Phaser.GameObjects.Graphics & {
    __isGround?: boolean;
  };
  // Tagged so `extendToLevel` can find it again among the castle's graphics and
  // redraw it at the new length. Cheaper and clearer than keeping a parallel list.
  g.__isGround = true;
  drawGround(g, width);
  return g;
}

function drawGround(g: Phaser.GameObjects.Graphics, width: number): void {
  const { height } = FRONT_V4_VIEW;
  g.fillStyle(DUSK.groundBody, 1);
  g.fillRect(0, GROUND_Y, width, height - GROUND_Y);
  // A lit lip on the contact line. Without it the ground and the hills merge into
  // one dark mass and there is no visible floor to stand on — and the floor is the
  // single most important line in a side view.
  g.fillStyle(DUSK.groundTop, 1);
  g.fillRect(0, GROUND_Y, width, 7);
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

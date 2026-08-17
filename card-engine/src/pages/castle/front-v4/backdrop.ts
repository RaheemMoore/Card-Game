import type Phaser from 'phaser';
import {
  CASTLE_SILHOUETTE,
  CLOUD_WIND_PX_PER_SEC,
  DEPTH,
  DUSK,
  FRONT_V4_VIEW,
  GROUND_Y,
  PARALLAX,
} from './layout';
import { cloudLeftPct } from './cloudWrap';
import { BACKGROUND_LABELS } from './worldLabels';
import type { AuthoredPlacement } from './worldLoader';

/**
 * The world behind the fight: sky, mountains, clouds, tree line — and, until the
 * Editor scene supplies them, stand-ins for the castle and the ground.
 *
 * THE BACKGROUND IS NOT ONE PAINTING, and that is the whole design. A single plate
 * can only be at one distance, so it either slides with the player (and reads as a
 * wall six feet behind him) or it does not (and reads as wallpaper). Splitting it
 * into planes that respond to the camera by different fractions is what produces
 * depth, and splitting the clouds out as separate cutouts is what lets the sky keep
 * moving when nobody is walking.
 *
 * It lives apart from the scene so that swapping the art is editing one file rather
 * than picking rectangles out of a combat loop — which is exactly what happened:
 * every plane here was a code-drawn placeholder until the real package landed, and
 * installing it touched nothing in the game rules.
 *
 * The code-drawn paths below are kept, not deleted. A layer whose texture is
 * missing still gets *something*, so a half-delivered background degrades to an
 * honest placeholder instead of a black screen.
 */
export interface BackdropPlane {
  key: string;
  path: string;
  /** The `BG_*` label whose authored rectangle overrides the defaults below. */
  label: string;
  /**
   * How fast this plane travels against the camera. 0 never moves, 1 travels with
   * the ground. The DIFFERENCE between planes is the whole illusion of distance.
   */
  parallax: number;
  depth: number;
  /**
   * Height on screen as a fraction of the viewport, bottom-aligned to the ground
   * line. The strips are drawn at whatever resolution the generator produced; what
   * is composed is how much of the frame they occupy, which is what was approved.
   */
  heightFraction: number;
  /** Atmospheric recession — distance washes things out. */
  alpha: number;
}

/**
 * The scenery that never behaves: a fixed sky plate and two seamless strips.
 *
 * THESE KEYS COME FROM THE KIT PACK, not from a hand-made path. `worldLoader` loads
 * `assets/kits/castle-front/kit-pack.json` for the Editor's benefit anyway, so the
 * textures are already in the manager under these names by the time the scene draws
 * — and the pack builder now generates the background section from
 * `background/background-manifest.json`, so a rebuild cannot quietly remove them.
 *
 * The heights and alphas are the composition Raheem approved in
 * `build_continuous_sky_harness.py`, carried across unchanged. They are fractions
 * of the viewport rather than pixel sizes so the picture holds its proportions on
 * any window.
 *
 * BOTH STRIPS TILE, and neither is sized to the level. Each is pinned to the camera
 * and its texture is OFFSET each frame instead — see `update()`. That is what makes
 * the world continuous no matter how far east the ground is stretched: there is no
 * plate to run out of, because the plate never moves.
 */
export const BACKDROP_SLOTS = {
  mountains: {
    key: 'castle-front-mountains-loop',
    path: '/assets/kits/castle-front/background/mountains/castle-front-mountains-loop.png',
    label: BACKGROUND_LABELS.mountains,
    parallax: PARALLAX.mountains,
    depth: DEPTH.hills,
    heightFraction: 0.55,
    alpha: 0.82,
  },
  forest: {
    key: 'castle-front-forest-loop',
    path: '/assets/kits/castle-front/background/forest/castle-front-forest-loop.png',
    label: BACKGROUND_LABELS.forest,
    parallax: PARALLAX.forest,
    depth: DEPTH.trees,
    heightFraction: 0.28,
    alpha: 0.92,
  },
} as const satisfies Record<string, BackdropPlane>;

/** The fixed back plate. Not a plane: it has no parallax and never offsets. */
export const SKY_SLOT = {
  key: 'castle-front-sunset-sky',
  path: '/assets/kits/castle-front/background/sky/castle-front-sunset-sky.png',
} as const;

export interface CloudActor {
  key: string;
  path: string;
  /** The `BG_*` label whose authored rectangle overrides the defaults below. */
  label: string;
  /** Phase: where it sits at zero travel, in percent of viewport width. */
  startPct: number;
  /** Top edge, percent of viewport height. */
  yPct: number;
  /** Drawn width, percent of viewport width. Aspect is preserved from the texture. */
  widthPct: number;
  parallax: number;
  /** Distance between repeats, in percent of viewport width. */
  periodPct: number;
}

/**
 * Four clouds, and they are ACTORS rather than a plane.
 *
 * A cloud layer painted into one strip can only move at one speed and can only ever
 * be as sparse as it was drawn. Four cutouts on their own periods give a sky where
 * nothing quite repeats: the periods are deliberately near-coprime (231/239/251/243
 * percent of a screen), so the arrangement takes tens of thousands of pixels of
 * travel to come round again, and there is no moment where the sky visibly resets.
 *
 * Two of them ride at .20 and two at .30, which is what separates the sky into a
 * high and a low deck. Every number here is straight out of the approved harness.
 *
 * Only the sunset palette is wired. Afternoon and twilight versions of all four
 * exist on disk and are deliberately not loaded — they are for a later scene, and
 * loading three palettes to show one is how a scene quietly gains a megabyte.
 */
export const CLOUD_ACTORS: readonly CloudActor[] = [
  { key: 'castle-front-cloud-broad-sunset', path: cloudPath('broad'), label: BACKGROUND_LABELS.clouds[0], startPct: 7, yPct: 15, widthPct: 27, parallax: PARALLAX.cloudHigh, periodPct: 231 },
  { key: 'castle-front-cloud-mound-sunset', path: cloudPath('mound'), label: BACKGROUND_LABELS.clouds[1], startPct: 34, yPct: 39, widthPct: 23, parallax: PARALLAX.cloudLow, periodPct: 239 },
  { key: 'castle-front-cloud-puffs-sunset', path: cloudPath('puffs'), label: BACKGROUND_LABELS.clouds[2], startPct: 62, yPct: 8, widthPct: 13, parallax: PARALLAX.cloudHigh, periodPct: 251 },
  { key: 'castle-front-cloud-sweep-sunset', path: cloudPath('sweep'), label: BACKGROUND_LABELS.clouds[3], startPct: 70, yPct: 28, widthPct: 28, parallax: PARALLAX.cloudLow, periodPct: 243 },
];

function cloudPath(shape: string): string {
  return `/assets/kits/castle-front/background/clouds/cloud-${shape}-sunset.png`;
}

/** Every texture the background wants, for the scene's preload. */
export const BACKDROP_TEXTURES: ReadonlyArray<{ key: string; path: string }> = [
  SKY_SLOT,
  ...Object.values(BACKDROP_SLOTS).map((p) => ({ key: p.key, path: p.path })),
  ...CLOUD_ACTORS.map((c) => ({ key: c.key, path: c.path })),
];

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
   * Cover a viewport of this size in WORLD units.
   *
   * Not the same as the canvas size: the camera fits height and lets width run, so
   * a window wider than 16:9 sees more world than `FRONT_V4_VIEW.width`. Every
   * background layer is pinned to the camera, so anything sized to a fixed 1280
   * would leave a bar of empty canvas down each side of an ultrawide window — and
   * because the layers are pinned, the bar would not move, which reads as a broken
   * render rather than as a window that is the wrong shape.
   */
  fitViewport(width: number, height: number): void;
  /**
   * Take the layer placement Raheem authored in Phaser Editor.
   *
   * THE EDITOR OWNS WHERE, THE CODE OWNS HOW FAST. Everything the defaults below
   * decide — how much frame a layer fills, where its base meets the floor, how
   * washed out it is — is a composition judgement made by eye against the castle
   * and the grass, and the numbers in `BACKDROP_SLOTS` are only a starting guess at
   * it. Once an authored `BG_*` object exists, its rectangle wins.
   *
   * Layers he has not placed keep their defaults, so this is additive: he can drag
   * the tree line onto the grass without having to place a sky first.
   */
  adoptAuthoredPlacement(placements: Record<string, AuthoredPlacement>): void;
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
  /** What the background is actually doing, for the studio bridge to assert on. */
  readout(): BackdropReadout;
}

/**
 * The background's own telemetry.
 *
 * Parallax is the one thing in this scene that CANNOT be checked from a still: a
 * screenshot of a correct background and a screenshot of one scrolling at the wrong
 * rate are the same image. So the numbers come out through the bridge and get
 * asserted on — that the mountains moved half as far as the camera, that they froze
 * to the pixel when he stopped, and that the clouds did not.
 */
export interface BackdropReadout {
  /** Texture keys that were missing and fell back to code-drawn stand-ins. */
  missing: string[];
  /**
   * `BG_*` labels whose placement came from the Editor rather than from the
   * defaults. Empty means every layer is still using the code's starting guess —
   * which looks identical on screen and is the difference between "he has composed
   * this" and "his placement is being ignored".
   */
  authoredLayers: string[];
  /**
   * Where each layer actually ended up, in world units, against the ground line.
   *
   * Here because the first thing that went wrong after the Editor took over
   * placement was a strip of sky showing between the tree line and the grass —
   * visible in the browser and absent in the Editor, which is a difference no
   * amount of staring at either one resolves. What settles it is reading the two
   * sets of numbers side by side.
   */
  layers: Array<{
    label: string;
    top: number;
    bottom: number;
    alpha: number;
    depth: number;
    visible: boolean;
    /** Sprite width, and for a strip the texture scale inside it. */
    width: number;
    tileScale: number | null;
  }>;
  /** The contact line every layer is composed against. */
  groundY: number;
  /** How far each tiling strip has slid on screen, in world units. */
  mountainsOffsetPx: number;
  forestOffsetPx: number;
  /** Left edge of each cloud, in world units, in `CLOUD_ACTORS` order. */
  cloudXs: number[];
  /** How far the wind alone has carried the clouds since the scene started. */
  windTravelPx: number;
}

export function paintProvisionalBackdrop(scene: Phaser.Scene): ProvisionalBackdrop {
  const groundAndCastle: Phaser.GameObjects.GameObject[] = [];
  let hills: Phaser.GameObjects.Graphics | null = null;

  let levelWidth: number = FRONT_V4_VIEW.width;
  let viewWidth: number = FRONT_V4_VIEW.width;
  let viewHeight: number = FRONT_V4_VIEW.height;
  let groundLine: number = GROUND_Y;

  let windTravel = 0;
  const missing: string[] = [];
  /** Authored `BG_*` rectangles, empty until the Editor scene has loaded. */
  let placed: Record<string, AuthoredPlacement> = {};

  /**
   * `sourceHeight` is the ART's height, read from the texture manager and kept.
   *
   * NOT `tile.texture.getSourceImage().height`. A TileSprite's `texture` is the
   * fill texture it generates for ITSELF, sized to the sprite — so that expression
   * returns the sprite's own height, the scale computed from it is always 1, and
   * the layer renders at the wrong size or not at all. It cost an hour, and it
   * failed in the way these bugs always do: the numbers all looked plausible and
   * the Editor, which does not go through this path, looked correct.
   */
  const strips: Array<{
    tile: Phaser.GameObjects.TileSprite;
    plane: BackdropPlane;
    sourceHeight: number;
  }> = [];
  const clouds: Array<{ image: Phaser.GameObjects.Image; actor: CloudActor }> = [];

  // The fixed back plate. It has no parallax and no tiling: a sky that slides is a
  // sky whose edge you eventually reach, and one that repeats shows the join. It is
  // scaled to COVER rather than stretched, so a window that is not 16:9 crops the
  // plate instead of distorting the sun into an ellipse.
  const sky = scene.textures.exists(SKY_SLOT.key)
    ? scene.add.image(0, 0, SKY_SLOT.key).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.sky)
    : null;
  if (!sky) {
    missing.push(SKY_SLOT.key);
    paintSky(scene).setScrollFactor(PARALLAX.sky);
  }

  // EVERY strip is pinned to the camera and scrolled by its TEXTURE, not by its
  // position. A plate placed in the world has to be long enough for the level; a
  // plate pinned to the camera with a moving texture offset is infinite for free,
  // which is what "you can just keep running to the right" requires.
  for (const plane of Object.values(BACKDROP_SLOTS) as BackdropPlane[]) {
    if (!scene.textures.exists(plane.key)) {
      missing.push(plane.key);
      continue;
    }
    const source = scene.textures.get(plane.key).getSourceImage();
    const tile = scene.add
      .tileSprite(0, 0, viewWidth, source.height, plane.key)
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setAlpha(plane.alpha)
      .setDepth(plane.depth);
    strips.push({ tile, plane, sourceHeight: source.height });
  }

  for (const actor of CLOUD_ACTORS) {
    if (!scene.textures.exists(actor.key)) {
      missing.push(actor.key);
      continue;
    }
    clouds.push({
      image: scene.add
        .image(0, 0, actor.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.clouds),
      actor,
    });
  }

  // The code hills stand in for the mountain line only if the real one is missing.
  // They stay in world space because they are a formula drawn across the level
  // rather than a texture, and redrawing is cheaper than pretending they tile.
  if (missing.includes(BACKDROP_SLOTS.mountains.key)) {
    hills = paintHills(scene, levelWidth).setScrollFactor(PARALLAX.mountains);
  }
  groundAndCastle.push(...paintCastle(scene), paintGround(scene, levelWidth));

  /** Re-lay every pinned layer against the current viewport and ground line. */
  const layout = () => {
    if (sky) {
      const authored = placed[BACKGROUND_LABELS.sky];
      /**
       * THE SKY ALWAYS FILLS THE FRAME, and its authored rectangle is deliberately
       * ignored — the one layer where placement is not a judgement call.
       *
       * Every other layer's position is a composition Raheem makes by eye. The sky
       * is not: it is the thing behind everything, and the only correct answer is
       * "all of it". Honouring its authored top broke the moment the frame grew,
       * because a plate dragged to fill 720 units leaves the new 240 as a black
       * band across the top — and no amount of dragging makes a fixed plate the
       * right answer for a frame whose height can change.
       *
       * Cover-scaled rather than stretched, so a window that is not 16:9 crops the
       * plate instead of distorting the sun into an ellipse. His authored ALPHA is
       * still honoured — that one is a real decision.
       */
      const cover = Math.max(viewWidth / sky.width, viewHeight / sky.height);
      sky
        .setScale(cover)
        .setPosition((viewWidth - sky.width * cover) / 2, 0)
        .setAlpha(authored?.alpha ?? 1);
    }
    for (const { tile, plane, sourceHeight } of strips) {
      const authored = placed[plane.label];
      const drawnHeight = authored ? authored.height : viewHeight * plane.heightFraction;
      // `tileScale` scales the TEXTURE inside the sprite; the sprite's own size is
      // the window onto it. Both are needed: the size decides how much frame the
      // layer fills, the scale decides how big the trees are within it. Against the
      // stored source height, never the sprite's own — see `strips`.
      const scale = drawnHeight / sourceHeight;
      tile.setTileScale(scale, scale);
      // Bottom-aligned: the tree line has to MEET the floor, or the world visibly
      // floats. Authored placement wins, because exactly where it meets is the
      // judgement Raheem wanted back. `setSize` after `setTileScale` so the tiling
      // is recomputed against the new dimensions.
      tile.setSize(viewWidth, drawnHeight);
      tile.setPosition(0, authored ? authored.top + authored.height : groundLine);
      tile.setAlpha(authored?.alpha ?? plane.alpha);
    }
    for (const { image, actor } of clouds) {
      const authored = placed[actor.label];
      const drawnWidth = authored ? authored.width : viewWidth * (actor.widthPct / 100);
      // `image.width` is the texture's, unscaled — `setScale` replaces the previous
      // scale rather than compounding, so this is stable across re-layouts.
      image.setScale(drawnWidth / image.width);
      image.setY(authored ? authored.top : viewHeight * (actor.yPct / 100));
      image.setAlpha(authored?.alpha ?? 1);
    }
    paintClouds(lastScrollX);
  };

  let lastScrollX = 0;
  function paintClouds(scrollX: number) {
    lastScrollX = scrollX;
    for (const { image, actor } of clouds) {
      const travelPx = scrollX * actor.parallax + windTravel;
      const travelPct = (travelPx / viewWidth) * 100;
      // Where he dragged it is its PHASE — the point in its cycle the scene opens
      // on. Horizontal placement cannot be anything else for a thing that crosses
      // the screen forever, and spreading the four out by hand is exactly how you
      // stop them clumping.
      const authored = placed[actor.label];
      const startPct = authored ? (authored.left / viewWidth) * 100 : actor.startPct;
      image.setX((cloudLeftPct(startPct, travelPct, actor.periodPct) / 100) * viewWidth);
    }
  }
  layout();

  return {
    update(scrollX, dtMs) {
      // Wind and parallax are simply added. They are independent — one is a response
      // to the camera, the other happens regardless — so standing still leaves only
      // the wind, and walking gives both, with no special case for either. Reduced
      // motion arrives as dtMs 0, which stops the wind and leaves the parallax: the
      // background still answers the camera, it just no longer moves by itself.
      windTravel += (CLOUD_WIND_PX_PER_SEC * dtMs) / 1000;
      for (const { tile, plane } of strips) {
        // DIVIDED BY THE TILE SCALE, and this is the easy thing to get wrong.
        // `tilePositionX` is measured in TEXTURE pixels, so at a tile scale of 1.5 a
        // step of 100 slides the picture 150 units on screen — every layer would
        // travel at its stated parallax times its own arbitrary upscale, and the
        // depth ordering would be whatever the art's resolution happened to be.
        tile.tilePositionX = (scrollX * plane.parallax) / tile.tileScaleX;
      }
      paintClouds(scrollX);
    },

    fitViewport(width, height) {
      viewWidth = Math.max(1, width);
      viewHeight = Math.max(1, height);
      layout();
    },

    adoptAuthoredPlacement(placements) {
      placed = { ...placements };
      layout();
    },

    extendToLevel(nextWidth, groundY) {
      levelWidth = Math.max(FRONT_V4_VIEW.width, nextWidth);
      // Only the code-drawn stand-ins need this. The strips are pinned to the camera
      // and tile forever, so the level's length means nothing to them.
      const reach = Math.ceil(levelWidth * PARALLAX.mountains) + FRONT_V4_VIEW.width;
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
      groundLine = groundY;
      layout();
    },
    yieldGroundToAuthoredWorld() {
      for (const object of groundAndCastle.splice(0)) object.destroy();
    },
    readout() {
      const offset = (key: string) => {
        const entry = strips.find((s) => s.plane.key === key);
        return entry ? entry.tile.tilePositionX * entry.tile.tileScaleX : 0;
      };
      const rect = (
        label: string,
        o: {
          y: number;
          displayWidth: number;
          displayHeight: number;
          originY: number;
          alpha: number;
          depth: number;
          visible: boolean;
          tileScaleX?: number;
        } | null,
      ) =>
        o
          ? [
              {
                label,
                top: o.y - o.displayHeight * o.originY,
                bottom: o.y + o.displayHeight * (1 - o.originY),
                alpha: o.alpha,
                depth: o.depth,
                visible: o.visible,
                width: o.displayWidth,
                tileScale: typeof o.tileScaleX === 'number' ? o.tileScaleX : null,
              },
            ]
          : [];
      return {
        missing: [...missing],
        authoredLayers: Object.keys(placed).sort(),
        groundY: groundLine,
        layers: [
          ...rect(BACKGROUND_LABELS.sky, sky),
          ...strips.map(({ tile, plane }) => rect(plane.label, tile)).flat(),
          ...clouds.flatMap(({ image, actor }) => rect(actor.label, image)),
        ],
        mountainsOffsetPx: offset(BACKDROP_SLOTS.mountains.key),
        forestOffsetPx: offset(BACKDROP_SLOTS.forest.key),
        cloudXs: clouds.map((c) => c.image.x),
        windTravelPx: windTravel,
      };
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

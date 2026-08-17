/**
 * Where everything stands in the side-view proof.
 *
 * ONE FILE FOR EVERY COORDINATE, because the whole point of CastleFrontV4 is that
 * Raheem and Codex look at it and say "the castle is too small" or "he's too far
 * from the jelly" — and every one of those notes has to be a number in here, not a
 * literal buried in a scene method. Nothing in this file is canon; it is a first
 * playable composition, and §14 of the handoff is explicit that values written
 * down in a plan do not become permanent by having been written down.
 *
 * THE COORDINATE CONTRACT, which is the thing that actually differs from the
 * courtyard:
 *
 *   - X increases east/right. The castle is the permanent west origin; the world
 *     will one day grow to the right, so nothing may assume `world width ===
 *     browser width` or `player X === screen X`.
 *   - Y increases downward, matching Phaser.
 *   - GROUND_Y is the single contact line. Everything that stands, stands on it.
 *   - A thing's position IS its ground contact. Height above the ground is a
 *     separate number, and in this view it is subtracted from GROUND_Y to get a
 *     screen Y. That is the one place the top-down modules' "ground point plus
 *     draw height" split collapses into a single axis, and it is why this scene
 *     does NOT use blast.ts's `cardOrigin()`/`CARD_HEIGHT_PX` pair — a projectile
 *     here lives in literal screen space, so its `y` already IS its height.
 */

/**
 * Draw order.
 *
 * Fixed layers, not a Y-sort. The courtyard sorts by ground contact because in a
 * top-down view "further north" means "behind"; here the axis that decides
 * occlusion is gone, and a thing's height off the floor says nothing about what it
 * stands in front of. Sorting side-view actors by Y would put a leaping creature
 * behind the castle at the top of its arc.
 */
export const DEPTH = {
  sky: 0,
  /**
   * The mountain line. Furthest land, so it sits directly on the sky.
   *
   * Named `hills` because a code-drawn ridge stood here before the real art
   * existed; the slot is the same one and renaming it would touch every call site
   * for no gain.
   */
  hills: 1,
  /**
   * Clouds fly BETWEEN the mountains and the tree line, which looks wrong written
   * down and is right on screen: a cloud passing in front of a distant peak is
   * ordinary, and a cloud hidden behind one reads as a hole in the sky. They were
   * behind the mountains until the real art arrived, when the mountains stopped
   * being a flat silhouette and started having summits for clouds to cross.
   */
  clouds: 2,
  /** The near tree line, in front of the clouds and behind the castle. */
  trees: 3,
  castle: 4,
  ground: 6,
  /**
   * Base depth for everything authored in Phaser Editor.
   *
   * The Editor gives a new object depth 0, which in this scene is the SKY — so a
   * wall placed in the editor renders behind the backdrop and appears to have
   * done nothing. `worldLoader` offsets every authored object by this base and
   * adds whatever depth was set in the Editor on top, so relative ordering is
   * preserved while the whole set lands in front of the scenery and behind the
   * people.
   */
  world: 7,
  dropped: 8,
  shadow: 9,
  jelly: 10,
  jellyFlash: 11,
  tell: 11.5,
  hero: 12,
  projectile: 14,
  fx: 16,
  hud: 20,
} as const;

/**
 * The VIEWPORT — one screen — not the world.
 *
 * The level is as wide as the ground Raheem stretches in Phaser Editor; this is
 * only how much of it you see at once. Height is fixed: the world is one screen
 * tall and scrolls sideways, like Mario, so vertical is a framing decision and
 * horizontal is a level-design one.
 */
export const FRONT_V4_VIEW = {
  width: 1280,
  /**
   * 960, up from 720 — and the extra 240 is SKY, not ground.
   *
   * Raheem chose it off four composed mock-ups (`lib/frame_mock.py`) with the real
   * art in them: at 720 his tower's battlements were cut off by the top of the
   * frame, so there was literally nowhere to put the things he wants happening up
   * there. *"Let's go with D because I plan on putting the walls on… having a
   * scene occurring on the walls when you're running by."*
   *
   * At 960 the tower stands at 83% of the frame — the same proportion Wonder Boy
   * gives its castle, measured off the screenshot he brought — with real sky above
   * the battlements, and the hero at 11%, which is where a game that wants
   * environmental grandeur puts him.
   */
  height: 960,
} as const;

/**
 * PARALLAX SPEEDS — how fast each background plane moves relative to the player.
 *
 * A "plane" is one image scrolling at its own rate; the difference between the
 * rates is the entire illusion of depth. 0 is painted on the camera and never
 * moves, 1 travels exactly with the ground. Everything between reads as distance.
 *
 * Kept here rather than in the backdrop so the code-drawn stand-in and Raheem's
 * generated plates use the SAME numbers — otherwise swapping his art in would
 * silently change how far away the world feels.
 *
 * THESE NUMBERS ARE ADOPTED, NOT INVENTED, and they are a contract rather than a
 * set of sliders. They come with the background package (see
 * `background/background-manifest.json`, `motion`), which took them from Godot's
 * documented parallax stack — forest .7, hills .5, clouds .3 and .2 — because a
 * ratio somebody shipped and tuned against real art beats a ratio that felt about
 * right in an afternoon. The art was BUILT to these: the mountain and forest strips
 * are drawn at the density that reads correctly when moving at half and
 * seven-tenths of the camera. Changing one here without regenerating its plate
 * changes how fast the world goes past, not how far away it looks.
 *
 * The previous values (.25 / .55) predate any art and were guesses.
 */
export const PARALLAX = {
  /** Sky: pinned to the camera. A sky that slides is a sky you can see the edge of. */
  sky: 0,
  /** High clouds — the ones nearly as far off as the sky itself. */
  cloudHigh: 0.2,
  /** Low clouds, closer in, crossing the frame noticeably faster than the high ones. */
  cloudLow: 0.3,
  /** The mountain line. */
  mountains: 0.5,
  /** The near tree line: the last thing between the player and the distance. */
  forest: 0.7,
  /** The ground and everything standing on it. */
  gameplay: 1,
} as const;

/**
 * How fast a cloud crosses the sky with NOBODY WALKING, in world units per second.
 *
 * This is the whole difference between a sky and a painting of a sky, and it is
 * deliberately a second, independent motion source rather than a bigger parallax
 * number: parallax is a response to the camera and dies the instant the player
 * stops, so a cloud that only had parallax would freeze mid-air every time he stood
 * still. Wind and parallax simply add, so walking gives both and neither needs to
 * know about the other.
 *
 * 12 is from the background package's motion contract.
 */
export const CLOUD_WIND_PX_PER_SEC = 12;

/** The canonical contact line. Feet, jelly undersides and landed cards all sit here. */
export const GROUND_Y = 830;

/**
 * Uniform display scale for every pixel sprite in the scene.
 *
 * INTEGER, and that is not negotiable: the hero and jelly sheets are pre-resampled
 * to display resolution (see heroSprite.ts), so the renderer may only ever upscale,
 * and only by a whole number, or the art reads soft. 2 is the smallest scale at
 * which a 71px hero is a legible character rather than a doll on a 720p canvas.
 *
 * It is uniform across hero and jelly on purpose — both sheets were authored for
 * the same courtyard, so their relative sizes are already the intended ones and
 * scaling them differently would be inventing a new relationship by accident.
 *
 * Explicitly a HUMAN REVIEW question: character scale against the castle is the
 * first thing to argue about after seeing this run.
 */
export const SPRITE_SCALE = 2;

/**
 * Collision proxies, MEASURED off the shipped sheets rather than derived from the
 * frame boxes.
 *
 * The frame is not the body. Both sheets carry transparent padding — the jelly's
 * 63x54 frame holds a 41x41 blob, the hero's 36x71 frame a 27x69 figure — and
 * sizing a collider from the frame gives a creature far larger than it looks,
 * while sizing it from an unscaled guess gives one far smaller. The first pass
 * here did the latter: 30 half-units against a body drawn 82 wide, so the two
 * actors stood visibly inside one another and the leap's hitbox was narrower than
 * the thing the player could see coming.
 *
 * All values are in world units at SPRITE_SCALE, so they are what is on screen.
 * Re-measure after any regeneration; do not scale these by hand.
 */
export const HERO_BODY = {
  /** Deliberately inside his 56-unit silhouette — a forgiving body, as the courtyard's feet rect is. */
  halfWidthPx: 24,
  /** His true drawn height, 69 of 71 rows. This is what a leap must clear. */
  heightPx: 138,
} as const;

/** Where his feet sit in the frame: 2 rows of padding below them, same reason as JELLY_ANCHOR. */
export const HERO_ANCHOR_Y = 70 / 71;

/**
 * Re-measure a body for an actor drawn at a different scale.
 *
 * THE BODIES BELOW ARE STATED AT `SPRITE_SCALE`, and Raheem now sets the actual
 * scale in Phaser Editor — he halved the hero and took the creature to 0.65 on
 * 2026-08-16. A collider left at the old size is the worst kind of wrong: the
 * picture is right, so the bug presents as the game being unfair rather than as
 * anything visibly broken. Everything derived from a body — how close he can get,
 * how wide the leap's hitbox is, how far a scattered card must clear it — has to
 * move with the art.
 *
 * A pure ratio, deliberately. The measurements were taken off the sheets by hand
 * (see `HERO_BODY`), so the only honest transformation is the same scaling the
 * renderer applies; anything cleverer would be inventing a body nobody measured.
 */
export function bodyAtScale<T extends Record<string, number>>(body: T, scale: number): T {
  const ratio = scale / SPRITE_SCALE;
  const out = {} as Record<string, number>;
  for (const [key, value] of Object.entries(body)) out[key] = value * ratio;
  return out as T;
}

export const JELLY_BODY = {
  /** Half of the 41-unit blob at scale. Mid-hop it reaches 45; resting is the honest figure. */
  halfWidthPx: 41,
  heightPx: 82,
} as const;

/**
 * The blob is not centred in its own frame — it sits 4.5 units right of centre.
 *
 * Anchoring at 0.5 therefore draws it offset from the position the simulation
 * thinks it occupies, which is invisible until it matters: the telegraph marker
 * and the leap's hitbox would both sit slightly beside the creature. Same class
 * of bug as JELLY_ANCHOR's vertical padding, and measured the same way.
 */
export const JELLY_ANCHOR_X = 36 / 63;

/**
 * Where the Card-wright may walk, as ground-contact X.
 *
 * The west clamp is the castle wall: knockback stops here rather than shoving him
 * through his own front door. The east clamp is the edge of the proof arena — a
 * later milestone replaces it with more world, which is why it lives here and not
 * in the movement rules.
 */
export const ARENA = { minX: 150, maxX: 1200 } as const;

/**
 * Ground a dropped card may not land on: the gate's threshold and the stonework
 * either side of it. A card behind the castle wall is unrecoverable, and the §13
 * contract says every scattered card must be reachable.
 */
export const CASTLE_NO_DROP = { minX: 0, maxX: 178 } as const;

export const HERO_SPAWN_X = 380;

/**
 * Jelly home.
 *
 * 280 units from the hero, and it MUST stay inside CONSTRUCT_TUNING.alertRadiusPx
 * (340) or the encounter opens with an enemy that is furniture until walked into.
 * The courtyard shipped exactly that bug once — the construct spawned 263 units
 * out with a 260 radius — and Raheem played the whole script before reporting,
 * correctly, that nothing had changed. `layout.test.ts` holds this to the radius.
 */
export const JELLY_SPAWN_X = 660;

/** Automatic pickup reach for a scattered card, measured on the ground line. */
export const PICKUP_RADIUS_PX = 52;

/**
 * The Card-wright's ordinary walking speed, in world units per second.
 *
 * The SAME VALUE as the courtyard's WALK_SPEED, which is a module-private const in
 * courtyardRuntime.ts and cannot be imported. Duplicated deliberately rather than
 * hoisted, because hoisting it would mean editing a 3470-line file that another
 * branch is actively working in. The number matters because the leap's fairness
 * proof is stated against it: if this and the courtyard ever diverge, the proof is
 * measuring a hero who does not exist.
 */
export const FRONT_V4_WALK_SPEED = 190;

/**
 * The provisional dusk palette.
 *
 * Code-drawn, because no side-view sky, façade or parallax art exists in the
 * repository and none is authorised here. Warm medieval fantasy at sunset per §14:
 * orange/golden, welcoming rather than grim. Every one of these is a placeholder
 * awaiting art direction.
 */
export const DUSK = {
  skyTop: 0x2b1e3d,
  skyMid: 0x8c4a2f,
  skyLow: 0xd98b45,
  sun: 0xffd08a,
  hillFar: 0x3b2b45,
  hillNear: 0x2a1f33,
  castle: 0x241c2c,
  castleLit: 0x3a2c3f,
  gateGlow: 0xffb45e,
  groundTop: 0x6b4a33,
  groundBody: 0x3d2a1f,
} as const;

/**
 * The castle's provisional footprint, in world units.
 *
 * A silhouette, not art: keep occupying, roughly half the left of the screen, and
 * behind the playable line so the Card-wright walks in FRONT of his own home.
 */
export const CASTLE_SILHOUETTE = {
  /** Outer extent of the keep mass. */
  left: -40,
  right: 330,
  /** Top of the main curtain wall. */
  wallTopY: 300,
  /** Towers rise above the curtain. */
  towerTopY: 176,
  /** The gate arch: the western landmark the player reads as "home". */
  gate: { centerX: 176, width: 104, topY: 372 },
} as const;

/**
 * Point the camera at a level that is one screen tall and as long as you like.
 *
 * THE ZOOM FITS HEIGHT ONLY, and that is the whole change from the fixed camera
 * this replaced. Fitting both axes is what pinned the game to a single 1280-wide
 * screen; fitting height alone means the vertical framing is still authored — the
 * ground sits where it was drawn, the hero is the size he was drawn — while the
 * horizontal is free to run as far as the ground does.
 *
 * `setBounds` IS CORRECT NOW, AND WAS NOT BEFORE. Phaser's camera clamp assumes
 * the world is larger than the view. Under the old fit-both zoom the view was
 * larger than the world, so the clamp shoved the composition against the left edge
 * — the legacy courtyard lost an afternoon to exactly that, and the fix then was
 * `removeBounds()`. A level wider than the screen inverts the premise, so the
 * clamp becomes the thing that stops the camera running off the end of the world.
 *
 * The narrow-window case is still real and still handled: if the whole level fits
 * on screen there is nothing to scroll, and clamping would reintroduce the old bug
 * — so it centres instead, exactly as before.
 */
export function applyLevelCamera(
  camera: Phaser.Cameras.Scene2D.Camera,
  size: { width: number; height: number },
  levelWidth: number,
) {
  const zoom = size.height / FRONT_V4_VIEW.height;
  camera.setZoom(zoom > 0 ? zoom : 1);

  const visibleWorldWidth = size.width / (zoom > 0 ? zoom : 1);
  if (levelWidth <= visibleWorldWidth) {
    camera.removeBounds();
    camera.stopFollow();
    camera.centerOn(levelWidth / 2, FRONT_V4_VIEW.height / 2);
    return;
  }
  camera.setBounds(0, 0, levelWidth, FRONT_V4_VIEW.height);
  /**
   * PIN THE VERTICAL. Nothing else ever writes it.
   *
   * The deadzone is the full frame height, so the follow has no cause to move the
   * camera on Y — which sounds like Y takes care of itself and means the opposite:
   * `scrollY` keeps whatever it was given first and no later bounds change disturbs
   * it. When the frame grew from 720 to 960 the camera stayed where the old world
   * had put it and painted a band across the sky that read as a backdrop failing to
   * load. A number that never moves is not being clamped; it is not being set.
   */
  camera.setScroll(camera.scrollX, 0);
}

/**
 * How far he can drift before the camera bothers to move, in world units.
 *
 * A camera welded to the player makes the world slide under a man who looks
 * stationary, which is both unpleasant and hard to aim in. A deadzone lets him
 *
 * ITS HEIGHT IS THE WHOLE FRAME, DELIBERATELY, and it is derived rather than typed
 * so it cannot fall behind. A deadzone shorter than the view lets the camera track
 * him VERTICALLY, which in a game with no jump is pure defect: the horizon lurches
 * for no reason the player can act on. It was left at a literal 720 when the frame
 * grew to 960 and immediately produced exactly that.
 * lead his own shot and step back from the creature without the horizon lurching.
 */
export const CAMERA_DEADZONE = { width: 320, height: FRONT_V4_VIEW.height } as const;

/**
 * A little world beyond where he can walk, so the level does not end at a cliff
 * of empty screen the moment he reaches the last step of floor.
 */
export const LEVEL_EDGE_MARGIN = 160;

/**
 * How far from him his hand scatters when he is knocked down, in world units.
 *
 * A WINDOW AROUND HIM, not the whole level — and that distinction only appeared
 * once the level got long. Scattering across the full arena was fine on one
 * screen; on a level several thousand units wide it would fling a card somewhere
 * he has not walked yet, which is not a setback, it is a lost card.
 *
 * The camera deliberately does NOT cut away to show where they landed. Raheem:
 * *"it should just stay on you, and you gotta go back and get them."* Losing the
 * hand should feel like losing ground, and being shown the answer would take that
 * away — so the window is sized to reach a little past one screen, far enough that
 * some cards land behind him and out of sight.
 */
export const SCATTER_WINDOW_PX = 760;

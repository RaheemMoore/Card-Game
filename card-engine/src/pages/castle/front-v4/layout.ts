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
  hills: 2,
  castle: 4,
  ground: 6,
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

/** The logical world the composition is authored against. Letterboxed, never stretched. */
export const FRONT_V4_VIEW = { width: 1280, height: 720 } as const;

/** The canonical contact line. Feet, jelly undersides and landed cards all sit here. */
export const GROUND_Y = 590;

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
 * Fit the camera to the host, letterboxing rather than stretching.
 *
 * `removeBounds()` IS THE POINT, and it is the one non-obvious line in this file.
 * Phaser's camera clamp assumes the world is larger than the view; under a fit
 * zoom the view is larger than the world, and `setBounds` then shoves the whole
 * composition against the left edge. The legacy courtyard lost an afternoon to
 * exactly this. Centre on the logical middle instead and let the margins be empty.
 *
 * Kept as one function so the later change — a follow camera with real world
 * bounds, once the world grows east — is a change to this function and nothing
 * else. Combat must never learn the camera's habits.
 */
export function applyFitCamera(camera: Phaser.Cameras.Scene2D.Camera, size: { width: number; height: number }) {
  const zoom = Math.min(size.width / FRONT_V4_VIEW.width, size.height / FRONT_V4_VIEW.height);
  camera.removeBounds();
  camera.setZoom(zoom > 0 ? zoom : 1);
  camera.centerOn(FRONT_V4_VIEW.width / 2, FRONT_V4_VIEW.height / 2);
}

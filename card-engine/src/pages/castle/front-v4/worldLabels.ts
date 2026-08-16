/**
 * Reading the object labels out of a compiled Phaser Editor scene.
 *
 * SEPARATE FROM `worldLoader.ts` FOR ONE REASON, and it is a trap this repository
 * has fallen into before: `worldLoader` imports Phaser as a VALUE (it needs
 * `Phaser.Loader.Events`, `Phaser.Textures.FilterMode`, and the constructor
 * itself), and importing Phaser for real drags its device detection in, which
 * crashes under jsdom. `blastVfx.ts` carries the same warning — three test suites
 * stopped loading the last time someone reached for a Phaser static.
 *
 * So the part worth testing lives here, where nothing imports an engine.
 */

/**
 * Objects whose label starts with this are EDITOR-ONLY and are removed before the
 * game draws a frame.
 *
 * It exists so the Editor can be what-you-see-is-what-you-get. Raheem needs the
 * hero and the creature visible while he places a wall — otherwise he is judging
 * scale against nothing — but the game spawns its own moving, fighting versions
 * of both, and a second static copy underneath would be a ghost standing in the
 * castle forever.
 */
export const EDITOR_ONLY_PREFIX = 'REF_';

/**
 * The label an authored scene uses to say "I provide the ground and the castle."
 *
 * When present, the scene drops its code-drawn stand-ins for those rather than
 * painting underneath them. Everything the Editor cannot express — the sky's
 * gradient, the hills' curves — stays in code either way.
 */
export const AUTHORED_GROUND_LABEL = 'GROUND';

/**
 * A label prefix marking something the player cannot walk past.
 *
 * The level is bounded by the ground at both ends, but the WEST end is supposed
 * to be the castle — Raheem: *"there's gonna be a wall on the left side, and then
 * there's gonna be a castle, and you can't go past the wall."* Without this he
 * walks to the ground's left edge, which is somewhere inside the gatehouse.
 *
 * A wall placed left of the player's spawn pushes the west boundary to its RIGHT
 * edge; one placed to the east pulls the east boundary to its LEFT edge. So the
 * same label closes off either end of the level and nothing has to say which.
 */
export const WALL_PREFIX = 'WALL';

/**
 * A background layer whose PLACEMENT is authored, and whose MOTION is not.
 *
 * Raheem, 2026-08-16, on a background the code had positioned for him: *"the
 * ground is not properly aligned… I would rather adjust it myself."* He is right,
 * and the reason is structural rather than a matter of taste — where the tree line
 * meets the floor is a composition decision made by eye against the castle and the
 * grass, and there is no formula that gets it right, only a number somebody typed.
 *
 * So the split is: the Editor owns WHERE each layer sits, how big it is and how
 * strongly it reads; the code owns how fast it travels. He can drag the tree line
 * down four pixels to sit on the grass without touching a constant, and cannot
 * accidentally flatten the parallax by dragging something, because the rates are
 * not expressed as position at all.
 *
 * These objects are removed from the display list once measured, exactly like
 * `REF_*`, and rebuilt by `backdrop.ts` pinned to the camera. They have to be:
 * an authored object lives in world space and would slide past at full speed,
 * which is the one thing a background must never do.
 */
export const BACKGROUND_PREFIX = 'BG_';

/**
 * The two `REF_*` markers that are ALSO configuration.
 *
 * They started as pure reference art — a hero and a creature to judge a wall
 * against — and were destroyed before the first frame like every other `REF_`.
 * That turned out to be the wrong call. Raheem, 2026-08-16, after halving the hero
 * and shrinking the creature in the Editor and seeing nothing change: *"in my
 * brain, that's where the game is loading from. Is that not what's happening?"*
 *
 * It was: his file was read, those two objects were found, and then deleted, and
 * the game drew its own pair at a size written in `layout.ts`. He was editing a
 * photograph of the game. So they are still destroyed — the game must not draw a
 * frozen second copy of a hero who walks — but their POSITION and SCALE are read
 * off them first and become where each actor spawns and how big it is drawn.
 */
export const ACTOR_MARKERS = {
  hero: 'REF_hero_spawn',
  jelly: 'REF_jelly_spawn',
} as const;

/** The authored layer labels the backdrop knows how to adopt. */
export const BACKGROUND_LABELS = {
  sky: 'BG_SKY',
  mountains: 'BG_MOUNTAINS',
  forest: 'BG_FOREST',
  clouds: ['BG_CLOUD_BROAD', 'BG_CLOUD_MOUND', 'BG_CLOUD_PUFFS', 'BG_CLOUD_SWEEP'],
} as const;

/**
 * Read the object labels out of a compiled Editor scene, in creation order.
 *
 * WHY PARSE RATHER THAN ASK. Phaser Editor's compiler writes each object's label
 * as a comment and a local variable name, and never as `.name` on the object — so
 * at runtime the display list is anonymous. The comments are emitted one per
 * object, immediately before the `this.add.*` that creates it, which makes
 * position in the file a reliable index into the objects `editorCreate` appends.
 *
 * If the Editor's output format ever changes this returns a short or empty list,
 * and the caller is written to degrade rather than guess — removing the wrong
 * object from someone's level is far worse than leaving a ghost visible.
 */
export function parseAuthoredLabels(source: string): string[] {
  const labels: string[] = [];
  const pattern = /\/\/\s*([A-Za-z_][\w-]*)\s*\r?\n\s*(?:const\s+\w+\s*=\s*)?this\.add\./g;
  for (const match of source.matchAll(pattern)) labels.push(match[1]);
  return labels;
}

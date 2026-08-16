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

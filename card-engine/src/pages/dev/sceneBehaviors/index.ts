/**
 * Runtime behaviour by Phaser Editor scene name.
 *
 * /dev/scene stays scene-agnostic — it runs whichever scene it is asked for — so
 * per-scene logic is looked up rather than branched for inside the route.
 *
 * This used to be a hand-kept table, and being a fourth place a walkable scene had
 * to be named is what made CourtyardV3's animals stand still for a week. It is now
 * derived from `SCENE_MANIFEST`, where a scene's behaviour is declared alongside
 * everything else about it and cannot be forgotten separately. Add scenes there.
 */
export { SCENE_BEHAVIORS } from '../../castle/v2/sceneManifest';

export type { SceneBehavior, SceneBehaviorContext, SceneBehaviorFactory } from './types';

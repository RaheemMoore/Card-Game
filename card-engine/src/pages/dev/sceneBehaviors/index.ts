import { attachWildlifeLab } from './wildlifeLab';
import type { SceneBehaviorFactory } from './types';

/**
 * Runtime behaviour by Phaser Editor scene name.
 *
 * /dev/scene stays scene-agnostic — it runs whichever scene it is asked for — so
 * per-scene logic is looked up here rather than branched for inside the route.
 */
export const SCENE_BEHAVIORS: Record<string, SceneBehaviorFactory> = {
  WildlifeLab: attachWildlifeLab,
};

export type { SceneBehavior, SceneBehaviorFactory } from './types';

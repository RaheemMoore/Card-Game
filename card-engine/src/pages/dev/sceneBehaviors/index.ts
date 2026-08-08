import { attachWildlifeLab } from './wildlifeLab';
import { attachCourtyardWildlife } from './courtyardV2';
import type { SceneBehaviorFactory } from './types';

/**
 * Runtime behaviour by Phaser Editor scene name.
 *
 * /dev/scene stays scene-agnostic — it runs whichever scene it is asked for — so
 * per-scene logic is looked up here rather than branched for inside the route.
 */
export const SCENE_BEHAVIORS: Record<string, SceneBehaviorFactory> = {
  WildlifeLab: attachWildlifeLab,
  CourtyardV2: attachCourtyardWildlife,
};

export type { SceneBehavior, SceneBehaviorContext, SceneBehaviorFactory } from './types';

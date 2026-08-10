import { attachWildlifeLab } from './wildlifeLab';
import { attachCourtyardWildlife } from './courtyardWildlife';
import type { SceneBehaviorFactory } from './types';

/**
 * Runtime behaviour by Phaser Editor scene name.
 *
 * /dev/scene stays scene-agnostic — it runs whichever scene it is asked for — so
 * per-scene logic is looked up here rather than branched for inside the route.
 *
 * A SCENE MISSING FROM THIS TABLE IS SILENT, WHICH IS THE TRAP.
 *
 * CourtyardV3 was added to `EXPLORABLE_SCENES`, `YSORT_SCENES` and `ALWAYS_LOADED`
 * in courtyardRuntime.ts — three of the four places a walkable scene must be named
 * — and missed here. The animal sprites were placed, their roam boxes were drawn,
 * their sheets were loaded, they were swept into the depth band, and they sat
 * perfectly still, because nothing was ever attached to move them. Raheem,
 * 2026-08-09: "the animals aren't moving around and showing their usual
 * behaviors."
 *
 * There is no error to catch — an unregistered scene is indistinguishable from a
 * scene that legitimately has no behaviour, like a plate preview. So when a new
 * walkable scene is added, add it in all four places at once.
 */
export const SCENE_BEHAVIORS: Record<string, SceneBehaviorFactory> = {
  WildlifeLab: attachWildlifeLab,
  CourtyardV2: attachCourtyardWildlife,
  CourtyardV3: attachCourtyardWildlife,
};

export type { SceneBehavior, SceneBehaviorContext, SceneBehaviorFactory } from './types';

import type Phaser from 'phaser';
import type { WildlifePoint } from '../../castle/wildlife';

/**
 * Runtime behaviour attached to a Phaser Editor scene by /dev/scene.
 *
 * The Editor compiles `<Name>.scene` to a bare `<Name>.js` that ScenePreview
 * evaluates as TEXT via `new Function` — it is outside Vite's module graph and
 * therefore cannot `import` anything. So logic that wants to be typechecked,
 * tested and linted cannot live in the scene file; it lives here and reaches in.
 *
 * That is not merely a workaround. Phaser Editor rewrites the compiled file on
 * every save, so behaviour kept out of it can never be clobbered by a stale
 * Editor project — which is exactly the hazard the wildlife handoff warns about.
 */
export interface SceneBehavior {
  /** Called once per Phaser frame, after the player has moved this frame. */
  update(now: number, deltaMs: number, playerPosition?: WildlifePoint): void;
  destroy(): void;
}

export type SceneBehaviorFactory = (scene: Phaser.Scene) => SceneBehavior;

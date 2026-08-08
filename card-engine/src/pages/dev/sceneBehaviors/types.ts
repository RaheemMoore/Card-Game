import type Phaser from 'phaser';
import type { WildlifePoint } from '../../castle/wildlife';
import type { Polygon } from '../../castle/v2-preview/walkBlocking';
import type { ElevationMap } from '../../castle/v2-preview/elevation';
import type { SceneWildlife } from '../sceneWildlife';

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

/**
 * What the route has already read out of the scene by the time a behaviour is
 * attached.
 *
 * Both of these MUST be read before `buildDepthBand()` runs, because the band
 * reparents every layer's children into itself and empties the layers they came
 * from. Passing them in rather than letting a behaviour go looking is what makes
 * that ordering a property of the route instead of a trap for each new behaviour.
 */
export interface SceneBehaviorContext {
  /** Traced collision, from the `L14_COLLIDERS` layer. */
  blockers: readonly Polygon[];
  /**
   * Floor levels, from the `L20_GROUND_L*` / `L23_RAMPS` layers.
   *
   * Needed for the same reason the hero needs it: at the foot of a cliff you are
   * behind it and on top of it you are in front, and those are the same Y. An
   * actor that ignores this sorts correctly right up until it climbs something.
   */
  elevation: ElevationMap;
  /** Roaming areas and the animals placed in them, from `L15_WILDLIFE`. */
  wildlife: SceneWildlife;
  /**
   * `?wildlife=show` — draw the authoring aids.
   *
   * A green box you drew is visible when this is on; an improvised home range is
   * invisible ALWAYS, because nothing drew it. That asymmetry is confusing enough
   * to be worth fixing, so behaviours use this to draw the improvised ones too.
   */
  showWildlife: boolean;
}

export type SceneBehaviorFactory = (
  scene: Phaser.Scene,
  context: SceneBehaviorContext,
) => SceneBehavior;

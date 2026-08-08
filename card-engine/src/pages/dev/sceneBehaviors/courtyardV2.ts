import type Phaser from 'phaser';
import {
  WILDLIFE_SPECIES,
  WildlifeAgent,
  WildlifeManager,
  type WildlifeMoveResolver,
  type WildlifePoint,
} from '../../castle/wildlife';
import { feetBlocked, type Polygon, type WalkRect } from '../../castle/v2-preview/walkBlocking';
import {
  levelAt,
  resolveWalkOnLevel,
  type ElevationMap,
} from '../../castle/v2-preview/elevation';
import { LEVEL_STRIDE } from '../sceneDepth';
import {
  ANIMATION_SETS,
  WILDLIFE_FEET,
  createWildlifeAnimations,
  watchReducedMotion,
} from './wildlifeShared';
import type { SceneBehavior, SceneBehaviorContext } from './types';

/**
 * Wildlife in Courtyard V2 — /dev/scene?start=CourtyardV2
 *
 * The same brain the Wildlife Lab runs, given the courtyard's own walls instead
 * of the lab's open floor. That swap is the entire integration, and it is one
 * function: `WildlifeAgent` was built to take an injected `moveResolver` exactly
 * so that a second physics system would never have to exist.
 *
 * Depth needs nothing here either. `buildDepthBand()` has already swept the
 * Editor-placed animals into the y-sorted band with a depth equal to where they
 * meet the ground, and `WildlifeAgent` sets `depth = sprite.y` every frame — the
 * same number, since the sprites are anchored at their feet. So an animal walking
 * behind a tree is occluded, and draws in front again coming south, with no code
 * written about trees.
 */

/** The feet rectangle for an animal standing at a point. */
const feetAt = (
  point: WildlifePoint,
  size: { width: number; height: number },
): WalkRect => ({
  x: point.x - size.width / 2,
  y: point.y - size.height,
  width: size.width,
  height: size.height,
});

/** One animal's live footing. The resolver writes it; the depth pass reads it. */
interface Footing {
  level: number;
}

/**
 * Turn the courtyard's walk resolver into the one the wildlife system asks for.
 *
 * `resolveWalkOnLevel` thinks in feet rectangles, a step and a floor level;
 * `WildlifeMoveResolver` thinks in "here is where I am, here is where I would
 * like to be". Converting between them is the whole of the collision integration.
 *
 * The level version is used rather than plain `resolveWalk` so that height rides
 * along for free: a fox cannot wander up a cliff face, because the floor simply
 * stops being that high there — and it CAN climb the cliff steps, because those
 * are ramps and the same call permits it. The hero uses this identical function,
 * which is the point: whether an actor can reach a ledge is a fact about the
 * geometry, not about which class it happens to be.
 */
function makeMoveResolver(
  size: { width: number; height: number },
  blockers: readonly Polygon[],
  elevation: ElevationMap,
  footing: Footing,
): WildlifeMoveResolver {
  return (current, proposed) => {
    const move = resolveWalkOnLevel(
      feetAt(current, size),
      proposed.x - current.x,
      proposed.y - current.y,
      blockers,
      elevation,
      footing.level,
    );
    footing.level = move.level;
    return { x: move.x + size.width / 2, y: move.y + size.height };
  };
}

/** Amber, so a range the system invented never reads as a box you drew. */
const IMPROVISED_COLOR = 0xffb347;

export function attachCourtyardWildlife(
  scene: Phaser.Scene,
  { blockers, elevation, wildlife, showWildlife }: SceneBehaviorContext,
): SceneBehavior {
  createWildlifeAnimations(scene);

  const manager = new WildlifeManager();
  const drawn: Phaser.GameObjects.Rectangle[] = [];
  const standing: { sprite: Phaser.GameObjects.Sprite; footing: Footing }[] = [];

  if (wildlife.missing) {
    console.info(
      '[wildlife] CourtyardV2 has no L15_WILDLIFE layer yet. Add one, drop animals ' +
        'in it, and draw green #33ff88 rectangles when you want to say where they roam.',
    );
  }
  for (const roaming of wildlife.improvised) {
    console.info(
      `[wildlife] ${roaming} is in no roaming area, so it was given a home range where ` +
        'it stands. Draw a green #33ff88 box around it to say where it should roam instead.',
    );
  }

  for (const placed of wildlife.animals) {
    const profile = WILDLIFE_SPECIES[placed.species];
    const size = WILDLIFE_FEET[placed.species];

    // An animal spawned inside a wall can never take a legal step, so it would
    // stand still forever looking like a bug in the brain. Say so, loudly, with
    // the position — this is a placement problem and only the Editor can fix it.
    if (feetBlocked(feetAt({ x: placed.sprite.x, y: placed.sprite.y }, size), blockers)) {
      console.warn(
        `[wildlife] ${profile.label} is spawned inside a blocker at ` +
          `${Math.round(placed.sprite.x)},${Math.round(placed.sprite.y)} and cannot move. ` +
          'Drag it onto open ground in Phaser Editor.',
      );
    }

    // An improvised range is the only part of this system with nothing on screen
    // to point at, which makes "why is it wandering THERE?" unanswerable. Drawn in
    // amber so the two ways of saying where an animal lives are told apart at a
    // glance: green means you drew it, amber means the system made one up.
    if (showWildlife && placed.improvised) {
      const b = placed.roamBounds;
      drawn.push(
        scene.add
          .rectangle(b.x + b.width / 2, b.y + b.height / 2, b.width, b.height)
          .setStrokeStyle(3, IMPROVISED_COLOR, 0.75)
          .setFillStyle(IMPROVISED_COLOR, 0.07)
          .setDepth(99_000),
      );
    }

    // Which floor it starts on, measured at the centre of its feet exactly as the
    // hero's is. An animal standing where no plate covers reads as level 0.
    const footing: Footing = {
      level:
        levelAt(placed.sprite.x, placed.sprite.y - size.height / 2, elevation) ?? 0,
    };
    standing.push({ sprite: placed.sprite, footing });

    manager.add(
      new WildlifeAgent(placed.sprite, profile, {
        roamBounds: placed.roamBounds,
        animations: ANIMATION_SETS[placed.species],
        moveResolver: makeMoveResolver(size, blockers, elevation, footing),
      }),
    );
  }

  const stopWatchingMotion = watchReducedMotion((off) => manager.setMotionOff(off));

  return {
    update(now, deltaMs, playerPosition) {
      manager.update(now, deltaMs, playerPosition);

      // WildlifeAgent sets `depth = y`, which is right for a flat world and is all
      // the shared library should know. The courtyard has terraces, so the level
      // term is added here — the same split as the move resolver, and for the same
      // reason: the animal owns "where I touch the ground", the scene owns what
      // that means in a world with height.
      for (const { sprite, footing } of standing) {
        sprite.setDepth(footing.level * LEVEL_STRIDE + sprite.y);
      }
    },
    destroy() {
      stopWatchingMotion();
      manager.destroy();
      for (const shape of drawn) shape.destroy();
    },
  };
}

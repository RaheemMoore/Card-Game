import { describe, expect, it } from 'vitest';
import {
  SCENE_MANIFEST,
  EXPLORABLE_SCENES,
  YSORT_SCENES,
  ALWAYS_LOADED,
  SCENE_BEHAVIORS,
} from './sceneManifest';
import { PRODUCTION_SCENE } from './courtyardRuntime';
import { SCENE_BEHAVIORS as BEHAVIORS_VIA_DEV } from '../../dev/sceneBehaviors';

/**
 * The invariants a manifest row has to satisfy.
 *
 * Consolidating the four lists into one record removes the half-registered
 * scene — you cannot now add a scene to three places out of four, because there
 * is one place. What it does NOT remove is a row that is internally incoherent:
 * walkable with no behaviour attached, or running the wildlife brain without the
 * sheets that brain animates. Both still render, and both still fail silently, so
 * they are asserted rather than trusted.
 */

describe('scene manifest', () => {
  it('leaves no walkable scene silently inert', () => {
    // The original failure: sprites placed, roam boxes drawn, sheets loaded, and
    // the animals standing perfectly still because nothing was attached to move
    // them. An unregistered scene looks exactly like a scene that legitimately
    // has no behaviour, so nothing throws.
    const inert = [...EXPLORABLE_SCENES].filter((name) => !SCENE_MANIFEST[name]?.behavior);
    expect(inert).toEqual([]);
  });

  it('gives the wildlife brain the sheets it animates', () => {
    // A scene can carry a behaviour and no alwaysLoaded and look fine: the animal
    // appears on its move sheet, then every clip reached only through the brain —
    // sniff, drink, nibble — fails to load with no error. Two thirds of a
    // behaviour missing reads as "the animals are boring", not as a bug.
    const starved = Object.entries(SCENE_MANIFEST)
      .filter(([, t]) => t.behavior && !(t.alwaysLoaded?.length ?? 0))
      .map(([name]) => name);
    expect(starved).toEqual([]);
  });

  it('only y-sorts scenes you can walk around in', () => {
    // Y-sorting reparents every object into one band. Doing that to a scene with
    // no hero rearranges a fixed clip arrangement for no one's benefit.
    const sortedButUnwalkable = [...YSORT_SCENES].filter((name) => !EXPLORABLE_SCENES.has(name));
    expect(sortedButUnwalkable).toEqual([]);
  });

  it('derives every lookup from the same rows', () => {
    // Guards the consolidation itself: if these ever stop agreeing, the manifest
    // has grown a second source of truth and the trap is back.
    for (const [name, traits] of Object.entries(SCENE_MANIFEST)) {
      expect(EXPLORABLE_SCENES.has(name)).toBe(traits.explorable);
      expect(YSORT_SCENES.has(name)).toBe(traits.ySort);
      expect(ALWAYS_LOADED[name]).toBe(traits.alwaysLoaded);
      expect(SCENE_BEHAVIORS[name]).toBe(traits.behavior);
    }
  });

  it('serves the dev route the same behaviours as the castle', () => {
    // /dev/scene imports through sceneBehaviors and the shell through the
    // manifest. The whole point is that Raheem's harness and a player's castle
    // run the same code, so these must be the same object, not two tables.
    expect(BEHAVIORS_VIA_DEV).toBe(SCENE_BEHAVIORS);
  });

  it('describes the courtyard /castle loads as walkable, sorted and alive', () => {
    const production = SCENE_MANIFEST[PRODUCTION_SCENE];
    expect(production).toBeDefined();
    expect(production.explorable).toBe(true);
    expect(production.ySort).toBe(true);
    expect(production.behavior).toBeTruthy();
  });

  it('runs both courtyards on the same brain', () => {
    expect(SCENE_MANIFEST.CourtyardV3.behavior).toBe(SCENE_MANIFEST.CourtyardV2.behavior);
  });
});

import { attachWildlifeLab } from '../../dev/sceneBehaviors/wildlifeLab';
import { attachCourtyardWildlife } from '../../dev/sceneBehaviors/courtyardWildlife';
import type { SceneBehaviorFactory } from '../../dev/sceneBehaviors/types';
import { allEffectTextureKeys } from '../combat/effectKit';

/**
 * What every Phaser Editor scene is, declared once.
 *
 * THE TRAP THIS REPLACES. A walkable scene used to be named in four separate
 * places — `EXPLORABLE_SCENES`, `YSORT_SCENES` and `ALWAYS_LOADED` in
 * courtyardRuntime.ts, and `SCENE_BEHAVIORS` in sceneBehaviors/index.ts. Three
 * were lists of strings and the fourth a lookup table, so the compiler could not
 * relate them, and a scene present in three of four produced no error anywhere.
 * CourtyardV3 landed exactly that way: sprites placed, roam boxes drawn, sheets
 * loaded, swept into the depth band, and standing perfectly still, because nothing
 * had been attached to move them. Raheem, 2026-08-09: "the animals aren't moving
 * around and showing their usual behaviors."
 *
 * An unregistered scene is indistinguishable from a scene that legitimately has no
 * behaviour, so there was nothing to throw. The fix is not a better comment — the
 * old one warned about this in detail and it happened anyway. It is making the
 * four facts one record, so a scene cannot be half-registered: adding a row is
 * adding all four, and the sets below are derived rather than maintained.
 *
 * `sceneManifest.test.ts` holds the invariants a row still has to satisfy.
 */

/**
 * Texture keys a scene needs that never appear in its compiled source.
 *
 * `entriesUsedBy` finds keys by looking for them quoted in the code, which works
 * only for textures sitting on a placed object. Both wildlife scenes place an
 * animal on its MOVE sheet; sniff, sit-and-listen and nibble are reached solely
 * through animations created at run time, so nothing would name them and they
 * would silently fail to load — no error, just an animal missing two thirds of
 * its behaviour.
 */
const WILDLIFE_SHEETS = [
  'wildlife-fox-trot',
  'wildlife-fox-sniff',
  'wildlife-fox-sit-alert',
  // Drinking is reached only through the brain, so nothing names this sheet
  // either — and it caught exactly the failure this comment warns about the very
  // first time a clip was added after the list was written. Add the key here
  // whenever a new clip lands, or it loads in the review lab and nowhere else.
  'wildlife-fox-drink',
  'wildlife-rabbit-hop',
  'wildlife-rabbit-nibble-groom',
  'wildlife-rabbit-drink',
  'wildlife-tortoise-toddle',
  'wildlife-fish-swim',
  'wildlife-tortoise-float',
] as const;

/**
 * The pre-resampled hero sheets, kept loadable in every walkable scene.
 *
 * `entriesUsedBy` only loads textures the compiled scene names, and no scene
 * names these — they are chosen at run time by `?hero=`. Without this the flag
 * silently falls back to a missing texture, which Phaser draws as a green box
 * and reports nowhere.
 */
const HERO_SIZE_TESTS = ['hero-chibi-56', 'hero-chibi-48', 'hero-chibi-40'] as const;

/**
 * Clips the hero plays that are not his walking sheet.
 *
 * Same trap as the two lists around it, and it has now caught FOUR different
 * assets: no scene NAMES these, because they are played from code, so
 * entriesUsedBy skips them and the clip silently never runs. The knockdown
 * shipped registered, packed, timed and unplayable for exactly this reason.
 *
 * `hero-card-slam` was the fourth, found 2026-08-13 when Raheem reported "there
 * is no animation associated with the summon". There was: `startSummon` plays
 * it, guarded by `anims.exists()`. The sheet was packed, the anchor measured
 * and the 17 frames approved on 2026-08-07 — and because it was missing from
 * THIS list the texture never loaded, so the animation was never created, so
 * the guard was false and the summon ran silently every single time. The guard
 * that was supposed to prevent a crash hid the bug instead.
 */
const HERO_CLIPS = [
  'hero-knockdown',
  'hero-card-slam',
  'hero-card-blast',
  'hero-card-blast-right',
  'hero-card-blast-up',
  'hero-card-blast-down',
] as const;

/**
 * The Ember Jelly's sheet. Same reason as HERO_CLIPS above: no scene file NAMES
 * it, because the construct is spawned by code rather than placed in the
 * Editor, so entriesUsedBy would skip it and the enemy would silently fall back
 * to nothing. This is the trap that shipped hero-card-slam unplayable for six
 * days.
 */
const CONSTRUCT_CLIPS = ['construct-ember-jelly'] as const;

/**
 * The elemental blast and impact sheets.
 *
 * Same reason as the size tests: no scene NAMES them, because which element a
 * player fires is decided at run time by the cards in their hand. Left out,
 * entriesUsedBy would skip all 52 and every blast would fall back to the
 * placeholder circle with nothing reporting why.
 */
const EFFECT_SHEETS = allEffectTextureKeys();

export interface SceneTraits {
  /**
   * Gets the walkable hero.
   *
   * WildlifeLab is explorable because its subject IS the reaction to a player —
   * the animals' flee and observe radii cannot be reviewed without something to
   * walk at them — so it needs the hero for the same reason the courtyard does.
   */
  explorable: boolean;

  /**
   * Objects are collapsed into one y-sorted band (see sceneDepth.ts).
   *
   * Opt-in rather than universal: y-sorting reparents every object, which is
   * right for a world you walk around in and wrong for a lab whose whole job is
   * to show clips in a fixed arrangement.
   */
  ySort: boolean;

  /** Per-scene runtime behaviour, attached after the compiled scene is built. */
  behavior?: SceneBehaviorFactory;

  /** Texture keys to force-load because nothing in the scene source names them. */
  alwaysLoaded?: readonly string[];
}

export const SCENE_MANIFEST: Record<string, SceneTraits> = {
  CourtyardV2: {
    explorable: true,
    ySort: true,
    behavior: attachCourtyardWildlife,
    alwaysLoaded: [...WILDLIFE_SHEETS, ...HERO_SIZE_TESTS, ...HERO_CLIPS, ...CONSTRUCT_CLIPS, ...EFFECT_SHEETS],
  },
  CourtyardV3: {
    explorable: true,
    ySort: true,
    behavior: attachCourtyardWildlife,
    alwaysLoaded: [...WILDLIFE_SHEETS, ...HERO_SIZE_TESTS, ...HERO_CLIPS, ...CONSTRUCT_CLIPS, ...EFFECT_SHEETS],
  },
  WildlifeLab: {
    explorable: true,
    ySort: false,
    behavior: attachWildlifeLab,
    alwaysLoaded: [...WILDLIFE_SHEETS, ...HERO_SIZE_TESTS, ...HERO_CLIPS, ...CONSTRUCT_CLIPS, ...EFFECT_SHEETS],
  },
};

const rows = Object.entries(SCENE_MANIFEST);

export const EXPLORABLE_SCENES = new Set(
  rows.filter(([, t]) => t.explorable).map(([name]) => name),
);

export const YSORT_SCENES = new Set(rows.filter(([, t]) => t.ySort).map(([name]) => name));

export const ALWAYS_LOADED: Record<string, readonly string[]> = Object.fromEntries(
  rows.filter(([, t]) => t.alwaysLoaded).map(([name, t]) => [name, t.alwaysLoaded!]),
);

export const SCENE_BEHAVIORS: Record<string, SceneBehaviorFactory> = Object.fromEntries(
  rows.filter(([, t]) => t.behavior).map(([name, t]) => [name, t.behavior!]),
);

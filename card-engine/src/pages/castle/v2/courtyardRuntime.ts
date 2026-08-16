/**
 * The courtyard runtime — one scene, two front doors.
 *
 * This was the inside of `/dev/scene` until 2026-08-08, when the courtyard had to
 * become the real castle. Raheem, logging in and finding the old one: "all of this
 * work isn't in production for me to log in and actually see and access and walk
 * around."
 *
 * It is extracted rather than copied FOR THAT REASON. A debug harness and the
 * shipped game that drift apart are worse than having no harness: you review one
 * thing and players walk another. Collision, elevation, jumping, depth sorting and
 * the hero all live here, once, and `/dev/scene` and `/castle` are both thin shells
 * over it.
 *
 * What differs between them is only what the SHELL does — the harness reads URL
 * flags and prints diagnostics; the castle opens doors and a pause menu. The world
 * itself is the same code either way.
 */

import {
  HERO_FACINGS,
  HERO_SHEET,
  HERO_WALK_FPS,
  HERO_WORLD_HEIGHT,
  idleFrame,
  walkFrames,
  walkKey,
  type HeroFacing,
} from '../../../data/castle/heroSprite';
import { SCENE_BEHAVIORS, type SceneBehavior } from '../../dev/sceneBehaviors';
import { readSceneColliders, type SceneColliders } from '../../dev/sceneColliders';
import { readSceneWildlife, type SceneWildlife } from '../../dev/sceneWildlife';
import {
  readSceneElevation,
  elevationShapes,
  readSceneDoors,
  type DoorDestination,
  type SceneDoor,
} from '../../dev/sceneColliders';
import { GROUND_SHADOW as HERO_SHADOW, makeGroundShadowTexture } from '../groundShadow';
import { buildDepthBand, LEVEL_STRIDE } from '../../dev/sceneDepth';
import { feetBlocked } from '../v2-preview/walkBlocking';
import {
  EMPTY_ELEVATION,
  JUMP_MS,
  JUMP_RISE,
  jumpArc,
  levelAt,
  resolveJump,
  resolveWalkOnLevel,
  unlandablePlates,
  type ElevationMap,
} from '../v2-preview/elevation';
import { HERO_FEET } from '../../../data/castle/heroSprite';
import {
  CARD_SLAM_ANCHOR,
  CARD_SLAM_ANIM,
  CARD_SLAM_DURATIONS_MS,
  CARD_SLAM_SHEET,
} from '../../../data/castle/cardSlamSprite';
import {
  CARD_BLAST_SHEETS,
  CARD_BLAST_EXIT_BLEND_MS,
  CARD_BLAST_TURN_MS,
  cardBlastFrame,
  cardBlastFacingForAim,
  cardBlastLayerOffsetsForAim,
  cardBlastMuzzleForAim,
  type CardBlastFacing,
  type CardBlastPhase,
} from '../../../data/castle/cardBlastSprite';
import { KEEPERS } from '../../../data/castle/keepers';
import {
  KNOCKDOWN_ANCHOR,
  KNOCKDOWN_ANIM,
  KNOCKDOWN_DURATIONS_MS,
  KNOCKDOWN_SHEET,
} from '../../../data/castle/knockdownSprite';
import { EXPLORABLE_SCENES, YSORT_SCENES } from './sceneManifest';
import { quantiseFacing, resolveAim, initialAim, type AimState, type Vec2 } from '../combat/aim';
import { ELEMENT_NAMES, type ElementName } from '../../../types/bible';
import { buildAimInputs, moveVector, newPointerTracker } from '../combat/inputIntent';
import {
  ACTION_TIMING,
  initialAction,
  locksFiringStanceMovement,
  stepAction,
  walkScale,
  type ActionState,
} from '../combat/actionState';
import { attackStyleFor, resolveAction, type AttackStyle } from '../combat/cardActions';
import {
  CONSTRUCT_TUNING,
  forcePhase,
  initialConstruct,
  isHittable,
  resetConstruct,
  reviveConstruct,
  setAiEnabled,
  setStrongHits,
  stepConstruct,
  strikeHits,
  type ConstructHit,
  type ConstructState,
} from '../combat/construct';
import { createConstructView, type ConstructView } from './constructPresenter';
import { combatDevEnabled, createCombatDevCommands } from './combatDev';
import {
  canFire,
  commitSelected,
  recoverCard,
  scatterHand,
  type DroppedCard,
  cycleSelection,
  emptyHand,
  handFromCards,
  releaseCommitted,
  selectSlot,
  summonSelected,
  type Hand,
} from '../combat/hand';
import { effectKitFor, type EffectKit } from '../combat/effectKit';
import {
  colourOf,
  createBlastSprite,
  createChargeEmitter,
  playDirectionalBurst,
  playImpact,
  updateChargeEmitter,
} from '../combat/blastVfx';
import {
  PICKUP_RADIUS,
  SCATTER_FLIGHT_MS,
  scatterArc,
  scatterPoints,
} from '../combat/scatter';
import {
  CARD_HEIGHT_PX,
  DEFAULT_BLAST,
  cardOrigin,
  scaleBlast,
  spawnProjectile,
  stepProjectile,
  type BlastTarget,
  type Projectile,
} from '../combat/blast';
import {
  HITSTOP_CAP_MS,
  getAttackFeel,
  getHitFeel,
  louder,
  severityForCharge,
  type HitSeverity,
} from '../combat/feel';
import { attackPose, cardPose } from '../combat/attackPose';
import { createHitstop, type Hitstop } from './hitstop';
import { resolveMotionLevel } from './motionLevel';
import type { MotionLevel } from '../../../vfx/types';

export const DEFAULT_SCENE = 'CourtyardV2';

/**
 * The courtyard `/castle` actually loads.
 *
 * V3 took over on 2026-08-12. It is the scene built on the Halo Stone kit, the one
 * in the recording, and the one combat is being built into; V2 was the forge
 * quadrant and three unfinished ones. The switch waited on a readiness gate rather
 * than on the scene merely existing — see castleReadiness.test.ts, which is that
 * gate written down.
 *
 * It is a constant and not a literal because the name was written three times in
 * CastleV2.tsx — the source, the always-loaded lookup, and the scene itself — and
 * two out of three is a courtyard that loads V3's art with V2's animation sheets.
 *
 * There is no fallback to V2, deliberately. Raheem, 2026-08-12: "I don't have any
 * plans to go back to v two. We're moving on past that." V2 stays loadable from
 * `/dev/scene` for comparison, but nothing a player touches reaches it.
 */
export const PRODUCTION_SCENE = 'CourtyardV3';

/**
 * Every pack that might supply textures. The Editor's scenes reference keys from
 * all of them and the compiled code carries no loader of its own, so a preview
 * loads the lot — this is a dev route and correctness beats a few hundred KB.
 */
const PACKS = [
  '/asset-pack.json',
  '/assets/kits/halo-stone-castle/kit-pack.json',
  '/assets/wildlife-lab/wildlife-lab-pack.json',
];

export type PackEntry = {
  type: string;
  key: string;
  url: string;
  frameConfig?: { frameWidth: number; frameHeight: number };
};

/**
 * Reads the packs and makes every URL root-absolute.
 *
 * This is not tidiness — it is the fix for a black screen on 2026-08-07. Pack URLs
 * are written relative ("assets/kits/..."), and a relative URL resolves against the
 * PAGE, not the site root. `/castle` is one segment deep so its base is `/` and it
 * got away with it for months; `/dev/scene` is two deep, so every asset resolved to
 * `/dev/assets/...`. Vite's dev server answers unknown paths with index.html — HTTP
 * 200, `text/html` — so nothing 404'd, nothing reported as failed, and all 291
 * textures quietly became HTML pages. The scene ran and drew nothing.
 *
 * Loading them by hand also means a failure is a named key rather than a silence.
 */
export async function loadPackEntries(): Promise<PackEntry[]> {
  const seen = new Set<string>();
  const out: PackEntry[] = [];

  for (const packUrl of PACKS) {
    const res = await fetch(packUrl);
    if (!res.ok) continue;
    const pack = (await res.json()) as Record<string, { files?: PackEntry[] }>;
    for (const [section, body] of Object.entries(pack)) {
      if (section === 'meta' || !body?.files) continue;
      for (const file of body.files) {
        // First pack wins: asset-pack.json is the curated one, the kit is bulk.
        if (seen.has(file.key)) continue;
        seen.add(file.key);
        out.push({ ...file, url: file.url.startsWith('/') ? file.url : `/${file.url}` });
      }
    }
  }
  return out;
}

/**
 * The Editor rewrites the compiled file on every save, so it is always fetched
 * fresh — a stale copy is indistinguishable from "my changes did not show up".
 */
export async function fetchSceneSource(sceneName: string): Promise<string> {
  const res = await fetch(`/editor-scenes/${sceneName}.js?t=${Date.now()}`);
  if (!res.ok) throw new Error(`${sceneName}.js: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Narrows 288 pack entries down to the ones this scene names.
 *
 * Every texture key appears in the compiled source as a quoted string, so a plain
 * substring test is enough and cannot miss one. Worth doing because this route gets
 * refreshed after every save — loading the whole studio each time is a tax on the
 * loop this route exists to make fast.
 */
export function entriesUsedBy(source: string, entries: PackEntry[], always: string[]): PackEntry[] {
  const used = entries.filter((e) => source.includes(`"${e.key}"`) || always.includes(e.key));
  // If a scene somehow names nothing we recognise, load everything rather than
  // render an empty world and call it success.
  return used.length > 0 ? used : entries;
}

/**
 * How much world the camera shows.
 *
 * Was 2 — the Editor's own zoom, chosen so pieces read at the size they were
 * placed at. That is the right number for *authoring* and the wrong one for
 * *playing*: at zoom 2 a 1080p window sees 960x540 world px (30x17 tiles) and
 * the 100px hero eats 18.5% of the screen height. Measured against the top-down
 * reference Raheem is aiming at (2026-08-08), the hero there occupies ~12% and
 * the view runs ~40 tiles wide. 1.5 lands at 13.9% and 40x22 tiles.
 *
 * Non-integer zoom on pixel art normally costs you uneven pixel widths. It costs
 * nothing here, because this scene's structures are already placed at 1.4, 1.18,
 * 1.14 and 2 — the grid-exact read was gone before the camera touched it.
 *
 * `?zoom=` overrides it at run time so framing can be A/B'd without a rebuild.
 */
const DEFAULT_ZOOM = 1.5;

function resolveZoom(): number {
  const raw = new URLSearchParams(window.location.search).get('zoom');
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ZOOM;
}

/**
 * Hero size, overridable at run time so scale can be judged in play.
 *
 * Two independent knobs, and conflating them is why "is he too big?" has been
 * hard to answer:
 *
 *   HOW BIG HE READS  — `?heroHeight=` in world units against 32px tiles.
 *   HOW SHARP HE IS   — `?hero=` picks which pre-resampled sheet supplies the
 *                       pixels. 36x71 is the shipped one; 56/48/40 were area-
 *                       averaged offline for exactly this comparison.
 *
 * Both are FREE. The camera and the display size cost nothing to change, where
 * regenerating the character costs money and throws away an approved identity —
 * so this question gets settled with flags before anything is generated.
 *
 * Nothing here rescales the castle. Its pieces are placed by hand in the Editor
 * at scales Raheem chose, and they are approved art; making the world bigger to
 * suit the hero is the expensive way round.
 */
const HERO_SHEETS: Record<string, { key: string; frameHeight: number }> = {
  chibi: { key: HERO_SHEET.key, frameHeight: HERO_SHEET.frameHeight },
  '56': { key: 'hero-chibi-56', frameHeight: 56 },
  '48': { key: 'hero-chibi-48', frameHeight: 48 },
  '40': { key: 'hero-chibi-40', frameHeight: 40 },
};

function resolveHeroSheet(): { key: string; frameHeight: number } {
  const asked = new URLSearchParams(window.location.search).get('hero');
  return (asked && HERO_SHEETS[asked]) || HERO_SHEETS.chibi;
}

/**
 * `?element=` overrides what the hand fires.
 *
 * Without it the blast art is unreachable on a fresh profile: practice cards
 * carry no element, so every shot falls back to the placeholder circle and the
 * 27 elements of PixelLab art might as well not be there. Reviewing art you
 * cannot make appear is not reviewing it.
 *
 * One element fills every slot (`?element=fire`); a comma-separated list deals
 * them out per slot (`?element=fire,void,storm,ice`), which is the form worth
 * having — comparing elements means switching between them with 1-4 in the same
 * courtyard under the same light, not reloading the page four times.
 *
 * Case-insensitive and validated against the Bible's own list, so a typo shows
 * as the placeholder rather than as a missing texture.
 */
function resolveForcedElements(): ElementName[] {
  const raw = new URLSearchParams(window.location.search).get('element');
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => ELEMENT_NAMES.find((e) => e.toLowerCase() === part.trim().toLowerCase()))
    .filter((e): e is ElementName => e !== undefined);
}

function resolveHeroHeight(): number {
  const raw = new URLSearchParams(window.location.search).get('heroHeight');
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : HERO_WORLD_HEIGHT;
}

const WALK_SPEED = 190;

/**
 * The hand a profile with no cards gets.
 *
 * Combat has to be testable before the forge has been used — on a fresh account,
 * in the harness, and in a scene loaded straight from the Editor. These are ids
 * that deliberately match no real card, so anything that resolves one and finds
 * nothing is looking at a placeholder rather than at corrupt data.
 */
const PLACEHOLDER_CARD_IDS = ['practice_1', 'practice_2', 'practice_3', 'practice_4'] as const;

/**
 * What the four practice cards are made of.
 *
 * WHY THIS EXISTS. Raheem, testing on 2026-08-13: "Right now, I'm only testing
 * with the pseudo blue ball that's shooting out. It doesn't really relate to any
 * card." He was looking at `launchBlast`'s fallback circle — the placeholder
 * cards carried NO element, so `effectKitFor` had nothing to resolve, and the
 * entire 26-element art library the courtyard already loads was unreachable in
 * the only situation anyone actually tests in.
 *
 * A hand that cannot show what a card does is not a testable hand. These four
 * are chosen to be told apart at a glance and to exercise the pipeline
 * honestly: Fire and Blood because Raheem named them, Storm and Void because
 * they are the most visually distant from those two and from each other. All
 * four have their own animated stream art rather than a family stand-in.
 *
 * Overridden by `?element=`, and never used at all once the profile has real
 * forged cards — those bring their own.
 */
const PRACTICE_ELEMENTS: readonly ElementName[] = ['Fire', 'Blood', 'Storm', 'Void'];


/**
 * DEV-only framing readout on `window.__cardEngineDev.castleFraming`.
 *
 * CourtyardV2 shipped with no observation handle at all — the `Phaser.Game` is a
 * closure local in `CastleV2.tsx`, so nothing outside that effect can see the
 * camera. That made "is the zoom right?" a question answerable only by eyeballing
 * a screenshot, which is exactly the failure mode the runtime bridge spec exists
 * to prevent. The legacy plate courtyard has a full bridge (`courtyard/studioBridge.ts`);
 * this is the small equivalent for the scene that replaced it.
 *
 * Deliberately just the framing numbers, not a scenario runner: the question this
 * answers is how much world is on screen and how big the hero reads against it,
 * which is the thing that gets tuned and the thing a screenshot lies about.
 */
function publishFramingBridge(scene: Phaser.Scene, sceneName: string): void {
  if (!import.meta.env.DEV) return;
  const cam = scene.cameras.main;
  const dev = ((window as unknown as Record<string, unknown>).__cardEngineDev ??= {}) as Record<
    string,
    unknown
  >;
  /**
   * Who owns aim, and where it points, on `__cardEngineDev.castleAim()`.
   *
   * Aim ownership is invisible until something is fired, and by then a wrong
   * owner looks like a projectile bug. This makes the arbitration observable
   * while walking: hold a stick, waggle the mouse, watch `owner` change and
   * confirm that a resting hand does not.
   */
  dev.castleAim = () => {
    const s = scene as unknown as { aim?: { owner: string; aim: { x: number; y: number }; facing: string; ownerActiveAt: number } };
    if (!s.aim) return null;
    return {
      owner: s.aim.owner,
      facing: s.aim.facing,
      aim: { x: +s.aim.aim.x.toFixed(3), y: +s.aim.aim.y.toFixed(3) },
      degrees: +((Math.atan2(s.aim.aim.y, s.aim.aim.x) * 180) / Math.PI).toFixed(1),
      ownerIdleMs: Math.round(scene.time.now - s.aim.ownerActiveAt),
    };
  };

  /**
   * The attack, on `__cardEngineDev.castleCombat()`.
   *
   * The phase and the live projectiles are the two things a screenshot cannot
   * show — a still frame cannot distinguish "recovering" from "stuck", which is
   * precisely the failure an animation-driven state machine would produce.
   */
  dev.castleCombat = () => {
    const s = scene as unknown as {
      action?: {
        phase: string;
        elapsedMs: number;
        chargeLevel: number;
        committedAim: { x: number; y: number } | null;
        releaseKind: string | null;
        graceRemainingMs: number;
      };
      projectiles?: { sim: { id: number; pos: { x: number; y: number }; outcome: string } }[];
      targets?: { pos: { x: number; y: number }; alive: boolean }[];
      motion?: string;
      presentDelta?: number;
      hitstop?: { active(): boolean; remainingMs(): number };
    };
    if (!s.action) return null;
    const scn = scene as unknown as {
      hand?: { slots: { cardId: string | null; state: string }[]; selected: number | null };
      player?: Phaser.GameObjects.Sprite;
      fireStats?: Record<string, number | string>;
    };
    const hand = scn.hand;
    const ids = (hand?.slots ?? []).map((x) => x.cardId).filter(Boolean);
    const p = scn.player;
    return {
      /**
       * What the hero sprite ACTUALLY is right now.
       *
       * "He just turns into a dark spot" is one symptom covering four different
       * causes — wrong texture, wrong frame, wrong origin, wrong scale — and a
       * screenshot cannot separate them. This can, in one paste.
       */
      hero: p
        ? {
            texture: p.texture?.key,
            frame: String(p.frame?.name),
            anim: p.anims?.currentAnim?.key ?? null,
            playing: p.anims?.isPlaying ?? false,
            origin: { x: p.originX, y: +p.originY.toFixed(3) },
            scale: { x: +p.scaleX.toFixed(3), y: +p.scaleY.toFixed(3) },
            // The lean, in radians. Added 2026-08-13: the pose gained rotation
            // and the readout could not see it, so "is he tilting?" was a
            // question only a screenshot could answer — which is exactly the
            // gap this bridge exists to close.
            rotation: +p.rotation.toFixed(3),
            display: { w: Math.round(p.displayWidth), h: Math.round(p.displayHeight) },
            visible: p.visible,
            alpha: p.alpha,
          }
        : null,
      /**
       * Whether the textures the CODE plays are actually in memory.
       *
       * Nothing in the scene source names these, so they load only by being in
       * alwaysLoaded — the trap that has now silently disabled three assets.
       */
      textures: {
        knockdown: scene.textures.exists('hero-knockdown'),
        walk: scene.textures.exists('hero-chibi'),
        fireStream: scene.textures.exists('fx-lash-fire-stream'),
      },
      /**
       * Where the fire chain breaks, rather than merely that it did.
       *
       * input -> charging -> release -> windup -> fireThisStep -> projectile.
       * Each counter is the last stage that was reached.
       */
      fire: scn.fireStats ?? null,
      /**
       * How the picture is behaving, as distinct from the simulation.
       *
       * `presentDelta` reading 0 while the game is plainly still running is the
       * signature of a hitstop in progress, and it is the one thing that
       * separates "the freeze worked" from "the game hung" — which look
       * identical in a screenshot and want completely different fixes.
       */
      feel: {
        motion: s.motion ?? 'full',
        hitstopActive: s.hitstop?.active() ?? false,
        hitstopRemainingMs: Math.round(s.hitstop?.remainingMs() ?? 0),
        presentDeltaMs: Math.round(s.presentDelta ?? 0),
      },
      // Cards lying in the world. A scatter that strands one is the failure this
      // whole milestone is about, so it is reported rather than eyeballed.
      onGround: (
        scene as unknown as { pickups?: { card: { cardId: string }; to: { x: number; y: number } }[] }
      ).pickups?.map((p) => ({
        cardId: p.card.cardId,
        x: Math.round(p.to.x),
        y: Math.round(p.to.y),
      })) ?? [],
      hand: hand
        ? {
            selected: hand.selected,
            slots: hand.slots.map((x) => `${x.cardId ?? '-'}:${x.state}`),
            // The §7.4 invariant, checkable from outside rather than believed.
            noDuplicates: ids.length === new Set(ids).size,
          }
        : null,
      phase: s.action.phase,
      elapsedMs: Math.round(s.action.elapsedMs),
      // The one number the player is acting on and the screen only hints at.
      chargeLevel: +s.action.chargeLevel.toFixed(2),
      // Which of the card's two slots the in-flight shot came from. A tap and a
      // hold look identical in a screenshot and dispatch differently.
      releaseKind: s.action.releaseKind,
      element:
        (scene as unknown as { selectedKit?: () => { exact: boolean; stream: { key: string } | null } })
          .selectedKit?.()?.stream?.key ?? 'placeholder',
      committedAim: s.action.committedAim,
      // How long he still cannot be knocked down for. A knockdown that "did not
      // happen" is either a missed strike or an active grace, and those need
      // opposite fixes.
      graceMs: Math.round(s.action.graceRemainingMs),
      /**
       * The encounter, from the construct's side.
       *
       * The whole conversation is here in one paste: what it is doing, which way
       * it is pointing, how close he is, and whether its strikes are landing.
       * "The telegraph never fired" and "it fired and I walked out of it" are
       * indistinguishable on screen and are the two things most likely to be
       * reported as the same bug.
       */
      construct: (() => {
        const c = (scene as unknown as { construct?: ConstructState }).construct;
        if (!c) return null;
        const p = scn.player;
        return {
          phase: c.phase,
          elapsedMs: Math.round(c.elapsedMs),
          hp: c.hp,
          facing: { x: +c.facing.x.toFixed(2), y: +c.facing.y.toFixed(2) },
          pos: { x: Math.round(c.pos.x), y: Math.round(c.pos.y) },
          distance: p ? Math.round(Math.hypot(p.x - c.pos.x, p.y - c.pos.y)) : null,
          committedTarget: c.committedTarget && {
            x: Math.round(c.committedTarget.x),
            y: Math.round(c.committedTarget.y),
          },
          aiEnabled: c.aiEnabled,
          strongHits: c.strongHits,
          stats: (scene as unknown as { constructStats?: Record<string, number | string> })
            .constructStats,
        };
      })(),
      projectiles: (s.projectiles ?? []).map((p) => ({
        id: p.sim.id,
        x: Math.round(p.sim.pos.x),
        y: Math.round(p.sim.pos.y),
        outcome: p.sim.outcome,
      })),
      targets: s.targets ?? [],
    };
  };

  /**
   * Commands that CHANGE the encounter, on `__cardEngineDev.combat`.
   *
   * Everything else on this bridge only reads. These write, so they are behind
   * `?combatDev=1` as well as the DEV build — see combatDev.ts for why they have
   * to exist at all rather than being driven through the keyboard.
   */
  if (combatDevEnabled()) {
    const s = scene as unknown as {
      construct?: ConstructState;
      constructHome: { x: number; y: number };
      player?: Phaser.GameObjects.Sprite;
      feetY: number;
      forceKnockdown(): void;
      placeHeroAt(x: number, y: number): void;
      previewImpact(severity: HitSeverity): void;
      scriptShot(holdMs: number): void;
      runScenario(): void;
      feetX: number;
    };
    dev.combat = createCombatDevCommands({
      getConstruct: () => s.construct,
      setConstruct: (next) => {
        s.construct = next;
      },
      home: () => s.constructHome,
      heroFeet: () => ({ x: s.feetX ?? 0, y: s.feetY }),
      knockdownHero: () => s.forceKnockdown(),
      placeHero: (x, y) => s.placeHeroAt(x, y),
      triggerImpact: (severity) => s.previewImpact(severity),
      fireBlast: (holdMs) => s.scriptShot(holdMs),
      runScenario: () => s.runScenario(),
      snapshot: () => (dev.castleCombat as () => unknown)(),
    });
  }

  dev.castleFraming = () => {
    const hero = (scene as unknown as { player?: Phaser.GameObjects.Sprite }).player;
    const tile = 32;
    return {
      scene: sceneName,
      zoom: cam.zoom,
      viewportDevice: { width: cam.width, height: cam.height },
      visibleWorld: { width: cam.width / cam.zoom, height: cam.height / cam.zoom },
      visibleTiles: {
        x: +(cam.width / cam.zoom / tile).toFixed(2),
        y: +(cam.height / cam.zoom / tile).toFixed(2),
      },
      hero: hero
        ? {
            worldHeight: +hero.displayHeight.toFixed(1),
            screenHeight: +(hero.displayHeight * cam.zoom).toFixed(1),
            pctOfScreenHeight: +((hero.displayHeight * cam.zoom) / cam.height * 100).toFixed(1),
            tilesTall: +(hero.displayHeight / tile).toFixed(2),
          }
        : null,
    };
  };
}

/**
 * Which scenes are walkable, y-sorted, animated and force-loaded now lives in one
 * record — see sceneManifest.ts for why these were four hand-kept lists and what
 * it cost. Re-exported here because this module is what the shell and the preview
 * import; the manifest is the declaration, this is the door to it.
 */
// NOT re-exported from here. Tunnelling the manifest's bindings back out through
// this module broke the Vite dev server outright ("Export 'ALWAYS_LOADED' is not
// defined in module") while tsc and the production build both stayed happy — and
// a runtime that only fails in dev is the worst place to hide a barrel. Import
// them from './sceneManifest', which is where they are declared anyway.

export type Status = { phase: 'loading' | 'ready' | 'error'; message?: string };

/**
 * What the shell around the world wants to know.
 *
 * The runtime never opens a UI itself. It reports that the hero is standing in a
 * doorway and that they pressed the key; what a door OPENS is the shell's business.
 * That is what lets `/dev/scene` ignore doors entirely while `/castle` turns the
 * same event into the Forge.
 */
/** What the shell needs to draw the hand. A snapshot, not the live object. */
export interface HandView {
  selected: number | null;
  slots: {
    cardId: string | null;
    state: string;
    /** The element's colour, so a slot LOOKS like what it fires. Null when empty. */
    tint: string | null;
  }[];
  /**
   * Increments each time he tries to fire with nothing to fire.
   *
   * Without it, being disarmed is indistinguishable from the game being broken:
   * Raheem played 52 seconds with all four cards on the ground, pressing fire,
   * and reported the attack as broken — which it was not. The shell pulses the
   * row so the answer is on screen at the moment the question is asked.
   */
  blockedCount: number;
  /**
   * What the Card-wright is doing, so the row can answer for the attack.
   *
   * Duplicated from `CombatStateView.heroPhase` on purpose: that view is the
   * TEST readout and comes out with the R/T/Y keys when the courtyard stops
   * being a test surface. The hand is player-facing chrome and has to keep
   * working after that, so it carries what it needs itself rather than
   * depending on a panel that is scheduled for deletion.
   */
  phase: string;
  /**
   * How far the charge has built, 0–1, QUANTIZED.
   *
   * Rounded to twelfths before it is sent, and the shell transitions between
   * the steps in CSS. A continuous value would re-render React on every frame
   * of every charge to move a bar a fraction of a pixel — the same cost
   * `emitCombatState` refuses to pay for the distance readout, for the same
   * reason. Twelve steps over 900ms is about one render every 75ms and the
   * transition makes it look continuous anyway.
   */
  charge: number;
}

/**
 * The encounter, in words, for the on-screen readout.
 *
 * Everything here was previously only reachable by typing a function call into
 * the browser's developer console — which assumed the person testing the game
 * knows what a developer console is. Raheem, reasonably: "what the fuck is the
 * console?" The information was never the problem; the door to it was.
 */
export interface CombatStateView {
  phase: string;
  hp: number;
  maxHp: number;
  distance: number;
  /** Whether its strike knocks him down, toggled with Y. */
  strongHits: boolean;
  /** Whether it is allowed to act at all, toggled with T. */
  aiEnabled: boolean;
  /** What the Card-wright is doing. */
  heroPhase: string;
  /** Milliseconds of knockdown protection left, so the grace is visible. */
  graceMs: number;
}

export interface RuntimeHooks {
  /** Fires when the hero steps into or out of a doorway. `null` on leaving. */
  onDoorChange?: (destination: DoorDestination | null) => void;
  /** Fires when they press E while standing in one. */
  onDoorEnter?: (destination: DoorDestination) => void;
  /** Fires on Escape. The pause menu is the shell's, not the world's. */
  onPause?: () => void;
  /**
   * Fires whenever the hand changes — selection, commit, drop or recovery.
   *
   * The row of card slots is the shell's, drawn in the DOM alongside the doorway
   * prompt and the pause menu. The world reports what it holds; it does not draw
   * a HUD.
   */
  onHandChange?: (hand: HandView) => void;
  /**
   * Fires when the encounter changes, for the on-screen combat readout.
   *
   * It exists because "open the console and paste this" is not a usable
   * instruction — Raheem's words, and he was right: the whole point of a
   * training instrument is that a human can watch it work without being a
   * programmer. What was a `__cardEngineDev` call is now a panel on the screen.
   *
   * Deliberately NOT gated behind a dev flag, and that is a temporary state of
   * affairs rather than a decision: it sits in the same category as the R/T/Y
   * keys and the controls list, which are all visible because the courtyard is
   * still a test surface with four unwired stalls. All of it comes out together
   * when this stops being somewhere Raheem tests and starts being somewhere a
   * player lives.
   */
  onCombatState?: (state: CombatStateView) => void;
  /**
   * The cards to fill the hand with, most-recent first.
   *
   * Passed in rather than read from storage here so the world stays independent
   * of persistence — `/dev/scene` can hand it fixtures, and the castle hands it
   * the player's real collection, without the scene knowing which is which.
   *
   * The element rides along because it decides which blast art the card fires;
   * looking it up later would mean the world reaching back into the collection.
   */
  cards?: readonly { cardId: string; element?: ElementName }[];
}

export function makeScene(
  Phaser: typeof import('phaser'),
  sceneName: string,
  source: string,
  entries: PackEntry[],
  report: (s: Status) => void,
  hooks: RuntimeHooks = {},
) {
  return class PreviewScene extends Phaser.Scene {
    private player?: Phaser.GameObjects.Sprite;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd?: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
    private compiledUpdate?: (time: number, delta: number) => void;
    private behavior?: SceneBehavior;
    private facing: HeroFacing = 'down';
    private colliders: SceneColliders = {
      blockers: [],
      zones: [],
      water: [],
      walkBlockers: [],
      shapes: [],
      missing: true,
    };
    private wildlife: SceneWildlife = {
      animals: [],
      areas: [],
      water: [],
      shapes: [],
      improvised: [],
      missing: true,
    };
    private depthBand?: Phaser.GameObjects.Layer;
    private sortedCount = 0;
    /**
     * Aim is resolved every frame even with no combat in the scene yet.
     *
     * It costs nothing, and it means the seam is exercised by ordinary walking
     * from the day it lands rather than first being run on the day a projectile
     * needs it — which is when an input bug would be hardest to tell apart from a
     * projectile bug.
     */
    private aim: AimState = initialAim();
    private pointerTracker = newPointerTracker();
    private action: ActionState = initialAction();
    private projectiles: {
      sim: Projectile;
      gfx: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
      kit: EffectKit;
      charge: number;
      /** Visible height above the ground-plane simulation point. */
      drawHeightPx: number;
    }[] = [];
    /** Element per card id, so a shot knows which art it wears. */
    private cardElements = new Map<string, ElementName | undefined>();
    private chargeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private targets: BlastTarget[] = [];
    /**
     * The training construct. One, for now, and deliberately not a list — the
     * slice is proving one complete conversation, and a crowd is a different
     * problem (spacing, aggro, who telegraphs when) that would hide whether the
     * single one reads.
     */
    private construct?: ConstructState;
    private constructView?: ConstructView;
    /** Where it resets to, so repeated test loops all start from one place. */
    private constructHome = { x: 0, y: 0 };
    /** Damage waiting to be applied on the construct's next step. */
    private pendingHits: ConstructHit[] = [];
    /** Set when its strike lands on him; consumed by the action machine. */
    private constructStruckHero: 'light' | 'strong' | null = null;
    /**
     * How hard the hits waiting in `pendingHits` landed.
     *
     * Carried BESIDE the hits rather than on them. `ConstructHit` is part of the
     * pure state machine's contract and severity is a presentation question; a
     * field the simulation neither reads nor needs has no business in its input
     * type. The runtime already knows the charge at the moment it queues a hit,
     * so this costs nothing to keep in step.
     */
    private pendingHitSeverity: HitSeverity | null = null;
    /**
     * Which way the loudest pending hit was travelling.
     *
     * Force with no direction is the difference between "something happened
     * here" and "he was hit from over there", and a camera that only ever
     * rattles can say the first but never the second.
     */
    private pendingHitDir: { x: number; y: number } = { x: 1, y: 0 };
    /** The directional camera lurch, so a second hit can replace rather than fight it. */
    private cameraKick?: Phaser.Tweens.Tween;
    /**
     * Milliseconds left on a scripted trigger hold. See `scriptShot`.
     *
     * A number rather than a boolean because the whole point is the LENGTH of
     * the hold: that is what the action machine turns into a charge, and the
     * charge is what every part of the attack's weight scales on.
     */
    private scriptedHoldMs = 0;
    /** Aim locked for the duration of a scripted hold, so the shot lands where asked. */
    private scriptedAim: { x: number; y: number } | null = null;
    /**
     * DEV counters for the encounter, alongside the fire chain's.
     *
     * Same reasoning: "the telegraph never fired" and "it fired and missed" look
     * identical from the outside and need very different fixes.
     */
    private constructStats: Record<string, number | string> = {
      telegraphs: 0,
      strikes: 0,
      strikesLanded: 0,
      defeats: 0,
      lastPhase: 'disabled',
    };
    /**
     * Reduced motion, as the scene's own flag.
     *
     * Read by the shake, the bob and the telegraph pulse. The tell itself is a
     * SHAPE and survives this being on — see the presenter.
     */
    private motionOff = false;
    /**
     * How much motion the player consented to, resolved once on create.
     *
     * Was previously nothing at all: `motionOff` above was declared, read in two
     * places, and NEVER ASSIGNED, so the courtyard's reduced-motion handling was
     * a flag permanently stuck on false. Resolving it properly is the first
     * thing the feel work owes anyone who needs it — every new effect from here
     * reads this.
     */
    private motion: MotionLevel = 'full';
    /** The contact freeze. Presentation only; see hitstop.ts for why. */
    private hitstop?: Hitstop;
    /**
     * How long the hero is still visibly flinching, ms.
     *
     * A decaying counter rather than a tween because it has to COMPOSE with the
     * attack pose: he can be shot while braced to cast, and a tween writing the
     * sprite's scale directly would be overwritten by `applyHeroTransform` on
     * the very next frame. As a number, the flinch is just another term in the
     * one place that decides what he looks like.
     */
    private heroHurtMs = 0;
    /** Total length of the flinch in progress, so it can decay proportionally. */
    private heroHurtSpanMs = 1;
    /** Which way the blow came from, so he folds away from it rather than at random. */
    private heroHurtDir: { x: number; y: number } = { x: 0, y: 1 };
    /** The one hurt-flash timer, so a second hit replaces it instead of racing it. */
    private heroFlashTimer?: Phaser.Time.TimerEvent;
    /**
     * Pending steps of the named scenario.
     *
     * Held so a second run cancels the first rather than interleaving with it —
     * two overlapping scripts would produce a sequence that matches neither and
     * is reproducible as nothing.
     */
    private scenarioTimers: Phaser.Time.TimerEvent[] = [];
    /**
     * Elapsed time for PRESENTERS, which is zero while a hit is being held.
     *
     * Deliberately a separate number from the `delta` the state machines get.
     * One frame, two clocks: the simulation never stops, the picture does.
     */
    private presentDelta = 0;
    /** The card he holds up. Visible only while a shot is being thrown. */
    private heldCard?: Phaser.GameObjects.Rectangle;
    /** True while the approved directional firing sheets own the body. */
    private usingCardBlastSprite = false;
    /** Cardinal art currently receiving aim; charge progress is shared across all four. */
    private cardBlastFacing: CardBlastFacing | null = null;
    /** Previous pose, briefly retained so a held turn reads as motion rather than a cut. */
    private cardBlastBlendFrom: CardBlastFacing | null = null;
    private cardBlastBlendElapsedMs = CARD_BLAST_TURN_MS;
    private cardBlastBlendSprite?: Phaser.GameObjects.Sprite;
    /** Walking-sheet pose faded in over the final recovery beat. */
    private cardBlastExitSprite?: Phaser.GameObjects.Sprite;
    /**
     * Whether a card is selected and ready to fire.
     *
     * One card, hardcoded, for this milestone. The four-slot hand keyed to real
     * card IDs is the next one — wiring the collection in before a single blast
     * feels right would mean tuning the verb through a menu.
     */
    /**
     * The four cards he carries.
     *
     * Seeded from the player's real collection where there is one, and from
     * placeholder ids otherwise so the courtyard is testable on a fresh profile.
     * The hand owns which card is where; nothing here writes a slot directly.
     */
    private hand: Hand = emptyHand();
    private slotKeys: Phaser.Input.Keyboard.Key[] = [];
    private shoulderHeld = false;
    /** Slot index of the shot in flight, so its card is released when it lands. */
    private committedSlot: number | null = null;
    /** Cards lying in the world, waiting to be walked over. */
    private pickups: {
      card: DroppedCard;
      from: Vec2;
      to: Vec2;
      /** Milliseconds since it was thrown; drives the hop and then the bob. */
      ageMs: number;
      gfx: Phaser.GameObjects.Rectangle;
    }[] = [];
    private knockdownKey?: Phaser.Input.Keyboard.Key;
    private summonKey?: Phaser.Input.Keyboard.Key;
    /** Characters standing in the world, and which slot each came out of. */
    private summons: { slotIndex: number; sprite: Phaser.GameObjects.Sprite }[] = [];
    /** The card lying on the ground mid-ritual, before the character rises. */
    private ritualCard?: Phaser.GameObjects.Rectangle;
    private summonTimers: Phaser.Time.TimerEvent[] = [];
    /** Edge-detects the fall, so the scatter fires once rather than every frame. */
    private wasDown = false;
    /** Which sheet the hero is actually drawn from this run. */
    private heroSheetKey: string = HERO_SHEET.key;
    /** Scale the walking sheet renders at, restored after the fall's sheet swap. */
    private heroScale = 1;
    private standUpTimer?: Phaser.Time.TimerEvent;

    /** Walk animation key, namespaced so two sheets cannot share a cycle. */
    private heroWalkKey(facing: HeroFacing) {
      return `${this.heroSheetKey}:${walkKey(facing)}`;
    }
    /**
     * Fire is held rather than tapped, which gives repeat fire at the cadence of
     * windup + active + recovery. The state machine only leaves `explore` on a
     * press, so holding cannot outrun the recovery it is gated behind.
     */
    private fireHeld = false;
    /**
     * Set by a keydown/pointerdown event, cleared once the frame has seen it.
     *
     * Events cannot be missed the way polled state can, so this guarantees a tap
     * is always worth at least one frame of charge and therefore always fires.
     */
    private firePressedLatch = false;
    /**
     * Set when the shot must be abandoned rather than finished.
     *
     * The cases are all the same shape: the key-up that would have ended the
     * charge is never going to arrive. Losing window focus, hiding the tab and
     * opening a stall over the canvas all stop the keyboard reaching us mid-hold,
     * and without this he stands there holding a card until the page is reloaded.
     * Latched like the fire press so the frame cannot miss it.
     */
    private cancelLatch = false;
    /** How many times he has pressed fire with no card able to answer. */
    private blockedCount = 0;
    /**
     * DEV counters for the fire chain, read by __cardEngineDev.castleCombat().
     *
     * Every stage the press has to survive gets its own tally, so a report of
     * "shooting is broken" resolves to a stage instead of a guess. They only
     * ever increment, so a stuck stage is the last one with a number.
     */
    private fireStats: Record<string, number | string> = {
      latchHits: 0,
      framesHeld: 0,
      enteredCharging: 0,
      enteredWindup: 0,
      fireSteps: 0,
      projectilesSpawned: 0,
      quickReleases: 0,
      heavyReleases: 0,
      cancels: 0,
      scaffoldDispatches: 0,
      lastPhase: 'explore',
      lastReleaseKind: 'none',
      lastScaffold: 'none',
    };
    private elevation: ElevationMap = EMPTY_ELEVATION;
    /**
     * Truth for collision, level and depth. The SPRITE's y is this minus the
     * jump arc, which is display only — conflating the two is how a jump becomes
     * a hero who can walk through walls at the top of his hop.
     */
    private feetY = 0;
    /**
     * Truth for the hero's horizontal position — the counterpart to `feetY`.
     *
     * WHY THIS APPEARED. The sprite's own `x` used to BE the truth, which was
     * fine for as long as the sprite stood exactly where the character stood.
     * The attack lunge broke that: the drawn body now leans, steps and settles
     * through a throw while the character it belongs to has not moved an inch.
     * Collision, depth, the blast's origin and the strike test all read this;
     * only the picture reads the sprite. Conflating them would mean a hero who
     * could be drawn — and hit — a lunge's distance from where he really is,
     * which is the same class of bug the comment on `feetY` above warns about
     * for the jump.
     */
    private feetX = 0;
    /**
     * The scale the current sheet is meant to render at, before the pose.
     *
     * Tracked rather than read back off the sprite because the pose MULTIPLIES
     * it every frame: reading the sprite's own scale would compound the squash
     * into a hero who shrinks to nothing over a few throws.
     */
    private heroBaseScale = 1;
    private level = 0;
    private air = 0;
    private jumpKey?: Phaser.Input.Keyboard.Key;
    private jump?: { fromX: number; fromY: number; toX: number; toY: number; toLevel: number; t: number; ok: boolean };
    private shadow?: Phaser.GameObjects.Image;
    private doors: SceneDoor[] = [];
    /** Which doorway the feet are in right now. Reported on change only. */
    private atDoor: DoorDestination | null = null;
    private interactKey?: Phaser.Input.Keyboard.Key;
    private fireKey?: Phaser.Input.Keyboard.Key;
    private pauseKey?: Phaser.Input.Keyboard.Key;
    /** Which zones the feet were inside last frame, so enter/leave fire once. */
    private insideZones = new Set<number>();

    constructor() {
      super('scene-preview');
    }

    private failedKeys: string[] = [];

    preload() {
      for (const e of entries) {
        if (e.type === 'spritesheet' && e.frameConfig) {
          this.load.spritesheet(e.key, e.url, e.frameConfig);
        } else {
          this.load.image(e.key, e.url);
        }
      }

      this.load.on('loaderror', (file: Phaser.Loader.File) => {
        this.failedKeys.push(file.key);
      });
    }

    create() {
      // Pixel art only ever gets upscaled here, never smoothed. Phaser's default
      // is LINEAR, which is the single most common cause of "the art looks bad".
      for (const key of this.textures.getTextureKeys()) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }

      let map: Phaser.Tilemaps.Tilemap | undefined;
      try {
        // The compiled file is a bare `class <Name> extends Phaser.Scene` with no
        // export, so it is evaluated in a function scope with Phaser injected.
        // Copy its non-lifecycle helpers onto this preview scene before running
        // create(): generated create methods call helpers such as editorCreate(),
        // createFoxAnimations(), and playFoxAnimation() through `this`.
        const factory = new Function('Phaser', `${source}\n;return ${sceneName};`) as (
          p: typeof Phaser,
        ) => {
          prototype: Record<string, unknown> & {
            editorCreate?: () => void;
            create?: () => void;
            update?: (time: number, delta: number) => void;
          };
        };
        const Compiled = factory(Phaser);
        const compiled = Compiled.prototype;
        const runtime = this as unknown as Record<string, unknown>;

        for (const name of Object.getOwnPropertyNames(compiled)) {
          if (name === 'constructor' || name === 'create' || name === 'update' || name === 'preload') {
            continue;
          }
          const value = compiled[name];
          if (typeof value === 'function') runtime[name] = value;
        }

        if (typeof compiled.create === 'function') {
          compiled.create.call(this);
        } else if (typeof compiled.editorCreate === 'function') {
          compiled.editorCreate.call(this);
        } else {
          throw new Error(`${sceneName} has no create() or editorCreate() method`);
        }

        if (typeof compiled.update === 'function') {
          this.compiledUpdate = compiled.update;
        }
        map = (this as unknown as Record<string, Phaser.Tilemaps.Tilemap | undefined>)
          .courtyardGround;
      } catch (err) {
        report({ phase: 'error', message: `Scene code failed: ${String(err)}` });
        return;
      }

      // Read the collision layer before anything is hidden, then hide it. The
      // shapes are authoring aids: they are drawn in the Editor to be looked at,
      // and they must never be visible over the finished art unless asked for.
      this.colliders = readSceneColliders(this);
      const params = new URLSearchParams(window.location.search);
      const showColliders = params.get('colliders') === 'show';
      for (const shape of this.colliders.shapes) {
        shape.setVisible(showColliders);
      }

      // Same deal for the roaming areas, and for the same ordering reason: the
      // depth band below empties every layer it sweeps, so both must be read now.
      this.wildlife = readSceneWildlife(this);
      const showRoamAreas = params.get('wildlife') === 'show';
      for (const shape of this.wildlife.shapes) {
        shape.setVisible(showRoamAreas);
      }

      // Elevation MUST be read before the depth band: the band asks every object
      // what level it stands on, and a band built first puts the whole world on
      // level 0 — a failure whose symptom (bad sorting) looks nothing like its cause.
      const doorLayer = readSceneDoors(this);
      this.doors = doorLayer.doors;
      const showDoors = params.get('doors') === 'show';
      for (const shape of doorLayer.shapes) shape.setVisible(showDoors);

      this.elevation = readSceneElevation(this);
      const showLevels = params.get('levels') === 'show';
      for (const shape of elevationShapes(this)) {
        shape.setVisible(showLevels);
      }

      // Silent unreachability is what this system fails at. A terrace too small to
      // stand on can be seen and never visited, with no error anywhere.
      for (const bad of unlandablePlates(this.elevation, HERO_FEET.width, HERO_FEET.height)) {
        console.warn(
          `[elevation] level ${bad.level} plate is ${Math.round(bad.width)}x${Math.round(bad.height)} — too small to land on (feet are ${HERO_FEET.width}x${HERO_FEET.height}).`,
        );
      }

      // World size comes from the tilemap when there is one, and from whatever was
      // placed when there is not — a lab scene with no map still needs bounds.
      // MUST run before the depth band: it walks the scene's children, and the
      // band reparents most of them into a Layer, which has no bounds of its own.
      const bounds = map
        ? new Phaser.Geom.Rectangle(0, 0, map.widthInPixels, map.heightInPixels)
        : this.computeContentBounds();

      // Collapse the Editor's layers into one y-sorted band, so a wall and the
      // hero can sort against each other at all. See sceneDepth.ts.
      if (YSORT_SCENES.has(sceneName)) {
        const band = buildDepthBand(this, this.elevation);
        this.depthBand = band.layer;
        this.sortedCount = band.sorted;

        // Scale references and MISSING-wall notes are notes to Raheem, not scenery.
        const markers = (this as unknown as Record<string, Phaser.GameObjects.Layer | undefined>)
          .l11_MARKERS;
        markers?.setVisible(
          new URLSearchParams(window.location.search).get('markers') === 'show',
        );
      }

      const cam = this.cameras.main;
      cam.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);
      cam.setZoom(resolveZoom());

      // Explorable scenes get the temporary player. This once excluded every lab
      // on the grounds that a hero hides the subject — true of a lab that only
      // plays clips, but WildlifeLab's subject is how the animals REACT to a
      // player, so there it is the hero's absence that hides the subject.
      if (EXPLORABLE_SCENES.has(sceneName)) {
        this.spawnPlayer(bounds);
        // After spawnPlayer, so the dummy can be placed relative to a world that
        // already knows where the hero stands, and after the depth band so both
        // it and the held card join the same sorted layer as everything else.
        this.setupCombat(bounds, hooks.cards ?? []);
      }

      if (this.player) {
        // Follow wherever there IS a hero, rather than naming one scene. This was
        // `sceneName === 'CourtyardV2'`, which meant every new walkable scene
        // silently got a static camera until someone remembered this line.
        //
        // Snap first, then follow. A lerped follow starting from 0,0 spends its first
        // second looking at the corner of the map, which reads as "nothing loaded".
        cam.centerOn(this.feetX, this.player.y);
        cam.startFollow(this.player, true, 0.12, 0.12);
      } else {
        // A lab is small enough to hold in one shot; a camera that chases the
        // hero around it would keep the other animals off screen.
        cam.centerOn(bounds.centerX, bounds.centerY);
      }

      publishFramingBridge(this, sceneName);

      // Runtime behavior for scenes that have some. The Editor's compiled file
      // cannot import it (see sceneBehaviors/types.ts), so it is attached here.
      this.behavior = SCENE_BEHAVIORS[sceneName]?.(this, {
        blockers: this.colliders.blockers,
        elevation: this.elevation,
        wildlife: this.wildlife,
        showWildlife: showRoamAreas,
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.behavior?.destroy();
        this.behavior = undefined;
      });

      // Keep the camera the size of the window as it changes.
      this.scale.on('resize', (size: Phaser.Structs.Size) => {
        this.cameras.resize(size.width, size.height);
      });

      report({
        phase: 'ready',
        message: this.failedKeys.length
          ? `${this.failedKeys.length} texture(s) failed: ${this.failedKeys.slice(0, 6).join(', ')}`
          : this.sortedCount
            ? `${this.sortedCount} y-sorted · ${this.colliders.blockers.length} blockers · ${this.elevation.plates.length} level plates`
            : undefined,
      });
    }

    /** Union of everything the Editor placed, padded, for scenes with no tilemap. */
    private computeContentBounds() {
      const r = new Phaser.Geom.Rectangle(0, 0, 0, 0);
      let first = true;
      for (const child of this.children.list) {
        const obj = child as Phaser.GameObjects.Image;
        if (typeof obj.getBounds !== 'function') continue;
        const b = obj.getBounds();
        if (first) {
          Phaser.Geom.Rectangle.CopyFrom(b, r);
          first = false;
        } else {
          Phaser.Geom.Rectangle.Union(r, b, r);
        }
      }
      if (first) return new Phaser.Geom.Rectangle(0, 0, 1920, 1080);
      return new Phaser.Geom.Rectangle(r.x - 400, r.y - 400, r.width + 800, r.height + 800);
    }

    private spawnPlayer(bounds: Phaser.Geom.Rectangle) {
      const url = new URLSearchParams(window.location.search);
      const x = Number(url.get('x') ?? bounds.centerX);
      const y = Number(url.get('y') ?? bounds.centerY);

      const sheet = resolveHeroSheet();
      const scale = resolveHeroHeight() / sheet.frameHeight;
      // Remembered because the knockdown swaps to its own sheet and has to put
      // this back afterwards.
      this.heroScale = scale;
      this.heroBaseScale = scale;

      this.feetX = x;
      this.feetY = y;
      this.level = levelAt(x, y - HERO_FEET.height / 2, this.elevation) ?? 0;

      // The shadow is not decoration. A sprite that lifts with nothing left behind
      // on the floor reads as sliding, not jumping — the shadow is the only thing
      // that tells you the ground did not move. So it ships before the jump does,
      // and it improves plain walking on its own.
      this.shadow = this.add
        .image(x, y, makeGroundShadowTexture(this))
        .setOrigin(0.5, 0.5)
        .setAlpha(HERO_SHADOW.alpha);

      this.player = this.add
        .sprite(x, y, sheet.key, idleFrame('down'))
        .setOrigin(0.5, 1)
        .setScale(scale)
        // Fallback for a scene with no depth band: above every Editor layer,
        // because the Editor's draw order is list order and nothing it emits
        // reaches five figures. In a y-sorted scene this is immediately replaced
        // by the hero's own feet Y — see movePlayer.
        .setDepth(100000);

      // The hero has to be a SIBLING of the walls to sort against them. Phaser
      // sorts by depth within a parent, so a hero in the scene root and a wall in
      // the band would never compare no matter what depths they carried.
      if (this.depthBand) {
        this.depthBand.add(this.player);
        this.depthBand.add(this.shadow);
      }
      this.applyHeroTransform();

      // Animation keys are namespaced BY SHEET. Phaser's animation manager is
      // global, so a plain `hero-walk-down` created from the 36x71 sheet would be
      // reused when a smaller sheet is selected — idle from one sheet and the
      // walk cycle from another, which is the "hero shrank 25% walking left"
      // failure the sprite playbook was written about.
      this.heroSheetKey = sheet.key;
      for (const f of HERO_FACINGS) {
        const key = this.heroWalkKey(f);
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: walkFrames(f).map((frame) => ({ key: sheet.key, frame })),
          frameRate: HERO_WALK_FPS,
          repeat: -1,
        });
      }

      // The fall. Per-frame durations rather than a frame rate, so the trip stays
      // fast between the emphasized impact and landing. The state machine adds
      // the required grounded punishment after this animation finishes.
      if (this.textures.exists(KNOCKDOWN_SHEET.key) && !this.anims.exists(KNOCKDOWN_ANIM)) {
        this.anims.create({
          key: KNOCKDOWN_ANIM,
          frames: KNOCKDOWN_DURATIONS_MS.map((duration, i) => ({
            key: KNOCKDOWN_SHEET.key,
            frame: i,
            duration,
          })),
          repeat: 0,
        });
      }

      // The approved 17-frame summoning performance. Per-frame durations again,
      // and for a stronger reason than the fall: the 280ms opening hold is the
      // presentation and the 700ms final hold is the palm on the ground, which is
      // the moment the character is allowed to appear. A uniform frame rate
      // destroys both and the ritual stops reading as a ritual.
      if (this.textures.exists(CARD_SLAM_SHEET.key) && !this.anims.exists(CARD_SLAM_ANIM)) {
        this.anims.create({
          key: CARD_SLAM_ANIM,
          frames: CARD_SLAM_DURATIONS_MS.map((duration, i) => ({
            key: CARD_SLAM_SHEET.key,
            frame: i,
            duration,
          })),
          repeat: 0,
        });
      }

      const keyboard = this.input.keyboard!;
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
      this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      this.fireKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
      // Latch the press from the EVENT as well as polling the key, so a tap that
      // starts and ends between two frames still counts.
      keyboard.on('keydown-F', () => {
        this.firePressedLatch = true;
      });
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.leftButtonDown()) this.firePressedLatch = true;
      });
      this.bindCancelSources(keyboard);
      // A controlled source of knockdown until real enemies exist. K is a
      // deliberate stand-in for being hit hard, so the scatter-and-recover loop
      // can be played and tuned before anything in the world can hit him.
      this.knockdownKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      // G for the summon. Not F (fire), E (door), SPACE (hop) or K (fall).
      this.summonKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.G);
      // 1-4 pick a card. ONE/TWO/THREE/FOUR are the number row, not the numpad;
      // a laptop without a numpad is the common case, not the exception.
      this.slotKeys = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR,
      ].map((code) => keyboard.addKey(code));
      this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      /**
       * Combat test keys, on the keyboard rather than in a console.
       *
       * R revive/reset, T freeze its brain, Y arm the knockdown. Audited clear
       * of everything above (WASD, SPACE, E, F, G, K, 1-4, ESC) and of the
       * wildlife lab's F/T, which only bind in the WildlifeLab scene.
       *
       * These are the three commands the playtest script needed, and asking a
       * human to type `__cardEngineDev.combat.setStrongHits(true)` to reach one
       * of them was a design failure, not a documentation gap.
       */
      keyboard.on('keydown-Y', () => {
        if (!this.construct) return;
        this.construct = setStrongHits(this.construct, !this.construct.strongHits);
        this.emitCombatState();
      });
      keyboard.on('keydown-T', () => {
        if (!this.construct) return;
        this.construct = setAiEnabled(this.construct, !this.construct.aiEnabled);
        this.emitCombatState();
      });
      keyboard.on('keydown-R', () => {
        if (!this.construct) return;
        this.construct = resetConstruct(this.construct, this.constructHome);
        this.emitCombatState();
      });

      /**
       * The benchmark, on two keys: `,` a tap and `.` a full charge.
       *
       * Same reasoning as the three above, and the same design failure it would
       * be to omit them. Charge is the axis EVERY part of the feel scales on,
       * and the only way to hold a chosen charge by hand is to time a mouse
       * press to the millisecond — which nobody can do, and which the preview
       * pane makes impossible outright by pinning the button down. Two adjacent
       * keys let the lightest and heaviest hits be fired back to back, from the
       * same spot, as many times as it takes to judge them.
       *
       * `,` and `.` are audited clear of every binding above and sit next to
       * each other on the keyboard, which is the point: the comparison is the
       * review.
       */
      keyboard.on('keydown-COMMA', () => this.scriptShot(0));
      keyboard.on('keydown-PERIOD', () => this.scriptShot(ACTION_TIMING.chargeMaxMs + 60));
      // The whole exchange, on one key. Pressing it again restarts rather than
      // layering a second script on top of the first.
      keyboard.on('keydown-P', () => this.runScenario());
    }

    /**
     * Listen for every way a hold can end without a key-up.
     *
     * Charging waits for a release. If the browser stops delivering keyboard
     * events mid-hold — the window loses focus, the tab is hidden, a stall opens
     * over the canvas — that release never comes, and he charges a card forever
     * with no error anywhere. These are DOM listeners rather than Phaser ones
     * because the events are the browser's, not the game's, and they must arrive
     * precisely when the game has stopped being the thing with focus.
     *
     * `resetKeys` matters as much as the latch: Phaser caches `isDown`, so a key
     * held at the moment focus was lost stays down in the poll after focus
     * returns, and the state machine would go straight back to charging.
     */
    private bindCancelSources(keyboard: Phaser.Input.Keyboard.KeyboardPlugin) {
      const cancel = () => {
        this.cancelLatch = true;
        this.firePressedLatch = false;
        keyboard.resetKeys();
      };
      const onBlur = () => cancel();
      const onVisibility = () => {
        if (document.visibilityState === 'hidden') cancel();
      };
      window.addEventListener('blur', onBlur);
      document.addEventListener('visibilitychange', onVisibility);
      // Phaser raises this when the canvas loses focus or the game is paused,
      // which covers the cases the two DOM events do not.
      this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.on(Phaser.Core.Events.PAUSE, onBlur);

      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        window.removeEventListener('blur', onBlur);
        document.removeEventListener('visibilitychange', onVisibility);
        this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
        this.game.events.off(Phaser.Core.Events.PAUSE, onBlur);
      });
    }

    /**
     * Push `feetY`, `level` and `air` onto the sprite and its shadow.
     *
     * One place, called from every path, so the sprite can never disagree with the
     * state the collision maths is using.
     */
    private applyHeroTransform() {
      if (!this.player) return;

      /**
       * The throw, drawn onto the body.
       *
       * Applied HERE and nowhere else, for the same reason everything else in
       * this method is: one funnel means the sprite can never disagree with the
       * state the collision maths is using. Note the asymmetry that is the
       * whole point — `feetX`/`feetY`/`level` decide depth and collision and do
       * not know the pose exists; only the three lines that touch the sprite
       * read it.
       */
      const pose = attackPose({
        style: this.attackStyle(),
        phase: this.action.phase,
        elapsedMs: this.action.elapsedMs,
        chargeLevel: this.action.chargeLevel,
        aim: this.poseAim(),
        feel: getAttackFeel(severityForCharge(this.action.chargeLevel), this.motion),
      });

      /**
       * The flinch, folded in on top of whatever he was doing.
       *
       * He can be hit while braced to cast, so this ADDS to the pose rather than
       * replacing it — one body, two things happening to it. Decays to nothing,
       * so it can never strand him bent over.
       */
      const hurt = this.heroHurtMs > 0 ? this.heroHurtMs / this.heroHurtSpanMs : 0;
      const hurtSquash = hurt * 0.16;

      this.player.x = this.feetX + pose.offsetX + this.heroHurtDir.x * hurt * 5;
      this.player.y = this.feetY - this.air + pose.offsetY + this.heroHurtDir.y * hurt * 3;
      const scaleX = this.heroBaseScale * pose.scaleX * (1 + hurtSquash * 0.5);
      const scaleY = this.heroBaseScale * pose.scaleY * (1 - hurtSquash);
      this.player.setScale(scaleX, scaleY);
      // The sprite's origin is already at his feet, so this pivots him where a
      // person pivots rather than around his navel.
      this.player.setRotation(pose.rotation);
      // Depth from the TRUE feet, not the drawn ones. A lunge must not let him
      // sort in front of a wall he is still standing behind.
      this.player.setDepth(
        this.depthBand ? this.level * LEVEL_STRIDE + this.feetY : 100000,
      );

      // During a directional turn the outgoing and incoming authored poses share
      // this exact transform. Only their alpha differs, so the feet, recoil, hurt
      // fold, depth, and continuous aim all remain one body rather than two actors.
      if (this.cardBlastBlendSprite?.visible) {
        this.cardBlastBlendSprite.setPosition(this.player.x, this.player.y);
        this.cardBlastBlendSprite.setScale(scaleX, scaleY);
        this.cardBlastBlendSprite.setRotation(pose.rotation);
        this.cardBlastBlendSprite.setDepth(this.player.depth + 0.001);
      }

      if (this.cardBlastExitSprite?.visible) {
        this.cardBlastExitSprite.setPosition(this.player.x, this.player.y);
        this.cardBlastExitSprite.setScale(
          this.heroScale * pose.scaleX * (1 + hurtSquash * 0.5),
          this.heroScale * pose.scaleY * (1 - hurtSquash),
        );
        this.cardBlastExitSprite.setRotation(pose.rotation);
        this.cardBlastExitSprite.setDepth(this.player.depth + 0.002);
      }

      if (!this.shadow) return;
      // Pinned to the FLOOR, never to the sprite. It shrinks and fades with height
      // the way a real contact shadow does, which is what sells the arc.
      const lift = this.air / Math.max(JUMP_RISE, 1);
      this.shadow.x = this.feetX;
      this.shadow.y = this.feetY;
      this.shadow.setDepth(this.player.depth - 1);
      this.shadow.setScale(HERO_SHADOW.widthRatio * (1 - 0.2 * lift));
      this.shadow.setAlpha(HERO_SHADOW.alpha * (1 - 0.36 * lift));
    }

    update(time: number, delta: number) {
      this.compiledUpdate?.call(this, time, delta);

      // ONE FRAME, TWO CLOCKS. `delta` is real elapsed time and everything that
      // decides anything is driven by it — the action machine, the construct,
      // the projectiles. `presentDelta` is what the PICTURE gets, and it is zero
      // while a hit is being held. See hitstop.ts for why the split has to be
      // this way round and not the other.
      this.presentDelta = this.hitstop ? this.hitstop.step(delta) : delta;

      // The flinch runs on the PICTURE's clock, so a hit that freezes the frame
      // holds the flinch at its deepest rather than spending it behind the
      // freeze — which is the whole reason the freeze is there.
      if (this.heroHurtMs > 0) this.heroHurtMs = Math.max(0, this.heroHurtMs - this.presentDelta);

      // Before movePlayer, and outside it, so aim keeps resolving through a jump.
      // Sampled only on the frames movePlayer would skip and the pointer tracker
      // would carry a stale screen position across the hop, then report the whole
      // gap as travel on landing and hand aim to a mouse nobody touched.
      if (this.player && this.cursors) this.sampleAim(this.readMove());

      this.movePlayer(delta);
      this.updateCombat(delta);
      this.presentCardBlastSprite();

      /**
       * Draw the hero, every frame, whatever he is doing.
       *
       * THIS LINE IS THE FIX for "the hero doesn't do absolutely anything
       * while attacking" (Raheem, 2026-08-13, from a recording). The attack
       * pose was being computed correctly on every frame and applied on almost
       * none of them: `applyHeroTransform` was only reached at the BOTTOM of
       * movePlayer's walking branch, and movePlayer returns early when the
       * player is not pressing a direction — which is exactly the situation you
       * are in while standing still to charge and fire. The pose existed, was
       * unit-tested, and never touched a pixel.
       *
       * Drawing is not something to do as a side effect of having walked. It is
       * its own step, it happens after everything that could have changed what
       * he looks like, and it happens unconditionally. The call inside
       * movePlayer stays — it keeps walking pixel-exact within its own frame —
       * but this one is the guarantee.
       */
      this.applyHeroTransform();

      // The hand row answers for the attack now — the charge climbing, the
      // release, the recovery — so it has to be offered every frame like the
      // pose is. It is keyed and early-returns unless something the shell
      // actually draws changed, which is what keeps it off React's back.
      this.emitHand();

      // Last, so anything reacting to the player reads where the player is NOW
      // rather than where they were a frame ago.
      this.behavior?.update(
        time,
        delta,
        this.player ? { x: this.feetX, y: this.player.y } : undefined,
      );
    }

    /**
     * Stand up a training dummy and the held card.
     *
     * Both are flat coloured shapes on purpose. This milestone is proving that a
     * blast leaves the card, crosses the world, respects walls and lands — and a
     * placeholder that is obviously a placeholder cannot be mistaken for approved
     * art or quietly ship. The pixel art for them is a later, cheaper decision
     * once the sizes and distances are known from play.
     *
     * The dummy is spawned in CODE rather than authored in the Editor because it
     * is scaffolding: putting it in the .scene file would mean Raheem has to
     * delete it later, and would collide with his own editing of that file.
     */
    private setupCombat(
      bounds: Phaser.Geom.Rectangle,
      cards: readonly { cardId: string; element?: ElementName }[],
    ) {
      const dummyX = Phaser.Math.Clamp(bounds.centerX + 260, bounds.x + 80, bounds.right - 80);
      const dummyY = Phaser.Math.Clamp(bounds.centerY + 40, bounds.y + 80, bounds.bottom - 80);

      // Where it goes back to on reset, so a hundred test loops all start from
      // the same spot rather than wherever the last knockback left it.
      this.constructHome = { x: dummyX, y: dummyY };
      this.construct = resetConstruct(initialConstruct(this.constructHome), this.constructHome);
      this.constructView = createConstructView(this, this.depthBand, this.construct);

      // The player's motion preference, shared with the boss battle rather than
      // asked twice. Told to the view rather than read by it — the scene owns
      // the preference, the presenter only obeys it.
      this.motion = resolveMotionLevel();
      this.motionOff = this.motion === 'off';
      this.constructView.setMotionOff(this.motionOff);

      this.hitstop = createHitstop(this);
      // The animation manager outlives the scene, so a teardown mid-freeze that
      // did not restore the global time scale would leave the NEXT scene frozen
      // with nothing to point at as the cause.
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.hitstop?.destroy();
        this.hitstop = undefined;
        // A scenario mid-run must not keep firing into a scene that is gone.
        this.cancelScenario();
        this.heroFlashTimer?.remove();
        this.heroFlashTimer = undefined;
      });

      // The blast's view of it. Kept in step with the construct's own position
      // every frame — one of them is the truth and it is not this one.
      this.targets = [{ pos: { ...this.construct.pos }, radiusPx: 26, alive: true }];

      this.heldCard = this.add.rectangle(0, 0, 16, 24, 0xf2e2b6);
      this.heldCard.setStrokeStyle(2, 0x6b4a1f);
      this.heldCard.setVisible(false);
      this.depthBand?.add(this.heldCard);

      const forced = resolveForcedElements();
      // A single element fills the hand; a list is dealt out slot by slot and
      // repeats if it is shorter than the hand.
      const forcedFor = (i: number) => (forced.length ? forced[i % forced.length] : undefined);

      // A card with no element of its own gets one, so a hand is never four
      // identical blue circles. See PRACTICE_ELEMENTS.
      const practiceFor = (i: number) => PRACTICE_ELEMENTS[i % PRACTICE_ELEMENTS.length];
      cards.forEach((c, i) =>
        this.cardElements.set(c.cardId, forcedFor(i) ?? c.element ?? practiceFor(i)),
      );
      // Practice cards had no element AT ALL, which is why testing only ever
      // showed the placeholder circle. The `?element=` override still wins.
      PLACEHOLDER_CARD_IDS.forEach((id, i) => {
        this.cardElements.set(id, forcedFor(i) ?? practiceFor(i));
      });
      this.hand = handFromCards(
        cards.length > 0 ? cards.map((c) => c.cardId) : PLACEHOLDER_CARD_IDS,
      );
      this.emitHand();
    }

    /**
     * The hand, drawn in screen space.
     *
     * `setScrollFactor(0)` pins it to the camera and `DEPTH.markers` puts it above
     * every elevation level — a HUD that sorted with the world would slide under a
     * terrace the moment the player climbed one.
     *
     * Subordinate to the world on purpose: small, low-contrast, bottom-centred.
     * The card art belongs on the card, and a HUD that competes with the courtyard
     * is the failure the UI direction warns about. Real card faces replace these
     * pips once the shape is proven in play.
     */
    /**
     * Tell the shell what the hand looks like now.
     *
     * The row of slots is DOM, rendered by CastleV2 beside the doorway prompt and
     * the pause menu, which were already React. It lived in Phaser first and was
     * built correctly and drawn off the bottom of the window, because anything
     * positioned from camera dimensions has to be re-placed every time the canvas
     * resizes and one missed listener makes it vanish with no error.
     *
     * Screen-space UI has no business being in camera space to begin with: the
     * world is what Phaser is for. In the DOM the row cannot be lost, cannot sort
     * underneath a terrace, and scales with the page like the rest of the shell.
     */
    /**
     * Push the encounter to the shell, when it has actually changed.
     *
     * Phase, hp and the two toggles only, deliberately — distance changes every
     * frame and re-rendering React sixty times a second to move one number is a
     * cost with no benefit. Distance is rounded to a band for the same reason.
     */
    private emitCombatState() {
      if (!this.construct || !hooks.onCombatState) return;
      const c = this.construct;
      const p = this.player;
      const distance = p ? Math.round(Math.hypot(p.x - c.pos.x, this.feetY - c.pos.y) / 10) * 10 : 0;
      const key = `${c.phase}|${c.hp}|${c.strongHits}|${c.aiEnabled}|${this.action.phase}|${distance}|${this.action.graceRemainingMs > 0}`;
      if (key === this.lastCombatKey) return;
      this.lastCombatKey = key;
      hooks.onCombatState({
        phase: c.phase,
        hp: c.hp,
        maxHp: CONSTRUCT_TUNING.maxHp,
        distance,
        strongHits: c.strongHits,
        aiEnabled: c.aiEnabled,
        heroPhase: this.action.phase,
        graceMs: Math.round(this.action.graceRemainingMs),
      });
    }
    private lastCombatKey = '';

    /**
     * Push the hand to the shell, when it has actually changed.
     *
     * Guarded the same way `emitCombatState` is, and for the same reason — but
     * the guard arrived later here, because this used to be called only at the
     * handful of moments the hand's CONTENTS changed. It now also carries the
     * attack's phase and charge, which change constantly, so it is called every
     * frame and the key is what stops that becoming sixty React renders a
     * second. Everything the shell draws is in the key; nothing else is.
     */
    private emitHand() {
      // Twelfths. See HandView.charge — the shell's CSS transition covers the
      // gaps, so the bar looks continuous while React does an order of
      // magnitude less work than a raw value would cost.
      const charge = Math.round(this.action.chargeLevel * 12) / 12;
      const key = [
        this.hand.selected,
        this.blockedCount,
        this.action.phase,
        charge,
        this.hand.slots.map((s) => `${s.cardId ?? ''}:${s.state}`).join(','),
      ].join('|');
      if (key === this.lastHandKey) return;
      this.lastHandKey = key;

      hooks.onHandChange?.({
        phase: this.action.phase,
        charge,
        selected: this.hand.selected,
        slots: this.hand.slots.map((slot) => ({
          cardId: slot.cardId,
          state: slot.state,
          // What this card SHOOTS, as a colour the shell can paint the chip
          // with. Sent from here rather than looked up in React because the
          // element↔card mapping lives in the scene, and a second copy of it in
          // the HUD is a second thing that can disagree about what slot 1 is.
          tint: slot.cardId ? effectKitFor(this.cardElements.get(slot.cardId)).palette[1] : null,
        })),
        blockedCount: this.blockedCount,
      });
    }
    private lastHandKey = '';

    /** Number keys pick a slot; shoulder buttons cycle for a pad. */
    private readSelection() {
      for (let i = 0; i < this.slotKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(this.slotKeys[i])) {
          this.hand = selectSlot(this.hand, i);
          this.emitHand();
        }
      }

      const pad = this.input.gamepad?.getPad(0);
      const shoulder = pad?.L1 ? -1 : pad?.R1 ? 1 : 0;
      if (shoulder !== 0 && !this.shoulderHeld) {
        this.hand = cycleSelection(this.hand, shoulder as 1 | -1);
        this.emitHand();
      }
      // Edge-detected by hand: a held shoulder button would otherwise cycle the
      // whole hand every frame and settle on whatever the release landed on.
      this.shoulderHeld = shoulder !== 0;
    }

    /**
     * Advance the attack: state, then spawning, then flight.
     *
     * Order matters. The state machine decides on this frame whether a shot is
     * born, and the shot must then be stepped in the same frame it is created, or
     * every projectile spends its first frame sitting on the hero.
     */
    private updateCombat(delta: number) {
      if (!this.player) return;

      this.readSelection();

      const feet = { x: this.feetX, y: this.feetY };

      // The construct moves FIRST, so a strike it lands this frame reaches the
      // action machine in the same frame rather than a frame late. A one-frame
      // lag here is invisible on a shove and very visible on a knockdown that
      // arrives after the player has already walked clear.
      this.updateConstruct(delta, feet);
      const struckBy = this.constructStruckHero;
      this.constructStruckHero = null;

      const previousPhase = this.action.phase;
      // Read and clear in one place. A latch left set would cancel the NEXT shot
      // too, which is a far more confusing bug than the one it exists to fix.
      //
      // A SCRIPTED hold is immune. The cancel exists because a lost focus means
      // "the key-up is never coming" — but a scripted hold has no key-up to
      // miss, it ends on its own clock. Without this exemption the command is
      // unusable in the one place it matters: the preview pane bounces focus
      // every few frames, so a scripted charge was cancelled and restarted
      // forever and never once reached the wind-up. Found by running it.
      const cancelRequested = this.cancelLatch && this.scriptedHoldMs <= 0;
      this.cancelLatch = false;
      if (cancelRequested) {
        // The held flag is sampled before this runs, so a cancel has to clear it
        // as well or the same frame that abandons the charge starts a new one.
        this.fireHeld = false;
      }

      /**
       * A scripted hold presses the same trigger a mouse does.
       *
       * Read HERE, at the single place the real held-flag is read, rather than
       * anywhere earlier — so a scripted shot and a human's shot are literally
       * the same input to the same machine, and the review cannot be looking at
       * a path the game does not use.
       */
      const scripted = this.scriptedHoldMs > 0;
      if (scripted) this.scriptedHoldMs -= delta;
      const firePressed = this.fireHeld || scripted;
      // The hold ends the frame it runs out. `scriptShot(0)` therefore charges
      // for exactly one frame and releases, which is what a tap is.
      if (!scripted && this.scriptedAim && this.action.phase === 'explore') {
        this.scriptedAim = null;
      }

      this.action = stepAction(
        this.action,
        {
          firePressed,
          summonPressed: this.summonKey
            ? Phaser.Input.Keyboard.JustDown(this.summonKey)
            : false,
          hasReadyCard: canFire(this.hand),
          // Two sources now. The construct's strong strike is the REAL one; K
          // stays as the dev shortcut that made the loop testable before there
          // was anything in the world able to land a hit.
          heavyHit:
            struckBy === 'strong' ||
            (this.knockdownKey ? Phaser.Input.Keyboard.JustDown(this.knockdownKey) : false),
          aim: this.scriptedAim ?? this.aim.aim,
          cancelRequested,
          // Any direction gets him up. Read as HELD, so a player leaning on the
          // stick through the fall stands the moment he is allowed to.
          getUpRequested: (() => {
            const m = this.readMove();
            return m.x !== 0 || m.y !== 0;
          })(),
        },
        delta,
      );

      // An ordinary strike hurts and does not cost him his hand. §6.7: only a
      // clearly telegraphed STRONG hit scatters, or the cards are gone so often
      // that losing them stops meaning anything.
      //
      // BOTH now flash. The strong hit used to fall straight through to the
      // knockdown with no contact beat at all, so the single most violent thing
      // in the fight was the one hit with no impact on it — the fall did all
      // the talking, and the moment of being struck did none.
      if (struckBy === 'light') this.flashHeroHurt('normal');
      if (struckBy === 'strong') this.flashHeroHurt('heavy');

      // Pressing fire while disarmed must SAY so. The rule that the cards are his
      // only weapon is correct and invisible, and invisible correctness reads
      // exactly like a bug.
      if (this.fireHeld && this.action.phase === 'explore' && !canFire(this.hand)) {
        this.blockedCount++;
        this.emitHand();
      }

      if (previousPhase !== 'summoning' && this.action.phase === 'summoning') {
        this.startSummon();
      }

      if (this.action.phase !== previousPhase) {
        this.fireStats.lastPhase = `${previousPhase}->${this.action.phase}`;
        if (this.action.phase === 'charging') (this.fireStats.enteredCharging as number)++;
        if (this.action.phase === 'windup') {
          (this.fireStats.enteredWindup as number)++;
          // The slot is decided exactly once, on the charging->windup edge, so
          // counting it here counts releases rather than frames.
          this.fireStats.lastReleaseKind = this.action.releaseKind ?? 'none';
          if (this.action.releaseKind === 'quick') (this.fireStats.quickReleases as number)++;
          if (this.action.releaseKind === 'heavy') (this.fireStats.heavyReleases as number)++;
        }
        if (cancelRequested && this.action.phase === 'explore') {
          (this.fireStats.cancels as number)++;
        }
      }
      if (this.action.fireThisStep) (this.fireStats.fireSteps as number)++;

      // He just went down. Scatter once, on the transition — not every frame he
      // spends on the floor.
      if (this.action.phase === 'knockdown' && !this.wasDown) {
        // Interrupted mid-ritual, the pending summon steps must not still fire —
        // they would restore the walking sheet on top of the fall and reveal a
        // character out of a card that was never planted.
        this.cancelSummonTimers();
        this.scatterCards();
        this.playKnockdown();
      }
      // Standing up runs the same clip backwards. It costs nothing, it is honest
      // about being a prototype, and it is far better than snapping upright — a
      // purpose-made stand-up clip is a separate decision once this has been
      // played.
      if (this.action.phase === 'standUp' && this.wasDown) this.playStandUp();
      this.wasDown = this.action.phase === 'knockdown';

      this.updatePickups(delta);

      // The throw starts: the card leaves the hand's control until it resolves, so
      // it cannot be fired twice or scattered out from under its own shot.
      // Entering the windup is the moment the throw commits — and since charging
      // was added, the phase before it is 'charging', never 'explore'. Testing for
      // the old transition meant the card was never marked committed at all, so a
      // slot never went purple and nothing stopped it being fired twice.
      if (previousPhase !== 'windup' && this.action.phase === 'windup') {
        this.committedSlot = this.hand.selected;
        this.hand = commitSelected(this.hand);
        this.emitHand();
      }

      // And comes back when control does. Tied to the state machine rather than to
      // the projectile, because a shot that flies off the map never resolves and
      // its card would never return.
      if (this.action.phase === 'explore' && this.committedSlot !== null) {
        this.hand = releaseCommitted(this.hand, this.committedSlot);
        this.committedSlot = null;
        this.emitHand();
      }

      if (this.action.fireThisStep && this.action.committedAim) {
        // WHICH of the card's two actions this is. The card has already been
        // committed above, so read its id from the slot that was committed
        // rather than from `selected` — the player can press 1-4 during a windup
        // and the shot must still belong to the card that was thrown.
        const firingCard =
          this.committedSlot !== null ? this.hand.slots[this.committedSlot].cardId : null;
        const spec = resolveAction(firingCard, this.action.releaseKind);

        // A `scaffold` slot dispatches and produces nothing. It exists so a card
        // can hold something other than a blast before any such thing is
        // designed; no card ships with one, and it must never be visible in
        // play. Note this is a branch and NOT an early return: the projectiles
        // already in the air are stepped further down this same method, and
        // returning here would freeze every one of them mid-flight.
        if (spec.kind === 'scaffold') {
          this.fireStats.lastScaffold = spec.label;
          (this.fireStats.scaffoldDispatches as number)++;
        } else {
          this.launchBlast(feet, this.action.committedAim, this.action.chargeLevel);
        }
      }

      for (const shot of this.projectiles) {
        shot.sim = stepProjectile(shot.sim, delta, this.colliders.blockers, this.targets);
        shot.gfx.setPosition(shot.sim.pos.x, shot.sim.pos.y - shot.drawHeightPx);
        // Depth from the GROUND point, not from where it is drawn. See §7.6 and
        // CARD_HEIGHT_PX — sorting on the drawn height makes a blast pass in
        // front of walls it flew behind.
        shot.gfx.setDepth(this.level * LEVEL_STRIDE + shot.sim.pos.y);

        if (shot.sim.outcome === 'hitTarget' && shot.sim.hitTargetIndex !== null) {
          // The shot's own direction is the knockback, so a construct is shoved
          // the way it was hit rather than always away from where the hero
          // happens to be standing now.
          this.reactToHit(
            shot.sim.hitTargetIndex,
            shot.sim.def.damage,
            shot.sim.dir,
            // A charged shot staggers; a tap flinches. The CHARGE is passed
            // rather than a heavy flag derived from it, so the one threshold in
            // feel.ts decides both the state's reaction and the picture's — and
            // it is read from the shot rather than the release so a heavy that
            // was interrupted early still lands as the shot it actually became.
            shot.charge,
          );
        }

        // The burst plays wherever the shot stopped, walls included — a blast
        // that vanishes against stone reads as the collision being broken.
        if (shot.sim.outcome === 'hitTarget' || shot.sim.outcome === 'hitBlocker') {
          const at = { x: shot.sim.pos.x, y: shot.sim.pos.y - shot.drawHeightPx };
          const depth = this.level * LEVEL_STRIDE + shot.sim.pos.y + 1;
          playImpact(this, shot.kit, at.x, at.y, depth, shot.charge);

          // And the force, pointed. The element's own burst says WHAT hit;
          // this says which way it was going when it did.
          const severity = severityForCharge(shot.charge);
          const feel = getHitFeel(severity, this.motion);
          playDirectionalBurst(this, {
            x: at.x,
            y: at.y,
            depth: depth + 1,
            dir: shot.sim.dir,
            palette: shot.kit.palette,
            count: feel.particleCount,
            power: shot.charge,
          });

          // A wall gets the spray and the camera, but no flash and no freeze —
          // those belong to a body that was hurt. Stone being hit is
          // information; it is not an event.
          if (shot.sim.outcome === 'hitBlocker') {
            this.kickCamera(feel, shot.sim.dir);
          }
        }
      }

      this.projectiles = this.projectiles.filter((shot) => {
        if (shot.sim.outcome === 'flying') return true;
        shot.gfx.destroy();
        return false;
      });

      // The gather, while he is winding one up. Position follows the card so the
      // power visibly collects INTO the thing that will throw it.
      const charging = this.action.phase === 'charging';
      if (charging) {
        const aim = this.poseAim();
        const shot = this.shotPresentation(feet, aim);
        if (!this.chargeEmitter) {
          this.chargeEmitter = createChargeEmitter(this, this.selectedKit().palette);
          this.depthBand?.add(this.chargeEmitter);
        }
        const layerOffsets = this.cardBlastActive()
          ? cardBlastLayerOffsetsForAim(aim)
          : { chargeFlash: 2 };
        this.chargeEmitter.setDepth(
          this.level * LEVEL_STRIDE + this.feetY + layerOffsets.chargeFlash,
        );
        this.chargeEmitter.emitting = true;
        updateChargeEmitter(
          this.chargeEmitter,
          this.action.chargeLevel,
          shot.origin.x,
          shot.origin.y - shot.drawHeightPx,
        );
      } else if (this.chargeEmitter) {
        this.chargeEmitter.emitting = false;
      }

      // The held card rides the hero while a shot is being thrown, so the shot
      // visibly comes FROM it.
      if (this.heldCard) {
        const aim = this.poseAim();
        if (this.cardBlastActive()) {
          const shot = this.shotPresentation(feet, aim);
          const kit = this.selectedKit();
          this.heldCard.setVisible(true);
          this.heldCard.setFillStyle(colourOf(kit.palette[1]));
          this.heldCard.setStrokeStyle(2, colourOf(kit.palette[2]));
          this.heldCard.setPosition(
            shot.origin.x,
            shot.origin.y - shot.drawHeightPx,
          );
          // The authored card is held landscape; cover that blocking prop with
          // the player's actual selected card at the exact launch point.
          this.heldCard.setRotation(Math.PI / 2);
          this.heldCard.setScale(0.5);
          const layerOffsets = cardBlastLayerOffsetsForAim(aim);
          this.heldCard.setDepth(
            this.level * LEVEL_STRIDE + this.feetY + layerOffsets.heldCard,
          );
          return;
        }
        /**
         * The card throws itself.
         *
         * It used to sit at a fixed point beside him for the whole wind-up and
         * then vanish, which is what Raheem saw as "the card just floats there
         * above his head". It now draws back as the charge fills, whips forward
         * through the wind-up, and is gone on the frame the projectile is born
         * — because on that frame it IS the projectile.
         */
        const cp = cardPose({
          style: this.attackStyle(),
          phase: this.action.phase,
          elapsedMs: this.action.elapsedMs,
          chargeLevel: this.action.chargeLevel,
          aim,
          feel: getAttackFeel(severityForCharge(this.action.chargeLevel), this.motion),
        });
        this.heldCard.setVisible(cp.visible);
        if (cp.visible) {
          // The card in his hand IS the card he selected. Tinting it from the
          // element's own palette is what makes "I am about to shoot fire"
          // true before anything has been shot — and it costs one call, where
          // real card faces are a whole art pipeline.
          const kit = this.selectedKit();
          this.heldCard.setFillStyle(colourOf(kit.palette[1]));
          this.heldCard.setStrokeStyle(2, colourOf(kit.palette[2]));
          const lead = cardOrigin(feet, aim);
          this.heldCard.setPosition(lead.x + cp.offsetX, lead.y - CARD_HEIGHT_PX + cp.offsetY);
          this.heldCard.setRotation(cp.rotation);
          this.heldCard.setScale(cp.scale);
          this.heldCard.setDepth(this.level * LEVEL_STRIDE + this.feetY + 1);
        }
      }
    }

    /**
     * Put a projectile in the world, from the card, along the committed aim.
     *
     * Its own method because it is now one arm of the card-action dispatch
     * rather than the only thing firing can mean.
     */
    private launchBlast(feet: { x: number; y: number }, aim: { x: number; y: number }, charge: number) {
      const kit = this.selectedKit();
      const shot = this.shotPresentation(feet, aim);
      const origin = shot.origin;
      // Charge changes the shot itself, not just how it looks — see scaleBlast.
      const sim = spawnProjectile(origin, aim, scaleBlast(DEFAULT_BLAST, charge));

      // The element's own art where it exists; the placeholder circle only when
      // nothing has been drawn for it, so a missing sheet is visible rather
      // than silently absent.
      const art = createBlastSprite(this, kit, origin.x, origin.y - shot.drawHeightPx, aim, charge);
      const gfx =
        art ??
        this.add
          .circle(origin.x, origin.y - shot.drawHeightPx, 5 + 4 * charge, 0x8fd6ff)
          .setStrokeStyle(2, 0xffffff);
      this.depthBand?.add(gfx);
      this.projectiles.push({ sim, gfx, kit, charge, drawHeightPx: shot.drawHeightPx });
      (this.fireStats.projectilesSpawned as number)++;
    }

    /**
     * He goes down; the cards go everywhere.
     *
     * Only cards actually in hand scatter — one mid-throw belongs to its action
     * and one already lying in the grass cannot fall twice, and either of those
     * dropping here is how a card comes to exist in two places at once.
     */
    private scatterCards() {
      const { hand, dropped } = scatterHand(this.hand);
      if (dropped.length === 0) return;
      this.hand = hand;

      const from = { x: this.feetX, y: this.feetY };
      const points = scatterPoints({
        origin: from,
        count: dropped.length,
        random: Math.random,
        // Standable is the runtime's existing answer, not a second opinion:
        // inside the world, off the blockers, and on the plate he is on. A card
        // on another elevation would be visible and unreachable, which is the
        // worst of both.
        isValid: (p) => {
          const b = this.cameras.main.getBounds();
          if (!Phaser.Geom.Rectangle.Contains(b, p.x, p.y)) return false;
          const feet = { x: p.x, y: p.y, width: HERO_FEET.width, height: HERO_FEET.height };
          // walkBlockers, not blockers: a card in the pond is a card he can see
          // and cannot reach, which scatter.ts calls a character deleted by a
          // physics accident.
          if (feetBlocked(feet, this.colliders.walkBlockers)) return false;
          // levelAt returns null off any plate; ground level is 0 there, which is
          // what walking on plain terrain already means.
          return (levelAt(p.x, p.y, this.elevation) ?? 0) === this.level;
        },
      });

      dropped.forEach((card, i) => {
        const gfx = this.add.rectangle(from.x, from.y, 16, 24, 0xf2e2b6);
        gfx.setStrokeStyle(2, 0x6b4a1f);
        gfx.setOrigin(0.5, 1);
        this.depthBand?.add(gfx);
        this.pickups.push({ card, from, to: points[i], ageMs: 0, gfx });
      });

      this.emitHand();
    }

    /**
     * Fly the dropped cards out, then let him sweep them up by walking over them.
     *
     * Recovery is deliberately physical and deliberately forgiving: he has to run
     * to each card, but he does not have to stand on it precisely. The tension is
     * meant to be "my cards are over there", not "my pickup missed".
     */
    private updatePickups(delta: number) {
      if (this.pickups.length === 0 || !this.player) return;
      const feet = { x: this.feetX, y: this.feetY };

      const survivors: typeof this.pickups = [];
      for (const p of this.pickups) {
        p.ageMs += delta;
        const t = p.ageMs / SCATTER_FLIGHT_MS;
        const arc = scatterArc(p.from, p.to, t);

        // Settled cards bob gently so they read as collectable rather than as
        // scenery someone dropped.
        const bob = t >= 1 ? Math.sin(p.ageMs / 260) * 3 : 0;
        p.gfx.setPosition(arc.x, arc.y - arc.heightPx - bob);
        // Depth from the ground point, never from the drawn height.
        p.gfx.setDepth(this.level * LEVEL_STRIDE + arc.y);

        // Only collectable once it has landed — otherwise a card can be caught
        // out of the air at the moment it is thrown and never really drops.
        const landed = t >= 1;
        const near = Math.hypot(feet.x - p.to.x, feet.y - p.to.y) <= PICKUP_RADIUS;
        if (landed && near) {
          this.hand = recoverCard(this.hand, p.card);
          this.emitHand();
          p.gfx.destroy();
          continue;
        }
        survivors.push(p);
      }
      this.pickups = survivors;
    }

    /** The effect kit of whatever card is selected right now. */
    /**
     * Which body language the shot in progress calls for.
     *
     * Read from the CARD's action rather than assumed, so the day a melee card
     * exists it poses correctly without a line changing here. Everything
     * resolves to `ranged` today because every action is a blast.
     *
     * The committed slot wins over the selected one for the same reason
     * `resolveAction` reads it in the fire path: pressing 1-4 mid-windup must
     * not re-pose a throw that is already in the air.
     */
    /**
     * The direction the body should be posing along.
     *
     * Committed aim first (a shot in flight owns its own direction), then a
     * scripted hold's, then the live one. The middle case was missing and it
     * cost a verification pass: a scripted shot flew at the construct while the
     * hero braced along whatever direction the untouched mouse implied, so the
     * lean read as zero and looked like the tilt was broken. The pose must face
     * the way the shot is going, whoever is holding the trigger.
     */
    private poseAim(): { x: number; y: number } {
      return this.action.committedAim ?? this.scriptedAim ?? this.aim.aim;
    }

    /** Whether the approved directional sheets own this ranged attack. */
    private cardBlastActive(): boolean {
      const attacking =
        this.action.phase === 'charging' ||
        this.action.phase === 'windup' ||
        this.action.phase === 'active' ||
        this.action.phase === 'recovery';
      return attacking && this.attackStyle() === 'ranged';
    }

    /** One source of truth for the held card, gather effect, and launched shot. */
    private shotPresentation(feet: Vec2, aim: Vec2) {
      if (this.cardBlastActive()) return cardBlastMuzzleForAim(feet, aim);
      return { origin: cardOrigin(feet, aim), drawHeightPx: CARD_HEIGHT_PX };
    }

    /**
     * Swap the body onto the approved PixelLab performance after movement and
     * combat have both advanced. State remains the clock; the art cannot stall
     * control by failing to emit an animation event.
     */
    private presentCardBlastSprite() {
      if (!this.player) return;
      const active = this.cardBlastActive();
      const target = cardBlastFacingForAim(this.poseAim());
      const targetSheet = CARD_BLAST_SHEETS[target];

      if (!active || !this.textures.exists(targetSheet.key)) {
        if (this.usingCardBlastSprite) {
          // A knockdown or summon may already have replaced the blast texture.
          // Never overwrite that higher-priority performance with the walk sheet.
          const ownsTexture = Object.values(CARD_BLAST_SHEETS).some(
            (sheet) => sheet.key === this.player?.texture.key,
          );
          if (ownsTexture) this.restoreWalkSprite();
          else {
            this.player.setAlpha(1);
            this.cardBlastBlendSprite?.setVisible(false);
            this.cardBlastExitSprite?.setVisible(false);
            this.cardBlastFacing = null;
            this.cardBlastBlendFrom = null;
            this.cardBlastBlendElapsedMs = CARD_BLAST_TURN_MS;
          }
          this.usingCardBlastSprite = false;
        }
        return;
      }

      if (!this.usingCardBlastSprite || this.cardBlastFacing === null) {
        this.cardBlastFacing = target;
        this.cardBlastBlendFrom = null;
        this.cardBlastBlendElapsedMs = CARD_BLAST_TURN_MS;
      } else if (target !== this.cardBlastFacing) {
        // If aim reverses mid-blend, continue from whichever pose is visually
        // dominant instead of flashing back to an older cardinal direction.
        const blendT = this.cardBlastBlendElapsedMs / CARD_BLAST_TURN_MS;
        const visibleFrom =
          this.cardBlastBlendFrom && blendT < 0.5
            ? this.cardBlastBlendFrom
            : this.cardBlastFacing;
        this.cardBlastBlendFrom = visibleFrom;
        this.cardBlastFacing = target;
        this.cardBlastBlendElapsedMs = 0;
      } else if (this.cardBlastBlendFrom) {
        this.cardBlastBlendElapsedMs = Math.min(
          CARD_BLAST_TURN_MS,
          this.cardBlastBlendElapsedMs + this.presentDelta,
        );
      }

      const facing = this.cardBlastFacing ?? target;
      const sheet = CARD_BLAST_SHEETS[facing];
      const frame = cardBlastFrame(
        this.action.phase as CardBlastPhase,
        this.action.elapsedMs,
        this.action.chargeLevel,
        this.motionOff,
      );
      this.player.anims.stop();
      this.player.setTexture(sheet.key, frame);
      this.heroBaseScale = 1;
      this.player.setOrigin(sheet.anchor.x, sheet.anchor.y);
      this.player.setFlipX(false);
      this.player.setAlpha(1);

      if (this.cardBlastBlendFrom) {
        const fromSheet = CARD_BLAST_SHEETS[this.cardBlastBlendFrom];
        const overlay = this.ensureCardBlastBlendSprite();
        overlay.setTexture(fromSheet.key, frame);
        overlay.setOrigin(fromSheet.anchor.x, fromSheet.anchor.y);
        overlay.setFlipX(false);
        overlay.setVisible(true);
        const t = Math.max(0, Math.min(1, this.cardBlastBlendElapsedMs / CARD_BLAST_TURN_MS));
        const eased = 0.5 - Math.cos(t * Math.PI) / 2;
        this.player.setAlpha(eased);
        overlay.setAlpha(1 - eased);
        if (t >= 1) {
          overlay.setVisible(false);
          this.player.setAlpha(1);
          this.cardBlastBlendFrom = null;
        }
      } else if (this.cardBlastBlendSprite) {
        this.cardBlastBlendSprite.setVisible(false);
      }

      // Start one typical presentation frame early so the blend reaches 100%
      // before the state machine crosses into exploration on the next update.
      const exitBlendStart =
        ACTION_TIMING.recoveryMs - CARD_BLAST_EXIT_BLEND_MS - 16;
      if (
        !this.motionOff &&
        this.action.phase === 'recovery' &&
        this.action.elapsedMs >= exitBlendStart
      ) {
        // If movement is already held, settle toward that walk direction. With
        // no movement intent, settle toward the direction the shot was aimed.
        const move = this.readMove();
        const exitFacing =
          move.x !== 0 || move.y !== 0 ? quantiseFacing(move) : quantiseFacing(this.poseAim());
        this.facing = exitFacing;
        const overlay = this.ensureCardBlastExitSprite();
        overlay.setTexture(this.heroSheetKey, idleFrame(exitFacing));
        overlay.setOrigin(0.5, 1);
        overlay.setFlipX(false);
        overlay.setVisible(true);
        const t = Math.max(
          0,
          Math.min(1, (this.action.elapsedMs - exitBlendStart) / CARD_BLAST_EXIT_BLEND_MS),
        );
        const eased = 0.5 - Math.cos(t * Math.PI) / 2;
        this.player.setAlpha(1 - eased);
        overlay.setAlpha(eased);
      } else if (this.cardBlastExitSprite) {
        this.cardBlastExitSprite.setVisible(false);
      }
      this.usingCardBlastSprite = true;
    }

    private ensureCardBlastBlendSprite() {
      if (this.cardBlastBlendSprite) return this.cardBlastBlendSprite;
      const sheet = CARD_BLAST_SHEETS.left;
      this.cardBlastBlendSprite = this.add.sprite(this.feetX, this.feetY, sheet.key, 0);
      this.cardBlastBlendSprite.setOrigin(sheet.anchor.x, sheet.anchor.y);
      this.cardBlastBlendSprite.setVisible(false);
      this.depthBand?.add(this.cardBlastBlendSprite);
      return this.cardBlastBlendSprite;
    }

    private ensureCardBlastExitSprite() {
      if (this.cardBlastExitSprite) return this.cardBlastExitSprite;
      this.cardBlastExitSprite = this.add.sprite(
        this.feetX,
        this.feetY,
        this.heroSheetKey,
        idleFrame(this.facing),
      );
      this.cardBlastExitSprite.setOrigin(0.5, 1);
      this.cardBlastExitSprite.setVisible(false);
      this.depthBand?.add(this.cardBlastExitSprite);
      return this.cardBlastExitSprite;
    }

    private attackStyle(): AttackStyle {
      const slot = this.committedSlot ?? this.hand.selected;
      const cardId = slot !== null ? this.hand.slots[slot]?.cardId ?? null : null;
      return attackStyleFor(resolveAction(cardId, this.action.releaseKind));
    }

    private selectedKit(): EffectKit {
      const slot = this.hand.selected === null ? null : this.hand.slots[this.hand.selected];
      return effectKitFor(slot?.cardId ? this.cardElements.get(slot.cardId) : undefined);
    }

    /**
     * The grounded summoning ritual.
     *
     * The card is PLACED, and the character comes out of where it was placed.
     * That is the whole point of the performance — a character that appeared
     * beside him instead would make the slam decorative, and the handoff is
     * explicit that the summon emerges from the grounded card.
     *
     * The 17 frames are the body only. Everything around them — the real card,
     * the dust, the flash, the character rising — is assembled here, so the same
     * clip serves every card in the game rather than one per character.
     */
    private startSummon() {
      if (!this.player || this.hand.selected === null) return;
      const slotIndex = this.hand.selected;

      // Where the card lands: a step ahead of him, and only somewhere he could
      // stand. The same predicate the scatter uses, so a summon can never appear
      // inside a wall or out over the pond.
      const feet = { x: this.feetX, y: this.feetY };
      const ahead = this.groundAhead(feet, this.aim.aim);

      this.hand = summonSelected(this.hand);
      this.emitHand();

      // He has to face the camera: the performance exists in one direction, and
      // turning him is honest where mirroring an asymmetric action is not.
      this.facing = 'down';

      if (this.anims.exists(CARD_SLAM_ANIM) && this.player) {
        this.player.anims.stop();
        this.player.setTexture(CARD_SLAM_SHEET.key, 0);
        this.heroBaseScale = 1;
        this.player.setScale(1);
        this.player.setOrigin(CARD_SLAM_ANCHOR.x, CARD_SLAM_ANCHOR.y);
        this.player.play(CARD_SLAM_ANIM);
      }

      // The player's ACTUAL card, laid on the ground at the palm contact. The
      // generated one in the frames is a blocking prop; this is the real one.
      const kit = this.selectedKit();
      this.ritualCard = this.add.rectangle(ahead.x, ahead.y, 18, 26, 0xf2e2b6);
      this.ritualCard.setStrokeStyle(2, colourOf(kit.palette[0]));
      this.ritualCard.setOrigin(0.5, 0.5);
      this.ritualCard.setDepth(this.level * LEVEL_STRIDE + ahead.y);
      this.ritualCard.setAlpha(0);
      this.depthBand?.add(this.ritualCard);

      // The card becomes visible as the palm comes down, not before.
      const plantAt = ACTION_TIMING.summonMs - 700;
      this.summonTimers.push(
        this.time.delayedCall(plantAt, () => this.ritualCard?.setAlpha(1)),
        this.time.delayedCall(plantAt + 120, () => this.revealSummon(ahead, slotIndex, kit)),
        // Control comes back on the clock, never on the animation event — a clip
        // that is skipped or interrupted must not strand him mid-ritual.
        this.time.delayedCall(ACTION_TIMING.summonMs, () => this.restoreWalkSprite()),
      );
    }

    /** Drop every pending step of a ritual that is no longer happening. */
    private cancelSummonTimers() {
      for (const t of this.summonTimers) t.remove();
      this.summonTimers = [];
      this.ritualCard?.destroy();
      this.ritualCard = undefined;
    }

    /** A standable point one step along the aim, for the card to be planted on. */
    private groundAhead(feet: Vec2, aim: Vec2) {
      const len = Math.hypot(aim.x, aim.y) || 1;
      const step = 46;
      const candidate = { x: feet.x + (aim.x / len) * step, y: feet.y + (aim.y / len) * step };
      const b = this.cameras.main.getBounds();
      const rect = { x: candidate.x, y: candidate.y, width: HERO_FEET.width, height: HERO_FEET.height };
      const standable =
        Phaser.Geom.Rectangle.Contains(b, candidate.x, candidate.y) &&
        !feetBlocked(rect, this.colliders.walkBlockers) &&
        (levelAt(candidate.x, candidate.y, this.elevation) ?? 0) === this.level;
      // Backing off to his own feet is ugly and always reachable, which beats a
      // character materialising inside a wall.
      return standable ? candidate : { ...feet };
    }

    /** The character rises out of the planted card. */
    private revealSummon(at: Vec2, slotIndex: number, kit: EffectKit) {
      const keeper = KEEPERS.find((k) => k.id === 'keeper-dwarf');
      if (!keeper || !this.textures.exists(keeper.sheet.key)) return;

      // Dust and a flash at the contact point, in the card's own colours — the
      // effects belong to Phaser so one performance serves every element.
      const flash = this.add.circle(at.x, at.y, 6, colourOf(kit.palette[1]));
      flash.setDepth(this.level * LEVEL_STRIDE + at.y + 1);
      this.tweens.add({
        targets: flash,
        radius: 34,
        alpha: 0,
        duration: 340,
        onComplete: () => flash.destroy(),
      });

      const sprite = this.add.sprite(at.x, at.y, keeper.sheet.key, 0);
      sprite.setOrigin(0.5, 1);
      sprite.setScale(keeper.worldHeight / keeper.sheet.frameHeight);
      // Feet on the ground, sorted by the ground he stands on — the same contract
      // as every other actor, so he passes behind walls like anything else.
      sprite.setDepth(this.level * LEVEL_STRIDE + at.y);
      this.depthBand?.add(sprite);

      // Rise out of the card rather than blinking into existence.
      sprite.setAlpha(0);
      const settled = sprite.scaleY;
      sprite.setScale(sprite.scaleX, settled * 0.2);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        scaleY: settled,
        duration: 260,
        ease: 'Back.easeOut',
      });

      this.summons.push({ slotIndex, sprite });
      this.ritualCard?.destroy();
      this.ritualCard = undefined;
    }

    /**
     * Put him on the floor.
     *
     * The fall lives on its OWN sheet at its own frame size, because a sprawled
     * body does not fit the walk sheet's 36x71 box — so this swaps the texture
     * and swaps it back, rather than playing a row of the walking sheet.
     */
    private playKnockdown() {
      if (!this.player) return;
      if (!this.anims.exists(KNOCKDOWN_ANIM)) {
        // Silence here is what let the fall ship unplayable: the texture was
        // registered and packed but never force-loaded, so this returned early
        // every time and looked exactly like "the animation was not made yet".
        console.warn(
          `[combat] ${KNOCKDOWN_SHEET.key} is not loaded, so the fall cannot play. ` +
            'It has to be listed in alwaysLoaded — nothing names it in the scene source.',
        );
        return;
      }
      this.player.anims.stop();
      this.player.setTexture(KNOCKDOWN_SHEET.key, 0);
      // The fall has its own sheet at its own size; that becomes the base the
      // pose would multiply. It never does — the pose is neutral while he is
      // down — but leaving the old base here would make the first frame after
      // he stands up the wrong size.
      this.heroBaseScale = 1;
      // Both sheets are authored so he stands 71px tall, so this is 1:1 and the
      // swap does not change his size.
      this.player.setScale(1);
      // The fall's frames carry empty space below the feet where the walk sheet
      // has almost none, so the walk's origin of 1.0 would lift him ~24px off the
      // ground exactly as he is supposed to be hitting it.
      this.player.setOrigin(KNOCKDOWN_ANCHOR.x, KNOCKDOWN_ANCHOR.y);
      this.player.play(KNOCKDOWN_ANIM);
    }

    /** Get up: the fall, reversed, inside the stand-up window. */
    private playStandUp() {
      if (!this.player || !this.anims.exists(KNOCKDOWN_ANIM)) return;
      this.player.playReverse(KNOCKDOWN_ANIM);
      // Restore the walking sheet on time rather than on the animation event —
      // a clip that never completes would otherwise leave him lying down with
      // full control, which looks like the sprite broke.
      //
      // One timer at a time: knocked down again mid-stand-up, a second call would
      // fire later and swap the walk sheet back in on top of a fresh fall.
      this.standUpTimer?.remove();
      this.standUpTimer = this.time.delayedCall(ACTION_TIMING.standUpMs, () =>
        this.restoreWalkSprite(),
      );
    }

    /** Back to the walking sheet and its scale. */
    private restoreWalkSprite() {
      if (!this.player) return;
      this.standUpTimer?.remove();
      this.standUpTimer = undefined;
      this.player.anims.stop();
      this.player.setTexture(this.heroSheetKey, idleFrame(this.facing));
      this.heroBaseScale = this.heroScale;
      this.player.setScale(this.heroScale);
      // Back to feet-at-the-bottom, or he would walk around sunk into the floor.
      this.player.setOrigin(0.5, 1);
      this.player.setFlipX(false);
      this.player.setAlpha(1);
      this.cardBlastBlendSprite?.setVisible(false);
      this.cardBlastExitSprite?.setVisible(false);
      this.usingCardBlastSprite = false;
      this.cardBlastFacing = null;
      this.cardBlastBlendFrom = null;
      this.cardBlastBlendElapsedMs = CARD_BLAST_TURN_MS;
    }

    /**
     * A blast landed on the construct.
     *
     * Queued rather than applied: the construct is stepped once per frame from
     * one place, and damage arriving mid-projectile-loop would mean two shots in
     * the same frame each seeing a different construct.
     */
    private reactToHit(
      index: number,
      damage: number,
      dir: { x: number; y: number },
      charge: number,
    ) {
      if (index !== 0 || !this.construct) return;
      const severity = severityForCharge(charge);
      this.pendingHits.push({ amount: damage, knockback: dir, heavy: severity === 'heavy' });
      // The loudest of anything landing this frame decides the feel. Taking the
      // max rather than the last means two shots arriving together read as the
      // bigger of them, never as whichever happened to be resolved second.
      // The direction belongs to whichever hit is deciding the feel, so it is
      // only replaced when the severity is.
      if (this.pendingHitSeverity !== severity) this.pendingHitDir = dir;
      this.pendingHitSeverity = louder(this.pendingHitSeverity, severity);
    }

    /**
     * Advance the construct, then push the result out to everything that reads it.
     *
     * The construct's own state is the only truth here. The blast target and the
     * view are both DERIVED from it every frame rather than kept in step by
     * hand, because two things that must agree and are updated separately
     * eventually disagree.
     */
    private updateConstruct(delta: number, heroFeet: { x: number; y: number }) {
      if (!this.construct) return;

      const hits = this.pendingHits;
      const hitSeverity = this.pendingHitSeverity;
      const hitDir = this.pendingHitDir;
      this.pendingHits = [];
      this.pendingHitSeverity = null;

      const before = this.construct.phase;
      const out = stepConstruct(
        this.construct,
        {
          heroFeet,
          // The grace is what stops it swinging at a man who is getting up. See
          // §11.3 — without it the knockdown chains and the loop is unplayable.
          heroDownedOrGraced:
            this.action.phase === 'knockdown' ||
            this.action.phase === 'standUp' ||
            this.action.graceRemainingMs > 0,
          hits,
        },
        delta,
      );
      this.construct = out.state;

      if (hits.length > 0) this.flashConstruct(hitSeverity ?? 'normal', hitDir);
      if (before !== this.construct.phase) {
        this.constructStats.lastPhase = `${before}->${this.construct.phase}`;
        if (this.construct.phase === 'telegraph') (this.constructStats.telegraphs as number)++;
        if (this.construct.phase === 'defeated') {
          (this.constructStats.defeats as number)++;
          this.killConstruct(hitDir);
        }
      }

      // Does the committed strike reach him? Resolved against the SHAPE of the
      // lunge rather than a circle round the target, so walking sideways out of
      // its path works as well as walking backwards.
      if (out.strike) {
        (this.constructStats.strikes as number)++;
        if (strikeHits(out.strike, heroFeet)) {
          this.constructStruckHero = out.strike.kind;
          (this.constructStats.strikesLanded as number)++;
        }
      }

      // Everything downstream, derived.
      this.targets = [
        {
          pos: { ...this.construct.pos },
          radiusPx: 26,
          alive: isHittable(this.construct.phase),
        },
      ];
      this.constructView?.update(
        this.construct,
        heroFeet,
        (groundY) => (this.depthBand ? this.level * LEVEL_STRIDE + groundY : 100000),
        // The picture's clock, not the simulation's — see hitstop.ts.
        this.presentDelta,
      );
      // Cheap: it early-returns unless something a human would notice changed.
      this.emitCombatState();
    }

    /**
     * Put him on the floor, through the real path.
     *
     * Deliberately routed into the same latch a construct's strong strike uses
     * rather than setting the phase directly: a test that reaches the knockdown
     * by a private door proves the knockdown works and nothing about whether
     * anything can actually cause one.
     */
    // Public because the dev bridge reaches it from outside the class. Only
    // published when `?combatDev=1` is set on a DEV build; see combatDev.ts.
    forceKnockdown() {
      this.constructStruckHero = 'strong';
    }

    /**
     * Drop the hero at a spot.
     *
     * Placement, not walking — no collision, no blockers, no elevation lookup.
     * It exists so a scenario can set up a known distance in one call instead of
     * simulating a walk there, and it is a dev command precisely because it can
     * put him somewhere the game never would.
     */
    /**
     * Play a tier's contact feedback with no shot behind it.
     *
     * Deliberately routed through `flashConstruct`, the same method a real hit
     * uses, rather than reproducing its parts. A preview that assembled the
     * effect itself could look perfect while the real path was broken, which is
     * the failure mode a dev command exists to rule out rather than create.
     */
    previewImpact(severity: HitSeverity) {
      this.flashConstruct(severity);
    }

    /**
     * Hold the trigger for a measured time, aimed at the construct.
     *
     * WHAT THIS REPLACED, and why the replacement matters. The first version
     * called `launchBlast` directly with a charge number. It produced the right
     * projectile and the right impact — and NO THROW AT ALL, because the action
     * machine never ran, so there was no charging phase, no wind-up, no release,
     * and therefore no pose. The one command built to make the attack reviewable
     * was the one command that could not show the half of the attack under
     * review. Whatever a benchmark bypasses is the part it cannot vouch for.
     *
     * So it now presses the trigger instead of firing the gun: `scriptedHoldMs`
     * is read exactly where the real `fireHeld` is read, and everything
     * downstream — charge accumulation, release classification, wind-up, the
     * body pose, the card's throw, the projectile — happens through the paths a
     * human's mouse would use. A hold of 0 releases on the next frame and comes
     * out as a tap; a hold past `chargeMaxMs` comes out fully charged.
     */
    /**
     * The named scenario: one complete exchange, the same way every time.
     *
     * WHY A SCRIPT AND NOT A CHECKLIST. Everything in this initiative is judged
     * by watching it, and watching only means something if two runs are
     * comparable. Played by hand, no two are: the charge is a different length,
     * the distance is different, the construct is in a different mood. This
     * puts the whole conversation — tap, charged shot, its telegraph, its
     * strike, the kill — on one timeline from one starting position, so a
     * change to the feel is the only thing that can differ between two
     * recordings of it.
     *
     * Built from the same commands a human uses; it does not reach past them.
     * A scenario with private access would be testing a path the game does not
     * have, which is the failure `combatDev.ts`'s header was written about.
     */
    runScenario() {
      if (!this.player || !this.construct) return;
      this.cancelScenario();

      const home = this.constructHome;
      // A known distance, just outside its preferred range, so the approach and
      // the telegraph both happen rather than starting mid-fight.
      this.placeHeroAt(home.x - 200, home.y);
      this.construct = resetConstruct(this.construct, home);
      this.construct = setAiEnabled(this.construct, false);
      this.construct = setStrongHits(this.construct, false);
      this.emitCombatState();

      const at = (ms: number, what: () => void) => {
        this.scenarioTimers.push(this.time.delayedCall(ms, what));
      };

      /**
       * TWO THINGS THIS SCRIPT LEARNED BY BEING RUN.
       *
       * `aiEnabled: false` freezes EVERY phase, not just the decision to start
       * one — so the first version froze the construct for determinism and then
       * forced a telegraph that could never resolve into a strike. The tell just
       * sat there. The brain goes back on before anything is asked of it.
       *
       * And a strike only lands inside `lungeReachPx` (132). The hero starts at
       * 200 so the shots have a flight to be seen, and is moved into reach
       * before the construct is asked to swing — otherwise the strike resolves
       * as a clean miss and the flinch, the knockdown and the scatter are all
       * silently skipped while the log still looks busy.
       */

      // A tap, so the quiet tier is seen first and the heavy has something to
      // be heavier THAN.
      at(500, () => this.scriptShot(0));
      // A full charge. Long enough after the tap that the two do not overlap.
      at(1600, () => this.scriptShot(ACTION_TIMING.chargeMaxMs + 100));

      // Into its reach, and wake it up.
      at(3000, () => {
        this.placeHeroAt(home.x - 110, home.y);
        if (!this.construct) return;
        this.construct = setAiEnabled(this.construct, true);
        this.emitCombatState();
      });
      // Its answer: a telegraph and a strike, with the hero standing still and
      // taking it — the fold and the flash are the point here, not the dodge.
      at(3300, () => {
        if (!this.construct) return;
        this.construct = forcePhase(this.construct, 'telegraph', { x: this.feetX, y: this.feetY });
        this.emitCombatState();
      });

      // The kill, and with it the defeat feedback.
      at(5400, () => this.scriptShot(ACTION_TIMING.chargeMaxMs + 100));

      // Finale: back up, and the strong version — the knockdown and the
      // scatter. Last on purpose, because it costs him his hand and nothing
      // after it could fire.
      at(7000, () => {
        if (!this.construct) return;
        this.construct = reviveConstruct(this.construct);
        this.construct = setStrongHits(this.construct, true);
        this.emitCombatState();
      });
      at(7800, () => {
        if (!this.construct) return;
        this.construct = forcePhase(this.construct, 'telegraph', { x: this.feetX, y: this.feetY });
        this.emitCombatState();
      });
    }

    /** Drop every pending step of a scenario that is no longer wanted. */
    cancelScenario() {
      for (const t of this.scenarioTimers) t.remove();
      this.scenarioTimers = [];
    }

    scriptShot(holdMs: number) {
      if (!this.player || !this.construct) return;
      const dx = this.construct.pos.x - this.feetX;
      const dy = this.construct.pos.y - this.feetY;
      const len = Math.hypot(dx, dy) || 1;
      // Aim is locked for the duration so the shot goes where the review needs
      // it regardless of where the mouse happens to be sitting.
      this.scriptedAim = { x: dx / len, y: dy / len };
      this.scriptedHoldMs = Math.max(0, holdMs);
    }

    placeHeroAt(x: number, y: number) {
      if (!this.player) return;
      this.feetX = x;
      this.feetY = y;
      this.applyHeroTransform();
    }

    /**
     * He was hit, but not hard enough to go down.
     *
     * §6.7: ordinary damage must NOT scatter the hand. If every hit cost him his
     * cards the loss would stop meaning anything, and the knockdown — the moment
     * the whole milestone is built around — would be just another hit.
     */
    private flashHeroHurt(severity: HitSeverity = 'normal') {
      if (!this.player) return;
      const feel = getHitFeel(severity, this.motion);
      this.player.setTintFill(0xffdada);
      /**
       * One timer, replaced — never a second one racing the first.
       *
       * Each flash used to schedule its own `delayedCall`, so two hits inside a
       * flash's length meant the FIRST timer cleared the tint while the second
       * flash was still meant to be showing. The second hit was the one that
       * lost its feedback, which is exactly backwards: under pressure is when
       * the player most needs to see that they were hit.
       *
       * Still time rather than an animation event — the same backstop rule
       * every timed effect in this scene follows.
       */
      this.heroFlashTimer?.remove();
      this.heroFlashTimer = this.time.delayedCall(feel.flashMs, () => {
        this.player?.clearTint();
        this.heroFlashTimer = undefined;
      });

      /**
       * He folds, away from whatever hit him.
       *
       * The construct is the only thing that can hit him, so its position is
       * the direction — and using it rather than a fixed axis is what makes
       * being hit from the left look different from being hit from the right.
       * A flinch with no direction says a hit happened; one with a direction
       * says where to walk.
       */
      if (this.construct) {
        const dx = this.feetX - this.construct.pos.x;
        const dy = this.feetY - this.construct.pos.y;
        const len = Math.hypot(dx, dy) || 1;
        this.heroHurtDir = { x: dx / len, y: (dy / len) * 0.55 };
      }
      // Motion off zeroes the fold and leaves the flash, which is the rule the
      // whole ladder exists to protect: losing motion costs movement, never the
      // information that something hit him.
      this.heroHurtSpanMs = Math.max(1, feel.flashMs * 1.6);
      this.heroHurtMs = feel.staticFallback ? 0 : this.heroHurtSpanMs;

      this.hitstop?.trigger(feel.hitstopMs);
      this.kickCamera(feel, { x: -this.heroHurtDir.x, y: -this.heroHurtDir.y });
    }

    /**
     * A readable reaction, so a hit cannot be mistaken for a miss.
     *
     * The camera half. The BODY's flash belongs to the view and is applied
     * there — see constructPresenter's `flash()`, which is the tween this
     * method's comment used to promise and never actually wrote.
     */
    private flashConstruct(severity: HitSeverity, dir = this.pendingHitDir) {
      const feel = getHitFeel(severity, this.motion);
      this.constructView?.flash(feel);
      this.hitstop?.trigger(feel.hitstopMs);
      this.kickCamera(feel, dir);
    }

    /**
     * It died. Make that the loudest thing that has happened.
     *
     * WHAT THIS IS FOR. Death was the quietest event in the fight: the body
     * went to 45% alpha and a dark brown, and stood there. A hit — any hit —
     * had a flash, a freeze and a camera shove; the kill, which is the thing
     * the whole exchange was for, had less feedback than the tap that preceded
     * it. The escalation is the point, not the effects.
     *
     * It is deliberately built from the SAME parts as an ordinary heavy hit,
     * fired together: heavy freeze, heavy flash, heavy camera, and a spray of
     * the construct's own colours along the direction it is going down. A death
     * that used a bespoke vocabulary would read as a cutscene rather than as
     * the end of the fight the player was in.
     *
     * NOTHING HERE IS LOAD-BEARING. The revive is driven by `construct.ts`'s
     * `reviveMs` off the phase clock, which never consults a tween — so if
     * every effect below silently failed, the construct would still get back up
     * exactly on time. That is the standing rule about state never waiting on
     * animation, and here it means the backstop is the architecture rather than
     * a timer someone has to remember to add.
     */
    private killConstruct(dir: { x: number; y: number }) {
      if (!this.construct) return;
      const feel = getHitFeel('heavy', this.motion);

      this.constructView?.flash(feel);
      this.hitstop?.trigger(feel.hitstopMs);
      this.kickCamera(feel, dir);

      // The construct coming apart, in the construct's OWN colours — scorched
      // timber and ember. Not the element's: the elemental burst already played
      // on the killing hit a frame ago, and repeating it would say the fire hit
      // twice rather than that the thing it hit broke.
      playDirectionalBurst(this, {
        x: this.construct.pos.x,
        y: this.construct.pos.y - 34,
        depth: this.level * LEVEL_STRIDE + this.construct.pos.y + 2,
        dir,
        // Three, because every element kit's palette is three — the burst reads
        // a fixed tuple and a fourth colour here would be a different shape of
        // thing pretending to be a palette.
        palette: ['#c98b4a', '#7a4a22', '#ffb02e'],
        // From the tier, like every other burst in this file. A death is not
        // licence to exceed the budget M3 pinned.
        count: feel.particleCount,
        power: 1,
      });
    }

    /**
     * The camera's answer to a hit: a rattle, plus a shove the way the force went.
     *
     * `shake` alone is undirected by nature — it is noise around a point, and
     * noise cannot say which way anything was moving. The lurch is what makes
     * the world appear to be struck FROM somewhere rather than merely to be
     * vibrating.
     *
     * Done with `setFollowOffset` rather than by writing scroll directly,
     * because the camera is following the hero: anything that sets scroll is
     * overwritten on the very next frame by the follow, and the kick would
     * never be seen. Offsetting the thing it follows moves the camera WITH the
     * follow instead of fighting it.
     *
     * A world lurch is a `full`-motion privilege. On `subtle` the shake is
     * already zero and this returns before touching anything.
     */
    private kickCamera(feel: { shakeIntensity: number; shakeMs: number }, dir: { x: number; y: number }) {
      this.shakeCamera(feel);
      if (this.motion !== 'full' || feel.shakeIntensity <= 0) return;

      const cam = this.cameras.main;
      // Roughly 4px at heavy. Small: this is a nudge that registers in the gut,
      // not a camera move the player has to recover from.
      const push = feel.shakeIntensity * 900;
      const ox = dir.x * push;
      const oy = dir.y * push;

      // A second hit REPLACES the lurch. Two counters tweening one offset would
      // leave the camera parked wherever they happened to disagree.
      this.cameraKick?.stop();
      cam.setFollowOffset(ox, oy);
      this.cameraKick = this.tweens.addCounter({
        from: 1,
        to: 0,
        duration: feel.shakeMs,
        onUpdate: (t) => {
          const v = t.getValue() ?? 0;
          cam.setFollowOffset(ox * v, oy * v);
        },
        onComplete: () => {
          cam.setFollowOffset(0, 0);
          this.cameraKick = undefined;
        },
      });
      // Time is the backstop. A tween interrupted by a scene teardown — or
      // frozen by a hitstop that outlives it — must not leave the camera
      // permanently off-centre, which is a bug with no visible cause.
      this.time.delayedCall(feel.shakeMs + HITSTOP_CAP_MS + 200, () => {
        if (!this.cameraKick) return;
        this.cameraKick.stop();
        this.cameraKick = undefined;
        cam.setFollowOffset(0, 0);
      });
    }

    /**
     * Every camera shake in the courtyard goes through here.
     *
     * There were two of these, each with its own hardcoded pair of numbers and
     * its own opinion about reduced motion. One funnel means severity is the
     * only thing that decides how hard the world moves, and it means a shake
     * can never be added without a tier to justify it.
     *
     * `shake` is left to Phaser to arbitrate when two land together: it
     * replaces rather than accumulates, so a tap during a heavy hit cannot add
     * to it. Bounded by construction rather than by a counter.
     */
    private shakeCamera(feel: { shakeIntensity: number; shakeMs: number }) {
      if (feel.shakeIntensity <= 0 || feel.shakeMs <= 0) return;
      this.cameras.main.shake(feel.shakeMs, feel.shakeIntensity);
    }

    /** Walk intent from the keys. Arrows and WASD are the same axis, not two. */
    private readMove() {
      return moveVector(
        this.cursors!.left.isDown || this.wasd!.A.isDown,
        this.cursors!.right.isDown || this.wasd!.D.isDown,
        this.cursors!.up.isDown || this.wasd!.W.isDown,
        this.cursors!.down.isDown || this.wasd!.S.isDown,
      );
    }

    /**
     * Read the three devices and resolve who is aiming.
     *
     * The Phaser-specific half of the input seam; the rules live in combat/aim.ts.
     * Gamepad support is optional at run time — `this.input.gamepad` is undefined
     * unless the plugin is enabled, and a courtyard that throws because nobody
     * plugged in a controller would be a poor trade for a feature nobody is using
     * yet.
     */
    private sampleAim(move: { x: number; y: number }) {
      if (!this.player) return;

      const pad = this.input.gamepad?.getPad(0);
      const stick = pad?.rightStick ? { x: pad.rightStick.x, y: pad.rightStick.y } : { x: 0, y: 0 };

      // A pointer that has never been over the canvas reports 0,0, which aims at
      // the top-left corner of the world. `active` is what tells them apart.
      const p = this.input.activePointer;
      const hasPointer = p !== undefined && p.active;
      const pointerScreen = hasPointer ? { x: p.x, y: p.y } : null;
      const pointerWorld = hasPointer ? { x: p.worldX, y: p.worldY } : null;

      // Fire is the left mouse button, F, or the pad's right trigger. Deliberately
      // NOT E, SPACE or ESC — those are the door, the ledge hop and the pause
      // menu, and a combat verb that also opens a door is a bug waiting for the
      // first fight next to the Archive.
      //
      // F exists because the mouse should not be mandatory: aiming with the keys
      // alone has to be a complete way to play, and a verb reachable only by
      // holding a mouse button is one a keyboard player cannot use at all.
      const firePressed =
        (hasPointer && p.leftButtonDown()) ||
        (this.fireKey?.isDown ?? false) ||
        (pad?.R2 ?? 0) > 0.5 ||
        (pad?.A ?? false);
      // HELD state, plus anything latched by the events below. Polling alone
      // dropped a tap that began and ended between two samples: firing used to
      // need one frame with the key down, and charge-and-release needs a press
      // AND a release, so a quick tap could vanish without a trace.
      this.fireHeld = firePressed || this.firePressedLatch;
      if (this.firePressedLatch) (this.fireStats.latchHits as number)++;
      if (this.fireHeld) (this.fireStats.framesHeld as number)++;
      this.firePressedLatch = false;

      const inputs = buildAimInputs(
        { move, pointerScreen, pointerWorld, stick, firePressed },
        { x: this.feetX, y: this.feetY },
        this.pointerTracker,
        this.time.now,
      );
      this.aim = resolveAim(this.aim, inputs);
    }

    private movePlayer(delta: number) {
      if (!this.player) return;
      if (this.jump) return this.advanceJump(delta);

      // Knockdown and stand-up own the sprite while their clips are playing.
      // Without this guard, the ordinary idle branch below stops the special
      // animation on the very next frame and replaces it with one standing
      // frame. The combat state still says DOWN, but the picture never falls.
      if (this.action.phase === 'knockdown' || this.action.phase === 'standUp') return;

      const intent = this.readMove();
      const dx = intent.x;
      const dy = intent.y;

      // Pausing and walking through a door both put a React surface in front of
      // the canvas, which is the same "the key-up is never coming" situation as
      // losing focus — so both abandon the shot rather than leaving it charging
      // behind a menu.
      if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
        this.cancelLatch = true;
        hooks.onPause?.();
      }
      if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey) && this.atDoor) {
        this.cancelLatch = true;
        hooks.onDoorEnter?.(this.atDoor);
        return;
      }

      // This firing sheet is a planted performance, not locomotion art. Lock on
      // the trigger frame as well as every authored action phase so held movement
      // cannot create one frame of foot slide before charging begins. Directional
      // input remains sampled for aim; it simply cannot translate the hero until
      // recovery hands control back to exploration.
      const firingStanceLocked =
        this.attackStyle() === 'ranged' &&
        locksFiringStanceMovement(
          this.action.phase,
          this.fireHeld || this.scriptedHoldMs > 0,
          canFire(this.hand),
        );
      if (firingStanceLocked) {
        this.checkDoors();
        return;
      }

      if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
        return this.startJump(dx, dy);
      }

      if (dx === 0 && dy === 0) {
        if (!this.usingCardBlastSprite) {
          this.player.anims.stop();
          this.player.setFrame(idleFrame(this.facing));
        }
        // Still poll: you walk into a doorway, STOP, and then press E. Returning
        // early here would drop the prompt the instant the hero stood still.
        this.checkDoors();
        return;
      }

      // Vertical wins ties so a diagonal reads as up/down, which is the convention
      // the sheet's four rows were drawn for. Shared with combat aim rather than
      // written twice — two quantisers agree everywhere except the diagonal, and
      // disagreeing only there is a defect nobody finds by looking at the code.
      this.facing = quantiseFacing({ x: dx, y: dy });
      if (!this.usingCardBlastSprite) this.player.anims.play(this.heroWalkKey(this.facing), true);

      // Exploration is the only phase with locomotion. The explicit stance lock
      // above also catches the initial trigger frame before the action machine
      // has entered `charging`.
      const step = (WALK_SPEED * walkScale(this.action.phase) * delta) / 1000;
      const b = this.cameras.main.getBounds();

      // Collision is tested against the FEET, not the sprite. A top-down hero is
      // a picture standing on a small patch of floor; boxing the picture would
      // stop him a whole body-height short of every wall.
      //
      // Height rides along: a cliff blocks because the floor stops being that high
      // there, not because anyone drew a collider along its lip. That is why the
      // terrace edge and the collider can never disagree about where the edge is.
      const feet = this.feetRect();
      const move = resolveWalkOnLevel(
        feet,
        dx * step,
        dy * step,
        this.colliders.walkBlockers,
        this.elevation,
        this.level,
      );

      this.feetX = Phaser.Math.Clamp(move.x + HERO_FEET.width / 2, b.x, b.right);
      this.feetY = Phaser.Math.Clamp(move.y + HERO_FEET.height, b.y, b.bottom);
      this.level = move.level;
      this.applyHeroTransform();

      this.checkZones();
      this.checkDoors();
    }

    /**
     * Which doorway the hero is standing in, reported only when it changes.
     *
     * Polled rather than evented because a doorway is a place you STAND, not a
     * line you cross: walking out and back in must re-arm the prompt, and a
     * one-shot enter event would leave it stale the first time the hero was
     * nudged out of the box by a collider.
     */
    private checkDoors() {
      if (!this.doors.length) return;
      const feet = this.feetRect();

      let found: DoorDestination | null = null;
      for (const door of this.doors) {
        if (feetBlocked(feet, [door.polygon])) {
          found = door.destination;
          break;
        }
      }

      if (found === this.atDoor) return;
      this.atDoor = found;
      hooks.onDoorChange?.(found);
    }

    /**
     * Take off, if there is anywhere to land.
     *
     * Direction is the held input, or the facing when standing still — so Space at
     * a cliff you are already looking at does the obvious thing.
     */
    private startJump(dx: number, dy: number) {
      const facingVec: Record<HeroFacing, [number, number]> = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
      };
      const [fx, fy] = dx === 0 && dy === 0 ? facingVec[this.facing] : [dx, dy];

      const result = resolveJump(
        this.feetRect(),
        fx,
        fy,
        this.colliders.walkBlockers,
        this.elevation,
        this.level,
      );

      this.player!.anims.stop();
      this.player!.setFrame(walkFrames(this.facing)[2]);

      // A failed jump still PLAYS: he commits, does not make it, and comes back.
      // Silently refusing to move would read as a dead key rather than a hard ledge.
      this.jump = {
        fromX: this.feetX,
        fromY: this.feetY,
        toX: result.outcome === 'landed' ? result.x + HERO_FEET.width / 2 : this.feetX,
        toY: result.outcome === 'landed' ? result.y + HERO_FEET.height : this.feetY,
        toLevel: result.level,
        t: 0,
        ok: result.outcome === 'landed',
      };
    }

    /**
     * Airborne. Collision was already decided at takeoff, which is what makes the
     * whole jump a pure function of one moment and keeps it unit-testable.
     */
    private advanceJump(delta: number) {
      const j = this.jump!;
      // A failed jump is the same arc at a fraction of the reach and a bit quicker:
      // he lunges, does not reach, drops back. One path for all three failure modes.
      j.t = Math.min(1, j.t + delta / (j.ok ? JUMP_MS : JUMP_MS * 0.6));

      if (j.ok) {
        this.feetX = j.fromX + (j.toX - j.fromX) * j.t;
        this.feetY = j.fromY + (j.toY - j.fromY) * j.t;
        this.air = jumpArc(j.t);
      } else {
        this.air = jumpArc(j.t) * 0.45;
      }

      if (j.t >= 1) {
        if (j.ok) this.level = j.toLevel;
        this.air = 0;
        this.jump = undefined;
        this.checkZones();
      }
      this.applyHeroTransform();
    }

    /** The hero's floor patch, centred on his x and ending at his feet. */
    private feetRect() {
      return {
        x: this.feetX - HERO_FEET.width / 2,
        y: this.feetY - HERO_FEET.height,
        width: HERO_FEET.width,
        height: HERO_FEET.height,
      };
    }

    /**
     * Zones are passable, so they are checked after the move rather than during
     * it. Enter and leave fire once each — a door that re-fires every frame is
     * the classic way a trigger becomes unusable.
     */
    private checkZones() {
      if (!this.colliders.zones.length) return;
      const feet = this.feetRect();

      this.colliders.zones.forEach((zone, index) => {
        const inside = feetBlocked(feet, [zone.polygon]);
        const was = this.insideZones.has(index);
        if (inside === was) return;

        if (inside) this.insideZones.add(index);
        else this.insideZones.delete(index);
        this.events.emit(inside ? 'zone-enter' : 'zone-leave', index, zone);
      });
    }
  };
}


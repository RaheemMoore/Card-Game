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
  stepAction,
  walkScale,
  type ActionState,
} from '../combat/actionState';
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
  type Hand,
} from '../combat/hand';
import { effectKitFor, type EffectKit } from '../combat/effectKit';
import {
  createBlastSprite,
  createChargeEmitter,
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
      };
      projectiles?: { sim: { id: number; pos: { x: number; y: number }; outcome: string } }[];
      targets?: { pos: { x: number; y: number }; alive: boolean }[];
    };
    if (!s.action) return null;
    const scn = scene as unknown as {
      hand?: { slots: { cardId: string | null; state: string }[]; selected: number | null };
    };
    const hand = scn.hand;
    const ids = (hand?.slots ?? []).map((x) => x.cardId).filter(Boolean);
    return {
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
      element:
        (scene as unknown as { selectedKit?: () => { exact: boolean; stream: { key: string } | null } })
          .selectedKit?.()?.stream?.key ?? 'placeholder',
      committedAim: s.action.committedAim,
      projectiles: (s.projectiles ?? []).map((p) => ({
        id: p.sim.id,
        x: Math.round(p.sim.pos.x),
        y: Math.round(p.sim.pos.y),
        outcome: p.sim.outcome,
      })),
      targets: s.targets ?? [],
    };
  };

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
  slots: { cardId: string | null; state: string }[];
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
    private colliders: SceneColliders = { blockers: [], zones: [], shapes: [], missing: true };
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
    }[] = [];
    /** Element per card id, so a shot knows which art it wears. */
    private cardElements = new Map<string, ElementName | undefined>();
    private chargeEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
    private targets: BlastTarget[] = [];
    private targetGfx: Phaser.GameObjects.Rectangle[] = [];
    /** The card he holds up. Visible only while a shot is being thrown. */
    private heldCard?: Phaser.GameObjects.Rectangle;
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
    /** Edge-detects the fall, so the scatter fires once rather than every frame. */
    private wasDown = false;
    /** Which sheet the hero is actually drawn from this run. */
    private heroSheetKey: string = HERO_SHEET.key;
    /** Scale the walking sheet renders at, restored after the fall's sheet swap. */
    private heroScale = 1;

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
    private elevation: ElevationMap = EMPTY_ELEVATION;
    /**
     * Truth for collision, level and depth. The SPRITE's y is this minus the
     * jump arc, which is display only — conflating the two is how a jump becomes
     * a hero who can walk through walls at the top of his hop.
     */
    private feetY = 0;
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
        cam.centerOn(this.player.x, this.player.y);
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
      // fast and the sprawl holds — and they sum to the knockdown phase exactly,
      // because the art was timed to the state machine rather than the reverse.
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
      // A controlled source of knockdown until real enemies exist. K is a
      // deliberate stand-in for being hit hard, so the scatter-and-recover loop
      // can be played and tuned before anything in the world can hit him.
      this.knockdownKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
      // 1-4 pick a card. ONE/TWO/THREE/FOUR are the number row, not the numpad;
      // a laptop without a numpad is the common case, not the exception.
      this.slotKeys = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR,
      ].map((code) => keyboard.addKey(code));
      this.pauseKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    }

    /**
     * Push `feetY`, `level` and `air` onto the sprite and its shadow.
     *
     * One place, called from every path, so the sprite can never disagree with the
     * state the collision maths is using.
     */
    private applyHeroTransform() {
      if (!this.player) return;
      this.player.y = this.feetY - this.air;
      this.player.setDepth(
        this.depthBand ? this.level * LEVEL_STRIDE + this.feetY : 100000,
      );

      if (!this.shadow) return;
      // Pinned to the FLOOR, never to the sprite. It shrinks and fades with height
      // the way a real contact shadow does, which is what sells the arc.
      const lift = this.air / Math.max(JUMP_RISE, 1);
      this.shadow.x = this.player.x;
      this.shadow.y = this.feetY;
      this.shadow.setDepth(this.player.depth - 1);
      this.shadow.setScale(HERO_SHADOW.widthRatio * (1 - 0.2 * lift));
      this.shadow.setAlpha(HERO_SHADOW.alpha * (1 - 0.36 * lift));
    }

    update(time: number, delta: number) {
      this.compiledUpdate?.call(this, time, delta);

      // Before movePlayer, and outside it, so aim keeps resolving through a jump.
      // Sampled only on the frames movePlayer would skip and the pointer tracker
      // would carry a stale screen position across the hop, then report the whole
      // gap as travel on landing and hand aim to a mouse nobody touched.
      if (this.player && this.cursors) this.sampleAim(this.readMove());

      this.movePlayer(delta);
      this.updateCombat(delta);

      // Last, so anything reacting to the player reads where the player is NOW
      // rather than where they were a frame ago.
      this.behavior?.update(
        time,
        delta,
        this.player ? { x: this.player.x, y: this.player.y } : undefined,
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

      this.targets = [{ pos: { x: dummyX, y: dummyY }, radiusPx: 26, alive: true }];
      this.targetGfx = this.targets.map((t) => {
        const r = this.add.rectangle(t.pos.x, t.pos.y - 34, 44, 68, 0xb45c2a);
        r.setStrokeStyle(3, 0x2a1608);
        // Feet origin and ground-contact depth, the same contract every actor in
        // the world obeys — a target that ignored it would sort through walls.
        r.setOrigin(0.5, 1);
        r.setDepth(this.level * LEVEL_STRIDE + t.pos.y);
        this.depthBand?.add(r);
        return r;
      });

      this.heldCard = this.add.rectangle(0, 0, 16, 24, 0xf2e2b6);
      this.heldCard.setStrokeStyle(2, 0x6b4a1f);
      this.heldCard.setVisible(false);
      this.depthBand?.add(this.heldCard);

      const forced = resolveForcedElements();
      // A single element fills the hand; a list is dealt out slot by slot and
      // repeats if it is shorter than the hand.
      const forcedFor = (i: number) => (forced.length ? forced[i % forced.length] : undefined);

      cards.forEach((c, i) => this.cardElements.set(c.cardId, forcedFor(i) ?? c.element));
      // Practice cards have no element of their own, so the override has to reach
      // them too or the flag does nothing on exactly the profile that needs it.
      PLACEHOLDER_CARD_IDS.forEach((id, i) => {
        const e = forcedFor(i);
        if (e) this.cardElements.set(id, e);
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
    private emitHand() {
      hooks.onHandChange?.({
        selected: this.hand.selected,
        slots: this.hand.slots.map((slot) => ({ cardId: slot.cardId, state: slot.state })),
      });
    }

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

      const feet = { x: this.player.x, y: this.feetY };
      const previousPhase = this.action.phase;
      this.action = stepAction(
        this.action,
        {
          firePressed: this.fireHeld,
          hasReadyCard: canFire(this.hand),
          heavyHit: this.knockdownKey
            ? Phaser.Input.Keyboard.JustDown(this.knockdownKey)
            : false,
          aim: this.aim.aim,
        },
        delta,
      );

      // He just went down. Scatter once, on the transition — not every frame he
      // spends on the floor.
      if (this.action.phase === 'knockdown' && !this.wasDown) {
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
        const kit = this.selectedKit();
        const charge = this.action.chargeLevel;
        const origin = cardOrigin(feet, this.action.committedAim);
        // Charge changes the shot itself, not just how it looks — see scaleBlast.
        const sim = spawnProjectile(origin, this.action.committedAim, scaleBlast(DEFAULT_BLAST, charge));

        // The element's own art where it exists; the placeholder circle only when
        // nothing has been drawn for it, so a missing sheet is visible rather
        // than silently absent.
        const art = createBlastSprite(
          this,
          kit,
          origin.x,
          origin.y - CARD_HEIGHT_PX,
          this.action.committedAim,
          charge,
        );
        const gfx =
          art ??
          this.add
            .circle(origin.x, origin.y - CARD_HEIGHT_PX, 5 + 4 * charge, 0x8fd6ff)
            .setStrokeStyle(2, 0xffffff);
        this.depthBand?.add(gfx);
        this.projectiles.push({ sim, gfx, kit, charge });
      }

      for (const shot of this.projectiles) {
        shot.sim = stepProjectile(shot.sim, delta, this.colliders.blockers, this.targets);
        shot.gfx.setPosition(shot.sim.pos.x, shot.sim.pos.y - CARD_HEIGHT_PX);
        // Depth from the GROUND point, not from where it is drawn. See §7.6 and
        // CARD_HEIGHT_PX — sorting on the drawn height makes a blast pass in
        // front of walls it flew behind.
        shot.gfx.setDepth(this.level * LEVEL_STRIDE + shot.sim.pos.y);

        if (shot.sim.outcome === 'hitTarget' && shot.sim.hitTargetIndex !== null) {
          this.reactToHit(shot.sim.hitTargetIndex);
        }

        // The burst plays wherever the shot stopped, walls included — a blast
        // that vanishes against stone reads as the collision being broken.
        if (shot.sim.outcome === 'hitTarget' || shot.sim.outcome === 'hitBlocker') {
          playImpact(
            this,
            shot.kit,
            shot.sim.pos.x,
            shot.sim.pos.y - CARD_HEIGHT_PX,
            this.level * LEVEL_STRIDE + shot.sim.pos.y + 1,
            shot.charge,
          );
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
        const lead = cardOrigin(feet, this.aim.aim);
        if (!this.chargeEmitter) {
          this.chargeEmitter = createChargeEmitter(this, this.selectedKit().palette);
          this.chargeEmitter.setDepth(this.level * LEVEL_STRIDE + this.feetY + 2);
          this.depthBand?.add(this.chargeEmitter);
        }
        this.chargeEmitter.emitting = true;
        updateChargeEmitter(
          this.chargeEmitter,
          this.action.chargeLevel,
          lead.x,
          lead.y - CARD_HEIGHT_PX,
        );
      } else if (this.chargeEmitter) {
        this.chargeEmitter.emitting = false;
      }

      // The held card rides the hero while a shot is being thrown, so the shot
      // visibly comes FROM it.
      if (this.heldCard) {
        const throwing =
          charging || this.action.phase === 'windup' || this.action.phase === 'active';
        this.heldCard.setVisible(throwing);
        if (throwing) {
          const lead = cardOrigin(feet, this.action.committedAim ?? this.aim.aim);
          this.heldCard.setPosition(lead.x, lead.y - CARD_HEIGHT_PX);
          this.heldCard.setDepth(this.level * LEVEL_STRIDE + this.feetY + 1);
        }
      }
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

      const from = { x: this.player!.x, y: this.feetY };
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
          if (feetBlocked(feet, this.colliders.blockers)) return false;
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
      const feet = { x: this.player.x, y: this.feetY };

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
    private selectedKit(): EffectKit {
      const slot = this.hand.selected === null ? null : this.hand.slots[this.hand.selected];
      return effectKitFor(slot?.cardId ? this.cardElements.get(slot.cardId) : undefined);
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
      // Both sheets are authored so he stands 71px tall, so this is 1:1 and the
      // swap does not change his size.
      this.player.setScale(1);
      this.player.play(KNOCKDOWN_ANIM);
    }

    /** Get up: the fall, reversed, inside the stand-up window. */
    private playStandUp() {
      if (!this.player || !this.anims.exists(KNOCKDOWN_ANIM)) return;
      this.player.playReverse(KNOCKDOWN_ANIM);
      // Restore the walking sheet on time rather than on the animation event —
      // a clip that never completes would otherwise leave him lying down with
      // full control, which looks like the sprite broke.
      this.time.delayedCall(ACTION_TIMING.standUpMs, () => this.restoreWalkSprite());
    }

    /** Back to the walking sheet and its scale. */
    private restoreWalkSprite() {
      if (!this.player) return;
      this.player.anims.stop();
      this.player.setTexture(this.heroSheetKey, idleFrame(this.facing));
      this.player.setScale(this.heroScale);
    }

    /** A readable reaction, so a hit cannot be mistaken for a miss. */
    private reactToHit(index: number) {
      const gfx = this.targetGfx[index];
      if (!gfx) return;
      this.tweens.killTweensOf(gfx);
      gfx.setFillStyle(0xffe9a8);
      this.tweens.add({
        targets: gfx,
        x: gfx.x + 6,
        duration: 55,
        yoyo: true,
        repeat: 1,
        onComplete: () => gfx.setFillStyle(0xb45c2a),
      });
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
      this.firePressedLatch = false;

      const inputs = buildAimInputs(
        { move, pointerScreen, pointerWorld, stick, firePressed },
        { x: this.player.x, y: this.feetY },
        this.pointerTracker,
        this.time.now,
      );
      this.aim = resolveAim(this.aim, inputs);
    }

    private movePlayer(delta: number) {
      if (!this.player) return;
      if (this.jump) return this.advanceJump(delta);

      const intent = this.readMove();
      const dx = intent.x;
      const dy = intent.y;

      if (this.pauseKey && Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
        hooks.onPause?.();
      }
      if (this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey) && this.atDoor) {
        hooks.onDoorEnter?.(this.atDoor);
        return;
      }
      if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
        return this.startJump(dx, dy);
      }

      if (dx === 0 && dy === 0) {
        this.player.anims.stop();
        this.player.setFrame(idleFrame(this.facing));
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
      this.player.anims.play(this.heroWalkKey(this.facing), true);

      // Firing slows the walk rather than rooting it — he is meant to be fragile,
      // not helpless (§12.8). walkScale is 1 outside combat, so exploration is
      // untouched by this line.
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
        this.colliders.blockers,
        this.elevation,
        this.level,
      );

      this.player.x = Phaser.Math.Clamp(move.x + HERO_FEET.width / 2, b.x, b.right);
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
        this.colliders.blockers,
        this.elevation,
        this.level,
      );

      this.player!.anims.stop();
      this.player!.setFrame(walkFrames(this.facing)[2]);

      // A failed jump still PLAYS: he commits, does not make it, and comes back.
      // Silently refusing to move would read as a dead key rather than a hard ledge.
      this.jump = {
        fromX: this.player!.x,
        fromY: this.feetY,
        toX: result.outcome === 'landed' ? result.x + HERO_FEET.width / 2 : this.player!.x,
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
        this.player!.x = j.fromX + (j.toX - j.fromX) * j.t;
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
        x: this.player!.x - HERO_FEET.width / 2,
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


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
  ALWAYS_LOADED,
  EXPLORABLE_SCENES,
  SCENE_MANIFEST,
  YSORT_SCENES,
  type SceneTraits,
} from './sceneManifest';

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

const WALK_SPEED = 190;

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
export { EXPLORABLE_SCENES, YSORT_SCENES, ALWAYS_LOADED, SCENE_MANIFEST };
export type { SceneTraits };

export type Status = { phase: 'loading' | 'ready' | 'error'; message?: string };

/**
 * What the shell around the world wants to know.
 *
 * The runtime never opens a UI itself. It reports that the hero is standing in a
 * doorway and that they pressed the key; what a door OPENS is the shell's business.
 * That is what lets `/dev/scene` ignore doors entirely while `/castle` turns the
 * same event into the Forge.
 */
export interface RuntimeHooks {
  /** Fires when the hero steps into or out of a doorway. `null` on leaving. */
  onDoorChange?: (destination: DoorDestination | null) => void;
  /** Fires when they press E while standing in one. */
  onDoorEnter?: (destination: DoorDestination) => void;
  /** Fires on Escape. The pause menu is the shell's, not the world's. */
  onPause?: () => void;
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
      if (EXPLORABLE_SCENES.has(sceneName)) this.spawnPlayer(bounds);

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

      const scale = HERO_WORLD_HEIGHT / HERO_SHEET.frameHeight;

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
        .sprite(x, y, HERO_SHEET.key, idleFrame('down'))
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

      for (const f of HERO_FACINGS) {
        if (this.anims.exists(walkKey(f))) continue;
        this.anims.create({
          key: walkKey(f),
          frames: walkFrames(f).map((frame) => ({ key: HERO_SHEET.key, frame })),
          frameRate: HERO_WALK_FPS,
          repeat: -1,
        });
      }

      const keyboard = this.input.keyboard!;
      this.cursors = keyboard.createCursorKeys();
      this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
      this.jumpKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
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
      this.movePlayer(delta);

      // Last, so anything reacting to the player reads where the player is NOW
      // rather than where they were a frame ago.
      this.behavior?.update(
        time,
        delta,
        this.player ? { x: this.player.x, y: this.player.y } : undefined,
      );
    }

    private movePlayer(delta: number) {
      if (!this.player) return;
      if (this.jump) return this.advanceJump(delta);

      const left = this.cursors!.left.isDown || this.wasd!.A.isDown;
      const right = this.cursors!.right.isDown || this.wasd!.D.isDown;
      const up = this.cursors!.up.isDown || this.wasd!.W.isDown;
      const down = this.cursors!.down.isDown || this.wasd!.S.isDown;

      let dx = (right ? 1 : 0) - (left ? 1 : 0);
      let dy = (down ? 1 : 0) - (up ? 1 : 0);
      if (dx !== 0 && dy !== 0) {
        const inv = Math.SQRT1_2;
        dx *= inv;
        dy *= inv;
      }

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
      // the sheet's four rows were drawn for.
      this.facing = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left';
      this.player.anims.play(walkKey(this.facing), true);

      const step = (WALK_SPEED * delta) / 1000;
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


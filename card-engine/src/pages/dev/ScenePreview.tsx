import { useEffect, useMemo, useRef, useState } from 'react';
import {
  HERO_FACINGS,
  HERO_SHEET,
  HERO_WALK_FPS,
  HERO_WORLD_HEIGHT,
  idleFrame,
  walkFrames,
  walkKey,
  type HeroFacing,
} from '../../data/castle/heroSprite';
import { SCENE_BEHAVIORS, type SceneBehavior } from './sceneBehaviors';
import { readSceneColliders, type SceneColliders } from './sceneColliders';
import { readSceneWildlife, type SceneWildlife } from './sceneWildlife';
import { readSceneElevation, elevationShapes } from './sceneColliders';
import { GROUND_SHADOW as HERO_SHADOW, makeGroundShadowTexture } from '../castle/groundShadow';
import { buildDepthBand, LEVEL_STRIDE } from './sceneDepth';
import { feetBlocked } from '../castle/v2-preview/walkBlocking';
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
} from '../castle/v2-preview/elevation';
import { HERO_FEET } from '../../data/castle/heroSprite';

/**
 * Scene Preview — /dev/scene
 *
 * The runtime half of Phaser Editor. The Editor places objects and writes
 * `<Name>.scene` + a compiled `<Name>.js` at the GIT root; it has no game to run,
 * which is why its Play button showed Raheem a directory listing on 2026-08-07.
 *
 * This route is that missing game. It is deliberately generic — it runs WHICHEVER
 * scene it is asked for rather than being a CourtyardV2 page — because the Editor's
 * "Preview Scene" command (Ctrl+0) appends `?start=<SceneName>` to the play URL, and
 * WildlifeLab needs the same treatment CourtyardV2 does.
 *
 * The chain is:
 *   Editor Play/Preview  ->  <git root>/index.html  ->  /dev/scene?start=CourtyardV2
 *
 * The compiled class is fetched as text and its `editorCreate` is called against
 * THIS scene, rather than registering it as a scene of its own. That keeps the
 * player, camera and input here, in code we own, while every placement stays the
 * Editor's — so saving in the Editor and refreshing the browser is the whole loop.
 *
 * Collision is authored in the Editor, in a layer called `L14_COLLIDERS`, and read
 * back here by `sceneColliders.ts`. A scene without that layer still runs; you
 * simply walk through everything, which is how this route worked until 2026-08-07.
 *
 * Elevation is authored the same way, one Editor layer per level, and read by
 * `readSceneElevation`. Cliffs block by themselves once plates exist; SPACE jumps
 * one level up. See `elevation.ts` for why height is the point rather than jumping.
 *
 * URL flags: `?colliders=show`, `?wildlife=show`, `?markers=show`, `?levels=show`.
 */

const DEFAULT_SCENE = 'CourtyardV2';

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

type PackEntry = {
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
async function loadPackEntries(): Promise<PackEntry[]> {
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
async function fetchSceneSource(sceneName: string): Promise<string> {
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
function entriesUsedBy(source: string, entries: PackEntry[], always: string[]): PackEntry[] {
  const used = entries.filter((e) => source.includes(`"${e.key}"`) || always.includes(e.key));
  // If a scene somehow names nothing we recognise, load everything rather than
  // render an empty world and call it success.
  return used.length > 0 ? used : entries;
}

/** Matches the Editor's own zoom so pieces read at the size they were placed at. */
const ZOOM = 2;
const WALK_SPEED = 190;

/**
 * Scenes that get the walkable hero.
 *
 * WildlifeLab is here because its subject IS the reaction to a player — the
 * animals' flee and observe radii cannot be reviewed without something to walk
 * at them — so it needs the hero for the same reason the courtyard does.
 */
const EXPLORABLE_SCENES = new Set(['CourtyardV2', 'WildlifeLab']);

/**
 * Scenes whose objects are collapsed into one y-sorted band (see sceneDepth.ts).
 *
 * Opt-in rather than universal: y-sorting reparents every object, which is right
 * for a world you walk around in and wrong for a lab whose whole job is to show
 * clips in a fixed arrangement.
 */
const YSORT_SCENES = new Set(['CourtyardV2']);

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
  'wildlife-rabbit-hop',
  'wildlife-rabbit-nibble-groom',
  'wildlife-tortoise-toddle',
] as const;

const ALWAYS_LOADED: Record<string, readonly string[]> = {
  WildlifeLab: WILDLIFE_SHEETS,
  CourtyardV2: WILDLIFE_SHEETS,
};

type Status = { phase: 'loading' | 'ready' | 'error'; message?: string };

function makeScene(
  Phaser: typeof import('phaser'),
  sceneName: string,
  source: string,
  entries: PackEntry[],
  report: (s: Status) => void,
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
      cam.setZoom(ZOOM);

      // Explorable scenes get the temporary player. This once excluded every lab
      // on the grounds that a hero hides the subject — true of a lab that only
      // plays clips, but WildlifeLab's subject is how the animals REACT to a
      // player, so there it is the hero's absence that hides the subject.
      if (EXPLORABLE_SCENES.has(sceneName)) this.spawnPlayer(bounds);

      if (sceneName === 'CourtyardV2') {
        // Snap first, then follow. A lerped follow starting from 0,0 spends its first
        // second looking at the corner of the map, which reads as "nothing loaded".
        cam.centerOn(this.player!.x, this.player!.y);
        cam.startFollow(this.player!, true, 0.12, 0.12);
      } else {
        // A lab is small enough to hold in one shot; a camera that chases the
        // hero around it would keep the other animals off screen.
        cam.centerOn(bounds.centerX, bounds.centerY);
      }

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

      if (this.jumpKey && Phaser.Input.Keyboard.JustDown(this.jumpKey)) {
        return this.startJump(dx, dy);
      }

      if (dx === 0 && dy === 0) {
        this.player.anims.stop();
        this.player.setFrame(idleFrame(this.facing));
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

export function ScenePreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>({ phase: 'loading' });

  const sceneName = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('start') ?? DEFAULT_SCENE;
    // The name goes into a filename and into evaluated code — nothing but a plain
    // identifier is ever allowed through.
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(raw) ? raw : DEFAULT_SCENE;
  }, []);

  useEffect(() => {
    let game: import('phaser').Game | undefined;
    let cancelled = false;

    void (async () => {
      let Phaser: typeof import('phaser');
      let allEntries: PackEntry[];
      let source: string;
      try {
        [Phaser, allEntries, source] = await Promise.all([
          import('phaser').then((m) => m.default),
          loadPackEntries(),
          fetchSceneSource(sceneName),
        ]);
      } catch (err) {
        if (!cancelled) setStatus({ phase: 'error', message: String(err) });
        return;
      }
      if (cancelled || !hostRef.current) return;

      const entries = entriesUsedBy(source, allEntries, [
        HERO_SHEET.key,
        ...(ALWAYS_LOADED[sceneName] ?? []),
      ]);
      const Scene = makeScene(Phaser, sceneName, source, entries, (s) => {
        if (!cancelled) setStatus(s);
      });
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: '#0b0f0a',
        pixelArt: true,
        // Fill the browser window and keep filling it as the window changes.
        // RESIZE must NOT be paired with autoCenter — centring pins the canvas at
        // its config size and letterboxes the rest, which is the "small viewport
        // in the middle" Raheem saw.
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
          width: '100%',
          height: '100%',
        },
        scene: [Scene],
      });
      (window as unknown as { __scenePreview?: unknown }).__scenePreview = game;
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, [sceneName]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={hostRef} className="h-full w-full" />

      <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/70 px-3 py-2 text-xs text-white/80">
        <div className="font-bold text-amber-300">{sceneName}</div>
        <div>
          {sceneName === 'CourtyardV2'
            ? 'WASD / arrows to walk · SPACE to jump up a ledge · ?levels=show · ?colliders=show · ?wildlife=show'
            : sceneName === 'WildlifeLab'
              ? 'WASD / arrows to walk · get close and watch them react'
              : 'Scene behavior is running'}
        </div>
        <div className="text-white/40">Save in the Editor, then refresh</div>
        {status.phase === 'ready' && status.message && (
          <div className="mt-1 max-w-md text-amber-400">{status.message}</div>
        )}
      </div>

      {status.phase === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-white/60">Loading scene…</div>
      )}
      {status.phase === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-8">
          <div className="max-w-lg rounded border border-red-500/40 bg-red-950/70 p-4 text-sm text-red-100">
            <p className="mb-2 font-bold">Could not run “{sceneName}”.</p>
            <p className="mb-2">{status.message}</p>
            <p className="text-red-200/60">
              The Editor writes the compiled file when the scene is SAVED. If this scene has never
              been saved since it was last edited, there is nothing on disk to run.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

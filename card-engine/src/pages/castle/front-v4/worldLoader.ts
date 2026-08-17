import Phaser from 'phaser';
import { DEPTH } from './layout';
import {
  ACTOR_MARKERS,
  AUTHORED_GROUND_LABEL,
  BACKGROUND_PREFIX,
  EDITOR_ONLY_PREFIX,
  LIVE_PREFIX,
  WALL_PREFIX,
  liveClipKey,
  parseAuthoredLabels,
} from './worldLabels';

/**
 * Loads the world Raheem places in Phaser Editor.
 *
 * THIS IS THE WHOLE POINT OF THE EDITOR ARRANGEMENT. He opens the project in
 * Phaser Editor, drags walls, towers and buildings around, saves, and refreshes
 * the game — no code in between. Combat, actors and rules stay in TypeScript; the
 * static world is authored visually, because placement is a judgement about how a
 * place feels and that is not a thing to express as coordinates in a diff.
 *
 * HOW IT ACTUALLY WORKS, because none of it is obvious:
 *
 *  - The Editor's project root is the GIT root, not `card-engine/`. It writes
 *    `<Name>.scene` (its own format) and compiles `<Name>.js` beside it.
 *  - That `.js` is a bare `class <Name> extends Phaser.Scene` with NO export and
 *    NO import — it is written for a `<script>` tag. A static import cannot reach
 *    it, which is why this evaluates the source text instead.
 *  - `card-engine/vite.config.ts` serves those files at `/editor-scenes/<Name>.js`
 *    in dev and copies them into the build, so the same URL works deployed.
 *  - Only `editorCreate()` is borrowed. The compiled class's own lifecycle is
 *    ignored: this scene owns `create`, `update`, input and the camera, and the
 *    authored file contributes nothing but a pile of positioned game objects.
 *
 * ABSENCE IS NORMAL, NOT AN ERROR. Until Raheem has placed anything there is no
 * world file, and the scene must still play — the provisional backdrop stands in.
 * A missing world logs one line and returns `absent`; it never throws into
 * `create()`, because a half-built world that stops the game booting is a worse
 * failure than a bare one.
 *
 * NEVER hand-edit the `.scene` file. The Editor rewrites it wholesale on save and
 * has already eaten hand-set depths once.
 */

export type WorldLoadStatus = 'loaded' | 'absent' | 'failed';

export interface WorldLoadResult {
  status: WorldLoadStatus;
  sceneName: string;
  /** How many textures were pulled in for it. */
  texturesLoaded: number;
  /** How many game objects the authored scene contributed, after stripping refs. */
  objects?: number;
  /** Labels in creation order, refs included. For the dev readout. */
  labels?: string[];
  /** True when the authored scene supplies the ground, so code should not. */
  suppliesGround?: boolean;
  /**
   * The surface everything stands on, measured off the authored `GROUND` object.
   *
   * `y` is its TOP edge — the contact line, not the middle of the slab — and
   * `minX`/`maxX` its horizontal extent, so the scene can tell when the ground is
   * narrower than the arena the player can walk in.
   */
  ground?: { y: number; minX: number; maxX: number };
  /**
   * Hard edges the player cannot walk past, from objects labelled `WALL*`.
   *
   * Reported as the walls' inner faces so the scene can just take the tightest
   * pair. A wall left of the spawn closes the west; one to the east closes the
   * east; the scene decides which is which from where the player starts.
   */
  walls?: Array<{ left: number; right: number }>;
  /**
   * Where Raheem put each background layer, keyed by its `BG_*` label.
   *
   * Measured from rendered bounds and handed to the backdrop, which rebuilds the
   * layer camera-pinned at those proportions. See `BACKGROUND_PREFIX`.
   */
  background?: Record<string, AuthoredPlacement>;
  /**
   * Where the actors stand and how big they are, from the `REF_*_spawn` markers.
   * Keyed by label. See `ACTOR_MARKERS`.
   */
  actors?: Record<string, AuthoredActor>;
  /**
   * How many `LIVE_*` objects were placed, and how many are actually animating.
   *
   * Both numbers, because the gap between them is the whole story. A scene with
   * six placed and zero playing photographs exactly like one that is alive, so
   * this is the only way the difference is visible without watching it.
   */
  live?: { placed: number; animating: number };
  message?: string;
}

/** A spawn marker: its ground contact, and the scale it was drawn at. */
export interface AuthoredActor {
  x: number;
  scale: number;
}

/** A rectangle somebody dragged, plus how strongly they wanted it to read. */
export interface AuthoredPlacement {
  left: number;
  top: number;
  width: number;
  height: number;
  alpha: number;
}

/**
 * Where the authored ground's surface actually is.
 *
 * Read from rendered bounds rather than from `y`, because the object's origin is
 * whatever was set in the Editor: a rectangle placed with `originY: 0` reports the
 * surface as its `y`, one with `originY: 1` reports the bottom of the slab, and
 * trusting `y` would put the hero waist-deep or floating depending on a setting
 * nobody would think to check.
 */
function measureGround(
  object: Phaser.GameObjects.GameObject | undefined,
): { y: number; minX: number; maxX: number } | undefined {
  const bounds = measureBounds(object);
  const withTop = object as unknown as { getBounds?: () => { top: number } };
  if (!bounds || !withTop?.getBounds) return undefined;
  return { y: withTop.getBounds().top, minX: bounds.left, maxX: bounds.right };
}

/**
 * The full rectangle an authored object occupies, plus its alpha.
 *
 * From rendered bounds rather than from `x`/`y`/`width`, for the same reason
 * `measureGround` does: the origin is whatever was set in the Editor, and a
 * TileSprite dragged with `originY: 1` reports its BOTTOM as `y`. Bounds are the
 * one reading that means the same thing however the object was configured.
 */
function measurePlacement(
  object: Phaser.GameObjects.GameObject | undefined,
): AuthoredPlacement | undefined {
  const withBounds = object as unknown as {
    getBounds?: () => { left: number; top: number; width: number; height: number };
    alpha?: number;
  };
  if (!withBounds?.getBounds) return undefined;
  const b = withBounds.getBounds();
  return {
    left: b.left,
    top: b.top,
    width: b.width,
    height: b.height,
    alpha: typeof withBounds.alpha === 'number' ? withBounds.alpha : 1,
  };
}

/**
 * Set every `LIVE_*` object playing its texture's loop.
 *
 * WHAT MAKES THIS SAFE TO CALL ON ANYTHING: it asks the object whether it can
 * animate at all. Phaser Editor emits an `Image` unless the object was explicitly
 * made a `Sprite`, and only a Sprite carries `anims` — so a banner Raheem dropped
 * in as an Image simply does not qualify, draws its first frame, and waits for him
 * to convert it. Nothing throws, nothing is logged as broken, because neither of
 * those is a fault: art routinely lands before its animation does.
 *
 * Returns how many actually started, which is the number worth reporting. "Six
 * LIVE_ objects placed, zero animating" is the exact shape of the problem a human
 * cannot see in a screenshot — a still frame of a scene that should be alive looks
 * identical to a scene that is.
 */
function startLiveObjects(labels: string[], objects: Phaser.GameObjects.GameObject[]): number {
  let started = 0;
  labels.forEach((label, i) => {
    if (!label.startsWith(LIVE_PREFIX)) return;
    const sprite = objects[i] as unknown as {
      anims?: { play?: (key: string) => unknown };
      texture?: { key?: string };
      scene?: { anims?: { exists?: (key: string) => boolean } };
    };
    const textureKey = sprite?.texture?.key;
    if (!textureKey || typeof sprite.anims?.play !== 'function') return;
    const clip = liveClipKey(textureKey);
    if (!sprite.scene?.anims?.exists?.(clip)) return;
    sprite.anims.play(clip);
    started += 1;
  });
  return started;
}

/** Horizontal extent of any authored object, or undefined if it has no bounds. */
function measureBounds(
  object: Phaser.GameObjects.GameObject | undefined,
): { left: number; right: number } | undefined {
  const withBounds = object as unknown as {
    getBounds?: () => { left: number; right: number };
  };
  if (!withBounds?.getBounds) return undefined;
  const bounds = withBounds.getBounds();
  return { left: bounds.left, right: bounds.right };
}

interface PackFile {
  type: string;
  key: string;
  url: string;
  frameConfig?: { frameWidth: number; frameHeight: number };
}

/** Fast membership test for the two marker labels. */
const MARKER_LABELS = new Set<string>(Object.values(ACTOR_MARKERS));

/**
 * Asset packs the authored world may draw from. Order is irrelevant; keys are unique.
 *
 * `castle-front` is the side-view kit and the only one whose art belongs in this
 * scene. `halo-stone-castle` is kept reachable because it still holds the hero and
 * creature sheets the reference markers use — but its structures are top-down and
 * three-quarter, and placing them here is the mistake SIDE_VIEW_ANGLE_SPEC.md
 * exists to prevent.
 */
const PACKS = [
  '/asset-pack.json',
  '/assets/kits/castle-front/kit-pack.json',
  '/assets/kits/halo-stone-castle/kit-pack.json',
];

export async function loadEditorWorld(
  scene: Phaser.Scene,
  sceneName: string,
): Promise<WorldLoadResult> {
  const empty = (status: WorldLoadStatus, message?: string): WorldLoadResult => ({
    status,
    sceneName,
    texturesLoaded: 0,
    message,
  });

  let source: string;
  try {
    // Cache-busted: the whole workflow is "save in the Editor, refresh the game",
    // and a cached world would make that loop silently do nothing.
    const res = await fetch(`/editor-scenes/${sceneName}.js?t=${Date.now()}`);
    if (!res.ok) return empty('absent', `${res.status} ${res.statusText}`);
    source = await res.text();
  } catch (error) {
    return empty('absent', String(error));
  }
  if (!source.includes(`class ${sceneName}`)) {
    return empty('failed', `${sceneName}.js does not define class ${sceneName}`);
  }

  let texturesLoaded = 0;
  try {
    texturesLoaded = await loadTexturesFor(scene, source);
  } catch (error) {
    return empty('failed', `textures: ${String(error)}`);
  }

  try {
    // `new Function` rather than `eval` so the source cannot see this closure, and
    // Phaser is handed in explicitly because the compiled file expects it global.
    const factory = new Function('Phaser', `${source}\n;return ${sceneName};`) as (
      phaser: typeof Phaser,
    ) => { prototype: { editorCreate?: () => void } };
    const Compiled = factory(Phaser);
    const editorCreate = Compiled?.prototype?.editorCreate;
    if (typeof editorCreate !== 'function') {
      return { ...empty('failed', 'compiled scene has no editorCreate()'), texturesLoaded };
    }

    // Remember what was already on stage, so the authored objects can be told
    // apart from the backdrop and the actors afterwards.
    const before = new Set(scene.children.list);
    editorCreate.call(scene);
    let authored = scene.children.list.filter((child) => !before.has(child));

    // Strip the editor-only reference art. Positional: the labels are emitted one
    // per object in creation order (see parseAuthoredLabels). If the counts ever
    // disagree — a nested container, a change in the Editor's output — nothing is
    // stripped and it says so, because removing the WRONG object from someone's
    // level is far worse than leaving a ghost visible.
    const labels = parseAuthoredLabels(source);
    // Captured while the labels and the objects still line up one-to-one, which
    // is only true before anything is stripped.
    const aligned = labels.length === authored.length;
    const groundObject = aligned ? authored[labels.indexOf(AUTHORED_GROUND_LABEL)] : undefined;
    const walls = aligned
      ? labels
          .map((label, i) => (label.startsWith(WALL_PREFIX) ? measureBounds(authored[i]) : undefined))
          .filter((b): b is { left: number; right: number } => b !== undefined)
      : [];

    // The background layers, measured while the objects still exist. They are
    // removed a few lines below along with the reference art: the backdrop rebuilds
    // each one pinned to the camera, and an authored copy left in world space would
    // slide past at full speed — a mountain range travelling with the ground, which
    // is the one thing a background must never do.
    const background: Record<string, AuthoredPlacement> = {};
    const actors: Record<string, AuthoredActor> = {};
    if (aligned) {
      labels.forEach((label, i) => {
        if (label.startsWith(BACKGROUND_PREFIX)) {
          const placement = measurePlacement(authored[i]);
          if (placement) background[label] = placement;
          return;
        }
        if (!MARKER_LABELS.has(label)) return;
        // `x` and `scaleX` off the object itself, not from bounds: the markers are
        // placed with their origin ON the ground contact (0.5/0.986 for the hero,
        // 0.571/0.926 for the creature — both measured off the sheets' padding), so
        // `x` already IS the spawn point, and bounds would give the art's edge.
        const marker = authored[i] as unknown as { x?: number; scaleX?: number };
        if (typeof marker?.x !== 'number') return;
        actors[label] = {
          x: marker.x,
          scale: typeof marker.scaleX === 'number' && marker.scaleX > 0 ? marker.scaleX : 1,
        };
      });
    }

    // Kept in lockstep with `authored` through the strip, because after it the
    // label list and the object list no longer line up — and everything downstream
    // that asks "which object is this?" has to ask the surviving pair, not the
    // original one.
    let keptLabels: string[] = labels;
    if (labels.length === authored.length) {
      const kept: typeof authored = [];
      const keptNames: string[] = [];
      authored.forEach((child, i) => {
        const editorOnly =
          labels[i].startsWith(EDITOR_ONLY_PREFIX) || labels[i].startsWith(BACKGROUND_PREFIX);
        if (editorOnly) {
          child.destroy();
          return;
        }
        kept.push(child);
        keptNames.push(labels[i]);
      });
      authored = kept;
      keptLabels = keptNames;
    } else if (labels.some((l) => l.startsWith(EDITOR_ONLY_PREFIX))) {
      console.warn(
        `[front-v4] ${sceneName}: ${labels.length} labels for ${authored.length} objects — ` +
          `leaving ${EDITOR_ONLY_PREFIX}* reference objects in place rather than guessing which they are.`,
      );
    }

    // Wake the scenery up. Anything labelled LIVE_* whose texture has a registered
    // loop starts playing it and never stops — see LIVE_PREFIX for why background
    // life is ambient rather than triggered.
    const live = startLiveObjects(keptLabels, authored);

    // THE DEPTH OFFSET, and it is the difference between placement working and
    // appearing to do nothing. Phaser Editor hands a new object depth 0, which in
    // this scene is the SKY — so a wall placed at the castle renders behind the
    // backdrop and the editor looks broken. Offsetting by DEPTH.world puts the
    // whole authored set in front of the scenery and behind the people, while
    // ADDING whatever depth was set in the Editor preserves the ordering that was
    // deliberately chosen there.
    for (const child of authored) {
      const withDepth = child as unknown as { depth?: number; setDepth?: (d: number) => unknown };
      if (typeof withDepth.setDepth === 'function') {
        withDepth.setDepth(DEPTH.world + (withDepth.depth ?? 0));
      }
    }
    return {
      status: 'loaded',
      sceneName,
      texturesLoaded,
      objects: authored.length,
      labels,
      ground: measureGround(groundObject),
      walls,
      background,
      actors,
      live: { placed: keptLabels.filter((l) => l.startsWith(LIVE_PREFIX)).length, animating: live },
      suppliesGround: labels.includes(AUTHORED_GROUND_LABEL),
    };
  } catch (error) {
    return { ...empty('failed', String(error)), texturesLoaded };
  }
}

/**
 * Load exactly the textures the authored world names, and nothing else.
 *
 * Substring-matched against the compiled source, the same test the courtyard used:
 * the kit is 306 assets and a world uses a handful, so loading the pack wholesale
 * would drag megabytes in to place four walls.
 */
async function loadTexturesFor(scene: Phaser.Scene, source: string): Promise<number> {
  const entries: PackFile[] = [];
  for (const packUrl of PACKS) {
    try {
      const res = await fetch(packUrl);
      if (!res.ok) continue;
      const pack = (await res.json()) as Record<string, { files?: PackFile[] }>;
      for (const [section, body] of Object.entries(pack)) {
        if (section === 'meta' || !body?.files) continue;
        entries.push(...body.files);
      }
    } catch {
      // A missing pack is not fatal — the world may only use textures this scene
      // already loaded itself.
    }
  }

  let queued = 0;
  for (const file of entries) {
    if (scene.textures.exists(file.key)) continue;
    if (!source.includes(`"${file.key}"`) && !source.includes(`'${file.key}'`)) continue;
    // Root-absolute. Pack URLs are relative to the public root, and this scene can
    // be mounted at a two-segment path (`/dev/castle-front-v4`), where a relative
    // URL resolves one directory too deep and every texture 404s to a black screen.
    const url = file.url.startsWith('/') ? file.url : `/${file.url}`;
    if (file.type === 'spritesheet' && file.frameConfig) {
      scene.load.spritesheet(file.key, url, file.frameConfig);
    } else {
      scene.load.image(file.key, url);
    }
    queued++;
  }

  if (queued === 0) return 0;

  await new Promise<void>((resolve) => {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
    scene.load.start();
  });

  // Kit art is pixel art; the game is not globally `pixelArt` because the sky is a
  // smooth gradient. Filter per texture, after the load, or placed walls blur.
  for (const file of entries) {
    if (scene.textures.exists(file.key)) {
      scene.textures.get(file.key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }
  registerLiveClips(scene, entries);
  return queued;
}

/**
 * Frames per second for ambient scenery.
 *
 * Deliberately slower than a character's. Background life is meant to be noticed
 * and then ignored — a smith at 10fps in the middle distance reads as frantic, and
 * pulls the eye off the fight, which is the opposite of what scenery is for. Per
 * sheet override belongs in the kit manifest if a piece ever needs it; nothing has
 * yet, and inventing the knob before the need is how a config grows.
 */
const LIVE_CLIP_FPS = 6;

/**
 * Give every loaded multi-frame sheet a `<key>-loop` animation.
 *
 * WHY EVERY SHEET RATHER THAN A DECLARED LIST: the whole arrangement is that
 * Raheem drags a thing in and it works. A separate list of "which kit art is
 * animatable" is a second place to update, three directories from the art, that
 * silently does nothing when forgotten — and "I placed it and it just stands
 * there" is exactly the failure this convention exists to remove.
 *
 * A single-frame sheet gets nothing, which is correct: an animation of one frame
 * is a still image with a timer attached.
 */
function registerLiveClips(scene: Phaser.Scene, entries: PackFile[]) {
  for (const file of entries) {
    if (file.type !== 'spritesheet') continue;
    const texture = scene.textures.get(file.key);
    // `__BASE` is Phaser's own whole-image frame and is present on every texture,
    // so it has to come out before the count means anything.
    const frames = texture?.getFrameNames?.() ?? [];
    if (frames.length < 2) continue;
    const key = liveClipKey(file.key);
    // The animation manager is global and throws on a duplicate, so this has to
    // stay idempotent across scene restarts and route changes.
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: frames.map((frame) => ({ key: file.key, frame })),
      frameRate: LIVE_CLIP_FPS,
      repeat: -1,
    });
  }
}

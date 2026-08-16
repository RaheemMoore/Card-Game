import Phaser from 'phaser';
import { DEPTH } from './layout';
import {
  AUTHORED_GROUND_LABEL,
  EDITOR_ONLY_PREFIX,
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
  message?: string;
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
  const withBounds = object as unknown as {
    getBounds?: () => { top: number; left: number; right: number };
  };
  if (!withBounds?.getBounds) return undefined;
  const bounds = withBounds.getBounds();
  return { y: bounds.top, minX: bounds.left, maxX: bounds.right };
}

interface PackFile {
  type: string;
  key: string;
  url: string;
  frameConfig?: { frameWidth: number; frameHeight: number };
}

/** Asset packs the authored world may draw from. Order is irrelevant; keys are unique. */
const PACKS = ['/asset-pack.json', '/assets/kits/halo-stone-castle/kit-pack.json'];

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
    const groundObject =
      labels.length === authored.length
        ? authored[labels.indexOf(AUTHORED_GROUND_LABEL)]
        : undefined;

    if (labels.length === authored.length) {
      const kept: typeof authored = [];
      authored.forEach((child, i) => {
        if (labels[i].startsWith(EDITOR_ONLY_PREFIX)) child.destroy();
        else kept.push(child);
      });
      authored = kept;
    } else if (labels.some((l) => l.startsWith(EDITOR_ONLY_PREFIX))) {
      console.warn(
        `[front-v4] ${sceneName}: ${labels.length} labels for ${authored.length} objects — ` +
          `leaving ${EDITOR_ONLY_PREFIX}* reference objects in place rather than guessing which they are.`,
      );
    }

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
  return queued;
}

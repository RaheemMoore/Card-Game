import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ALWAYS_LOADED,
  DEFAULT_SCENE,
  entriesUsedBy,
  fetchSceneSource,
  loadPackEntries,
  makeScene,
  type PackEntry,
  type Status,
} from '../castle/v2/courtyardRuntime';
import { SCENE_BEHAVIORS } from './sceneBehaviors';
import { HERO_SHEET } from '../../data/castle/heroSprite';

/**
 * Scene Preview — /dev/scene
 *
 * The review half of Phaser Editor. The Editor places objects and writes
 * `<Name>.scene` + a compiled `<Name>.js` at the GIT root; it has no game to run,
 * which is why its Play button showed Raheem a directory listing on 2026-08-07.
 *
 * The chain is:
 *   Editor Play/Preview  ->  <git root>/index.html  ->  /dev/scene?start=CourtyardV2
 *
 * Deliberately generic — it runs WHICHEVER scene it is asked for, because the
 * Editor's "Preview Scene" command (Ctrl+0) appends `?start=<SceneName>`.
 *
 * The world itself lives in `castle/v2/courtyardRuntime.ts` and is shared with the
 * real `/castle`. This route is the one you point debug flags at:
 * `?colliders=show`, `?levels=show`, `?markers=show`, `?wildlife=show`.
 */

export function ScenePreview() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<Status>({ phase: 'loading' });

  const sceneName = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get('start') ?? DEFAULT_SCENE;
    // The name goes into a filename and into evaluated code — nothing but a plain
    // identifier is ever allowed through.
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(raw) ? raw : DEFAULT_SCENE;
  }, []);

  const hasBehavior = SCENE_BEHAVIORS[sceneName] !== undefined;

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
          {/*
            This said "Scene behavior is running" for every scene it had no line
            for — including CourtyardV3, which had no behaviour registered at all.
            It read as reassurance while the animals stood still. The fallback now
            claims nothing, and SCENE_BEHAVIORS is the single source of the claim.
          */}
          {hasBehavior
            ? 'WASD / arrows to walk · SPACE to jump up a ledge · ?levels=show · ?colliders=show · ?wildlife=show'
            : 'WASD / arrows to walk · no scene behaviour registered'}
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

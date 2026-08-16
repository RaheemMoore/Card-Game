import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type Phaser from 'phaser';

/**
 * `/dev/scene` — what Phaser Editor's Play button hands off to.
 *
 * Generic on purpose: the Editor appends `?start=<SceneName>` when you preview a
 * scene, so one route serves every scene Raheem authors, present and future.
 *
 * REBUILT 2026-08-16, much smaller. It used to boot through the top-down
 * courtyard's runtime — a 3470-line module that knew about walk blockers,
 * elevation plates, Y-sorting and wildlife — because the only scenes worth
 * previewing were courtyards. That runtime was deleted with the perspective
 * change, and what remains is the part that was ever actually needed here:
 * fetch the compiled scene, run its `editorCreate()`, and show it.
 *
 * It is a LOOK, not a play. There is no player, no combat and no camera policy —
 * this answers "did my placement land where I meant it to", and the game answers
 * everything else. Keeping it dumb is what stops it drifting into a second,
 * subtly different copy of the castle.
 */
export function ScenePreview() {
  const [params] = useSearchParams();
  const sceneName = params.get('start') ?? '';
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>('booting');

  useEffect(() => {
    if (!sceneName) {
      setStatus('no ?start=<SceneName> given');
      return;
    }
    let alive = true;
    let game: Phaser.Game | null = null;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        const [{ default: PhaserLib }, { loadEditorWorld }] = await Promise.all([
          import('phaser'),
          import('../castle/front-v4/worldLoader'),
        ]);
        if (!alive) return;

        class Preview extends PhaserLib.Scene {
          async create() {
            const result = await loadEditorWorld(this, sceneName);
            if (!alive) return;
            setStatus(
              result.status === 'loaded'
                ? `${sceneName}: loaded, ${result.texturesLoaded} texture(s)`
                : `${sceneName}: ${result.status}${result.message ? ` — ${result.message}` : ''}`,
            );
            this.cameras.main.setBackgroundColor('#12101a');
          }
        }

        game = new PhaserLib.Game({
          type: PhaserLib.AUTO,
          parent: host,
          scale: { mode: PhaserLib.Scale.RESIZE, autoCenter: PhaserLib.Scale.NO_CENTER, width: '100%', height: '100%' },
          backgroundColor: '#12101a',
          scene: [Preview],
        });
        if (!alive) {
          game.destroy(true, false);
          game = null;
        }
      } catch (error) {
        if (alive) setStatus(`failed: ${String(error)}`);
      }
    })();

    return () => {
      alive = false;
      game?.destroy(true, false);
      game = null;
    };
  }, [sceneName]);

  return (
    <main className="min-h-screen bg-[#0c1118] p-4 text-white">
      <header className="mx-auto mb-3 max-w-[1280px]">
        <p className="text-xs font-bold tracking-[0.22em] text-amber-300">
          PHASER EDITOR PREVIEW · NOT THE GAME
        </p>
        <h1 className="font-fantasy text-xl text-amber-100">{sceneName || 'No scene selected'}</h1>
        <p className="text-sm text-white/50">
          Placement only. The playable castle is <code className="text-white/70">/castle</code>.
        </p>
      </header>
      <section
        className="relative mx-auto max-w-[1280px] overflow-hidden rounded-xl border border-white/15 bg-black"
        style={{ aspectRatio: '16 / 9' }}
      >
        <div ref={hostRef} className="absolute inset-0" />
      </section>
      <output
        id="scene-preview-result"
        data-status={status.includes('loaded') ? 'pass' : 'info'}
        className="mx-auto mt-3 block max-w-[1280px] text-xs text-white/45"
      >
        {status}
      </output>
    </main>
  );
}

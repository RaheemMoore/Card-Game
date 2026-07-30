import { useEffect, useState, type RefObject } from 'react';
import type Phaser from 'phaser';

/**
 * Owns the Phaser game instance's entire lifecycle.
 *
 * The hard part is StrictMode: in development React mounts, unmounts, and
 * remounts every effect. Because construction is async (the engine is
 * dynamically imported to stay out of the main bundle), a naive integration
 * finishes its import *after* cleanup has already run and then instantiates a
 * second, orphaned game — the classic duplicate-canvas bug. The `alive` flag
 * captured in the effect closure is checked after the await to prevent that.
 *
 * A module-scope singleton would also prevent duplicates, but it breaks
 * re-entry: leaving and returning to the courtyard would find a destroyed
 * instance still recorded. So ownership lives per-mount, in the effect.
 */
export type PhaserStatus = 'loading' | 'ready' | 'error';

export interface PhaserHandle {
  status: PhaserStatus;
  /** Null until ready. The overlay subscribes to its event emitter. */
  game: Phaser.Game | null;
}

export function usePhaserGame(containerRef: RefObject<HTMLDivElement | null>): PhaserHandle {
  const [status, setStatus] = useState<PhaserStatus>('loading');
  const [instance, setInstance] = useState<Phaser.Game | null>(null);

  useEffect(() => {
    let alive = true;
    let game: Phaser.Game | null = null;

    const container = containerRef.current;
    if (!container) return;

    void (async () => {
      try {
        const { createGame } = await import('./courtyard/createGame');
        // Cleanup may have run while the engine chunk was in flight.
        if (!alive) return;
        game = createGame(container);
        setInstance(game);
        setStatus('ready');
      } catch (err) {
        console.error('[castle] failed to start the courtyard', err);
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
      // destroy(removeCanvas, noReturn) — drop the canvas, keep Phaser's
      // globals so a later re-entry can construct a fresh game.
      game?.destroy(true, false);
      game = null;
      setInstance(null);
    };
  }, [containerRef]);

  return { status, game: instance };
}

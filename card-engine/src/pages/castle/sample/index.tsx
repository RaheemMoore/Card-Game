import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';

/**
 * /dev/courtyard-sample — the pixel-courtyard comparison.
 *
 * A decision artifact: it exists so the pixel-art direction can be judged
 * against the painted plate with the same hero in both, then kept or discarded.
 * It deliberately does NOT portal to fullscreen or touch the live courtyard.
 *
 * The lifecycle contract is the same one /castle uses, and for the same reason:
 * construction is async (dynamic import), so an `alive` flag captured in the
 * effect closure is checked AFTER the await — otherwise StrictMode's
 * mount/unmount/remount leaves a second orphaned canvas behind.
 */
export function CourtyardSample() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    let game: Phaser.Game | null = null;
    const container = containerRef.current;
    if (!container) return;

    void (async () => {
      try {
        const { createSampleGame } = await import('./createSampleGame');
        if (!alive) return;
        game = createSampleGame(container);
        setStatus('ready');
      } catch (err) {
        console.error('[pixel-sample] failed to start', err);
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
      game?.destroy(true, false);
      game = null;
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-4">
      <header>
        <h1 className="font-fantasy text-2xl font-bold text-amber-200 tracking-wider">
          Pixel Courtyard — Sample
        </h1>
        <p className="text-sm text-white/60 mt-1">
          A comparison against the painted courtyard, using the same hero. Walk around with WASD or
          the arrow keys, or click where you want to go. Nothing here affects the live castle.
        </p>
      </header>

      <div
        className="relative w-full rounded-xl overflow-hidden border border-white/15"
        style={{ aspectRatio: '4 / 3', background: '#0e0d12' }}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {status === 'loading' && (
          <p className="absolute inset-0 grid place-items-center text-white/50 text-sm">
            Loading the sample…
          </p>
        )}
        {status === 'error' && (
          <p className="absolute inset-0 grid place-items-center text-red-300 text-sm">
            Failed to load — check the console.
          </p>
        )}
      </div>

      <p className="text-xs text-white/40">
        Judge in this order: does the hero belong here more than on the painting; which do you
        prefer to look at; and remember that every element here is a real object that can glow,
        move, or be replaced — the painting is permanently baked.
      </p>
    </div>
  );
}

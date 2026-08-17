import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { FRONT_V4_EVENTS, type FrontV4ScenePort, type FrontV4Snapshot } from './types';
import { FRONT_V4_VIEW } from './layout';

/**
 * The React host for the side-view proof.
 *
 * ONE GAME PER MOUNT, and the `alive` flag is what enforces it. React StrictMode
 * runs effects twice in development, and both the engine import and the scene
 * import are awaited — so cleanup can run while a construction is still in flight.
 * Re-checking after EVERY await, and destroying an instance that finished building
 * after we were told to stop, is the difference between one canvas and two stacked
 * on top of each other with both reading the keyboard.
 *
 * Ownership is per-mount rather than a module singleton, deliberately: a singleton
 * survives the route change and the second visit finds a destroyed instance
 * recorded as live.
 *
 * State reaches React on a poll, not per frame. The scene runs at 60Hz and React
 * has no business re-rendering at that rate; the HUD only needs to be true, not
 * instantaneous.
 */
export function CastleFrontV4() {
  const hostRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<FrontV4ScenePort | null>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [snapshot, setSnapshot] = useState<FrontV4Snapshot | null>(null);

  useEffect(() => {
    let alive = true;
    let instance: Phaser.Game | null = null;
    let disposeBridge: (() => void) | undefined;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        const { createCastleFrontV4Game } = await import('./createGame');
        if (!alive) return;
        instance = createCastleFrontV4Game(host);
        if (!alive) {
          // Cleanup won the race. Nothing else will ever see this instance, so
          // this is the only chance to take the canvas back out of the DOM.
          instance.destroy(true, false);
          instance = null;
          return;
        }

        instance.events.on(FRONT_V4_EVENTS.ready, (port: FrontV4ScenePort) => {
          portRef.current = port;
        });

        if (import.meta.env.DEV) {
          const { installFrontV4StudioBridge } = await import('./studioBridge');
          if (!alive) {
            instance.destroy(true, false);
            instance = null;
            return;
          }
          disposeBridge = installFrontV4StudioBridge(() => portRef.current);
        }

        setGame(instance);
        setStatus('ready');
      } catch (error) {
        console.error('[castle-front-v4] failed to start', error);
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
      // The bridge goes FIRST: it holds a reference to the scene port, and a
      // global left pointing at a destroyed scene is worse than no global.
      disposeBridge?.();
      portRef.current = null;
      instance?.destroy(true, false);
      instance = null;
      setGame(null);
    };
  }, []);

  useEffect(() => {
    if (!game) return;
    const resultEvent = `${FRONT_V4_EVENTS.snapshot}:result`;
    const onSnapshot = (next: FrontV4Snapshot) => setSnapshot(next);
    game.events.on(resultEvent, onSnapshot);
    game.events.emit(FRONT_V4_EVENTS.snapshot);
    const poll = window.setInterval(() => game.events.emit(FRONT_V4_EVENTS.snapshot), 250);
    return () => {
      window.clearInterval(poll);
      game.events.off(resultEvent, onSnapshot);
    };
  }, [game]);

  const jelly = snapshot?.jelly;
  const hpRatio = jelly ? jelly.hp / jelly.maxHp : 1;

  return (
    <main className="min-h-screen bg-[#0c1118] p-4 text-white md:p-6">
      <header className="mx-auto mb-4 max-w-[1280px]">
        <p className="text-xs font-bold tracking-[0.22em] text-amber-300">
          LOCAL DEV PROOF · NOT PRODUCTION · /castle IS UNCHANGED
        </p>
        <h1 className="font-fantasy text-2xl text-amber-100">
          Castle Front V4 — side-view combat truth slice
        </h1>
        <p className="max-w-3xl text-sm text-white/60">
          The same fight as the courtyard, seen from the side. He walks left and right and
          <strong className="text-white/80"> cannot jump</strong>. The Ember Jelly telegraphs a
          committed leap you can run underneath — it lands where you were standing, not where you
          are. Composition, character scale and feel are for Raheem and Codex to judge; nothing
          drawn here is approved art.
        </p>
      </header>

      <section
        className="relative mx-auto max-w-[1280px] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl"
        /*
         * Derived from the frame, not typed as 16/9. The camera fits HEIGHT, so a
         * box shaped differently from the world letterboxes it — which is exactly
         * what happened when the frame grew to 960 for the taller sky: a black bar
         * across the top that looked like a rendering fault and was a CSS constant
         * nobody thought to look at.
         */
        style={{ aspectRatio: `${FRONT_V4_VIEW.width} / ${FRONT_V4_VIEW.height}` }}
      >
        <div ref={hostRef} className="absolute inset-0" />
        {status === 'loading' && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50">
            Walking out to the gate…
          </p>
        )}
        {status === 'error' && (
          <p className="absolute inset-0 grid place-items-center text-sm text-red-300">
            The scene failed to start. Check the console.
          </p>
        )}
      </section>

      <div className="mx-auto mt-3 grid max-w-[1280px] gap-3 md:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-white/10 bg-white/5 p-3">
          <h2 className="mb-2 text-xs font-bold tracking-[0.18em] text-amber-200">HAND</h2>
          <div className="flex gap-2">
            {(snapshot?.hand.slots ?? []).map((slot, i) => (
              <div
                key={i}
                className={`flex-1 rounded-md border px-2 py-2 text-center text-xs ${
                  snapshot?.hand.selected === i
                    ? 'border-amber-300 bg-amber-400/15 text-amber-100'
                    : 'border-white/15 bg-black/30 text-white/60'
                } ${slot.state === 'dropped' ? 'opacity-40' : ''}`}
              >
                <div className="font-bold">{i + 1}</div>
                <div className="truncate">{slot.name ?? '—'}</div>
                <div className="text-[10px] uppercase tracking-wider">{slot.state}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            <strong className="text-white/80">A / D</strong> or arrows walk ·{' '}
            <strong className="text-white/80">mouse wheel</strong> or{' '}
            <strong className="text-white/80">1–4</strong> select ·{' '}
            <strong className="text-white/80">F</strong> hold to charge, release to fire ·{' '}
            <strong className="text-white/80">R</strong> reset the jelly ·{' '}
            <strong className="text-white/80">T</strong> toggle its AI ·{' '}
            <strong className="text-white/80">Y</strong> toggle strong hits ·{' '}
            <strong className="text-white/80">K</strong> force a knockdown.{' '}
            <span className="text-white/35">
              E is reserved for entering the castle later; there is no interior yet.
            </span>
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
          <h2 className="mb-2 text-xs font-bold tracking-[0.18em] text-amber-200">EMBER JELLY</h2>
          <div className="h-2 w-full overflow-hidden rounded bg-black/50">
            <div
              className="h-full bg-orange-400 transition-[width] duration-200"
              style={{ width: `${Math.max(0, hpRatio) * 100}%` }}
            />
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            <dt className="text-white/40">phase</dt>
            <dd>{jelly?.phase ?? '—'}</dd>
            <dt className="text-white/40">mode</dt>
            <dd>{jelly?.mode ?? '—'}</dd>
            <dt className="text-white/40">height</dt>
            <dd>{jelly ? `${Math.round(jelly.heightPx)}px` : '—'}</dd>
            <dt className="text-white/40">landing</dt>
            <dd>{jelly?.landingX == null ? '—' : Math.round(jelly.landingX)}</dd>
            <dt className="text-white/40">AI</dt>
            <dd className={jelly?.aiEnabled ? 'text-emerald-300' : 'text-white/40'}>
              {jelly?.aiEnabled ? 'on' : 'off'}
            </dd>
            <dt className="text-white/40">strong hits</dt>
            <dd className={jelly?.strongHits ? 'text-rose-300' : 'text-white/40'}>
              {jelly?.strongHits ? 'on' : 'off'}
            </dd>
            <dt className="text-white/40">his phase</dt>
            <dd>{snapshot?.player.phase ?? '—'}</dd>
            <dt className="text-white/40">can jump</dt>
            <dd className="text-white/40">no</dd>
          </dl>
        </div>
      </div>

      <output
        id="castle-front-v4-result"
        data-status={status === 'ready' && !snapshot?.scatter.lastDegraded ? 'pass' : status}
        data-scene={snapshot?.scene ?? ''}
        className="mx-auto mt-3 block max-w-[1280px] text-xs text-white/40"
      >
        {snapshot
          ? `${snapshot.scene} · camera ${snapshot.camera.mode} zoom ${snapshot.camera.zoom.toFixed(2)} · hero x ${snapshot.player.x.toFixed(0)} facing ${snapshot.player.facing > 0 ? 'east' : 'west'} · ${snapshot.projectiles.length} in flight · ${snapshot.dropped.length} on the ground${snapshot.scatter.lastDegraded ? ` · SCATTER DEGRADED: ${snapshot.scatter.lastReason}` : ''}${snapshot.errors.length ? ` · ${snapshot.errors.length} load errors` : ''}`
          : 'Waiting for the scene…'}
      </output>
    </main>
  );
}

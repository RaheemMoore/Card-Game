import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { COURTYARD_V2_PREVIEW_EVENTS } from './events';
import type { CourtyardV2PreviewSnapshot } from './CourtyardV2PreviewScene';

const SCENARIO_NAME = 'courtyard-v2-hero-forge-surge-preview';

export function CourtyardV2Preview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [motionOff, setMotionOff] = useState(false);
  const [snapshot, setSnapshot] = useState<CourtyardV2PreviewSnapshot | null>(null);

  useEffect(() => {
    let alive = true;
    let instance: Phaser.Game | null = null;
    const container = containerRef.current;
    if (!container) return;

    void (async () => {
      try {
        const { createCourtyardV2PreviewGame } = await import('./createPreviewGame');
        if (!alive) return;
        instance = createCourtyardV2PreviewGame(container);
        setGame(instance);
        setStatus('ready');
      } catch (error) {
        console.error('[courtyard-v2-preview] failed to start', error);
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
      instance?.destroy(true, false);
      instance = null;
      setGame(null);
    };
  }, []);

  useEffect(() => {
    if (!game) return;
    const resultEvent = `${COURTYARD_V2_PREVIEW_EVENTS.snapshot}:result`;
    const onSnapshot = (next: CourtyardV2PreviewSnapshot) => setSnapshot(next);
    game.events.on(resultEvent, onSnapshot);
    game.events.emit(COURTYARD_V2_PREVIEW_EVENTS.snapshot);
    const poll = window.setInterval(
      () => game.events.emit(COURTYARD_V2_PREVIEW_EVENTS.snapshot),
      500,
    );
    return () => {
      window.clearInterval(poll);
      game.events.off(resultEvent, onSnapshot);
    };
  }, [game]);

  const toggleMotion = () => {
    const next = !motionOff;
    setMotionOff(next);
    game?.events.emit(COURTYARD_V2_PREVIEW_EVENTS.motionOff, next);
  };

  return (
    <main className="min-h-screen bg-[#0c1118] text-white p-4 md:p-6">
      <header className="mx-auto mb-4 flex max-w-[1536px] flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.22em] text-amber-300">
            LOCAL DEV PREVIEW · NOT PRODUCTION
          </p>
          <h1 className="font-fantasy text-2xl text-amber-100">Courtyard V2 — Forge Life Test</h1>
          <p className="max-w-3xl text-sm text-white/60">
            Walk the approved chibi with WASD, arrow keys, or a click. Footstep dust follows the
            character's feet while the Forge runs smoke, heat shimmer, and a bounded energy surge.
            The counter and bench use exact Figma walk-behind layers. Your three closed Figma
            footprints are now imported as preview-only Phaser collision bodies.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => game?.events.emit(COURTYARD_V2_PREVIEW_EVENTS.sparkBurst)}
            className="rounded-lg border border-amber-300/50 bg-amber-500/15 px-3 py-2 text-sm hover:bg-amber-500/25"
          >
            Trigger Forge surge
          </button>
          <button
            type="button"
            onClick={() => game?.events.emit(COURTYARD_V2_PREVIEW_EVENTS.footsteps)}
            className="rounded-lg border border-stone-300/40 bg-stone-500/15 px-3 py-2 text-sm hover:bg-stone-500/25"
          >
            Show chibi walking
          </button>
          <button
            type="button"
            onClick={() => game?.events.emit(COURTYARD_V2_PREVIEW_EVENTS.walkBehindCounter)}
            className="rounded-lg border border-emerald-300/40 bg-emerald-500/15 px-3 py-2 text-sm hover:bg-emerald-500/25"
          >
            Walk behind counter
          </button>
          <button
            type="button"
            onClick={() => game?.events.emit(COURTYARD_V2_PREVIEW_EVENTS.walkForgeAisle)}
            className="rounded-lg border border-violet-300/40 bg-violet-500/15 px-3 py-2 text-sm hover:bg-violet-500/25"
          >
            Walk Forge aisle
          </button>
          <button
            type="button"
            onClick={toggleMotion}
            aria-pressed={motionOff}
            className="rounded-lg border border-sky-300/40 bg-sky-500/15 px-3 py-2 text-sm hover:bg-sky-500/25"
          >
            {motionOff ? 'Enable motion' : 'Reduced motion'}
          </button>
        </div>
      </header>

      <section
        className="relative mx-auto max-w-[1536px] overflow-hidden rounded-xl border border-white/15 bg-black shadow-2xl"
        style={{ aspectRatio: '4 / 3' }}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {status === 'loading' && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/50">
            Lighting the Forge…
          </p>
        )}
        {status === 'error' && (
          <p className="absolute inset-0 grid place-items-center text-sm text-red-300">
            Preview failed to start. Check the console.
          </p>
        )}
      </section>

      <output
        id="courtyard-v2-preview-result"
        data-status={
          status === 'ready' &&
          snapshot?.forge.withinBudget &&
          snapshot.footsteps.withinBudget &&
          snapshot.hero.insidePreviewBounds
            ? 'pass'
            : status
        }
        data-scenario={SCENARIO_NAME}
        className="mx-auto mt-3 block max-w-[1536px] text-xs text-white/45"
      >
        {snapshot
          ? `Scenario ${SCENARIO_NAME} · hero ${snapshot.hero.facing} frame ${snapshot.hero.frame} · counter ${snapshot.occluders[0]?.heroRelation} · bench ${snapshot.occluders[1]?.heroRelation} · smoke ${snapshot.forge.smokeCount}/8 · energy ${snapshot.forge.activeParticleCount}/40 · dust ${snapshot.footsteps.activeCount}/6 (${snapshot.footsteps.emittedPuffs} emitted) · ${snapshot.forge.surgePhase} · ${snapshot.forge.withinBudget && snapshot.footsteps.withinBudget ? 'within budget' : 'over budget'}`
          : 'Waiting for the preview scene…'}
      </output>
      {snapshot && (
        <output
          id="courtyard-v2-collision-result"
          data-status={snapshot.aisle.testStatus}
          data-scenario="courtyard-v2-forge-aisle-collision-validation"
          className="mx-auto mt-1 block max-w-[1536px] text-xs text-white/45"
        >
          Collision trace: {snapshot.collision.staticBodyCount} bodies from Figma nodes{' '}
          {snapshot.collision.figmaNodes.join(', ')}. Feet body{' '}
          {snapshot.hero.feetBody?.width.toFixed(0) ?? '?'}x
          {snapshot.hero.feetBody?.height.toFixed(0) ?? '?'}px.
          Forge-to-counter{' '}
          {snapshot.rearAisle.availableClearance}px / {snapshot.rearAisle.requiredClearance}px
          required ({snapshot.rearAisle.testStatus}); counter-to-bench{' '}
          {snapshot.aisle.availableClearance}px / {snapshot.aisle.requiredClearance}px required.
          Test: {snapshot.aisle.testStatus}
          {snapshot.aisle.finalX == null ? '' : ` at x=${snapshot.aisle.finalX.toFixed(1)}`}.
        </output>
      )}
    </main>
  );
}

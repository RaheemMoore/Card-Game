import { useEffect, useRef } from 'react';
import type { BattleEvent, BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { MotionLevel } from '../../vfx/types';

export const BATTLE_STUDIO_SCENARIO = 'battle-ability-decision-sequence' as const;
const BRIDGE_VERSION = 1 as const;

interface BattleStudioSource {
  state: BattleState | null;
  events: readonly BattleEvent[];
  currentBeat: AnimationBeat | null;
  isPlaying: boolean;
  pendingCount: number;
  motionLevel: MotionLevel;
}

interface ObservedPerformance {
  id: string;
  form: string;
  stage: string | null;
  casterActorId: string | null;
  targetActorId: string | null;
  from: { x: number; y: number } | null;
  to: { x: number; y: number } | null;
}

export interface BattleStudioSnapshot {
  bridgeVersion: typeof BRIDGE_VERSION;
  scenario: typeof BATTLE_STUDIO_SCENARIO | null;
  authenticSurface: boolean;
  route: string;
  viewport: { width: number; height: number };
  motionLevel: MotionLevel;
  reducer: {
    phase: BattleState['phase'] | null;
    round: number | null;
    battleId: string | null;
    eventCount: number;
  };
  presentation: {
    inputLocked: boolean;
    currentBeatId: string | null;
    currentEventKind: BattleEvent['kind'] | null;
    queuedBeatCount: number;
  };
  performances: ObservedPerformance[];
  decisionSurfaces: {
    threatTranslatorVisible: boolean;
    abilityPreviewVisible: boolean;
    tacticalContextVisible: boolean;
    receiptVisible: boolean;
  };
}

interface BattleStudioBridge {
  version: typeof BRIDGE_VERSION;
  listScenarios(): readonly [typeof BATTLE_STUDIO_SCENARIO];
  runScenario(name: typeof BATTLE_STUDIO_SCENARIO): BattleStudioSnapshot;
  getSnapshot(): BattleStudioSnapshot;
  clearScenario(): void;
}

declare global {
  interface Window {
    __CARD_ENGINE_BATTLE_STUDIO__?: BattleStudioBridge;
  }
}

let ownerSequence = 0;

function numberAttribute(element: Element, name: string): number | null {
  const raw = element.getAttribute(name);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function pointFromAttributes(element: Element, prefix: 'from' | 'to') {
  const x = numberAttribute(element, `data-${prefix}-x`);
  const y = numberAttribute(element, `data-${prefix}-y`);
  return x === null || y === null ? null : { x, y };
}

function observePerformances(): ObservedPerformance[] {
  return Array.from(document.querySelectorAll('[data-battle-performance]')).map((element) => ({
    id: element.getAttribute('data-performance-id') ?? 'unknown',
    form: element.getAttribute('data-performance-form') ?? 'unknown',
    stage: element.getAttribute('data-performance-stage'),
    casterActorId: element.getAttribute('data-caster-actor-id'),
    targetActorId: element.getAttribute('data-target-actor-id'),
    from: pointFromAttributes(element, 'from'),
    to: pointFromAttributes(element, 'to'),
  }));
}

function buildSnapshot(
  source: BattleStudioSource,
  scenario: typeof BATTLE_STUDIO_SCENARIO | null,
): BattleStudioSnapshot {
  return {
    bridgeVersion: BRIDGE_VERSION,
    scenario,
    authenticSurface: document.querySelector('[data-battle-runtime="authentic"]') !== null,
    route: window.location.pathname,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    motionLevel: source.motionLevel,
    reducer: {
      phase: source.state?.phase ?? null,
      round: source.state?.round ?? null,
      battleId: source.state?.snapshot.battleId ?? null,
      eventCount: source.events.length,
    },
    presentation: {
      inputLocked: source.isPlaying,
      currentBeatId: source.currentBeat?.id ?? null,
      currentEventKind: source.currentBeat?.event.kind ?? null,
      queuedBeatCount: source.pendingCount,
    },
    performances: observePerformances(),
    decisionSurfaces: {
      threatTranslatorVisible: document.querySelector('[aria-label^="Current threat:"]') !== null,
      abilityPreviewVisible: document.querySelector('[aria-label^="Confirm "]') !== null,
      tacticalContextVisible: document.querySelector('[aria-label^="Tactical context"]') !== null,
      receiptVisible: document.querySelector('[data-resolution-receipt]') !== null,
    },
  };
}

/**
 * DEV-only observation adapter for the authentic React battle surface.
 *
 * It never dispatches reducer actions. `runScenario` opens a named observation
 * boundary; the browser harness still drives the real controls in `/battle`.
 * An ownership token makes StrictMode mount/unmount cycles unable to remove a
 * newer bridge instance.
 */
export function useBattleStudioBridge(source: BattleStudioSource): void {
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const owner = ++ownerSequence;
    // `/battle` is itself the named observation scenario; the browser harness
    // drives its real controls and reads snapshots at the boundaries it needs.
    let activeScenario: typeof BATTLE_STUDIO_SCENARIO | null = BATTLE_STUDIO_SCENARIO;

    const bridge: BattleStudioBridge & { __owner: number } = {
      __owner: owner,
      version: BRIDGE_VERSION,
      listScenarios: () => [BATTLE_STUDIO_SCENARIO],
      runScenario: (name) => {
        if (name !== BATTLE_STUDIO_SCENARIO) {
          throw new Error(`Unknown battle studio scenario: ${String(name)}`);
        }
        activeScenario = name;
        return buildSnapshot(sourceRef.current, activeScenario);
      },
      getSnapshot: () => buildSnapshot(sourceRef.current, activeScenario),
      clearScenario: () => {
        activeScenario = null;
      },
    };

    window.__CARD_ENGINE_BATTLE_STUDIO__ = bridge;
    return () => {
      const current = window.__CARD_ENGINE_BATTLE_STUDIO__ as
        | (BattleStudioBridge & { __owner?: number })
        | undefined;
      if (current?.__owner === owner) delete window.__CARD_ENGINE_BATTLE_STUDIO__;
    };
  }, []);
}

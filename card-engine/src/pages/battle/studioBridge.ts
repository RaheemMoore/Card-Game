import { useEffect, useRef } from 'react';
import type { BattleEvent, BattleState, PlayerAction } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { MotionLevel } from '../../vfx/types';
import { hasCurrentlyUsableAbility } from '../../services/combat/actionAvailability';

export const BATTLE_STUDIO_SCENARIOS = [
  'battle-party-volley-impact',
  'battle-wait-only-lockout',
] as const;
export type BattleStudioScenario = (typeof BATTLE_STUDIO_SCENARIOS)[number];
export const BATTLE_STUDIO_SCENARIO = BATTLE_STUDIO_SCENARIOS[0];
const BRIDGE_VERSION = 1 as const;

interface BattleStudioSource {
  state: BattleState | null;
  events: readonly BattleEvent[];
  currentBeat: AnimationBeat | null;
  isPlaying: boolean;
  pendingCount: number;
  motionLevel: MotionLevel;
  actingActorId: string | null;
  plannedActions: Readonly<Record<string, PlayerAction>>;
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

interface ObservedAction {
  actorId: string;
  kind: PlayerAction['kind'];
}

interface ActionAffordances {
  canAct: boolean;
  anyUsableAbility: boolean;
  strikeEnabled: boolean;
  guardEnabled: boolean;
  waitEnabled: boolean;
  releaseEnabled: boolean;
}

export interface BattleStudioSnapshot {
  bridgeVersion: typeof BRIDGE_VERSION;
  scenario: BattleStudioScenario | null;
  authenticSurface: boolean;
  route: string;
  viewport: { width: number; height: number };
  layout: 'mobile' | 'desktop_tablet';
  motionLevel: MotionLevel;
  reducer: {
    phase: BattleState['phase'] | null;
    round: number | null;
    battleId: string | null;
    bossActorId: string | null;
    eventCount: number;
    actingActorId: string | null;
    pendingActorIds: string[];
  };
  planning: {
    actions: ObservedAction[];
    plannedCount: number;
  };
  affordances: ActionAffordances;
  presentation: {
    inputLocked: boolean;
    currentBeatId: string | null;
    currentEventKind: BattleEvent['kind'] | null;
    phase: AnimationBeat['presentationPhase'] | null;
    queuedBeatCount: number;
  };
  performances: ObservedPerformance[];
  decisionSurfaces: {
    threatTranslatorVisible: boolean;
    abilityPreviewVisible: boolean;
    tacticalContextVisible: boolean;
    receiptVisible: boolean;
  };
  assertions: Record<string, boolean>;
  verdict: 'PENDING' | 'PASS' | 'FAIL';
  runtimeErrors: string[];
}

interface BattleStudioBridge {
  version: typeof BRIDGE_VERSION;
  listScenarios(): readonly BattleStudioScenario[];
  runScenario(name: BattleStudioScenario): BattleStudioSnapshot;
  getSnapshot(): BattleStudioSnapshot;
  clearScenario(): void;
}

declare global {
  interface Window {
    __CARD_ENGINE_BATTLE_STUDIO__?: BattleStudioBridge;
  }
}

let ownerSequence = 0;
const TRANSPORT_ID = 'card-engine-battle-studio-result';

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

function buttonEnabled(labelPrefix: string): boolean {
  const button = document.querySelector<HTMLButtonElement>(
    `button[aria-label^="${labelPrefix}"]`,
  );
  return Boolean(button && !button.disabled);
}

function releaseEnabled(): boolean {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find(
    (candidate) => candidate.textContent?.includes('PARTY'),
  );
  return Boolean(button && !button.disabled);
}

function scenarioAssertions(
  scenario: BattleStudioScenario | null,
  snapshot: Omit<BattleStudioSnapshot, 'assertions' | 'verdict'>,
): Record<string, boolean> {
  const common = {
    authenticSurface: snapshot.authenticSurface,
    routeIsBattle: snapshot.route === '/battle',
    noRuntimeErrors: snapshot.runtimeErrors.length === 0,
  };
  if (scenario === 'battle-party-volley-impact') {
    const impacts = snapshot.performances.filter((performance) => performance.stage === 'impact');
    const targets = impacts.map((performance) => performance.to).filter(Boolean);
    return {
      ...common,
      inputLocked: snapshot.presentation.inputLocked,
      threeSimultaneousImpacts: impacts.length === 3,
      threeDistinctCasters: new Set(impacts.map((performance) => performance.casterActorId)).size === 3,
      allTargetBoss: impacts.every(
        (performance) => performance.targetActorId === snapshot.reducer.bossActorId,
      ),
      finiteEndpoints: impacts.every(
        (performance) => performance.from !== null && performance.to !== null,
      ),
      threeDistinctImpactPoints: new Set(
        targets.map((point) => `${point!.x},${point!.y}`),
      ).size === 3,
    };
  }
  if (scenario === 'battle-wait-only-lockout') {
    return {
      ...common,
      playerCanAct: snapshot.affordances.canAct,
      noUsableAbility: !snapshot.affordances.anyUsableAbility,
      strikeDisabled: !snapshot.affordances.strikeEnabled,
      guardDisabled: !snapshot.affordances.guardEnabled,
      waitEnabled: snapshot.affordances.waitEnabled,
      releaseDisabledUntilPlanned: !snapshot.affordances.releaseEnabled,
    };
  }
  return common;
}

function buildSnapshot(
  source: BattleStudioSource,
  scenario: BattleStudioScenario | null,
  runtimeErrors: string[],
): BattleStudioSnapshot {
  const actingHero = source.state?.heroes.find((hero) => hero.actorId === source.actingActorId);
  const base = {
    bridgeVersion: BRIDGE_VERSION,
    scenario,
    authenticSurface: document.querySelector('[data-battle-runtime="authentic"]') !== null,
    route: window.location.pathname,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    layout: window.innerWidth <= 520 ? 'mobile' as const : 'desktop_tablet' as const,
    motionLevel: source.motionLevel,
    reducer: {
      phase: source.state?.phase ?? null,
      round: source.state?.round ?? null,
      battleId: source.state?.snapshot.battleId ?? null,
      bossActorId: source.state?.boss.actorId ?? null,
      eventCount: source.events.length,
      actingActorId: source.actingActorId,
      pendingActorIds: [...(source.state?.pendingActorIds ?? [])],
    },
    planning: {
      actions: Object.entries(source.plannedActions).map(([actorId, action]) => ({
        actorId,
        kind: action.kind,
      })),
      plannedCount: Object.keys(source.plannedActions).length,
    },
    affordances: {
      canAct: source.state?.phase === 'awaiting_player_action' && !source.isPlaying,
      anyUsableAbility: Boolean(
        source.state && actingHero && hasCurrentlyUsableAbility(source.state, actingHero),
      ),
      strikeEnabled: buttonEnabled('Strike'),
      guardEnabled: buttonEnabled('Arm Guard') || buttonEnabled('Guard'),
      waitEnabled: buttonEnabled('Wait'),
      releaseEnabled: releaseEnabled(),
    },
    presentation: {
      inputLocked: source.isPlaying,
      currentBeatId: source.currentBeat?.id ?? null,
      currentEventKind: source.currentBeat?.event.kind ?? null,
      phase: source.currentBeat?.presentationPhase ?? null,
      queuedBeatCount: source.pendingCount,
    },
    performances: observePerformances(),
    decisionSurfaces: {
      threatTranslatorVisible: document.querySelector('[aria-label^="Current threat:"]') !== null,
      abilityPreviewVisible: document.querySelector('[aria-label^="Confirm "]') !== null,
      tacticalContextVisible: document.querySelector('[aria-label^="Tactical context"]') !== null,
      receiptVisible: document.querySelector('[data-resolution-receipt]') !== null,
    },
    runtimeErrors: [...runtimeErrors],
  };
  const assertions = scenarioAssertions(scenario, base);
  const values = Object.values(assertions);
  const hardFailure =
    base.runtimeErrors.length > 0 || !base.authenticSurface || base.route !== '/battle';
  const verdict = hardFailure
    ? 'FAIL'
    : scenario === null
      ? 'PENDING'
      : values.every(Boolean)
        ? 'PASS'
        : 'PENDING';
  return { ...base, assertions, verdict };
}

function requestedScenario(): BattleStudioScenario | null {
  const requested = new URLSearchParams(window.location.search).get('studioScenario');
  return BATTLE_STUDIO_SCENARIOS.find((scenario) => scenario === requested) ?? null;
}

function publishTransport(snapshot: BattleStudioSnapshot): void {
  let output = document.getElementById(TRANSPORT_ID) as HTMLOutputElement | null;
  if (!output) {
    output = document.createElement('output');
    output.id = TRANSPORT_ID;
    output.hidden = true;
    document.body.appendChild(output);
  }
  output.dataset.status = snapshot.verdict.toLowerCase();
  output.textContent = JSON.stringify(snapshot);
}

/** DEV-only observation adapter for the authentic React battle surface. */
export function useBattleStudioBridge(source: BattleStudioSource): void {
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const owner = ++ownerSequence;
    let activeScenario: BattleStudioScenario | null = requestedScenario();
    const runtimeErrors: string[] = [];
    const onError = (event: ErrorEvent) => {
      if (runtimeErrors.length < 8) runtimeErrors.push(event.message || 'Unknown page error');
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (runtimeErrors.length >= 8) return;
      runtimeErrors.push(
        event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unhandled rejection'),
      );
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    const bridge: BattleStudioBridge & { __owner: number } = {
      __owner: owner,
      version: BRIDGE_VERSION,
      listScenarios: () => BATTLE_STUDIO_SCENARIOS,
      runScenario: (name) => {
        if (!BATTLE_STUDIO_SCENARIOS.includes(name)) {
          throw new Error(`Unknown battle studio scenario: ${String(name)}`);
        }
        activeScenario = name;
        const snapshot = buildSnapshot(sourceRef.current, activeScenario, runtimeErrors);
        publishTransport(snapshot);
        return snapshot;
      },
      getSnapshot: () => buildSnapshot(sourceRef.current, activeScenario, runtimeErrors),
      clearScenario: () => {
        activeScenario = null;
      },
    };

    window.__CARD_ENGINE_BATTLE_STUDIO__ = bridge;
    publishTransport(bridge.getSnapshot());
    // Performance stages advance on their own animation clocks and do not
    // necessarily re-render CombatViewport. Sample only in DEV while the
    // bridge is mounted so the transport can observe the shared impact frame.
    const transportTimer = window.setInterval(() => {
      if (activeScenario) publishTransport(bridge.getSnapshot());
    }, 40);
    return () => {
      window.clearInterval(transportTimer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      const current = window.__CARD_ENGINE_BATTLE_STUDIO__ as
        | (BattleStudioBridge & { __owner?: number })
        | undefined;
      if (current?.__owner === owner) {
        delete window.__CARD_ENGINE_BATTLE_STUDIO__;
        document.getElementById(TRANSPORT_ID)?.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const bridge = window.__CARD_ENGINE_BATTLE_STUDIO__;
    if (bridge) publishTransport(bridge.getSnapshot());
  }, [source]);
}

import type Phaser from 'phaser';
import type { Vec2 } from './controls';
import { HERO_SPAWN, STALLS } from './stalls';
import { OCCLUDERS } from '../../../data/castle/occluders';
import { HERO_FEET, type HeroFacing } from '../../../data/castle/heroSprite';

export const COURTYARD_STUDIO_SCENARIOS = [
  { name: 'courtyard-direction-validation', description: 'Checks four-direction world movement and facing.' },
  { name: 'courtyard-collision-and-occlusion', description: 'Checks a traced solid and depth-sorted occluder.' },
  { name: 'courtyard-reduced-motion-walk', description: 'Checks interaction with animation held still.' },
] as const;

export type CourtyardStudioScenarioName = (typeof COURTYARD_STUDIO_SCENARIOS)[number]['name'];

export interface StudioAssertion {
  id: string;
  pass: boolean;
  actual: unknown;
  expected: string;
}

export interface StudioScenarioResult {
  name: CourtyardStudioScenarioName;
  verdict: 'PASS' | 'FAIL';
  startedAt: string;
  finishedAt: string;
  assertions: StudioAssertion[];
  evidence: Record<string, unknown>;
  error?: string;
}

export interface CourtyardStudioSnapshot {
  bridgeVersion: 1;
  route: string;
  activeScene: 'courtyard';
  viewport: { width: number; height: number };
  player: {
    world: { x: number; y: number };
    body: { left: number; right: number; top: number; bottom: number };
    velocity: { x: number; y: number };
    facing: HeroFacing;
    walking: boolean;
    animationKey: string | null;
    frame: string | number;
    depth: number;
    motionOff: boolean;
  };
  camera: {
    mode: 'fixed-fit';
    scrollX: number;
    scrollY: number;
    zoom: number;
    worldView: { x: number; y: number; width: number; height: number };
  };
  namedObjects: Array<{
    id: string;
    category: 'solid' | 'occluder';
    bounds: { x: number; y: number; width: number; height: number };
    depth?: number;
  }>;
  scenario: {
    name: CourtyardStudioScenarioName | null;
    phase: 'idle' | 'running' | 'complete';
    assertions: StudioAssertion[];
    verdict: 'PASS' | 'FAIL' | null;
  };
  runtimeErrors: string[];
}

export interface CardEngineStudioBridge {
  version: 1;
  listScenarios(): typeof COURTYARD_STUDIO_SCENARIOS;
  runScenario(name: CourtyardStudioScenarioName): Promise<StudioScenarioResult>;
  getSnapshot(): CourtyardStudioSnapshot;
  clearScenario(): void;
}

declare global {
  interface Window {
    __CARD_ENGINE_STUDIO__?: CardEngineStudioBridge;
  }
}

const STUDIO_RESULT_ID = 'card-engine-studio-result';
const studioRuns = new Map<string, { generation: number; state: 'scheduled' | 'running' | 'complete' }>();
let bridgeGeneration = 0;

function publishStudioResult(
  run: string,
  scenario: string,
  status: 'running' | 'pass' | 'fail',
  payload: Record<string, unknown>,
) {
  let output = document.getElementById(STUDIO_RESULT_ID) as HTMLOutputElement | null;
  if (!output) {
    output = document.createElement('output');
    output.id = STUDIO_RESULT_ID;
    output.setAttribute('aria-live', 'polite');
    Object.assign(output.style, {
      position: 'fixed',
      zIndex: '2147483647',
      left: '8px',
      bottom: '8px',
      maxWidth: 'min(520px, calc(100vw - 16px))',
      maxHeight: '40vh',
      overflow: 'auto',
      padding: '8px 10px',
      border: '1px solid rgba(255,255,255,.35)',
      borderRadius: '6px',
      background: 'rgba(5,3,8,.92)',
      color: '#f5e6bd',
      font: '11px/1.35 monospace',
      whiteSpace: 'pre-wrap',
      pointerEvents: 'none',
    });
    document.body.appendChild(output);
  }
  output.dataset.run = run;
  output.dataset.scenario = scenario;
  output.dataset.status = status;
  output.value = JSON.stringify(payload, null, 2);
  output.textContent = output.value;
}

function installQueryScenarioTransport(
  bridge: CardEngineStudioBridge,
  generation: number,
): () => void {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('studioScenario') ?? '';
  const run = params.get('studioRun') ?? '';
  if (!scenario && !run) return () => undefined;

  const validRun = /^[A-Za-z0-9._-]{1,80}$/.test(run);
  const descriptor = COURTYARD_STUDIO_SCENARIOS.find((item) => item.name === scenario);
  if (!validRun || !descriptor) {
    publishStudioResult(run || 'missing', scenario || 'missing', 'fail', {
      bridgeVersion: 1,
      verdict: 'FAIL',
      error: !validRun ? 'studioRun must be a 1-80 character nonce.' : 'Unknown Studio scenario.',
    });
    return () => {
      const output = document.getElementById(STUDIO_RESULT_ID);
      if (output?.dataset.run === (run || 'missing')) output.remove();
    };
  }

  const prior = studioRuns.get(run);
  if (prior?.state === 'complete') return () => undefined;
  studioRuns.set(run, { generation, state: 'scheduled' });
  let cancelled = false;
  let firstFrame = 0;
  let secondFrame = 0;
  let readinessFrame = 0;

  const waitForReady = (): Promise<void> => new Promise((resolve, reject) => {
    const started = performance.now();
    const check = () => {
      if (cancelled || window.__CARD_ENGINE_STUDIO__ !== bridge) {
        reject(new Error('Studio scenario cancelled before the courtyard became ready.'));
        return;
      }
      try {
        bridge.getSnapshot();
        resolve();
      } catch {
        if (performance.now() - started >= 5000) {
          reject(new Error('The courtyard did not become ready within 5 seconds.'));
          return;
        }
        readinessFrame = requestAnimationFrame(check);
      }
    };
    check();
  });

  firstFrame = requestAnimationFrame(() => {
    secondFrame = requestAnimationFrame(() => {
      const current = studioRuns.get(run);
      if (cancelled || window.__CARD_ENGINE_STUDIO__ !== bridge || current?.generation !== generation) return;
      studioRuns.set(run, { generation, state: 'running' });
      publishStudioResult(run, descriptor.name, 'running', {
        bridgeVersion: 1,
        scenario: descriptor.name,
        verdict: null,
      });
      const started = performance.now();
      void (async () => {
        try {
          await waitForReady();
          const result = await bridge.runScenario(descriptor.name);
          if (cancelled || window.__CARD_ENGINE_STUDIO__ !== bridge) return;
          studioRuns.set(run, { generation, state: 'complete' });
          publishStudioResult(run, result.name, result.verdict === 'PASS' ? 'pass' : 'fail', {
            bridgeVersion: 1,
            scenario: result.name,
            verdict: result.verdict,
            durationMs: Math.round(performance.now() - started),
            assertions: result.assertions,
            evidence: result.evidence,
            ...(result.error ? { error: result.error.slice(0, 300) } : {}),
          });
        } catch (caught) {
          if (cancelled || window.__CARD_ENGINE_STUDIO__ !== bridge) return;
          studioRuns.set(run, { generation, state: 'complete' });
          publishStudioResult(run, descriptor.name, 'fail', {
            bridgeVersion: 1,
            scenario: descriptor.name,
            verdict: 'FAIL',
            durationMs: Math.round(performance.now() - started),
            error: (caught instanceof Error ? caught.message : String(caught)).slice(0, 300),
          });
        }
      })();
    });
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(firstFrame);
    cancelAnimationFrame(secondFrame);
    cancelAnimationFrame(readinessFrame);
    const current = studioRuns.get(run);
    if (current?.generation === generation && current.state !== 'complete') {
      try {
        bridge.clearScenario();
      } catch {
        // The scene may already be stopping during React/Phaser teardown.
      }
      studioRuns.delete(run);
    }
    const output = document.getElementById(STUDIO_RESULT_ID);
    if (output?.dataset.run === run) output.remove();
  };
}

/**
 * The adapter is the only code allowed to translate Scene implementation
 * details into the stable Studio contract. This type is intentionally local:
 * callers receive snapshots and scenario results, never the Scene or game.
 */
type CourtyardScenePort = Phaser.Scene & {
  player: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  facing: HeroFacing;
  walking: boolean;
  motionOff: boolean;
  seekTarget: Vec2 | null;
  studioDirection: Vec2 | null;
  setMotionOff(off: boolean): void;
  updateAnimation(direction: Vec2): void;
};

function activeCourtyard(game: Phaser.Game): CourtyardScenePort {
  const scene = game.scene.getScene('courtyard');
  if (!scene || !scene.scene.isActive()) throw new Error('The courtyard scene is not active.');
  return scene as unknown as CourtyardScenePort;
}

/** Install one identity-checked, development-only adapter for a React-owned game. */
export function installCourtyardStudioBridge(game: Phaser.Game): () => void {
  const generation = ++bridgeGeneration;
  const runtimeErrors: string[] = [];
  let runId = 0;
  let scenarioName: CourtyardStudioScenarioName | null = null;
  let scenarioPhase: 'idle' | 'running' | 'complete' = 'idle';
  let scenarioResult: StudioScenarioResult | null = null;
  let restore: (() => void) | null = null;

  const recordError = (value: unknown) => {
    runtimeErrors.push(value instanceof Error ? value.message : String(value));
    if (runtimeErrors.length > 20) runtimeErrors.shift();
  };
  const onError = (event: ErrorEvent) => recordError(event.error ?? event.message);
  const onRejection = (event: PromiseRejectionEvent) => recordError(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  const clearScenario = () => {
    runId += 1;
    restore?.();
    restore = null;
    const scene = activeCourtyard(game);
    scene.studioDirection = null;
    scenarioName = null;
    scenarioPhase = 'idle';
    scenarioResult = null;
  };

  const getSnapshot = (): CourtyardStudioSnapshot => {
    const scene = activeCourtyard(game);
    const camera = scene.cameras.main;
    const player = scene.player;
    const body = player.body;
    return {
      bridgeVersion: 1,
      route: window.location.pathname,
      activeScene: 'courtyard',
      viewport: { width: scene.scale.width, height: scene.scale.height },
      player: {
        world: { x: player.x, y: player.y },
        body: { left: body.left, right: body.right, top: body.top, bottom: body.bottom },
        velocity: { x: body.velocity.x, y: body.velocity.y },
        facing: scene.facing,
        walking: scene.walking,
        animationKey: player.anims.currentAnim?.key ?? null,
        frame: player.frame.name,
        depth: player.depth,
        motionOff: scene.motionOff,
      },
      camera: {
        mode: 'fixed-fit',
        scrollX: camera.scrollX,
        scrollY: camera.scrollY,
        zoom: camera.zoom,
        worldView: {
          x: camera.worldView.x,
          y: camera.worldView.y,
          width: camera.worldView.width,
          height: camera.worldView.height,
        },
      },
      namedObjects: [
        ...STALLS.map((solid) => ({
          id: solid.id,
          category: 'solid' as const,
          bounds: {
            x: solid.x - solid.width / 2,
            y: solid.y - solid.height / 2,
            width: solid.width,
            height: solid.height,
          },
        })),
        ...OCCLUDERS.map((occluder) => ({
          id: occluder.id,
          category: 'occluder' as const,
          bounds: { x: occluder.x, y: occluder.y, width: occluder.width, height: occluder.height },
          depth: occluder.groundY,
        })),
      ],
      scenario: {
        name: scenarioName,
        phase: scenarioPhase,
        assertions: scenarioResult?.assertions ?? [],
        verdict: scenarioResult?.verdict ?? null,
      },
      runtimeErrors: [...runtimeErrors],
    };
  };

  const waitForFrames = (durationMs: number, activeRunId: number): Promise<void> =>
    new Promise((resolve, reject) => {
      const started = performance.now();
      const tick = () => {
        if (activeRunId !== runId) return reject(new Error('Studio scenario cancelled.'));
        if (performance.now() - started >= durationMs) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const runDirectionScenario = async (scene: CourtyardScenePort, activeRunId: number) => {
    const segments: Array<{ facing: HeroFacing; direction: Vec2 }> = [
      { facing: 'up', direction: { x: 0, y: -1 } },
      { facing: 'down', direction: { x: 0, y: 1 } },
      { facing: 'left', direction: { x: -1, y: 0 } },
      { facing: 'right', direction: { x: 1, y: 0 } },
    ];
    const assertions: StudioAssertion[] = [];
    const samples: Array<Record<string, unknown>> = [];
    for (const segment of segments) {
      scene.player.body.reset(HERO_SPAWN.x, HERO_SPAWN.y);
      const before = { x: scene.player.x, y: scene.player.y };
      scene.studioDirection = segment.direction;
      await waitForFrames(260, activeRunId);
      scene.studioDirection = null;
      await waitForFrames(40, activeRunId);
      const delta = { x: scene.player.x - before.x, y: scene.player.y - before.y };
      const moved = segment.direction.x !== 0
        ? Math.sign(delta.x) === Math.sign(segment.direction.x) && Math.abs(delta.x) >= 20
        : Math.sign(delta.y) === Math.sign(segment.direction.y) && Math.abs(delta.y) >= 20;
      assertions.push({
        id: `direction-${segment.facing}`,
        pass: scene.facing === segment.facing && moved,
        actual: { facing: scene.facing, delta },
        expected: `${segment.facing} facing with at least 20 world units of matching movement`,
      });
      samples.push({ expectedFacing: segment.facing, actualFacing: scene.facing, delta, frame: scene.player.frame.name });
    }
    return { assertions, evidence: { samples, coordinateSpace: 'world-feet-origin' } };
  };

  const runCollisionScenario = async (scene: CourtyardScenePort, activeRunId: number) => {
    const fountain = STALLS.find((solid) => solid.id === 'fountain')!;
    const targetLeft = fountain.x - fountain.width / 2;
    const startX = targetLeft - HERO_FEET.width / 2 - 24;
    scene.player.body.reset(startX, fountain.y);
    scene.studioDirection = { x: 1, y: 0 };
    await waitForFrames(900, activeRunId);
    scene.studioDirection = null;
    await waitForFrames(40, activeRunId);
    const stoppedRight = scene.player.body.right;
    const stoppedX = scene.player.x;

    const occluder = OCCLUDERS.find((item) => item.id === 'lamp-upper-left') ?? OCCLUDERS[0];
    scene.player.body.reset(occluder.x + occluder.width / 2, occluder.groundY - 8);
    scene.player.setDepth(scene.player.y);
    const behindDepth = scene.player.depth;
    scene.player.body.reset(occluder.x + occluder.width / 2, occluder.groundY + 8);
    scene.player.setDepth(scene.player.y);
    const inFrontDepth = scene.player.depth;
    const assertions: StudioAssertion[] = [
      {
        id: 'fountain-feet-collision',
        pass: stoppedRight <= targetLeft + 2 && stoppedX > startX + 5,
        actual: { bodyRight: stoppedRight, targetLeft, moved: stoppedX - startX },
        expected: 'feet body reaches but does not cross the fountain collider',
      },
      {
        id: 'occluder-depth-order',
        pass: behindDepth < occluder.groundY && inFrontDepth > occluder.groundY,
        actual: { behindDepth, occluderDepth: occluder.groundY, inFrontDepth },
        expected: 'hero depth sorts behind above the ground line and in front below it',
      },
    ];
    return { assertions, evidence: { collisionTarget: fountain.id, occlusionTarget: occluder.id, coordinateSpace: 'world-feet-origin' } };
  };

  const runReducedMotionScenario = async (scene: CourtyardScenePort, activeRunId: number) => {
    scene.player.body.reset(HERO_SPAWN.x, HERO_SPAWN.y);
    const beforeX = scene.player.x;
    scene.setMotionOff(true);
    scene.studioDirection = { x: 1, y: 0 };
    await waitForFrames(300, activeRunId);
    scene.studioDirection = null;
    await waitForFrames(40, activeRunId);
    const assertions: StudioAssertion[] = [
      {
        id: 'reduced-motion-interaction',
        pass: scene.player.x - beforeX >= 20 && scene.facing === 'right',
        actual: { deltaX: scene.player.x - beforeX, facing: scene.facing },
        expected: 'hero moves at least 20 world units and faces right',
      },
      {
        id: 'reduced-motion-animation-held',
        pass: scene.motionOff && !scene.player.anims.isPlaying,
        actual: { motionOff: scene.motionOff, animationPlaying: scene.player.anims.isPlaying },
        expected: 'motion is off and the walk animation is not playing',
      },
    ];
    return { assertions, evidence: { frame: scene.player.frame.name, coordinateSpace: 'world-feet-origin' } };
  };

  const runScenario = async (name: CourtyardStudioScenarioName): Promise<StudioScenarioResult> => {
    if (scenarioPhase === 'running') throw new Error('A Studio scenario is already running.');
    const scene = activeCourtyard(game);
    const activeRunId = ++runId;
    const startedAt = new Date().toISOString();
    const saved = {
      x: scene.player.x,
      y: scene.player.y,
      facing: scene.facing,
      motionOff: scene.motionOff,
      seekTarget: scene.seekTarget ? { ...scene.seekTarget } : null,
    };
    scenarioName = name;
    scenarioPhase = 'running';
    scenarioResult = null;
    restore = () => {
      scene.studioDirection = null;
      scene.seekTarget = saved.seekTarget;
      scene.facing = saved.facing;
      scene.player.body.reset(saved.x, saved.y);
      scene.player.setDepth(saved.y);
      scene.setMotionOff(saved.motionOff);
      scene.updateAnimation({ x: 0, y: 0 });
    };

    let assertions: StudioAssertion[] = [];
    let evidence: Record<string, unknown> = {};
    let error: string | undefined;
    try {
      const outcome = name === 'courtyard-direction-validation'
        ? await runDirectionScenario(scene, activeRunId)
        : name === 'courtyard-collision-and-occlusion'
          ? await runCollisionScenario(scene, activeRunId)
          : await runReducedMotionScenario(scene, activeRunId);
      assertions = outcome.assertions;
      evidence = outcome.evidence;
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
      assertions = [{ id: 'scenario-completed', pass: false, actual: error, expected: 'bounded scenario completes without error' }];
    } finally {
      restore?.();
      restore = null;
    }
    scenarioResult = {
      name,
      verdict: !error && assertions.every((assertion) => assertion.pass) ? 'PASS' : 'FAIL',
      startedAt,
      finishedAt: new Date().toISOString(),
      assertions,
      evidence,
      ...(error ? { error } : {}),
    };
    scenarioPhase = 'complete';
    return scenarioResult;
  };

  const bridge: CardEngineStudioBridge = {
    version: 1,
    listScenarios: () => COURTYARD_STUDIO_SCENARIOS,
    runScenario,
    getSnapshot,
    clearScenario,
  };
  window.__CARD_ENGINE_STUDIO__ = bridge;
  const disposeQueryScenario = installQueryScenarioTransport(bridge, generation);
  console.debug('[studio] courtyard runtime bridge installed');

  return () => {
    runId += 1;
    disposeQueryScenario();
    restore?.();
    restore = null;
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    if (window.__CARD_ENGINE_STUDIO__ === bridge) {
      delete window.__CARD_ENGINE_STUDIO__;
      console.debug('[studio] courtyard runtime bridge disposed');
    }
  };
}

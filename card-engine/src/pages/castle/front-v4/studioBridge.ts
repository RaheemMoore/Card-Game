import { CONSTRUCT_TUNING } from '../combat/construct';
import { HAND_SIZE } from '../combat/hand';
import { LEAP_TUNING } from './jellyLeap';
import { ARENA, GROUND_Y, JELLY_SPAWN_X, PICKUP_RADIUS_PX } from './layout';
import {
  FRONT_V4_SCENARIOS,
  type FrontV4Commands,
  type FrontV4ScenarioName,
  type FrontV4ScenePort,
  type FrontV4Snapshot,
} from './types';

/**
 * The observation bridge for CastleFrontV4.
 *
 * DEV ONLY, and installed through a dynamic import from the host so the code is
 * not merely inert in production but absent from the bundle.
 *
 * IT EXPOSES A PROJECTION, NOT THE SCENE. No Phaser instance, no scene privates,
 * no arbitrary field access — assertions read `FrontV4Snapshot`, which is a stable
 * contract, so renaming something inside the runtime breaks the compile rather
 * than silently turning an assertion into a comparison against `undefined`.
 *
 * SCENARIOS DRIVE SEMANTIC COMMANDS, NEVER SYNTHESISED INPUT. This is not
 * fastidiousness: the preview pane holds the left mouse button down permanently,
 * which made input-driven verification impossible in the courtyard and is the
 * reason `combatDev` exists there. `holdMove` is the one command that deliberately
 * costs real time — proving he can RUN out from under a leap means he has to
 * actually cover the ground at walking pace.
 *
 * Its own global rather than `__CARD_ENGINE_STUDIO__`, following the battle
 * bridge's precedent: two surfaces answering the same name is how a scenario ends
 * up asserting against whichever scene happened to mount last.
 */

export interface StudioAssertion {
  id: string;
  pass: boolean;
  actual: unknown;
  expected: string;
}

export interface FrontV4ScenarioResult {
  name: FrontV4ScenarioName;
  verdict: 'PASS' | 'FAIL';
  startedAt: string;
  finishedAt: string;
  assertions: StudioAssertion[];
  /** Always present, and always HUMAN REVIEW: code does not sign off on how it looks. */
  visualVerdict: 'HUMAN REVIEW';
  error?: string;
}

export interface FrontV4StudioBridge {
  version: 1;
  listScenarios(): readonly FrontV4ScenarioName[];
  runScenario(name: FrontV4ScenarioName): Promise<FrontV4ScenarioResult>;
  getSnapshot(): FrontV4Snapshot | null;
  clearScenario(): void;
  /**
   * The individual commands, for driving the scene by hand.
   *
   * Required by §16, and not merely a convenience: a scenario that fails tells you
   * WHICH assertion broke, and the only way to find out why is to reproduce the
   * step on its own. Every one is a no-op when the scene is not running, so a
   * console left open across a route change cannot throw.
   */
  commands: FrontV4Commands;
}

declare global {
  interface Window {
    __CARD_ENGINE_FRONT_V4_STUDIO__?: FrontV4StudioBridge;
  }
}

const RESULT_ID = 'card-engine-studio-result';

export function installFrontV4StudioBridge(getPort: () => FrontV4ScenePort | null): () => void {
  let lastResult: FrontV4ScenarioResult | null = null;
  /**
   * Guards against two scenarios running at once.
   *
   * Not hypothetical: a scenario call that timed out at the caller kept running in
   * the page, the next call started a second one, and the two fought over the same
   * hero — one resetting while the other was mid-walk. It reported five confident,
   * completely bogus failures (he will not move, he will not fire) against code
   * that was fine. A harness that can lie like that is worse than no harness.
   */
  let running: FrontV4ScenarioName | null = null;

  const commands: FrontV4Commands = {
    reset: () => getPort()?.reset(),
    placePlayer: (x) => getPort()?.placePlayer(x),
    holdMove: (dirX, ms) => getPort()?.holdMove(dirX, ms),
    selectSlot: (i) => getPort()?.selectSlot(i),
    fireTap: () => getPort()?.fireTap(),
    fireHeld: (ms) => getPort()?.fireHeld(ms),
    setJellyAi: (on) => getPort()?.setJellyAi(on),
    setStrongHits: (on) => getPort()?.setStrongHits(on),
    forceJellyPhase: (p) => getPort()?.forceJellyPhase(p),
    forceKnockdown: () => getPort()?.forceKnockdown(),
    defeatJelly: () => getPort()?.defeatJelly(),
    reviveJelly: () => getPort()?.reviveJelly(),
  };

  const bridge: FrontV4StudioBridge = {
    version: 1,
    commands,
    listScenarios: () => FRONT_V4_SCENARIOS,
    getSnapshot: () => getPort()?.snapshot() ?? null,
    clearScenario: () => {
      lastResult = null;
      getPort()?.reset();
    },
    async runScenario(name) {
      const port = getPort();
      const startedAt = new Date().toISOString();
      if (!port) {
        return finish(name, startedAt, [], 'the scene is not running');
      }
      if (!FRONT_V4_SCENARIOS.includes(name)) {
        // Bounded failure rather than a throw, and without touching the player:
        // an unknown name must not leave the scene in a state the next run
        // inherits.
        return finish(name, startedAt, [], `unknown scenario "${name}"`);
      }
      if (running) {
        // Refuse rather than interleave. Reporting "busy" is honest; running
        // anyway produces failures that look real and are not.
        return finish(name, startedAt, [], `"${running}" is still running — wait for it or reload`);
      }
      running = name;
      try {
        const assertions = await SCENARIOS[name](port);
        lastResult = finish(name, startedAt, assertions);
      } catch (error) {
        lastResult = finish(name, startedAt, [], String(error));
      } finally {
        running = null;
      }
      publish(lastResult);
      return lastResult;
    },
  };

  window.__CARD_ENGINE_FRONT_V4_STUDIO__ = bridge;
  void maybeRunFromUrl(bridge);

  return () => {
    if (window.__CARD_ENGINE_FRONT_V4_STUDIO__ === bridge) {
      delete window.__CARD_ENGINE_FRONT_V4_STUDIO__;
    }
  };
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

type Scenario = (port: FrontV4ScenePort) => Promise<StudioAssertion[]>;

const SCENARIOS: Record<FrontV4ScenarioName, Scenario> = {
  'castle-front-v4-combat-loop': combatLoop,
  'castle-front-v4-jelly-leap-evade': leapEvade,
  'castle-front-v4-scatter-recover': scatterRecover,
};

async function combatLoop(port: FrontV4ScenePort): Promise<StudioAssertion[]> {
  const a: StudioAssertion[] = [];
  port.reset();
  port.setJellyAi(false);
  await wait(80);

  const start = port.snapshot();
  a.push(check('scene-is-front-v4', start.scene === 'CastleFrontV4', start.scene, 'CastleFrontV4'));
  a.push(check('camera-is-fixed-fit', start.camera.mode === 'fixed-fit', start.camera.mode, 'fixed-fit'));
  a.push(check('hand-is-full', start.hand.slots.filter((s) => s.state === 'ready').length === HAND_SIZE, start.hand.slots.map((s) => s.state), 'four ready cards'));
  a.push(check('spawns-inside-the-arena', start.player.x >= ARENA.minX && start.player.x <= ARENA.maxX, start.player.x, `${ARENA.minX}..${ARENA.maxX}`));

  // He walks, and he stays on the floor. There is no input that produces height.
  port.holdMove(1, 300);
  await wait(360);
  const walked = port.snapshot();
  a.push(check('walks-east', walked.player.x > start.player.x, walked.player.x, `> ${start.player.x}`));
  a.push(check('faces-east', walked.player.facing === 1, walked.player.facing, '1'));
  port.holdMove(-1, 300);
  await wait(360);
  const back = port.snapshot();
  a.push(check('walks-west', back.player.x < walked.player.x, back.player.x, `< ${walked.player.x}`));
  a.push(check('faces-west', back.player.facing === -1, back.player.facing, '-1'));
  a.push(check('never-leaves-the-ground', back.player.y === GROUND_Y && back.player.canJump === false, { y: back.player.y, canJump: back.player.canJump }, `y=${GROUND_Y}, canJump=false`));

  // A tap, fired east, travelling horizontally.
  port.placePlayer(420);
  port.holdMove(1, 60);
  await wait(120);
  port.selectSlot(0);
  port.fireTap();
  const inFlight = await until(port, (s) => s.projectiles.length > 0, 900);
  a.push(check('tap-spawns-a-shot', inFlight !== null, inFlight?.projectiles.length ?? 0, '> 0'));
  if (inFlight) {
    const shot = inFlight.projectiles[0];
    a.push(check('shot-is-horizontal', shot.dirY === 0, shot.dirY, '0'));
    a.push(check('shot-goes-east', shot.dirX === 1, shot.dirX, '1'));
  }

  const hpBefore = port.snapshot().jelly.hp;
  const damaged = await until(port, (s) => s.jelly.hp < hpBefore, 2500);
  a.push(check('tap-damages-the-jelly', damaged !== null, damaged?.jelly.hp ?? hpBefore, `< ${hpBefore}`));

  // A held shot must cost it more than a tap did.
  const tapDamage = hpBefore - (damaged?.jelly.hp ?? hpBefore);
  await wait(500);
  const beforeHeavy = port.snapshot().jelly.hp;
  port.selectSlot(1);
  port.fireHeld(950);
  const heavyLanded = await until(port, (s) => s.jelly.hp < beforeHeavy, 4000);
  const heavyDamage = beforeHeavy - (heavyLanded?.jelly.hp ?? beforeHeavy);
  a.push(check('held-shot-hits-harder', heavyDamage > tapDamage, { tapDamage, heavyDamage }, 'heavy > tap'));

  // It can be finished, and it can come back. AI back ON first: a frozen
  // construct holds whatever phase it is in, so `reviving` would never tick over
  // to `idle` and the assertion would be measuring the freeze, not the revive.
  port.setJellyAi(true);
  port.defeatJelly();
  await wait(120);
  a.push(check('can-be-defeated', port.snapshot().jelly.phase === 'defeated', port.snapshot().jelly.phase, 'defeated'));
  port.reviveJelly();
  // Not `phase === 'idle'`: it revives into idle and, with the hero still well
  // inside its 340-unit wake radius, leaves for `alert` on the very next frame.
  // Polling would miss that single frame and report a revive that plainly did
  // happen as a failure. The property worth asserting is that it came back,
  // whole, and is fighting again.
  const revived = await until(
    port,
    (s) => s.jelly.phase !== 'defeated' && s.jelly.phase !== 'reviving' && s.jelly.hp === CONSTRUCT_TUNING.maxHp,
    2500,
  );
  a.push(check('revives-and-fights-again', revived !== null, revived?.jelly.phase ?? null, 'alive, not reviving'));
  a.push(check('revives-at-full-health', (revived?.jelly.hp ?? 0) === CONSTRUCT_TUNING.maxHp, revived?.jelly.hp, String(CONSTRUCT_TUNING.maxHp)));

  a.push(check('no-runtime-errors', port.snapshot().errors.length === 0, port.snapshot().errors, 'none'));
  return a;
}

async function leapEvade(port: FrontV4ScenePort): Promise<StudioAssertion[]> {
  const a: StudioAssertion[] = [];

  // Leg 1 — he stands in it. The tell has to mean something.
  port.reset();
  port.setJellyAi(true);
  port.setStrongHits(false);
  port.placePlayer(JELLY_SPAWN_X - CONSTRUCT_TUNING.preferredRangePx);
  await wait(60);
  port.forceJellyPhase('telegraph');
  await wait(60);

  const telegraphing = port.snapshot();
  a.push(check('telegraph-is-visible', telegraphing.jelly.phase === 'telegraph', telegraphing.jelly.phase, 'telegraph'));

  const airborne = await until(port, (s) => s.jelly.mode === 'leaping', CONSTRUCT_TUNING.telegraphMs + 900);
  a.push(check('telegraph-becomes-a-leap', airborne !== null, airborne?.jelly.mode ?? null, 'leaping'));
  const committedLanding = airborne?.jelly.landingX ?? null;

  const peak = await until(port, (s) => s.jelly.heightPx > 150, LEAP_TUNING.durationMs);
  a.push(check('it-genuinely-leaves-the-ground', peak !== null, peak?.jelly.heightPx ?? 0, '> 150'));
  a.push(check('landing-stays-inside-the-arena', committedLanding !== null && committedLanding >= ARENA.minX && committedLanding <= ARENA.maxX, committedLanding, `${ARENA.minX}..${ARENA.maxX}`));

  const struck = await until(port, (s) => s.jelly.lastStrike === 'hit', LEAP_TUNING.durationMs + 600);
  a.push(check('standing-still-is-punished', struck !== null, struck?.jelly.lastStrike ?? 'none', 'hit'));

  await until(port, (s) => s.jelly.mode === 'ground', LEAP_TUNING.durationMs + 600);
  const landed = port.snapshot();
  a.push(check('lands-in-the-punish-window', landed.jelly.phase === 'recovery', landed.jelly.phase, 'recovery'));

  // Leg 2 — he runs. The same attack, answered.
  port.reset();
  port.setJellyAi(true);
  port.setStrongHits(false);
  const heroStart = JELLY_SPAWN_X - CONSTRUCT_TUNING.preferredRangePx;
  port.placePlayer(heroStart);
  await wait(60);
  port.forceJellyPhase('telegraph');
  // He reacts, then runs west — away from the ground it has already committed to.
  await wait(140);
  port.holdMove(-1, CONSTRUCT_TUNING.telegraphMs + LEAP_TUNING.durationMs + 400);

  const launched = await until(port, (s) => s.jelly.mode === 'leaping', CONSTRUCT_TUNING.telegraphMs + 900);
  const landingAtLaunch = launched?.jelly.landingX ?? null;
  await wait(120);
  const midFlight = port.snapshot();
  a.push(check('committed-landing-does-not-follow-him', midFlight.jelly.landingX === landingAtLaunch, { at: landingAtLaunch, now: midFlight.jelly.landingX }, 'unchanged after launch'));

  await until(port, (s) => s.jelly.mode === 'ground', LEAP_TUNING.durationMs + 900);
  const after = port.snapshot();
  a.push(check('running-avoids-the-leap', after.jelly.lastStrike !== 'hit', after.jelly.lastStrike, 'missed'));
  a.push(check('a-miss-stays-a-miss', after.player.phase !== 'knockdown', after.player.phase, 'not knockdown'));
  a.push(check('he-moved-under-his-own-power', after.player.x < heroStart, { from: heroStart, to: after.player.x }, 'walked clear'));
  a.push(check('no-runtime-errors', after.errors.length === 0, after.errors, 'none'));
  return a;
}

async function scatterRecover(port: FrontV4ScenePort): Promise<StudioAssertion[]> {
  const a: StudioAssertion[] = [];

  for (const [label, x] of [
    ['near-the-castle', ARENA.minX + 20],
    ['near-the-eastern-bound', ARENA.maxX - 20],
  ] as const) {
    port.reset();
    port.setJellyAi(false);
    port.placePlayer(x);
    await wait(80);

    port.forceKnockdown();
    await wait(120);
    const down = port.snapshot();

    a.push(check(`${label}:knocked-down`, down.player.phase === 'knockdown', down.player.phase, 'knockdown'));
    a.push(check(`${label}:whole-hand-scattered`, down.dropped.length === HAND_SIZE, down.dropped.length, String(HAND_SIZE)));
    a.push(check(`${label}:scatter-not-degraded`, down.scatter.lastDegraded === false, down.scatter.lastReason, 'no degradation'));

    const xs = down.dropped.map((d) => d.x).sort((p, q) => p - q);
    a.push(check(`${label}:every-card-on-the-ground-line`, down.dropped.every((d) => d.y === GROUND_Y), down.dropped.map((d) => d.y), String(GROUND_Y)));
    a.push(check(`${label}:every-card-inside-the-arena`, down.dropped.every((d) => d.x >= ARENA.minX && d.x <= ARENA.maxX), xs, `${ARENA.minX}..${ARENA.maxX}`));
    a.push(check(`${label}:cards-are-separated`, xs.every((v, i) => i === 0 || v - xs[i - 1] >= 48), xs, 'no two closer than 48'));
    a.push(check(`${label}:no-card-is-free`, down.dropped.every((d) => Math.abs(d.x - down.player.x) > PICKUP_RADIUS_PX), xs, `> ${PICKUP_RADIUS_PX} from him`));
    const ids = new Set(down.dropped.map((d) => d.cardId));
    a.push(check(`${label}:no-duplicated-cards`, ids.size === down.dropped.length, ids.size, String(down.dropped.length)));
    a.push(check(`${label}:cannot-fire-with-an-empty-hand`, down.hand.canFire === false, down.hand.canFire, 'false'));
  }

  // He gets up on his own request, walks to a card, and picks it up without a key.
  const target = port.snapshot().dropped[0];
  const standWindow = 513 + 1200 + 250;
  port.holdMove(target.x > port.snapshot().player.x ? 1 : -1, standWindow + 4000);
  const up = await until(port, (s) => s.player.phase === 'explore', standWindow + 2500);
  a.push(check('stands-up-when-asked', up !== null, up?.player.phase ?? null, 'explore'));

  const recovered = await until(port, (s) => s.dropped.length < HAND_SIZE, 6000);
  a.push(check('proximity-recovers-a-card', recovered !== null, recovered?.dropped.length ?? HAND_SIZE, `< ${HAND_SIZE}`));

  const armed = await until(port, (s) => s.hand.canFire, 3000);
  a.push(check('firing-resumes-after-recovery', armed !== null, armed?.hand.canFire ?? false, 'true'));
  a.push(check('no-runtime-errors', port.snapshot().errors.length === 0, port.snapshot().errors, 'none'));
  return a;
}

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

const check = (id: string, pass: boolean, actual: unknown, expected: string): StudioAssertion => ({
  id,
  pass,
  actual,
  expected,
});

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/**
 * Poll the snapshot until a condition holds, or give up.
 *
 * Returns the snapshot that satisfied it, or null on timeout — so a scenario says
 * "this never happened" rather than hanging, and a failure names the thing that
 * did not occur instead of the runner that stopped waiting for it.
 */
async function until(
  port: FrontV4ScenePort,
  predicate: (s: FrontV4Snapshot) => boolean,
  timeoutMs: number,
): Promise<FrontV4Snapshot | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const snapshot = port.snapshot();
    if (predicate(snapshot)) return snapshot;
    await wait(16);
  }
  return null;
}

function finish(
  name: FrontV4ScenarioName,
  startedAt: string,
  assertions: StudioAssertion[],
  error?: string,
): FrontV4ScenarioResult {
  return {
    name,
    verdict: !error && assertions.length > 0 && assertions.every((x) => x.pass) ? 'PASS' : 'FAIL',
    startedAt,
    finishedAt: new Date().toISOString(),
    assertions,
    // Never anything else. Objective behaviour can pass while the composition,
    // the character scale and the weight of the leap are all still wrong, and
    // only Raheem and Codex can say.
    visualVerdict: 'HUMAN REVIEW',
    error,
  };
}

/** Write the result where an automated run can read it without a console. */
function publish(result: FrontV4ScenarioResult) {
  const el = document.getElementById(RESULT_ID) ?? createResultElement();
  el.setAttribute('data-status', result.verdict === 'PASS' ? 'pass' : 'fail');
  el.setAttribute('data-scenario', result.name);
  el.setAttribute('data-visual-verdict', result.visualVerdict);
  const failed = result.assertions.filter((x) => !x.pass);
  el.textContent = `${result.name}: ${result.verdict} (${result.assertions.length - failed.length}/${result.assertions.length})${
    failed.length ? ` — failed: ${failed.map((f) => f.id).join(', ')}` : ''
  }${result.error ? ` — ${result.error}` : ''}`;
}

function createResultElement(): HTMLElement {
  const el = document.createElement('output');
  el.id = RESULT_ID;
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  return el;
}

/**
 * `?studioScenario=<name>&studioRun=<nonce>` runs one scenario on load.
 *
 * The nonce makes a run happen once per URL rather than on every re-render, which
 * is what stops a React refresh from restarting a scenario mid-way and publishing
 * the result of a run nobody asked for.
 */
async function maybeRunFromUrl(bridge: FrontV4StudioBridge) {
  try {
    const params = new URLSearchParams(window.location.search);
    const name = params.get('studioScenario') as FrontV4ScenarioName | null;
    if (!name) return;
    const nonce = params.get('studioRun') ?? 'once';
    const key = `${name}:${nonce}`;
    if (ranFromUrl.has(key)) return;
    ranFromUrl.add(key);
    // Let the scene finish booting and the first textures land.
    await wait(600);
    await bridge.runScenario(name);
  } catch {
    /* the URL transport is a convenience; it must never break the page */
  }
}

const ranFromUrl = new Set<string>();

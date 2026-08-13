import {
  defeatConstruct,
  forcePhase,
  resetConstruct,
  reviveConstruct,
  setAiEnabled,
  setStrongHits,
  type ConstructPhase,
  type ConstructState,
} from '../combat/construct';
import type { HitSeverity } from '../combat/feel';

/**
 * Semantic commands for driving the encounter, for humans AND automation.
 *
 * WHY THIS EXISTS, and why it is not a set of key bindings. Handoff §9.7:
 * "Keyboard controls are for humans. Studio/runtime automation should call the
 * same underlying commands directly… Do not make automated scenarios depend
 * solely on synthesizing keyboard input."
 *
 * That instruction earned itself immediately. The first attempt to verify this
 * feature in a real browser could not: the preview pane holds the left mouse
 * button down permanently, so the Card-wright charged a card forever, shot the
 * construct dead before it could finish a telegraph, and no amount of
 * synthesised keystrokes could produce a clean run. Every question worth asking
 * — does it telegraph, can a strike be walked out of, does a knockdown scatter
 * exactly once — was unanswerable through the input layer.
 *
 * So the commands mutate state directly and the input layer is not involved.
 *
 * GATING. These WRITE, unlike the `castleCombat()` readouts next to them, so
 * they sit behind two locks: the DEV build, and an explicit `?combatDev=1`.
 * The readouts are safe to leave on because they cannot change anything; a
 * `knockdownHero()` reachable by accident in a dev session is a different
 * proposition, and the second lock makes turning them on a decision.
 */

/** What the commands need from the scene. Kept narrow so it is easy to satisfy. */
export interface CombatDevPort {
  getConstruct(): ConstructState | undefined;
  setConstruct(next: ConstructState): void;
  /** Where it resets to, so repeated loops all start from the same place. */
  home(): { x: number; y: number };
  heroFeet(): { x: number; y: number };
  /** Put the hero on the floor, through the same path a real strong hit takes. */
  knockdownHero(): void;
  /** Move the hero outright. Placement, not walking — no collision is consulted. */
  placeHero(x: number, y: number): void;
  /** Fire one hit's worth of feedback with no shot behind it. */
  triggerImpact(severity: HitSeverity): void;
  /** Throw a real shot at a given charge, aimed at the construct. */
  fireBlast(charge: number): void;
  snapshot(): unknown;
}

export interface CombatDevCommands {
  resetConstruct(): unknown;
  setAi(enabled: boolean): unknown;
  forceState(phase: ConstructPhase): unknown;
  /** Commit a strike at the hero's current feet and let it run. */
  forceAttack(): unknown;
  damageConstruct(amount: number, heavy?: boolean): unknown;
  defeatConstruct(): unknown;
  reviveConstruct(): unknown;
  setStrongHits(on: boolean): unknown;
  knockdownHero(): unknown;
  placeHero(x: number, y: number): unknown;
  /**
   * Play one tier's contact feedback on demand.
   *
   * The feel work's equivalent of `forceAttack`: it exists so the three tiers
   * can be compared back to back without having to land three real shots of
   * exactly the right charge — which, given the preview pane holds the mouse
   * button down, is not something a scenario can arrange.
   */
  triggerImpact(severity?: HitSeverity): unknown;
  /**
   * Throw one shot at a chosen charge, aimed at the construct.
   *
   * THE benchmark command. Charge is the axis everything about the throw scales
   * on — lean, lunge, squash, hitstop, flash, spray, camera — and the only way
   * to hold it in the real game is to hold the mouse button for a measured
   * number of milliseconds, which is precisely what the preview pane makes
   * impossible (it pins the button down permanently). `fireBlast(0.25)` and
   * `fireBlast(1)` back to back is how the light and heavy tiers get compared
   * on the same shot, from the same place, twice in a row.
   */
  fireBlast(charge?: number): unknown;
  snapshot(): unknown;
}

export function createCombatDevCommands(port: CombatDevPort): CombatDevCommands {
  /** Apply a pure transition, or say plainly that there is nothing to apply it to. */
  const on = (fn: (c: ConstructState) => ConstructState) => {
    const c = port.getConstruct();
    if (!c) return { error: 'no construct in this scene' };
    port.setConstruct(fn(c));
    return port.snapshot();
  };

  return {
    resetConstruct: () => on((c) => resetConstruct(c, port.home())),
    setAi: (enabled) => on((c) => setAiEnabled(c, enabled)),
    forceState: (phase) => on((c) => forcePhase(c, phase, port.heroFeet())),
    // Telegraph rather than attack: a scenario that jumped straight to the
    // damage frame would skip the tell, which is the half of the exchange most
    // worth watching.
    forceAttack: () => on((c) => forcePhase(c, 'telegraph', port.heroFeet())),
    damageConstruct: (amount, heavy = false) =>
      on((c) => {
        const hp = Math.max(0, c.hp - amount);
        if (hp === 0) return defeatConstruct(c);
        return { ...c, hp, phase: heavy ? 'knockbackReact' : 'hitReact', elapsedMs: 0 };
      }),
    defeatConstruct: () => on(defeatConstruct),
    reviveConstruct: () => on(reviveConstruct),
    setStrongHits: (value) => on((c) => setStrongHits(c, value)),
    knockdownHero: () => {
      port.knockdownHero();
      return port.snapshot();
    },
    placeHero: (x, y) => {
      port.placeHero(x, y);
      return port.snapshot();
    },
    triggerImpact: (severity = 'normal') => {
      port.triggerImpact(severity);
      return port.snapshot();
    },
    fireBlast: (charge = 1) => {
      port.fireBlast(Math.max(0, Math.min(1, charge)));
      return port.snapshot();
    },
    snapshot: () => port.snapshot(),
  };
}

/** Are the mutating commands turned on for this page load? */
export function combatDevEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(window.location.search).has('combatDev');
  } catch {
    return false;
  }
}

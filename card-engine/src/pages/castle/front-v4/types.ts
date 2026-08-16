import type { ElementName } from '../../../types/bible';
import type { ActionPhase } from '../combat/actionState';
import type { SlotState } from '../combat/hand';
import type { ConstructPhase } from '../combat/construct';
import type { JellyMode } from './jellyController';
import type { BackdropReadout } from './backdrop';

/**
 * The contracts the React host, the dev bridge and the scene agree on.
 *
 * Kept separate from the scene so the host and the bridge can be typed without
 * importing Phaser — the engine is dynamically imported and must stay out of the
 * synchronous module graph.
 */

/** A card on the DEV route, standing in for a real collection entry. */
export interface FixtureCard {
  cardId: string;
  name: string;
  element: ElementName;
}

export interface SlotSnapshot {
  cardId: string | null;
  state: SlotState;
  name: string | null;
  element: string | null;
}

export interface DroppedSnapshot {
  cardId: string;
  slotIndex: number;
  x: number;
  y: number;
}

export interface ProjectileSnapshot {
  id: number;
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  outcome: string;
}

/**
 * Everything a scenario is allowed to assert on.
 *
 * Deliberately a flat, stable projection rather than the scene's own fields. The
 * bridge spec is explicit that tests never reach into scene privates: a rename
 * inside the runtime must not be able to silently turn a passing assertion into a
 * comparison against `undefined`.
 */
export interface FrontV4Snapshot {
  bridgeVersion: 1;
  scene: 'CastleFrontV4';
  route: string;

  view: { width: number; height: number };
  canvas: { width: number; height: number };
  /**
   * `level-follow` scrolls with the player along a level longer than the screen;
   * `fixed` is the fallback when the whole level fits and there is nothing to
   * scroll. Reported rather than assumed, because which one is active depends on
   * the window size and how far the ground has been stretched.
   */
  camera: { mode: 'level-follow' | 'fixed'; zoom: number; scrollX: number; scrollY: number };
  world: { groundY: number; minX: number; maxX: number };

  player: {
    x: number;
    y: number;
    facing: -1 | 1;
    vx: number;
    grounded: true;
    canJump: false;
    phase: ActionPhase;
    chargeLevel: number;
    graceRemainingMs: number;
    animation: string;
    body: { left: number; right: number; top: number; bottom: number };
  };

  hand: { selected: number | null; slots: SlotSnapshot[]; canFire: boolean };
  dropped: DroppedSnapshot[];
  projectiles: ProjectileSnapshot[];

  jelly: {
    mode: JellyMode;
    phase: ConstructPhase;
    hp: number;
    maxHp: number;
    x: number;
    heightPx: number;
    landingX: number | null;
    aiEnabled: boolean;
    strongHits: boolean;
    animation: string;
    lastStrike: 'none' | 'hit' | 'missed';
  };

  hitstop: { active: boolean; remainingMs: number };
  scatter: { lastDegraded: boolean; lastReason: string | null };
  /**
   * What the parallax is doing, which a screenshot cannot show.
   *
   * A background scrolling at the wrong rate photographs identically to one
   * scrolling at the right rate, so this is the only way to check it without a
   * human watching. See `BackdropReadout`.
   */
  backdrop: BackdropReadout;
  /**
   * The Phaser Editor world, if one has been authored.
   *
   * `absent` is the normal state until Raheem has placed something, and it is
   * reported rather than hidden: "nothing appeared" and "the file is not there
   * yet" look identical on screen and mean very different things.
   */
  authoredWorld: {
    sceneName: string;
    status: 'loaded' | 'absent' | 'failed' | 'pending';
    texturesLoaded: number;
    message: string | null;
  };
  errors: string[];
}

/**
 * Semantic commands.
 *
 * Automation calls THESE, never synthesised keystrokes — the preview pane holds
 * the left mouse button down permanently, which made input-driven verification
 * impossible in the courtyard and is the reason the pattern exists at all.
 */
export interface FrontV4Commands {
  reset(): void;
  placePlayer(x: number): void;
  /**
   * Hold a walk direction for a while, as a human would.
   *
   * Distinct from `placePlayer`, which teleports: proving he can RUN out from
   * under a leap requires him to actually cover the ground at walking pace, and a
   * scenario that repositioned him instantly would pass while the real answer was
   * "no, he is too slow".
   */
  holdMove(dirX: -1 | 0 | 1, ms: number): void;
  selectSlot(index: number): void;
  fireTap(): void;
  fireHeld(holdMs: number): void;
  setJellyAi(enabled: boolean): void;
  setStrongHits(enabled: boolean): void;
  forceJellyPhase(phase: ConstructPhase): void;
  forceKnockdown(): void;
  defeatJelly(): void;
  reviveJelly(): void;
}

export interface FrontV4ScenePort extends FrontV4Commands {
  snapshot(): FrontV4Snapshot;
}

export const FRONT_V4_EVENTS = {
  /** Host asks for a snapshot; the scene answers on `${snapshot}:result`. */
  snapshot: 'front-v4:snapshot',
  ready: 'front-v4:ready',
} as const;

export const FRONT_V4_SCENARIOS = [
  'castle-front-v4-combat-loop',
  'castle-front-v4-jelly-leap-evade',
  'castle-front-v4-scatter-recover',
  'castle-front-v4-parallax',
] as const;

export type FrontV4ScenarioName = (typeof FRONT_V4_SCENARIOS)[number];

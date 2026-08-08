export type WildlifeSpeciesId = 'red-fox' | 'forest-rabbit' | 'glowcap-tortoise';

export type WildlifeActivity = 'idle' | 'roam' | 'signature' | 'observe' | 'flee';

export type WildlifeFacing = 'down' | 'left' | 'right' | 'up';

export interface WildlifePoint {
  x: number;
  y: number;
}

export interface WildlifeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WildlifeRoutine {
  activity: Exclude<WildlifeActivity, 'flee'>;
  /** Relative likelihood after context and recent-memory rules are applied. */
  weight: number;
  durationMs: readonly [minimum: number, maximum: number];
  /** How long this activity must wait after it finishes before it can be selected again. */
  cooldownMs: number;
}

export interface WildlifeSpeciesProfile {
  id: WildlifeSpeciesId;
  label: string;
  movementStyle: 'hop' | 'toddle' | 'trot';
  roamSpeed: number;
  fleeSpeed: number;
  arrivalRadius: number;
  noticeRadius: number;
  fleeRadius: number;
  closePlayerResponse: 'flee' | 'observe';
  routines: readonly WildlifeRoutine[];
  signatureLabel: string;
}

export interface WildlifeStimulus {
  now: number;
  playerPosition?: WildlifePoint;
  playerDistance?: number;
}

export interface WildlifeDecision {
  activity: WildlifeActivity;
  startedAt: number;
  endsAt: number;
  reason: 'routine' | 'player-nearby';
}

export interface WildlifeNeeds {
  /** Available effort. Rest restores it; movement spends it. */
  energy: number;
  /** Desire to explore or inspect something new. */
  curiosity: number;
  /** Desire to perform the species' characteristic activity. */
  signatureUrge: number;
}

export interface WildlifeBrainSnapshot {
  current: WildlifeDecision | null;
  needs: WildlifeNeeds;
  recent: readonly WildlifeActivity[];
}

export type WildlifeRandom = () => number;

export interface WildlifeAnimationSet {
  idle: Partial<Record<WildlifeFacing, string>>;
  move: Partial<Record<WildlifeFacing, string>>;
  signature: Partial<Record<WildlifeFacing, string>>;
  observe?: Partial<Record<WildlifeFacing, string>>;
}

/**
 * Lets the courtyard decide whether a proposed step is legal. The first lab can
 * use the default open-floor resolver; Courtyard V2 can later inject its traced
 * wall resolver without giving the animal system a second collision model.
 */
export type WildlifeMoveResolver = (
  current: WildlifePoint,
  proposed: WildlifePoint,
) => WildlifePoint;

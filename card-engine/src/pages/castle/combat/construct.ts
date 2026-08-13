import type { Vec2 } from './aim';

/**
 * The training construct: the first thing in the courtyard that can fight back.
 *
 * WHY IT IS SHAPED LIKE THIS. Handoff §9 asks for a training instrument rather
 * than a production enemy — something that can be reset, forced into any state,
 * and reviewed from every side, because the questions it exists to answer are
 * about the PLAYER's systems (is aim right, does the blast connect, can he be
 * knocked down and recover) and not about the construct being interesting.
 *
 * Same discipline as actionState.ts: pure, time-driven, no Phaser. The caller
 * passes elapsed milliseconds and the hero's feet; this returns the next state
 * and, on the frame a strike lands, what it hit with. Nothing here ever reads a
 * sprite or waits on an animation event — a construct frozen mid-telegraph
 * because a clip never finished is exactly the failure the player would read as
 * the game hanging.
 *
 * THE ONE RULE THAT IS NOT A TUNING KNOB: its ordinary attack must be avoidable
 * by walking. The Card-wright has no dodge, no roll and no shield by design
 * (handoff §6.5), so if the telegraph is shorter than the time it takes to walk
 * clear, the encounter is unfair in a way no amount of player skill fixes.
 * `telegraphIsAvoidable()` states that as arithmetic and the tests hold the
 * tuning to it.
 */

export type ConstructPhase =
  /** Switched off entirely. The state it starts in and returns to on reset. */
  | 'disabled'
  /** Awake, aware of nothing. */
  | 'idle'
  /** Has noticed him. A beat of recognition before it does anything about it. */
  | 'alert'
  /** Turning to face. Separate from `alert` so the turn is visible. */
  | 'face'
  /** Closing the distance. */
  | 'approach'
  /** The tell. Long, obvious, and the only warning he gets. */
  | 'telegraph'
  /** Committed. Direction is frozen; it cannot follow him any more. */
  | 'attack'
  /** The punish window — the whole reason the fight has a rhythm. */
  | 'recovery'
  /** Flinch from an ordinary hit. */
  | 'hitReact'
  /** Shoved back by a charged one. */
  | 'knockbackReact'
  | 'defeated'
  | 'reviving';

/**
 * Every number the construct's behaviour is made of.
 *
 * One object so they can be read together, changed together, and — the point —
 * held to the avoidability invariant as a set rather than drifting one at a
 * time. Tuning knobs, not canon: these are a starting point to be played
 * against, and handoff §10.3 is explicit that values appearing in a planning
 * document do not become permanent by having been written down.
 */
export const CONSTRUCT_TUNING = {
  /** How close he must come before it wakes up. */
  alertRadiusPx: 260,
  /** And how far he must get for it to lose interest. Wider, so it does not flicker. */
  forgetRadiusPx: 340,
  /** Units per second while closing. Slower than his 190 — he can always outwalk it. */
  approachSpeed: 70,
  /** The distance it wants before it commits to a strike. */
  preferredRangePx: 96,
  /** How far the strike actually reaches from where it stood. */
  lungeReachPx: 132,
  /** Half-width of the strike, so a glancing angle is a miss. */
  lungeRadiusPx: 34,

  alertMs: 260,
  faceMs: 220,
  /** THE TELL. Long on purpose — see telegraphIsAvoidable(). */
  telegraphMs: 650,
  attackMs: 240,
  /** Long enough that walking in and answering is the obvious reward. */
  recoveryMs: 900,
  hitReactMs: 180,
  knockbackReactMs: 320,
  knockbackPx: 36,
  reviveMs: 600,

  maxHp: 30,
} as const;

/**
 * Is the telegraph long enough to walk out of, for a player with no dodge?
 *
 * The worst case is standing at the range it wants to strike from: he must
 * cover the gap between where he is and where the strike stops reaching, using
 * ordinary walking, within the tell. `heroWalkSpeed` is the courtyard's
 * WALK_SPEED, in units per second.
 *
 * Exported and tested rather than left as a comment because it is the one
 * property of this enemy that is a fairness guarantee and not a preference —
 * and because the natural way to "make the fight better" is to shorten the
 * tell, which is precisely the change that must fail loudly.
 */
export function telegraphIsAvoidable(
  heroWalkSpeed: number,
  // Structural rather than `typeof CONSTRUCT_TUNING`: the whole use of this
  // function outside the runtime is asking "what if we changed one of these",
  // and `as const` would make every such candidate a type error.
  t: {
    lungeReachPx: number;
    lungeRadiusPx: number;
    preferredRangePx: number;
    telegraphMs: number;
  } = CONSTRUCT_TUNING,
): boolean {
  const distanceToClear = t.lungeReachPx + t.lungeRadiusPx - t.preferredRangePx;
  const walkable = (heroWalkSpeed * t.telegraphMs) / 1000;
  return walkable > distanceToClear;
}

export interface ConstructState {
  phase: ConstructPhase;
  elapsedMs: number;
  pos: Vec2;
  /** Unit vector it is facing. Frozen when a telegraph begins. */
  facing: Vec2;
  hp: number;
  /**
   * Where the committed strike is aimed.
   *
   * Captured at the START of the telegraph, not at the damage frame. Handoff
   * §9.4: it must not track him perfectly through the strike, or the tell
   * communicates nothing and walking out of the way does not work.
   */
  committedTarget: Vec2 | null;
  /** Whether its strike is the knockdown kind. Test switch, see `strongHits`. */
  strongHits: boolean;
  /** AI off means it holds whatever state it is in, for review from every side. */
  aiEnabled: boolean;
  /** Set for one step, on the frame the strike's damage lands. */
  strikeThisStep: boolean;
  /** Velocity the presentation should apply, in units per second. */
  velocity: Vec2;
}

export interface ConstructInput {
  heroFeet: Vec2;
  /**
   * He is on the floor or has just got up.
   *
   * A construct that keeps swinging through a knockdown makes the recovery
   * grace pointless and produces exactly the unavoidable chain the handoff
   * (§11.3) says must not exist.
   */
  heroDownedOrGraced: boolean;
  /** Damage that landed this frame, most recent first. */
  hits: ConstructHit[];
}

export interface ConstructHit {
  amount: number;
  /** Direction to shove, unit vector. */
  knockback: Vec2;
  /** A charged shot staggers; a tap flinches. */
  heavy: boolean;
}

/** What a committed strike resolved to, on the frame it lands. */
export interface StrikeResolution {
  origin: Vec2;
  target: Vec2;
  reachPx: number;
  radiusPx: number;
  /** `strong` knocks him down and scatters the hand; `light` only hurts. */
  kind: 'light' | 'strong';
}

const unit = (v: Vec2): Vec2 => {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: 1 } : { x: v.x / len, y: v.y / len };
};

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

export function initialConstruct(pos: Vec2): ConstructState {
  return {
    phase: 'disabled',
    elapsedMs: 0,
    pos: { ...pos },
    facing: { x: 0, y: 1 },
    hp: CONSTRUCT_TUNING.maxHp,
    committedTarget: null,
    strongHits: false,
    aiEnabled: true,
    strikeThisStep: false,
    velocity: { x: 0, y: 0 },
  };
}

/** Phases during which a blast should still be able to hit it. */
export const isHittable = (phase: ConstructPhase) =>
  phase !== 'disabled' && phase !== 'defeated' && phase !== 'reviving';

/** Phases during which it is committed and cannot change its mind. */
export const isCommitted = (phase: ConstructPhase) =>
  phase === 'telegraph' || phase === 'attack' || phase === 'recovery';

const enter = (
  state: ConstructState,
  phase: ConstructPhase,
  over: Partial<ConstructState> = {},
): ConstructState => ({
  ...state,
  phase,
  elapsedMs: 0,
  strikeThisStep: false,
  velocity: { x: 0, y: 0 },
  ...over,
});

/**
 * Advance one frame.
 *
 * Order matters and is deliberate: damage is applied before the phase advances,
 * so a shot that kills it during a telegraph cancels the strike rather than
 * letting a dead construct finish swinging.
 */
export function stepConstruct(
  state: ConstructState,
  input: ConstructInput,
  dtMs: number,
): { state: ConstructState; strike: StrikeResolution | null } {
  if (state.phase === 'disabled') {
    return { state: { ...state, strikeThisStep: false, velocity: { x: 0, y: 0 } }, strike: null };
  }

  let next = applyHits(state, input.hits);
  if (next.phase === 'defeated' && state.phase !== 'defeated') {
    return { state: next, strike: null };
  }

  // Frozen AI holds the current phase so a human or a scenario can look at it
  // from every side. Damage still lands — the point is to stop it acting, not
  // to make it invulnerable.
  if (!next.aiEnabled) {
    return { state: { ...next, strikeThisStep: false, velocity: { x: 0, y: 0 } }, strike: null };
  }

  const elapsedMs = next.elapsedMs + dtMs;
  const t = CONSTRUCT_TUNING;
  const toHero = { x: input.heroFeet.x - next.pos.x, y: input.heroFeet.y - next.pos.y };
  const range = distance(next.pos, input.heroFeet);

  switch (next.phase) {
    case 'idle':
      if (range <= t.alertRadiusPx && !input.heroDownedOrGraced) {
        return { state: enter(next, 'alert'), strike: null };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'alert':
      if (elapsedMs >= t.alertMs) {
        return { state: enter(next, 'face', { facing: unit(toHero) }), strike: null };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'face':
      // Keep turning while it turns — this is the one place tracking is correct,
      // because nothing has been committed yet.
      next = { ...next, facing: unit(toHero) };
      if (range > t.forgetRadiusPx) return { state: enter(next, 'idle'), strike: null };
      if (elapsedMs >= t.faceMs) {
        return {
          state: enter(next, range <= t.preferredRangePx ? 'telegraph' : 'approach', {
            committedTarget: range <= t.preferredRangePx ? { ...input.heroFeet } : null,
          }),
          strike: null,
        };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'approach': {
      if (range > t.forgetRadiusPx) return { state: enter(next, 'idle'), strike: null };
      // It will not walk in on a man who is already on the floor. Without this
      // the stand-up grace buys nothing, because the strike is already landing
      // as he gets up.
      if (input.heroDownedOrGraced) return { state: enter(next, 'face'), strike: null };
      if (range <= t.preferredRangePx) {
        // COMMITMENT. The target is taken here, once, and the tell begins.
        return {
          state: enter(next, 'telegraph', {
            facing: unit(toHero),
            committedTarget: { ...input.heroFeet },
          }),
          strike: null,
        };
      }
      const dir = unit(toHero);
      const step = (t.approachSpeed * dtMs) / 1000;
      return {
        state: {
          ...next,
          elapsedMs,
          strikeThisStep: false,
          facing: dir,
          pos: { x: next.pos.x + dir.x * step, y: next.pos.y + dir.y * step },
          velocity: { x: dir.x * t.approachSpeed, y: dir.y * t.approachSpeed },
        },
        strike: null,
      };
    }

    case 'telegraph':
      // NOTHING updates the target here. That is the whole point of the phase:
      // it has decided where it is going to hit, and walking off that spot is
      // the defence a player with no dodge is left with.
      if (elapsedMs >= t.telegraphMs) {
        return { state: enter(next, 'attack'), strike: null };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'attack':
      if (elapsedMs >= t.attackMs) {
        return { state: enter(next, 'recovery'), strike: null };
      }
      // The damage frame is the FIRST step of the attack, so the strike lands
      // when the lunge starts rather than when it finishes. A hitbox that
      // arrives at the end of the animation reads as being hit by nothing.
      if (!next.strikeThisStep && next.elapsedMs === 0 && next.committedTarget) {
        return {
          state: { ...next, elapsedMs, strikeThisStep: true },
          strike: {
            origin: { ...next.pos },
            target: { ...next.committedTarget },
            reachPx: t.lungeReachPx,
            radiusPx: t.lungeRadiusPx,
            kind: next.strongHits ? 'strong' : 'light',
          },
        };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'recovery':
      if (elapsedMs >= t.recoveryMs) {
        return { state: enter(next, 'face', { committedTarget: null }), strike: null };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'hitReact':
      if (elapsedMs >= t.hitReactMs) return { state: enter(next, 'face'), strike: null };
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'knockbackReact':
      if (elapsedMs >= t.knockbackReactMs) return { state: enter(next, 'face'), strike: null };
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'defeated':
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    case 'reviving':
      if (elapsedMs >= t.reviveMs) {
        return { state: enter(next, 'idle', { hp: t.maxHp }), strike: null };
      }
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };

    default:
      return { state: { ...next, elapsedMs, strikeThisStep: false }, strike: null };
  }
}

/**
 * Take damage.
 *
 * A hit lands even mid-telegraph and interrupts it, which is what makes shooting
 * a construct that is winding up feel like an answer rather than a race.
 */
function applyHits(state: ConstructState, hits: ConstructHit[]): ConstructState {
  if (hits.length === 0 || !isHittable(state.phase)) return state;

  let hp = state.hp;
  let pos = state.pos;
  let heavy = false;
  for (const hit of hits) {
    hp -= hit.amount;
    heavy = heavy || hit.heavy;
    if (hit.heavy) {
      const dir = unit(hit.knockback);
      pos = {
        x: pos.x + dir.x * CONSTRUCT_TUNING.knockbackPx,
        y: pos.y + dir.y * CONSTRUCT_TUNING.knockbackPx,
      };
    }
  }

  if (hp <= 0) {
    return { ...state, hp: 0, pos, phase: 'defeated', elapsedMs: 0, strikeThisStep: false,
      committedTarget: null, velocity: { x: 0, y: 0 } };
  }
  return {
    ...state,
    hp,
    pos,
    phase: heavy ? 'knockbackReact' : 'hitReact',
    elapsedMs: 0,
    strikeThisStep: false,
    // The interrupted strike is abandoned rather than remembered, so it cannot
    // resume and land after the flinch.
    committedTarget: null,
    velocity: { x: 0, y: 0 },
  };
}

/** Does a committed strike reach a point? Used by the runtime and the tests alike. */
export function strikeHits(strike: StrikeResolution, feet: Vec2): boolean {
  const dir = unit({ x: strike.target.x - strike.origin.x, y: strike.target.y - strike.origin.y });
  const rel = { x: feet.x - strike.origin.x, y: feet.y - strike.origin.y };
  // Distance along the lunge, clamped to its reach: the strike is a capsule from
  // where it stood to where it committed, not a circle around the target.
  const along = Math.max(0, Math.min(strike.reachPx, rel.x * dir.x + rel.y * dir.y));
  const nearest = { x: strike.origin.x + dir.x * along, y: strike.origin.y + dir.y * along };
  return distance(nearest, feet) <= strike.radiusPx;
}

// ---------------------------------------------------------------------------
// Commands. Pure transitions, called by the dev panel AND by named scenarios —
// handoff §9.7: keyboard shortcuts are for humans, and automation must reach
// the same functions rather than synthesising keystrokes.
// ---------------------------------------------------------------------------

export const resetConstruct = (state: ConstructState, pos: Vec2): ConstructState => ({
  ...initialConstruct(pos),
  phase: 'idle',
  aiEnabled: state.aiEnabled,
  strongHits: state.strongHits,
});

export const setAiEnabled = (state: ConstructState, aiEnabled: boolean): ConstructState => ({
  ...state,
  aiEnabled,
});

export const setStrongHits = (state: ConstructState, strongHits: boolean): ConstructState => ({
  ...state,
  strongHits,
});

/**
 * Force a phase outright.
 *
 * Review tool: it is how a scenario gets to a telegraph without waiting for the
 * construct to decide to make one.
 */
export const forcePhase = (state: ConstructState, phase: ConstructPhase, target?: Vec2) =>
  enter(state, phase, {
    committedTarget: phase === 'telegraph' || phase === 'attack' ? (target ?? state.committedTarget) : null,
  });

export const defeatConstruct = (state: ConstructState): ConstructState =>
  enter(state, 'defeated', { hp: 0, committedTarget: null });

export const reviveConstruct = (state: ConstructState): ConstructState =>
  enter(state, 'reviving', { committedTarget: null });

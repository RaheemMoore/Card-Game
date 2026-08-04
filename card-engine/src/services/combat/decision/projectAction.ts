/**
 * Exact action projection — "what happens if I do this?"
 *
 * The Decision Experience System promises the player exact numbers. The only
 * honest way to produce them is to ask the reducer, so that is what this does:
 * it runs the REAL `submitPlayerAction` and diffs the result.
 *
 * This is safe because `BattleState` is a plain serialisable object and every
 * reducer path is pure — `rngCursor` is a NUMBER in state, not a live stream,
 * so running a projection cannot advance anyone's RNG. Nothing here is
 * speculative-but-parallel maths that could drift from resolution, which is
 * the failure this module exists to prevent: the previous `previewAbilityDamage`
 * promised "the exact same math the reducer will use" in its own doc comment
 * while passing `targetMitigation: 0`, skipping `statusDamageModifiers`, and
 * returning nothing at all for heal/shield/status abilities.
 *
 * Read-only contract: callers MUST discard the projected state. It exists to
 * be measured, never to be committed. Committing is `submitPlayerAction`'s job
 * and the caller does it against the live state.
 */

import type {
  BattleEvent,
  BattleState,
  PlayerAction,
  StatusInstance,
} from '../../../types/combat';
import { submitPlayerAction } from '../reducer';

/* ------------------------------------------------------------------ */
/*  Confidence                                                         */
/* ------------------------------------------------------------------ */

/**
 * How much the projection can be trusted. Never show a number without this —
 * a fabricated single value for an uncertain outcome is worse than saying
 * "depends", because the player calibrates on it and then gets burned.
 */
export type DecisionConfidence =
  | { kind: 'exact' }
  /** Deterministic, but only under stated conditions the player can check. */
  | { kind: 'conditional'; reasons: readonly string[] }
  /** Cannot be known before commitment (RNG target, later hero order). */
  | { kind: 'unknown'; reason: string };

/* ------------------------------------------------------------------ */
/*  Projection shape                                                   */
/* ------------------------------------------------------------------ */

export interface ActorHpDelta {
  actorId: string;
  /** Negative = damage taken, positive = healed. Post-shield, post-resistance. */
  hpDelta: number;
  hpBefore: number;
  hpAfter: number;
  /** Absorbed by shields rather than health. */
  shieldAbsorbed: number;
  /** True when this projection kills the actor. */
  defeats: boolean;
}

export interface StatusDelta {
  actorId: string;
  statusId: string;
  change: 'applied' | 'removed';
  stacks: number;
  remainingRounds: number;
}

export interface ShieldDelta {
  actorId: string;
  amount: number;
}

export interface ResourceDelta {
  chamber: 'mana' | 'tech';
  delta: number;
  /** Chamber value after the action — what the player will actually have. */
  after: number;
  max: number;
}

export interface UltimateDelta {
  actorId: string;
  delta: number;
  after: number;
}

export interface ActionProjection {
  /** The action this describes, echoed back for correlation. */
  action: PlayerAction;
  /** Hero whose turn this projection assumes. Null when nobody can act. */
  actingActorId: string | null;
  confidence: DecisionConfidence;
  /**
   * Set when the reducer would REFUSE this action (cost, cooldown, ultimate
   * not charged). Everything else is empty when this is set — a denied action
   * has no consequences.
   */
  deniedReason: string | null;
  hp: readonly ActorHpDelta[];
  statuses: readonly StatusDelta[];
  shields: readonly ShieldDelta[];
  resource: ResourceDelta | null;
  ultimate: readonly UltimateDelta[];
  /** Total damage dealt to the boss. The number objectives care about. */
  damageToBoss: number;
  /** The events the reducer emitted. Kept so relationship rules read primitives. */
  events: readonly BattleEvent[];
}

/* ------------------------------------------------------------------ */
/*  Uncertainty detection                                              */
/* ------------------------------------------------------------------ */

/**
 * A projection is only `exact` when nothing between now and resolution can
 * change it. Two things can:
 *
 *  - RNG target selection (`random_enemy` and friends). The reducer resolves
 *    targets from the seeded stream at commit time, so the projection picked
 *    ONE of several possible targets and cannot promise it.
 *  - An unresolved player target. The player has not chosen yet, so there is
 *    nothing to be exact about.
 *
 * Deliberately NOT flagged: later heroes in the round. Their actions happen
 * after this one resolves, so they cannot retroactively change what this
 * action did — only what the board looks like when the boss swings.
 */
function assessConfidence(
  state: BattleState,
  action: PlayerAction,
  projected: BattleState,
): DecisionConfidence {
  if (action.kind === 'ability') {
    const hero = actingHero(state);
    const ref = hero?.snapshot.abilities.find(
      (a) => a.definitionId === action.abilityDefinitionId,
    );
    const rule = ref?.version.targetRule;
    if (rule?.type === 'random_enemy') {
      return {
        kind: 'unknown',
        reason: 'This ability picks its target at random when it resolves.',
      };
    }
    // The reducer consumed RNG resolving this action, so something rolled.
    if (projected.rngCursor !== state.rngCursor) {
      return {
        kind: 'conditional',
        reasons: ['Resolution rolls for target selection; shown for one outcome.'],
      };
    }
  }
  return { kind: 'exact' };
}

function actingHero(state: BattleState) {
  const id = state.pendingActorIds[0];
  return id
    ? state.heroes.find((h) => h.actorId === id && !h.defeated)
    : state.heroes.find((h) => !h.defeated);
}

/* ------------------------------------------------------------------ */
/*  The projection                                                     */
/* ------------------------------------------------------------------ */

/**
 * Run `action` through the reducer against a throwaway copy of `state` and
 * report exactly what it would do. The passed `state` is never mutated (the
 * reducer is pure) and the returned projected state is discarded.
 */
export function projectAction(
  state: BattleState,
  action: PlayerAction,
): ActionProjection {
  const hero = actingHero(state);
  const empty: ActionProjection = {
    action,
    actingActorId: hero?.actorId ?? null,
    confidence: { kind: 'unknown', reason: 'No hero is able to act.' },
    deniedReason: null,
    hp: [],
    statuses: [],
    shields: [],
    resource: null,
    ultimate: [],
    damageToBoss: 0,
    events: [],
  };
  if (!hero || state.phase !== 'awaiting_player_action') {
    return empty;
  }

  const { state: after, events } = submitPlayerAction(state, action);

  const denied = events.find((e) => e.kind === 'action_denied');
  if (denied) {
    return {
      ...empty,
      confidence: { kind: 'exact' },
      deniedReason: denied.kind === 'action_denied' ? denied.reason : null,
      events,
    };
  }

  return {
    action,
    actingActorId: hero.actorId,
    confidence: assessConfidence(state, action, after),
    deniedReason: null,
    hp: diffHp(state, after, events),
    statuses: diffStatuses(state, after),
    shields: diffShields(state, after),
    resource: diffResource(state, after, hero.snapshot.resourceType),
    ultimate: diffUltimate(state, after),
    damageToBoss: events.reduce(
      (n, e) =>
        e.kind === 'damage_dealt' && e.targetActorId === state.boss.actorId
          ? n + e.amount
          : n,
      0,
    ),
    events,
  };
}

/* ------------------------------------------------------------------ */
/*  Diffs                                                              */
/* ------------------------------------------------------------------ */

function diffHp(
  before: BattleState,
  after: BattleState,
  events: readonly BattleEvent[],
): ActorHpDelta[] {
  const absorbed = new Map<string, number>();
  for (const e of events) {
    if (e.kind === 'damage_dealt' && e.blockedByShield) {
      absorbed.set(e.targetActorId, (absorbed.get(e.targetActorId) ?? 0) + e.blockedByShield);
    }
  }

  const out: ActorHpDelta[] = [];
  const push = (
    actorId: string,
    hpBefore: number,
    hpAfter: number,
    defeatedBefore: boolean,
    defeatedAfter: boolean,
  ) => {
    const shieldAbsorbed = absorbed.get(actorId) ?? 0;
    if (hpBefore === hpAfter && shieldAbsorbed === 0) return;
    out.push({
      actorId,
      hpDelta: hpAfter - hpBefore,
      hpBefore,
      hpAfter,
      shieldAbsorbed,
      defeats: !defeatedBefore && defeatedAfter,
    });
  };

  for (const h of after.heroes) {
    const was = before.heroes.find((x) => x.actorId === h.actorId);
    if (was) push(h.actorId, was.hp, h.hp, was.defeated, h.defeated);
  }
  push(
    after.boss.actorId,
    before.boss.hp,
    after.boss.hp,
    before.boss.defeated,
    after.boss.defeated,
  );
  return out;
}

/** Key a status instance by what the player perceives, not by instance id —
 *  a re-application that replaces an instance is not "removed then applied". */
function statusKey(s: StatusInstance): string {
  return `${s.statusId}:${s.instanceId}`;
}

function diffStatuses(before: BattleState, after: BattleState): StatusDelta[] {
  const out: StatusDelta[] = [];
  const compare = (actorId: string, was: readonly StatusInstance[], now: readonly StatusInstance[]) => {
    const wasKeys = new Set(was.map(statusKey));
    const nowKeys = new Set(now.map(statusKey));
    for (const s of now) {
      if (!wasKeys.has(statusKey(s))) {
        out.push({
          actorId,
          statusId: s.statusId,
          change: 'applied',
          stacks: s.stacks,
          remainingRounds: s.remainingRounds,
        });
      }
    }
    for (const s of was) {
      if (!nowKeys.has(statusKey(s))) {
        out.push({
          actorId,
          statusId: s.statusId,
          change: 'removed',
          stacks: s.stacks,
          remainingRounds: s.remainingRounds,
        });
      }
    }
  };

  for (const h of after.heroes) {
    const was = before.heroes.find((x) => x.actorId === h.actorId);
    if (was) compare(h.actorId, was.statuses, h.statuses);
  }
  compare(after.boss.actorId, before.boss.statuses, after.boss.statuses);
  return out;
}

function totalShield(pools: readonly { amount: number }[]): number {
  return pools.reduce((n, p) => n + p.amount, 0);
}

function diffShields(before: BattleState, after: BattleState): ShieldDelta[] {
  const out: ShieldDelta[] = [];
  for (const h of after.heroes) {
    const was = before.heroes.find((x) => x.actorId === h.actorId);
    if (!was) continue;
    const delta = totalShield(h.shields) - totalShield(was.shields);
    if (delta !== 0) out.push({ actorId: h.actorId, amount: delta });
  }
  const bossDelta = totalShield(after.boss.shields) - totalShield(before.boss.shields);
  if (bossDelta !== 0) out.push({ actorId: after.boss.actorId, amount: bossDelta });
  return out;
}

function diffResource(
  before: BattleState,
  after: BattleState,
  chamber: 'mana' | 'tech',
): ResourceDelta | null {
  const delta = after.partyResource[chamber] - before.partyResource[chamber];
  if (delta === 0) return null;
  return {
    chamber,
    delta,
    after: after.partyResource[chamber],
    max: after.partyResourceMax[chamber],
  };
}

function diffUltimate(before: BattleState, after: BattleState): UltimateDelta[] {
  const out: UltimateDelta[] = [];
  for (const h of after.heroes) {
    const was = before.heroes.find((x) => x.actorId === h.actorId);
    if (!was) continue;
    const delta = h.ultimateCharge - was.ultimateCharge;
    if (delta !== 0) {
      out.push({ actorId: h.actorId, delta, after: h.ultimateCharge });
    }
  }
  return out;
}

/**
 * The boss's current objective, translated.
 *
 * Two mechanics look alike on screen and are NOT the same thing, so this
 * module keeps them structurally separate and refuses to let a caller render
 * them as one bar:
 *
 *   - a single-round INTERRUPT: deal 15% of the boss's max HP inside one round
 *     and the declared action is cancelled outright. Binary — 99% of the way
 *     there does nothing.
 *   - a multi-round CHARGE BREAK: satisfy an authored condition (damage,
 *     status, coordinated party action, dispel) across the charge window.
 *     Partial progress linearly weakens the hit, so partway there is worth
 *     something.
 *
 * Conflating them is the specific failure this exists to prevent: a player who
 * thinks partial progress will soften an interrupt will spend a round proving
 * it does not.
 *
 * Every number here is DERIVED from the frozen `BossSnapshot`. There are no
 * encounter constants in this file — `387` for The Whole Ledger is
 * `ceil(1380 × 0.28)` computed at runtime, so a boss rebalance moves the
 * readout without anyone remembering to.
 */

import type {
  BattleState,
  BossActionSnapshot,
  BossChargeBreak,
  PendingCharge,
} from '../../../types/combat';
import {
  INTERRUPT_DAMAGE_THRESHOLD,
  damageToBossSinceIntent,
  evaluateChargeProgress,
} from '../reducer';

/* ------------------------------------------------------------------ */
/*  Shape                                                              */
/* ------------------------------------------------------------------ */

/** A hero who has contributed to a `party_action` break, for naming them. */
export interface ContributorVM {
  actorId: string;
  displayName: string;
}

export interface InterruptObjectiveVM {
  kind: 'interrupt';
  /** Integer damage that cancels the action outright, this round. */
  required: number;
  dealt: number;
  remaining: number;
  /** 0..1, for a bar. Reaching 1 cancels; below 1 does NOTHING. */
  progress: number;
  met: boolean;
  /** Always false for interrupts. Present so callers cannot forget the difference. */
  partialCredit: false;
}

export interface ChargeObjectiveVM {
  kind: 'charge';
  break: BossChargeBreak;
  roundsRemaining: number;
  /** 0..1 as the reducer will evaluate it at resolution. */
  progress: number;
  broken: boolean;
  /** Fraction of the incoming hit currently removed by partial progress. */
  mitigation: number;
  /** Ceiling on that fraction, from the authored spec. */
  mitigationMax: number;
  /** Damage breaks only: exact integers, derived from frozen max HP. */
  damage?: { required: number; dealt: number; remaining: number };
  /** party_action breaks only: who has already counted. */
  contributors?: readonly ContributorVM[];
  contributorsRequired?: number;
  partialCredit: true;
}

export type ObjectiveVM = InterruptObjectiveVM | ChargeObjectiveVM;

export interface ThreatVM {
  actionId: string;
  displayName: string;
  /** Authored flavour. Never the tactical line — the two stay separate. */
  tell: string;
  timing:
    | { kind: 'this_round' }
    | { kind: 'charged'; roundsRemaining: number };
  targetActorIds: readonly string[];
  /** Whole party in scope, so single-target protection is only partial cover. */
  hitsWholeParty: boolean;
  /**
   * Objectives currently open against this threat. An action can carry BOTH
   * (interruptible AND charged) — the reducer collapses that to whichever is
   * weaker, and the readout must show both rather than pick one.
   */
  objectives: readonly ObjectiveVM[];
  /** Statuses the hit will apply if it lands. */
  statuses: readonly { statusId: string; duration: number; stacks: number }[];
  executeThresholdPercent?: number;
}

/* ------------------------------------------------------------------ */
/*  Derivation                                                         */
/* ------------------------------------------------------------------ */

function findAction(state: BattleState, actionId: string): BossActionSnapshot | null {
  for (const phase of state.boss.snapshot.phases) {
    const hit = phase.actions.find((a) => a.id === actionId);
    if (hit) return hit;
  }
  return null;
}

function heroName(state: BattleState, actorId: string): string {
  return (
    state.heroes.find((h) => h.actorId === actorId)?.snapshot.displayName ?? actorId
  );
}

/** Heroes counted so far toward a `party_action` break, in the order they
 *  contributed. Mirrors the reducer's evaluator exactly — distinct actorIds
 *  with a matching bare PlayerAction since the charge began. */
function chargeContributors(
  state: BattleState,
  charge: PendingCharge,
  wanted: 'guard' | 'focus',
): ContributorVM[] {
  const seen = new Set<string>();
  const out: ContributorVM[] = [];
  let round = 0;
  for (const e of state.log) {
    if (e.kind === 'round_started') round = e.round;
    if (round < charge.startedRound) continue;
    if (e.kind === 'player_action_selected' && e.action.kind === wanted) {
      if (!seen.has(e.actorId)) {
        seen.add(e.actorId);
        out.push({ actorId: e.actorId, displayName: heroName(state, e.actorId) });
      }
    }
  }
  return out;
}

export function deriveInterruptObjective(
  state: BattleState,
  action: BossActionSnapshot,
): InterruptObjectiveVM | null {
  if (!action.interruptible) return null;
  const required = Math.floor(
    state.boss.snapshot.maxHp * INTERRUPT_DAMAGE_THRESHOLD,
  );
  const dealt = damageToBossSinceIntent(state);
  return {
    kind: 'interrupt',
    required,
    dealt,
    remaining: Math.max(0, required - dealt),
    progress: required > 0 ? Math.min(1, dealt / required) : 0,
    met: dealt >= required,
    partialCredit: false,
  };
}

export function deriveChargeObjective(
  state: BattleState,
  charge: PendingCharge,
  action: BossActionSnapshot,
): ChargeObjectiveVM | null {
  const spec = action.charge;
  if (!spec) return null;

  // One evaluator, shared with resolution. `charge.progress` is a dead field
  // that would report 0% on a nearly-broken charge.
  const progress = evaluateChargeProgress(state, charge, spec);

  const vm: ChargeObjectiveVM = {
    kind: 'charge',
    break: spec.break,
    roundsRemaining: charge.roundsRemaining,
    progress,
    broken: progress >= 1,
    mitigation: progress * spec.partialMitigationMax,
    mitigationMax: spec.partialMitigationMax,
    partialCredit: true,
  };

  if (spec.break.kind === 'damage') {
    // The reducer compares against a float; the player can only deal integers,
    // so the honest requirement is the ceiling of it. This is where 387 comes
    // from — never a literal.
    const needed = Math.max(1, state.boss.snapshot.maxHp * spec.break.percentOfMaxHp);
    const required = Math.ceil(needed);
    const dealt = Math.round(progress * needed);
    vm.damage = { required, dealt, remaining: Math.max(0, required - dealt) };
  }

  if (spec.break.kind === 'party_action') {
    vm.contributors = chargeContributors(state, charge, spec.break.action);
    vm.contributorsRequired = spec.break.heroCount;
  }

  return vm;
}

/**
 * The single active threat, or null when the boss has not declared yet.
 *
 * A charge in flight outranks the round's declared intent: while The Whole
 * Ledger is counting down, the thing the player is actually solving is the
 * Ledger, not whatever filler the boss swings this round.
 */
export function deriveThreat(state: BattleState): ThreatVM | null {
  const charge = state.boss.pendingCharge;
  const intent = state.boss.currentIntent;

  const actionId = charge?.actionId ?? intent?.actionId;
  if (!actionId) return null;

  const action = findAction(state, actionId);
  if (!action) return null;

  const objectives: ObjectiveVM[] = [];
  if (charge && charge.actionId === actionId) {
    const c = deriveChargeObjective(state, charge, action);
    if (c) objectives.push(c);
  }
  // Only meaningful against the intent the boss declared THIS round — the
  // interrupt window is the round, not the charge.
  if (intent?.actionId === actionId) {
    const i = deriveInterruptObjective(state, action);
    if (i) objectives.push(i);
  }

  const targetActorIds =
    charge?.actionId === actionId
      ? charge.targetActorIds
      : (intent?.targetActorIds ?? []);

  return {
    actionId,
    displayName: action.displayName,
    tell: action.telegraphText,
    timing:
      charge && charge.actionId === actionId
        ? { kind: 'charged', roundsRemaining: charge.roundsRemaining }
        : { kind: 'this_round' },
    targetActorIds,
    hitsWholeParty: action.targetScope === 'all_heroes',
    objectives,
    statuses: (action.statusApplications ?? []).map((s) => ({
      statusId: s.statusId,
      duration: s.duration,
      stacks: s.stacks ?? 1,
    })),
    executeThresholdPercent: action.executeThresholdPercent,
  };
}

/**
 * When to ask "are you sure?" — one policy, both surfaces.
 *
 * Confirmation should add a DECISION, not ceremony. A second click that always
 * says yes teaches the player to click through, which is exactly how the one
 * confirm that mattered gets clicked through too.
 *
 * Desktop and mobile must share this. They already share `AbilityPreviewCard`
 * for the same reason — two confirm rules drift, and the one that drifts is
 * always the one nobody is looking at.
 *
 * Note what is NOT in scope: Strike, Guard and Focus already commit on click
 * and stay that way. They are free, reversible in effect, and the round is the
 * unit of risk.
 */

import type { AbilityCombatSnapshot, BattleState } from '../../../types/combat';
import type { ActionProjection } from './projectAction';

export type ConfirmationReason =
  /** Spends a charge that took the whole fight to build. */
  | 'ultimate'
  /** Costs the caster health or a status they will feel. */
  | 'self_cost'
  /** Takes most of what the party has left in the chamber. */
  | 'expensive'
  /** The player has not picked a target yet. */
  | 'unresolved_target'
  /** Would drop a hero to zero. */
  | 'lethal_to_ally';

export interface ConfirmationDecision {
  required: boolean;
  reasons: readonly ConfirmationReason[];
  /** One short line explaining what the confirm is protecting. Null when none. */
  prompt: string | null;
}

/**
 * Spending most of a shared chamber is a party-level decision, so it earns a
 * confirm where spending a little does not. 0.6 is a judgement call, not a
 * balance number — it changes no combat outcome, only how loudly the UI asks.
 */
const EXPENSIVE_SHARE_OF_REMAINING = 0.6;

export function requiresConfirmation(
  state: BattleState,
  ability: AbilityCombatSnapshot,
  projection: ActionProjection,
  opts: { targetResolved: boolean },
): ConfirmationDecision {
  const reasons: ConfirmationReason[] = [];

  if (!opts.targetResolved) reasons.push('unresolved_target');
  if (ability.slot === 'ultimate') reasons.push('ultimate');

  const chamber = ability.resourceType === 'tech' ? 'tech' : 'mana';
  const available = state.partyResource[chamber];
  if (
    ability.resourceCost > 0 &&
    available > 0 &&
    ability.resourceCost / available >= EXPENSIVE_SHARE_OF_REMAINING
  ) {
    reasons.push('expensive');
  }

  // Self-cost and friendly-fire are read from the PROJECTION, not from the
  // effect list — an ability that costs health via a status the player cannot
  // see in its description still gets caught.
  const caster = projection.actingActorId;
  for (const h of projection.hp) {
    if (h.actorId === state.boss.actorId) continue;
    if (h.hpDelta >= 0) continue;
    if (h.defeats) {
      reasons.push('lethal_to_ally');
    } else if (h.actorId === caster) {
      reasons.push('self_cost');
    }
  }

  const unique = [...new Set(reasons)];
  return {
    required: unique.length > 0,
    reasons: unique,
    prompt: unique.length > 0 ? promptFor(unique) : null,
  };
}

function promptFor(reasons: readonly ConfirmationReason[]): string {
  if (reasons.includes('lethal_to_ally')) return 'This will defeat one of your heroes.';
  if (reasons.includes('unresolved_target')) return 'Choose a target.';
  if (reasons.includes('ultimate')) return 'Spends a full Ultimate charge.';
  if (reasons.includes('self_cost')) return 'Costs the caster health.';
  return 'Spends most of the chamber.';
}

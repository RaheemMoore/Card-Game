import type { BattleEvent, BattleState } from '../../../types/combat';

export type ReceiptTone = 'damage' | 'benefit' | 'warning' | 'status';

export interface ResolutionReceipt {
  text: string;
  tone: ReceiptTone;
}

/**
 * A short confirmation compiled from an event that actually resolved.
 * Projections never enter this function: if the reducer did not emit the
 * fact, the battlefield does not claim it happened.
 */
export function receiptForEvent(
  event: BattleEvent,
  state: BattleState,
  priorEvents: readonly BattleEvent[] = [],
): ResolutionReceipt | null {
  switch (event.kind) {
    case 'damage_dealt':
      return {
        text: event.blockedByShield > 0
          ? `${event.amount} DAMAGE · ${event.blockedByShield} BLOCKED`
          : `${event.amount} DAMAGE`,
        tone: 'damage',
      };
    case 'healing_applied':
      return { text: `+${event.amount} HP`, tone: 'benefit' };
    case 'shield_gained':
      return { text: `+${event.amount} SHIELD`, tone: 'benefit' };
    case 'status_applied':
      return { text: `${label(event.statusId)} APPLIED`, tone: 'status' };
    case 'status_removed': {
      const applied = [...priorEvents].reverse().find(
        (candidate): candidate is Extract<BattleEvent, { kind: 'status_applied' }> =>
          candidate.kind === 'status_applied' && candidate.instanceId === event.instanceId,
      );
      return {
        text: `${applied ? label(applied.statusId) : 'STATUS'} ${event.reason === 'cleansed' ? 'CLEANSED' : 'REMOVED'}`,
        tone: 'benefit',
      };
    }
    case 'ultimate_charge_changed': {
      const hero = state.heroes.find((candidate) => candidate.actorId === event.actorId);
      return hero && hero.ultimateCharge >= 100
        ? { text: 'ULTIMATE READY', tone: 'benefit' }
        : { text: `ULTIMATE ${signed(event.delta)}`, tone: 'benefit' };
    }
    case 'resource_changed':
      if (event.source === 'ability_cost' || event.delta === 0) return null;
      return { text: `ENERGY ${signed(event.delta)}`, tone: 'benefit' };
    case 'action_denied':
      return { text: `ACTION BLOCKED · ${label(event.reason)}`, tone: 'warning' };
    case 'actor_defeated':
      return { text: 'DEFEATED', tone: 'damage' };
    default:
      return null;
  }
}

export function receiptsForEvents(
  events: readonly BattleEvent[],
  state: BattleState,
): ResolutionReceipt[] {
  const receipts: ResolutionReceipt[] = [];
  events.forEach((event, index) => {
    const receipt = receiptForEvent(event, state, events.slice(0, index));
    if (receipt && !receipts.some((existing) => existing.text === receipt.text)) receipts.push(receipt);
  });
  return receipts;
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function label(value: string): string {
  return value.replace(/_/g, ' ').toUpperCase();
}

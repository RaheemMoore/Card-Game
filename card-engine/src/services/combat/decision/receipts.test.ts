import { describe, expect, it } from 'vitest';
import type { BattleEvent, BattleState } from '../../../types/combat';
import { receiptForEvent, receiptsForEvents } from './receipts';

describe('resolution receipts', () => {
  const state = {
    boss: { actorId: 'boss' },
    heroes: [{ actorId: 'hero', ultimateCharge: 100 }],
  } as BattleState;

  it('uses resolved numbers and shield absorption from the event', () => {
    const event: BattleEvent = {
      kind: 'damage_dealt',
      sourceActorId: 'hero',
      targetActorId: 'boss',
      amount: 18,
      damageType: 'kinetic',
      blockedByShield: 7,
    };
    expect(receiptForEvent(event, state)?.text).toBe('18 DAMAGE · 7 BLOCKED');
  });

  it('names a cleansed status by its authoritative instance', () => {
    const events: BattleEvent[] = [
      {
        kind: 'status_applied',
        sourceActorId: 'boss',
        targetActorId: 'hero',
        statusId: 'bleed',
        instanceId: 'bleed_1',
        duration: 2,
      },
      { kind: 'status_removed', targetActorId: 'hero', instanceId: 'bleed_1', reason: 'cleansed' },
    ];
    expect(receiptsForEvents(events, state).map((receipt) => receipt.text)).toContain('BLEED CLEANSED');
  });

  it('announces readiness only from the authoritative live charge', () => {
    const event: BattleEvent = {
      kind: 'ultimate_charge_changed',
      actorId: 'hero',
      delta: 5,
      source: 'guard',
    };
    expect(receiptForEvent(event, state)?.text).toBe('ULTIMATE READY');
  });
});

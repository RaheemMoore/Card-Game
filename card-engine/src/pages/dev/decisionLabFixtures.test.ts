import { describe, expect, it } from 'vitest';
import { buildPilotFixture } from './decisionLabFixtures';

/**
 * Guards the Decision Lab's frozen fixtures against boss-data drift. Each
 * fixture is a fixed seed driven with the balance suite's scripted filler
 * policy to a specific boss state — if a future rebalance changes cooldowns,
 * weights, or phase thresholds enough that the named action never appears,
 * this fails loudly instead of the Lab silently throwing for whoever opens it.
 */
describe('decision lab fixtures build without throwing', () => {
  it('interest_accrues', () => {
    const s = buildPilotFixture('interest_accrues');
    expect(s.boss.currentIntent?.actionId).toBe('act_debt_interest');
  });
  it('first_notice', () => {
    const s = buildPilotFixture('first_notice');
    expect(s.boss.pendingCharge?.actionId).toBe('act_debt_first_notice');
  });
  it('whole_ledger', () => {
    const s = buildPilotFixture('whole_ledger');
    expect(s.boss.pendingCharge?.actionId).toBe('act_debt_ledger');
  });
});

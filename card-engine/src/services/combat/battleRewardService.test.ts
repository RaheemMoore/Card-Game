import { describe, it, expect, beforeEach } from 'vitest';
import { grantBattleReward } from './battleRewardService';
import * as wallet from '../economy/walletService';
import * as ledger from '../economy/transactionLedger';

beforeEach(() => {
  ledger.resetForDev();
  wallet.initialize();
});

describe('grantBattleReward — first-clear vs repeat', () => {
  it('first attempt grants first_clear tier', () => {
    const result = grantBattleReward({
      battleId: 'battle_1',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 9,
    });
    expect(result.kind).toBe('granted');
    if (result.kind !== 'granted') return;
    expect(result.tier).toBe('first_clear');
    // 500 gold + 100 crystals per catalog.
    const gold = result.items.find((i) => i.currency === 'gameplay');
    const crystals = result.items.find((i) => i.currency === 'premium');
    expect(gold?.amount).toBe(500);
    expect(crystals?.amount).toBe(100);
  });

  it('second distinct battle grants repeat tier', () => {
    grantBattleReward({
      battleId: 'battle_1',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 9,
    });
    const second = grantBattleReward({
      battleId: 'battle_2',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 12,
    });
    expect(second.kind).toBe('granted');
    if (second.kind !== 'granted') return;
    expect(second.tier).toBe('repeat');
    // 100 gold + 15 crystals per catalog.
    expect(second.items.find((i) => i.currency === 'gameplay')?.amount).toBe(100);
    expect(second.items.find((i) => i.currency === 'premium')?.amount).toBe(15);
  });
});

describe('grantBattleReward — idempotency', () => {
  it('calling twice with same battleId returns already_granted without new transactions', () => {
    const first = grantBattleReward({
      battleId: 'battle_idem',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 5,
    });
    const balanceBefore = wallet.getBalance('gameplay');

    const second = grantBattleReward({
      battleId: 'battle_idem',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'victory',
      roundsElapsed: 5,
    });
    expect(second.kind).toBe('already_granted');
    if (second.kind === 'already_granted' && first.kind === 'granted') {
      expect(second.tier).toBe(first.tier);
      expect(second.items.length).toBe(first.items.length);
    }
    expect(wallet.getBalance('gameplay')).toBe(balanceBefore);
  });
});

describe('grantBattleReward — non-victory outcomes', () => {
  it('defeat grants no reward', () => {
    const result = grantBattleReward({
      battleId: 'battle_lose',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'defeat',
      roundsElapsed: 30,
    });
    expect(result.kind).toBe('no_reward');
    if (result.kind === 'no_reward') expect(result.reason).toBe('defeat');
  });

  it('abandoned grants no reward', () => {
    const result = grantBattleReward({
      battleId: 'battle_bail',
      bossId: 'boss_fire_elemental_v0',
      outcome: 'abandoned',
      roundsElapsed: 2,
    });
    expect(result.kind).toBe('no_reward');
    if (result.kind === 'no_reward') expect(result.reason).toBe('abandoned');
  });

  it('unknown boss id returns no_reward with reason', () => {
    const result = grantBattleReward({
      battleId: 'battle_x',
      bossId: 'boss_does_not_exist',
      outcome: 'victory',
      roundsElapsed: 1,
    });
    expect(result.kind).toBe('no_reward');
    if (result.kind === 'no_reward') expect(result.reason).toBe('unknown_boss');
  });
});

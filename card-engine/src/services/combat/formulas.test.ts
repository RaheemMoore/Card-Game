import { describe, it, expect } from 'vitest';
import {
  deriveHeroStats,
  resolveDamage,
  resolveHeal,
  ultimateChargeGain,
  clampUltimateCharge,
  tickCooldowns,
  guardShieldAmount,
  FIRE_ELEMENTAL_RESISTANCE,
  NEUTRAL_RESISTANCE,
  primaryResourceType,
} from './formulas';
import type { CardStats } from '../../types/card';

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

describe('deriveHeroStats', () => {
  it('applies Def*3 to hp and rank bonus', () => {
    const s = deriveHeroStats(statsFor(50, 40, 60), 'Foundation');
    expect(s.maxHp).toBe(100 + 40 * 3); // 220
    const forged = deriveHeroStats(statsFor(50, 40, 60), 'Forged');
    expect(forged.maxHp).toBe(100 + 40 * 3 + 50); // 270
    const ascendant = deriveHeroStats(statsFor(50, 40, 60), 'Ascendant');
    expect(ascendant.maxHp).toBe(100 + 40 * 3 + 120); // 340
  });

  it('derives maxResource from primary stat / 20 + rank bonus', () => {
    const s = deriveHeroStats(statsFor(50, 40, 60), 'Foundation');
    expect(s.maxResource).toBe(3 + Math.floor(60 / 20)); // 6
    const forged = deriveHeroStats(statsFor(50, 40, 60), 'Forged');
    expect(forged.maxResource).toBe(3 + 3 + 1); // 7
  });

  it('uses Tech when Mana absent', () => {
    const s = deriveHeroStats(
      {
        Atk: { value: 50, bias: 'Mid', hardCap: 100 },
        Def: { value: 40, bias: 'Mid', hardCap: 100 },
        Tech: { value: 80, bias: 'Mid', hardCap: 100 },
      },
      'Foundation',
    );
    expect(s.maxResource).toBe(3 + 4); // 7
  });

  it('throws if card has neither Mana nor Tech', () => {
    expect(() =>
      deriveHeroStats(
        {
          Atk: { value: 50, bias: 'Mid', hardCap: 100 },
          Def: { value: 40, bias: 'Mid', hardCap: 100 },
        },
        'Foundation',
      ),
    ).toThrow();
  });

  it('defenseMitigation = floor(Def/5)', () => {
    expect(deriveHeroStats(statsFor(50, 47, 60), 'Foundation').defenseMitigation).toBe(9);
  });
});

describe('resolveDamage', () => {
  it('applies scaling coefficient to attacker stat', () => {
    const r = resolveDamage({
      baseAmount: 10,
      damageType: 'physical',
      scaling: { stat: 'atk', coefficient: 0.5 },
      attackerStats: statsFor(60, 40, 50),
      targetMitigation: 5,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [],
    });
    // raw = 10 + 30 = 40, postResistance = 40, postDefense = max(1, 40-5) = 35
    expect(r.rawAmount).toBe(40);
    expect(r.scalingApplied).toBe(30);
    expect(r.postDefenseAmount).toBe(35);
    expect(r.shieldAbsorbed).toBe(0);
    expect(r.postShieldAmount).toBe(35);
  });

  it('halves damage against resistant targets', () => {
    const r = resolveDamage({
      baseAmount: 40,
      damageType: 'fire',
      targetMitigation: 0,
      targetResistance: FIRE_ELEMENTAL_RESISTANCE,
      targetShields: [],
    });
    // raw 40, postResistance 20, postDefense 20
    expect(r.postDefenseAmount).toBe(20);
  });

  it('multiplies damage by 1.5 against weak targets', () => {
    const r = resolveDamage({
      baseAmount: 40,
      damageType: 'holy',
      targetMitigation: 0,
      targetResistance: FIRE_ELEMENTAL_RESISTANCE,
      targetShields: [],
    });
    expect(r.postDefenseAmount).toBe(60);
  });

  it('applies MIN_DAMAGE_FLOOR of 1', () => {
    const r = resolveDamage({
      baseAmount: 3,
      damageType: 'physical',
      targetMitigation: 100,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [],
    });
    expect(r.postDefenseAmount).toBe(1);
  });

  it('true damage bypasses resistance + mitigation', () => {
    const r = resolveDamage({
      baseAmount: 40,
      damageType: 'true',
      targetMitigation: 100,
      targetResistance: FIRE_ELEMENTAL_RESISTANCE,
      targetShields: [],
    });
    expect(r.postDefenseAmount).toBe(40);
  });

  it('shields absorb before HP', () => {
    const r = resolveDamage({
      baseAmount: 30,
      damageType: 'physical',
      targetMitigation: 0,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [
        { amount: 20, types: [], remainingRounds: Infinity, sourceActorId: 'x' },
      ],
    });
    expect(r.shieldAbsorbed).toBe(20);
    expect(r.postShieldAmount).toBe(10);
  });

  it('typed shields only absorb matching damage types', () => {
    const r = resolveDamage({
      baseAmount: 30,
      damageType: 'physical',
      targetMitigation: 0,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [
        { amount: 20, types: ['fire'], remainingRounds: Infinity, sourceActorId: 'x' },
      ],
    });
    expect(r.shieldAbsorbed).toBe(0);
    expect(r.postShieldAmount).toBe(30);
  });

  it('execute at or below threshold deals current hp; above deals nothing', () => {
    const belowThreshold = resolveDamage({
      baseAmount: 0,
      damageType: 'physical',
      targetMitigation: 0,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [],
      isExecute: true,
      executeThreshold: 0.25,
      targetHp: 20,
      targetMaxHp: 100,
    });
    expect(belowThreshold.postShieldAmount).toBe(20);
    expect(belowThreshold.isExecute).toBe(true);

    const aboveThreshold = resolveDamage({
      baseAmount: 0,
      damageType: 'physical',
      targetMitigation: 0,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [],
      isExecute: true,
      executeThreshold: 0.25,
      targetHp: 30,
      targetMaxHp: 100,
    });
    expect(aboveThreshold.postShieldAmount).toBe(0);
  });
});

describe('resolveHeal', () => {
  it('clamps to remaining capacity', () => {
    expect(resolveHeal(50, 80, 100)).toEqual({ requestedAmount: 50, actualAmount: 20, overheal: 30 });
  });
  it('negative healing becomes 0', () => {
    expect(resolveHeal(-10, 50, 100)).toEqual({ requestedAmount: 0, actualAmount: 0, overheal: 0 });
  });
  it('exact match yields no overheal', () => {
    expect(resolveHeal(20, 80, 100)).toEqual({ requestedAmount: 20, actualAmount: 20, overheal: 0 });
  });
});

describe('ultimateChargeGain', () => {
  it('sums per-event contributions per §8', () => {
    expect(ultimateChargeGain({ damageDealt: 100 })).toBe(5); // 100/20
    expect(ultimateChargeGain({ damageReceived: 30 })).toBe(3); // 30/10
    expect(ultimateChargeGain({ guardUsed: true })).toBe(5);
    expect(ultimateChargeGain({ focusUsed: true })).toBe(3);
    expect(ultimateChargeGain({ statusAppliedToBoss: true })).toBe(5);
    expect(ultimateChargeGain({ bossPhaseTransition: true })).toBe(10);
    expect(
      ultimateChargeGain({ damageDealt: 40, damageReceived: 20, guardUsed: true }),
    ).toBe(2 + 2 + 5);
  });

  it('clamps to [0, 100]', () => {
    expect(clampUltimateCharge(-5)).toBe(0);
    expect(clampUltimateCharge(150)).toBe(100);
    expect(clampUltimateCharge(50)).toBe(50);
  });
});

describe('tickCooldowns', () => {
  it('decrements by 1 and removes those hitting 0', () => {
    const next = tickCooldowns([
      { abilityDefinitionId: 'a', remainingRounds: 2 },
      { abilityDefinitionId: 'b', remainingRounds: 1 },
      { abilityDefinitionId: 'c', remainingRounds: 3 },
    ]);
    expect(next).toEqual([
      { abilityDefinitionId: 'a', remainingRounds: 1 },
      { abilityDefinitionId: 'c', remainingRounds: 2 },
    ]);
  });
  it('empty stays empty', () => {
    expect(tickCooldowns([])).toEqual([]);
  });
});

describe('guardShieldAmount', () => {
  it('applies floor(Def/2) + 5', () => {
    expect(guardShieldAmount(40)).toBe(25);
    expect(guardShieldAmount(0)).toBe(5);
  });
});

describe('primaryResourceType', () => {
  it('prefers Mana over Tech when both present (Mana wins by convention)', () => {
    expect(primaryResourceType(statsFor(50, 40, 60))).toBe('mana');
  });
  it('returns tech when Mana absent', () => {
    expect(
      primaryResourceType({
        Atk: { value: 50, bias: 'Mid', hardCap: 100 },
        Def: { value: 40, bias: 'Mid', hardCap: 100 },
        Tech: { value: 60, bias: 'Mid', hardCap: 100 },
      }),
    ).toBe('tech');
  });
  it('throws if neither present', () => {
    expect(() =>
      primaryResourceType({
        Atk: { value: 50, bias: 'Mid', hardCap: 100 },
        Def: { value: 40, bias: 'Mid', hardCap: 100 },
      }),
    ).toThrow();
  });
});

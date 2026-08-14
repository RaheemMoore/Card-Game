import { describe, it, expect } from 'vitest';
import { damage, reactionBurst, resolveClash } from './resolve';
import type { Unit, Side } from './types';

function mkUnit(over: Partial<Unit> = {}): Unit {
  return {
    id: 'u',
    side: 'player' as Side,
    name: 'U',
    element: 'fire',
    atk: 50,
    defMax: 50,
    def: 50,
    ability: 30,
    flier: false,
    move: 2,
    cost: 2,
    pos: { r: 0, c: 0 },
    state: 'none',
    statePower: 0,
    hasMoved: false,
    hasAttacked: false,
    fallen: false,
    ...over,
  };
}

describe('damage formula', () => {
  it('never one-shots — damage is always strictly less than the target pool', () => {
    for (const atk of [10, 40, 60, 85, 100]) {
      for (const def of [10, 40, 55, 85, 100]) {
        expect(damage(atk, def)).toBeLessThan(def);
      }
    }
  });

  it('an even matchup lands ~2 clashes to fell', () => {
    // dmg(40,40) = 20 -> 40/20 = 2 clashes
    expect(damage(40, 40)).toBe(20);
  });

  it('a tank absorbs more clashes than a squishy', () => {
    const vsTank = damage(60, 85); // ~35
    const vsSquishy = damage(60, 20); // ~15
    expect(85 / vsTank).toBeGreaterThan(20 / vsSquishy);
  });
});

describe('reactionBurst', () => {
  it('is capped so a reaction alone cannot one-shot', () => {
    expect(reactionBurst(1000, 40)).toBe(20); // min(400, 20) = 20
    expect(reactionBurst(70, 85)).toBe(28); // min(28, 42.5) = 28
  });
});

describe('resolveClash — simultaneous trade', () => {
  it('damages both units at once, and neither is one-shot from full health', () => {
    const a = mkUnit({ id: 'a', atk: 60, defMax: 50, def: 50 });
    const b = mkUnit({ id: 'b', atk: 60, defMax: 50, def: 50, side: 'enemy' });
    const out = resolveClash(a, b);
    expect(out.targetDef).toBeLessThan(50);
    expect(out.attackerDef).toBeLessThan(50);
    expect(out.targetDef).toBeGreaterThan(0);
    expect(out.attackerDef).toBeGreaterThan(0);
  });

  it('already-wounded units can both fall in the same trade (attacking has stakes)', () => {
    const a = mkUnit({ id: 'a', atk: 60, defMax: 50, def: 5 });
    const b = mkUnit({ id: 'b', atk: 60, defMax: 50, def: 5, side: 'enemy' });
    const out = resolveClash(a, b);
    expect(out.targetDef).toBeLessThanOrEqual(0);
    expect(out.attackerDef).toBeLessThanOrEqual(0);
  });
});

describe('resolveClash — Freeze then Melt', () => {
  it('a fire unit striking a frozen target adds a Melt burst and takes no counter', () => {
    const fire = mkUnit({ id: 'v', element: 'fire', atk: 60, defMax: 55, def: 55 });
    const frozen = mkUnit({
      id: 'w',
      side: 'enemy',
      element: 'earth',
      atk: 35,
      defMax: 85,
      def: 85,
      state: 'frozen',
      statePower: 70, // the ice caster's ability
    });
    const out = resolveClash(fire, frozen);
    const base = damage(60, 85); // 35
    const melt = reactionBurst(70, 85); // 28
    expect(out.melt).toBe(melt);
    expect(out.targetDef).toBe(85 - base - melt);
    expect(out.attackerDef).toBe(55); // frozen -> no counter
    expect(out.targetState).toBe('none'); // frozen consumed
  });

  it('a non-fire strike on a frozen target does NOT melt but still no counter', () => {
    const storm = mkUnit({ id: 's', element: 'storm', atk: 48, defMax: 46, def: 46 });
    const frozen = mkUnit({ id: 'w', side: 'enemy', state: 'frozen', statePower: 70 });
    const out = resolveClash(storm, frozen);
    expect(out.melt).toBe(0);
    expect(out.attackerDef).toBe(46); // still helpless target
    expect(out.targetState).toBe('frozen');
  });
});

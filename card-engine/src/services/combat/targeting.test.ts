import { describe, it, expect } from 'vitest';
import { resolveTargetRule, targetRuleNeedsPlayerPick } from './targeting';
import { initializeBattle } from './reducer';
import { buildBattleSnapshot, buildHeroSnapshot, buildFireElementalBossSnapshot } from './harness';
import type { CardStats } from '../../types/card';
import type { BattleState } from '../../types/combat';

function testStats(atk = 55, def = 45, mana = 60): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function threeHeroState(seed = 1): BattleState {
  const heroes = ['Aria', 'Bram', 'Cael'].map((name, i) =>
    buildHeroSnapshot({
      cardId: `card_${i}`,
      archetype: 'Barbarian',
      displayName: name,
      stats: testStats(),
      rank: 'Forged',
      // These suites assert combat MATH, not element interaction.
      elementDamageType: 'kinetic',
      abilities: [],
    }),
  );
  const snap = buildBattleSnapshot({
    seed,
    heroes,
    boss: buildFireElementalBossSnapshot(1000),
  });
  return initializeBattle(snap);
}

describe('resolveTargetRule', () => {
  it('self resolves to the caster', () => {
    const state = threeHeroState();
    const caster = state.heroes[0].actorId;
    expect(resolveTargetRule(state, caster, { type: 'self' }).targetActorIds).toEqual([caster]);
  });

  it.each(['boss_object', 'single_enemy', 'current_attacker', 'all_enemies', 'highest_attack_enemy'] as const)(
    '%s resolves to the boss (single-boss reality)',
    (type) => {
      const state = threeHeroState();
      const caster = state.heroes[0].actorId;
      const res = resolveTargetRule(state, caster, { type });
      expect(res.targetActorIds).toEqual([state.boss.actorId]);
    },
  );

  it('random_enemy resolves to the boss and deterministically advances rngCursor', () => {
    const state = threeHeroState();
    const caster = state.heroes[0].actorId;
    const res = resolveTargetRule(state, caster, { type: 'random_enemy' });
    expect(res.targetActorIds).toEqual([state.boss.actorId]);
    expect(res.nextRngCursor).toBe(state.rngCursor + 1);

    // Same seed/cursor in -> same cursor out, every time.
    const res2 = resolveTargetRule(state, caster, { type: 'random_enemy' });
    expect(res2.nextRngCursor).toBe(res.nextRngCursor);
  });

  it('lowest_health_ally picks the living hero with the lowest hp%', () => {
    let state = threeHeroState();
    const [a, b, c] = state.heroes;
    state = {
      ...state,
      heroes: state.heroes.map((h) => {
        if (h.actorId === a.actorId) return { ...h, hp: Math.floor(h.snapshot.maxHp * 0.9) };
        if (h.actorId === b.actorId) return { ...h, hp: Math.floor(h.snapshot.maxHp * 0.2) };
        return { ...h, hp: Math.floor(h.snapshot.maxHp * 0.6) };
      }),
    };
    const res = resolveTargetRule(state, c.actorId, { type: 'lowest_health_ally' });
    expect(res.targetActorIds).toEqual([b.actorId]);
  });

  it('lowest_health_ally excludes defeated heroes', () => {
    let state = threeHeroState();
    const [a, b] = state.heroes;
    state = {
      ...state,
      heroes: state.heroes.map((h) => {
        if (h.actorId === b.actorId) return { ...h, hp: 1, defeated: false };
        return h;
      }),
    };
    // Now defeat the actual lowest (b), so lowest among living should be a.
    state = {
      ...state,
      heroes: state.heroes.map((h) =>
        h.actorId === b.actorId ? { ...h, hp: 0, defeated: true } : { ...h, hp: h.snapshot.maxHp },
      ),
    };
    const res = resolveTargetRule(state, a.actorId, { type: 'lowest_health_ally' });
    expect(res.targetActorIds[0]).not.toBe(b.actorId);
  });

  it('all_allies returns every living hero, excluding defeated', () => {
    let state = threeHeroState();
    const [a, b, c] = state.heroes;
    state = {
      ...state,
      heroes: state.heroes.map((h) => (h.actorId === b.actorId ? { ...h, defeated: true } : h)),
    };
    const res = resolveTargetRule(state, a.actorId, { type: 'all_allies' });
    expect(res.targetActorIds.sort()).toEqual([a.actorId, c.actorId].sort());
  });

  it('single_ally trusts a valid player-chosen living ally', () => {
    const state = threeHeroState();
    const [a, , c] = state.heroes;
    const res = resolveTargetRule(state, a.actorId, { type: 'single_ally' }, [c.actorId]);
    expect(res.targetActorIds).toEqual([c.actorId]);
  });

  it('single_ally falls back to a living ally when no valid pick is supplied', () => {
    const state = threeHeroState();
    const [a] = state.heroes;
    const res = resolveTargetRule(state, a.actorId, { type: 'single_ally' }, []);
    expect(res.targetActorIds).toHaveLength(1);
    expect(res.targetActorIds[0]).not.toBe(a.actorId);
  });

  it('single_ally ignores a defeated player-chosen target and falls back', () => {
    let state = threeHeroState();
    const [a, b] = state.heroes;
    state = {
      ...state,
      heroes: state.heroes.map((h) => (h.actorId === b.actorId ? { ...h, defeated: true } : h)),
    };
    const res = resolveTargetRule(state, a.actorId, { type: 'single_ally' }, [b.actorId]);
    expect(res.targetActorIds[0]).not.toBe(b.actorId);
  });
});

describe('targetRuleNeedsPlayerPick', () => {
  it('is true only for single_ally', () => {
    expect(targetRuleNeedsPlayerPick({ type: 'single_ally' })).toBe(true);
    expect(targetRuleNeedsPlayerPick({ type: 'self' })).toBe(false);
    expect(targetRuleNeedsPlayerPick({ type: 'lowest_health_ally' })).toBe(false);
    expect(targetRuleNeedsPlayerPick({ type: 'all_allies' })).toBe(false);
  });
});

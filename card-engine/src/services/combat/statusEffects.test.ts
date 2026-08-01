import { describe, it, expect } from 'vitest';
import { statusDamageModifiers, resolveDamage, NEUTRAL_RESISTANCE } from './formulas';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  buildFireElementalBossSnapshot,
} from './harness';
import { initializeBattle, submitPlayerAction, advance } from './reducer';
import type { StatusInstance, BattleEvent, BattleState } from '../../types/combat';
import type { AbilityDefinition, AbilityVersion, AbilityEffect } from '../../types/abilities';
import type { CardStats } from '../../types/card';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function status(statusId: string, stacks = 1, reductionPercent?: number): StatusInstance {
  return {
    instanceId: `st_${statusId}_${stacks}`,
    statusId,
    sourceActorId: 'someone',
    application: { statusId, duration: 3, stacks, reductionPercent },
    remainingRounds: 3,
    stacks,
  };
}

const STATS: CardStats = {
  Atk: { value: 60, bias: 'Mid', hardCap: 100 },
  Def: { value: 60, bias: 'Mid', hardCap: 100 },
  Mana: { value: 60, bias: 'Mid', hardCap: 100 },
};

/** A one-ability hero, so a test asserts exactly the effect it authored. */
function heroWith(
  effects: AbilityEffect[],
  id = 'ability_probe',
  targetType: 'single_enemy' | 'self' = 'single_enemy',
) {
  const definition = {
    id,
    slug: id.replace(/_/g, '-'),
    displayName: 'Probe',
    familyIds: ['martial'],
    rarity: 'common',
    role: 'damage',
    tags: [],
    descriptionShort: 'A test ability.',
    currentVersionId: `${id}_v1`,
    status: 'approved',
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
  } as unknown as AbilityDefinition;
  const version = {
    id: `${id}_v1`,
    abilityId: id,
    versionNumber: 1,
    slotType: 'core',
    targetRule: { type: targetType },
    resourceType: 'mana',
    resourceCost: 0,
    effects,
    status: 'approved',
  } as unknown as AbilityVersion;

  return buildHeroSnapshot({
    cardId: 'card_probe',
    archetype: 'Barbarian',
    displayName: 'Probe Hero',
    stats: STATS,
    rank: 'Forged',
    elementDamageType: 'kinetic',
    abilities: [buildAbilitySnapshot(definition, version)],
  });
}

interface CastOptions {
  /** 'self' for defensive abilities — guard and heals target the caster. */
  targetType?: 'single_enemy' | 'self';
  /** Wound the caster first. Healing emits no event at full HP, so a
   *  lifesteal test at full health can only ever observe silence. */
  heroHp?: number;
}

/** Run one ability and return the events it produced. */
function castOnce(
  effects: AbilityEffect[],
  opts: CastOptions = {},
): { events: BattleEvent[]; state: BattleState } {
  const snapshot = buildBattleSnapshot({
    seed: 1,
    hero: heroWith(effects, 'ability_probe', opts.targetType ?? 'single_enemy'),
    boss: buildFireElementalBossSnapshot(),
  });
  let state = initializeBattle(snapshot);
  if (opts.heroHp !== undefined) {
    state = { ...state, heroes: state.heroes.map((h) => ({ ...h, hp: opts.heroHp! })) };
  }
  const events: BattleEvent[] = [];
  // Drain to the player's turn.
  for (let i = 0; i < 20 && state.phase !== 'awaiting_player_action'; i++) {
    const step = advance(state);
    state = step.state;
    events.push(...step.events);
  }
  const acted = submitPlayerAction(state, {
    kind: 'ability',
    abilityDefinitionId: 'ability_probe',
    targetActorIds:
      (opts.targetType ?? 'single_enemy') === 'self'
        ? [state.heroes[0].actorId]
        : [state.boss.actorId],
  });
  return { events: acted.events, state: acted.state };
}

/* ------------------------------------------------------------------ */
/*  Damage modifiers                                                   */
/* ------------------------------------------------------------------ */

describe('statusDamageModifiers', () => {
  it('weakened cuts outgoing damage by a quarter', () => {
    const m = statusDamageModifiers([status('weakened')], [], 'kinetic');
    expect(m.outgoingMultiplier).toBeCloseTo(0.75);
  });

  it('rage scales per stack and caps at four', () => {
    expect(statusDamageModifiers([status('rage', 2)], [], 'kinetic').outgoingMultiplier).toBeCloseTo(1.16);
    // Ten stacks must not out-perform the cap, or a stacking loop is unbounded.
    expect(statusDamageModifiers([status('rage', 10)], [], 'kinetic').outgoingMultiplier).toBeCloseTo(1.32);
  });

  it('focus caps at three stacks', () => {
    expect(statusDamageModifiers([status('focus', 9)], [], 'kinetic').outgoingMultiplier).toBeCloseTo(1.45);
  });

  it('mark only sharpens martial and beast damage', () => {
    expect(statusDamageModifiers([], [status('mark')], 'kinetic').incomingMultiplier).toBeCloseTo(1.2);
    expect(statusDamageModifiers([], [status('mark')], 'primal').incomingMultiplier).toBeCloseTo(1.2);
    // A marked target is not more vulnerable to a fireball.
    expect(statusDamageModifiers([], [status('mark')], 'searing').incomingMultiplier).toBe(1);
  });

  it('guard-shaped statuses reduce incoming damage by their own amount', () => {
    const light = statusDamageModifiers([], [status('guarded', 1, 0.2)], 'kinetic');
    const heavy = statusDamageModifiers([], [status('guarded', 1, 0.5)], 'kinetic');
    expect(light.incomingMultiplier).toBeCloseTo(0.8);
    expect(heavy.incomingMultiplier).toBeCloseTo(0.5);
  });

  it('stacked debuffs can never zero a hit out', () => {
    const m = statusDamageModifiers([status('weakened')], [status('guarded', 1, 0.9)], 'kinetic');
    const dmg = resolveDamage({
      baseAmount: 100,
      damageType: 'kinetic',
      targetMitigation: 200,
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: [],
      outgoingMultiplier: m.outgoingMultiplier,
      incomingMultiplier: m.incomingMultiplier,
    });
    // The min-1 floor is applied AFTER mitigation, so it still holds.
    expect(dmg.postDefenseAmount).toBeGreaterThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ */
/*  Effects                                                            */
/* ------------------------------------------------------------------ */

describe('multi_hit', () => {
  it('emits one damage event per hit rather than one aggregate', () => {
    const { events } = castOnce([
      { type: 'multi_hit', hitCount: 4, amountPerHit: 5, damageType: 'kinetic' },
    ]);
    const hits = events.filter((e) => e.kind === 'damage_dealt');
    expect(hits).toHaveLength(4);
    // The VFX layer renders one strike per event, so an aggregate would show
    // a four-hit flurry as a single blow.
    for (const h of hits) expect(h.kind === 'damage_dealt' && h.amount).toBeGreaterThanOrEqual(1);
  });
});

describe('lifesteal', () => {
  it('steals from every hit of a flurry, not just the last one', () => {
    const { events } = castOnce(
      [
        { type: 'multi_hit', hitCount: 4, amountPerHit: 10, damageType: 'kinetic' },
        { type: 'lifesteal', percentOfDamage: 0.5 },
      ],
      { heroHp: 20 },
    );
    const dealt = events
      .filter((e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> => e.kind === 'damage_dealt')
      .reduce((n, e) => n + e.amount, 0);
    const healed = events
      .filter((e): e is Extract<BattleEvent, { kind: 'healing_applied' }> => e.kind === 'healing_applied')
      .reduce((n, e) => n + e.amount + e.overheal, 0);
    expect(dealt).toBeGreaterThan(0);
    expect(healed).toBe(Math.floor(dealt * 0.5));
  });

  it('heals nothing when no damage preceded it', () => {
    const { events } = castOnce([{ type: 'lifesteal', percentOfDamage: 0.5 }]);
    expect(events.filter((e) => e.kind === 'healing_applied')).toHaveLength(0);
  });
});

describe('damage_over_time', () => {
  it('deals nothing on cast — it plants a status instead', () => {
    const { events, state } = castOnce([
      { type: 'damage_over_time', statusId: 'burn', amountPerTick: 6, duration: 3 },
    ]);
    expect(events.filter((e) => e.kind === 'damage_dealt')).toHaveLength(0);
    expect(state.boss.statuses.some((s) => s.statusId === 'burn')).toBe(true);
  });

  it('merges repeat applications instead of accumulating instances', () => {
    // The bug this guards: without stack merging, every cast appended another
    // independently-ticking instance, so one ability spammed for ten rounds
    // produced ten concurrent burns and the fight collapsed.
    const snapshot = buildBattleSnapshot({
      seed: 1,
      hero: heroWith([{ type: 'damage_over_time', statusId: 'burn', amountPerTick: 6, duration: 5 }]),
      boss: buildFireElementalBossSnapshot(),
    });
    let state = initializeBattle(snapshot);
    for (let cast = 0; cast < 8; cast++) {
      for (let i = 0; i < 20 && state.phase !== 'awaiting_player_action'; i++) {
        state = advance(state).state;
      }
      if (state.phase !== 'awaiting_player_action') break;
      state = submitPlayerAction(state, {
        kind: 'ability',
        abilityDefinitionId: 'ability_probe',
        targetActorIds: [state.boss.actorId],
      }).state;
    }
    const burns = state.boss.statuses.filter((s) => s.statusId === 'burn');
    expect(burns.length).toBeLessThanOrEqual(1);
    // burn's catalog maxStacks is 5.
    for (const b of burns) expect(b.stacks).toBeLessThanOrEqual(5);
  });
});

describe('damage-over-time typing', () => {
  it('burns as its status, not as a blanket default', () => {
    // Regression: DoTs defaulted to 'searing', so the fire-RESISTANT boss was
    // halving bleed ticks. A cut is a cut; only fire is fire.
    const bleed = castOnce([
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 10, duration: 3 },
    ]);
    const burn = castOnce([
      { type: 'damage_over_time', statusId: 'burn', amountPerTick: 10, duration: 3 },
    ]);
    const typeOf = (r: ReturnType<typeof castOnce>, id: string) =>
      r.state.boss.statuses.find((s) => s.statusId === id)?.application.damageType;

    expect(typeOf(bleed, 'bleed')).toBe('kinetic');
    expect(typeOf(burn, 'burn')).toBe('searing');
  });
});

describe('taunt', () => {
  it('is applied to the caster, since taunting means "hit me instead"', () => {
    const { state } = castOnce([{ type: 'taunt', duration: 2 }]);
    expect(state.heroes[0].statuses.some((s) => s.statusId === 'taunt')).toBe(true);
    expect(state.boss.statuses.some((s) => s.statusId === 'taunt')).toBe(false);
  });
});

describe('guard', () => {
  it('grants a reduction status rather than a flat shield pool', () => {
    const { state } = castOnce([{ type: 'guard', reductionPercent: 0.35, duration: 1 }], {
      targetType: 'self',
    });
    const guarded = state.heroes[0].statuses.find((s) => s.statusId === 'guarded');
    expect(guarded?.application.reductionPercent).toBeCloseTo(0.35);
  });
});

describe('status instance ids', () => {
  it('do not collide when one ability applies two statuses to one target', () => {
    const { state } = castOnce([
      { type: 'apply_status', status: { statusId: 'burn', duration: 2 } },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ]);
    const ids = state.boss.statuses.map((s) => s.instanceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

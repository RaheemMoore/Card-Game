import { describe, it, expect } from 'vitest';
import type { BattleEvent, BossSnapshot, HeroSnapshot } from '../../types/combat';
import type { CardStats } from '../../types/card';
import {
  runBattle,
  buildAbilitySnapshot,
  buildHeroSnapshot,
  buildBattleSnapshot,
  buildFireElementalBossSnapshot,
  baselineHeroPolicy,
} from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';

/**
 * The boss intent types, proven individually.
 *
 * Until 2026-07-28 `doResolveBoss` never branched on `intentType` at all — it
 * applied `baseDamage` down one single-target path regardless — so
 * `heavy_attack`, `area_attack` and `execute` were one behaviour wearing three
 * names. These tests exist so that can never quietly become true again: each
 * asserts the intent does something the others do not.
 */

const STATS: CardStats = {
  Atk: { value: 60, bias: 'Mid', hardCap: 100 },
  Def: { value: 60, bias: 'Mid', hardCap: 100 },
  Mana: { value: 60, bias: 'Mid', hardCap: 100 },
};

function hero(id: string): HeroSnapshot {
  const attuned = SEED_ABILITIES.find((s) => s.definition.id === 'ability_attuned_strike')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats: STATS,
    rank: 'Forged',
    elementDamageType: 'physical',
    abilities: [buildAbilitySnapshot(attuned.definition, attuned.version)],
  });
}

/** A one-action boss, so the assertion is about that action and nothing else. */
function bossWith(action: Partial<BossSnapshot['phases'][number]['actions'][number]>): BossSnapshot {
  const base = buildFireElementalBossSnapshot(4000); // tanky: the fight must not end early
  return {
    ...base,
    phases: [
      {
        id: 'only',
        healthThresholdStart: 1,
        healthThresholdEnd: 0,
        passiveEffects: [],
        actions: [
          {
            id: 'act_probe',
            displayName: 'Probe',
            intentType: 'heavy_attack',
            telegraphText: 'winds up',
            priority: 10,
            cooldownRounds: 0,
            interruptible: false,
            baseDamage: 30,
            scalingPerRound: 0,
            damageType: 'physical',
            ...action,
          },
        ],
      },
    ],
  };
}

function play(boss: BossSnapshot) {
  const heroes = [hero('h1'), hero('h2'), hero('h3')];
  const { events, finalState } = runBattle(
    buildBattleSnapshot({ seed: 7, heroes, boss }),
    baselineHeroPolicy,
  );
  return { events: events as BattleEvent[], finalState };
}

describe('area_attack', () => {
  it('hits every living hero, where heavy_attack hits one', () => {
    const heavy = play(bossWith({ intentType: 'heavy_attack' }));
    const area = play(bossWith({ intentType: 'area_attack' }));

    // Counted per ROUND, not as distinct targets across the fight: the boss
    // legitimately retargets between rounds as heroes take damage, so a
    // single-target attack still touches several heroes over four rounds.
    const hitsPerRound = (r: ReturnType<typeof play>) => {
      const hits = r.events.filter(
        (e) => e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0',
      ).length;
      const rounds = r.events.filter((e) => e.kind === 'round_started').length;
      return hits / Math.max(1, rounds);
    };

    expect(hitsPerRound(heavy)).toBeLessThanOrEqual(1);
    expect(hitsPerRound(area)).toBeGreaterThan(2);
  });

  it('emits one damage event per hero so the view can render each', () => {
    const area = play(bossWith({ intentType: 'area_attack' }));
    const perRound = area.events.filter(
      (e) => e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0',
    );
    // Aggregating would show a party-wide sweep as a single number on one hero.
    expect(perRound.length).toBeGreaterThanOrEqual(3);
  });
});

describe('shield', () => {
  it('grants the boss absorb that soaks incoming damage', () => {
    const shielded = play(
      bossWith({ intentType: 'shield', baseDamage: 0, shieldAmount: 500, shieldDurationRounds: 9 }),
    );
    const gained = shielded.events.filter(
      (e) => e.kind === 'shield_gained' && e.targetActorId === 'boss_0',
    );
    expect(gained.length).toBeGreaterThan(0);

    // And it actually absorbs: the boss should have taken less than the party
    // dealt, because some of it landed on the pool.
    const dealt = shielded.events
      .filter(
        (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
          e.kind === 'damage_dealt' && e.targetActorId === 'boss_0',
      )
      .reduce((n, e) => n + e.amount + e.blockedByShield, 0);
    const blocked = shielded.events
      .filter(
        (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
          e.kind === 'damage_dealt' && e.targetActorId === 'boss_0',
      )
      .reduce((n, e) => n + e.blockedByShield, 0);
    expect(dealt).toBeGreaterThan(0);
    expect(blocked).toBeGreaterThan(0);
  });
});

describe('phase passive statuses', () => {
  it('apply on the OPENING phase, not only on transitions', () => {
    // Nothing transitions INTO phase 0, so a boss whose first phase
    // regenerates would otherwise not start doing so until its second.
    const base = bossWith({});
    const boss: BossSnapshot = {
      ...base,
      phases: [
        {
          ...base.phases[0],
          passiveStatuses: [{ statusId: 'regeneration', duration: 99, stacks: 2 }],
        },
      ],
    };
    const { events, finalState } = play(boss);
    expect(finalState.boss.statuses.some((s) => s.statusId === 'regeneration')).toBe(true);
    // And it heals — this is pressure axis F, the sustain race.
    const bossHeals = events.filter(
      (e) => e.kind === 'healing_applied' && e.targetActorId === 'boss_0',
    );
    expect(bossHeals.length).toBeGreaterThan(0);
  });

  it('respects the catalog stack cap rather than stacking freely', () => {
    const base = bossWith({});
    const boss: BossSnapshot = {
      ...base,
      phases: [
        {
          ...base.phases[0],
          // regeneration's catalog maxStacks is 3.
          passiveStatuses: [{ statusId: 'regeneration', duration: 99, stacks: 9 }],
        },
      ],
    };
    const { finalState } = play(boss);
    const regen = finalState.boss.statuses.find((s) => s.statusId === 'regeneration');
    expect(regen?.stacks).toBeLessThanOrEqual(3);
  });
});

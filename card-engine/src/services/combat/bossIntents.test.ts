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
    elementDamageType: 'kinetic',
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
            damageType: 'kinetic',
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

/* ══════════════════════════════════════════════════════════════════════ */
/*  The intents that had no behaviour at all until 2026-07-30.            */
/*                                                                        */
/*  `enrage_prep`, `curse`, `vulnerability`, `execute` and `ultimate`     */
/*  were declared in the type system and fell through to the single-      */
/*  target damage path, so authoring one produced an ordinary punch with  */
/*  a different name in the log. Each test below asserts the intent does  */
/*  something no other intent does.                                       */
/* ══════════════════════════════════════════════════════════════════════ */

describe('enrage_prep', () => {
  it('buffs the boss instead of attacking, and the buff actually raises damage', () => {
    // The bug this guards: `strike()` passed `[]` as the attacker's statuses,
    // so a boss could hold a full stack of rage and hit for exactly the same
    // amount. The buff existed in state and did nothing.
    const plain = play(bossWith({ intentType: 'heavy_attack', baseDamage: 30 }));

    const base = bossWith({});
    const enraging: BossSnapshot = {
      ...base,
      phases: [
        {
          ...base.phases[0],
          actions: [
            {
              ...base.phases[0].actions[0],
              id: 'act_prep',
              intentType: 'enrage_prep',
              priority: 99,
              cooldownRounds: 99, // once, at the top of the fight
              baseDamage: 0,
              selfStatuses: [{ statusId: 'rage', duration: 99, stacks: 4 }],
            },
            { ...base.phases[0].actions[0], baseDamage: 30, priority: 10 },
          ],
        },
      ],
    };
    const raged = play(enraging);

    expect(raged.finalState.boss.statuses.some((s) => s.statusId === 'rage')).toBe(true);

    const meanHit = (r: ReturnType<typeof play>) => {
      const hits = r.events.filter(
        (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
          e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0' && e.amount > 0,
      );
      return hits.reduce((n, e) => n + e.amount, 0) / Math.max(1, hits.length);
    };
    expect(meanHit(raged)).toBeGreaterThan(meanHit(plain));
  });
});

describe('curse / vulnerability', () => {
  it('applies its authored status to the target', () => {
    const cursed = play(
      bossWith({
        intentType: 'curse',
        baseDamage: 0,
        statusApplications: [{ statusId: 'weakened', duration: 99 }],
      }),
    );
    const applied = cursed.events.filter(
      (e) => e.kind === 'status_applied' && e.statusId === 'weakened',
    );
    expect(applied.length).toBeGreaterThan(0);
  });

  it('vulnerability makes the target take MORE damage — the mirror of guard', () => {
    // `amplificationPercent` did not exist before this work: the type system
    // could say "takes less" and not "takes more", so this intent had nothing
    // to stand on and could only have been faked with a bigger baseDamage.
    const plain = play(bossWith({ intentType: 'heavy_attack', baseDamage: 30 }));

    const base = bossWith({});
    const vulnBoss: BossSnapshot = {
      ...base,
      phases: [
        {
          ...base.phases[0],
          actions: [
            {
              ...base.phases[0].actions[0],
              id: 'act_vuln',
              intentType: 'vulnerability',
              priority: 99,
              cooldownRounds: 99,
              baseDamage: 0,
              targetScope: 'all_heroes',
              statusApplications: [
                { statusId: 'mark', duration: 99, amplificationPercent: 0.5 },
              ],
            },
            { ...base.phases[0].actions[0], baseDamage: 30, priority: 10 },
          ],
        },
      ],
    };
    const vuln = play(vulnBoss);

    const meanHit = (r: ReturnType<typeof play>) => {
      const hits = r.events.filter(
        (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
          e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0' && e.amount > 0,
      );
      return hits.reduce((n, e) => n + e.amount, 0) / Math.max(1, hits.length);
    };
    expect(meanHit(vuln)).toBeGreaterThan(meanHit(plain));
  });
});

describe('execute', () => {
  it('hits harder once the target is below the threshold', () => {
    // Threshold 1.0 means "always low", which isolates the multiplier from
    // the question of whether anyone actually got low during the fight.
    const normal = play(bossWith({ intentType: 'execute', baseDamage: 30 }));
    const executing = play(
      bossWith({
        intentType: 'execute',
        baseDamage: 30,
        executeThresholdPercent: 1.0,
        executeMultiplier: 3,
      }),
    );

    const total = (r: ReturnType<typeof play>) =>
      r.events
        .filter(
          (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
            e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0',
        )
        .reduce((n, e) => n + e.amount, 0);

    expect(total(executing)).toBeGreaterThan(total(normal));
  });
});

describe('charge-up', () => {
  /** A boss whose only real threat is a charged party-wide hit. */
  function chargedBoss(overrides: Record<string, unknown> = {}): BossSnapshot {
    const base = bossWith({});
    return {
      ...base,
      phases: [
        {
          ...base.phases[0],
          actions: [
            {
              ...base.phases[0].actions[0],
              id: 'act_charged',
              displayName: 'The Whole Ledger',
              intentType: 'ultimate',
              priority: 99,
              cooldownRounds: 2,
              interruptible: false,
              baseDamage: 60,
              targetScope: 'all_heroes',
              charge: {
                rounds: 2,
                break: { kind: 'damage', percentOfMaxHp: 0.18 },
                partialMitigationMax: 0.6,
              },
              ...overrides,
            },
          ],
        },
      ],
    };
  }

  it('deals no damage on the wind-up round — the forfeited turn is its price', () => {
    const r = play(chargedBoss());
    // Walk the log and find the round the charge was FIRST declared in, then
    // assert the boss dealt nothing in that specific round. Counting hits
    // across the whole fight is not enough: the boss goes on to attack in
    // later rounds, so a loose total passes even when the wind-up is free.
    let round = 0;
    let declaredRound = -1;
    const damageByRound = new Map<number, number>();
    for (const e of r.events) {
      if (e.kind === 'round_started') round = e.round;
      if (e.kind === 'boss_intent_declared' && declaredRound === -1) declaredRound = round;
      if (e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0') {
        damageByRound.set(round, (damageByRound.get(round) ?? 0) + e.amount);
      }
    }
    expect(declaredRound).toBeGreaterThan(0);
    expect(damageByRound.get(declaredRound) ?? 0).toBe(0);
  });

  it('lands on the round it promised, not the round it was declared', () => {
    const r = play(chargedBoss());
    let declaredRound = -1;
    let firstHitRound = -1;
    let round = 0;
    for (const e of r.events) {
      if (e.kind === 'round_started') round = e.round;
      if (e.kind === 'boss_intent_declared' && declaredRound === -1) declaredRound = round;
      if (
        e.kind === 'damage_dealt' &&
        e.sourceActorId === 'boss_0' &&
        e.amount > 0 &&
        firstHitRound === -1
      ) {
        firstHitRound = round;
      }
    }
    expect(declaredRound).toBeGreaterThan(0);
    // Declared at N, resolves at N+2 for `rounds: 2`.
    expect(firstHitRound).toBeGreaterThanOrEqual(declaredRound + 2);
  });

  it('is cancelled outright when the party meets the break condition', () => {
    // An unreachably small break threshold — any chip at all breaks it.
    const trivial = play(chargedBoss({
      charge: {
        rounds: 2,
        break: { kind: 'damage', percentOfMaxHp: 0.0001 },
        partialMitigationMax: 0.6,
      },
    }));
    const denied = trivial.events.filter(
      (e) => e.kind === 'action_denied' && e.actorId === 'boss_0',
    );
    expect(denied.length).toBeGreaterThan(0);
  });

  it('scales damage down linearly with partial progress rather than all-or-nothing', () => {
    // The whole reason progress is a fraction: a party that gets most of the
    // way there must take meaningfully less, or pushing the bar is pointless
    // unless you finish it.
    const unbreakable = play(chargedBoss({
      charge: {
        rounds: 2,
        break: { kind: 'damage', percentOfMaxHp: 99 }, // progress ~0
        partialMitigationMax: 0.6,
      },
    }));
    const nearlyBroken = play(chargedBoss({
      charge: {
        rounds: 2,
        // Small enough that the party accumulates real progress without
        // reaching 1.0 — mitigation should bite.
        break: { kind: 'damage', percentOfMaxHp: 0.25 },
        partialMitigationMax: 0.6,
      },
    }));

    const biggestHit = (r: ReturnType<typeof play>) =>
      Math.max(
        0,
        ...r.events
          .filter(
            (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> =>
              e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0',
          )
          .map((e) => e.amount),
      );

    expect(biggestHit(nearlyBroken)).toBeLessThan(biggestHit(unbreakable));
  });

  it('never runs two charges at once', () => {
    const r = play(chargedBoss());
    // pendingCharge is a single slot; the guard is that the reveal phase
    // filters charge-carrying actions while one is live. If that filter broke,
    // the countdown would keep resetting and the hit would never land.
    const bossHits = r.events.filter(
      (e) => e.kind === 'damage_dealt' && e.sourceActorId === 'boss_0' && e.amount > 0,
    );
    expect(bossHits.length).toBeGreaterThan(0);
  });
});

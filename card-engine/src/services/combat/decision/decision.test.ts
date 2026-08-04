import { describe, expect, it } from 'vitest';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  snapshotFromBossVersion,
} from '../harness';
import { advance, initializeBattle, pickActingHero, submitPlayerAction } from '../reducer';
import { baselineHeroPolicy } from '../harness';
import { SEED_ABILITIES } from '../../../data/abilities/seedAbilities';
import { SEED_BOSSES } from '../../../data/bosses/seedBosses';
import type { BattleState, PlayerAction } from '../../../types/combat';
import type { CardStats } from '../../../types/card';
import { projectAction } from './projectAction';
import { deriveThreat } from './objectives';
import { explainAbility, tacticalLabel } from './relationships';
import { requiresConfirmation } from './confirmation';

/**
 * The Decision Experience promises exact numbers and honest limits. These
 * tests hold it to both.
 *
 * The three "surprising truth" cases are the point of the suite. Each one
 * contradicts what the fight looks like, each was verified against the reducer
 * rather than assumed, and each would silently become a lie if someone
 * "fixed" the mechanics without revisiting the copy.
 */

const DEBT_BEARER = SEED_BOSSES.find((b) => b.definition.slug === 'the-debt-bearer')!;

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function ability(id: string) {
  const seed = SEED_ABILITIES.find((s) => s.definition.id === id)!;
  return buildAbilitySnapshot(seed.definition, seed.version);
}

function hero(id: string, abilityIds: readonly string[], stats = statsFor(70, 55, 60)) {
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats,
    rank: 'Forged',
    elementDamageType: 'kinetic',
    abilities: abilityIds.map(ability),
  });
}

const ROOTGRASP = 'ability_rootgrasp';
const BEARING_WITNESS = 'ability_bearing_witness';
const LOAD_BEARING = 'ability_load_bearing';

function startBattle(abilityIds: readonly string[] = [ROOTGRASP, BEARING_WITNESS]): BattleState {
  const snapshot = buildBattleSnapshot({
    heroes: [
      hero('Vanguard', abilityIds),
      hero('Warden', abilityIds, statsFor(50, 70, 55)),
      hero('Reaver', abilityIds, statsFor(65, 45, 65)),
    ],
    boss: snapshotFromBossVersion(DEBT_BEARER.definition, DEBT_BEARER.version),
    seed: 12345,
  });
  let state = initializeBattle(snapshot);
  // Run to the first decision point.
  for (let i = 0; i < 20 && state.phase !== 'awaiting_player_action'; i++) {
    state = advance(state).state;
  }
  return state;
}

/**
 * Drive the fight until the named boss action is charging.
 *
 * The Whole Ledger and Final Demand only appear once the boss drops below
 * 55% max HP (phase_debt_calling_in) — First Notice lives in phase 1. So
 * reaching either takes real rounds of surviving damage, not just a few
 * decisions, which is why filler defaults to the same scripted policy the
 * balance suite uses (ultimate > signature > core > strike > guard) rather
 * than pure Strike, which gets the party wiped before phase 2.
 */
function untilCharging(
  actionId: string,
  abilityIds: readonly string[] = [ROOTGRASP, BEARING_WITNESS],
  act: (s: BattleState) => PlayerAction = (s) =>
    baselineHeroPolicy.chooseAction(s, pickActingHero(s)!),
): BattleState {
  let s = startBattle(abilityIds);
  for (let i = 0; i < 8000; i++) {
    if (s.boss.pendingCharge?.actionId === actionId) return s;
    if (s.phase === 'battle_over') {
      s = startBattle(abilityIds);
      continue;
    }
    s = s.phase === 'awaiting_player_action' ? submitPlayerAction(s, act(s)).state : advance(s).state;
  }
  throw new Error(`${actionId} never charged`);
}

/* ------------------------------------------------------------------ */

describe('projectAction', () => {
  it('leaves the source state and the RNG cursor untouched', () => {
    const state = startBattle();
    const before = JSON.stringify(state);
    projectAction(state, { kind: 'strike' });
    projectAction(state, { kind: 'guard' });
    projectAction(state, {
      kind: 'ability',
      abilityDefinitionId: ROOTGRASP,
      targetActorIds: [],
    });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('matches what the reducer actually does — strike', () => {
    const state = startBattle();
    const projection = projectAction(state, { kind: 'strike' });
    const actual = submitPlayerAction(state, { kind: 'strike' });
    expect(projection.damageToBoss).toBe(state.boss.hp - actual.state.boss.hp);
    expect(projection.confidence.kind).toBe('exact');
  });

  it('matches what the reducer actually does — a shield + cleanse ability', () => {
    const state = startBattle();
    const target = state.heroes[1].actorId;
    const action: PlayerAction = {
      kind: 'ability',
      abilityDefinitionId: BEARING_WITNESS,
      targetActorIds: [target],
    };
    const projection = projectAction(state, action);
    const actual = submitPlayerAction(state, action).state;

    const shielded = projection.shields.find((s) => s.actorId === target);
    const actualShield = actual.heroes.find((h) => h.actorId === target)!.shields
      .reduce((n, p) => n + p.amount, 0);
    expect(shielded?.amount).toBe(actualShield);
    // A pure shield/cleanse used to project as `null` and show nothing at all.
    expect(shielded!.amount).toBeGreaterThan(0);
  });

  it('reports the denial instead of inventing consequences', () => {
    const state = startBattle();
    const drained: BattleState = { ...state, partyResource: { mana: 0, tech: 0 } };
    const projection = projectAction(drained, {
      kind: 'ability',
      abilityDefinitionId: ROOTGRASP,
      targetActorIds: [],
    });
    expect(projection.deniedReason).toBe('insufficient_resource');
    expect(projection.damageToBoss).toBe(0);
    expect(projection.hp).toHaveLength(0);
  });
});

describe('objectives — interrupt and charge stay separate', () => {
  it('derives the interrupt threshold from frozen max HP, with no partial credit', () => {
    const state = startBattle();
    const threat = deriveThreat(state);
    const interrupt = threat?.objectives.find((o) => o.kind === 'interrupt');
    if (interrupt) {
      expect(interrupt.kind).toBe('interrupt');
      // 15% of 1380 = 207.
      expect(interrupt.required).toBe(Math.floor(state.boss.snapshot.maxHp * 0.15));
      expect(interrupt.partialCredit).toBe(false);
    }
  });

  it('derives The Whole Ledger requirement from the frozen boss, not a constant', () => {
    const state = untilCharging('act_debt_ledger');
    const threat = deriveThreat(state)!;
    const charge = threat.objectives.find((o) => o.kind === 'charge');
    expect(charge?.kind).toBe('charge');
    if (charge?.kind !== 'charge') throw new Error('no charge');

    // 28% of 1380 = 386.4 → the player must land 387 whole points.
    expect(charge.damage?.required).toBe(387);
    expect(charge.damage!.required).toBe(
      Math.ceil(state.boss.snapshot.maxHp * 0.28),
    );
    expect(charge.partialCredit).toBe(true);
    expect(charge.mitigationMax).toBe(0.6);
  });

  it('names the heroes who have contributed to First Notice', () => {
    const state = untilCharging('act_debt_first_notice', [ROOTGRASP, BEARING_WITNESS], () => ({ kind: 'guard' }));
    const threat = deriveThreat(state)!;
    const charge = threat.objectives.find((o) => o.kind === 'charge');
    if (charge?.kind !== 'charge') throw new Error('no charge');
    expect(charge.contributorsRequired).toBe(2);
    expect(charge.contributors).toBeDefined();
    // Every named contributor is a real hero, not an actor id leaking through.
    for (const c of charge.contributors!) {
      expect(state.heroes.some((h) => h.actorId === c.actorId)).toBe(true);
    }
  });
});

describe('relationships — the three surprising truths', () => {
  it('says a guard EFFECT does not count toward a coordinated-Guard break', () => {
    // The acting hero must actually carry Load-Bearing — the reducer looks
    // up the ability on `state`'s acting hero, not on a hero built separately.
    const s = untilCharging('act_debt_first_notice', [LOAD_BEARING, BEARING_WITNESS]);

    const abilityRef = s.heroes[0].snapshot.abilities.find(
      (a) => a.definitionId === LOAD_BEARING,
    )!;
    expect(abilityRef.version.effects.some((e) => e.type === 'guard')).toBe(true);

    const threat = deriveThreat(s)!;
    const projection = projectAction(s, {
      kind: 'ability',
      abilityDefinitionId: LOAD_BEARING,
      targetActorIds: [],
    });
    const vm = explainAbility(s, threat, abilityRef, projection);
    const all = [...vm.relevance, ...vm.limitations].map((n) => n.text).join(' ');
    expect(all).toMatch(/does not count toward/i);
    expect(all).toMatch(/Guard action itself/i);
  });

  it('never claims a cleanse prevents an incoming status application', () => {
    const state = startBattle();
    const threat = deriveThreat(state);
    // Force a threat that applies a status, so the timing note is in scope.
    const withStatus = threat
      ? { ...threat, statuses: [{ statusId: 'bleed', duration: 2, stacks: 1 }] }
      : null;
    const target = state.heroes[1].actorId;
    const projection = projectAction(state, {
      kind: 'ability',
      abilityDefinitionId: BEARING_WITNESS,
      targetActorIds: [target],
    });
    const vm = explainAbility(state, withStatus, state.heroes[0].snapshot.abilities
      .find((a) => a.definitionId === BEARING_WITNESS)!, projection);
    const all = [...vm.relevance, ...vm.limitations].map((n) => n.text).join(' ');
    expect(all).toMatch(/Does not prevent/i);
    expect(all).toMatch(/heroes act first/i);
  });

  it('never emits a recommendation', () => {
    const state = untilCharging('act_debt_ledger');
    const threat = deriveThreat(state);
    const banned = /\b(best|recommend|you should|optimal|top pick)\b/i;
    for (const a of state.heroes[0].snapshot.abilities) {
      const projection = projectAction(state, {
        kind: 'ability',
        abilityDefinitionId: a.definitionId,
        targetActorIds: [state.heroes[1].actorId],
      });
      const vm = explainAbility(state, threat, a, projection);
      for (const note of [...vm.relevance, ...vm.limitations]) {
        expect(note.text).not.toMatch(banned);
      }
    }
  });

  it('builds a tactical label from primitives, not the name', () => {
    const bw = ability(BEARING_WITNESS);
    expect(tacticalLabel(bw)).toBe('Shield + Cleanse');
    const lb = ability(LOAD_BEARING);
    expect(tacticalLabel(lb)).toBe('Taunt + Guard');
  });
});

describe('confirmation policy', () => {
  it('does not confirm an ordinary resolved ability', () => {
    const state = startBattle();
    const a = ability(ROOTGRASP);
    const projection = projectAction(state, {
      kind: 'ability',
      abilityDefinitionId: ROOTGRASP,
      targetActorIds: [],
    });
    const decision = requiresConfirmation(state, a, projection, { targetResolved: true });
    expect(decision.required).toBe(false);
  });

  it('confirms an unresolved target and an ultimate', () => {
    const state = startBattle();
    const a = ability(ROOTGRASP);
    const projection = projectAction(state, {
      kind: 'ability',
      abilityDefinitionId: ROOTGRASP,
      targetActorIds: [],
    });
    expect(
      requiresConfirmation(state, a, projection, { targetResolved: false }).reasons,
    ).toContain('unresolved_target');

    const ult = { ...a, slot: 'ultimate' as const };
    expect(
      requiresConfirmation(state, ult, projection, { targetResolved: true }).reasons,
    ).toContain('ultimate');
  });
});

describe('dispel charge breaks are windowed', () => {
  it('a dispel before the charge started does not pre-break it', async () => {
    // Regression guard for the whole-log scan. Asserted structurally: the
    // evaluator must consult charge.startedRound, so a log entry from an
    // earlier round cannot satisfy it.
    const { evaluateChargeProgress } = await import('../reducer');
    const state = startBattle();
    const withEarlyDispel: BattleState = {
      ...state,
      log: [
        { kind: 'round_started', round: 1 },
        { kind: 'status_removed', targetActorId: state.boss.actorId, instanceId: 'x', reason: 'dispelled' },
        { kind: 'round_started', round: 5 },
      ],
    };
    const progress = evaluateChargeProgress(
      withEarlyDispel,
      { actionId: 'a', roundsRemaining: 2, progress: 0, targetActorIds: [], startedRound: 5 },
      { rounds: 2, break: { kind: 'dispel' }, partialMitigationMax: 0.6 },
    );
    expect(progress).toBe(0);
  });
});

import { buildBattleSnapshot, runBattle, runBatch } from './harness';
import { buildReferenceParty } from './referenceParty';
import { COMBAT_LINES } from './heroPolicies';
import type { BossSnapshot } from '../../types/combat';

/**
 * Measure what a boss ACTUALLY does, by fighting it.
 *
 * Authored numbers describe a move's ceiling; they say nothing about whether
 * the move ever gets thrown, whether anything survives it, or whether it is
 * quietly suppressed for free every single fight. Those questions are only
 * answerable by simulation, and the answers have already been surprising once:
 * the Debt-Bearer's centrepiece ultimate was found dealing 1.1% of its damage
 * and killing nobody across 300 battles, because its break condition sat below
 * what the party produced anyway.
 *
 * Pure and synchronous — the reducer is too, so a few hundred battles run in
 * well under a second and this can sit behind a button in a dev page.
 */

export interface ActionTelemetry {
  actionId: string;
  /** Times the intent was declared, per battle. Charged moves declare twice: once to wind up, once to land. */
  declaredPerBattle: number;
  /** Damage this action dealt to heroes, per battle. */
  damagePerBattle: number;
  /** Share of all damage the boss dealt, 0..1. */
  damageShare: number;
  /** Heroes downed while this was the standing intent. */
  kills: number;
}

export interface LineOutcome {
  id: string;
  name: string;
  premise: string;
  answers: string;
  winRate: number;
  avgRounds: number;
}

export interface BossAnalysis {
  battles: number;
  avgRounds: number;
  /** Boss actions denied — interrupted, or a charge broken — per battle. */
  deniedPerBattle: number;
  /** Share of all damage taken, per hero, in party order. Even spread is ~0.33 each. */
  heroDamageShare: { displayName: string; share: number }[];
  actions: ActionTelemetry[];
  lines: LineOutcome[];
}

export function analyzeBoss(boss: BossSnapshot, battles = 300): BossAnalysis {
  const heroes = buildReferenceParty();
  const damageBy = new Map<string, number>();
  const declaredBy = new Map<string, number>();
  const killsBy = new Map<string, number>();
  const takenBy = new Map<string, number>();
  let denied = 0;
  let totalRounds = 0;
  let totalDamage = 0;

  for (let seed = 1; seed <= battles; seed++) {
    const { events, result } = runBattle(
      buildBattleSnapshot({ seed, heroes, boss }),
      COMBAT_LINES[0].policy,
    );
    totalRounds += result.roundsElapsed;
    let standingIntent = '';
    for (const e of events) {
      if (e.kind === 'boss_intent_declared') {
        standingIntent = e.intent.actionId;
        declaredBy.set(standingIntent, (declaredBy.get(standingIntent) ?? 0) + 1);
      } else if (e.kind === 'damage_dealt' && e.targetActorId !== 'boss_0') {
        const key = e.sourceActionId ?? standingIntent;
        damageBy.set(key, (damageBy.get(key) ?? 0) + e.amount);
        takenBy.set(e.targetActorId, (takenBy.get(e.targetActorId) ?? 0) + e.amount);
        totalDamage += e.amount;
      } else if (e.kind === 'actor_defeated' && e.actorId !== 'boss_0') {
        killsBy.set(standingIntent, (killsBy.get(standingIntent) ?? 0) + 1);
      } else if (e.kind === 'action_denied' && e.actorId === 'boss_0') {
        denied++;
      }
    }
  }

  const actionIds = new Set([...damageBy.keys(), ...declaredBy.keys()]);
  const actions: ActionTelemetry[] = [...actionIds]
    .map((actionId) => ({
      actionId,
      declaredPerBattle: (declaredBy.get(actionId) ?? 0) / battles,
      damagePerBattle: (damageBy.get(actionId) ?? 0) / battles,
      damageShare: totalDamage > 0 ? (damageBy.get(actionId) ?? 0) / totalDamage : 0,
      kills: killsBy.get(actionId) ?? 0,
    }))
    .sort((a, b) => b.damageShare - a.damageShare);

  const lines: LineOutcome[] = COMBAT_LINES.map((line) => {
    const party = buildReferenceParty();
    const stats = runBatch(
      (seed) => buildBattleSnapshot({ seed, heroes: party, boss }),
      line.policy,
      battles,
    );
    return {
      id: line.id,
      name: line.name,
      premise: line.premise,
      answers: line.answers,
      winRate: stats.winRate,
      avgRounds: stats.avgRounds,
    };
  });

  return {
    battles,
    avgRounds: totalRounds / battles,
    deniedPerBattle: denied / battles,
    heroDamageShare: heroes.map((h, i) => ({
      displayName: h.displayName,
      share: totalDamage > 0 ? (takenBy.get(`hero_${i}`) ?? 0) / totalDamage : 0,
    })),
    actions,
    lines,
  };
}

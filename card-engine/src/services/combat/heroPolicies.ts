import { baselineHeroPolicy, type HeroPolicy } from './harness';

/**
 * The distinct ways a party can try to win, expressed as scripted policies.
 *
 * These exist so "there are three ways to beat this boss" is a MEASURABLE
 * claim rather than a design aspiration. Each one plays a single idea to the
 * exclusion of the others; if any of them cannot clear the fight, that idea is
 * decoration and the boss's numbers are wrong.
 *
 * They are deliberately simple. A policy that played well in general would
 * prove that a good party wins, which is not the question — the question is
 * whether THIS approach, specifically, is viable.
 *
 * Shared by the balance suite and the dev boss readout so the win rates the
 * readout prints are the same ones the tests gate on.
 */
export interface CombatLine {
  id: string;
  name: string;
  /** What the line does, in the player's terms. */
  premise: string;
  /** The boss mechanic it is built to answer. */
  answers: string;
  policy: HeroPolicy;
}

/**
 * TAUNT-AND-OUTLAST. The toughest hero steps in front of blows aimed at one
 * target, so the boss's snipes land on the hero built to eat them.
 *
 * Only intercepts single-target intents, and only when the blow is not already
 * aimed at the tank. Focusing every round is not the tank line — it is just
 * throwing away a third of the party's damage. The skill being modelled is
 * reading the telegraph and spending the turn only when it buys something.
 */
const tankLine: HeroPolicy = {
  chooseAction(state, hero) {
    const toughest = [...state.heroes]
      .filter((h) => !h.defeated)
      .sort((a, b) => b.snapshot.stats.Def.value - a.snapshot.stats.Def.value)[0];
    const intent = state.boss.currentIntent;
    const worthIntercepting =
      intent !== null &&
      intent.targetActorIds.length === 1 &&
      intent.targetActorIds[0] !== hero.actorId;
    if (toughest && hero.actorId === toughest.actorId && worthIntercepting) {
      return { kind: 'focus' };
    }
    return baselineHeroPolicy.chooseAction(state, hero);
  },
};

/**
 * BURST-AND-INTERRUPT. Damage every round, never idling on guard, so the
 * party's output stays above the thresholds that deny the boss its turn.
 */
const burstLine: HeroPolicy = {
  chooseAction(state, hero) {
    const action = baselineHeroPolicy.chooseAction(state, hero);
    return action.kind === 'guard' ? { kind: 'strike' } : action;
  },
};

/**
 * CONTROL-AND-SUSTAIN. Braces under the charge that breaks on party BEHAVIOUR,
 * and only that one.
 *
 * Guarding through the Ledger's charge would be feeding the boss a free
 * ultimate — its bar fills with damage, so bracing is the opposite of the
 * answer. The two charged ultimates demand opposite responses, and telling
 * them apart is the whole skill this line tests.
 */
const sustainLine: HeroPolicy = {
  chooseAction(state, hero) {
    if (state.boss.pendingCharge?.actionId === 'act_debt_first_notice') {
      const living = state.heroes.filter((h) => !h.defeated);
      const bracing = living.slice(0, 2).map((h) => h.actorId);
      if (bracing.includes(hero.actorId)) return { kind: 'guard' };
    }
    return baselineHeroPolicy.chooseAction(state, hero);
  },
};

export const COMBAT_LINES: readonly CombatLine[] = [
  {
    id: 'baseline',
    name: 'No plan',
    premise: 'Spend every turn on the best ability available and never adapt.',
    answers: 'Nothing. This is the control — the number every other line is measured against.',
    policy: baselineHeroPolicy,
  },
  {
    id: 'tank',
    name: 'Taunt and outlast',
    premise: 'The toughest hero steps in front of single-target blows.',
    answers: 'Seize the Weakest Claim and Final Demand, both of which hunt the softest target.',
    policy: tankLine,
  },
  {
    id: 'burst',
    name: 'Burst and interrupt',
    premise: 'Maximum damage every round, never guarding.',
    answers: 'Interruptible actions and the Ledger — but walks straight into Close the Books.',
    policy: burstLine,
  },
  {
    id: 'sustain',
    name: 'Control and sustain',
    premise: 'Two heroes brace together the moment First Notice starts winding up.',
    answers: 'First Notice, whose charge breaks on what the party DOES, not on damage.',
    policy: sustainLine,
  },
];

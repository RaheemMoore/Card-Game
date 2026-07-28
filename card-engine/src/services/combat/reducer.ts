import type {
  AbilityCondition,
  AbilityVersion,
  DamageType,
  ScalingRule,
} from '../../types/abilities';
import { STATUS_CATALOG, STATUS_DAMAGE_TYPE } from '../../data/abilities/statuses';
import { resolveTargetRule } from './targeting';
import type {
  AbilityCombatSnapshot,
  BattleEvent,
  BattleIntent,
  BattleSnapshot,
  BattleState,
  BossCombatant,
  HeroCombatant,
  PlayerAction,
  StatusInstance,
  TurnPhase,
} from '../../types/combat';
import {
  NEUTRAL_RESISTANCE,
  RESOURCE_REGEN_PER_ROUND,
  clampUltimateCharge,
  deriveHeroStats,
  guardShieldAmount,
  heroResistance,
  FOCUS_RESOURCE_GAIN,
  resolveDamage,
  resolveHeal,
  tickCooldowns,
  ultimateChargeGain,
  type ResistanceProfile,
  statusDamageModifiers,
  REGENERATION_PER_STACK,
  REGENERATION_MAX_STACKS,
  THORNS_REFLECT_SHARE,
} from './formulas';

/**
 * Battle reducer — pure, deterministic, synchronous. See §2 of
 * card-engine-boss-battle-spec.md for turn phase order and §12 for the
 * snapshot-immutable rule.
 *
 * Effects supported: direct_damage, multi_hit, damage_over_time, healing,
 * shielding, guard, taunt, apply_status, remove_status, resource_gain,
 * lifesteal, ultimate_charge_gain, conditional_bonus. `summon` is
 * deliberately out of scope — multiple enemies would change the combat
 * contract (targeting, event log, the single-boss assumption in
 * doResolveBoss), not just the effect switch.
 *
 * Public API:
 *   initializeBattle(snapshot) → BattleState
 *   advance(state) → { state, events }              — while auto-resolvable
 *   submitPlayerAction(state, action) → { state, events }
 *
 * The caller loop is:
 *   while state.phase !== 'battle_over':
 *     if state.phase === 'awaiting_player_action':
 *       action = policy.chooseAction(state)
 *       { state, events } = submitPlayerAction(state, action)
 *     else:
 *       { state, events } = advance(state)
 */

export const TIMEOUT_ROUND_CAP = 30;

/**
 * Fraction of boss maxHp that must be dealt during the same round (between
 * the boss_intent_declared event and doResolveBoss) to interrupt an action
 * flagged `interruptible`. Interrupt cancels the action's damage but still
 * consumes its cooldown so the boss doesn't get soft-locked on the same
 * spell — it just alternates into another action next round. Tune from
 * telemetry once we have it.
 */
const INTERRUPT_DAMAGE_THRESHOLD = 0.15;

/* ------------------------------------------------------------------ */
/*  init                                                               */
/* ------------------------------------------------------------------ */

export function initializeBattle(snapshot: BattleSnapshot): BattleState {
  const heroes: HeroCombatant[] = snapshot.heroes.map((h, i) => {
    const derived = deriveHeroStats(h.stats, h.rank);
    return {
      actorId: `hero_${i}`,
      snapshot: h,
      hp: derived.maxHp,
      resource: derived.maxResource,
      ultimateCharge: 0,
      cooldowns: [],
      statuses: [],
      shields: [],
      defeated: false,
    };
  });

  const boss: BossCombatant = {
    actorId: 'boss_0',
    snapshot: snapshot.boss,
    hp: snapshot.boss.maxHp,
    currentPhaseId: snapshot.boss.phases[0].id,
    actionCooldowns: [],
    statuses: [],
    shields: [],
    defeated: false,
    currentIntent: null,
  };

  return {
    snapshot,
    round: 0,
    step: 0,
    rngCursor: 0,
    heroes,
    boss,
    phase: 'start_of_round',
    pendingActorIds: [],
    log: [
      { kind: 'battle_started', at: snapshot.createdAt, snapshotId: snapshot.battleId },
    ],
    result: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Public step API                                                    */
/* ------------------------------------------------------------------ */

export interface StepResult {
  state: BattleState;
  events: BattleEvent[];
}

export function advance(state: BattleState): StepResult {
  if (state.phase === 'battle_over' || state.result) {
    return { state, events: [] };
  }
  if (state.phase === 'awaiting_player_action' || state.phase === 'awaiting_target') {
    // Caller must supply an action.
    return { state, events: [] };
  }

  switch (state.phase) {
    case 'start_of_round':
      return doStartOfRound(state);
    case 'boss_intent_reveal':
      return doBossIntentReveal(state);
    case 'resolving_player':
      // Player action already resolved on submit — advance to boss.
      return transition(state, [], 'resolving_reactions');
    case 'resolving_reactions':
      // Reactions handled inline with the trigger that caused them at B2.
      // Party mode: if more heroes are still pending, cycle back for another
      // command; otherwise it's the boss's turn.
      if (state.pendingActorIds.length > 0) {
        return transition(state, [], 'awaiting_player_action');
      }
      return transition(state, [], 'resolving_boss');
    case 'resolving_boss':
      return doResolveBoss(state);
    case 'end_of_round':
      return doEndOfRound(state);
    case 'checking_phase_transition':
      return doCheckPhaseTransition(state);
    case 'checking_victory':
      return doCheckVictory(state);
  }
}

export function submitPlayerAction(state: BattleState, action: PlayerAction): StepResult {
  if (state.phase !== 'awaiting_player_action') {
    return { state, events: [] };
  }
  const actingActorId = state.pendingActorIds[0];
  const hero = actingActorId
    ? state.heroes.find((h) => h.actorId === actingActorId && !h.defeated)
    : state.heroes.find((h) => !h.defeated);
  if (!hero) {
    return transition({ ...state, pendingActorIds: [] }, [], 'checking_victory');
  }

  const events: BattleEvent[] = [
    { kind: 'player_action_selected', actorId: hero.actorId, action },
  ];

  let next: BattleState = state;

  switch (action.kind) {
    case 'guard': {
      const amount = guardShieldAmount(hero.snapshot.stats.Def.value);
      next = mutateHero(next, hero.actorId, (h) => ({
        ...h,
        shields: [
          ...h.shields,
          { amount, types: [], remainingRounds: 1, sourceActorId: h.actorId },
        ],
        ultimateCharge: clampUltimateCharge(
          h.ultimateCharge + ultimateChargeGain({ guardUsed: true }),
        ),
      }));
      events.push({ kind: 'shield_gained', sourceActorId: hero.actorId, targetActorId: hero.actorId, amount, types: [] });
      events.push({ kind: 'ultimate_charge_changed', actorId: hero.actorId, delta: 5, source: 'guard' });
      break;
    }
    case 'focus': {
      const capacity = Math.max(0, hero.snapshot.maxResource - hero.resource);
      const gained = Math.min(FOCUS_RESOURCE_GAIN, capacity);
      next = mutateHero(next, hero.actorId, (h) => ({
        ...h,
        resource: h.resource + gained,
        ultimateCharge: clampUltimateCharge(
          h.ultimateCharge + ultimateChargeGain({ focusUsed: true }),
        ),
      }));
      events.push({ kind: 'resource_changed', actorId: hero.actorId, delta: gained, source: 'focus' });
      events.push({ kind: 'ultimate_charge_changed', actorId: hero.actorId, delta: 3, source: 'focus' });
      break;
    }
    case 'inspect': {
      // No mechanical effect at B2 — UI-only reveal added in B4.
      break;
    }
    case 'ability': {
      const abilityRef = hero.snapshot.abilities.find(
        (a) => a.definitionId === action.abilityDefinitionId,
      );
      if (!abilityRef) {
        events.push({ kind: 'action_denied', actorId: hero.actorId, reason: 'invalid_target' });
        break;
      }
      const denial = validateAbilityUsable(hero, abilityRef.version);
      if (denial) {
        events.push({ kind: 'action_denied', actorId: hero.actorId, reason: denial });
        break;
      }
      const resourceCost = abilityRef.version.resourceCost;
      const isUltimate = abilityRef.slot === 'ultimate';

      next = mutateHero(next, hero.actorId, (h) => ({
        ...h,
        resource: h.resource - resourceCost,
        ultimateCharge: isUltimate ? 0 : h.ultimateCharge,
        cooldowns: [
          ...h.cooldowns,
          {
            abilityDefinitionId: abilityRef.definitionId,
            remainingRounds: (abilityRef.version.cooldownRounds ?? 0) + 1,
          },
        ],
      }));
      if (resourceCost > 0) {
        events.push({ kind: 'resource_changed', actorId: hero.actorId, delta: -resourceCost, source: 'ability_cost' });
      }
      events.push({
        kind: 'cooldown_started',
        actorId: hero.actorId,
        abilityDefinitionId: abilityRef.definitionId,
        rounds: abilityRef.version.cooldownRounds ?? 0,
      });

      // Target resolution is reducer-owned (not client-supplied) so any RNG
      // a rule consumes (random_enemy) lands in the deterministic replay log.
      // The one exception is single_ally, where the UI already collected a
      // player pick — resolveTargetRule trusts/validates that pick.
      const targetResolution = resolveTargetRule(
        next,
        hero.actorId,
        abilityRef.version.targetRule,
        action.targetActorIds,
      );
      if (targetResolution.nextRngCursor !== undefined) {
        next = { ...next, rngCursor: targetResolution.nextRngCursor };
      }

      const outcome = resolveAbilityEffects(
        next,
        hero.actorId,
        targetResolution.targetActorIds,
        abilityRef,
      );
      next = outcome.state;
      events.push(...outcome.events);
      break;
    }
  }

  const remaining = next.pendingActorIds.filter((id) => id !== hero.actorId);
  return transition({ ...next, pendingActorIds: remaining }, events, 'resolving_reactions');
}

/* ------------------------------------------------------------------ */
/*  Phase implementations                                              */
/* ------------------------------------------------------------------ */

function doStartOfRound(state: BattleState): StepResult {
  const newRound = state.round + 1;
  const events: BattleEvent[] = [{ kind: 'round_started', round: newRound }];
  return transition({ ...state, round: newRound }, events, 'boss_intent_reveal');
}

function doBossIntentReveal(state: BattleState): StepResult {
  const currentPhase = state.boss.snapshot.phases.find((p) => p.id === state.boss.currentPhaseId);
  if (!currentPhase) {
    return transition(state, [], 'awaiting_player_action');
  }

  const availableActions = currentPhase.actions
    .filter((a) => !state.boss.actionCooldowns.some((c) => c.abilityDefinitionId === a.id))
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  if (availableActions.length === 0) {
    // Default fallback: use the highest-priority action even if on cooldown to avoid dead turn.
    availableActions.push(...currentPhase.actions.slice().sort((a, b) => b.priority - a.priority));
  }

  const chosen = availableActions[0];
  const livingHero = state.heroes.find((h) => !h.defeated);
  const targetActorIds = livingHero ? [livingHero.actorId] : [];

  const intent: BattleIntent = {
    actionId: chosen.id,
    intentType: chosen.intentType,
    telegraphText: chosen.telegraphText,
    targetActorIds,
    interruptible: chosen.interruptible,
  };

  const events: BattleEvent[] = [
    { kind: 'boss_intent_declared', round: state.round, intent },
  ];

  const pendingActorIds = state.heroes
    .filter((h) => !h.defeated)
    .map((h) => h.actorId);

  return transition(
    { ...state, boss: { ...state.boss, currentIntent: intent }, pendingActorIds },
    events,
    'awaiting_player_action',
  );
}

function doResolveBoss(state: BattleState): StepResult {
  if (state.boss.defeated || !state.boss.currentIntent) {
    return transition(state, [], 'end_of_round');
  }

  const currentPhase = state.boss.snapshot.phases.find((p) => p.id === state.boss.currentPhaseId);
  const action = currentPhase?.actions.find((a) => a.id === state.boss.currentIntent!.actionId);
  if (!action) {
    return transition(state, [], 'end_of_round');
  }

  // Interrupt check — enough damage in the same round on an interruptible
  // action cancels its damage. Cooldown still consumes so the boss doesn't
  // get soft-locked into the same interruptible action forever; it rotates
  // to another action next round.
  if (action.interruptible) {
    const dealt = damageToBossSinceIntent(state);
    const threshold = Math.max(
      1,
      Math.floor(state.boss.snapshot.maxHp * INTERRUPT_DAMAGE_THRESHOLD),
    );
    if (dealt >= threshold) {
      const events: BattleEvent[] = [
        { kind: 'action_denied', actorId: state.boss.actorId, reason: 'interrupted' },
      ];
      const nextInterrupted: BattleState = {
        ...state,
        boss: {
          ...state.boss,
          actionCooldowns: [
            ...state.boss.actionCooldowns,
            {
              abilityDefinitionId: action.id,
              remainingRounds: action.cooldownRounds + 1,
            },
          ],
          currentIntent: null,
        },
      };
      return transition(nextInterrupted, events, 'end_of_round');
    }
  }

  // Retarget: focus > declared target > highest-HP living hero. Focus lets
  // a hero pull aggro deliberately; the death-fallback removes the exploit
  // where killing the declared target skipped the boss's turn.
  const intent = state.boss.currentIntent!;
  // Taunt outranks everything, including a hero's own Focus — that is the
  // whole point of standing in front. Ties break on lane order, never on RNG,
  // so the choice stays replayable.
  let target: HeroCombatant | undefined = state.heroes.find(
    (h) => !h.defeated && h.statuses.some((st) => st.statusId === 'taunt'),
  );
  const focusedId = focusedActorIdThisRound(state);
  if (!target && focusedId) {
    target = state.heroes.find((h) => h.actorId === focusedId && !h.defeated);
  }
  if (!target) {
    const declared = state.heroes.find((h) => h.actorId === intent.targetActorIds[0]);
    if (declared && !declared.defeated) target = declared;
  }
  if (!target) {
    const alive = state.heroes.filter((h) => !h.defeated).sort((a, b) => b.hp - a.hp);
    target = alive[0];
  }
  if (!target) {
    // Party wiped between intent and resolution — nothing to hit.
    return transition(state, [], 'end_of_round');
  }

  // B2 boss actions ship as raw parameters keyed on intentType, not full AbilityEffect
  // arrays (BossActionSnapshot is a lighter shape than AbilityVersion). We map
  // the small set of intent types the fire elemental uses.
  const events: BattleEvent[] = [];
  let next: BattleState = state;

  const bossBaseDamage = action.baseDamage + Math.floor(action.scalingPerRound * state.round);
  if (bossBaseDamage > 0) {
    const dmg = resolveDamage({
      baseAmount: bossBaseDamage,
      // Authored per action. Was hardcoded 'fire' for every boss in the game,
      // which made hero elemental resistance meaningless and every future
      // boss a reskin of this one.
      damageType: action.damageType,
      targetMitigation: Math.floor(target.snapshot.stats.Def.value / 5),
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: target.shields,
    });
    next = applyDamageToHero(next, target.actorId, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
      sourceActorId: state.boss.actorId,
      damageType: dmg.damageType,
    });
  }

  // Add the used action to the boss's cooldown table.
  next = {
    ...next,
    boss: {
      ...next.boss,
      actionCooldowns: [
        ...next.boss.actionCooldowns,
        {
          abilityDefinitionId: action.id,
          remainingRounds: action.cooldownRounds + 1,
        },
      ],
      currentIntent: null,
    },
  };

  return transition(next, events, 'end_of_round');
}

/** Sum damage dealt to the boss between the most recent `boss_intent_declared`
 *  event and now. Used to check interrupt thresholds. */
function damageToBossSinceIntent(state: BattleState): number {
  let sum = 0;
  let counting = false;
  for (const e of state.log) {
    if (e.kind === 'boss_intent_declared') {
      sum = 0;
      counting = true;
      continue;
    }
    if (!counting) continue;
    if (e.kind === 'damage_dealt' && e.targetActorId === state.boss.actorId) {
      sum += e.amount;
    }
  }
  return sum;
}

/** Return the actorId of the last hero to `focus` this round, or null.
 *  Focusing "draws aggro" — the boss retargets to that hero this round. */
function focusedActorIdThisRound(state: BattleState): string | null {
  let last: string | null = null;
  let inRound = false;
  for (const e of state.log) {
    if (e.kind === 'round_started') {
      last = null;
      inRound = true;
      continue;
    }
    if (!inRound) continue;
    if (e.kind === 'player_action_selected' && e.action.kind === 'focus') {
      const hero = state.heroes.find((h) => h.actorId === e.actorId);
      if (hero && !hero.defeated) last = e.actorId;
    }
  }
  return last;
}

function doEndOfRound(state: BattleState): StepResult {
  let next = state;
  const events: BattleEvent[] = [];

  // Damage-over-time and regeneration resolve BEFORE the duration decrement,
  // so a status with one round left still gets its final tick.
  //
  // One tick point per round rather than per actor turn: the boss acts once a
  // round while heroes act up to three times, so per-turn ticking would make
  // a DoT on the party fire three times as often as the same DoT on the boss.
  next = applyDotTicks(next, events);
  next = applyRegeneration(next, events);

  // Statuses: duration decrement + expiry.
  next = {
    ...next,
    heroes: next.heroes.map((h) => tickHeroStatuses(h, events)),
    boss: tickBossStatuses(next.boss, events),
  };

  // Cooldowns tick.
  next = {
    ...next,
    heroes: next.heroes.map((h) => ({ ...h, cooldowns: tickCooldowns(h.cooldowns) })),
    boss: { ...next.boss, actionCooldowns: tickCooldowns(next.boss.actionCooldowns) },
  };

  // Shields expire.
  next = {
    ...next,
    heroes: next.heroes.map((h) => ({ ...h, shields: expireShields(h.shields) })),
    boss: { ...next.boss, shields: expireShields(next.boss.shields) },
  };

  // Resource regen (mana/tech).
  next = {
    ...next,
    heroes: next.heroes.map((h) => {
      if (h.defeated) return h;
      const room = Math.max(0, h.snapshot.maxResource - h.resource);
      const gained = Math.min(RESOURCE_REGEN_PER_ROUND, room);
      if (gained > 0) {
        events.push({ kind: 'resource_changed', actorId: h.actorId, delta: gained, source: 'regen' });
      }
      return { ...h, resource: h.resource + gained };
    }),
  };

  return transition(next, events, 'checking_phase_transition');
}

function doCheckPhaseTransition(state: BattleState): StepResult {
  const boss = state.boss;
  const hpPct = boss.hp / boss.snapshot.maxHp;
  const currentPhaseIdx = boss.snapshot.phases.findIndex((p) => p.id === boss.currentPhaseId);
  const nextPhase = boss.snapshot.phases[currentPhaseIdx + 1];

  if (!nextPhase) return transition(state, [], 'checking_victory');

  if (hpPct <= nextPhase.healthThresholdStart) {
    const events: BattleEvent[] = [
      { kind: 'phase_transition', fromPhaseId: boss.currentPhaseId, toPhaseId: nextPhase.id },
    ];
    let next = { ...state, boss: { ...boss, currentPhaseId: nextPhase.id } };
    // Phase transition grants ult charge to all living heroes.
    next = {
      ...next,
      heroes: next.heroes.map((h) => {
        if (h.defeated) return h;
        const delta = ultimateChargeGain({ bossPhaseTransition: true });
        events.push({ kind: 'ultimate_charge_changed', actorId: h.actorId, delta, source: 'boss_phase' });
        return { ...h, ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta) };
      }),
    };
    return transition(next, events, 'checking_victory');
  }
  return transition(state, [], 'checking_victory');
}

function doCheckVictory(state: BattleState): StepResult {
  const events: BattleEvent[] = [];
  if (state.boss.hp <= 0) {
    const result: BattleState['result'] = {
      outcome: 'victory',
      roundsElapsed: state.round,
      heroesSurviving: state.heroes.filter((h) => !h.defeated).length,
    };
    events.push({ kind: 'battle_ended', result: result! });
    return { state: { ...state, phase: 'battle_over', result, log: [...state.log, ...events], step: state.step + 1 }, events };
  }
  const allDefeated = state.heroes.every((h) => h.defeated);
  if (allDefeated) {
    const result: BattleState['result'] = {
      outcome: 'defeat',
      roundsElapsed: state.round,
      cause: 'party_wipe',
    };
    events.push({ kind: 'battle_ended', result: result! });
    return { state: { ...state, phase: 'battle_over', result, log: [...state.log, ...events], step: state.step + 1 }, events };
  }
  if (state.round >= TIMEOUT_ROUND_CAP) {
    const result: BattleState['result'] = {
      outcome: 'defeat',
      roundsElapsed: state.round,
      cause: 'timeout',
    };
    events.push({ kind: 'battle_ended', result: result! });
    return { state: { ...state, phase: 'battle_over', result, log: [...state.log, ...events], step: state.step + 1 }, events };
  }
  return transition(state, events, 'start_of_round');
}

/* ------------------------------------------------------------------ */
/*  Ability effect resolution                                          */
/* ------------------------------------------------------------------ */

function validateAbilityUsable(
  hero: HeroCombatant,
  version: AbilityVersion,
): 'insufficient_resource' | 'on_cooldown' | 'stunned' | 'silenced' | null {
  // Stun costs the NEXT ACTION, not a whole round. Against a three-hero party
  // a full-turn skip would prevent roughly an ultimate's worth of damage,
  // which is far too much for a single status.
  if (hero.statuses.some((st) => st.statusId === 'stunned')) return 'stunned';
  if (hero.statuses.some((st) => st.statusId === 'silenced')) return 'silenced';
  if (hero.cooldowns.some((c) => c.abilityDefinitionId === version.abilityId)) {
    return 'on_cooldown';
  }
  if (version.resourceCost > hero.resource) {
    return 'insufficient_resource';
  }
  return null;
}

/**
 * The damage type one effect actually deals.
 *
 * The ONLY place this decision is made. `previewAbilityDamage` and
 * `resolveAbilityEffects` must both route through here, or the number shown
 * in the pre-commit UI drifts from the number the hit actually deals — an
 * invariant `previewAbilityDamage`'s own doc comment depends on.
 *
 * `damageTypeSource: 'element'` swaps in the hero's frozen element type (see
 * `HeroSnapshot.elementDamageType`); everything else uses the type the
 * ability was authored with.
 */
function effectDamageType(
  effect: { damageType?: DamageType },
  version: AbilityVersion,
  hero: HeroCombatant,
): DamageType {
  return version.damageTypeSource === 'element'
    ? hero.snapshot.elementDamageType
    : effect.damageType ?? 'physical';
}

/**
 * Preview the direct-damage total an ability would deal to the boss right
 * now, using the exact same math + resistance lookup as `resolveAbilityEffects`
 * so the pre-commit UI preview never drifts from the real outcome. Read-only —
 * does not touch shields/state. Returns null if the ability has no
 * direct_damage effect (e.g. a pure heal/shield/status ability).
 */
export function previewAbilityDamage(
  state: BattleState,
  hero: HeroCombatant,
  ability: AbilityCombatSnapshot,
): number | null {
  const resistance = bossResistance(state);
  let total = 0;
  let any = false;
  for (const effect of ability.version.effects) {
    if (effect.type !== 'direct_damage') continue;
    any = true;
    const dmg = resolveDamage({
      baseAmount: effect.amount,
      damageType: effectDamageType(effect, ability.version, hero),
      scaling: effect.scaling,
      attackerStats: hero.snapshot.stats,
      targetMitigation: 0,
      targetResistance: resistance,
      targetShields: state.boss.shields,
    });
    total += dmg.postShieldAmount;
  }
  return any ? total : null;
}

function resolveAbilityEffects(
  state: BattleState,
  actorId: string,
  targetActorIds: readonly string[],
  ability: AbilityCombatSnapshot,
): StepResult {
  let next = state;
  const events: BattleEvent[] = [];
  const version = ability.version;

  /**
   * Every point of damage this ACTION has dealt so far.
   *
   * `lifesteal` reads this instead of reverse-scanning the event log for the
   * last `damage_dealt`, which it used to do. That was fragile two ways: it
   * silently healed nothing unless authored directly after a damage effect,
   * and after an area attack it stole from only the final target hit.
   */
  let damageThisAction = 0;

  /**
   * One damage instance against one target — the single path all damage takes.
   *
   * direct_damage, multi_hit and conditional_bonus all route through here so
   * mitigation, resistance, shields, status multipliers, ultimate charge and
   * the lifesteal accumulator can never drift apart between them.
   */
  const dealOneHit = (
    targetId: string,
    baseAmount: number,
    damageType: DamageType,
    scaling: ScalingRule | undefined,
  ): void => {
    const hero = next.heroes.find((h) => h.actorId === actorId);
    if (!hero) return;
    const target = resolveTarget(next, targetId);
    if (!target) return;
    const targetResistance =
      target.kind === 'boss' ? bossResistance(next) : heroResistance(target.actor.snapshot);
    const targetMitigation =
      target.kind === 'boss' ? 0 : Math.floor(target.actor.snapshot.stats.Def.value / 5);
    const mods = statusDamageModifiers(hero.statuses, target.actor.statuses, damageType);
    const dmg = resolveDamage({
      baseAmount,
      damageType,
      scaling,
      attackerStats: hero.snapshot.stats,
      targetMitigation,
      targetResistance,
      targetShields: target.actor.shields,
      outgoingMultiplier: mods.outgoingMultiplier,
      incomingMultiplier: mods.incomingMultiplier,
    });
    next =
      target.kind === 'boss'
        ? applyDamageToBoss(next, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
            sourceActorId: actorId,
            damageType: dmg.damageType,
          })
        : applyDamageToHero(next, targetId, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
            sourceActorId: actorId,
            damageType: dmg.damageType,
          });
    damageThisAction += dmg.postShieldAmount;

    const delta = ultimateChargeGain({ damageDealt: dmg.postShieldAmount });
    if (delta > 0) {
      next = mutateHero(next, actorId, (h) => ({
        ...h,
        ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
      }));
      events.push({ kind: 'ultimate_charge_changed', actorId, delta, source: 'damage_dealt' });
    }
  };

  for (const [effectIndex, effect] of version.effects.entries()) {
    switch (effect.type) {
      case 'direct_damage': {
        const hero = next.heroes.find((h) => h.actorId === actorId)!;
        const damageType = effectDamageType(effect, version, hero);
        for (const targetId of targetActorIds) {
          dealOneHit(targetId, effect.amount, damageType, effect.scaling);
        }
        break;
      }
      case 'multi_hit': {
        const hero = next.heroes.find((h) => h.actorId === actorId)!;
        const damageType = effectDamageType(effect, version, hero);
        // Deliberately N separate hits rather than one aggregate: each is
        // independently floored at 1, independently checked against shields
        // (so a shield can break partway through a flurry), and emits its own
        // `damage_dealt` so the VFX layer can render every strike.
        for (let hit = 0; hit < effect.hitCount; hit++) {
          for (const targetId of targetActorIds) {
            dealOneHit(targetId, effect.amountPerHit, damageType, effect.scaling);
          }
        }
        break;
      }
      case 'healing': {
        for (const targetId of targetActorIds) {
          const hero = next.heroes.find((h) => h.actorId === targetId);
          if (!hero || hero.defeated) continue;
          const heal = resolveHeal(effect.amount, hero.hp, hero.snapshot.maxHp);
          if (heal.actualAmount > 0) {
            next = mutateHero(next, targetId, (h) => ({ ...h, hp: h.hp + heal.actualAmount }));
            events.push({ kind: 'healing_applied', sourceActorId: actorId, targetActorId: targetId, amount: heal.actualAmount, overheal: heal.overheal });
          }
        }
        break;
      }
      case 'shielding': {
        for (const targetId of targetActorIds) {
          const hero = next.heroes.find((h) => h.actorId === targetId);
          if (!hero || hero.defeated) continue;
          next = mutateHero(next, targetId, (h) => ({
            ...h,
            shields: [
              ...h.shields,
              {
                amount: effect.amount,
                types: [],
                remainingRounds: effect.duration ?? Infinity,
                sourceActorId: actorId,
              },
            ],
          }));
          events.push({ kind: 'shield_gained', sourceActorId: actorId, targetActorId: targetId, amount: effect.amount, types: [] });
        }
        break;
      }
      case 'apply_status': {
        for (const targetId of targetActorIds) {
          const instance: StatusInstance = {
            // Includes the effect index: two statuses applied to one target
            // in a single step would otherwise collide on id, and instanceId
            // is what `remove_status` and the tick key off.
            instanceId: `st_${state.step}_${effectIndex}_${effect.status.statusId}_${targetId}`,
            statusId: effect.status.statusId,
            sourceActorId: actorId,
            application: effect.status,
            remainingRounds: effect.status.duration,
            stacks: effect.status.stacks ?? 1,
          };
          if (targetId === next.boss.actorId) {
            next = addStatus(next, targetId, instance);
            // Ult charge from applying status to boss.
            const delta = ultimateChargeGain({ statusAppliedToBoss: true });
            next = mutateHero(next, actorId, (h) => ({
              ...h,
              ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
            }));
            events.push({ kind: 'ultimate_charge_changed', actorId, delta, source: 'status_applied' });
          } else {
            next = addStatus(next, targetId, instance);
          }
          events.push({
            kind: 'status_applied',
            sourceActorId: actorId,
            targetActorId: targetId,
            statusId: instance.statusId,
            instanceId: instance.instanceId,
            duration: instance.remainingRounds,
          });
        }
        break;
      }
      case 'resource_gain': {
        const hero = next.heroes.find((h) => h.actorId === actorId);
        if (!hero || hero.defeated) break;
        const capacity = Math.max(0, hero.snapshot.maxResource - hero.resource);
        const gained = Math.min(effect.amount, capacity);
        if (gained > 0) {
          next = mutateHero(next, actorId, (h) => ({ ...h, resource: h.resource + gained }));
          events.push({ kind: 'resource_changed', actorId, delta: gained, source: 'ability_gain' });
        }
        break;
      }
      case 'ultimate_charge_gain': {
        next = mutateHero(next, actorId, (h) => ({
          ...h,
          ultimateCharge: clampUltimateCharge(h.ultimateCharge + effect.amount),
        }));
        events.push({ kind: 'ultimate_charge_changed', actorId, delta: effect.amount, source: 'ability_effect' });
        break;
      }
      case 'lifesteal': {
        // Steals from everything this action dealt — across every hit of a
        // flurry and every target of an area attack, not just the last one.
        if (damageThisAction <= 0) break;
        const heal = Math.floor(damageThisAction * effect.percentOfDamage);
        const hero = next.heroes.find((h) => h.actorId === actorId);
        if (!hero || heal <= 0) break;
        const healResult = resolveHeal(heal, hero.hp, hero.snapshot.maxHp);
        if (healResult.actualAmount > 0) {
          next = mutateHero(next, actorId, (h) => ({ ...h, hp: h.hp + healResult.actualAmount }));
          events.push({ kind: 'healing_applied', sourceActorId: actorId, targetActorId: actorId, amount: healResult.actualAmount, overheal: healResult.overheal });
        }
        break;
      }
      case 'damage_over_time': {
        // Deals nothing now. It plants a status carrying its own per-tick
        // damage and type, resolved HERE at application time rather than at
        // tick time — the caster may be dead by the time it burns.
        const hero = next.heroes.find((h) => h.actorId === actorId)!;
        // A DoT effect carries no damageType, so it burns as its STATUS says:
        // burn is fire, bleed is physical, poison is nature. Defaulting to
        // fire here meant the fire-resistant boss halved incoming BLEED.
        // Element-typed abilities still override, per damageTypeSource.
        const damageType = effectDamageType(
          { damageType: STATUS_DAMAGE_TYPE[effect.statusId] ?? 'physical' },
          version,
          hero,
        );
        for (const targetId of targetActorIds) {
          const instance: StatusInstance = {
            instanceId: `st_${state.step}_${effectIndex}_${effect.statusId}_${targetId}`,
            statusId: effect.statusId,
            sourceActorId: actorId,
            application: {
              statusId: effect.statusId,
              duration: effect.duration,
              stacks: 1,
              amountPerTick: effect.amountPerTick,
              damageType,
            },
            remainingRounds: effect.duration,
            stacks: 1,
          };
          next = addStatus(next, targetId, instance);
          events.push({
            kind: 'status_applied',
            sourceActorId: actorId,
            targetActorId: targetId,
            statusId: instance.statusId,
            instanceId: instance.instanceId,
            duration: instance.remainingRounds,
          });
        }
        break;
      }
      case 'remove_status': {
        for (const targetId of targetActorIds) {
          const target = resolveTarget(next, targetId);
          if (!target) continue;
          const doomed = target.actor.statuses.filter((st) => {
            const def = STATUS_CATALOG[st.statusId];
            if (!def) return false;
            return effect.category === 'any' || def.category === effect.category;
          });
          if (doomed.length === 0) continue;
          const removed = doomed.slice(0, effect.count ?? doomed.length);
          const removedIds = new Set(removed.map((st) => st.instanceId));
          next = setStatuses(
            next,
            targetId,
            target.actor.statuses.filter((st) => !removedIds.has(st.instanceId)),
          );
          for (const st of removed) {
            events.push({
              kind: 'status_removed',
              targetActorId: targetId,
              instanceId: st.instanceId,
              reason: 'cleansed',
            });
          }
        }
        break;
      }
      case 'guard': {
        // A reduction, not a shield: it scales down what lands rather than
        // absorbing a fixed pool, so it stays useful against a big hit.
        for (const targetId of targetActorIds) {
          const instance: StatusInstance = {
            instanceId: `st_${state.step}_${effectIndex}_guarded_${targetId}`,
            statusId: 'guarded',
            sourceActorId: actorId,
            application: {
              statusId: 'guarded',
              duration: effect.duration,
              stacks: 1,
              reductionPercent: effect.reductionPercent,
            },
            remainingRounds: effect.duration,
            stacks: 1,
          };
          next = addStatus(next, targetId, instance);
          events.push({
            kind: 'status_applied',
            sourceActorId: actorId,
            targetActorId: targetId,
            statusId: 'guarded',
            instanceId: instance.instanceId,
            duration: instance.remainingRounds,
          });
        }
        break;
      }
      case 'taunt': {
        // Applied to the CASTER — taunt is "hit me instead", so it is the
        // taunter who carries the status. `doResolveBoss` checks for it.
        const instance: StatusInstance = {
          instanceId: `st_${state.step}_${effectIndex}_taunt_${actorId}`,
          statusId: 'taunt',
          sourceActorId: actorId,
          application: { statusId: 'taunt', duration: effect.duration, stacks: 1 },
          remainingRounds: effect.duration,
          stacks: 1,
        };
        next = addStatus(next, actorId, instance);
        events.push({
          kind: 'status_applied',
          sourceActorId: actorId,
          targetActorId: actorId,
          statusId: 'taunt',
          instanceId: instance.instanceId,
          duration: instance.remainingRounds,
        });
        break;
      }
      case 'conditional_bonus': {
        const hero = next.heroes.find((h) => h.actorId === actorId)!;
        if (!conditionHolds(next, hero, effect.condition)) break;
        // Nested effects, resolved inline. Only the shapes the roster
        // actually authors are handled; anything else is ignored rather than
        // half-applied, and the validator is where unsupported nesting should
        // be caught.
        for (const inner of effect.effects) {
          if (inner.type === 'direct_damage') {
            const damageType = effectDamageType(inner, version, hero);
            for (const targetId of targetActorIds) {
              dealOneHit(targetId, inner.amount, damageType, inner.scaling);
            }
          } else if (inner.type === 'healing') {
            for (const targetId of targetActorIds) {
              const target = next.heroes.find((h) => h.actorId === targetId);
              if (!target || target.defeated) continue;
              const heal = resolveHeal(inner.amount, target.hp, target.snapshot.maxHp);
              if (heal.actualAmount <= 0) continue;
              next = mutateHero(next, targetId, (h) => ({ ...h, hp: h.hp + heal.actualAmount }));
              events.push({
                kind: 'healing_applied',
                sourceActorId: actorId,
                targetActorId: targetId,
                amount: heal.actualAmount,
                overheal: heal.overheal,
              });
            }
          }
        }
        break;
      }
      case 'summon':
        // Out of scope deliberately: multiple enemies would change the combat
        // contract (targeting, the event log, the whole single-boss
        // assumption in doResolveBoss), not just this switch.
        break;
      default:
        break;
    }
  }

  // Focus is spent by the ability it sharpened, win or lose. Consumed after
  // the whole effect list so a multi-effect ability gets one buffed action,
  // not one buffed effect.
  const caster = next.heroes.find((h) => h.actorId === actorId);
  if (caster && caster.statuses.some((st) => st.statusId === 'focus')) {
    const spent = caster.statuses.filter((st) => st.statusId === 'focus');
    next = setStatuses(next, actorId, caster.statuses.filter((st) => st.statusId !== 'focus'));
    for (const st of spent) {
      events.push({
        kind: 'status_removed',
        targetActorId: actorId,
        instanceId: st.instanceId,
        reason: 'expired',
      });
    }
  }

  return { state: next, events };
}

/**
 * Burn, bleed, poison and friends.
 *
 * Ticks respect RESISTANCE — burning a fire-resistant boss is deliberately
 * bad, which keeps the element system honest — but bypass mitigation and
 * shields: a poison is already inside you, armour has nothing to bite on.
 *
 * Ultimate charge from a tick is HALVED. At full rate a stack of three DoTs
 * would passively generate an ultimate every couple of rounds with no play
 * behind it.
 *
 * Ticks CAN kill. Victory is checked immediately after end-of-round, so a
 * boss finished off by a burn resolves cleanly rather than surviving at 3 hp.
 */
function applyDotTicks(state: BattleState, events: BattleEvent[]): BattleState {
  let next = state;

  const tickFor = (
    targetId: string,
    statuses: readonly StatusInstance[],
    resistance: ResistanceProfile,
    isBoss: boolean,
  ) => {
    for (const st of statuses) {
      const perTick = st.application.amountPerTick;
      if (!perTick) continue;
      const damageType = st.application.damageType ?? 'fire';
      const multiplier = resistance.resistant.includes(damageType)
        ? 0.5
        : resistance.weak.includes(damageType)
        ? 1.5
        : 1;
      const amount = Math.max(1, Math.floor(perTick * st.stacks * multiplier));

      next = isBoss
        ? applyDamageToBoss(next, amount, 0, [], {
            sourceActorId: st.sourceActorId,
            damageType,
          })
        : applyDamageToHero(next, targetId, amount, 0, [], {
            sourceActorId: st.sourceActorId,
            damageType,
          });

      events.push({
        kind: 'dot_ticked',
        sourceActorId: st.sourceActorId,
        targetActorId: targetId,
        statusId: st.statusId,
        instanceId: st.instanceId,
        amount,
        damageType,
      });

      const source = next.heroes.find((h) => h.actorId === st.sourceActorId);
      if (source && !source.defeated) {
        const delta = Math.floor(ultimateChargeGain({ damageDealt: amount }) / 2);
        if (delta > 0) {
          next = mutateHero(next, st.sourceActorId, (h) => ({
            ...h,
            ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
          }));
          events.push({
            kind: 'ultimate_charge_changed',
            actorId: st.sourceActorId,
            delta,
            source: 'dot_tick',
          });
        }
      }
    }
  };

  // Heroes in lane order, then the boss — a fixed order, never re-sorted, so
  // the event log replays identically.
  for (const hero of next.heroes) {
    if (hero.defeated) continue;
    tickFor(hero.actorId, hero.statuses, heroResistance(hero.snapshot), false);
  }
  if (next.boss.hp > 0) {
    tickFor(next.boss.actorId, next.boss.statuses, bossResistance(next), true);
  }

  return next;
}

/** Regeneration heals a share of MAX hp so it stays meaningful on a tanky
 *  hero instead of decaying into rounding noise. */
function applyRegeneration(state: BattleState, events: BattleEvent[]): BattleState {
  let next = state;
  for (const hero of next.heroes) {
    if (hero.defeated) continue;
    const stacks = Math.min(
      REGENERATION_MAX_STACKS,
      hero.statuses.filter((st) => st.statusId === 'regeneration').reduce((n, st) => n + st.stacks, 0),
    );
    if (stacks <= 0) continue;
    const amount = Math.floor(hero.snapshot.maxHp * REGENERATION_PER_STACK * stacks);
    const heal = resolveHeal(amount, hero.hp, hero.snapshot.maxHp);
    if (heal.actualAmount <= 0) continue;
    next = mutateHero(next, hero.actorId, (h) => ({ ...h, hp: h.hp + heal.actualAmount }));
    events.push({
      kind: 'healing_applied',
      sourceActorId: hero.actorId,
      targetActorId: hero.actorId,
      amount: heal.actualAmount,
      overheal: heal.overheal,
    });
  }
  return next;
}

/**
 * Add a status to whichever combatant owns `targetId`, honouring the
 * catalog's `stackBehavior` and `maxStacks`.
 *
 * This is load-bearing, not bookkeeping. Without it every cast of a
 * damage-over-time ability appends ANOTHER independent instance that ticks on
 * its own, so a hero spamming one ability accumulates unbounded burn and the
 * fight collapses. `STATUS_CATALOG` has always declared these rules; nothing
 * read them until statuses became mechanical.
 *
 *   'stack'   — merge into the existing instance, up to maxStacks, and
 *               refresh the duration so a topped-up stack does not expire on
 *               the older application's clock.
 *   'refresh' — keep one instance, reset its duration, take the stronger
 *               application.
 *   'ignore'  — first application wins; re-applying does nothing.
 */
function addStatus(state: BattleState, targetId: string, instance: StatusInstance): BattleState {
  const def = STATUS_CATALOG[instance.statusId];
  const behavior = def?.stackBehavior ?? 'stack';
  const maxStacks = def?.maxStacks ?? 1;

  const merge = (existing: StatusInstance[]): StatusInstance[] => {
    const idx = existing.findIndex((st) => st.statusId === instance.statusId);
    if (idx === -1) return [...existing, instance];

    const current = existing[idx];
    if (behavior === 'ignore') return existing;

    const next = [...existing];
    if (behavior === 'stack') {
      next[idx] = {
        ...current,
        stacks: Math.min(maxStacks, current.stacks + instance.stacks),
        remainingRounds: Math.max(current.remainingRounds, instance.remainingRounds),
        // Take the stronger tick so a weak re-application can't dilute a
        // strong one, and keep the ORIGINAL source so kill credit is stable.
        application: {
          ...current.application,
          amountPerTick: Math.max(
            current.application.amountPerTick ?? 0,
            instance.application.amountPerTick ?? 0,
          ) || undefined,
        },
      };
    } else {
      next[idx] = {
        ...current,
        stacks: Math.min(maxStacks, Math.max(current.stacks, instance.stacks)),
        remainingRounds: Math.max(current.remainingRounds, instance.remainingRounds),
        application: instance.application,
      };
    }
    return next;
  };

  if (targetId === state.boss.actorId) {
    return { ...state, boss: { ...state.boss, statuses: merge(state.boss.statuses) } };
  }
  return mutateHero(state, targetId, (h) => ({ ...h, statuses: merge(h.statuses) }));
}

/** Replace a combatant's whole status list. */
function setStatuses(
  state: BattleState,
  targetId: string,
  statuses: StatusInstance[],
): BattleState {
  if (targetId === state.boss.actorId) {
    return { ...state, boss: { ...state.boss, statuses } };
  }
  return mutateHero(state, targetId, (h) => ({ ...h, statuses }));
}

/**
 * Evaluate an ability condition. Unknown condition types resolve FALSE — a
 * conditional bonus that silently always fired would be a balance hole that
 * never surfaced as an error.
 */
function conditionHolds(
  state: BattleState,
  hero: HeroCombatant,
  condition: AbilityCondition,
): boolean {
  switch (condition.type) {
    case 'boss_hp_below_threshold':
      return state.boss.hp / state.boss.snapshot.maxHp <= condition.percent;
    case 'user_hp_below_threshold':
      return hero.hp / hero.snapshot.maxHp <= condition.percent;
    case 'target_has_status':
      return state.boss.statuses.some((st) => st.statusId === condition.statusId);
    case 'user_has_status':
      return hero.statuses.some((st) => st.statusId === condition.statusId);
    case 'resource_above_threshold':
      return hero.resource >= condition.amount;
    case 'shield_active':
      return condition.on === 'target'
        ? state.boss.shields.length > 0
        : hero.shields.length > 0;
    // 'summon_exists' can never hold — summoning is out of scope — and
    // 'family_ability_used_earlier' needs per-battle usage history the state
    // does not carry. Both resolve false rather than silently true.
    default:
      return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

function transition(state: BattleState, events: BattleEvent[], phase: TurnPhase): StepResult {
  const nextState: BattleState = {
    ...state,
    phase,
    step: state.step + 1,
    log: events.length > 0 ? [...state.log, ...events] : state.log,
  };
  return { state: nextState, events };
}

function mutateHero(state: BattleState, actorId: string, fn: (h: HeroCombatant) => HeroCombatant): BattleState {
  return {
    ...state,
    heroes: state.heroes.map((h) => (h.actorId === actorId ? fn(h) : h)),
  };
}

function resolveTarget(
  state: BattleState,
  actorId: string,
): { kind: 'hero'; actor: HeroCombatant } | { kind: 'boss'; actor: BossCombatant } | null {
  if (actorId === state.boss.actorId) return { kind: 'boss', actor: state.boss };
  const h = state.heroes.find((x) => x.actorId === actorId);
  return h ? { kind: 'hero', actor: h } : null;
}

/**
 * The boss's resistances, read from its frozen snapshot.
 *
 * Was a `bossId.startsWith('boss_fire_elemental')` string check, which meant
 * an authored `resistanceProfile` did nothing and every boss other than the
 * Wraith was resistance-neutral regardless of its data.
 */
export function bossResistance(state: BattleState): ResistanceProfile {
  return state.boss.snapshot.resistance ?? NEUTRAL_RESISTANCE;
}

function applyDamageToHero(
  state: BattleState,
  targetId: string,
  amount: number,
  shieldAbsorbed: number,
  events: BattleEvent[],
  meta: { sourceActorId: string; damageType: import('../../types/abilities').DamageType },
): BattleState {
  let next = state;
  const hero = next.heroes.find((h) => h.actorId === targetId);
  if (!hero) return next;

  // Consume shields.
  next = mutateHero(next, targetId, (h) => ({
    ...h,
    shields: consumeShields(h.shields, shieldAbsorbed, meta.damageType),
  }));

  const newHp = Math.max(0, hero.hp - amount);
  next = mutateHero(next, targetId, (h) => ({
    ...h,
    hp: newHp,
    defeated: newHp <= 0,
  }));

  events.push({
    kind: 'damage_dealt',
    sourceActorId: meta.sourceActorId,
    targetActorId: targetId,
    amount,
    damageType: meta.damageType,
    blockedByShield: shieldAbsorbed,
  });

  // Thorns. Reflected as `true` damage on purpose: it neither takes a second
  // resistance pass nor re-triggers the attacker's own thorns into a loop.
  // Covers ALL damage types, not just physical — the only boss in the game
  // deals fire, so a physical-only reflect would be a dead pick.
  const thornsStacks = hero.statuses
    .filter((st) => st.statusId === 'thorns')
    .reduce((n, st) => n + st.stacks, 0);
  if (thornsStacks > 0 && amount > 0 && meta.sourceActorId === next.boss.actorId) {
    const reflected = Math.max(1, Math.floor(amount * THORNS_REFLECT_SHARE * thornsStacks));
    next = applyDamageToBoss(next, reflected, 0, events, {
      sourceActorId: targetId,
      damageType: 'true',
    });
  }

  // Ult charge for damage received.
  const total = amount + shieldAbsorbed;
  const delta = ultimateChargeGain({ damageReceived: total });
  if (delta > 0 && !hero.defeated) {
    next = mutateHero(next, targetId, (h) => ({
      ...h,
      ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
    }));
    events.push({ kind: 'ultimate_charge_changed', actorId: targetId, delta, source: 'damage_received' });
  }

  if (newHp <= 0) {
    events.push({ kind: 'actor_defeated', actorId: targetId });
  }
  return next;
}

function applyDamageToBoss(
  state: BattleState,
  amount: number,
  shieldAbsorbed: number,
  events: BattleEvent[],
  meta: { sourceActorId: string; damageType: import('../../types/abilities').DamageType },
): BattleState {
  const boss = state.boss;
  const newHp = Math.max(0, boss.hp - amount);
  const next: BattleState = {
    ...state,
    boss: {
      ...boss,
      hp: newHp,
      defeated: newHp <= 0,
      shields: consumeShields(boss.shields, shieldAbsorbed, meta.damageType),
    },
  };
  events.push({
    kind: 'damage_dealt',
    sourceActorId: meta.sourceActorId,
    targetActorId: boss.actorId,
    amount,
    damageType: meta.damageType,
    blockedByShield: shieldAbsorbed,
  });
  if (newHp <= 0) events.push({ kind: 'actor_defeated', actorId: boss.actorId });
  return next;
}

function consumeShields(
  pools: readonly import('../../types/combat').ShieldPool[],
  absorbedTotal: number,
  damageType: import('../../types/abilities').DamageType,
) {
  let remaining = absorbedTotal;
  return pools
    .map((p) => {
      if (remaining <= 0) return p;
      if (p.types.length > 0 && !p.types.includes(damageType)) return p;
      const consume = Math.min(p.amount, remaining);
      remaining -= consume;
      return { ...p, amount: p.amount - consume };
    })
    .filter((p) => p.amount > 0);
}

function expireShields(pools: readonly import('../../types/combat').ShieldPool[]) {
  return pools
    .map((p) => ({ ...p, remainingRounds: p.remainingRounds - 1 }))
    .filter((p) => p.remainingRounds > 0);
}

function tickHeroStatuses(hero: HeroCombatant, events: BattleEvent[]): HeroCombatant {
  const nextStatuses = hero.statuses
    .map((s) => ({ ...s, remainingRounds: s.remainingRounds - 1 }))
    .filter((s) => {
      if (s.remainingRounds <= 0) {
        events.push({ kind: 'status_removed', targetActorId: hero.actorId, instanceId: s.instanceId, reason: 'expired' });
        return false;
      }
      return true;
    });
  return { ...hero, statuses: nextStatuses };
}

function tickBossStatuses(boss: BossCombatant, events: BattleEvent[]): BossCombatant {
  const nextStatuses = boss.statuses
    .map((s) => ({ ...s, remainingRounds: s.remainingRounds - 1 }))
    .filter((s) => {
      if (s.remainingRounds <= 0) {
        events.push({ kind: 'status_removed', targetActorId: boss.actorId, instanceId: s.instanceId, reason: 'expired' });
        return false;
      }
      return true;
    });
  return { ...boss, statuses: nextStatuses };
}


/**
 * Helper for callers that want to expose "is a hero currently able to act?"
 * to their UI. Used by the harness policy layer and by the encounter screen.
 */
export function pickActingHero(state: BattleState): HeroCombatant | null {
  const actingId = state.pendingActorIds[0];
  if (actingId) {
    return state.heroes.find((h) => h.actorId === actingId && !h.defeated) ?? null;
  }
  return state.heroes.find((h) => !h.defeated) ?? null;
}

/**
 * Submit a batch of party commands in lane order. Convenience wrapper for
 * tests and scripted play. The reducer processes each command with a fresh
 * `submitPlayerAction` call; between calls we keep phase == awaiting_player_action
 * by re-advancing through resolving_reactions when necessary.
 */
export function submitPartyCommands(
  start: BattleState,
  actions: readonly PlayerAction[],
): StepResult {
  let state = start;
  const events: BattleEvent[] = [];
  for (const action of actions) {
    if (state.phase !== 'awaiting_player_action') break;
    const step = submitPlayerAction(state, action);
    state = step.state;
    events.push(...step.events);
    // Fast-forward through resolving_reactions so the next iteration lands
    // back in awaiting_player_action for the next hero, if any.
    while (state.phase === 'resolving_reactions') {
      const adv = advance(state);
      state = adv.state;
      events.push(...adv.events);
    }
  }
  return { state, events };
}

import type {
  AbilityEffect,
  AbilityVersion,
} from '../../types/abilities';
import type {
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
  FIRE_ELEMENTAL_RESISTANCE,
  NEUTRAL_RESISTANCE,
  clampUltimateCharge,
  deriveHeroStats,
  guardShieldAmount,
  FOCUS_RESOURCE_GAIN,
  resolveDamage,
  resolveHeal,
  tickCooldowns,
  ultimateChargeGain,
  type ResistanceProfile,
} from './formulas';

/**
 * Battle reducer — pure, deterministic, synchronous. See §2 of
 * card-engine-boss-battle-spec.md for turn phase order and §12 for the
 * snapshot-immutable rule.
 *
 * Effects supported at B2: direct_damage, healing, shielding, apply_status,
 * resource_gain, lifesteal, ultimate_charge_gain. Broader coverage lands
 * in B4 alongside the vertical slice.
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

const TIMEOUT_ROUND_CAP = 30;

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
  const hero = state.heroes.find((h) => !h.defeated);
  if (!hero) {
    return transition(state, [], 'checking_victory');
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

      const outcome = resolveAbilityEffects(next, hero.actorId, action, abilityRef.version.effects);
      next = outcome.state;
      events.push(...outcome.events);
      break;
    }
  }

  return transition(next, events, 'resolving_reactions');
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
  };

  const events: BattleEvent[] = [
    { kind: 'boss_intent_declared', round: state.round, intent },
  ];

  return transition(
    { ...state, boss: { ...state.boss, currentIntent: intent } },
    events,
    'awaiting_player_action',
  );
}

function doResolveBoss(state: BattleState): StepResult {
  if (state.boss.defeated || !state.boss.currentIntent) {
    return transition(state, [], 'end_of_round');
  }
  const target = state.heroes.find((h) => h.actorId === state.boss.currentIntent!.targetActorIds[0]);
  if (!target || target.defeated) {
    return transition(state, [], 'end_of_round');
  }

  const currentPhase = state.boss.snapshot.phases.find((p) => p.id === state.boss.currentPhaseId);
  const action = currentPhase?.actions.find((a) => a.id === state.boss.currentIntent!.actionId);
  if (!action) {
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
      damageType: 'fire',
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

function doEndOfRound(state: BattleState): StepResult {
  let next = state;
  const events: BattleEvent[] = [];

  // Statuses: tick DoT + duration decrement.
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
      const regen = 1;
      const room = Math.max(0, h.snapshot.maxResource - h.resource);
      const gained = Math.min(regen, room);
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
): 'insufficient_resource' | 'on_cooldown' | null {
  if (hero.cooldowns.some((c) => c.abilityDefinitionId === version.abilityId)) {
    return 'on_cooldown';
  }
  if (version.resourceCost > hero.resource) {
    return 'insufficient_resource';
  }
  return null;
}

function resolveAbilityEffects(
  state: BattleState,
  actorId: string,
  action: PlayerAction & { kind: 'ability' },
  effects: readonly AbilityEffect[],
): StepResult {
  let next = state;
  const events: BattleEvent[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'direct_damage': {
        const targetId = action.targetActorIds[0] ?? state.boss.actorId;
        const hero = next.heroes.find((h) => h.actorId === actorId)!;
        const target = resolveTarget(next, targetId);
        if (!target || target.kind !== 'boss') break;
        const dmg = resolveDamage({
          baseAmount: effect.amount,
          damageType: effect.damageType ?? 'physical',
          scaling: effect.scaling,
          attackerStats: hero.snapshot.stats,
          targetMitigation: 0,
          targetResistance: bossResistance(next),
          targetShields: next.boss.shields,
        });
        next = applyDamageToBoss(next, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
          sourceActorId: actorId,
          damageType: dmg.damageType,
        });
        // Ultimate charge from damage dealt.
        const delta = ultimateChargeGain({ damageDealt: dmg.postShieldAmount });
        if (delta > 0) {
          next = mutateHero(next, actorId, (h) => ({
            ...h,
            ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
          }));
          events.push({ kind: 'ultimate_charge_changed', actorId, delta, source: 'damage_dealt' });
        }
        break;
      }
      case 'healing': {
        const hero = next.heroes.find((h) => h.actorId === actorId);
        if (!hero || hero.defeated) break;
        const heal = resolveHeal(effect.amount, hero.hp, hero.snapshot.maxHp);
        if (heal.actualAmount > 0) {
          next = mutateHero(next, actorId, (h) => ({ ...h, hp: h.hp + heal.actualAmount }));
          events.push({ kind: 'healing_applied', sourceActorId: actorId, targetActorId: actorId, amount: heal.actualAmount, overheal: heal.overheal });
        }
        break;
      }
      case 'shielding': {
        const hero = next.heroes.find((h) => h.actorId === actorId);
        if (!hero || hero.defeated) break;
        next = mutateHero(next, actorId, (h) => ({
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
        events.push({ kind: 'shield_gained', sourceActorId: actorId, targetActorId: actorId, amount: effect.amount, types: [] });
        break;
      }
      case 'apply_status': {
        const targetId = action.targetActorIds[0] ?? state.boss.actorId;
        const instance: StatusInstance = {
          instanceId: `st_${state.step}_${effect.status.statusId}`,
          statusId: effect.status.statusId,
          sourceActorId: actorId,
          application: effect.status,
          remainingRounds: effect.status.duration,
          stacks: effect.status.stacks ?? 1,
        };
        if (targetId === next.boss.actorId) {
          next = {
            ...next,
            boss: { ...next.boss, statuses: [...next.boss.statuses, instance] },
          };
          // Ult charge from applying status to boss.
          const delta = ultimateChargeGain({ statusAppliedToBoss: true });
          next = mutateHero(next, actorId, (h) => ({
            ...h,
            ultimateCharge: clampUltimateCharge(h.ultimateCharge + delta),
          }));
          events.push({ kind: 'ultimate_charge_changed', actorId, delta, source: 'status_applied' });
        } else {
          next = mutateHero(next, targetId, (h) => ({ ...h, statuses: [...h.statuses, instance] }));
        }
        events.push({
          kind: 'status_applied',
          sourceActorId: actorId,
          targetActorId: targetId,
          statusId: instance.statusId,
          instanceId: instance.instanceId,
          duration: instance.remainingRounds,
        });
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
        // Piggybacks on preceding damage this action. We look at the last damage_dealt event.
        const lastDamage = [...events].reverse().find((e) => e.kind === 'damage_dealt') as
          | (BattleEvent & { kind: 'damage_dealt' })
          | undefined;
        if (!lastDamage) break;
        const heal = Math.floor(lastDamage.amount * effect.percentOfDamage);
        const hero = next.heroes.find((h) => h.actorId === actorId);
        if (!hero || heal <= 0) break;
        const healResult = resolveHeal(heal, hero.hp, hero.snapshot.maxHp);
        if (healResult.actualAmount > 0) {
          next = mutateHero(next, actorId, (h) => ({ ...h, hp: h.hp + healResult.actualAmount }));
          events.push({ kind: 'healing_applied', sourceActorId: actorId, targetActorId: actorId, amount: healResult.actualAmount, overheal: healResult.overheal });
        }
        break;
      }
      default:
        // Unsupported at B2 — silently skip. B4 expands the switch.
        break;
    }
  }

  return { state: next, events };
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

function bossResistance(state: BattleState): ResistanceProfile {
  // B2 hardcodes fire-elemental profile via bossId prefix. B3 pulls from BossDefinition.
  if (state.boss.snapshot.bossId.startsWith('boss_fire_elemental')) {
    return FIRE_ELEMENTAL_RESISTANCE;
  }
  return NEUTRAL_RESISTANCE;
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
  return state.heroes.find((h) => !h.defeated) ?? null;
}

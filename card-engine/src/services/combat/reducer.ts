import type {
  AbilityCondition,
  StatusApplication,
  AbilityVersion,
  DamageType,
  ScalingRule,
} from '../../types/abilities';
import { STATUS_CATALOG, STATUS_DAMAGE_TYPE } from '../../data/abilities/statuses';
import { resolveTargetRule } from './targeting';
import { RandomStream } from './RandomStream';
import type {
  AbilityCombatSnapshot,
  BossActionSnapshot,
  BattleEvent,
  BattleIntent,
  BossTargetScope,
  BossChargeSpec,
  PendingCharge,
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
  STRIKE_RESOURCE_GAIN,
  strikeDamage,
  deriveChamberMax,
  ULTIMATE_CHARGE_MAX,
  resolveDamage,
  resolveHeal,
  tickCooldowns,
  ultimateChargeGain,
  type ResistanceProfile,
  statusDamageModifiers,
  REGENERATION_PER_STACK,
  REGENERATION_MAX_STACKS,
  BOSS_REGENERATION_PER_STACK,
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
export const INTERRUPT_DAMAGE_THRESHOLD = 0.15;

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

  const openingPhase = snapshot.boss.phases[0];
  const boss: BossCombatant = {
    actorId: 'boss_0',
    snapshot: snapshot.boss,
    hp: snapshot.boss.maxHp,
    currentPhaseId: openingPhase.id,
    actionCooldowns: [],
    statuses: [],
    shields: [],
    defeated: false,
    currentIntent: null,
    pendingCharge: null,
  };

  const opening: BattleState = {
    snapshot,
    round: 0,
    step: 0,
    rngCursor: 0,
    heroes,
    boss,
    phase: 'start_of_round',
    pendingActorIds: [],
    // Chambers start FULL, matching the old per-hero rule (`resource:
    // derived.maxResource`). Opening a fight with an empty pool would force a
    // wasted first round of nothing but strikes.
    partyResource: deriveChamberMax(
      heroes.map((h) => ({
        maxResource: h.snapshot.maxResource,
        resourceType: h.snapshot.resourceType,
      })),
    ),
    partyResourceMax: deriveChamberMax(
      heroes.map((h) => ({
        maxResource: h.snapshot.maxResource,
        resourceType: h.snapshot.resourceType,
      })),
    ),
    log: [
      { kind: 'battle_started', at: snapshot.createdAt, snapshotId: snapshot.battleId },
    ],
    result: null,
  };

  // Nothing TRANSITIONS into phase 0, so its passives have to be applied here
  // or a boss whose first phase regenerates would not start doing so until it
  // dropped into its second. Routed through the same helper as a real
  // transition rather than hand-built, so the catalog's stacking caps apply —
  // building the instances inline let an authored `stacks: 9` through against
  // regeneration's maximum of 3.
  const openingEvents: BattleEvent[] = [];
  const withPassives = applyPhasePassives(opening, openingPhase, openingEvents);
  return openingEvents.length > 0
    ? { ...withPassives, log: [...withPassives.log, ...openingEvents] }
    : withPassives;
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
    case 'strike': {
      // The generator. Light damage into the boss, resource into the caster's
      // chamber. Routed through the same `resolveDamage` path as everything
      // else so mitigation, resistance and shields all still apply — a basic
      // attack that ignored the defensive layer would be a second damage
      // system.
      const chamber = hero.snapshot.resourceType;
      const mods = statusDamageModifiers(hero.statuses, next.boss.statuses, 'kinetic');
      const dmg = resolveDamage({
        baseAmount: strikeDamage(hero.snapshot.stats.Atk.value),
        damageType: 'kinetic',
        targetMitigation: 0,
        targetResistance: bossResistance(next),
        targetShields: next.boss.shields,
        outgoingMultiplier: mods.outgoingMultiplier,
        incomingMultiplier: mods.incomingMultiplier,
      });
      next = applyDamageToBoss(next, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
        sourceActorId: hero.actorId,
        damageType: dmg.damageType,
        sourceActionId: 'strike',
      });

      const room = Math.max(0, next.partyResourceMax[chamber] - next.partyResource[chamber]);
      const gained = Math.min(STRIKE_RESOURCE_GAIN, room);
      next = {
        ...next,
        partyResource: { ...next.partyResource, [chamber]: next.partyResource[chamber] + gained },
      };
      next = mutateHero(next, hero.actorId, (h) => ({
        ...h,
        ultimateCharge: clampUltimateCharge(
          h.ultimateCharge + ultimateChargeGain({ damageDealt: dmg.postShieldAmount }),
        ),
      }));
      if (gained > 0) {
        events.push({ kind: 'resource_changed', actorId: hero.actorId, delta: gained, source: 'strike' });
      }
      break;
    }
    case 'wait': {
      // An explicit pass, never an automatic substitute for a denied action.
      // It consumes this hero's command slot but intentionally produces no
      // damage, resource, charge, status, guard, or action-kind trigger.
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
      const denial = validateAbilityUsable(hero, abilityRef, next);
      if (denial) {
        events.push({ kind: 'action_denied', actorId: hero.actorId, reason: denial });
        // The hero KEEPS their turn. Falling through to the pendingActorIds
        // drain below meant a refused action still burned the round — and with
        // a shared pool that is far worse than it was per-hero, because
        // another hero can empty the chamber between deciding and clicking.
        return { state: { ...next, log: [...next.log, ...events] }, events };
      }
      const resourceCost = abilityRef.version.resourceCost;
      const isUltimate = abilityRef.slot === 'ultimate';
      const chamber = hero.snapshot.resourceType;

      // Cost comes out of the PARTY chamber. `hero.resource` is mirrored down
      // in step with it so the per-hero readouts and
      // `resource_above_threshold` conditions keep telling the truth.
      next = {
        ...next,
        partyResource: {
          ...next.partyResource,
          [chamber]: Math.max(0, next.partyResource[chamber] - resourceCost),
        },
      };
      next = mutateHero(next, hero.actorId, (h) => ({
        ...h,
        resource: Math.max(0, h.resource - resourceCost),
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

/**
 * At or above this priority, an action fires the instant it is off cooldown
 * rather than entering the weighted draw. Reserved for ultimates, charges and
 * the shield — the moves the party is supposed to be able to plan around.
 */
const DETERMINISTIC_PRIORITY = 30;

/**
 * Who an action reaches. `area_attack` still sweeps without authoring a scope,
 * because seed actions predating `targetScope` rely on the intent NAME meaning
 * that; new actions should say what they mean.
 */
function scopeOf(action: BossActionSnapshot): BossTargetScope {
  return action.targetScope ?? (action.intentType === 'area_attack' ? 'all_heroes' : 'single');
}

/**
 * Resolve an action's scope against the living party.
 *
 * Shared by intent reveal and boss resolution so the telegraph cannot lie
 * about who is about to be hit. It used to exist only at resolution time,
 * while reveal declared `heroes.find(h => !h.defeated)` — the first living
 * hero, every single round, whatever the action's scope said. That is why the
 * boss appeared to attack party slot 0 forever: not a targeting preference,
 * just an unconditional array index.
 *
 * `anchorActorId` is the already-resolved single target (taunt > focus >
 * declared). `lowest_hp` deliberately honours it: a tank standing in front
 * answers an execute, and letting the snipe reach past a taunt would make the
 * party's one counterplay useless.
 */
function heroesInScope(
  heroes: readonly HeroCombatant[],
  scope: BossTargetScope,
  anchorActorId: string | null,
): HeroCombatant[] {
  const alive = heroes.filter((h) => !h.defeated);
  if (alive.length === 0) return [];
  const anchored = anchorActorId ? alive.find((h) => h.actorId === anchorActorId) : undefined;
  switch (scope) {
    case 'all_heroes':
      return alive;
    case 'lowest_hp':
      return [anchored ?? [...alive].sort((a, b) => a.hp - b.hp)[0]];
    case 'highest_hp':
      return [[...alive].sort((a, b) => b.hp - a.hp)[0]];
    case 'single':
    default:
      return [anchored ?? alive[0]];
  }
}

/**
 * Pick this round's action.
 *
 * Two tiers, on purpose. Anything at `DETERMINISTIC_PRIORITY` or above fires
 * as soon as it is available, so the ultimates and the shield arrive on a
 * rhythm the party can learn and build against. Everything below is a weighted
 * seeded draw, so the filler between them never settles into a loop.
 *
 * Returns the chosen action and the cursor the roll consumed. Selecting off
 * the seeded stream keeps replay determinism: same seed, same fight.
 */
function chooseBossAction(
  candidates: readonly BossActionSnapshot[],
  seed: number,
  rngCursor: number,
): { action: BossActionSnapshot | null; nextRngCursor: number } {
  if (candidates.length === 0) return { action: null, nextRngCursor: rngCursor };

  const scripted = candidates
    .filter((a) => a.priority >= DETERMINISTIC_PRIORITY)
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
  if (scripted.length > 0) return { action: scripted[0], nextRngCursor: rngCursor };

  // Sorted before drawing so the candidate order — and therefore which action
  // a given roll maps to — never depends on authoring order in the seed file.
  const filler = [...candidates].sort((a, b) => a.id.localeCompare(b.id));
  const weights = filler.map((a) => Math.max(0, a.weight ?? 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    return { action: filler[0], nextRngCursor: rngCursor };
  }

  const rng = new RandomStream(seed, rngCursor);
  let roll = rng.next() * total;
  for (const [i, action] of filler.entries()) {
    roll -= weights[i];
    if (roll < 0) return { action, nextRngCursor: rng.cursor };
  }
  return { action: filler[filler.length - 1], nextRngCursor: rng.cursor };
}

function doBossIntentReveal(state: BattleState): StepResult {
  const currentPhase = state.boss.snapshot.phases.find((p) => p.id === state.boss.currentPhaseId);
  if (!currentPhase) {
    return transition(state, [], 'awaiting_player_action');
  }

  // A charge that has finished counting down PRE-EMPTS the normal action
  // pick — it was declared rounds ago and the party has been playing against
  // it since, so it must land on the round it promised to land on. Resolving
  // it as "the intent this round" also means it flows through the existing
  // intent → telegraph → resolve path rather than needing a second one.
  const maturedCharge =
    state.boss.pendingCharge && state.boss.pendingCharge.roundsRemaining <= 0
      ? state.boss.pendingCharge
      : null;

  let availableActions = currentPhase.actions
    .filter((a) => !state.boss.actionCooldowns.some((c) => c.abilityDefinitionId === a.id))
    // Never start a second charge while one is already running. Two
    // overlapping charges would give the player two bars to read and no way
    // to tell which telegraph belonged to which.
    .filter((a) => !(a.charge && state.boss.pendingCharge));

  if (availableActions.length === 0) {
    // Default fallback: everything is on cooldown, so reuse the full list
    // rather than burning the turn on nothing.
    availableActions = currentPhase.actions.filter((a) => !(a.charge && state.boss.pendingCharge));
  }

  let rngCursor = state.rngCursor;
  let chosen: BossActionSnapshot | null;
  if (maturedCharge) {
    // A charge whose action has vanished (a phase transition swapped the list
    // out from under it) still must not strand the boss on a null turn.
    chosen =
      currentPhase.actions.find((a) => a.id === maturedCharge.actionId) ??
      availableActions[0] ??
      null;
  } else {
    const pick = chooseBossAction(availableActions, state.snapshot.seed, rngCursor);
    chosen = pick.action;
    rngCursor = pick.nextRngCursor;
  }
  const pendingActorIds = state.heroes
    .filter((h) => !h.defeated)
    .map((h) => h.actorId);

  // Every action in the phase is a charge that is already running. Rare, but
  // reachable on a single-action phase — the boss simply keeps charging.
  if (!chosen) {
    return transition({ ...state, rngCursor, pendingActorIds }, [], 'awaiting_player_action');
  }

  // Declare against the action's real scope. For a single-target action the
  // victim is drawn off the seeded stream rather than taken as "whoever is
  // first in the party array" — the old behaviour, which meant one hero
  // absorbed the entire fight while the other two were never threatened.
  const scope = scopeOf(chosen);
  const living = state.heroes.filter((h) => !h.defeated);
  let anchorActorId: string | null = null;
  if (scope === 'single' && living.length > 0) {
    const rng = new RandomStream(state.snapshot.seed, rngCursor);
    anchorActorId = rng.pick(living).actorId;
    rngCursor = rng.cursor;
  }
  const targetActorIds = heroesInScope(state.heroes, scope, anchorActorId).map(
    (h) => h.actorId,
  );

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

  // Beginning a charge. The boss spends this whole turn winding up and deals
  // no damage — that forfeited turn IS the price of the charge, and it is
  // what stops a charged ultimate from being strictly better than attacking.
  const startingCharge = chosen.charge && !state.boss.pendingCharge;
  const nextPendingCharge: PendingCharge | null = startingCharge
    ? {
        actionId: chosen.id,
        roundsRemaining: chosen.charge!.rounds,
        progress: 0,
        targetActorIds,
        startedRound: state.round,
      }
    : state.boss.pendingCharge;

  return transition(
    {
      ...state,
      rngCursor,
      boss: { ...state.boss, currentIntent: intent, pendingCharge: nextPendingCharge },
      pendingActorIds,
    },
    events,
    'awaiting_player_action',
  );
}

function doResolveBoss(state: BattleState): StepResult {
  if (state.boss.defeated || !state.boss.currentIntent) {
    return transition(state, [], 'end_of_round');
  }

  const charging = state.boss.pendingCharge;
  // The wind-up turn itself. The charge was declared this round and has not
  // matured, so the boss does nothing else — no damage, no cooldown consumed.
  // `currentIntent` is cleared so the next round's reveal is free to pick a
  // normal action while the charge keeps counting in the background.
  if (charging && charging.startedRound === state.round && charging.roundsRemaining > 0) {
    return transition(
      { ...state, boss: { ...state.boss, currentIntent: null } },
      [],
      'end_of_round',
    );
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

  // Boss actions ship as raw parameters keyed on intentType rather than full
  // AbilityEffect arrays — BossActionSnapshot is a lighter shape than
  // AbilityVersion. Until 2026-07-28 this switch did not exist at all: every
  // intent, including `area_attack` and `execute`, fell through the same
  // single-target damage path, so the ten declared intent types were one
  // behaviour wearing ten names.
  const events: BattleEvent[] = [];
  let next: BattleState = state;

  // A charge that has come due. Progress toward the break condition either
  // cancels it outright or scales its damage down linearly — see
  // BossChargeSpec.partialMitigationMax for why "almost" has to be worth
  // something.
  const resolvingCharge =
    action.charge && charging && charging.actionId === action.id && charging.roundsRemaining <= 0
      ? charging
      : null;
  let chargeMultiplier = 1;
  if (resolvingCharge && action.charge) {
    const progress = evaluateChargeProgress(state, resolvingCharge, action.charge);
    if (progress >= 1) {
      // Broken. The action is spent and deals nothing.
      const brokenEvents: BattleEvent[] = [
        { kind: 'action_denied', actorId: state.boss.actorId, reason: 'interrupted' },
      ];
      return transition(
        {
          ...state,
          boss: {
            ...state.boss,
            pendingCharge: null,
            currentIntent: null,
            actionCooldowns: [
              ...state.boss.actionCooldowns,
              { abilityDefinitionId: action.id, remainingRounds: action.cooldownRounds + 1 },
            ],
          },
        },
        brokenEvents,
        'end_of_round',
      );
    }
    chargeMultiplier = 1 - progress * action.charge.partialMitigationMax;
  }

  const bossBaseDamage = Math.round(
    (action.baseDamage + Math.floor(action.scalingPerRound * state.round)) * chargeMultiplier,
  );

  /** One boss hit against one hero. `multiplier` carries the execute bonus. */
  const strike = (hero: HeroCombatant, multiplier = 1) => {
    const mods = statusDamageModifiers(next.boss.statuses, hero.statuses, action.damageType);
    const dmg = resolveDamage({
      baseAmount: Math.round(bossBaseDamage * multiplier),
      // Authored per action. Was hardcoded 'searing' for every boss in the game,
      // which made hero elemental resistance meaningless and every future
      // boss a reskin of this one.
      damageType: action.damageType,
      targetMitigation: Math.floor(hero.snapshot.stats.Def.value / 5),
      targetResistance: NEUTRAL_RESISTANCE,
      targetShields: hero.shields,
      // The boss's OWN statuses, which until now were passed as `[]` — so
      // every buff a boss could give itself (rage from `enrage_prep`, any
      // phase `passiveStatuses` that touched damage) was silently discarded
      // and the whole self-buff half of the status system did nothing on the
      // boss side. `outgoingMultiplier` is likewise now actually applied;
      // reading the boss's statuses and then dropping the result on the floor
      // would have been the same bug wearing a longer argument list.
      incomingMultiplier: mods.incomingMultiplier,
      outgoingMultiplier: mods.outgoingMultiplier,
    });
    next = applyDamageToHero(next, hero.actorId, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
      sourceActorId: state.boss.actorId,
      damageType: dmg.damageType,
      sourceActionId: action.id,
    });
  };

  // Who this action actually hits. Same helper the intent reveal used, so the
  // telegraph and the blow agree. `target` here is the post-retarget anchor
  // (taunt > focus > declared > highest-HP), which `lowest_hp` deliberately
  // honours — a tank standing in front answers an execute.
  const scope: BossTargetScope = scopeOf(action);
  // Re-read `next.heroes` on every call: earlier hits in the same sweep can
  // kill a hero, and a corpse must not take the rest of the volley.
  const resolveScopeTargets = () => heroesInScope(next.heroes, scope, target!.actorId);

  /** Apply an action's `statusApplications` to one hero — curse/vulnerability. */
  const applyActionStatuses = (heroId: string) => {
    for (const [i, application] of (action.statusApplications ?? []).entries()) {
      const instance: StatusInstance = {
        instanceId: `st_boss_${action.id}_${state.round}_${heroId}_${i}`,
        statusId: application.statusId,
        sourceActorId: state.boss.actorId,
        application,
        remainingRounds: application.duration,
        stacks: application.stacks ?? 1,
      };
      next = addStatus(next, heroId, instance);
      events.push({
        kind: 'status_applied',
        sourceActorId: state.boss.actorId,
        targetActorId: heroId,
        statusId: instance.statusId,
        instanceId: instance.instanceId,
        duration: instance.remainingRounds,
      });
    }
  };

  /** Apply an action's `selfStatuses` to the boss — the whole of `enrage_prep`. */
  const applySelfStatuses = () => {
    for (const [i, application] of (action.selfStatuses ?? []).entries()) {
      const instance: StatusInstance = {
        instanceId: `st_bossself_${action.id}_${state.round}_${i}`,
        statusId: application.statusId,
        sourceActorId: state.boss.actorId,
        application,
        remainingRounds: application.duration,
        stacks: application.stacks ?? 1,
      };
      next = addStatus(next, next.boss.actorId, instance);
      events.push({
        kind: 'status_applied',
        sourceActorId: state.boss.actorId,
        targetActorId: next.boss.actorId,
        statusId: instance.statusId,
        instanceId: instance.instanceId,
        duration: instance.remainingRounds,
      });
    }
  };

  switch (action.intentType) {
    case 'enrage_prep': {
      // Spends the turn entirely. It deals no damage BY DESIGN — the cost of
      // the buff is the hit the boss didn't take, which is what keeps it a
      // readable telegraph ("the next ones hurt more") rather than a free
      // strictly-better attack.
      applySelfStatuses();
      break;
    }
    case 'curse':
    case 'vulnerability': {
      // Both are "apply a status, maybe chip"; they differ only in WHICH
      // status the data carries, so they share one implementation rather
      // than two identical branches wearing different names.
      for (const hero of resolveScopeTargets()) {
        applyActionStatuses(hero.actorId);
        const live = next.heroes.find((h) => h.actorId === hero.actorId);
        if (bossBaseDamage > 0 && live && !live.defeated) strike(live);
      }
      break;
    }
    case 'execute': {
      // Damage multiplied against a target already below the threshold. The
      // multiplier is applied to the shared base so mitigation, resistance
      // and shields all still run — an execute is a heavier blow, never a
      // bypass of the defensive layer.
      for (const hero of resolveScopeTargets()) {
        const live = next.heroes.find((h) => h.actorId === hero.actorId);
        if (!live || live.defeated) continue;
        const threshold = action.executeThresholdPercent ?? 0;
        const maxHp = live.snapshot.maxHp;
        const isLow = maxHp > 0 && live.hp / maxHp <= threshold;
        strike(live, isLow ? (action.executeMultiplier ?? 1) : 1);
      }
      break;
    }
    case 'area_attack':
    case 'ultimate': {
      // Re-read the hero list per strike so a death mid-sweep is respected.
      applySelfStatuses();
      if (bossBaseDamage > 0) {
        for (const hero of resolveScopeTargets()) {
          const live = next.heroes.find((h) => h.actorId === hero.actorId);
          if (live && !live.defeated) strike(live);
        }
      }
      for (const hero of resolveScopeTargets()) applyActionStatuses(hero.actorId);
      break;
    }
    case 'shield': {
      // `BossCombatant.shields` already existed, was already consumed by
      // applyDamageToBoss and already expired — the only missing piece was a
      // producer, because this intent was never implemented.
      const amount = action.shieldAmount ?? 0;
      if (amount > 0) {
        next = {
          ...next,
          boss: {
            ...next.boss,
            shields: [
              ...next.boss.shields,
              {
                amount,
                types: [],
                remainingRounds: action.shieldDurationRounds ?? 2,
                sourceActorId: state.boss.actorId,
              },
            ],
          },
        };
        events.push({
          kind: 'shield_gained',
          sourceActorId: state.boss.actorId,
          targetActorId: state.boss.actorId,
          amount,
          types: [],
        });
      }
      if (bossBaseDamage > 0) strike(target);
      break;
    }
    default: {
      // heavy_attack, cleanse, and `summon`.
      //
      // `summon` is DELIBERATELY not implemented here. Giving it a behaviour
      // in this switch would mean faking it — a damage spike or a self-shield
      // wearing the name of a mechanic that is supposed to put a second actor
      // on the field. A real summon changes the combat contract (targeting,
      // turn order, the party's action economy, the whole view layer), not
      // this function. Better an honest fallthrough than a lie in the data.
      for (const hero of resolveScopeTargets()) {
        const live = next.heroes.find((h) => h.actorId === hero.actorId);
        if (bossBaseDamage > 0 && live && !live.defeated) strike(live);
      }
      applySelfStatuses();
      for (const hero of resolveScopeTargets()) applyActionStatuses(hero.actorId);
      break;
    }
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
      // Spent. Cleared only when THIS action was the charge that just landed —
      // a normal action resolving mid-charge must leave the countdown alone,
      // or every charge would be cancelled by the boss's own next attack.
      pendingCharge: resolvingCharge ? null : next.boss.pendingCharge,
    },
  };

  return transition(next, events, 'end_of_round');
}

/**
 * How far the party got toward breaking a charge, as 0..1. 1 means broken.
 *
 * Returned as a FRACTION rather than a boolean because partial progress has
 * to pay — a charge that is 70% broken should hit meaningfully softer. A
 * boolean here would make every charge a coin flip the party either wins or
 * eats whole, which is the difference between a puzzle and a tax.
 *
 * Each break kind is a genuinely different question, which is the point: it
 * means knowing the boss is not enough, you need the right party.
 */
export function evaluateChargeProgress(
  state: BattleState,
  charge: PendingCharge,
  spec: BossChargeSpec,
): number {
  switch (spec.break.kind) {
    case 'damage': {
      // Cumulative across the whole window, not per round — so the party can
      // choose between spreading pressure and burst.
      const needed = Math.max(1, state.boss.snapshot.maxHp * spec.break.percentOfMaxHp);
      let dealt = 0;
      let round = 0;
      for (const e of state.log) {
        if (e.kind === 'round_started') round = e.round;
        if (round < charge.startedRound) continue;
        if (e.kind === 'damage_dealt' && e.targetActorId === state.boss.actorId) dealt += e.amount;
      }
      return Math.min(1, dealt / needed);
    }
    case 'status': {
      // Needs the RIGHT party rather than a bigger one — no amount of damage
      // substitutes for landing the status.
      const stacks = state.boss.statuses
        .filter((st) => st.statusId === (spec.break as { statusId: string }).statusId)
        .reduce((n, st) => n + st.stacks, 0);
      return Math.min(1, stacks / Math.max(1, spec.break.stacks));
    }
    case 'party_action': {
      // Coordinated behaviour during the window. This is the condition the
      // hero ability schema cannot express at all — `AbilityCondition` reads
      // self/boss state and has no notion of what the party DID.
      const wanted = spec.break.action;
      const actors = new Set<string>();
      let round = 0;
      for (const e of state.log) {
        if (e.kind === 'round_started') round = e.round;
        if (round < charge.startedRound) continue;
        if (e.kind === 'player_action_selected' && e.action.kind === wanted) actors.add(e.actorId);
      }
      return Math.min(1, actors.size / Math.max(1, spec.break.heroCount));
    }
    case 'dispel': {
      // Binary by nature: the charge carries a status and removing it ends
      // the charge. No partial credit exists to give.
      //
      // Windowed like the other three kinds. It used to scan the WHOLE log,
      // so any dispel earlier in the fight pre-broke every future charge —
      // latent because no shipped boss uses a dispel break yet.
      let cleansed = false;
      let dispelRound = 0;
      for (const e of state.log) {
        if (e.kind === 'round_started') dispelRound = e.round;
        if (dispelRound < charge.startedRound) continue;
        if (e.kind === 'status_removed' && e.reason === 'dispelled') {
          cleansed = true;
          break;
        }
      }
      return cleansed ? 1 : 0;
    }
    default:
      return 0;
  }
}

/** Sum damage dealt to the boss between the most recent `boss_intent_declared`
 *  event and now. Used to check interrupt thresholds. */
export function damageToBossSinceIntent(state: BattleState): number {
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

  // A charge counts down here, alongside cooldowns, so it advances exactly
  // once per round no matter how many hero turns that round contained. Floored
  // at 0 rather than going negative: `roundsRemaining <= 0` is the maturity
  // test in two places, and a value drifting to -3 would still satisfy it
  // while making the state harder to read in a replay.
  if (next.boss.pendingCharge) {
    const remaining = Math.max(0, next.boss.pendingCharge.roundsRemaining - 1);
    next = {
      ...next,
      boss: {
        ...next.boss,
        pendingCharge: { ...next.boss.pendingCharge, roundsRemaining: remaining },
      },
    };
  }

  // Shields expire.
  next = {
    ...next,
    heroes: next.heroes.map((h) => ({ ...h, shields: expireShields(h.shields) })),
    boss: { ...next.boss, shields: expireShields(next.boss.shields) },
  };

  // Resource regen (mana/tech).
  //
  // Feeds BOTH the party chamber and the hero's own mirror. Only the hero
  // mirror was updated when the shared pool landed, which silently deleted the
  // party's entire passive income: the chamber could then be refilled only by
  // `strike`, so parties spent turns generating instead of casting and every
  // fight ran several rounds longer. The balance sweep caught it as floors 2
  // and 3 flipping from winnable to unwinnable.
  //
  // One point per LIVING CONTRIBUTING hero, so a three-hero party's income is
  // unchanged from when each of them regenerated privately.
  const regenByChamber = { mana: 0, tech: 0 };
  next = {
    ...next,
    heroes: next.heroes.map((h) => {
      if (h.defeated) return h;
      const room = Math.max(0, h.snapshot.maxResource - h.resource);
      const gained = Math.min(RESOURCE_REGEN_PER_ROUND, room);
      regenByChamber[h.snapshot.resourceType] += RESOURCE_REGEN_PER_ROUND;
      if (gained > 0) {
        events.push({ kind: 'resource_changed', actorId: h.actorId, delta: gained, source: 'regen' });
      }
      return { ...h, resource: h.resource + gained };
    }),
  };
  next = {
    ...next,
    partyResource: {
      mana: Math.min(next.partyResourceMax.mana, next.partyResource.mana + regenByChamber.mana),
      tech: Math.min(next.partyResourceMax.tech, next.partyResource.tech + regenByChamber.tech),
    },
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
    next = applyPhasePassives(next, nextPhase, events);
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
  ability: AbilityCombatSnapshot,
  state: BattleState,
): 'insufficient_resource' | 'on_cooldown' | 'stunned' | 'silenced' | null {
  const version = ability.version;
  // Stun costs the NEXT ACTION, not a whole round. Against a three-hero party
  // a full-turn skip would prevent roughly an ultimate's worth of damage,
  // which is far too much for a single status.
  if (hero.statuses.some((st) => st.statusId === 'stunned')) return 'stunned';
  if (hero.statuses.some((st) => st.statusId === 'silenced')) return 'silenced';
  if (hero.cooldowns.some((c) => c.abilityDefinitionId === version.abilityId)) {
    return 'on_cooldown';
  }
  // Against the PARTY chamber, not the hero's own pool.
  if (version.resourceCost > state.partyResource[hero.snapshot.resourceType]) {
    return 'insufficient_resource';
  }
  // Ultimates are gated on charge, and that gate now lives in the ENGINE.
  // It was previously enforced only by the ability bar and the harness policy,
  // so `submitPlayerAction` with an uncharged ultimate succeeded and silently
  // reset an already-zero meter — boss-battle-spec §8 says the reducer owns
  // this. Reported as 'on_cooldown': it is the existing "not available yet"
  // reason, and inventing a new one would change a union every consumer
  // switches on.
  if (ability.slot === 'ultimate' && hero.ultimateCharge < ULTIMATE_CHARGE_MAX) {
    return 'on_cooldown';
  }
  return null;
}

/**
 * The damage type one effect actually deals.
 *
 * The ONLY place this decision is made. `resolveAbilityEffects` routes
 * through here; the pre-commit UI no longer has a second copy of this
 * decision to keep in sync — it gets its numbers from `decision/projectAction`,
 * which runs this same function by running the real reducer.
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
    : effect.damageType ?? 'kinetic';
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
            sourceActionId: ability.definitionId,
          })
        : applyDamageToHero(next, targetId, dmg.postShieldAmount, dmg.shieldAbsorbed, events, {
            sourceActorId: actorId,
            damageType: dmg.damageType,
            sourceActionId: ability.definitionId,
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
          { damageType: STATUS_DAMAGE_TYPE[effect.statusId] ?? 'kinetic' },
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
      const damageType = st.application.damageType ?? 'searing';
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
 *  hero instead of decaying into rounding noise.
 *
 *  Applies to the BOSS too. That is the whole of pressure axis F: a boss that
 *  outheals chip damage cannot be ground down, so damage-over-time — which
 *  ticks through regardless — stops being a worse direct-damage and becomes
 *  the answer to a specific fight. */
function applyRegeneration(state: BattleState, events: BattleEvent[]): BattleState {
  let next = state;

  const bossStacks = Math.min(
    REGENERATION_MAX_STACKS,
    next.boss.statuses.filter((st) => st.statusId === 'regeneration').reduce((n, st) => n + st.stacks, 0),
  );
  if (next.boss.hp > 0 && bossStacks > 0) {
    const amount = Math.floor(next.boss.snapshot.maxHp * BOSS_REGENERATION_PER_STACK * bossStacks);
    const healed = Math.min(amount, next.boss.snapshot.maxHp - next.boss.hp);
    if (healed > 0) {
      next = { ...next, boss: { ...next.boss, hp: next.boss.hp + healed } };
      events.push({
        kind: 'healing_applied',
        sourceActorId: next.boss.actorId,
        targetActorId: next.boss.actorId,
        amount: healed,
        overheal: amount - healed,
      });
    }
  }

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
 * Apply a phase's passive statuses to the boss on entry.
 *
 * Routed through `addStatus` so the catalog's stacking behaviour and caps
 * apply exactly as they do for heroes — a phase cannot stack regeneration
 * past its own maximum just because it is a boss.
 */
function applyPhasePassives(
  state: BattleState,
  phase: { id: string; passiveStatuses?: readonly StatusApplication[] },
  events: BattleEvent[],
): BattleState {
  let next = state;
  for (const [i, application] of (phase.passiveStatuses ?? []).entries()) {
    const instance: StatusInstance = {
      instanceId: `st_phase_${phase.id}_${i}_${application.statusId}`,
      statusId: application.statusId,
      sourceActorId: next.boss.actorId,
      application,
      remainingRounds: application.duration,
      stacks: application.stacks ?? 1,
    };
    next = addStatus(next, next.boss.actorId, instance);
    events.push({
      kind: 'status_applied',
      sourceActorId: next.boss.actorId,
      targetActorId: next.boss.actorId,
      statusId: instance.statusId,
      instanceId: instance.instanceId,
      duration: instance.remainingRounds,
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
    // Clamp on FIRST application too, not only when merging. The cap used to
    // be enforced solely on the merge path, so an ability (or a boss phase
    // passive) authored with `stacks: 9` sailed straight past a catalog
    // maximum of 3 simply by being the first one applied.
    const clamped: StatusInstance =
      instance.stacks > maxStacks ? { ...instance, stacks: maxStacks } : instance;
    if (idx === -1) return [...existing, clamped];

    const current = existing[idx];
    if (behavior === 'ignore') return existing;

    const next = [...existing];
    if (behavior === 'stack') {
      next[idx] = {
        ...current,
        stacks: Math.min(maxStacks, current.stacks + clamped.stacks),
        remainingRounds: Math.max(current.remainingRounds, instance.remainingRounds),
        // Take the stronger tick so a weak re-application can't dilute a
        // strong one, and keep the ORIGINAL source so kill credit is stable.
        application: {
          ...current.application,
          amountPerTick: Math.max(
            current.application.amountPerTick ?? 0,
            clamped.application.amountPerTick ?? 0,
          ) || undefined,
        },
      };
    } else {
      next[idx] = {
        ...current,
        stacks: Math.min(maxStacks, Math.max(current.stacks, clamped.stacks)),
        remainingRounds: Math.max(current.remainingRounds, instance.remainingRounds),
        application: clamped.application,
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
  meta: {
    sourceActorId: string;
    damageType: import('../../types/abilities').DamageType;
    /** Boss action id or hero ability id — carried so the view can draw THIS
     *  attack rather than a generic bolt. See `damage_dealt` in types/combat. */
    sourceActionId?: string;
  },
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
    ...(meta.sourceActionId ? { sourceActionId: meta.sourceActionId } : {}),
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
  meta: {
    sourceActorId: string;
    damageType: import('../../types/abilities').DamageType;
    /** Boss action id or hero ability id — carried so the view can draw THIS
     *  attack rather than a generic bolt. See `damage_dealt` in types/combat. */
    sourceActionId?: string;
  },
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
    ...(meta.sourceActionId ? { sourceActionId: meta.sourceActionId } : {}),
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

export interface PlannedPartyCommand {
  actorId: string;
  action: PlayerAction;
}

/**
 * Commit an explicitly-addressed party plan in canonical card order.
 *
 * Planning lives above the reducer and does not mutate combat state. At the
 * release boundary this helper binds each saved command back to its hero,
 * while still routing every consequence through `submitPlayerAction`. That
 * keeps one source of truth for costs, targeting, damage, reactions, receipts,
 * and victory checks; the batch is orchestration, not a second combat engine.
 */
export function submitPartyPlan(
  start: BattleState,
  commands: readonly PlannedPartyCommand[],
): StepResult {
  let state = start;
  const events: BattleEvent[] = [];

  for (const command of commands) {
    while (state.phase === 'resolving_reactions') {
      const advanced = advance(state);
      state = advanced.state;
      events.push(...advanced.events);
    }

    if (state.phase !== 'awaiting_player_action') break;
    if (!state.pendingActorIds.includes(command.actorId)) continue;

    // UI focus may have reordered the pending queue while the plan was being
    // edited. Release order is the visible card order supplied by the caller,
    // so bind the next reducer submission to the addressed hero explicitly.
    state = {
      ...state,
      pendingActorIds: [
        command.actorId,
        ...state.pendingActorIds.filter((id) => id !== command.actorId),
      ],
    };

    const beforeCount = state.pendingActorIds.length;
    const submitted = submitPlayerAction(state, command.action);
    state = submitted.state;
    events.push(...submitted.events);

    // A denied command deliberately leaves the hero pending. Never let the
    // batch slide past that failure and hand control to the boss as if the
    // hero had acted.
    if (state.pendingActorIds.length === beforeCount) break;
  }

  return { state, events };
}

import type { BattleEvent } from '../../../types/combat';

/**
 * Groups the reducer's flat event stream into ACTION SCOPES — the run of
 * consequences that belong to one thing somebody did.
 *
 * ## Why this exists
 *
 * The reducer emits one event per mechanical fact. Sanguine Tithe is a single
 * ability and produces three of them: `damage_dealt`, `healing_applied`,
 * `status_applied`. Presented per-event the player sees a violet bolt, then an
 * unrelated green number, then a debuff icon — three things, when one thing
 * happened. To perform an ability as one coherent act, something has to know
 * those three events are one action. Nothing in the event stream says so.
 *
 * ## Why it is positional rather than an event-schema change
 *
 * Only `damage_dealt` carries `sourceActionId`. `healing_applied`,
 * `shield_gained`, `status_applied` and `resource_changed` carry none — so
 * there is no id to group by. Stamping `sourceActionId` onto all of them is
 * the cleaner long-term answer and is tracked as its own thread, but it is a
 * REDUCER diff: it changes the event log, which is the replay contract
 * (`reduce(snapshot, seed, actions)` must reproduce byte-identical state), and
 * that deserves its own gated change rather than riding along inside a
 * cosmetics project.
 *
 * So this is a derived pass. Zero reducer diff, zero new fields, and it can be
 * deleted the day the events carry their own ids.
 *
 * ## Why it is sound
 *
 * Two facts make the positional read safe rather than a guess:
 *
 *  1. Every consequence event carries `sourceActorId` (or `actorId`). So
 *     membership is checked against WHO ACTED, not merely against position.
 *  2. The reducer resolves one actor's action to completion before the next
 *     actor acts. A scope opener is therefore always followed by exactly that
 *     actor's consequences until the next opener.
 *
 * Where those two disagree — a thorns reflection sourced by the DEFENDER
 * during the attacker's scope — the event fails the actor check and is left
 * UNOWNED rather than misattributed. Unowned events fall through to the
 * per-event generic path, which is the old behaviour and is correct for them.
 *
 * Wall-clock timing is never consulted. The contract forbids it and it would
 * be wrong anyway: the presentation queue's pacing is variable and skippable.
 *
 * This generalises the backward scan `presentation/queue.ts severityFor`
 * already does to find a hit's declaring action — same idea, run forward once
 * over the whole log instead of backward per event.
 */

/** One action and everything it caused. */
export interface ActionScope {
  /** Index of the `player_action_selected` / `boss_intent_declared` opener. */
  openerIndex: number;
  /** Who acted. */
  actorId: string;
  /** Set when the opener was a hero ability. Drives exact recipe lookup. */
  abilityDefinitionId?: string;
  /** True when the boss opened this scope. */
  isBoss: boolean;
  /** Indices into the raw event array, ascending. Excludes the opener. */
  memberIndices: readonly number[];
  /** Every distinct actor this scope's consequences landed on, in order. */
  targetActorIds: readonly string[];
}

export interface CompiledScopes {
  scopes: readonly ActionScope[];
  /**
   * Indices belonging to no scope — thorns, environmental ticks, and every
   * event outside an open scope (round banners, phase transitions, the battle
   * result). These keep the existing per-event presentation.
   */
  unownedIndices: readonly number[];
}

/**
 * Does this event kind open a new scope?
 *
 * `boss_intent_declared` opens the boss's scope rather than a hypothetical
 * "boss acted" event because the intent IS the boss's declaration of action —
 * it is what the telegraph and the wind-up beat already hang off.
 */
function openerActor(event: BattleEvent): { actorId: string; isBoss: boolean } | null {
  if (event.kind === 'player_action_selected') {
    return { actorId: event.actorId, isBoss: false };
  }
  if (event.kind === 'boss_intent_declared') {
    // The boss's actor id is not on the intent event; the caller supplies it.
    return { actorId: BOSS_SENTINEL, isBoss: true };
  }
  return null;
}

/**
 * Stand-in for "whoever the boss is", replaced with the real id by the
 * compiler. Keeps `openerActor` a pure function of the event.
 */
const BOSS_SENTINEL = '__boss__';

/** Does this event close any open scope, without opening a new one? */
function isHardBoundary(event: BattleEvent): boolean {
  return (
    event.kind === 'round_started' ||
    event.kind === 'phase_transition' ||
    event.kind === 'battle_ended'
  );
}

/**
 * The actor a consequence event belongs to, or null if it is not a
 * consequence at all.
 *
 * `resource_changed`, `ultimate_charge_changed` and the cooldown events are
 * keyed on `actorId` — they describe something happening TO the actor's own
 * resources — while damage/healing/shield/status are keyed on `sourceActorId`,
 * the actor who caused them. Getting this backwards would attribute a hero's
 * mana spend to the boss.
 */
function consequenceActor(event: BattleEvent): string | null {
  switch (event.kind) {
    case 'damage_dealt':
    case 'healing_applied':
    case 'shield_gained':
    case 'status_applied':
    case 'dot_ticked':
      return event.sourceActorId;
    case 'resource_changed':
    case 'ultimate_charge_changed':
    case 'cooldown_started':
    case 'cooldown_ticked':
      return event.actorId;
    // `status_removed` carries no source at all — only the target. A cleanse
    // is therefore matched by TARGET below rather than by source; see the
    // compiler's special case.
    case 'status_removed':
      return null;
    default:
      return null;
  }
}

/** The actor a consequence landed ON, when it has one. */
function consequenceTarget(event: BattleEvent): string | null {
  switch (event.kind) {
    case 'damage_dealt':
    case 'healing_applied':
    case 'shield_gained':
    case 'status_applied':
    case 'dot_ticked':
      return event.targetActorId;
    case 'status_removed':
      return event.targetActorId;
    case 'actor_defeated':
      return event.actorId;
    default:
      return null;
  }
}

/**
 * Partition the event log into action scopes.
 *
 * Pure: same events in, same scopes out, every time. No timers, no I/O, no
 * reads of live state. That is what lets the Ability Theater replay a canned
 * log and get byte-identical performances, and what lets skip and replay in a
 * real battle stay consistent.
 *
 * @param events The FULL cumulative event log, not a fresh tail slice.
 * @param bossActorId Resolves the boss opener's actor. When omitted, boss
 *   scopes still compile but match no consequences by actor — deliberately
 *   inert rather than wrong.
 */
export function compileActionScopes(
  events: readonly BattleEvent[],
  bossActorId?: string,
): CompiledScopes {
  const scopes: ActionScope[] = [];
  const unownedIndices: number[] = [];

  let open: {
    openerIndex: number;
    actorId: string;
    isBoss: boolean;
    abilityDefinitionId?: string;
    memberIndices: number[];
    targets: string[];
  } | null = null;

  const close = () => {
    if (!open) return;
    scopes.push({
      openerIndex: open.openerIndex,
      actorId: open.actorId,
      isBoss: open.isBoss,
      ...(open.abilityDefinitionId ? { abilityDefinitionId: open.abilityDefinitionId } : {}),
      memberIndices: open.memberIndices,
      targetActorIds: open.targets,
    });
    open = null;
  };

  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    const opener = openerActor(event);
    if (opener) {
      // A new action supersedes the previous one. The reducer resolves one
      // action fully before starting the next, so an opener is an unambiguous
      // boundary.
      close();
      const actorId = opener.isBoss ? (bossActorId ?? BOSS_SENTINEL) : opener.actorId;
      open = {
        openerIndex: i,
        actorId,
        isBoss: opener.isBoss,
        memberIndices: [],
        targets: [],
        ...(event.kind === 'player_action_selected' && event.action.kind === 'ability'
          ? { abilityDefinitionId: event.action.abilityDefinitionId }
          : {}),
      };
      continue;
    }

    if (isHardBoundary(event)) {
      close();
      unownedIndices.push(i);
      continue;
    }

    if (!open) {
      unownedIndices.push(i);
      continue;
    }

    const source = consequenceActor(event);
    const target = consequenceTarget(event);

    // A cleanse (`status_removed`) has no source actor at all. Attribute it to
    // the open scope only when it landed on somebody that scope already
    // touched — which is exactly the Bearing Witness case (shield the ally,
    // then lift what was on them) and excludes an unrelated expiry that
    // happened to tick during someone's turn.
    const ownedByTargetOnly =
      source === null && target !== null && open.targets.includes(target);

    // `actor_defeated` likewise carries no source: it belongs to the scope
    // whose damage just killed them.
    const ownedByKill =
      event.kind === 'actor_defeated' && target !== null && open.targets.includes(target);

    if (source === open.actorId || ownedByTargetOnly || ownedByKill) {
      open.memberIndices.push(i);
      if (target && !open.targets.includes(target)) open.targets.push(target);
      continue;
    }

    // Somebody else's consequence inside this scope — a thorns reflection, an
    // environmental tick. Left unowned rather than misattributed.
    unownedIndices.push(i);
  }

  close();

  return { scopes, unownedIndices };
}

/**
 * The scope that owns a given event index, or null.
 *
 * Linear scan rather than a prebuilt map: scope counts are in the low hundreds
 * for a whole battle, and a map would have to be invalidated on every append.
 */
export function scopeForEventIndex(
  compiled: CompiledScopes,
  eventIndex: number,
): ActionScope | null {
  for (const scope of compiled.scopes) {
    if (scope.openerIndex === eventIndex) return scope;
    if (scope.memberIndices.includes(eventIndex)) return scope;
  }
  return null;
}

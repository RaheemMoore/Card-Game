import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '../../types/card';
import type { BattleEvent, BattleState, PlayerAction, TurnPhase } from '../../types/combat';
import {
  advance,
  initializeBattle,
  submitPartyPlan,
  submitPlayerAction,
} from './reducer';
import {
  buildAbilitySnapshot,
  buildBattleSnapshot,
  buildHeroSnapshot,
  snapshotFromBossVersion,
} from './harness';
import { getAbilityStore } from '../abilities/registry';
import { getCurrentBossVersion, getBossDefinition } from '../bosses/registry';
import { getOverallRank, computeRankSum } from '../../data/powerSystem';
import { PARTY_POWER_BUDGET, MAX_PARTY_SLOTS } from '../../data/bosses/towerCurve';
import { resolveCurrentElement } from '../elementResolver';
import { damageTypeForElement } from '../../data/abilities/elementDamageType';

/**
 * React hook that runs a battle inside a component. Wraps the pure reducer.
 *
 * As of C2, pacing lives in the presentation layer (see
 * services/combat/presentation/*). This hook runs the reducer to its next
 * pause point synchronously and exposes the full event stream so the queue
 * can drain it at a human-readable rate. No wall-clock lives here anymore.
 */

export interface UseBattleInput {
  /** Ordered party — lane 1 → lane N. Must be 1..3 cards. */
  heroCards: Card[];
  bossId: string;
  seed: number;
}

export interface UseBattleApi {
  state: BattleState | null;
  /** Every event emitted by the reducer since battle start. Fed to useCombatPresentation. */
  events: BattleEvent[];
  /** actorId of the hero currently being asked for input, or null if not awaiting. */
  actingActorId: string | null;
  submit(action: PlayerAction): void;
  /** Commands prepared this round, keyed by hero actor id. */
  plannedActions: Readonly<Record<string, PlayerAction>>;
  /** Save or replace the focused hero's command without resolving combat. */
  plan(action: PlayerAction): void;
  /** Commit the complete party plan in visible card order. */
  releasePlan(actions?: Readonly<Record<string, PlayerAction>>): void;
  /**
   * Move a specific hero to the front of `pendingActorIds` so the next
   * `submit()` acts as them. Lets the player choose their party's action
   * order strategically instead of being locked into canonical lane order.
   * No-op if the actor is already at the front, isn't pending, or the
   * battle isn't awaiting input.
   */
  selectActor(actorId: string): void;
  restart(): void;
  error: string | null;
}

/** Safety cap — advance() should always converge to a pause phase or battle_over. */
const MAX_ADVANCE_ITERATIONS = 500;

const PAUSE_PHASES: readonly TurnPhase[] = ['awaiting_player_action', 'awaiting_target', 'battle_over'];

function runToNextPause(start: BattleState): { state: BattleState; events: BattleEvent[] } {
  let state = start;
  const events: BattleEvent[] = [];
  for (let i = 0; i < MAX_ADVANCE_ITERATIONS; i++) {
    if (PAUSE_PHASES.includes(state.phase)) {
      return { state, events };
    }
    const step = advance(state);
    if (step.state === state && step.events.length === 0) {
      // Reducer returned unchanged from a non-pause phase — treat as pause.
      return { state, events };
    }
    state = step.state;
    events.push(...step.events);
  }
  throw new Error(
    `runToNextPause did not converge after ${MAX_ADVANCE_ITERATIONS} iterations (phase=${state.phase})`,
  );
}

export function useBattle(input: UseBattleInput | null): UseBattleApi {
  const [state, setState] = useState<BattleState | null>(null);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [plannedActions, setPlannedActions] = useState<Record<string, PlayerAction>>({});
  const [restartCount, setRestartCount] = useState(0);
  const partyKey = input?.heroCards.map((c) => c.cardId).join('|') ?? null;

  useEffect(() => {
    if (!input) {
      setState(null);
      setEvents([]);
      setError(null);
      setPlannedActions({});
      return;
    }
    try {
      const abilityStore = getAbilityStore();
      const bossDef = getBossDefinition(input.bossId);
      const bossVersion = getCurrentBossVersion(input.bossId);
      if (!bossDef || !bossVersion) {
        throw new Error(`Boss "${input.bossId}" not found. Sign in as admin or reload.`);
      }
      const bossSnap = snapshotFromBossVersion(bossDef, bossVersion);
      // Party size is capped by POWER, not headcount — see PARTY_POWER_BUDGET.
      // A flat "up to 3" let an Ascendant roster trivialise the tower while a
      // Foundation roster could not clear floor 1 at all.
      if (input.heroCards.length === 0) {
        throw new Error('Bring at least one hero.');
      }
      if (input.heroCards.length > MAX_PARTY_SLOTS) {
        throw new Error(`Party cannot exceed ${MAX_PARTY_SLOTS} heroes.`);
      }
      const spent = input.heroCards.reduce((n, c) => n + computeRankSum(c.stats), 0);
      if (spent > PARTY_POWER_BUDGET) {
        throw new Error(
          `Party power ${spent} exceeds the limit of ${PARTY_POWER_BUDGET}. ` +
            'Stronger heroes cost more, so bring fewer of them — or more weaker ones.',
        );
      }
      const heroes = input.heroCards.map((card) => {
        const refs = abilityStore.getReferencesForCard(card.cardId);
        const abilitySnaps = refs
          .map((ref) => {
            const def = abilityStore.getDefinition(ref.abilityId);
            const version = ref.abilityVersionId
              ? abilityStore.getVersion(ref.abilityVersionId)
              : def
              ? abilityStore.getCurrentVersion(def.id)
              : undefined;
            if (!def || !version) return null;
            return buildAbilitySnapshot(def, version);
          })
          .filter((s): s is NonNullable<typeof s> => s !== null);
        if (abilitySnaps.length === 0) {
          throw new Error(
            `Card "${card.cardName}" has no abilities yet — forge or tier it up first.`,
          );
        }
        return buildHeroSnapshot({
          cardId: card.cardId,
          // Resolved from the LIVE card here, then frozen into the snapshot —
          // see HeroSnapshot.elementDamageType for why combat math cannot read
          // the card store once a battle is under way.
          elementDamageType: damageTypeForElement(resolveCurrentElement(card)),
          archetype: card.archetype,
          displayName: card.cardName,
          stats: card.stats,
          rank: getOverallRank(card.stats),
          abilities: abilitySnaps,
        });
      });
      const partyId = input.heroCards.map((c) => c.cardId).join('_');
      const snap = buildBattleSnapshot({
        seed: input.seed,
        heroes,
        boss: bossSnap,
        battleId: `battle_${partyId}_${input.seed}`,
        createdAt: new Date().toISOString(),
      });
      const initial = initializeBattle(snap);
      const { state: flushed, events: flushedEvents } = runToNextPause(initial);
      setState(flushed);
      setEvents([...initial.log, ...flushedEvents]);
      setError(null);
      setPlannedActions({});
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState(null);
    }
    // We DELIBERATELY key on the primitive inputs — never on the object refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyKey, input?.bossId, input?.seed, restartCount]);

  const submit = useCallback((action: PlayerAction) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_player_action') return prev;
      try {
        const after = submitPlayerAction(prev, action);
        const { state: flushed, events: flushedEvents } = runToNextPause(after.state);
        const allEvents = [...after.events, ...flushedEvents];
        if (allEvents.length > 0) setEvents((e) => [...e, ...allEvents]);
        return flushed;
      } catch (err) {
        /**
         * A throw in here used to escape the state updater silently: no state
         * change, no message, and — because EVERY control routes through
         * `submit` — the entire battle became unclickable with no clue why.
         * That is precisely how it presented in the Vercel preview: abilities
         * would not expand, Strike did nothing, End Turn did nothing.
         *
         * The setup effect above has always been wrapped; this was the one
         * path that was not. `runToNextPause` throws by design when the
         * reducer fails to converge, so this is a reachable case, not defence
         * against the impossible.
         *
         * Surfacing it beats swallowing it: the player gets a message instead
         * of a dead screen, and the cause is named instead of guessed at.
         */
        // eslint-disable-next-line no-console
        console.error('[combat] submit failed', { action, phase: prev.phase }, err);
        setError(err instanceof Error ? err.message : String(err));
        return prev;
      }
    });
  }, []);

  const plan = useCallback((action: PlayerAction) => {
    if (!state || state.phase !== 'awaiting_player_action') return;
    const actorId = state.pendingActorIds[0];
    if (!actorId) return;
    const nextPlan = { ...plannedActions, [actorId]: action };
    setPlannedActions(nextPlan);

    // Advance focus to the next unarmed card without consuming the current
    // hero's reducer turn. Planned actions remain editable until release.
    const unarmed = state.heroes.find(
      (hero) =>
        !hero.defeated &&
        state.pendingActorIds.includes(hero.actorId) &&
        hero.actorId !== actorId &&
        !nextPlan[hero.actorId],
    );
    if (!unarmed) return;
    setState({
      ...state,
      pendingActorIds: [
        unarmed.actorId,
        ...state.pendingActorIds.filter((id) => id !== unarmed.actorId),
      ],
    });
  }, [plannedActions, state]);

  const releasePlan = useCallback((submittedPlan?: Readonly<Record<string, PlayerAction>>) => {
    if (!state || state.phase !== 'awaiting_player_action') return;
    const planToRelease = submittedPlan ?? plannedActions;
    const orderedActorIds = state.heroes
      .filter((hero) => !hero.defeated && state.pendingActorIds.includes(hero.actorId))
      .map((hero) => hero.actorId);
    if (orderedActorIds.length === 0 || orderedActorIds.some((id) => !planToRelease[id])) return;

    try {
      const committed = submitPartyPlan(
        state,
        orderedActorIds.map((actorId) => ({ actorId, action: planToRelease[actorId] })),
      );
      if (committed.state.pendingActorIds.length > 0) {
        throw new Error('One prepared action became unavailable. Review the armed party and release again.');
      }
      const { state: flushed, events: flushedEvents } = runToNextPause(committed.state);
      const allEvents = [...committed.events, ...flushedEvents];
      if (allEvents.length > 0) setEvents((current) => [...current, ...allEvents]);
      setState(flushed);
      setPlannedActions({});
      setError(null);
    } catch (err) {
      console.error('[combat] party release failed', { planToRelease }, err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [plannedActions, state]);

  // Reorder pendingActorIds so `actorId` is next to act. Pure reordering —
  // no events, no phase change. The reducer's contract stays "acts on
  // pendingActorIds[0]"; we just let the view influence which pending id
  // sits at index 0.
  const selectActor = useCallback((actorId: string) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_player_action') return prev;
      if (!prev.pendingActorIds.includes(actorId)) return prev;
      if (prev.pendingActorIds[0] === actorId) return prev;
      const reordered = [actorId, ...prev.pendingActorIds.filter((id) => id !== actorId)];
      return { ...prev, pendingActorIds: reordered };
    });
  }, []);

  const restart = useCallback(() => {
    setRestartCount((n) => n + 1);
  }, []);

  const actingActorId =
    state && state.phase === 'awaiting_player_action'
      ? state.pendingActorIds[0] ?? null
      : null;

  return useMemo(
    () => ({
      state,
      events,
      actingActorId,
      submit,
      plannedActions,
      plan,
      releasePlan,
      selectActor,
      restart,
      error,
    }),
    [
      state,
      events,
      actingActorId,
      submit,
      plannedActions,
      plan,
      releasePlan,
      selectActor,
      restart,
      error,
    ],
  );
}

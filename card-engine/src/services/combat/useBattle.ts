import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { BattleEvent, BattleState, PlayerAction } from '../../types/combat';
import {
  advance,
  initializeBattle,
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
import { getOverallRank } from '../../data/powerSystem';

/**
 * React hook that runs a battle inside a component. Wraps the pure reducer
 * so the UI can drive it as a state machine — every phase that doesn't need
 * player input auto-advances after a short delay.
 *
 * Not persisted (that lands in B5). Ephemeral runtime state.
 */

export interface UseBattleInput {
  heroCardId: string;
  heroCard: Card;
  bossId: string;
  seed: number;
}

export interface UseBattleApi {
  state: BattleState | null;
  events: BattleEvent[];
  submit(action: PlayerAction): void;
  restart(): void;
  error: string | null;
}

const PHASE_DELAY_MS = 140;

export function useBattle(input: UseBattleInput | null): UseBattleApi {
  const [state, setState] = useState<BattleState | null>(null);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [restartCount, setRestartCount] = useState(0);

  // Initialize battle whenever input identity (card+boss+seed) changes.
  useEffect(() => {
    if (!input) {
      setState(null);
      setEvents([]);
      setError(null);
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
      const refs = abilityStore.getReferencesForCard(input.heroCardId);
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
        throw new Error('This card has no abilities yet — forge or tier it up first.');
      }
      const hero = buildHeroSnapshot({
        cardId: input.heroCard.cardId,
        archetype: input.heroCard.archetype,
        displayName: input.heroCard.cardName,
        stats: input.heroCard.stats,
        rank: getOverallRank(input.heroCard.stats),
        abilities: abilitySnaps,
      });
      const snap = buildBattleSnapshot({
        seed: input.seed,
        hero,
        boss: bossSnap,
        battleId: `battle_${input.heroCardId}_${input.seed}`,
        createdAt: new Date().toISOString(),
      });
      const initial = initializeBattle(snap);
      setState(initial);
      setEvents([...initial.log]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setState(null);
    }
    // We DELIBERATELY key on the primitive inputs — never on the object refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.heroCardId, input?.bossId, input?.seed, restartCount]);

  // Auto-advance non-paused phases via a single scheduled timeout per state.
  const timeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!state) return;
    if (state.phase === 'battle_over') return;
    if (state.phase === 'awaiting_player_action' || state.phase === 'awaiting_target') return;

    const id = setTimeout(() => {
      timeoutRef.current = null;
      const step = advance(state);
      if (step.events.length > 0) {
        setEvents((prev) => [...prev, ...step.events]);
      }
      setState(step.state);
    }, PHASE_DELAY_MS) as unknown as number;
    timeoutRef.current = id;
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [state]);

  const submit = useCallback((action: PlayerAction) => {
    setState((prev) => {
      if (!prev || prev.phase !== 'awaiting_player_action') return prev;
      const step = submitPlayerAction(prev, action);
      if (step.events.length > 0) setEvents((e) => [...e, ...step.events]);
      return step.state;
    });
  }, []);

  const restart = useCallback(() => {
    setRestartCount((n) => n + 1);
  }, []);

  return useMemo(
    () => ({ state, events, submit, restart, error }),
    [state, events, submit, restart, error],
  );
}

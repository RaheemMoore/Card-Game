import { useEffect, useMemo, useRef, useState } from 'react';
import type { BattleEvent, BattleState } from '../../../types/combat';
import type { Card } from '../../../types/card';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import { compileActionScopes, type ActionScope } from '../../../services/combat/performance/actionScope';
import { resolvePerformance, buildCardLookup } from '../../../services/combat/performance/resolvePerformance';
import {
  compilePartyVolleySlots,
  retimePerformanceForPartyVolley,
} from '../../../services/combat/presentation/partyVolley';
import type { AnchorContext } from '../combatAnchors';
import { partyVolleyBossAnchor } from '../combatAnchors';
import { PerformanceView, PerformanceStyles } from './PerformanceLayer';

interface Props {
  state: BattleState;
  events: readonly BattleEvent[];
  partyCards: Card[];
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
  viewportWidth: number;
}

interface ActivePerformance {
  performance: ResolvedPerformance;
  anchorContext: AnchorContext;
  casterActorId: string;
  targetActorId?: string;
  /** Only set for a `barrier` performance — the ally it protects, so integrity
   *  can be read live off current state rather than frozen at cast time. */
  shieldTargetActorId?: string;
  /** The absorb budget this scope's `shield_gained` granted, to normalise the
   *  live shield total into the 0-1 integrity BarrierRenderer expects. */
  shieldGrantedAmount?: number;
  isPartyVolley: boolean;
}

/** `mapEventsToBeats` stamps `beat_<absoluteEventIndex>` — see adapter.ts. This
 *  is the one place that id format is parsed back into an index, so a real
 *  battle and the Ability Theater are reading the identical contract. */
function beatEventIndex(beatId: string): number | null {
  const m = /^beat_(\d+)$/.exec(beatId);
  return m ? Number(m[1]) : null;
}

function shieldGrantedBy(scope: ActionScope, events: readonly BattleEvent[]): number | undefined {
  for (const i of scope.memberIndices) {
    const e = events[i];
    if (e.kind === 'shield_gained') return e.amount;
  }
  return undefined;
}

/**
 * Bridges the real `/battle` event stream to the Ability Performance System.
 *
 * The Ability Theater proved the renderers against canned event logs; this is
 * the same pipeline — `compileActionScopes` → `resolvePerformance` →
 * `PerformanceView` — pointed at the live reducer's cumulative log instead.
 * Nothing renderer-side changes between the two call sites, which is the
 * point: a review tool that exercised different code from the game would
 * have proven nothing.
 *
 * Scoped to HERO-sourced actions only. The boss has no card and no element to
 * read a material from, so its attacks keep the existing `AttackVFX` bolt —
 * see that file's docstring, now gated to boss-sourced hits only so the two
 * systems never draw the same `damage_dealt` twice.
 *
 * A performance starts the instant its opening `player_action_selected` beat
 * becomes current, and runs on its OWN clock (`useStageClock` inside
 * `PerformanceView`) rather than being paced by subsequent beats — the same
 * self-timed behaviour the theater already relies on. It self-unmounts via
 * `clock.finished`; the timeout here is only a backstop that drops it from
 * this list so the array does not grow for the rest of the battle.
 */
export function CombatPerformanceLayer({
  state,
  events,
  partyCards,
  currentBeat,
  motionLevel,
  viewportWidth,
}: Props) {
  const compiled = useMemo(
    () => compileActionScopes(events, state.boss.actorId),
    [events, state.boss.actorId],
  );
  const volleySlots = useMemo(
    () => compilePartyVolleySlots(events, state.boss.actorId),
    [events, state.boss.actorId],
  );
  const heroActorIds = useMemo(() => state.heroes.map((h) => h.actorId), [state.heroes]);
  const cardByActorId = useMemo(
    () => buildCardLookup(heroActorIds, partyCards),
    [heroActorIds, partyCards],
  );

  const [active, setActive] = useState<ActivePerformance[]>([]);
  const startedOpeners = useRef<Set<number>>(new Set());
  const previousEventCount = useRef(events.length);

  useEffect(() => {
    if (events.length < previousEventCount.current) {
      startedOpeners.current.clear();
      setActive([]);
    }
    previousEventCount.current = events.length;
  }, [events.length]);

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.suppressEffects) {
      if (!currentBeat.preserveActivePerformance) setActive([]);
      return;
    }
    const eventIndex = beatEventIndex(currentBeat.id);
    if (eventIndex === null) return;

    const scope = compiled.scopes.find((s) => s.openerIndex === eventIndex && !s.isBoss);
    if (!scope) return;
    if (startedOpeners.current.has(scope.openerIndex)) return;
    startedOpeners.current.add(scope.openerIndex);

    const casterIndex = state.heroes.findIndex((h) => h.actorId === scope.actorId);
    const primaryTargetId = scope.targetActorIds[0];
    const targetIndex = primaryTargetId
      ? state.heroes.findIndex((h) => h.actorId === primaryTargetId)
      : -1;
    const basePerformance = resolvePerformance(scope, { events, cardByActorId, motionLevel });
    const volleySlot = volleySlots.get(scope.openerIndex);
    const resolvedPerformance = volleySlot
      ? retimePerformanceForPartyVolley(basePerformance, volleySlot)
      : basePerformance;
    // Recipes describe the usual direction of an ability, but the reducer's
    // live target is authoritative. An unmapped self-buff such as Thornmantle
    // takes the generic recipe (normally caster -> boss); without this seam it
    // visibly hits the boss while its receipt truthfully says "on Gryndak".
    // Any hero target, self or ally, must land on that card.
    const bossVolleyTarget =
      volleySlot && primaryTargetId === state.boss.actorId
        ? partyVolleyBossAnchor(volleySlot.order)
        : null;
    const performance: ResolvedPerformance =
      targetIndex === -1
        ? bossVolleyTarget
          ? { ...resolvedPerformance, targetAnchor: bossVolleyTarget }
          : resolvedPerformance
        : { ...resolvedPerformance, targetAnchor: 'target_card_front' };

    const entry: ActivePerformance = {
      performance,
      casterActorId: scope.actorId,
      targetActorId: primaryTargetId,
      isPartyVolley: Boolean(volleySlot),
      anchorContext: {
        viewportWidth,
        casterIndex: casterIndex === -1 ? undefined : casterIndex,
        targetIndex: targetIndex === -1 ? undefined : targetIndex,
      },
      ...(performance.form === 'barrier' && primaryTargetId
        ? {
            shieldTargetActorId: primaryTargetId,
            shieldGrantedAmount: shieldGrantedBy(scope, events),
          }
        : {}),
    };

    setActive((cur) => [...cur, entry]);

    // Backstop only — PerformanceView already unmounts itself via
    // `clock.finished`. This just keeps the array from accumulating dead
    // entries for the rest of the battle if something prevents that.
    const timeout = window.setTimeout(() => {
      setActive((cur) => cur.filter((a) => a.performance.id !== performance.id));
    }, performance.totalMs + 500);
    return () => window.clearTimeout(timeout);
    // Re-running this on every `state`/`viewportWidth` change would re-key
    // every in-flight performance; it only needs to react to the beat moving.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat]);

  if (active.length === 0) return null;

  return (
    <>
      {active.map((a) => (
        <PerformanceView
          key={a.performance.id}
          performance={a.performance}
          motionLevel={motionLevel}
          anchorContext={a.anchorContext}
          shieldIntegrity={liveShieldIntegrity(state, a)}
          observation={{
            casterActorId: a.casterActorId,
            targetActorId: a.targetActorId,
          }}
          suppressChargeTell={a.isPartyVolley}
        />
      ))}
      <PerformanceStyles />
    </>
  );
}

/** Reads the protected ally's CURRENT shield total, live, every render — a
 *  shield that gets chipped by a later hit must visibly crack, not just play
 *  a fixed arrival animation and sit there lying about its own state. */
function liveShieldIntegrity(state: BattleState, a: ActivePerformance): number | undefined {
  if (!a.shieldTargetActorId || !a.shieldGrantedAmount) return undefined;
  const hero = state.heroes.find((h) => h.actorId === a.shieldTargetActorId);
  if (!hero) return undefined;
  const current = hero.shields.reduce((sum, s) => sum + s.amount, 0);
  return Math.max(0, Math.min(1, current / a.shieldGrantedAmount));
}

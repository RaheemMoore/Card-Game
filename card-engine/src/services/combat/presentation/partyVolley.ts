import type { BattleEvent } from '../../../types/combat';
import type { ResolvedPerformance } from '../performance/types';
import { compileActionScopes, type ActionScope } from '../performance/actionScope';
import type { AnimationBeat } from './types';

/** The party should read as one volley: fire, fire, fire, then one payoff. */
export const PARTY_VOLLEY_CHARGE_MS = 700;
export const PARTY_VOLLEY_LAUNCH_GAP_MS = 180;
export const PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS = 740;
export const PARTY_VOLLEY_IMPACT_MS = 650;
export const PARTY_VOLLEY_AFTERMATH_MS = 1;
export const PARTY_VOLLEY_SILENCE_MS = 550;
/**
 * Later performances pay an extra React mount/queue boundary before their
 * clock starts. Quadratic compensation matches the measured 3-card runtime:
 * launch 2 needs about one frame, launch 3 about six frames of head start.
 */
export const PARTY_VOLLEY_MOUNT_COMPENSATION_MS = 24;

export interface PartyVolleySlot {
  scope: ActionScope;
  order: number;
  count: number;
}

/**
 * Find hero actions that resolve together immediately before a boss response.
 * The reducer remains sequential and authoritative; this only identifies the
 * actions the player released with one Party command so presentation can
 * compose them as a volley.
 */
export function compilePartyVolleySlots(
  events: readonly BattleEvent[],
  bossActorId: string,
): ReadonlyMap<number, PartyVolleySlot> {
  const slots = new Map<number, PartyVolleySlot>();
  const scopes = compileActionScopes(events, bossActorId).scopes;
  let run: ActionScope[] = [];

  const commit = () => {
    if (run.length < 2) {
      run = [];
      return;
    }
    run.forEach((scope, order) => {
      slots.set(scope.openerIndex, { scope, order, count: run.length });
    });
    run = [];
  };

  for (const scope of scopes) {
    if (scope.isBoss) {
      commit();
      continue;
    }
    run.push(scope);
  }
  commit();
  return slots;
}

/** Wall time from this launch until every released action reaches impact. */
export function volleyTimeToImpact(slot: PartyVolleySlot): number {
  const base = (
    (slot.count - 1 - slot.order) * PARTY_VOLLEY_LAUNCH_GAP_MS +
    PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS
  );
  return Math.max(1, base - slot.order * slot.order * PARTY_VOLLEY_MOUNT_COMPENSATION_MS);
}

/** Collapse per-action receipt pauses into one launch rhythm and payoff. */
export function pacePartyVolleyBeats(
  beats: readonly AnimationBeat[],
  events: readonly BattleEvent[],
  bossActorId: string,
): AnimationBeat[] {
  const slots = compilePartyVolleySlots(events, bossActorId);
  const byEventIndex = new Map<number, PartyVolleySlot>();

  for (const slot of slots.values()) {
    byEventIndex.set(slot.scope.openerIndex, slot);
    for (const index of slot.scope.memberIndices) {
      byEventIndex.set(index, slot);
    }
  }

  const paced = beats.map<AnimationBeat>((beat) => {
    const match = /^beat_(\d+)$/.exec(beat.id);
    const index = match ? Number(match[1]) : -1;
    const slot = byEventIndex.get(index);
    if (!slot) return beat;

    if (index === slot.scope.openerIndex) {
      return {
        ...beat,
        presentationPhase: slot.order === slot.count - 1 ? 'party_impact' : 'party_launch',
        durationMs:
          slot.order === slot.count - 1
            ? PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS +
              PARTY_VOLLEY_IMPACT_MS +
              PARTY_VOLLEY_AFTERMATH_MS
            : PARTY_VOLLEY_LAUNCH_GAP_MS,
        reducedDurationMs:
          slot.order === slot.count - 1
            ? PARTY_VOLLEY_CONTACT_AFTER_LAST_LAUNCH_MS + PARTY_VOLLEY_IMPACT_MS
            : PARTY_VOLLEY_LAUNCH_GAP_MS,
      };
    }
    return {
      ...beat,
      durationMs: 1,
      suppressEffects: true,
      preserveActivePerformance: true,
    };
  });

  const firstSlot = [...slots.values()].sort((a, b) => a.order - b.order)[0];
  if (!firstSlot) return paced;
  const firstPosition = paced.findIndex((beat) => beat.id === `beat_${firstSlot.scope.openerIndex}`);
  if (firstPosition < 0) return paced;
  const lastMemberIndex = Math.max(
    firstSlot.scope.openerIndex,
    ...[...slots.values()].flatMap((slot) => [slot.scope.openerIndex, ...slot.scope.memberIndices]),
  );
  const afterVolley = paced.findIndex((beat) => beat.id === `beat_${lastMemberIndex}`);
  const charge: AnimationBeat = {
    id: `presentation_party_charge_${firstSlot.scope.openerIndex}`,
    event: events[firstSlot.scope.openerIndex],
    cue: 'wind_up',
    durationMs: PARTY_VOLLEY_CHARGE_MS,
    reducedDurationMs: PARTY_VOLLEY_CHARGE_MS,
    presentationPhase: 'party_charge',
    suppressEffects: true,
    preserveActivePerformance: true,
  };
  const silence: AnimationBeat = {
    id: `presentation_party_silence_${lastMemberIndex}`,
    event: events[lastMemberIndex],
    cue: 'handoff',
    durationMs: PARTY_VOLLEY_SILENCE_MS,
    reducedDurationMs: PARTY_VOLLEY_SILENCE_MS,
    presentationPhase: 'party_silence',
    suppressEffects: true,
    preserveActivePerformance: true,
  };
  const result = [...paced];
  result.splice(firstPosition, 0, charge);
  result.splice(afterVolley + 2, 0, silence);
  return result;
}

/**
 * Remove the already-visible planning charge and retime the delivery so each
 * launch starts immediately but all actions enter impact on the same frame.
 * Post-impact durations are normalized too, keeping all three impact pieces
 * present for one shared payoff instead of peeling away at different speeds.
 */
export function retimePerformanceForPartyVolley(
  performance: ResolvedPerformance,
  slot: PartyVolleySlot,
): ResolvedPerformance {
  const impactIndex = performance.stages.findIndex((stage) => stage.stage === 'impact');
  if (impactIndex < 0) return performance;

  const launchIndex = performance.stages.findIndex(
    (stage, index) =>
      index < impactIndex &&
      (stage.stage === 'cast' || stage.stage === 'travel' || stage.stage === 'manifest'),
  );
  const startIndex = launchIndex < 0 ? Math.max(0, impactIndex - 1) : launchIndex;
  const delivery = performance.stages.slice(startIndex);
  const localImpactIndex = impactIndex - startIndex;
  const beforeImpact = delivery.slice(0, localImpactIndex);
  const afterImpact = delivery.slice(localImpactIndex + 1);
  const beforeTotal = beforeImpact.reduce((sum, stage) => sum + stage.durationMs, 0);
  const afterTotal = afterImpact.reduce((sum, stage) => sum + stage.durationMs, 0);
  const targetBefore = volleyTimeToImpact(slot);

  let cursor = 0;
  const stages = delivery.map((stage, index) => {
    let durationMs: number;
    if (index < localImpactIndex) {
      durationMs = beforeTotal > 0
        ? Math.max(1, Math.round((stage.durationMs / beforeTotal) * targetBefore))
        : Math.max(1, Math.round(targetBefore / Math.max(1, localImpactIndex)));
    } else if (index === localImpactIndex) {
      durationMs = PARTY_VOLLEY_IMPACT_MS;
    } else {
      durationMs = afterTotal > 0
        ? Math.max(1, Math.round((stage.durationMs / afterTotal) * PARTY_VOLLEY_AFTERMATH_MS))
        : Math.max(1, Math.round(PARTY_VOLLEY_AFTERMATH_MS / Math.max(1, afterImpact.length)));
    }
    const next = { ...stage, startMs: cursor, durationMs };
    cursor += durationMs;
    return next;
  });

  return {
    ...performance,
    castAnchor: 'caster_charge_lane',
    stages,
    totalMs: cursor,
  };
}

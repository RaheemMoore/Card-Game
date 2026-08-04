import type { BattleEvent } from '../../../types/combat';
import type { MotionLevel } from '../../../vfx/types';
import type { ActionScope } from './actionScope';
import type {
  AbilityPerformanceRecipe,
  ConsequenceKind,
  PlacedConsequence,
  PlannedStage,
} from './types';

/**
 * Places an action's authoritative consequences onto the stages of its recipe.
 *
 * This is where "damage lands when the lash hits, and the heal lands when the
 * blood gets home" actually happens. The reducer already decided both numbers;
 * nothing here changes them. All this does is decide WHEN each one is shown,
 * which is the difference between Sanguine Tithe reading as a drain and
 * reading as two numbers appearing at the same instant.
 */

/** Narrow a raw event to the consequence category the stage recipes speak in. */
export function consequenceKindOf(event: BattleEvent): ConsequenceKind | null {
  switch (event.kind) {
    case 'damage_dealt':
    case 'dot_ticked':
      return 'damage';
    case 'healing_applied':
      return 'healing';
    case 'shield_gained':
      return 'shield';
    case 'status_applied':
      return 'status_applied';
    case 'status_removed':
      return 'status_removed';
    case 'resource_changed':
    case 'ultimate_charge_changed':
      return 'resource';
    case 'actor_defeated':
      return 'defeat';
    default:
      return null;
  }
}

function describe(event: BattleEvent, kind: ConsequenceKind, index: number): PlacedConsequence {
  const base = { kind, eventIndex: index, stage: 'impact' as const };
  switch (event.kind) {
    case 'damage_dealt':
      return { ...base, targetActorId: event.targetActorId, amount: event.amount, damageType: event.damageType };
    case 'dot_ticked':
      return { ...base, targetActorId: event.targetActorId, amount: event.amount, damageType: event.damageType, statusId: event.statusId };
    case 'healing_applied':
    case 'shield_gained':
      return { ...base, targetActorId: event.targetActorId, amount: event.amount };
    case 'status_applied':
      return { ...base, targetActorId: event.targetActorId, statusId: event.statusId };
    case 'status_removed':
      return { ...base, targetActorId: event.targetActorId };
    case 'resource_changed':
    case 'ultimate_charge_changed':
      return { ...base, targetActorId: event.actorId, amount: event.delta };
    case 'actor_defeated':
      return { ...base, targetActorId: event.actorId };
    default:
      return base;
  }
}

/**
 * Build the timed stage plan for one scope.
 *
 * Placement rule: each consequence goes in the FIRST stage of the recipe whose
 * `accepts` list contains its kind. Order within the recipe is therefore
 * meaningful and is how the drain vocabulary separates damage from healing —
 * `impact` accepts `damage` and not `healing`, `arrival` accepts `healing`,
 * and `arrival` comes later.
 *
 * A consequence whose kind no stage accepts is placed on the last stage that
 * accepts ANYTHING, rather than dropped. Presentation may be simplified; it may
 * never silently swallow a mechanical fact the player needs to see.
 */
export function buildStagePlan(
  scope: ActionScope,
  events: readonly BattleEvent[],
  recipe: AbilityPerformanceRecipe,
  motion: MotionLevel = 'full',
): { stages: readonly PlannedStage[]; totalMs: number } {
  const placed = new Map<string, PlacedConsequence[]>();
  for (const stage of recipe.stages) placed.set(stage.stage, []);

  const lastAccepting =
    [...recipe.stages].reverse().find((s) => s.accepts.length > 0) ?? recipe.stages[0];

  for (const index of scope.memberIndices) {
    const event = events[index];
    if (!event) continue;
    const kind = consequenceKindOf(event);
    if (!kind) continue;

    const target = recipe.stages.find((s) => s.accepts.includes(kind)) ?? lastAccepting;
    placed.get(target.stage)?.push({ ...describe(event, kind, index), stage: target.stage });
  }

  const scale = motionScale(motion);
  let cursor = 0;
  const stages: PlannedStage[] = recipe.stages.map((s) => {
    const durationMs = Math.round(s.durationMs * scale);
    const planned: PlannedStage = {
      stage: s.stage,
      durationMs,
      startMs: cursor,
      consequences: placed.get(s.stage) ?? [],
    };
    cursor += durationMs;
    return planned;
  });

  return { stages, totalMs: cursor };
}

/**
 * How motion level re-times a plan.
 *
 * Reduced motion is an AUTHORED VARIANT, not a deletion. Every stage survives
 * at every level — what changes is how long the eye is asked to track
 * something moving, and (in the renderers) whether travel is animated or
 * simply shown as a static connection.
 *
 * `off` compresses but never collapses, following the convention
 * `REDUCED_MOTION_BY_CUE` already set in `presentation/types.ts`: "reduced
 * motion means no MOTION, not no TIME — the previous flat 40ms collapsed every
 * beat equally, which is why the reduced-motion path felt like the animation
 * had simply been skipped." A plan compressed to zero would resolve every
 * consequence on the same frame and destroy the ordering information reduced
 * motion is specifically required to PRESERVE: sequence, target, material
 * identity, and mechanical consequence. Losing motion must never mean losing
 * the fact that the damage came before the heal.
 *
 * Note `vfx/types.ts` describes 'off' as rendering "for their full duration".
 * That is the portable module's own contract for a single effect; this is the
 * game-side beat budget, and the presentation layer has always shortened holds
 * at 'off'. They are consistent in intent — keep the information, drop the
 * movement — and the beat-level convention is the one that governs here.
 */
function motionScale(motion: MotionLevel): number {
  switch (motion) {
    case 'full':
      return 1;
    case 'subtle':
      return 0.75;
    case 'off':
      return 0.45;
    default:
      return 1;
  }
}

/** The stage a given event index was placed on, for the theater's readout. */
export function stageForEvent(
  stages: readonly PlannedStage[],
  eventIndex: number,
): PlannedStage | null {
  return stages.find((s) => s.consequences.some((c) => c.eventIndex === eventIndex)) ?? null;
}

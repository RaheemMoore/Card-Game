import type { TargetRule } from '../../types/abilities';
import type { BattleState } from '../../types/combat';
import { RandomStream } from './RandomStream';

export interface TargetResolution {
  targetActorIds: string[];
  /** Present only when the rule consumed RNG (random_enemy) — caller must
   *  persist this back onto state.rngCursor so the roll is part of the
   *  deterministic replay log, per the combat reducer's pure/seeded-RNG contract. */
  nextRngCursor?: number;
}

/**
 * Resolve a TargetRule into concrete actorIds. Pure — takes the caster and
 * current state, returns ids only, never mutates. The reducer is the sole
 * caller and sole owner of applying `nextRngCursor` back onto state, so RNG
 * consumption always lands in the deterministic event/cursor log.
 *
 * `playerChosenIds` carries the id(s) a player already picked via a UI
 * target-picker (today only relevant for `single_ally`) — every other rule
 * ignores it and resolves independently.
 */
export function resolveTargetRule(
  state: BattleState,
  casterActorId: string,
  rule: TargetRule,
  playerChosenIds: readonly string[] = [],
): TargetResolution {
  switch (rule.type) {
    case 'self':
      return { targetActorIds: [casterActorId] };

    // Single-boss reality: every enemy-facing rule resolves to the boss.
    // Kept as distinct cases (not folded together) so each becomes its own
    // real implementation the moment a second enemy/boss exists.
    case 'boss_object':
    case 'single_enemy':
    case 'current_attacker':
    case 'all_enemies':
    case 'highest_attack_enemy':
      return { targetActorIds: [state.boss.actorId] };

    case 'random_enemy': {
      // Only one enemy exists today, so this is deterministic in practice —
      // still burn a roll so a future second enemy doesn't shift replays of
      // battles recorded before it existed.
      const rng = new RandomStream(state.snapshot.seed, state.rngCursor);
      rng.next();
      return { targetActorIds: [state.boss.actorId], nextRngCursor: rng.cursor };
    }

    case 'lowest_health_ally': {
      const alive = state.heroes.filter((h) => !h.defeated);
      const lowest = alive.reduce<(typeof alive)[number] | null>((min, h) => {
        if (!min) return h;
        return h.hp / h.snapshot.maxHp < min.hp / min.snapshot.maxHp ? h : min;
      }, null);
      return { targetActorIds: lowest ? [lowest.actorId] : [casterActorId] };
    }

    case 'all_allies':
      return {
        targetActorIds: state.heroes.filter((h) => !h.defeated).map((h) => h.actorId),
      };

    case 'single_ally': {
      const chosen = playerChosenIds[0];
      const validChosen =
        chosen && state.heroes.some((h) => h.actorId === chosen && !h.defeated) ? chosen : undefined;
      if (validChosen) return { targetActorIds: [validChosen] };
      // Defensive fallback if the UI somehow submitted without a pick (e.g.
      // only one living ally besides the caster) — never silently no-op.
      const fallback =
        state.heroes.find((h) => !h.defeated && h.actorId !== casterActorId) ??
        state.heroes.find((h) => !h.defeated);
      return { targetActorIds: fallback ? [fallback.actorId] : [casterActorId] };
    }
  }
}

/** True when a rule requires a player-facing pick before it can resolve —
 *  today only `single_ally`. Used by the ability command bar to decide
 *  whether to enter target-picking mode instead of resolving immediately. */
export function targetRuleNeedsPlayerPick(rule: TargetRule): boolean {
  return rule.type === 'single_ally';
}

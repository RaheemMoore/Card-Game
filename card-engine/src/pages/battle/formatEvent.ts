import type { BattleState } from '../../types/combat';

export function formatEvent(e: BattleState['log'][number]): string {
  switch (e.kind) {
    case 'battle_started':
      return `⚔ battle begins`;
    case 'round_started':
      return `— Round ${e.round} —`;
    case 'boss_intent_declared':
      return `boss intends: ${e.intent.telegraphText}`;
    case 'player_action_selected':
      return `you chose: ${e.action.kind === 'ability' ? 'ability' : e.action.kind}`;
    case 'damage_dealt':
      return `${e.sourceActorId} hits ${e.targetActorId} for ${e.amount} ${e.damageType}${
        e.blockedByShield ? ` (shield -${e.blockedByShield})` : ''
      }`;
    case 'healing_applied':
      return `${e.targetActorId} healed ${e.amount}${e.overheal ? ` (over ${e.overheal})` : ''}`;
    case 'shield_gained':
      return `${e.targetActorId} gains shield ${e.amount}`;
    case 'status_applied':
      return `${e.statusId} applied to ${e.targetActorId} (${e.duration})`;
    case 'status_removed':
      return `status expired on ${e.targetActorId}`;
    case 'resource_changed':
      return `resource ${e.delta > 0 ? '+' : ''}${e.delta} (${e.source})`;
    case 'ultimate_charge_changed':
      return `ult +${e.delta} (${e.source})`;
    case 'cooldown_started':
      return `cooldown started`;
    case 'phase_transition':
      return `⚡ boss enters ${e.toPhaseId}`;
    case 'actor_defeated':
      return `☠ ${e.actorId} defeated`;
    case 'action_denied':
      return `⛔ ${e.reason}`;
    case 'battle_ended':
      return `▮ battle ends: ${e.result.outcome}`;
    default:
      return e.kind;
  }
}

import { describe, expect, it } from 'vitest';
import type { BattleState, PlayerAction } from '../../types/combat';
import { nextUnplannedActorId } from './planningFocus';

function planningState(): BattleState {
  return {
    phase: 'awaiting_player_action',
    pendingActorIds: ['hero-1', 'hero-2', 'hero-3'],
    heroes: [
      { actorId: 'hero-1', defeated: false },
      { actorId: 'hero-2', defeated: false },
      { actorId: 'hero-3', defeated: false },
    ],
  } as BattleState;
}

describe('nextUnplannedActorId', () => {
  it('treats Wait as complete and advances to the next unfinished card', () => {
    const plan: Record<string, PlayerAction> = { 'hero-1': { kind: 'wait' } };
    expect(nextUnplannedActorId(planningState(), plan, 'hero-1')).toBe('hero-2');
  });

  it('does not jump back to a waited card after the next ability is planned', () => {
    const plan: Record<string, PlayerAction> = {
      'hero-1': { kind: 'wait' },
      'hero-2': { kind: 'ability', abilityDefinitionId: 'ability-2', targetActorIds: [] },
    };
    expect(nextUnplannedActorId(planningState(), plan, 'hero-2')).toBe('hero-3');
  });

  it('returns null once every living pending hero has a command', () => {
    const plan: Record<string, PlayerAction> = {
      'hero-1': { kind: 'wait' },
      'hero-2': { kind: 'wait' },
      'hero-3': { kind: 'strike' },
    };
    expect(nextUnplannedActorId(planningState(), plan, 'hero-3')).toBeNull();
  });
});

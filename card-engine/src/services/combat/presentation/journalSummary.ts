import type { BattleEvent, BattleIntent, BattleState } from '../../../types/combat';
import { getAbilityStore } from '../../abilities/registry';
import { displayNameFor } from '../../../pages/battle/journalNames';
import { formatEvent } from '../../../pages/battle/formatEvent';
import { receiptsForEvents, type ResolutionReceipt } from '../decision/receipts';

/**
 * A derived, human-readable view over the raw BattleEvent[] stream — one
 * entry per player/boss action instead of one row per raw event. This is a
 * SEPARATE view: it never touches `adapter.ts`/`queue.ts`/
 * `useCombatPresentation.ts`, so per-event animation pacing (hit-shake,
 * floating numbers, AttackVFX) keeps reading the raw beat stream exactly
 * as before. Pure — same events in, same entries out.
 */
export interface JournalEntry {
  id: string;
  /** Raw events folded into this entry — kept for a future "detail" expansion. */
  sourceEvents: BattleEvent[];
  text: string;
  kind: 'action' | 'boss_intent' | 'boss_action' | 'round_marker' | 'phase' | 'system' | 'battle_end';
  round: number;
  /** Short authoritative confirmations retained with the action history. */
  receipts: readonly ResolutionReceipt[];
  /** `boss_intent` only — who the telegraphed action is aimed at, and for how
   *  much. The removed upper-left Intent panel was the only surface carrying
   *  these; the journal is now their sole home, so they travel on the entry
   *  rather than the rail re-deriving them from BattleState. */
  intentTargetLabel?: string;
  intentDamage?: number;
}

export const JOURNAL_KIND_LABEL: Record<JournalEntry['kind'], string> = {
  action: 'ACTION',
  boss_intent: 'BOSS INTENT',
  boss_action: 'BOSS ACTION',
  round_marker: 'TURN',
  phase: 'PHASE',
  system: 'BATTLE',
  battle_end: 'ENDED',
};

type OpenGroup = { kind: 'action' | 'boss_action'; events: BattleEvent[] };

export function summarizeJournal(events: readonly BattleEvent[], state: BattleState): JournalEntry[] {
  const entries: JournalEntry[] = [];
  let currentRound = 0;
  let open: OpenGroup | null = null;
  let idCounter = 0;
  const nextId = () => `journal_${idCounter++}`;

  const flush = () => {
    if (!open) return;
    const text =
      open.kind === 'action' ? composeActionText(open.events, state) : composeBossActionText(open.events, state);
    entries.push({
      id: nextId(),
      sourceEvents: open.events,
      text,
      kind: open.kind,
      round: currentRound,
      receipts: receiptsForEvents(open.events, state),
    });
    open = null;
  };

  const pushSingle = (
    kind: JournalEntry['kind'],
    text: string,
    e: BattleEvent,
    extra?: Partial<JournalEntry>,
  ) => {
    flush();
    entries.push({
      id: nextId(),
      sourceEvents: [e],
      text,
      kind,
      round: currentRound,
      receipts: receiptsForEvents([e], state),
      ...extra,
    });
  };

  for (const e of events) {
    switch (e.kind) {
      case 'round_started':
        flush();
        currentRound = e.round;
        entries.push({
          id: nextId(),
          sourceEvents: [e],
          text: `Round ${e.round}`,
          kind: 'round_marker',
          round: currentRound,
          receipts: [],
        });
        continue;

      case 'boss_intent_declared':
        pushSingle('boss_intent', e.intent.telegraphText, e, {
          intentTargetLabel: intentTargetLabelFor(e.intent, state),
          intentDamage: projectedIntentDamage(e.intent, state, currentRound),
        });
        continue;

      case 'phase_transition':
        pushSingle('phase', `⚡ boss enters ${e.toPhaseId}`, e);
        continue;

      case 'battle_started':
        pushSingle('system', `⚔ battle begins`, e);
        continue;

      case 'battle_ended':
        pushSingle('battle_end', `▮ battle ends: ${e.result.outcome}`, e);
        continue;

      case 'actor_defeated':
        pushSingle('system', `☠ ${displayNameFor(state, e.actorId)} defeated`, e);
        continue;

      case 'player_action_selected':
        flush();
        open = { kind: 'action', events: [e] };
        continue;

      case 'damage_dealt': {
        // Boss-sourced damage always starts/continues a boss_action group,
        // even if a hero action group is still open (it always is fully
        // populated by the time the boss resolves, since resolveAbilityEffects
        // emits an action's full effect chain contiguously) — check this
        // BEFORE the generic append-to-open-group path.
        if (e.sourceActorId === state.boss.actorId) {
          if (!open || open.kind !== 'boss_action') {
            flush();
            open = { kind: 'boss_action', events: [] };
          }
          open.events.push(e);
          continue;
        }
        if (open) {
          open.events.push(e);
          continue;
        }
        continue;
      }

      case 'resource_changed':
        if (e.source === 'regen') continue; // dropped entirely — the live energy gauge shows this now
        if (open) open.events.push(e);
        continue;

      case 'healing_applied':
      case 'shield_gained':
      case 'status_applied':
      case 'ultimate_charge_changed':
      case 'cooldown_started':
      case 'action_denied':
        if (open) open.events.push(e);
        continue;

      case 'status_removed':
      case 'cooldown_ticked':
        continue; // ambient, not worth a journal line

      default:
        continue;
    }
  }
  flush();
  return entries;
}

/** Same target resolution the removed Intent panel did — single named hero,
 *  or "ALL HEROES" for a multi-target telegraph. */
function intentTargetLabelFor(intent: BattleIntent, state: BattleState): string {
  if (intent.targetActorIds.length > 1) return 'ALL HEROES';
  const id = intent.targetActorIds[0];
  return id ? displayNameFor(state, id).toUpperCase() : '—';
}

/** Same projection the removed Intent panel did: base + per-round scaling.
 *  Searches every phase rather than only the boss's current one — an intent
 *  declared just before a phase transition would otherwise resolve to 0. */
function projectedIntentDamage(intent: BattleIntent, state: BattleState, round: number): number {
  for (const phase of state.boss.snapshot.phases) {
    const action = phase.actions.find((a) => a.id === intent.actionId);
    if (action) return action.baseDamage + Math.floor(action.scalingPerRound * round);
  }
  return 0;
}

function composeActionText(events: readonly BattleEvent[], state: BattleState): string {
  const start = events.find(
    (e): e is Extract<BattleEvent, { kind: 'player_action_selected' }> => e.kind === 'player_action_selected',
  );
  if (!start) return events.map((e) => formatEvent(e)).join('; ');

  const actorName = displayNameFor(state, start.actorId);
  const denied = events.find((e): e is Extract<BattleEvent, { kind: 'action_denied' }> => e.kind === 'action_denied');

  if (start.action.kind !== 'ability') {
    if (denied) return `${actorName} tried to act but ${denied.reason.replace(/_/g, ' ')}`;
    if (start.action.kind === 'guard') {
      const shield = events.find((e): e is Extract<BattleEvent, { kind: 'shield_gained' }> => e.kind === 'shield_gained');
      return `${actorName} guarded${shield ? ` (+${shield.amount} shield)` : ''}`;
    }
    if (start.action.kind === 'focus') {
      const gain = events.find(
        (e): e is Extract<BattleEvent, { kind: 'resource_changed' }> =>
          e.kind === 'resource_changed' && e.source === 'focus',
      );
      return `${actorName} focused${gain ? ` (+${gain.delta} energy)` : ''}`;
    }
    return `${actorName} inspected`;
  }

  const abilityDef = getAbilityStore().getDefinition(start.action.abilityDefinitionId);
  const abilityName = abilityDef?.displayName ?? start.action.abilityDefinitionId;

  if (denied) {
    return `${actorName} tried to use "${abilityName}" but ${denied.reason.replace(/_/g, ' ')}`;
  }

  const damage = events.find((e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> => e.kind === 'damage_dealt');
  const heal = events.find((e): e is Extract<BattleEvent, { kind: 'healing_applied' }> => e.kind === 'healing_applied');
  const shield = events.find((e): e is Extract<BattleEvent, { kind: 'shield_gained' }> => e.kind === 'shield_gained');
  const cost = events.find(
    (e): e is Extract<BattleEvent, { kind: 'resource_changed' }> =>
      e.kind === 'resource_changed' && e.source === 'ability_cost',
  );

  const targetId = damage?.targetActorId ?? heal?.targetActorId ?? shield?.targetActorId ?? start.action.targetActorIds[0];
  const targetName = targetId ? displayNameFor(state, targetId) : null;

  const costPart = cost ? ` for ${Math.abs(cost.delta)} energy` : '';
  const outcomePart = damage
    ? ` — ${damage.amount} damage`
    : heal
    ? ` — healed ${heal.amount}`
    : shield
    ? ` — shielded ${shield.amount}`
    : '';

  return `${actorName} used "${abilityName}"${targetName ? ` on ${targetName}` : ''}${costPart}${outcomePart}`;
}

function composeBossActionText(events: readonly BattleEvent[], state: BattleState): string {
  const hits = events.filter(
    (e): e is Extract<BattleEvent, { kind: 'damage_dealt' }> => e.kind === 'damage_dealt',
  );
  if (hits.length === 0) return events.map((e) => formatEvent(e)).join('; ');

  const bossName = displayNameFor(state, hits[0].sourceActorId);

  // An area attack emits one damage event per hero. Reporting only the first
  // — which `.find()` did — described a party-wide sweep as a single-target
  // hit on whoever happened to be in lane order first, so the one boss
  // mechanic that most changes how a fight plays was invisible in the log.
  if (hits.length > 1) {
    const total = hits.reduce((n, h) => n + h.amount, 0);
    const names = hits.map((h) => displayNameFor(state, h.targetActorId)).join(', ');
    return `${bossName} sweeps ${names} for ${total} damage`;
  }

  return `${bossName} hits ${displayNameFor(state, hits[0].targetActorId)} for ${hits[0].amount} damage`;
}

import { useEffect, useRef } from 'react';
import type { AnimationBeat, BeatCue } from '../../services/combat/presentation/types';
import type { BattleEvent } from '../../types/combat';
import { formatEvent } from './formatEvent';

interface Props {
  journal: readonly AnimationBeat[];
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
}

/**
 * Persistent right rail listing paced combat events. Active event (newest)
 * is emphasized; history remains readable above it.
 */
export function CombatJournalRail({ journal, isPlaying, pendingCount, onSkip }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [journal.length]);

  const active = journal[journal.length - 1];
  const history = journal.slice(0, -1);

  return (
    <aside
      className="border-l border-bone/10 flex flex-col h-full"
      style={{ background: 'rgba(8,4,10,0.88)' }}
      aria-label="Combat Journal"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-bone/10">
        <div className="text-[10px] uppercase tracking-widest text-gold/80 font-fantasy">
          Combat Journal
        </div>
        {isPlaying && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-bone underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
            aria-label={`Skip ${pendingCount} pending combat beats`}
          >
            Skip · {pendingCount}
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-1"
        aria-live="polite"
      >
        {history.map((beat) => (
          <JournalRow key={beat.id} beat={beat} tone="history" />
        ))}
        {active && <JournalRow key={active.id} beat={active} tone="active" />}
      </div>
    </aside>
  );
}

function JournalRow({ beat, tone }: { beat: AnimationBeat; tone: 'history' | 'active' }) {
  const icon = iconFor(beat.event, beat.cue);
  return (
    <div
      className={`flex items-start gap-2 rounded px-2 py-1.5 text-[11px] leading-snug ${
        tone === 'active'
          ? 'bg-gold/10 border border-gold/25 text-bone'
          : 'text-bone/60'
      }`}
    >
      <span className="text-sm shrink-0 leading-none pt-0.5" aria-hidden>
        {icon}
      </span>
      <span className="font-mono">{formatEvent(beat.event)}</span>
    </div>
  );
}

function iconFor(event: BattleEvent, cue: BeatCue): string {
  switch (event.kind) {
    case 'battle_started':
      return '⚔';
    case 'round_started':
      return '⏱';
    case 'boss_intent_declared':
      return '👁';
    case 'player_action_selected':
      return '✋';
    case 'damage_dealt':
      return '💥';
    case 'healing_applied':
      return '➕';
    case 'shield_gained':
      return '🛡';
    case 'status_applied':
      return '✳';
    case 'status_removed':
      return '·';
    case 'resource_changed':
      return '◆';
    case 'ultimate_charge_changed':
      return '★';
    case 'cooldown_started':
      return '⧗';
    case 'cooldown_ticked':
      return '·';
    case 'actor_defeated':
      return '☠';
    case 'phase_transition':
      return '⚡';
    case 'action_denied':
      return '⛔';
    case 'battle_ended':
      return event.result.outcome === 'victory' ? '🏆' : '☠';
    default:
      return cue === 'phase' ? '⚡' : '·';
  }
}

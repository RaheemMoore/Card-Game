import { useEffect, useMemo, useRef } from 'react';
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
 * Right-side Combat Journal rail. Fantasy framing (gold-trim header, dark
 * parchment body). Three visual bands: current round marker, active event
 * (emphasized card), and history (dim scrolling list).
 */
export function CombatJournalRail({ journal, isPlaying, pendingCount, onSkip }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [journal.length]);

  const { active, history, currentRound } = useMemo(() => {
    const activeBeat = journal[journal.length - 1] ?? null;
    const historyBeats = journal.slice(0, -1);
    let round = 0;
    for (const b of journal) {
      if (b.event.kind === 'round_started') round = b.event.round;
    }
    return { active: activeBeat, history: historyBeats, currentRound: round };
  }, [journal]);

  return (
    <aside
      className="flex flex-col h-full relative"
      style={{
        background:
          'linear-gradient(180deg, rgba(20,10,14,0.95) 0%, rgba(8,4,10,0.95) 100%)',
        borderLeft: '1px solid rgba(184,134,11,0.35)',
        boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.6)',
      }}
      aria-label="Combat Journal"
    >
      {/* Header — round marker + skip */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b"
        style={{
          borderColor: 'rgba(184,134,11,0.45)',
          background:
            'linear-gradient(180deg, rgba(30,18,12,0.9) 0%, rgba(15,8,10,0.9) 100%)',
        }}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-fantasy text-xs text-gold uppercase tracking-widest">
            Journal
          </span>
          <span className="text-[10px] text-bone/50 tabular-nums">
            Round {currentRound || '—'}
          </span>
        </div>
        {isPlaying && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-gold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded"
            aria-label={`Skip ${pendingCount} pending combat beats`}
          >
            Skip · {pendingCount}
          </button>
        )}
      </div>

      {/* History (scrolls) */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5"
        aria-live="polite"
      >
        {history.map((beat) => (
          <JournalRow key={beat.id} beat={beat} tone="history" />
        ))}
      </div>

      {/* Active event — pinned card at bottom, emphasized */}
      {active && (
        <div
          className="px-2 py-2 border-t"
          style={{
            borderColor: 'rgba(184,134,11,0.35)',
            background:
              'linear-gradient(180deg, rgba(45,28,10,0.55) 0%, rgba(20,10,14,0.75) 100%)',
          }}
        >
          <div className="text-[9px] uppercase tracking-widest text-gold/80 mb-1 px-1">
            Active
          </div>
          <JournalRow beat={active} tone="active" />
        </div>
      )}
    </aside>
  );
}

function JournalRow({ beat, tone }: { beat: AnimationBeat; tone: 'history' | 'active' }) {
  const icon = iconFor(beat.event, beat.cue);
  const isRound = beat.event.kind === 'round_started';
  if (isRound && tone === 'history') {
    // Render round starts as thin dividers in history
    const round = (beat.event as Extract<BattleEvent, { kind: 'round_started' }>).round;
    return (
      <div className="flex items-center gap-2 my-1 px-1">
        <div className="flex-1 h-px bg-gold/20" />
        <span className="text-[9px] uppercase tracking-widest text-gold/60">
          Round {round}
        </span>
        <div className="flex-1 h-px bg-gold/20" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-start gap-2 rounded px-1.5 py-1 text-[11px] leading-snug ${
        tone === 'active'
          ? 'bg-gold/10 border border-gold/40 text-bone shadow-[inset_0_0_8px_rgba(212,175,55,0.15)]'
          : 'text-bone/55'
      }`}
    >
      <span className="text-sm shrink-0 leading-none pt-0.5" aria-hidden>
        {icon}
      </span>
      <span className="font-mono truncate">{formatEvent(beat.event)}</span>
    </div>
  );
}

function iconFor(event: BattleEvent, cue: BeatCue): string {
  switch (event.kind) {
    case 'battle_started': return '⚔';
    case 'round_started': return '⏱';
    case 'boss_intent_declared': return '👁';
    case 'player_action_selected': return '✋';
    case 'damage_dealt': return '💥';
    case 'healing_applied': return '➕';
    case 'shield_gained': return '🛡';
    case 'status_applied': return '✳';
    case 'status_removed': return '·';
    case 'resource_changed': return '◆';
    case 'ultimate_charge_changed': return '★';
    case 'cooldown_started': return '⧗';
    case 'cooldown_ticked': return '·';
    case 'actor_defeated': return '☠';
    case 'phase_transition': return '⚡';
    case 'action_denied': return '⛔';
    case 'battle_ended': return event.result.outcome === 'victory' ? '🏆' : '☠';
    default: return cue === 'phase' ? '⚡' : '·';
  }
}

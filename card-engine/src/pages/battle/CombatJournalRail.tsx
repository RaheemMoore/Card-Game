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
 * Right-side Combat Journal rail. Fantasy framing (double gold trim, dark
 * parchment gradient) that shares its border language with the Boss HUD +
 * bottom shelf so the whole combat UI reads as one game interface. Round
 * dividers separate history; the Active event is emphasized in its own
 * pinned band.
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
        background: 'linear-gradient(180deg, rgba(20,10,14,0.95) 0%, rgba(8,4,10,0.98) 100%)',
        borderLeft: '1px solid rgba(184,134,11,0.55)',
        boxShadow: 'inset 1px 0 0 rgba(0,0,0,0.85), inset 2px 0 0 rgba(184,134,11,0.15)',
      }}
      aria-label="Combat Journal"
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between relative"
        style={{
          borderBottom: '1px solid rgba(184,134,11,0.45)',
          background: 'linear-gradient(180deg, rgba(38,22,14,0.9) 0%, rgba(18,10,12,0.9) 100%)',
          boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.6)',
        }}
      >
        <CornerFlourish pos="tl" />
        <CornerFlourish pos="tr" />
        <div className="flex items-baseline gap-2">
          <span className="font-fantasy text-xs text-gold uppercase tracking-widest">
            Combat Log
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentRound > 0 && (
            <span className="text-[10px] text-bone/50 tabular-nums font-fantasy">
              Rd {currentRound}
            </span>
          )}
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
      </div>

      {/* History */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-0.5"
        aria-live="polite"
      >
        {history.map((beat) => (
          <JournalRow key={beat.id} beat={beat} tone="history" />
        ))}
      </div>

      {/* Active */}
      {active && (
        <div
          className="px-2 py-2 relative"
          style={{
            borderTop: '1px solid rgba(184,134,11,0.45)',
            background: 'linear-gradient(180deg, rgba(45,28,10,0.6) 0%, rgba(20,10,14,0.8) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.7)',
          }}
        >
          <CornerFlourish pos="bl" />
          <CornerFlourish pos="br" />
          <div className="text-[9px] uppercase tracking-widest text-gold/80 mb-1 px-1 font-fantasy">
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
    const round = (beat.event as Extract<BattleEvent, { kind: 'round_started' }>).round;
    return (
      <div className="flex items-center gap-2 my-1.5 px-1">
        <div className="flex-1 h-px bg-gold/25" />
        <span className="text-[9px] uppercase tracking-widest text-gold/60 font-fantasy">
          Round {round}
        </span>
        <div className="flex-1 h-px bg-gold/25" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-start gap-2 rounded px-1.5 py-1 text-[11px] leading-snug ${
        tone === 'active'
          ? 'text-bone shadow-[inset_0_0_10px_rgba(212,175,55,0.18)]'
          : 'text-bone/55'
      }`}
      style={
        tone === 'active'
          ? {
              background: 'rgba(45,28,10,0.55)',
              border: '1px solid rgba(212,175,55,0.4)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
            }
          : undefined
      }
    >
      <span
        className="shrink-0 flex items-center justify-center rounded"
        style={{
          width: 20,
          height: 20,
          background: tone === 'active' ? 'rgba(30,15,12,0.85)' : 'rgba(20,12,16,0.6)',
          border: '1px solid rgba(184,134,11,0.4)',
          fontSize: 12,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span className="font-mono truncate pt-0.5">{formatEvent(beat.event)}</span>
    </div>
  );
}

function CornerFlourish({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: 8,
    height: 8,
    color: 'rgba(212,175,55,0.6)',
    pointerEvents: 'none',
  };
  if (pos === 'tl') Object.assign(posStyle, { top: 2, left: 2 });
  if (pos === 'tr') Object.assign(posStyle, { top: 2, right: 2, transform: 'scaleX(-1)' });
  if (pos === 'bl') Object.assign(posStyle, { bottom: 2, left: 2, transform: 'scaleY(-1)' });
  if (pos === 'br') Object.assign(posStyle, { bottom: 2, right: 2, transform: 'scale(-1,-1)' });
  return (
    <svg viewBox="0 0 8 8" style={posStyle} aria-hidden fill="none">
      <path d="M0 0 L5 0 M0 0 L0 5" stroke="currentColor" strokeWidth="1" />
    </svg>
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

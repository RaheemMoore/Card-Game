import { useEffect, useRef } from 'react';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { formatEvent } from './formatEvent';

interface Props {
  journal: readonly AnimationBeat[];
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
}

/**
 * Paced replacement for EventLog. Reads its journal from an
 * EncounterScreen-owned useCombatPresentation instance so the same beats
 * that drive the Journal also drive floating damage numbers, hit-shake,
 * and wind-up glows in the other components.
 */
export function CombatJournal({ journal, isPlaying, pendingCount, onSkip }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [journal.length]);

  const visible = journal.slice(-8);

  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-3 mb-6">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-bone/50">
          Combat journal
        </div>
        {isPlaying && (
          <button
            type="button"
            onClick={onSkip}
            className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-bone underline"
            aria-label={`Skip ${pendingCount} pending combat beats`}
          >
            Skip · {pendingCount}
          </button>
        )}
      </div>
      <div ref={scrollRef} className="max-h-40 overflow-y-auto" aria-live="polite">
        {visible.map((beat) => (
          <div key={beat.id} className="text-[11px] text-bone/70 font-mono">
            {formatEvent(beat.event)}
          </div>
        ))}
      </div>
    </div>
  );
}

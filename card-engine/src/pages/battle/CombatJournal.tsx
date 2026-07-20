import { useEffect, useRef } from 'react';
import type { BattleEvent } from '../../types/combat';
import { useCombatPresentation } from '../../services/combat/presentation/useCombatPresentation';
import { formatEvent } from './formatEvent';

interface Props {
  rawEvents: readonly BattleEvent[];
}

/**
 * Paced replacement for EventLog. Consumes the reducer's raw event stream and
 * reveals entries at Combat Wiki timings via the presentation queue.
 *
 * Interim caveat (until C4 renders hero/boss from presentation state): visual
 * HP bars will snap to their new value before the Journal reveals the hit that
 * caused it. This is expected mid-refactor.
 */
export function CombatJournal({ rawEvents }: Props) {
  const { journal, isPlaying, pendingCount, skip } = useCombatPresentation(rawEvents);
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
            onClick={skip}
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

import type { PlayerAction } from '../../types/combat';

interface Props {
  round: number;
  canAct: boolean;
  onExit: () => void;
  onSubmit: (action: PlayerAction) => void;
}

/**
 * Bottom control cluster docked into the combat frame:
 *   Left: Leave  Round N
 *   Center: End Turn (guards the current hero if no ability was picked)
 *   Right: Guard / Focus quick-picks
 *
 * End Turn intentionally maps to `guard` when no other ability is pending —
 * the existing per-hero submit path handles it, and it gives players a
 * defensive default when they don't want to burn resource.
 */
export function BattleControls({ round, canAct, onExit, onSubmit }: Props) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3"
      style={{ zIndex: 30 }}
    >
      {/* Left cluster — leave + round */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExit}
          className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-bone underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded px-1 py-0.5"
          aria-label="Leave battle"
        >
          ← Leave
        </button>
        <span
          className="text-[10px] uppercase tracking-widest text-bone/50 font-fantasy"
          aria-label={`Round ${round}`}
        >
          Round {round}
        </span>
      </div>

      {/* Center — END TURN */}
      <button
        type="button"
        onClick={() => canAct && onSubmit({ kind: 'guard' })}
        disabled={!canAct}
        className="font-fantasy text-sm font-bold px-6 py-2 rounded-md border-2 disabled:opacity-40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        style={{
          background: canAct
            ? 'linear-gradient(to bottom, #b8860b, #6a1010)'
            : 'rgba(30,15,10,0.6)',
          borderColor: canAct ? 'rgba(212,175,55,0.7)' : 'rgba(184,26,26,0.35)',
          color: '#faeaca',
          minWidth: '150px',
          boxShadow: canAct ? '0 0 22px rgba(212,175,55,0.35)' : undefined,
          letterSpacing: '0.12em',
        }}
        aria-label="End turn (guards remaining heroes)"
      >
        END TURN
      </button>

      {/* Right cluster — Focus (quick resource top-up) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => canAct && onSubmit({ kind: 'focus' })}
          disabled={!canAct}
          className="text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border border-bone/25 text-bone/80 hover:border-bone/60 hover:text-bone disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          title="Focus: +resource, +ult charge"
        >
          Focus
        </button>
        <button
          type="button"
          onClick={() => canAct && onSubmit({ kind: 'inspect' })}
          disabled={!canAct}
          className="text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded border border-bone/25 text-bone/80 hover:border-bone/60 hover:text-bone disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          title="Inspect the boss"
        >
          Inspect
        </button>
      </div>
    </div>
  );
}

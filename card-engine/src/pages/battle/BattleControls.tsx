import type { PlayerAction } from '../../types/combat';
import { FantasyPanel } from './FantasyPanel';

interface Props {
  canAct: boolean;
  onExit: () => void;
  onSubmit: (action: PlayerAction) => void;
}

/**
 * Bottom command cluster docked into the shelf. Round + turn counter live
 * separately in the top-right TurnPill; this row is just the interactive
 * command controls.
 *
 *   Left:  Leave  +  small icon-buttons (settings/journal/auto)
 *   Center: END TURN (pill button)
 *   Right: Focus  Inspect
 */
export function BattleControls({ canAct, onExit, onSubmit }: Props) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3"
      style={{ zIndex: 30 }}
    >
      {/* Left — leave + auxiliary icon cluster */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExit}
          className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-gold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded px-1 py-0.5"
          aria-label="Leave battle"
        >
          ← Leave
        </button>
        <IconChip label="⚙" aria="Settings (coming soon)" />
        <IconChip label="📖" aria="Full history (coming soon)" />
        <IconChip label="⟳ AUTO" aria="Auto-battle (coming soon)" wide />
      </div>

      {/* Center — END TURN pill */}
      <FantasyPanel
        ornaments={false}
        className="rounded-md"
        accent={canAct ? 'rgba(212,175,55,0.85)' : 'rgba(184,26,26,0.35)'}
        glow={canAct ? 'rgba(212,175,55,0.35)' : undefined}
        style={{
          background: canAct
            ? 'linear-gradient(180deg, #6a1010 0%, #2d0a0a 100%)'
            : 'linear-gradient(180deg, rgba(30,15,10,0.85) 0%, rgba(15,8,10,0.9) 100%)',
        }}
      >
        <button
          type="button"
          onClick={() => canAct && onSubmit({ kind: 'guard' })}
          disabled={!canAct}
          className="font-fantasy text-sm font-bold px-8 py-2 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{
            color: '#faeaca',
            minWidth: '160px',
            letterSpacing: '0.16em',
          }}
          aria-label="End turn (guards remaining heroes)"
        >
          END TURN
        </button>
      </FantasyPanel>

      {/* Right — Focus + Inspect */}
      <div className="flex items-center gap-2">
        <QuickButton
          label="Focus"
          onClick={() => canAct && onSubmit({ kind: 'focus' })}
          disabled={!canAct}
        />
        <QuickButton
          label="Inspect"
          onClick={() => canAct && onSubmit({ kind: 'inspect' })}
          disabled={!canAct}
        />
      </div>
    </div>
  );
}

function IconChip({ label, aria, wide = false }: { label: string; aria: string; wide?: boolean }) {
  return (
    <FantasyPanel ornaments={false} className="rounded-md">
      <button
        type="button"
        disabled
        aria-label={aria}
        title={aria}
        className={`${wide ? 'px-2.5' : 'px-2'} py-1 text-[10px] uppercase tracking-widest text-bone/50 focus:outline-none`}
      >
        {label}
      </button>
    </FantasyPanel>
  );
}

function QuickButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <FantasyPanel ornaments={false} className="rounded-md">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-bone/80 hover:text-bone disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        {label}
      </button>
    </FantasyPanel>
  );
}

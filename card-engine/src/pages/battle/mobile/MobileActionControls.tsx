import type { PlayerAction } from '../../../types/combat';

interface Props {
  canAct: boolean;
  /** Heroes still owing a command this round — sets End Party Turn subtext. */
  pendingCount: number;
  /** Total heroes alive this round — the denominator for pendingCount. */
  totalHeroes: number;
  onSubmit: (action: PlayerAction) => void;
}

/**
 * Mobile action controls: Focus, Inspect, End Party Turn (primary), Auto.
 * Auto is a display-only affordance because the reducer does not yet support
 * auto-battle — it's stubbed as disabled with an explanatory title.
 */
export function MobileActionControls({ canAct, pendingCount, totalHeroes, onSubmit }: Props) {
  const endParty = () => {
    if (!canAct) return;
    const n = Math.max(1, pendingCount);
    for (let i = 0; i < n; i++) onSubmit({ kind: 'guard' });
  };
  const endLabel = pendingCount > 1 || totalHeroes > 1 ? 'END PARTY TURN' : 'END TURN';
  const endSub =
    totalHeroes > 1
      ? `(${totalHeroes - pendingCount} / ${totalHeroes})`
      : null;

  return (
    <div
      className="grid items-stretch gap-2 w-full"
      style={{
        gridTemplateColumns: '54px 54px 1fr 54px',
      }}
    >
      <IconButton
        glyph="◎"
        label="Focus"
        onClick={() => canAct && onSubmit({ kind: 'focus' })}
        disabled={!canAct}
      />
      <IconButton
        glyph="⚲"
        label="Inspect"
        onClick={() => canAct && onSubmit({ kind: 'inspect' })}
        disabled={!canAct}
      />
      <button
        type="button"
        onClick={endParty}
        disabled={!canAct}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-45"
        style={{
          height: 54,
          borderRadius: 6,
          border: '2px solid #eb962e',
          background: canAct
            ? 'linear-gradient(to right, #592b09, #1a1412)'
            : 'linear-gradient(to right, #2a1608, #150c0e)',
          color: '#ffdb94',
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: canAct ? 'pointer' : 'not-allowed',
          boxShadow: canAct ? '0 0 18px rgba(235,150,46,0.35)' : 'none',
          transition: 'box-shadow 200ms, opacity 200ms',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          padding: '0 8px',
        }}
        aria-label={`${endLabel}${endSub ? ` ${endSub}` : ''} — guards all remaining heroes and lets the boss act`}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.2,
          }}
        >
          {endLabel}
        </span>
        {endSub && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.8,
              opacity: 0.85,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {endSub}
          </span>
        )}
      </button>
      <IconButton
        glyph="»"
        label="Auto"
        onClick={undefined}
        disabled
        title="Auto-battle coming soon"
      />
    </div>
  );
}

function IconButton({
  glyph,
  label,
  onClick,
  disabled,
  title,
}: {
  glyph: string;
  label: string;
  onClick?: () => void;
  disabled: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
      style={{
        height: 54,
        borderRadius: 5,
        border: '1px solid #573b1f',
        background: '#0f0e0f',
        color: '#d6c7a8',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      aria-label={label}
    >
      <span style={{ fontSize: 18, lineHeight: 1 }}>{glyph}</span>
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </button>
  );
}

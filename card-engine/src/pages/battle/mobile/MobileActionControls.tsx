interface Props {
  canAct: boolean;
  plannedCount: number;
  totalHeroes: number;
  onPlanGuard: () => void;
  onReleasePlan: () => void;
}

/**
 * Mobile action controls: End Party Turn (primary), Auto.
 * Auto is a display-only affordance because the reducer does not yet support
 * auto-battle — it's stubbed as disabled with an explanatory title.
 */
export function MobileActionControls({
  canAct,
  plannedCount,
  totalHeroes,
  onPlanGuard,
  onReleasePlan,
}: Props) {
  const ready = totalHeroes > 0 && plannedCount === totalHeroes;
  const label = ready ? 'RELEASE PARTY' : 'ARM PARTY';
  const sub = `(${plannedCount} / ${totalHeroes})`;

  return (
    <div
      className="grid items-stretch gap-2 w-full"
      style={{
        gridTemplateColumns: '1fr 54px',
      }}
    >
      <button
        type="button"
        onClick={onReleasePlan}
        disabled={!canAct || !ready}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-45"
        style={{
          height: 54,
          borderRadius: 6,
          border: '2px solid #eb962e',
          background: canAct && ready
            ? 'linear-gradient(to right, #592b09, #1a1412)'
            : 'linear-gradient(to right, #2a1608, #150c0e)',
          color: '#ffdb94',
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: canAct && ready ? 'pointer' : 'not-allowed',
          boxShadow: canAct && ready ? '0 0 18px rgba(235,150,46,0.35)' : 'none',
          transition: 'box-shadow 200ms, opacity 200ms',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          padding: '0 8px',
        }}
        aria-label={ready ? `Release party ${sub}` : `Arm party ${sub}`}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 1.2,
          }}
        >
          {label}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.8,
              opacity: 0.85,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {sub}
          </span>
        )}
      </button>
      <IconButton glyph="◇" label="Guard" onClick={onPlanGuard} disabled={!canAct} />
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

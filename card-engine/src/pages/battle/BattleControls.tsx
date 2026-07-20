import type { PlayerAction } from '../../types/combat';
import { CombatFrame } from './CombatFrame';

interface Props {
  canAct: boolean;
  /** Heroes still owing a command this round. Used to size the End Turn stroke. */
  pendingCount?: number;
  onExit: () => void;
  onSubmit: (action: PlayerAction) => void;
}

/**
 * Bottom battle controls, sourced from Figma nodes:
 *   - CombatFrame/UtilityTray (22:90 / 20:36) — 226×72 tray with 58×48 chips
 *   - CommandShelf End Turn Zone (18:64) — 230×96 with gradient End Turn button
 *
 * The Command Shelf backdrop itself is rendered separately in CombatScene
 * (a full-width shelf frame using preset="commandShelf"). This component
 * places the utility tray on the left and the End Turn on the right.
 */
export function BattleControls({ canAct, pendingCount = 1, onExit, onSubmit }: Props) {
  // End Turn = "every remaining hero guards + boss goes." Submitting once per
  // pending hero cycles the party through in one click so users don't have to
  // hunt the End Turn button for each hero individually.
  const endParty = () => {
    if (!canAct) return;
    const n = Math.max(1, pendingCount);
    for (let i = 0; i < n; i++) onSubmit({ kind: 'guard' });
  };
  const endLabel = pendingCount > 1 ? `END PARTY TURN (${pendingCount})` : 'END TURN';
  const endAria =
    pendingCount > 1
      ? `End party turn — guards all ${pendingCount} remaining heroes and lets the boss act`
      : 'End turn — guards this hero and lets the boss act';
  return (
    <div
      className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-6"
      style={{ zIndex: 30, height: '5rem' }}
    >
      {/* Utility tray — Settings / Guide / Leave */}
      <CombatFrame preset="utilityTray" style={{ width: 226, height: 72 }}>
        <UtilityChip x={12.5} label="⚙" caption="SETTINGS" onClick={undefined} />
        <UtilityChip x={80.5} label="📖" caption="GUIDE" onClick={undefined} />
        <UtilityChip x={148.5} label="✕" caption="LEAVE" onClick={onExit} />
      </CombatFrame>

      {/* Center: focus + inspect quick actions */}
      <div className="flex gap-2">
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

      {/* End Turn button — Figma 18:65: gradient border 2px #eb962e, 190×58.
          P1: one click ends the whole party turn (all pending heroes guard).
          Label + aria communicate that so users don't have to guess. */}
      <button
        type="button"
        onClick={endParty}
        disabled={!canAct}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-45"
        style={{
          width: 210,
          height: 58,
          borderRadius: 6,
          border: '2px solid #eb962e',
          background: canAct
            ? 'linear-gradient(to right, #592b09, #1a1412)'
            : 'linear-gradient(to right, #2a1608, #150c0e)',
          color: '#ffdb94',
          fontSize: pendingCount > 1 ? 13 : 18,
          fontWeight: 600,
          letterSpacing: 1.6,
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: canAct ? 'pointer' : 'not-allowed',
          boxShadow: canAct ? '0 0 22px rgba(235,150,46,0.35)' : 'none',
          transition: 'box-shadow 200ms, opacity 200ms',
        }}
        aria-label={endAria}
        title={endAria}
      >
        {endLabel}
      </button>
    </div>
  );
}

/**
 * Chip inside the Utility Tray — matches Figma 20:38/41/44: 58×48 tile,
 * #0f0e0f bg, #573b1f border, 5px radius, glyph icon + 7px caption.
 */
function UtilityChip({
  x,
  label,
  caption,
  onClick,
}: {
  x: number;
  label: string;
  caption: string;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{
        position: 'absolute',
        left: x,
        top: 10.5,
        width: 58,
        height: 48,
        background: '#0f0e0f',
        border: '1px solid #573b1f',
        borderRadius: 5,
        overflow: 'hidden',
        color: '#b8a68a',
        cursor: clickable ? 'pointer' : 'default',
        opacity: clickable ? 1 : 0.75,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
      aria-label={caption}
      title={clickable ? caption : `${caption} (coming soon)`}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{label}</span>
      <span
        style={{
          fontSize: 7,
          fontWeight: 600,
          letterSpacing: 1,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {caption}
      </span>
    </button>
  );
}

function QuickButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-40"
      style={{
        padding: '8px 14px',
        borderRadius: 5,
        border: '1px solid #573b1f',
        background: '#0f0e0f',
        color: '#d6c7a8',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}

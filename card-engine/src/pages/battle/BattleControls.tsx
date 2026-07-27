import type { PlayerAction } from '../../types/combat';

interface Props {
  canAct: boolean;
  /** Heroes still owing a command this round. Used to size the End Turn stroke. */
  pendingCount?: number;
  onExit: () => void;
  onSubmit: (action: PlayerAction) => void;
  onOpenGuide: () => void;
}

/**
 * Utility tray (Settings/Guide/Leave) + End Turn — the right-hand zone of
 * the composed command shelf (see CombatScene.tsx). Used to render as its
 * own independently-bordered CombatFrame box; now a borderless group living
 * inside the shelf's single painted frame, separated from End Turn by a
 * thin seam instead of a second outer stroke.
 */
export function BattleControls({ canAct, pendingCount = 1, onExit, onSubmit, onOpenGuide }: Props) {
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
    <div className="flex items-center gap-3">
      {/* Utility tray — Settings / Guide / Leave, borderless group */}
      <div className="flex items-center gap-1.5">
        <UtilityChip label="⚙" caption="SETTINGS" onClick={undefined} />
        <UtilityChip label="📖" caption="GUIDE" onClick={onOpenGuide} />
        <UtilityChip label="✕" caption="LEAVE" onClick={onExit} />
      </div>

      {/* Seam — a thin inset rule instead of a second frame boundary */}
      <div aria-hidden style={{ width: 1, height: 44, background: 'rgba(128,79,33,0.5)' }} />

      {/* End Turn button — gradient border, unchanged visual language.
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
  label,
  caption,
  onClick,
}: {
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


import { useState } from 'react';
import type { PlayerAction } from '../../types/combat';
import { LeaveConfirmModal } from './LeaveConfirmModal';

interface Props {
  canAct: boolean;
  /** Heroes still owing a command this round. Used to size the End Turn stroke. */
  pendingCount?: number;
  /** Boss action currently resolving, if any. Rendered as a caption over the
   *  End Turn button so the disabled state says WHY it's disabled — this
   *  used to be the Turn Badge's "RESOLVE · <name>" line. */
  resolvingIntentName?: string | null;
  onExit: () => void;
  onSubmit: (action: PlayerAction) => void;
  onOpenGuide: () => void;
}

/**
 * Utility tray (Settings/Guide/Leave) + End Turn — the right-hand zone of
 * the composed command shelf (see CombatScene.tsx). The utility tray is a
 * Tertiary-weight secondary-controls cluster (see CombatFrame.tsx's
 * panel-tier comment) — one quiet, single-bordered group, sized and toned
 * down from End Turn so it reads as clearly subordinate rather than a
 * fourth combat-level action sitting at the same visual weight.
 */
export function BattleControls({
  canAct,
  pendingCount = 1,
  resolvingIntentName = null,
  onExit,
  onSubmit,
  onOpenGuide,
}: Props) {
  const [confirmingLeave, setConfirmingLeave] = useState(false);

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
      {/* Utility tray — Settings / Guide / Leave, one quiet bordered group
          instead of three individually-bordered chips, so it reads as a
          single subordinate cluster rather than three peer buttons. */}
      <div
        className="flex items-center"
        style={{
          gap: 1,
          padding: 3,
          background: '#0a0908',
          border: '1px solid rgba(87,59,31,0.55)',
          borderRadius: 6,
        }}
      >
        <UtilityChip label="⚙" caption="SETTINGS" onClick={undefined} />
        <UtilityChip label="📖" caption="GUIDE" onClick={onOpenGuide} />
        {/* Leave is deliberately the same quiet weight as Settings/Guide at
            rest — it only escalates once the confirm step is triggered — so
            it can't be mistaken for a second primary action next to End Turn. */}
        <UtilityChip label="✕" caption="LEAVE" onClick={() => setConfirmingLeave(true)} />
      </div>

      {/* Seam — a thin inset rule instead of a second frame boundary */}
      <div aria-hidden style={{ width: 1, height: 44, background: 'rgba(128,79,33,0.5)' }} />

      {/* End Turn button — gradient border, unchanged visual language.
          P1: one click ends the whole party turn (all pending heroes guard).
          Label + aria communicate that so users don't have to guess. */}
      <div className="relative">
        {/* Resolve caption — shown while the boss's beat is animating. Sits
            above the button so the player has somewhere to read "the boss is
            doing X right now" after the old Turn Badge went away. */}
        {resolvingIntentName && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              textAlign: 'center',
              color: '#c98a3e',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 1.2,
              fontFamily: 'Inter, system-ui, sans-serif',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {`BOSS · ${resolvingIntentName.toUpperCase()}`}
          </div>
        )}
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

      {confirmingLeave && (
        <LeaveConfirmModal
          onCancel={() => setConfirmingLeave(false)}
          onConfirm={() => {
            setConfirmingLeave(false);
            onExit();
          }}
        />
      )}
    </div>
  );
}

/**
 * Chip inside the Utility Tray — quieter and smaller than the original
 * Figma 20:38/41/44 spec (58×48, individually bordered) since the tray is
 * now one shared bordered group rather than three peer buttons.
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
        width: 46,
        height: 40,
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        overflow: 'hidden',
        color: '#8a7a5c',
        cursor: clickable ? 'pointer' : 'default',
        opacity: clickable ? 1 : 0.55,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
      aria-label={caption}
      title={clickable ? caption : `${caption} (coming soon)`}
    >
      <span style={{ fontSize: 13, lineHeight: 1 }}>{label}</span>
      <span
        style={{
          fontSize: 6,
          fontWeight: 600,
          letterSpacing: 0.8,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {caption}
      </span>
    </button>
  );
}

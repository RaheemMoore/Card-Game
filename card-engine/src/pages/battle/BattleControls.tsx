import { useState } from 'react';
import type { MotionLevel } from '../../vfx/types';
import { LeaveConfirmModal } from './LeaveConfirmModal';
import { useViewportWidth } from './useViewportWidth';
import { controlsGap, endTurnWidth, utilityChipWidth } from './shelfLayout';

interface Props {
  canAct: boolean;
  plannedCount: number;
  partyCount: number;
  /** Boss action currently resolving, if any. Rendered as a caption over the
   *  End Turn button so the disabled state says WHY it's disabled — this
   *  used to be the Turn Badge's "RESOLVE · <name>" line. */
  resolvingIntentName?: string | null;
  motionLevel: MotionLevel;
  onChangeMotionLevel: (next: MotionLevel) => void;
  onExit: () => void;
  onPlanGuard: () => void;
  onReleasePlan: () => void;
  onOpenGuide: () => void;
}

/** Cycle order for the Motion chip. Ascending intensity, wrapping. */
const MOTION_CYCLE: readonly MotionLevel[] = ['off', 'subtle', 'full'];
const MOTION_LABEL: Record<MotionLevel, string> = {
  off: 'OFF',
  subtle: 'LOW',
  full: 'FULL',
};

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
  plannedCount,
  partyCount,
  resolvingIntentName = null,
  motionLevel,
  onChangeMotionLevel,
  onExit,
  onPlanGuard,
  onReleasePlan,
  onOpenGuide,
}: Props) {
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  // Widths come from `shelfLayout`, never from inline clamp() strings. That is
  // what lets `shelfBudget.test.ts` know what this cluster costs — the shelf
  // overflowed twice precisely because no single place knew the total.
  const vw = useViewportWidth();

  const ready = partyCount > 0 && plannedCount === partyCount;
  const unfinished = partyCount - plannedCount;
  const unfinishedLabel = `${unfinished} ${unfinished === 1 ? 'hero still needs' : 'heroes still need'} an action`;
  const releaseLabel = ready
    ? `RELEASE PARTY · ${plannedCount}/${partyCount}`
    : `ARM PARTY · ${plannedCount}/${partyCount}`;
  return (
    <div className="flex items-center" style={{ gap: controlsGap(vw), minWidth: 0 }}>
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
        {/* Motion intensity. A cycling chip rather than a menu: it's a
            three-value setting players will want to A/B against themselves,
            so the cheapest possible round trip matters more than discovering
            all three states at once. Labelled with text, not an icon —
            "how much does the screen move" is not a guessable glyph. */}
        <UtilityChip
          label={MOTION_LABEL[motionLevel]}
          caption="MOTION"
          onClick={() =>
            onChangeMotionLevel(
              MOTION_CYCLE[(MOTION_CYCLE.indexOf(motionLevel) + 1) % MOTION_CYCLE.length],
            )
          }
          ariaLabel={`Motion: ${MOTION_LABEL[motionLevel]}. Activate to change.`}
          width={utilityChipWidth(vw)}
        />
        <UtilityChip label="📖" caption="GUIDE" onClick={onOpenGuide} width={utilityChipWidth(vw)} />
        {/* Leave is deliberately the same quiet weight as Settings/Guide at
            rest — it only escalates once the confirm step is triggered — so
            it can't be mistaken for a second primary action next to End Turn. */}
        <UtilityChip label="✕" caption="LEAVE" onClick={() => setConfirmingLeave(true)} width={utilityChipWidth(vw)} />
      </div>

      {/* Seam — a thin inset rule instead of a second frame boundary */}
      <div aria-hidden style={{ width: 1, height: 44, background: 'rgba(128,79,33,0.5)' }} />

      <UtilityChip
        label="◇"
        caption="GUARD"
        onClick={canAct ? onPlanGuard : undefined}
        ariaLabel="Arm Guard for the active hero"
        width={utilityChipWidth(vw)}
      />

      {/* STRIKE lives beside the resource vessels now, not here. It was 88px
          plus a 12px margin in this cluster, and that ~100px is exactly what
          pushed End Turn off the right edge of the screen. It also belongs
          there on merit: it is the action that FILLS the vessels, so grouping
          "generate" with "what you generated" reads better than grouping it
          with the turn controls. */}

      {/* The round's single commit boundary. Until every living card has a
          command it is a visible readiness counter, not a partial submit. */}
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
        onClick={onReleasePlan}
        disabled={!canAct || !ready}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-45"
        style={{
          width: endTurnWidth(vw),
          height: 58,
          borderRadius: 6,
          border: '2px solid #eb962e',
          background: canAct && ready
            ? 'linear-gradient(to right, #592b09, #1a1412)'
            : 'linear-gradient(to right, #2a1608, #150c0e)',
          color: '#ffdb94',
          fontSize: 'clamp(9px, 1.15vw, 13px)',
          fontWeight: 600,
          letterSpacing: 1.6,
          fontFamily: 'Inter, system-ui, sans-serif',
          cursor: canAct && ready ? 'pointer' : 'not-allowed',
          boxShadow: canAct && ready ? '0 0 22px rgba(235,150,46,0.35)' : 'none',
          transition: 'box-shadow 200ms, opacity 200ms',
        }}
        aria-label={ready ? 'Release all prepared party actions' : unfinishedLabel}
        title={ready ? 'Release the party in card order' : unfinishedLabel}
      >
        {releaseLabel}
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
  ariaLabel,
  width,
}: {
  label: string;
  caption: string;
  /** From `shelfLayout.utilityChipWidth` — see the note in BattleControls. */
  width: number;
  onClick?: () => void;
  /** Overrides the caption for screen readers when the chip carries state
   *  the caption alone does not convey (e.g. the Motion level). */
  ariaLabel?: string;
}) {
  const clickable = typeof onClick === 'function';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      style={{
        width,
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
      aria-label={ariaLabel ?? caption}
      title={clickable ? (ariaLabel ?? caption) : `${caption} (coming soon)`}
    >
      <span style={{ fontSize: label.length > 2 ? 9 : 13, fontWeight: label.length > 2 ? 700 : 400, lineHeight: 1 }}>{label}</span>
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

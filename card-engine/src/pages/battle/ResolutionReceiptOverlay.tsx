import type { BattleEvent, BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import type { MotionLevel } from '../../vfx/types';
import { receiptForEvent, type ReceiptTone } from '../../services/combat/decision/receipts';
import { BOSS_POINT, resolveAnchor } from './combatAnchors';

interface Props {
  state: BattleState;
  events: readonly BattleEvent[];
  currentBeat: AnimationBeat | null;
  motionLevel: MotionLevel;
  viewportWidth: number;
}

/** The immediate confirmation for the authoritative event currently playing. */
export function ResolutionReceiptOverlay({
  state,
  events,
  currentBeat,
  motionLevel,
  viewportWidth,
}: Props) {
  if (!currentBeat || currentBeat.suppressEffects) return null;
  const index = eventIndex(currentBeat.id);
  const receipt = receiptForEvent(
    currentBeat.event,
    state,
    index === null ? events : events.slice(0, index),
  );
  if (!receipt) return null;

  const point = targetPoint(currentBeat.event, state, viewportWidth);
  return (
    <div
      data-resolution-receipt
      key={currentBeat.id}
      role="status"
      aria-live="polite"
      className={motionLevel === 'off' ? undefined : 'resolution-receipt-in'}
      style={{
        position: 'absolute',
        left: `${point.x}%`,
        top: `${point.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 25,
        pointerEvents: 'none',
        padding: '5px 9px',
        borderRadius: 4,
        border: `1px solid ${toneColor(receipt.tone)}`,
        background: 'rgba(7,5,8,0.9)',
        color: toneColor(receipt.tone),
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1.1,
        whiteSpace: 'nowrap',
        textShadow: '0 1px 4px rgba(0,0,0,0.9)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.55)',
      }}
    >
      {receipt.text}
      <style>{`
        @keyframes resolution-receipt-in {
          0% { opacity: 0; transform: translate(-50%, -25%) scale(0.86); }
          22% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
          100% { opacity: 1; transform: translate(-50%, -58%) scale(1); }
        }
        .resolution-receipt-in { animation: resolution-receipt-in 280ms ease-out forwards; }
      `}</style>
    </div>
  );
}

function eventIndex(id: string): number | null {
  const match = /^beat_(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function targetPoint(event: BattleEvent, state: BattleState, viewportWidth: number) {
  const targetActorId =
    event.kind === 'damage_dealt' ||
    event.kind === 'healing_applied' ||
    event.kind === 'shield_gained' ||
    event.kind === 'status_applied' ||
    event.kind === 'status_removed'
      ? event.targetActorId
      : event.kind === 'ultimate_charge_changed' ||
        event.kind === 'resource_changed' ||
        event.kind === 'actor_defeated' ||
        event.kind === 'action_denied'
      ? event.actorId
      : null;

  if (!targetActorId || targetActorId === state.boss.actorId) return { ...BOSS_POINT, y: BOSS_POINT.y - 13 };
  const targetIndex = state.heroes.findIndex((hero) => hero.actorId === targetActorId);
  if (targetIndex === -1) return { ...BOSS_POINT, y: BOSS_POINT.y - 13 };
  const point = resolveAnchor('target_card_front', { viewportWidth, targetIndex });
  return { ...point, y: point.y - 9 };
}

function toneColor(tone: ReceiptTone): string {
  if (tone === 'damage') return '#ff7656';
  if (tone === 'warning') return '#f0a14a';
  if (tone === 'status') return '#c8a4ff';
  return '#9fe0ab';
}

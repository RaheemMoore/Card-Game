import type { AbilityCombatSnapshot } from '../../types/combat';
import type { AbilitySlotType } from '../../types/abilities';

const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIGNATURE',
  ultimate: 'ULTIMATE',
};

/**
 * Shared select→preview→confirm body, used by both the desktop
 * AbilityCommandBar (rendered as a panel expanding above the clicked slot)
 * and the mobile MobileAbilityRow (rendered as a popover above the strip).
 * Positioning is the parent's job — this component only owns the content
 * and the Confirm/Cancel affordance, so both surfaces stay in lockstep
 * instead of drifting into two separate confirm flows.
 */
export function AbilityPreviewCard({
  ability,
  slot,
  artUrl,
  projectedDamage,
  onConfirm,
  onCancel,
}: {
  ability: AbilityCombatSnapshot;
  slot: AbilitySlotType;
  artUrl: string | null;
  /** Computed via previewAbilityDamage — null when the ability has no direct-damage effect. */
  projectedDamage: number | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Confirm ${ability.displayName}`}
      style={{
        background: 'linear-gradient(to bottom, #18110a, #0b0806)',
        border: '1.5px solid #b8862a',
        borderRadius: 6,
        boxShadow: '0 -6px 22px rgba(0,0,0,0.65), 0 0 22px rgba(235,150,46,0.3)',
        padding: 8,
        pointerEvents: 'auto',
        display: 'flex',
        gap: 8,
      }}
    >
      {/* Art crop */}
      <div
        style={{
          width: 60,
          height: 60,
          flexShrink: 0,
          borderRadius: 4,
          overflow: 'hidden',
          background: '#1a1210',
          border: '1px solid #573b1f',
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            alt=""
            aria-hidden
            draggable={false}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #3a2612 0%, #1a1210 100%)',
            }}
          />
        )}
      </div>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div
              style={{
                color: '#f0942e',
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 1.2,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              {SLOT_LABEL[slot]}
              {ability.resourceCost > 0 && (
                <span style={{ color: '#c8a86a', marginLeft: 4, letterSpacing: 0.4 }}>
                  · COST {ability.resourceCost}
                </span>
              )}
            </div>
            <div
              style={{
                color: '#ebd9b2',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {ability.displayName}
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel ability selection"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            style={{
              width: 20,
              height: 20,
              borderRadius: 3,
              border: '1px solid #573b1f',
              background: '#0f0e0f',
              color: '#d6c7a8',
              fontSize: 10,
              lineHeight: 1,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            color: '#c8b895',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {ability.def.descriptionShort || ability.def.descriptionLong || 'Deal damage to the target.'}
        </div>

        {/* Projected damage — computed live via previewAbilityDamage, same
            math the reducer will use, so this number is never a lie. */}
        {projectedDamage !== null && (
          <div
            aria-label={`Projected ${projectedDamage} damage`}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 5,
              color: '#ff7a3d',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            }}
          >
            <span aria-hidden>⚔</span>
            <span>PROJECTED {projectedDamage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          style={{
            marginTop: 2,
            height: 26,
            borderRadius: 4,
            border: '1.5px solid #eb962e',
            background: 'linear-gradient(to right, #592b09, #1a1412)',
            color: '#ffdb94',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.4,
            fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(235,150,46,0.35)',
          }}
        >
          CONFIRM →
        </button>
      </div>
    </div>
  );
}

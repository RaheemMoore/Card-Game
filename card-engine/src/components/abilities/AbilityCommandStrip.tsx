import type { ReactNode, KeyboardEvent } from 'react';
import type { AbilityCommandState, AbilityTier, BadgeResource } from './types';
import { AbilityResourceBadge } from './AbilityResourceBadge';

interface Props {
  tier: AbilityTier;
  state: AbilityCommandState;
  displayName: string;
  effectText: string;
  /** Small right-aligned meta line (e.g. `CORE • MARTIAL`). */
  metaText?: string;
  /** 28×28 icon painted into the icon well (Figma canonical: 39.6×39.6 rotated -45°). */
  iconSlot: ReactNode;
  resource?: BadgeResource;
  resourceCost?: number;
  readOnly?: boolean;
  onActivate?: () => void;
  onHoverChange?: (hovering: boolean) => void;
  /** State overlays (Targeting, Insufficient, Focus…) rendered on top. */
  children?: ReactNode;
  className?: string;
}

/**
 * Ability Command Strip (Figma node 11:143).
 * 360×92, padding 10, gap 10, radius 10. Icon well 64×64, content column
 * 208×64, resource slot 48×48.
 *
 * State visuals: default / hover / selected / disabled / cooldown are all
 * canonical Figma surfaces + borders. Tier drives the border colour when the
 * strip is Ready (Core=default, Signature=violet, Ultimate=gold).
 */
export function AbilityCommandStrip({
  tier,
  state,
  displayName,
  effectText,
  metaText,
  iconSlot,
  resource,
  resourceCost,
  readOnly = false,
  onActivate,
  onHoverChange,
  children,
  className,
}: Props) {
  const isDisabled = state === 'disabled' || state === 'cooldown';
  const isSelected = state === 'selected';
  const isCooldown = state === 'cooldown';
  const isHover = state === 'hover';
  const isDisabledOnly = state === 'disabled';

  const tierBorder =
    tier === 'ultimate'
      ? 'var(--border-ultimate, #f3c95b)'
      : tier === 'signature'
      ? 'var(--border-signature, #b56ae8)'
      : 'var(--border-default, #4a382f)';

  // Surface + border resolve per Figma matrix (11:143 variants).
  let background = 'var(--surface-command-default, #17120f)';
  let border = `1px solid ${tierBorder}`;
  let boxShadow = '0 6px 6px rgba(0,0,0,0.45)';
  let opacity = 1;

  if (isSelected) {
    background = 'var(--surface-command-raised, #241a15)';
    border = '2px solid var(--border-selected, #f3c95b)';
    boxShadow = '0 0 14px 2px rgba(242,201,92,0.55)';
  } else if (isHover) {
    background = 'var(--surface-command-raised, #241a15)';
    border = '1px solid var(--border-hover, #e57c52)';
    boxShadow = '0 0 10px 1px rgba(229,125,82,0.55)';
  } else if (isCooldown) {
    background = 'var(--surface-command-cooldown, #39414c)';
  } else if (isDisabledOnly) {
    background = 'var(--surface-command-disabled, #5b5551)';
    opacity = 0.48;
  }

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly || isDisabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate?.();
    }
  };

  return (
    <div
      role={readOnly ? undefined : 'button'}
      aria-pressed={readOnly ? undefined : isSelected}
      aria-disabled={isDisabled || undefined}
      tabIndex={readOnly || isDisabled ? -1 : 0}
      onClick={readOnly || isDisabled ? undefined : onActivate}
      onKeyDown={handleKey}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className={`relative flex items-center select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-void ${
        className ?? ''
      }`}
      style={{
        width: 360,
        height: 92,
        padding: 10,
        gap: 10,
        borderRadius: 10,
        background,
        border,
        boxShadow,
        opacity,
        cursor: readOnly ? 'default' : isDisabled ? 'not-allowed' : 'pointer',
      }}
    >
      {/* Icon well — 64×64 with border-default outline */}
      <div
        className="relative shrink-0"
        style={{
          width: 64,
          height: 64,
          background: 'var(--surface-icon-well, #0f0c0a)',
          border: '1px solid var(--border-default, #4a382f)',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <div style={{ width: 40, height: 40 }}>{iconSlot}</div>
        </div>
      </div>

      {/* Content column — 208×64 */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: 208, height: 64, gap: 2 }}
      >
        <div
          style={{
            fontFamily: 'var(--font-ability-name)',
            color: 'var(--text-primary, #f4e8d2)',
            fontSize: 18,
            lineHeight: '22px',
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayName}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--text-secondary, #e8d7b0)',
            fontSize: 13,
            lineHeight: '18px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {effectText}
        </div>
        {metaText && (
          <div
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              color: '#c9aa91',
              fontSize: 11,
              lineHeight: '14px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {metaText}
          </div>
        )}
      </div>

      {/* Resource slot — 48×48; badge + overlaid cost */}
      {resource && (
        <div className="relative shrink-0" style={{ width: 48, height: 48 }}>
          <AbilityResourceBadge
            resource={resource}
            size="combat"
            cost={resourceCost}
            state={isDisabled && typeof resourceCost === 'number' ? 'insufficient' : 'ready'}
          />
        </div>
      )}

      {children}
    </div>
  );
}

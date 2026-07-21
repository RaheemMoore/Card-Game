import type { ReactNode } from 'react';
import type { AbilityTier, BadgeResource } from './types';
import { AbilityResourceBadge } from './AbilityResourceBadge';

interface Props {
  tier: AbilityTier;
  abilityName: string;
  /** Approved artwork URL for the 364×280 detail crop. */
  artworkUrl: string;
  primaryRules: string;
  secondaryRules?: string;
  /** Left meta text in the footer (e.g. `MARTIAL • AOE`). */
  metaLeft?: string;
  /** Right meta text in the footer, rendered in tier accent (e.g. `BURN 2`). */
  metaRight?: string;
  /** Caption below the card. */
  caption?: string;
  showCaption?: boolean;
  resource?: BadgeResource;
  resourceCost?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * Forged Ability Detail Card (Figma node 44:59).
 * 396×580. Header 44 tall with 22px ability name + 24×104 tier pill.
 * Artwork 364×280 (rounded 12). Rules panel 364×120 on parchment.
 * Footer 36 tall: meta-left | resource-cost cluster | meta-right (accent).
 */
export function AbilityDetailCard({
  tier,
  abilityName,
  artworkUrl,
  primaryRules,
  secondaryRules,
  metaLeft,
  metaRight,
  caption,
  showCaption = true,
  resource,
  resourceCost,
  className,
  children,
}: Props) {
  const tierAccent =
    tier === 'ultimate'
      ? 'var(--accent-ultimate, #f3c95b)'
      : tier === 'signature'
      ? 'var(--accent-signature, #b56ae8)'
      : 'var(--accent-core, #d66b3c)';
  const border =
    tier === 'ultimate'
      ? `3px solid var(--border-ultimate, #f3c95b)`
      : tier === 'signature'
      ? `2px solid var(--border-signature, #b56ae8)`
      : `2px solid var(--border-default, #4a382f)`;

  return (
    <div
      className={`relative flex flex-col overflow-hidden ${className ?? ''}`}
      style={{
        width: '100%',
        maxWidth: 396,
        padding: '14px 16px 12px',
        gap: 12,
        borderRadius: 18,
        background: 'var(--surface-detail, #0f0c0a)',
        border,
        boxShadow: '0 10px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header 44 */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 44,
          padding: '0 14px',
          borderRadius: 10,
          background: 'var(--color-forge-800, #241a15)',
          gap: 12,
        }}
      >
        <span
          className="truncate flex-1"
          style={{
            fontFamily: 'var(--font-ability-name)',
            fontSize: 22,
            lineHeight: '28px',
            color: 'var(--text-primary, #f4e8d2)',
            letterSpacing: '0.02em',
          }}
        >
          {abilityName}
        </span>
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 104,
            height: 24,
            borderRadius: 12,
            background: tierAccent,
          }}
        >
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: '0.16em',
              color: 'var(--text-primary, #f4e8d2)',
            }}
          >
            {tier === 'ultimate' ? 'ULTIMATE' : tier === 'signature' ? 'SIGNATURE' : 'CORE'}
          </span>
        </div>
      </div>

      {/* Artwork 364×280 */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: '100%', aspectRatio: '364 / 280', borderRadius: 12 }}
      >
        <img
          src={artworkUrl}
          alt={`${abilityName} canonical detail artwork`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Rules panel 364×120 on parchment */}
      <div
        className="shrink-0 overflow-hidden"
        style={{
          minHeight: 120,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'var(--color-parchment-100, #e8d7b0)',
          color: 'var(--text-on-light, #17120f)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            lineHeight: '18px',
            margin: 0,
          }}
        >
          {primaryRules}
        </p>
        {secondaryRules && (
          <p
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 400,
              fontSize: 12,
              lineHeight: '16px',
              margin: 0,
            }}
          >
            {secondaryRules}
          </p>
        )}
      </div>

      {/* Footer 36 */}
      <div
        className="shrink-0 flex items-center justify-between"
        style={{
          height: 36,
          padding: '0 12px',
          borderRadius: 10,
          background: 'var(--surface-command-raised, #241a15)',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: 11,
            lineHeight: '14px',
            color: 'var(--text-secondary, #e8d7b0)',
            letterSpacing: '0.02em',
          }}
        >
          {metaLeft ?? ''}
        </span>
        {resource && typeof resourceCost === 'number' && (
          <div className="relative" style={{ width: 58, height: 32 }}>
            <AbilityResourceBadge
              resource={resource}
              size="compact"
              cost={resourceCost}
              className="absolute"
            />
          </div>
        )}
        {metaRight && (
          <span
            style={{
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 500,
              fontSize: 11,
              lineHeight: '14px',
              color: tierAccent,
              letterSpacing: '0.02em',
            }}
          >
            {metaRight}
          </span>
        )}
      </div>

      {showCaption && caption && (
        <p
          className="shrink-0 text-center"
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 11,
            lineHeight: '14px',
            color: 'var(--text-muted, #9a8f86)',
            margin: 0,
          }}
        >
          {caption}
        </p>
      )}

      {children}
    </div>
  );
}

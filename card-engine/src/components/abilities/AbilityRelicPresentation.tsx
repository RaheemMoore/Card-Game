import type { BadgeResource, RelicMoment } from './types';
import { AbilityResourceBadge } from './AbilityResourceBadge';

interface Props {
  moment: RelicMoment;
  abilityName: string;
  /** Approved 364×364+ relic crop. */
  artworkUrl: string;
  lore?: string;
  /** Optional 24 px resource accent placed at the artwork's upper-right (ATS §27). */
  resourceAccent?: BadgeResource;
  className?: string;
}

interface MomentToken {
  border: string;
  borderWidth: number;
  statusLabel: string;
  statusColor: string;
  footerLabel: string;
  footerColor: string;
}

/**
 * Ability Relic Presentation (Figma node 48:46).
 * 396×580. Outer border in the moment accent; the 364×364 artwork also
 * carries its own matching border. Title 58 tall, lore panel 88 tall.
 */
const MOMENTS: Record<RelicMoment, MomentToken> = {
  discovery: {
    border: 'var(--accent-core, #d66b3c)',
    borderWidth: 2,
    statusLabel: 'ABILITY DISCOVERED',
    statusColor: 'var(--color-ember-300, #e57c52)',
    footerLabel: 'ADDED TO THE ABILITY CODEX',
    footerColor: 'var(--color-ember-300, #e57c52)',
  },
  evolution: {
    border: 'var(--accent-signature, #b56ae8)',
    borderWidth: 2,
    statusLabel: 'ABILITY EVOLVED',
    statusColor: 'var(--accent-signature, #b56ae8)',
    footerLabel: 'NEW FORM RECORDED IN THE CODEX',
    footerColor: 'var(--accent-signature, #b56ae8)',
  },
  ultimate: {
    border: 'var(--accent-ultimate, #f3c95b)',
    borderWidth: 3,
    statusLabel: 'ULTIMATE AWAKENED',
    statusColor: 'var(--color-gold-300, #e8c46a)',
    footerLabel: 'ULTIMATE FORM ADDED TO THE CODEX',
    footerColor: 'var(--color-gold-300, #e8c46a)',
  },
};

export function AbilityRelicPresentation({
  moment,
  abilityName,
  artworkUrl,
  lore,
  resourceAccent,
  className,
}: Props) {
  const t = MOMENTS[moment];
  return (
    <div
      className={`relative flex flex-col overflow-hidden ${className ?? ''}`}
      style={{
        width: 396,
        height: 580,
        padding: '14px 16px',
        gap: 12,
        borderRadius: 18,
        background: 'var(--surface-detail, #0f0c0a)',
        border: `${t.borderWidth}px solid ${t.border}`,
        boxShadow:
          '0 14px 30px rgba(0,0,0,0.58), inset 0 0 12px rgba(229,115,38,0.12)',
      }}
    >
      {/* Artwork — 364×364, matching border */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: '100%',
          height: 364,
          borderRadius: 18,
          border: `2px solid ${t.border}`,
        }}
      >
        <img
          src={artworkUrl}
          alt={`${abilityName} relic artwork`}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {resourceAccent && (
          <div
            className="absolute"
            style={{ top: 8, right: 8, opacity: 0.92 }}
          >
            <AbilityResourceBadge resource={resourceAccent} size="relicAccent" />
          </div>
        )}
      </div>

      {/* Title block 58 */}
      <div
        className="shrink-0 flex flex-col items-center justify-center text-center"
        style={{ height: 58, gap: 2 }}
      >
        <div
          style={{
            fontFamily: 'var(--font-ability-name)',
            fontSize: 28,
            lineHeight: '36px',
            color: 'var(--text-primary, #f4e8d2)',
            letterSpacing: '0.02em',
          }}
        >
          {abilityName}
        </div>
        <div
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 11,
            lineHeight: '14px',
            letterSpacing: '0.32em',
            color: t.statusColor,
          }}
        >
          {t.statusLabel}
        </div>
      </div>

      {/* Lore panel 88 */}
      <div
        className="shrink-0 flex flex-col items-center justify-between text-center"
        style={{
          height: 88,
          padding: 14,
          borderRadius: 12,
          background: 'var(--surface-command-raised, #241a15)',
        }}
      >
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 13,
            lineHeight: '18px',
            color: 'var(--text-secondary, #e8d7b0)',
            margin: 0,
          }}
        >
          {lore ?? ''}
        </p>
        <p
          style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 10,
            lineHeight: '12px',
            letterSpacing: '0.32em',
            color: t.footerColor,
            margin: 0,
          }}
        >
          {t.footerLabel}
        </p>
      </div>
    </div>
  );
}

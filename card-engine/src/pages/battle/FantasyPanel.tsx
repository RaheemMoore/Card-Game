import type { CSSProperties, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Adds subtle ornate corner accents. Default true. */
  ornaments?: boolean;
  /** Accent color for the gold trim + ornaments. Defaults to house gold. */
  accent?: string;
  /** Extra glow color (e.g. rage red). Optional. */
  glow?: string;
  /** Optional role for a11y. */
  role?: string;
  ariaLabel?: string;
}

/**
 * Shared fantasy-frame panel used by every combat surface (Boss HUD, Intent,
 * Turn pill, Journal, Journal Active card, Ability tiles, End Turn button,
 * quick-action buttons) so the whole combat interface reads as one game frame
 * language — consistent with the approved reference.
 *
 * The frame is CSS-only:
 *   - dark parchment gradient background
 *   - outer gold trim (1px)
 *   - inner shadow line (1px black) for depth
 *   - optional 4 corner-flourish SVGs (turned off for tiny pills)
 *   - optional colored glow (used for rage / wind-up states)
 */
export function FantasyPanel({
  children,
  className = '',
  style,
  ornaments = true,
  accent = 'rgba(184,134,11,0.65)',
  glow,
  role,
  ariaLabel,
}: Props) {
  const baseStyle: CSSProperties = {
    background: 'linear-gradient(180deg, rgba(24,14,18,0.92) 0%, rgba(10,6,10,0.94) 100%)',
    border: `1px solid ${accent}`,
    boxShadow: [
      'inset 0 0 0 1px rgba(0,0,0,0.75)',
      '0 4px 14px rgba(0,0,0,0.6)',
      glow ? `0 0 22px ${glow}` : '',
    ]
      .filter(Boolean)
      .join(', '),
    ...style,
  };

  return (
    <div
      className={`relative ${className}`}
      style={baseStyle}
      role={role}
      aria-label={ariaLabel}
    >
      {ornaments && (
        <>
          <CornerOrnament pos="tl" color={accent} />
          <CornerOrnament pos="tr" color={accent} />
          <CornerOrnament pos="bl" color={accent} />
          <CornerOrnament pos="br" color={accent} />
        </>
      )}
      {children}
    </div>
  );
}

function CornerOrnament({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
  const posStyle: CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    pointerEvents: 'none',
    color,
    opacity: 0.9,
  };
  if (pos === 'tl') Object.assign(posStyle, { top: -1, left: -1 });
  if (pos === 'tr') Object.assign(posStyle, { top: -1, right: -1, transform: 'scaleX(-1)' });
  if (pos === 'bl') Object.assign(posStyle, { bottom: -1, left: -1, transform: 'scaleY(-1)' });
  if (pos === 'br') Object.assign(posStyle, { bottom: -1, right: -1, transform: 'scale(-1,-1)' });
  return (
    <svg viewBox="0 0 10 10" style={posStyle} aria-hidden fill="none">
      {/* small L-shape corner with a diagonal flourish */}
      <path d="M0 0 L6 0 M0 0 L0 6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 2 L4 4" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}

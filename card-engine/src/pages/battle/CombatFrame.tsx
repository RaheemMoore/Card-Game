import type { CSSProperties, ReactNode } from 'react';

/**
 * CombatFrame — canonical shared frame component sourced from the Figma
 * Combat Frame System (file 9IIvc01ts7LZJ0RaCMGanf, node 22:36).
 *
 * Every combat surface renders through this primitive with a preset that
 * pins the exact Figma tokens (outer stroke, inner rail, top-edge highlight,
 * shadow, radius, corner ornaments, gem accents).
 *
 * Design source of truth is Figma; do not fork these values.
 */

interface EdgeHighlight {
  color: string;
  opacity: number;
  heightPx: number;
  /** 'top' places the highlight just inside the top edge; 'bottom' just inside the bottom. */
  position: 'top' | 'bottom';
  /** Extra highlight rendered under the primary edge (used by CommandShelf). */
  glow?: { color: string; opacity: number; heightPx: number; insetPx: number };
}

interface FrameTokens {
  bg: string;
  outer: string;
  outerWidthPx: number;
  innerRail: string;
  innerRailInsetPx: number;
  radiusPx: number;
  innerRadiusPx: number;
  shadow: string;
  cornerOrnaments: boolean;
  edgeHighlight?: EdgeHighlight;
}

export const FRAME_PRESETS = {
  bossHud: {
    bg: '#09090b',
    outer: '#9e6329',
    outerWidthPx: 2,
    innerRail: '#382112',
    innerRailInsetPx: 6,
    radiusPx: 8,
    innerRadiusPx: 5,
    shadow: '0px 8px 18px rgba(0,0,0,0.55)',
    cornerOrnaments: true,
    edgeHighlight: {
      color: '#f2ab40',
      opacity: 0.55,
      heightPx: 2,
      position: 'top',
    },
  },
  intent: {
    bg: '#0e0907',
    outer: '#ad4a1a',
    outerWidthPx: 2,
    innerRail: '#4f210f',
    innerRailInsetPx: 5,
    radiusPx: 7,
    innerRadiusPx: 5,
    shadow: '0px 6px 14px rgba(0,0,0,0.48)',
    cornerOrnaments: false,
    edgeHighlight: {
      color: '#e06e1a',
      opacity: 0.45,
      heightPx: 2,
      position: 'bottom',
    },
  },
  turnBadge: {
    bg: '#0b0a0a',
    outer: '#805221',
    outerWidthPx: 1.5,
    innerRail: '#301c0e',
    innerRailInsetPx: 3.5,
    radiusPx: 5,
    innerRadiusPx: 3,
    shadow: '0px 4px 5px rgba(0,0,0,0.4)',
    cornerOrnaments: false,
  },
  utilityTray: {
    bg: '#09090a',
    outer: '#754a1f',
    outerWidthPx: 1.5,
    innerRail: '#2e1c0e',
    innerRailInsetPx: 4.5,
    radiusPx: 6,
    innerRadiusPx: 4,
    shadow: '0px 5px 6px rgba(0,0,0,0.42)',
    cornerOrnaments: false,
  },
  journal: {
    bg: '#060607',
    outer: '#875221',
    outerWidthPx: 2,
    innerRail: '#331f0f',
    innerRailInsetPx: 5,
    radiusPx: 8,
    innerRadiusPx: 5,
    shadow: '0px 10px 22px rgba(0,0,0,0.58)',
    cornerOrnaments: false,
    edgeHighlight: {
      color: '#f0a840',
      opacity: 0.6,
      heightPx: 2,
      position: 'top',
    },
  },
  commandShelf: {
    bg: '#060708',
    outer: '#804f21',
    outerWidthPx: 2,
    innerRail: '#301c0e',
    innerRailInsetPx: 6,
    radiusPx: 8,
    innerRadiusPx: 5,
    shadow: '0px -6px 20px rgba(0,0,0,0.62)',
    cornerOrnaments: true,
    edgeHighlight: {
      color: '#ba752e',
      opacity: 0.75,
      heightPx: 4,
      position: 'top',
      glow: { color: '#f2ab47', opacity: 0.3, heightPx: 2, insetPx: 20 },
    },
  },
  abilitySlot: {
    bg: '#0d0c0e',
    outer: '#614524',
    outerWidthPx: 1,
    innerRail: '#261c12',
    innerRailInsetPx: 5,
    radiusPx: 6,
    innerRadiusPx: 4,
    shadow: 'none',
    cornerOrnaments: false,
  },
  abilitySlotSelected: {
    bg: '#160f06',
    outer: '#c27826',
    outerWidthPx: 1.5,
    innerRail: '#4f381f',
    innerRailInsetPx: 4.5,
    radiusPx: 5,
    innerRadiusPx: 4,
    shadow: '0px 0px 12px rgba(194,120,38,0.35)',
    cornerOrnaments: false,
  },
} as const satisfies Record<string, FrameTokens>;

export type FramePresetKey = keyof typeof FRAME_PRESETS;

interface Props {
  preset: FramePresetKey;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
  /** Override tokens (e.g. accent flip when Rage is active). */
  tokens?: Partial<FrameTokens>;
}

export function CombatFrame({
  preset,
  children,
  className = '',
  style,
  role,
  ariaLabel,
  tokens: overrides,
}: Props) {
  const tokens = { ...FRAME_PRESETS[preset], ...overrides } as FrameTokens;

  const outerStyle: CSSProperties = {
    background: tokens.bg,
    border: `${tokens.outerWidthPx}px solid ${tokens.outer}`,
    borderRadius: tokens.radiusPx,
    boxShadow: tokens.shadow !== 'none' ? tokens.shadow : undefined,
    ...style,
  };

  const railInset = tokens.innerRailInsetPx;

  return (
    <div
      className={`relative ${className}`}
      style={outerStyle}
      role={role}
      aria-label={ariaLabel}
    >
      {/* Inner rail */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: railInset,
          left: railInset,
          right: railInset,
          bottom: railInset,
          border: `1px solid ${tokens.innerRail}`,
          borderRadius: tokens.innerRadiusPx,
          pointerEvents: 'none',
        }}
      />

      {/* Edge highlight (top or bottom) */}
      {tokens.edgeHighlight && (
        <EdgeHighlightBar highlight={tokens.edgeHighlight} innerInset={railInset + 6} />
      )}

      {/* Corner ornaments (4 corners) — used by primary variants */}
      {tokens.cornerOrnaments && (
        <>
          <CornerOrnament pos="tl" innerInset={railInset} />
          <CornerOrnament pos="tr" innerInset={railInset} />
          <CornerOrnament pos="bl" innerInset={railInset} />
          <CornerOrnament pos="br" innerInset={railInset} />
        </>
      )}

      {/* Content sits above ornaments */}
      <div style={{ position: 'relative', zIndex: 1, height: '100%', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}

function EdgeHighlightBar({
  highlight,
  innerInset,
}: {
  highlight: EdgeHighlight;
  innerInset: number;
}) {
  const posKey = highlight.position === 'top' ? { top: innerInset } : { bottom: innerInset };
  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: innerInset,
          right: innerInset,
          height: highlight.heightPx,
          background: highlight.color,
          opacity: highlight.opacity,
          borderRadius: highlight.heightPx / 2,
          pointerEvents: 'none',
          ...posKey,
        }}
      />
      {highlight.glow && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: innerInset + highlight.glow.insetPx,
            right: innerInset + highlight.glow.insetPx,
            height: highlight.glow.heightPx,
            background: highlight.glow.color,
            opacity: highlight.glow.opacity,
            pointerEvents: 'none',
            ...(highlight.position === 'top'
              ? { top: innerInset + highlight.heightPx + 2 }
              : { bottom: innerInset + highlight.heightPx + 2 }),
          }}
        />
      )}
    </>
  );
}

/**
 * Corner-ell + gem ornament, sourced from Figma nodes 23:186–23:197 (BossHUD)
 * and 23:210–23:221 (CommandShelf). Two 42×3px arms in `#804f21` and a
 * 12px rotated diamond gem in `#E69C38` with `#FFCC63` stroke, positioned
 * where the two arms meet.
 */
function CornerOrnament({ pos, innerInset }: { pos: 'tl' | 'tr' | 'bl' | 'br'; innerInset: number }) {
  const armColor = '#804f21';
  const armThicknessPx = 3;
  const armLengthPx = 42;
  const gemSizePx = 12;
  const gemOverlapPx = 4; // gem sits half-outside the corner, pushed slightly further out

  // Position each arm at the outer-corner attachment: the horizontal + vertical
  // ends touch at (innerInset, innerInset) relative to that corner.
  const horizArm: CSSProperties = {
    position: 'absolute',
    width: armLengthPx,
    height: armThicknessPx,
    background: armColor,
    pointerEvents: 'none',
  };
  const vertArm: CSSProperties = {
    position: 'absolute',
    width: armThicknessPx,
    height: armLengthPx,
    background: armColor,
    pointerEvents: 'none',
  };
  const gemWrap: CSSProperties = {
    position: 'absolute',
    width: gemSizePx,
    height: gemSizePx,
    pointerEvents: 'none',
  };

  if (pos === 'tl') {
    Object.assign(horizArm, { top: innerInset, left: innerInset });
    Object.assign(vertArm, { top: innerInset, left: innerInset });
    Object.assign(gemWrap, { top: innerInset - gemOverlapPx, left: innerInset - gemOverlapPx });
  }
  if (pos === 'tr') {
    Object.assign(horizArm, { top: innerInset, right: innerInset });
    Object.assign(vertArm, { top: innerInset, right: innerInset });
    Object.assign(gemWrap, { top: innerInset - gemOverlapPx, right: innerInset - gemOverlapPx });
  }
  if (pos === 'bl') {
    Object.assign(horizArm, { bottom: innerInset, left: innerInset });
    Object.assign(vertArm, { bottom: innerInset, left: innerInset });
    Object.assign(gemWrap, { bottom: innerInset - gemOverlapPx, left: innerInset - gemOverlapPx });
  }
  if (pos === 'br') {
    Object.assign(horizArm, { bottom: innerInset, right: innerInset });
    Object.assign(vertArm, { bottom: innerInset, right: innerInset });
    Object.assign(gemWrap, { bottom: innerInset - gemOverlapPx, right: innerInset - gemOverlapPx });
  }

  return (
    <>
      <div style={horizArm} aria-hidden />
      <div style={vertArm} aria-hidden />
      <div style={gemWrap} aria-hidden>
        <svg viewBox="0 0 12 12" fill="none" style={{ width: '100%', height: '100%' }}>
          <path
            d="M11.293 6L6 11.293L0.707031 6L6 0.707031L11.293 6Z"
            fill="#E69C38"
            stroke="#FFCC63"
          />
        </svg>
      </div>
    </>
  );
}

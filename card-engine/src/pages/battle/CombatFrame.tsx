import type { CSSProperties, ReactNode } from 'react';

/**
 * CombatFrame — CSS-drawn frame sourced from the Figma Combat Frame System
 * (file 9IIvc01ts7LZJ0RaCMGanf, node 22:36): outer stroke, inner rail,
 * top-edge highlight, shadow, radius, corner ornaments, gem accents.
 *
 * MOBILE ONLY. Every desktop combat surface moved to `PaintedPanel.tsx`'s
 * real painted 9-slice frame art, which is what CSS gradients were
 * approximating here. The two remaining consumers are `MobileBossHeader` and
 * `MobileCombatJournal` — a chunky painted ring costs too many pixels at
 * 390px wide, so mobile keeps the lighter CSS treatment until it gets its own
 * pass. Presets are trimmed to exactly what those two use; do not add more
 * here, add them to PaintedPanel.
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

/**
 * Panel-priority tiers, as consumed by the two remaining mobile surfaces:
 *
 *   Primary   — bossHud: cornerOrnaments + edgeHighlight + the strongest
 *               shadow. The surface combat decisions happen around.
 *   Secondary — journal: edgeHighlight, no corner ornaments. Detail/context
 *               — important, but not where the eye should land first.
 *
 * The `turnBadge`, `utilityTray`, `commandShelf`, `abilitySlot`, and
 * `abilitySlotSelected` presets were deleted when desktop moved to
 * PaintedPanel — nothing referenced them any more.
 */
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
      {/* Gilded hairline — sits just inside the outer stroke so the frame
          reads as a painted double-edge rather than a single flat border. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 2,
          border: `1px solid ${tokens.outer}`,
          opacity: 0.35,
          borderRadius: Math.max(0, tokens.radiusPx - 2),
          pointerEvents: 'none',
        }}
      />

      {/* Subtle parchment grain — low-opacity diagonal texture + vignette,
          code-only substitute for a painted frame until real art lands. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: tokens.radiusPx,
          pointerEvents: 'none',
          opacity: 0.5,
          mixBlendMode: 'overlay',
          background:
            'repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 3px), ' +
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.05) 0%, transparent 60%)',
        }}
      />

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
      <div style={{ ...gemWrap, filter: 'drop-shadow(0 0 3px rgba(230,156,56,0.65))' }} aria-hidden>
        <svg viewBox="0 0 12 12" fill="none" style={{ width: '100%', height: '100%' }}>
          {/* Small curl flourish either side of the gem — a code-only stand-in
              for scrollwork until a painted 9-slice frame replaces this
              primitive entirely. */}
          <path d="M0.5 6C2 6 2.5 4.5 2.5 3" stroke="#804f21" strokeWidth="0.6" fill="none" />
          <path d="M11.5 6C10 6 9.5 4.5 9.5 3" stroke="#804f21" strokeWidth="0.6" fill="none" />
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

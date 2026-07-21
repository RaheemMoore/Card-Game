import type { ReactNode } from 'react';

/**
 * Forge Strike-local ornate UI frames (plan §9.4): restrained dark forged
 * metal, warm inset, fine antique-gold inner line, small crystal accents,
 * scalable corners/end caps. CSS/SVG only. These stay minigame-local and are
 * NOT promoted to global components.
 */

const GOLD = '#c9a26e';
const GOLD_HI = '#e6c78c';
const METAL_DARK = '#241d17';
const METAL_MID = '#4a3f33';

/** Small metal-set crystal gem — used at rail ends and frame corners. */
export function CrystalGem({ color, size = 16 }: { color: string; size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s * 1.4} viewBox="0 0 20 28" aria-hidden="true">
      <defs>
        <linearGradient id="fs-gem-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={METAL_MID} />
          <stop offset="1" stopColor={METAL_DARK} />
        </linearGradient>
      </defs>
      {/* metal setting */}
      <path d="M10 1 L18 14 L10 27 L2 14 Z" fill="url(#fs-gem-metal)" stroke={GOLD} strokeWidth="1.4" />
      {/* gem */}
      <path d="M10 5 L15 14 L10 23 L5 14 Z" fill={color} />
      <path d="M10 5 L15 14 L10 14 Z" fill={GOLD_HI} opacity="0.35" />
      <path d="M10 5 L5 14 L10 14 Z" fill="#000" opacity="0.2" />
    </svg>
  );
}

/**
 * Ornate result pip — an 8-point forged medallion with an antique-gold rim,
 * a colored gem center, and the grade glyph. `active` gives the armed pip a
 * warm halo.
 */
export function PipMedallion({
  glyph,
  gemColor,
  rimColor = GOLD,
  active = false,
  dim = false,
}: {
  glyph: ReactNode;
  gemColor: string;
  rimColor?: string;
  active?: boolean;
  dim?: boolean;
}) {
  // 8-point star ring path (outer studs) over a metal disc.
  const points = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    return `${20 + Math.cos(a) * 19},${20 + Math.sin(a) * 19}`;
  });
  const studs = Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    return { x: 20 + Math.cos(a) * 17, y: 20 + Math.sin(a) * 17, r: a };
  });
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: 30, height: 30, filter: active ? `drop-shadow(0 0 7px ${gemColor})` : undefined, opacity: dim ? 0.85 : 1 }}
    >
      <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <radialGradient id="fs-pip-metal" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0" stopColor={METAL_MID} />
            <stop offset="1" stopColor={METAL_DARK} />
          </radialGradient>
        </defs>
        {/* studs */}
        {studs.map((s, i) => (
          <rect
            key={i}
            x={s.x - 2.4}
            y={s.y - 2.4}
            width="4.8"
            height="4.8"
            rx="1"
            fill={METAL_DARK}
            stroke={rimColor}
            strokeWidth="0.8"
            transform={`rotate(${(s.r * 180) / Math.PI + 45} ${s.x} ${s.y})`}
          />
        ))}
        {/* rim + disc */}
        <polygon points={points.join(' ')} fill="url(#fs-pip-metal)" stroke={rimColor} strokeWidth="1.4" />
        <circle cx="20" cy="20" r="12.5" fill={METAL_DARK} stroke={rimColor} strokeWidth="1" />
        {/* gem */}
        <circle cx="20" cy="20" r="10" fill={gemColor} opacity={dim ? 0.35 : 0.9} />
        <circle cx="20" cy="16.5" r="4" fill={GOLD_HI} opacity="0.25" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold" style={{ color: dim ? '#d9c9a8' : '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
        {glyph}
      </span>
    </span>
  );
}

/**
 * Ornate forged-metal panel frame — dark metal border, warm inset, antique
 * gold inner hairline, crystal accents at the top corners. Wraps arbitrary
 * content (result label, header chip, results dialog).
 */
export function OrnatePanel({
  children,
  accent = GOLD,
  className = '',
  corners = false,
  style,
}: {
  children: ReactNode;
  accent?: string;
  className?: string;
  corners?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative ${className}`}
      style={{
        background: 'linear-gradient(to bottom, #3a3128, #1c1712)',
        border: '1px solid #0d0a07',
        borderRadius: 8,
        boxShadow: `inset 0 0 0 1px ${accent}66, inset 0 1px 0 ${GOLD_HI}33, 0 4px 12px rgba(0,0,0,0.6)`,
        ...style,
      }}
    >
      {corners && (
        <>
          <span className="absolute -top-2 -left-1"><CrystalGem color={accent} size={12} /></span>
          <span className="absolute -top-2 -right-1"><CrystalGem color={accent} size={12} /></span>
        </>
      )}
      {children}
    </div>
  );
}

export const FORGE_FRAME_GOLD = GOLD;

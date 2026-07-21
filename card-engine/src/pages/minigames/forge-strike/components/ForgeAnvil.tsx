import type { StrikeGrade } from '../../../../services/minigames/forge-strike/types';

/**
 * SVG anvil + swinging hammer. Presentation only. The hammer swings from a
 * fixed pivot when `swingSeq` changes; the anvil recoils and its runes
 * brighten with `heat` (0..1). Reduced motion collapses the swing/recoil
 * to no-ops (index.css) while the heat lighting still reads.
 */

interface ForgeAnvilProps {
  /** Monotonic — bump to trigger a hammer swing + recoil. */
  swingSeq: number;
  /** 0..1 forge heat, drives rune/glow brightness. */
  heat: number;
  /** Heat color for the ambient forge glow. */
  glow: string;
  /** Grade of the last strike (dulls the swing on a miss). */
  lastGrade: StrikeGrade | null;
}

export function ForgeAnvil({ swingSeq, heat, glow, lastGrade }: ForgeAnvilProps) {
  const runeOpacity = 0.25 + heat * 0.75;
  const miss = lastGrade === 'miss';

  return (
    <div className="relative pointer-events-none select-none" style={{ width: 260, height: 150 }}>
      {/* Ambient forge glow beneath the anvil */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-all duration-500"
        style={{
          bottom: 6,
          width: 200,
          height: 60,
          background: `radial-gradient(ellipse at center, ${glow}${miss ? '44' : 'aa'} 0%, transparent 70%)`,
          filter: 'blur(6px)',
          opacity: 0.5 + heat * 0.5,
        }}
      />

      {/* Hammer — swings from the top-right pivot */}
      <svg
        key={swingSeq}
        className={swingSeq > 0 && !miss ? 'fs-hammer' : swingSeq > 0 ? 'fs-hammer' : ''}
        width="150"
        height="150"
        viewBox="0 0 150 150"
        style={{
          position: 'absolute',
          right: 8,
          top: -46,
          transformOrigin: '82% 18%',
          // On a miss the swing is dampened via reduced arc (opacity dulled).
          opacity: miss ? 0.55 : 1,
          zIndex: 3,
        }}
        aria-hidden="true"
      >
        {/* Handle */}
        <rect x="70" y="24" width="9" height="86" rx="4" fill="#5b4636" stroke="#2e2117" strokeWidth="1.5" transform="rotate(24 74 60)" />
        {/* Head */}
        <g transform="rotate(24 74 60)">
          <rect x="44" y="12" width="62" height="30" rx="5" fill="#4b4f57" stroke="#23262b" strokeWidth="2" />
          <rect x="44" y="12" width="62" height="9" rx="4" fill="#6b7079" />
          <rect x="98" y="14" width="10" height="26" rx="3" fill="#34383e" />
        </g>
      </svg>

      {/* Anvil body */}
      <div
        key={`anvil-${swingSeq}`}
        className={`absolute left-1/2 -translate-x-1/2 ${swingSeq > 0 && !miss ? 'fs-anvil-recoil' : ''}`}
        style={{ bottom: 0, zIndex: 2 }}
      >
        <svg width="200" height="120" viewBox="0 0 200 120" aria-hidden="true">
          <defs>
            <linearGradient id="fs-anvil-metal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3a3d43" />
              <stop offset="0.5" stopColor="#25272c" />
              <stop offset="1" stopColor="#141518" />
            </linearGradient>
          </defs>
          {/* Face + horn */}
          <path
            d="M18 30 H150 L138 46 H70 L66 60 H150 L150 74 H40 L52 92 H120 L120 108 H60 L48 92 H30 L30 60 H18 Z"
            fill="url(#fs-anvil-metal)"
            stroke="#0c0d0f"
            strokeWidth="2"
          />
          {/* Hot top face */}
          <rect x="18" y="30" width="132" height="8" rx="3" fill={glow} opacity={runeOpacity} />
          {/* Rune band on the base */}
          <g stroke={glow} strokeWidth="2.5" opacity={runeOpacity} strokeLinecap="round">
            <path d="M58 100 h44" />
            <path d="M64 104 l6 -8 6 8" fill="none" />
            <circle cx="90" cy="100" r="3" fill={glow} stroke="none" />
          </g>
        </svg>
      </div>
    </div>
  );
}

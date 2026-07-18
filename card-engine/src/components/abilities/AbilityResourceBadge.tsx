import type { BadgeResource, ResourceBadgeSize } from './types';

interface Props {
  resource: BadgeResource;
  size?: ResourceBadgeSize;
  state?: 'ready' | 'insufficient';
  /**
   * Optional cost text. Rendered by the parent Command Strip / Detail Card
   * in the Figma canonical layout (cost sits above/inside the badge slot);
   * kept here as a convenience for the harness and Codex previews.
   */
  cost?: number;
  className?: string;
}

const PX: Record<ResourceBadgeSize, number> = {
  combat: 48,
  compact: 32,
  relicAccent: 24,
};

/**
 * Ability Resource Badge (Figma node 64:92).
 *
 * Mana = round crystal socket (violet) with a faceted gem highlight at the
 * upper-right and a tiny spark at the lower-left.
 * Tech = angular hexagonal power cell (cobalt) with a bright pale core dot.
 * Insufficient = a rotated red slash across the badge — shape stays legible
 * so the signal is never colour-only (ATS §26).
 */
export function AbilityResourceBadge({
  resource,
  size = 'compact',
  state = 'ready',
  cost,
  className,
}: Props) {
  const px = PX[size];
  const isInsufficient = state === 'insufficient';
  const isRelicAccent = size === 'relicAccent';

  return (
    <div
      role="img"
      aria-label={`${resource === 'mana' ? 'Mana' : 'Tech'} ${
        typeof cost === 'number' ? `cost ${cost}` : 'accent'
      }${isInsufficient ? ' (insufficient)' : ''}`}
      className={`relative inline-block select-none ${className ?? ''}`}
      style={{ width: px, height: px, opacity: isInsufficient ? 0.62 : 1 }}
    >
      {resource === 'mana' ? (
        <ManaSvg size={px} />
      ) : (
        <TechSvg size={px} />
      )}

      {typeof cost === 'number' && !isRelicAccent && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: size === 'combat' ? 18 : 12,
            textShadow: '0 1px 2px rgba(0,0,0,0.85)',
            pointerEvents: 'none',
          }}
        >
          {cost}
        </span>
      )}

      {isInsufficient && <InsufficientSlash size={px} />}
    </div>
  );
}

/** Round crystal socket, violet glow, faceted gem at upper-right. */
function ManaSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="mana-body" cx="45%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#b2a3ff" />
          <stop offset="55%" stopColor="var(--ability-resource-mana-surface, #6d4bd8)" />
          <stop offset="100%" stopColor="#2b1a5d" />
        </radialGradient>
      </defs>
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="url(#mana-body)"
        stroke="#0f0c0a"
        strokeWidth="1.5"
      />
      {/* Faceted gem at upper-right */}
      <g transform="translate(33 3) rotate(-45)">
        <rect
          width="9"
          height="9"
          rx="2"
          fill="var(--ability-resource-mana-glow, #b2a3ff)"
          stroke="#0f0c0a"
          strokeWidth="1"
        />
        <rect x="3" y="1.5" width="2" height="7" fill="#ffffff" opacity="0.55" />
      </g>
      {/* Tiny spark at lower-left */}
      <circle cx="8" cy="34" r="2" fill="#ffffff" opacity="0.75" />
    </svg>
  );
}

/** Hexagonal cobalt power cell with pale glowing core. */
function TechSvg({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <defs>
        <linearGradient id="tech-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#69c1f5" />
          <stop offset="55%" stopColor="var(--ability-resource-tech-surface, #3d9be0)" />
          <stop offset="100%" stopColor="#0f3a68" />
        </linearGradient>
      </defs>
      <polygon
        points="24,2 44,13 44,35 24,46 4,35 4,13"
        fill="url(#tech-body)"
        stroke="#0f0c0a"
        strokeWidth="1.5"
      />
      {/* Bright pale core */}
      <circle
        cx="24"
        cy="24"
        r="3.5"
        fill="var(--ability-resource-tech-core, #cfe8ff)"
        stroke="#0f0c0a"
        strokeWidth="0.75"
      />
      <circle cx="24" cy="24" r="1.5" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

/** Universal insufficient slash — 38° rotation, red, 4px thick. */
function InsufficientSlash({ size }: { size: number }) {
  const w = size * 0.78;
  const h = Math.max(3, size * 0.08);
  return (
    <span
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        width: w,
        height: h,
        transform: 'translate(-50%, -50%) rotate(38deg)',
        background: 'var(--ability-resource-insufficient, #b83321)',
        borderRadius: 2,
        boxShadow: '0 0 6px rgba(184,51,33,0.6)',
      }}
    />
  );
}

import type { AbilityOverlayVariant } from './types';

interface Props {
  variant: AbilityOverlayVariant;
  /** Custom label. Defaults to Figma canonical copy for each variant. */
  label?: string;
}

interface Style {
  label: string;
  veilBg: string;
  veilBorder: string;
  veilBorderWidth: number;
  pillBg: string;
  pillBorder: string;
  pillText: string;
  pillWidth: number;
  extraShadow?: string;
}

/**
 * Figma node 14:45 — Ability Command State Overlay. Full-veil flood colour
 * layered above the Command Strip, with a small pill label anchored top-right
 * (canonical dimensions: 92 tall × 360 wide; pill is 26 tall × ~102 wide).
 * Labels are canonical Figma copy, not generic uppercase variant names.
 */
const STYLES: Record<AbilityOverlayVariant, Style> = {
  insufficient: {
    label: 'NOT ENOUGH',
    veilBg: 'var(--color-ember-500, #b6472d)',
    veilBorder: 'var(--color-ember-500, #b6472d)',
    veilBorderWidth: 2,
    pillBg: 'var(--color-ember-500, #b6472d)',
    pillBorder: 'var(--color-ember-500, #b6472d)',
    pillText: 'var(--color-bone-100, #f4e8d2)',
    pillWidth: 102,
  },
  locked: {
    label: 'LOCKED',
    veilBg: 'var(--color-forge-950, #0f0c0a)',
    veilBorder: 'var(--color-ash-400, #9a8f86)',
    veilBorderWidth: 2,
    pillBg: 'var(--color-forge-950, #0f0c0a)',
    pillBorder: 'var(--color-ash-400, #9a8f86)',
    pillText: 'var(--color-bone-100, #f4e8d2)',
    pillWidth: 102,
  },
  undiscovered: {
    label: '???',
    veilBg: 'var(--color-forge-950, #0f0c0a)',
    veilBorder: 'var(--color-ash-400, #9a8f86)',
    veilBorderWidth: 2,
    pillBg: 'var(--color-forge-950, #0f0c0a)',
    pillBorder: 'var(--color-ash-400, #9a8f86)',
    pillText: 'var(--color-bone-100, #f4e8d2)',
    pillWidth: 102,
  },
  effective: {
    label: 'WEAKNESS',
    veilBg: 'var(--color-gold-500, #c9963a)',
    veilBorder: 'var(--color-gold-500, #c9963a)',
    veilBorderWidth: 3,
    pillBg: 'var(--color-gold-500, #c9963a)',
    pillBorder: 'var(--color-gold-500, #c9963a)',
    pillText: 'var(--color-forge-950, #0f0c0a)',
    pillWidth: 102,
  },
  resisted: {
    label: 'RESISTED',
    veilBg: 'var(--color-state-disabled, #5b5551)',
    veilBorder: 'var(--color-ember-500, #b6472d)',
    veilBorderWidth: 2,
    pillBg: 'var(--color-state-disabled, #5b5551)',
    pillBorder: 'var(--color-ember-500, #b6472d)',
    pillText: 'var(--color-bone-100, #f4e8d2)',
    pillWidth: 102,
  },
  targeting: {
    label: 'CHOOSE TARGET',
    veilBg: 'var(--color-state-selected, #f3c95b)',
    veilBorder: 'var(--color-state-selected, #f3c95b)',
    veilBorderWidth: 3,
    pillBg: 'var(--color-state-selected, #f3c95b)',
    pillBorder: 'var(--color-state-selected, #f3c95b)',
    pillText: 'var(--color-forge-950, #0f0c0a)',
    pillWidth: 126,
  },
  focus: {
    label: 'FOCUS',
    veilBg: 'var(--color-bone-100, #f4e8d2)',
    veilBorder: 'var(--color-bone-100, #f4e8d2)',
    veilBorderWidth: 3,
    pillBg: 'var(--color-forge-950, #0f0c0a)',
    pillBorder: 'var(--color-bone-100, #f4e8d2)',
    pillText: 'var(--color-bone-100, #f4e8d2)',
    pillWidth: 102,
    extraShadow: '0 0 4px rgba(245,219,158,0.45)',
  },
};

export function AbilityCommandStateOverlay({ variant, label }: Props) {
  const s = STYLES[variant];
  const pillLeft = 360 - s.pillWidth - 8; // 8px right inset
  return (
    <div
      role="status"
      aria-label={label ?? s.label}
      className="absolute inset-0 pointer-events-none"
      style={{
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: s.extraShadow,
      }}
    >
      {/* Full veil */}
      <div
        className="absolute inset-0"
        style={{
          background: s.veilBg,
          border: `${s.veilBorderWidth}px solid ${s.veilBorder}`,
          borderRadius: 10,
        }}
      />
      {/* Label pill, top-right */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: 8,
          left: pillLeft,
          height: 26,
          width: s.pillWidth,
          background: s.pillBg,
          border: `1px solid ${s.pillBorder}`,
          borderRadius: 13,
        }}
      >
        <span
          style={{
            color: s.pillText,
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.08em',
          }}
        >
          {label ?? s.label}
        </span>
      </div>
    </div>
  );
}

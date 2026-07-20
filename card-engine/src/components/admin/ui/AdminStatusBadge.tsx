import type { ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'attention' | 'danger' | 'warning';

const TONE: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: 'rgba(255,255,255,0.06)', fg: 'var(--admin-text-muted)' },
  accent: { bg: 'var(--admin-active-wash)', fg: '#c3bfff' },
  success: { bg: 'rgba(47,229,167,0.15)', fg: 'var(--admin-success)' },
  attention: { bg: 'rgba(255,105,180,0.15)', fg: 'var(--admin-attention)' },
  danger: { bg: 'rgba(240,97,109,0.15)', fg: 'var(--admin-danger)' },
  warning: { bg: 'rgba(245,181,68,0.15)', fg: 'var(--admin-warning)' },
};

export interface AdminStatusBadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

// Small status pill. Tone communicates state via BOTH color and label text —
// never rely on color alone (design-system rule).
export function AdminStatusBadge({ tone = 'neutral', children, icon, className = '' }: AdminStatusBadgeProps) {
  const t = TONE[tone];
  return (
    <span
      style={{ background: t.bg, color: t.fg, borderRadius: '6px' }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${className}`}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

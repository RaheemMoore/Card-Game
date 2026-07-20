import type { ReactNode } from 'react';
import { AdminCard } from './AdminCard';

export interface AdminMetricCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  /** State of the underlying value — drives a small qualifier line + tone. */
  state?: 'live' | 'stale' | 'estimated' | 'unavailable';
  href?: string;
  onClick?: () => void;
}

const STATE_LABEL: Record<NonNullable<AdminMetricCardProps['state']>, { text: string; color: string }> = {
  live: { text: '', color: '' },
  stale: { text: 'stale', color: 'var(--admin-warning)' },
  estimated: { text: 'estimated', color: 'var(--admin-text-muted)' },
  unavailable: { text: 'unavailable', color: 'var(--admin-text-muted)' },
};

// Metric tile. Never renders "unavailable" telemetry as 0 — callers pass
// state="unavailable" and a dash value, and the qualifier makes it explicit.
export function AdminMetricCard({ label, value, sub, icon, state = 'live', href, onClick }: AdminMetricCardProps) {
  const qualifier = STATE_LABEL[state];
  const inner = (
    <AdminCard className="h-full transition-colors hover:border-[var(--admin-accent)]">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{label}</div>
        {icon && <span className="shrink-0" style={{ color: 'var(--admin-text-muted)' }}>{icon}</span>}
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {(sub || qualifier.text) && (
        <div className="mt-1 text-[11px] flex items-center gap-1.5">
          {qualifier.text && <span style={{ color: qualifier.color }}>{qualifier.text}</span>}
          {sub && <span style={{ color: 'var(--admin-text-muted)' }}>{sub}</span>}
        </div>
      )}
    </AdminCard>
  );

  if (href) {
    return <a href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] rounded-[10px]">{inner}</a>;
  }
  if (onClick) {
    return <button onClick={onClick} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] rounded-[10px]">{inner}</button>;
  }
  return inner;
}

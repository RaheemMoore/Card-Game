import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONE: Record<Tone, { bg: string; border: string; fg: string }> = {
  info: { bg: 'var(--admin-active-wash)', border: 'rgba(96,92,255,0.4)', fg: '#c3bfff' },
  success: { bg: 'rgba(47,229,167,0.12)', border: 'rgba(47,229,167,0.4)', fg: 'var(--admin-success)' },
  warning: { bg: 'rgba(245,181,68,0.12)', border: 'rgba(245,181,68,0.4)', fg: 'var(--admin-warning)' },
  danger: { bg: 'rgba(240,97,109,0.12)', border: 'rgba(240,97,109,0.4)', fg: 'var(--admin-danger)' },
};

export interface AdminAlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function AdminAlert({ tone = 'info', title, children, icon, className = '' }: AdminAlertProps) {
  const t = TONE[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 'var(--admin-radius-control)', color: t.fg }}
      className={`flex items-start gap-3 p-3 text-sm ${className}`}
    >
      {icon && <span className="shrink-0 mt-0.5 inline-flex">{icon}</span>}
      <div className="min-w-0">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={title ? 'mt-0.5' : ''} style={{ color: 'var(--admin-text-muted)' }}>{children}</div>}
      </div>
    </div>
  );
}

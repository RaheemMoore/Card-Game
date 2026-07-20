import type { ReactNode } from 'react';

export interface AdminPageProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  /** Optional readable inner max-width for dense text pages; default is fluid. */
  maxWidth?: string;
}

// Standard admin page frame: title row (+ optional actions) and body. Fluid
// width by default per the design system (shell imposes no global max-width).
export function AdminPage({ title, description, actions, children, maxWidth }: AdminPageProps) {
  return (
    <div style={maxWidth ? { maxWidth, marginInline: 'auto' } : undefined}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>{title}</h1>
          {description && (
            <p className="mt-1 text-sm max-w-2xl" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>
          )}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export interface AdminSectionProps {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AdminSection({ title, subtitle, actions, children, className = '' }: AdminSectionProps) {
  return (
    <section className={`mb-6 ${className}`}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3 mb-2">
          <div>
            {title && <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>{title}</h2>}
            {subtitle && <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</div>}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

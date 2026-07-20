import type { ReactNode } from 'react';

export interface AdminFilterBarProps {
  children: ReactNode;
  className?: string;
}

// Horizontal control row for search + filters above a data table. Wraps on
// narrow widths rather than scrolling.
export function AdminFilterBar({ children, className = '' }: AdminFilterBarProps) {
  return (
    <div
      style={{ background: 'var(--admin-surface-strong)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }}
      className={`flex flex-wrap items-center gap-2 p-2 ${className}`}
    >
      {children}
    </div>
  );
}

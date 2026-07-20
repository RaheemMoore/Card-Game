import type { ReactNode } from 'react';

export interface AdminEmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function AdminEmptyState({ title, description, icon, action, className = '' }: AdminEmptyStateProps) {
  return (
    <div
      style={{ background: 'var(--admin-surface-subtle)', border: '1px dashed var(--admin-border)', borderRadius: 'var(--admin-radius-control)' }}
      className={`flex flex-col items-center justify-center text-center gap-2 p-8 ${className}`}
    >
      {icon && <span style={{ color: 'var(--admin-text-muted)' }}>{icon}</span>}
      <div className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>{title}</div>
      {description && <div className="text-xs max-w-sm" style={{ color: 'var(--admin-text-muted)' }}>{description}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

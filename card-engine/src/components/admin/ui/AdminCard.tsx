import type { ReactNode } from 'react';

type Surface = 'strong' | 'glass' | 'subtle';

const SURFACE_BG: Record<Surface, string> = {
  strong: 'var(--admin-surface-strong)',
  glass: 'var(--admin-card-glass)',
  subtle: 'var(--admin-surface-subtle)',
};

export interface AdminCardProps {
  children: ReactNode;
  /** strong = opaque (tables/forms/dense); glass = summary; subtle = empty/secondary. */
  surface?: Surface;
  padded?: boolean;
  className?: string;
  as?: 'div' | 'section' | 'li';
}

// Base admin surface. High-density/high-risk content should use surface="strong"
// (opaque) per the design system; glass/subtle are for summary + empty panels.
export function AdminCard({
  children,
  surface = 'strong',
  padded = true,
  className = '',
  as: Tag = 'div',
}: AdminCardProps) {
  return (
    <Tag
      style={{
        background: SURFACE_BG[surface],
        border: '1px solid var(--admin-border)',
        borderRadius: 'var(--admin-radius-control)',
        backdropFilter: surface === 'strong' ? undefined : 'blur(8px)',
      }}
      className={`${padded ? 'p-4' : ''} ${className}`}
    >
      {children}
    </Tag>
  );
}

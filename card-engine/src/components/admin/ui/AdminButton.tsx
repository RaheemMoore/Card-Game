import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--admin-accent)', color: '#fff', border: '1px solid transparent' },
  secondary: { background: 'var(--admin-surface-strong)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' },
  ghost: { background: 'transparent', color: 'var(--admin-text-muted)', border: '1px solid transparent' },
  danger: { background: 'var(--admin-danger)', color: '#fff', border: '1px solid transparent' },
};

const SIZE_CLASS: Record<Size, string> = {
  sm: 'text-xs px-2.5 min-h-[36px]',
  md: 'text-sm px-3.5 min-h-[44px]',
};

export interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

// Admin action button. Variants map to semantic tokens; min-height meets the
// 44px tablet touch target at size md. Focus-visible ring is always present.
export function AdminButton({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  disabled,
  ...rest
}: AdminButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...VARIANT_STYLE[variant],
        borderRadius: 'var(--admin-radius-control)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-canvas)] ${SIZE_CLASS[size]} ${className}`}
    >
      {icon && <span className="shrink-0 inline-flex">{icon}</span>}
      {children}
    </button>
  );
}

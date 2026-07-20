import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const CONTROL_STYLE: React.CSSProperties = {
  background: 'var(--admin-surface-strong)',
  border: '1px solid var(--admin-border)',
  borderRadius: 'var(--admin-radius-control)',
  color: 'var(--admin-text)',
};
const CONTROL_CLASS =
  'w-full px-3 min-h-[44px] text-sm placeholder:text-[var(--admin-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]';

function Label({ label, hint, required, children, htmlFor }: { label?: string; hint?: ReactNode; required?: boolean; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block">
      {label && (
        <span className="block mb-1 text-xs font-medium" style={{ color: 'var(--admin-text-muted)' }}>
          {label}{required && <span style={{ color: 'var(--admin-danger)' }}> *</span>}
        </span>
      )}
      {children}
      {hint && <span className="block mt-1 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>{hint}</span>}
    </label>
  );
}

export interface AdminFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: ReactNode;
}
export function AdminField({ label, hint, required, className = '', id, ...rest }: AdminFieldProps) {
  return (
    <Label label={label} hint={hint} required={required} htmlFor={id}>
      <input id={id} required={required} {...rest} style={CONTROL_STYLE} className={`${CONTROL_CLASS} py-2 ${className}`} />
    </Label>
  );
}

export interface AdminTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: ReactNode;
}
export function AdminTextArea({ label, hint, required, className = '', id, rows = 3, ...rest }: AdminTextAreaProps) {
  return (
    <Label label={label} hint={hint} required={required} htmlFor={id}>
      <textarea id={id} rows={rows} required={required} {...rest} style={{ ...CONTROL_STYLE, minHeight: undefined }} className={`w-full px-3 py-2 text-sm resize-y placeholder:text-[var(--admin-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] ${className}`} />
    </Label>
  );
}

export interface AdminSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
}
export function AdminSelect({ label, hint, required, className = '', id, children, ...rest }: AdminSelectProps) {
  return (
    <Label label={label} hint={hint} required={required} htmlFor={id}>
      <select id={id} required={required} {...rest} style={CONTROL_STYLE} className={`${CONTROL_CLASS} py-2 ${className}`}>
        {children}
      </select>
    </Label>
  );
}

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

// Reusable right-side preview drawer for admin surfaces. Shared by the Prompt
// Lab session detail, the ability detail panel, the cross-user card drawer,
// and the per-user drawer so the whole admin has one right-panel affordance.
//
// - Fixed to the right edge, ~33vw with 380–640px clamp.
// - Backdrop click or ESC closes.
// - Focus management: on open, focus moves into the panel; ESC closes; on
//   close, focus restores to whatever was focused before it opened.
// - Sticky header (title + subtitle + close X).
// - Optional sticky action bar at the bottom for primary buttons.
// - Scrollable body between them.

interface AdminPreviewPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AdminPreviewPanel(props: AdminPreviewPanelProps) {
  const { open, onClose, title, subtitle, actions, children } = props;
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember what had focus, then move focus into the panel.
    restoreRef.current = document.activeElement as HTMLElement | null;
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      '[data-autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    (focusTarget ?? panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      // Restore focus to the invoking control on close.
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="admin-root fixed inset-0 z-[80] flex justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Detail panel'}
        tabIndex={-1}
        className="h-full flex flex-col shadow-2xl focus:outline-none"
        style={{
          width: 'clamp(380px, 33vw, 640px)',
          background: 'var(--admin-surface-strong)',
          borderLeft: '1px solid var(--admin-border)',
          color: 'var(--admin-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-start justify-between gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate" style={{ color: 'var(--admin-text)' }}>{title}</h2>
            {subtitle && <div className="text-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)] rounded"
            style={{ color: 'var(--admin-text-muted)' }}
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {actions && (
          <div
            className="px-5 py-3 flex flex-wrap gap-2 justify-end"
            style={{ borderTop: '1px solid var(--admin-border)', background: 'var(--admin-surface-subtle)' }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

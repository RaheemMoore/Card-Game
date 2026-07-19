import { useEffect } from 'react';
import type { ReactNode } from 'react';

// Reusable right-side preview drawer for admin surfaces. First consumer
// is the Prompt Lab session detail; the same component should absorb the
// existing user drawer, card detail drawer, and future ability detail
// drawer so the whole admin has one right-panel affordance.
//
// - Fixed to the right edge, ~33vw with 380–640px clamp.
// - Backdrop click or ESC closes.
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="h-full flex flex-col shadow-2xl"
        style={{
          width: 'clamp(380px, 33vw, 640px)',
          background: 'rgba(20, 18, 15, 0.96)',
          borderLeft: '1px solid rgba(246,236,216,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-bone/15">
          <div className="min-w-0">
            <h2 className="font-fantasy text-lg font-bold text-bone truncate">{title}</h2>
            {subtitle && <div className="text-xs text-bone/60 truncate">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-bone/70 hover:text-bone text-2xl leading-none shrink-0"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {actions && (
          <div className="px-5 py-3 border-t border-bone/15 flex flex-wrap gap-2 justify-end bg-void/40">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

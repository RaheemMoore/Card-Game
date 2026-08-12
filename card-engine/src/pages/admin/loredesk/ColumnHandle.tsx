import { useRef, useState } from 'react';

/**
 * The drag grip between two desk columns.
 *
 * Sits in its own grid track, so dragging never overlaps the content on
 * either side. Pointer capture rather than window listeners: the drag keeps
 * working when the cursor outruns the 10px strip, and it ends cleanly even if
 * the pointer is released outside the window.
 *
 * Keyboard-operable because this moves real layout — arrows nudge, Home
 * resets. A mouse-only affordance would put the column widths out of reach
 * for anyone who does not use one.
 */
export function ColumnHandle({
  label,
  /** Current width of the column this handle controls. */
  width,
  /** `left` grows as you drag right; `right` grows as you drag left. */
  grows,
  onResize,
  onReset,
}: {
  label: string;
  width: number;
  grows: 'left' | 'right';
  onResize: (next: number, containerWidth: number) => void;
  onReset: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; width: number; container: number } | null>(null);

  const containerWidth = (el: HTMLElement) =>
    el.parentElement?.getBoundingClientRect().width ?? window.innerWidth;

  const apply = (clientX: number) => {
    if (!start.current) return;
    const dx = clientX - start.current.x;
    const next = grows === 'left' ? start.current.width + dx : start.current.width - dx;
    onResize(next, start.current.container);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault();
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, width, container: containerWidth(el) };
        setDragging(true);
      }}
      onPointerMove={(e) => { if (dragging) apply(e.clientX); }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        start.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => { start.current = null; setDragging(false); }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 48 : 16;
        const container = containerWidth(e.currentTarget);
        const toward = grows === 'left' ? 1 : -1;
        if (e.key === 'ArrowRight') { e.preventDefault(); onResize(width + step * toward, container); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); onResize(width - step * toward, container); }
        if (e.key === 'Home') { e.preventDefault(); onReset(); }
      }}
      title={`${label} — drag to resize, double-click to reset`}
      className="group relative focus-visible:outline-none"
      style={{ cursor: 'col-resize', touchAction: 'none' }}
    >
      {/* The visible line is thinner than the hit area — 10px to grab, 2px to see. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 transition-colors"
        style={{
          width: 2,
          marginLeft: -1,
          borderRadius: 2,
          background: dragging ? 'var(--admin-accent)' : 'var(--admin-border)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        style={{ width: 2, marginLeft: -1, borderRadius: 2, background: 'var(--admin-accent)' }}
      />
    </div>
  );
}

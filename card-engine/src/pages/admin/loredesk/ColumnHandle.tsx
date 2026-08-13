import { useRef, useState } from 'react';

/**
 * The drag grip between two desk columns.
 *
 * ⚠ `alignSelf: stretch` is load-bearing. The desk grid is `items-start`, so a
 * grid item with no content collapses to ZERO height — the first version of
 * this handle was 10px wide and 0px tall, with a perfectly correct
 * `col-resize` cursor on a surface that did not exist. It looked implemented
 * and could not be grabbed (Raheem, 2026-08-12).
 *
 * The grip is `sticky` rather than centred because the desk is far taller
 * than the viewport; a marker pinned to the middle of a 1700px column is off
 * screen most of the time. Sticky keeps it beside you wherever you have
 * scrolled to.
 *
 * Pointer capture rather than window listeners: the drag keeps working when
 * the cursor outruns the 10px strip, and ends cleanly if the pointer is
 * released outside the window. Keyboard-operable because this moves real
 * layout — arrows nudge, Home resets.
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
  const [hovered, setHovered] = useState(false);
  const start = useRef<{ x: number; width: number; container: number } | null>(null);

  const active = dragging || hovered;

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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
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
      className="relative focus-visible:outline-none"
      style={{
        // Without this the handle has no height at all. See the docblock.
        alignSelf: 'stretch',
        cursor: 'col-resize',
        touchAction: 'none',
        minHeight: 120,
      }}
    >
      {/* Full-height hairline, so the seam between columns is always visible. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 transition-colors"
        style={{
          left: '50%',
          width: active ? 3 : 1,
          marginLeft: active ? -1.5 : -0.5,
          borderRadius: 2,
          background: dragging
            ? 'var(--admin-accent)'
            : hovered
              ? 'var(--admin-accent-alt)'
              : 'var(--admin-border)',
        }}
      />

      {/* The grab affordance. Sticky so it stays beside you down a long page. */}
      <span
        aria-hidden="true"
        className="sticky flex flex-col items-center justify-center gap-1 mx-auto transition-colors"
        style={{
          top: '45vh',
          width: 10,
          height: 34,
          borderRadius: 999,
          background: dragging
            ? 'var(--admin-accent)'
            : active
              ? 'var(--admin-accent-alt)'
              : 'var(--admin-surface-strong)',
          border: `1px solid ${active ? 'transparent' : 'var(--admin-border)'}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 2,
              height: 2,
              borderRadius: 999,
              background: active ? '#fff' : 'var(--admin-text-muted)',
            }}
          />
        ))}
      </span>
    </div>
  );
}

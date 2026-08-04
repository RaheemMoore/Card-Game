import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * A scroller that admits it scrolls.
 *
 * Raheem, 2026-08-04: "There's nothing that lets me know that there's more
 * archetypes to the right... I'm tempted to just condense it into a drop down
 * list, but I don't wanna lose the beauty of the art." That is the trade this
 * component exists to refuse — the art stays, and the scroll becomes legible.
 *
 * Two signals, both only shown on the edge that actually has more content:
 *
 *   1. A FADE. Content dissolving off the edge reads as continuing, where
 *      content cut by a hard border reads as ending. This is the signal doing
 *      most of the work, and it needs no explanation.
 *   2. A CHEVRON. The fade alone is ambiguous on a dark panel over a dark
 *      background, so a small arrow says which way to go.
 *
 * NO ANIMATION. The project's motion budget is deliberately minimal, and a
 * pulsing arrow in a menu you open constantly becomes noise fast. If a static
 * hint proves insufficient in play, that is a decision to make then.
 *
 * The hints are `aria-hidden` and the scroller keeps `tabIndex={0}` so keyboard
 * users get a real focusable scroll region instead of a decorative arrow.
 */

type Axis = 'x' | 'y';

interface Props {
  children: ReactNode;
  axis: Axis;
  className?: string;
  style?: CSSProperties;
  /** Applied to the inner scrolling element. */
  contentStyle?: CSSProperties;
  label?: string;
}

export function ScrollArea({ children, axis, className = '', style, contentStyle, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pos = axis === 'x' ? el.scrollLeft : el.scrollTop;
    const size = axis === 'x' ? el.clientWidth : el.clientHeight;
    const total = axis === 'x' ? el.scrollWidth : el.scrollHeight;
    // 2px slack: fractional layout means an element scrolled fully to the end
    // often reports a position a fraction short, which would leave the "more
    // this way" hint showing when there is nothing more.
    setEdges({ start: pos > 2, end: pos + size < total - 2 });
  }, [axis]);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    // Content can change without a scroll or a window resize — filtering the
    // collection changes how many rows exist. Observe the element itself.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure, children]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const horizontal = axis === 'x';

  return (
    // The outer is a FLEX COLUMN so the scroller can be sized by `flex`, not by
    // a percentage. `height: 100%` on the scroller silently did nothing here: a
    // percentage height resolves against the parent's SPECIFIED height, and the
    // parent's is `auto` with flex doing the sizing. The scroller therefore grew
    // to its content and never scrolled — the grid reported clientHeight equal
    // to scrollHeight while cards were visibly cut off by the panel.
    <div
      className={className}
      style={{ position: 'relative', minHeight: 0, display: 'flex', flexDirection: 'column', ...style }}
    >
      <div
        ref={ref}
        onScroll={measure}
        tabIndex={0}
        role="group"
        aria-label={label}
        style={{
          overflowX: horizontal ? 'auto' : 'hidden',
          overflowY: horizontal ? 'hidden' : 'auto',
          // Vertical scrollers must be FILLED by flex (basis 0 so they shrink
          // inside a definite-height parent). Horizontal ones must NOT — the
          // outer is a column, so `flex: 1 1 0` there zeroes the rack's HEIGHT
          // and the crests collapse to a sliver. Same prop, opposite axis,
          // opposite meaning.
          flex: horizontal ? '0 0 auto' : '1 1 0',
          minHeight: 0,
          scrollbarWidth: 'thin',
          ...contentStyle,
        }}
      >
        {children}
      </div>

      {edges.start && <Fade axis={axis} side="start" />}
      {edges.end && <Fade axis={axis} side="end" />}
    </div>
  );
}

function Fade({ axis, side }: { axis: Axis; side: 'start' | 'end' }) {
  const horizontal = axis === 'x';
  const dir = horizontal
    ? side === 'start'
      ? 'to right'
      : 'to left'
    : side === 'start'
      ? 'to bottom'
      : 'to top';

  // Matches the case interior so the fade reads as depth rather than a grey bar
  // laid over the art.
  const shade = 'rgba(38,28,22,0.96)';

  return (
    <>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          ...(horizontal
            ? { top: 0, bottom: 0, [side === 'start' ? 'left' : 'right']: 0, width: 44 }
            : { left: 0, right: 0, [side === 'start' ? 'top' : 'bottom']: 0, height: 40 }),
          background: `linear-gradient(${dir}, ${shade} 0%, rgba(38,28,22,0) 100%)`,
          pointerEvents: 'none',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          ...(horizontal
            ? { top: '50%', [side === 'start' ? 'left' : 'right']: 6, transform: 'translateY(-50%)' }
            : { left: '50%', [side === 'start' ? 'top' : 'bottom']: 2, transform: 'translateX(-50%)' }),
          color: '#e6c98a',
          fontSize: 15,
          lineHeight: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}
      >
        {horizontal ? (side === 'start' ? '‹' : '›') : side === 'start' ? '⌃' : '⌄'}
      </span>
    </>
  );
}

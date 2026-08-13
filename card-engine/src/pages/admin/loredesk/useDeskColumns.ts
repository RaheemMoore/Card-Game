import { useCallback, useEffect, useState } from 'react';

/**
 * Draggable column widths for the desk (Raheem, 2026-08-12).
 *
 * Per-session by choice — widths reset next time the desk opens. Nothing is
 * written to storage, so there is no stale layout to be confused by later and
 * no cleanup when the design changes.
 *
 * The layout MODE is read with matchMedia rather than left to CSS media
 * queries, because the drag has to know how many columns exist: a handle that
 * resizes a column which is not on screen is worse than no handle. Below the
 * two-column breakpoint the handles are not rendered at all.
 */

export type DeskLayoutMode = 'wide' | 'medium' | 'stacked';

const RAIL_DEFAULT = 300;
const MUSE_DEFAULT = 330;
const RAIL_MIN = 210;
const RAIL_MAX = 560;
const MUSE_MIN = 240;
const MUSE_MAX = 600;
/** Never let the writing column be squeezed below a readable measure. */
const WRITING_MIN = 380;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function readMode(): DeskLayoutMode {
  if (typeof window === 'undefined') return 'wide';
  if (window.matchMedia('(min-width: 1440px)').matches) return 'wide';
  if (window.matchMedia('(min-width: 1024px)').matches) return 'medium';
  return 'stacked';
}

export function useDeskColumns() {
  const [mode, setMode] = useState<DeskLayoutMode>(readMode);
  const [railWidth, setRailWidth] = useState(RAIL_DEFAULT);
  const [museWidth, setMuseWidth] = useState(MUSE_DEFAULT);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1440px)');
    const medium = window.matchMedia('(min-width: 1024px)');
    const update = () => setMode(readMode());
    wide.addEventListener('change', update);
    medium.addEventListener('change', update);
    return () => {
      wide.removeEventListener('change', update);
      medium.removeEventListener('change', update);
    };
  }, []);

  /**
   * Clamped against the CONTAINER, not just against constants — otherwise
   * dragging the rail wide on a 1440px screen can starve the writing column
   * even though each width is individually legal.
   */
  const resizeRail = useCallback(
    (next: number, containerWidth: number) => {
      const otherSide = mode === 'wide' ? museWidth : 0;
      const roomy = containerWidth - otherSide - WRITING_MIN;
      setRailWidth(clamp(next, RAIL_MIN, Math.max(RAIL_MIN, Math.min(RAIL_MAX, roomy))));
    },
    [mode, museWidth],
  );

  const resizeMuse = useCallback(
    (next: number, containerWidth: number) => {
      const roomy = containerWidth - railWidth - WRITING_MIN;
      setMuseWidth(clamp(next, MUSE_MIN, Math.max(MUSE_MIN, Math.min(MUSE_MAX, roomy))));
    },
    [railWidth],
  );

  const reset = useCallback(() => {
    setRailWidth(RAIL_DEFAULT);
    setMuseWidth(MUSE_DEFAULT);
  }, []);

  // Handles occupy their own grid tracks so a drag never overlaps content.
  const gridTemplateColumns =
    mode === 'wide'
      ? `${railWidth}px 10px minmax(0, 1fr) 10px ${museWidth}px`
      : mode === 'medium'
        ? `${railWidth}px 10px minmax(0, 1fr)`
        : 'minmax(0, 1fr)';

  return {
    mode,
    railWidth,
    museWidth,
    gridTemplateColumns,
    resizeRail,
    resizeMuse,
    reset,
    /** In medium the Muse drops under the writing column, which is track 3. */
    museGridColumn: mode === 'medium' ? 3 : undefined,
  };
}

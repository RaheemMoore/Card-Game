import { useEffect, useState } from 'react';

/**
 * Live viewport width — used to fluidly resize the command shelf's
 * dock/ability-bar/controls zones so they stay in sync (a plain CSS
 * `clamp()` string can't drive `PartyDock`'s numeric `CARD_SCALE` transform
 * or the hero-sprite-lane math in `computeHeroLaneXPercents`, so the shelf
 * needs one shared live width number).
 *
 * Layers three mechanisms because no single one is reliable everywhere:
 * a plain `resize` listener (the normal case), a `ResizeObserver` on
 * `document.documentElement` (catches some CDP-level viewport overrides
 * that don't dispatch `resize`), and a cheap 250ms poll as a last-resort
 * fallback (some automated viewport-override tooling changes
 * `window.innerWidth` — confirmed via real CSS `clamp()` values reacting —
 * without firing either of the above). The poll is nearly free (one
 * property read) and only ever changes state when the width actually
 * differs, so it's a no-op in the common case where the listeners already
 * did their job.
 */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setWidth((cur) => (cur === window.innerWidth ? cur : window.innerWidth));
    update();
    window.addEventListener('resize', update);
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(document.documentElement);
    const poll = window.setInterval(update, 250);
    return () => {
      window.removeEventListener('resize', update);
      observer?.disconnect();
      window.clearInterval(poll);
    };
  }, []);
  return width;
}

/** JS equivalent of CSS `clamp(min, preferred, max)` where `preferred` is
 *  expressed as a fraction of `viewportWidth` (e.g. 0.16 ~= `16vw`). */
export function clampNum(min: number, vwFraction: number, max: number, viewportWidth: number): number {
  return Math.min(max, Math.max(min, vwFraction * viewportWidth));
}

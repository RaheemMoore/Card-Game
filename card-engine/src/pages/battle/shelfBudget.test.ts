import { describe, it, expect } from 'vitest';
import {
  SHELF_BREAKPOINTS,
  SHELF_MIN_SPARE,
  abilityZoneWidth,
  resourceZoneWidth,
  controlsWidth,
  shelfContentWidth,
  shelfSpare,
} from './shelfLayout';
import { computePartyDockWidth } from './PartyDock';

/**
 * The command shelf must fit on screen.
 *
 * ── Why this test exists ─────────────────────────────────────────────────
 * The shelf has overflowed twice. The second time, End Turn rendered 53px off
 * the right edge of a 1440 viewport — and measuring the rest showed it was
 * over budget at 1024 (+202px), 1280 (+154px) and 1440 (+70px), fitting only
 * at 1920, which happened to be the one width that had been checked.
 *
 * Both overflows passed typecheck, passed every unit test, and looked correct
 * in a screenshot. Nothing in the codebase knew what the shelf cost in total.
 *
 * This is deliberately pure arithmetic over the same functions the components
 * lay out with — no DOM, no browser, no screenshots. It runs in milliseconds
 * and fails the moment somebody adds a control or raises a floor without
 * paying for it somewhere else.
 */
describe('command shelf width budget', () => {
  it.each(SHELF_BREAKPOINTS)('fits at %ipx with room to spare', (vw) => {
    const spare = shelfSpare(vw);
    expect(
      spare,
      `shelf is over budget at ${vw}px — content ${shelfContentWidth(vw)}px leaves ${spare}px ` +
        `(need >= ${SHELF_MIN_SPARE}). Zones: abilities ${abilityZoneWidth(vw)}, ` +
        `resource ${resourceZoneWidth(vw)}, dock ${computePartyDockWidth(vw)}, ` +
        `controls ${controlsWidth(vw)}.`,
    ).toBeGreaterThanOrEqual(SHELF_MIN_SPARE);
  });

  it('never lets a zone collapse to nothing', () => {
    // A zone squeezed to zero is a different failure from overflow and reads as
    // missing UI rather than as a layout bug, so it is worth its own assertion.
    for (const vw of SHELF_BREAKPOINTS) {
      expect(abilityZoneWidth(vw), `abilities at ${vw}`).toBeGreaterThan(100);
      expect(resourceZoneWidth(vw), `resource at ${vw}`).toBeGreaterThan(100);
      expect(controlsWidth(vw), `controls at ${vw}`).toBeGreaterThan(150);
    }
  });

  it('protects the card fan — the dock never yields to the other zones', () => {
    // The explicit decision behind the floors: abilities and controls shrink
    // first, cards do not. If a future change makes the dock the thing that
    // gives way, that is a design reversal and should be deliberate.
    for (const vw of SHELF_BREAKPOINTS) {
      const dock = computePartyDockWidth(vw);
      expect(dock, `dock at ${vw} should stay the largest zone`).toBeGreaterThan(
        abilityZoneWidth(vw),
      );
      expect(dock, `dock at ${vw} should stay the largest zone`).toBeGreaterThan(
        resourceZoneWidth(vw),
      );
    }
  });
});

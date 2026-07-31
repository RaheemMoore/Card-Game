import { describe, it, expect } from 'vitest';
import {
  SHELF_BREAKPOINTS,
  SHELF_MIN_SPARE,
  RESOURCE_GAP,
  STRIKE_WIDTH,
  abilityZoneWidth,
  abilityZonePadding,
  abilityTriggerWidth,
  resourceZoneWidth,
  resourceZonePadding,
  vesselWidth,
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

  /**
   * The shelf is divided by seam rules, and a control that renders wider than
   * its own zone visibly breaks out of the frame and crosses that seam. Total
   * budget alone does not catch it: the shelf can fit overall while a single
   * control spills across a divider, which is exactly what happened to the
   * ability trigger (41px past its zone at 1280) and the resource vessels
   * (32px at 1024).
   *
   * The rule: a control's width is DERIVED from its zone, never declared
   * beside it.
   */
  it.each(SHELF_BREAKPOINTS)('keeps every control inside its own zone at %ipx', (vw) => {
    const abilityUsable = abilityZoneWidth(vw) - abilityZonePadding(vw) * 2;
    expect(
      abilityTriggerWidth(vw),
      `ability trigger breaks out of its zone at ${vw}px`,
    ).toBeLessThanOrEqual(abilityUsable);

    const resourceUsable = resourceZoneWidth(vw) - resourceZonePadding(vw) * 2;
    const resourceContent = vesselWidth(vw) * 2 + STRIKE_WIDTH + RESOURCE_GAP * 2;
    expect(
      resourceContent,
      `vessels + strike break out of the resource zone at ${vw}px`,
    ).toBeLessThanOrEqual(resourceUsable);
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

import { clampNum } from './useViewportWidth';
import { computePartyDockWidth } from './PartyDock';

/**
 * Every width on the command shelf, in one place, as NUMBERS.
 *
 * ── Why this exists ──────────────────────────────────────────────────────
 * The shelf overflowed twice. The second time, End Turn sat 53px off the right
 * edge of a 1440 viewport, and measuring the rest showed it was not one stray
 * button: the zones overflowed at 1024 (+202px), 1280 (+154px) and 1440
 * (+70px), and only fitted at 1920 — which was the only width anyone had
 * looked at.
 *
 * The cause was structural. Every zone was a `clamp()` string written inline at
 * its own call site, so no single place knew what the shelf cost in total, and
 * nothing could be checked without a browser at a specific size.
 *
 * With the widths as functions, `shelfBudget.test.ts` can sum them at every
 * breakpoint and fail the build the moment a control is added or a floor is
 * raised without paying for it. That is a pure arithmetic test — no DOM, no
 * screenshots, no luck.
 *
 * RULE: nothing on the shelf may hardcode a width. If a zone needs one, it
 * gets a function here and the budget test starts counting it.
 */

/** PaintedPanel's ring, both sides — the shelf's usable width is inset by it. */
export const SHELF_BORDER = 10;

/** Hairline separators between zones. */
export const SHELF_SEAM_COUNT = 3;

/**
 * Minimum breathing room the shelf must keep at every supported width.
 *
 * Not zero: sub-pixel rounding, focus rings and the acting card's glow all
 * bleed a few px past their layout boxes, and a shelf that exactly fits is one
 * rounding error from overflowing again.
 */
export const SHELF_MIN_SPARE = 24;

/** Widths the shelf is required to fit. 1024 is the tightest real laptop. */
export const SHELF_BREAKPOINTS = [1024, 1152, 1280, 1440, 1680, 1920] as const;

/**
 * The ability control's zone.
 *
 * Floor lowered from 210 when the shelf was found overflowing. Abilities yield
 * ground before the cards do — the cards are the characters, and this is a
 * menu.
 */
export function abilityZoneWidth(vw: number): number {
  return clampNum(132, 0.140, 240, vw);
}

/** Inner padding of the ability zone, one side. */
export function abilityZonePadding(vw: number): number {
  return clampNum(6, 0.011, 14, vw);
}

/**
 * The ability trigger button itself — DERIVED from its zone, never guessed.
 *
 * It used to carry its own `clamp(150px, 15vw, 200px)`, which had no
 * relationship to the zone containing it. At 1280 the zone was 179px and the
 * button computed 192px, so the painted frame visibly broke out of its own
 * slot and crossed the seam — at every width except 1920, by up to 41px.
 *
 * This is the same class of drift `shelfLayout` exists to stop, and it slipped
 * through because the zone moved here while the control's own width stayed an
 * inline clamp at its call site. A child sized independently of its parent
 * will disagree with it eventually.
 */
export function abilityTriggerWidth(vw: number): number {
  return abilityZoneWidth(vw) - abilityZonePadding(vw) * 2;
}

/** The resource zone — both vessels AND the strike button that fills them. */
export function resourceZoneWidth(vw: number): number {
  return clampNum(148, 0.145, 196, vw);
}

/** Inner padding of the resource zone, one side. */
export function resourceZonePadding(vw: number): number {
  return clampNum(4, 0.008, 10, vw);
}

/** Gap between the two vessels and the strike button. */
export const RESOURCE_GAP = 6;

/** Strike sits beside the vessels and is the narrowest of the three. */
export const STRIKE_WIDTH = 40;

/**
 * One vessel, DERIVED from what its zone can actually hold.
 *
 * Fixed 52px vessels plus a 44px strike overflowed the zone by 32px at 1024 —
 * the same defect as the ability trigger, in a different slot. Anything sized
 * independently of its container disagrees with it at some width; the only
 * reliable fix is to divide up what the container has.
 */
export function vesselWidth(vw: number): number {
  const usable = resourceZoneWidth(vw) - resourceZonePadding(vw) * 2;
  const forVessels = usable - STRIKE_WIDTH - RESOURCE_GAP * 2;
  // Floor keeps two of them inside the zone after rounding; the minimum stops
  // a narrow viewport from collapsing them to slivers.
  return Math.max(38, Math.floor(forVessels / 2));
}

/* ---- Right-hand controls ------------------------------------------- */

export function utilityChipWidth(vw: number): number {
  return clampNum(24, 0.034, 46, vw);
}
export function endTurnWidth(vw: number): number {
  return clampNum(104, 0.140, 190, vw);
}
export function controlsGap(vw: number): number {
  return clampNum(5, 0.009, 12, vw);
}
export function controlsPaddingRight(vw: number): number {
  return clampNum(6, 0.012, 20, vw);
}

/** Total intrinsic width of the right-hand controls cluster. */
export function controlsWidth(vw: number): number {
  const chips = utilityChipWidth(vw) * 3 + 6; // three chips + the tray's padding
  const gap = controlsGap(vw);
  return chips + gap + 1 /* seam */ + gap + endTurnWidth(vw) + controlsPaddingRight(vw);
}

/**
 * Everything the shelf must fit, and what is left over.
 *
 * `computePartyDockWidth` is included rather than re-derived — it is the
 * card fan's own reservation and the one zone that must NOT be squeezed.
 */
export function shelfContentWidth(vw: number): number {
  return (
    abilityZoneWidth(vw) +
    resourceZoneWidth(vw) +
    computePartyDockWidth(vw) +
    controlsWidth(vw) +
    SHELF_SEAM_COUNT
  );
}

export function shelfSpare(vw: number): number {
  return vw - SHELF_BORDER * 2 - shelfContentWidth(vw);
}

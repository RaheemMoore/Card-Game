/**
 * The Rage bar's fill threshold, shared so desktop and both mobile readouts
 * cannot drift from each other.
 *
 * This is a PRESENTATION constant, not reducer truth — it drives how a phase
 * transition is illustrated, not when one happens. (The Emberborn Wraith's
 * own Rage phase boundary lives in its `BossPhaseSnapshot.healthThresholdEnd`,
 * frozen per-boss in the snapshot; this is only the point at which the bar
 * starts filling toward that boundary.) It was previously copied verbatim
 * into `BossHUDOverlay`, `MobileBossHeader`, and `MobileResourceRow` — three
 * places that would each need to change together and never had to.
 */
export const RAGE_THRESHOLD = 0.25;

/** 0..100 fill, 0% at `RAGE_THRESHOLD` HP and 100% at 0 HP. */
export function rageFillPercent(hpPct: number): number {
  return Math.max(
    0,
    Math.min(100, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -100 + 100),
  );
}

import type { MotionLevel } from '../../../vfx/types';
import type { ResolvedPerformance } from '../../../services/combat/performance/types';
import { resolveAnchor, type AnchorContext, type Point } from '../combatAnchors';
import { LashRenderer } from './LashRenderer';
import { GrowthRenderer } from './GrowthRenderer';
import { BarrierRenderer } from './BarrierRenderer';
import { GenericRenderer } from './GenericRenderer';
import { ChargeTell } from './ChargeTell';
import {
  assetAvailable,
  assetKitIdFor,
  getAssetKit,
  performanceAssetUrl,
} from '../../../data/combat/performance/assetKits';

import { useStageClock, type StageClockOptions } from './useStageClock';

/**
 * How much smaller the charge art is than the version the ability produces at
 * the target. Small enough to read as "the seed of that", large enough to see.
 */
const CHARGE_ART_SCALE = 0.72;

/**
 * Mounts one resolved performance and dispatches it to its family renderer.
 *
 * Owns the three things every renderer would otherwise each get wrong:
 *
 *  - **Keying.** The React key is the performance id, which is derived from
 *    the opener's event index. A repeat cast of the same ability later in the
 *    battle is a different index, so it mounts fresh instead of being
 *    reconciled onto the previous cast's half-finished DOM.
 *  - **Anchors.** Resolved here, once, from the named registry. No renderer
 *    ever sees `computeDockCardXPercents`, and none can drift.
 *  - **Cleanup.** `useStageClock` cancels its rAF on unmount, so an
 *    interrupted, skipped or battle-ending performance leaves no live loop.
 */

interface PerformanceProps {
  performance: ResolvedPerformance;
  motionLevel: MotionLevel;
  anchorContext: AnchorContext;
  /** Live shield integrity for the protected card, when the form is a barrier. */
  shieldIntegrity?: number;
  clock?: StageClockOptions;
  observation?: {
    casterActorId: string;
    targetActorId?: string;
  };
}

export function PerformanceView({
  performance: perf,
  motionLevel,
  anchorContext,
  shieldIntegrity = 1,
  clock: clockOptions,
  observation,
}: PerformanceProps) {
  const clock = useStageClock(perf, clockOptions);

  const from = resolveAnchor(perf.castAnchor, anchorContext);
  const to = resolveAnchor(perf.targetAnchor, anchorContext);
  const stageName = clock.stage?.stage ?? null;

  /*
   * Renderers get stage DURATIONS, not live stage progress.
   *
   * `stageProgressRef` is a ref by design (see useStageClock) — reading it
   * during render would hand every renderer a value frozen at the last stage
   * change, so a growth animation would jump between stages instead of
   * growing. Only the lash reads the ref, and it does so inside its own rAF
   * where the value is current. Everything else expresses its motion in CSS
   * from a known duration, which is both correct and cheaper.
   */
  const manifestMs =
    perf.stages.find((s) => s.stage === 'manifest')?.durationMs ?? 260;
  const chargeMs = perf.stages.find((s) => s.stage === 'charge')?.durationMs ?? 260;
  const impactStage = perf.stages.find((s) => s.stage === 'impact');
  const impactMs = impactStage?.durationMs ?? 400;

  /*
   * The exact fraction of the performance at which the beam touches the target.
   *
   * Derived from the plan, not guessed. It used to be a hardcoded 0.4, while
   * the impact stage actually began at ~0.49 — so the beam arrived, and then
   * nothing happened for a beat before the splash appeared. Raheem caught it:
   * "as soon as the beam makes contact with the boss, we want the impact frame
   * to generate right then."
   *
   * Deriving it means the two can never drift apart again, whatever the stage
   * durations or the tempo are later retuned to.
   */
  const contactProgress =
    impactStage && perf.totalMs > 0 ? impactStage.startMs / perf.totalMs : 0.4;

  /*
   * The charge tell is drawn for EVERY form, not per renderer.
   *
   * Gathering material at the cast point before anything happens is universal —
   * a growth gathers in the ground, a barrier gathers in front of the card, a
   * lash gathers at the card edge. Putting it here means a new form inherits
   * it, and no renderer can forget it. It stays up while the effect fires (the
   * delivery emerges THROUGH the pool) and clears in the aftermath.
   */
  const chargeVisible =
    stageName === 'charge' || stageName === 'cast' || stageName === 'travel' ||
    stageName === 'manifest' || stageName === 'impact' || stageName === 'return' ||
    stageName === 'arrival';

  /*
   * The three pieces do NOT leave together.
   *
   * Raheem's note, and it is the difference between a sequence and a switch
   * being flipped: "there should be a moment where the charge, the beam and the
   * impact are all present, but they should not disappear at the same time. The
   * charge should disappear first to show the card stopped shooting. Then the
   * beam. Then the one on the boss."
   *
   * So during the impact stage all three overlap, and then they release in
   * order — card, beam, target. That reads as a causal chain: the card stops
   * pushing, so the stream runs out, so only the mark it left remains. All
   * three vanishing at once reads as the effect being switched off.
   *
   * Expressed as fractions of the impact stage so it stays correct at any
   * tempo.
   */
  /*
   * How long the impact art is actually on screen: the impact beat plus the
   * aftermath it sits through. A bloom times its whole fade-up-and-dissipate
   * against this, so smoke finishes exactly as the beat does rather than being
   * cut off — and it stays correct at any tempo.
   */
  const impactVisibleMs =
    impactMs + (perf.stages.find((s) => s.stage === 'aftermath')?.durationMs ?? 0);

  const releasing = stageName === 'impact';
  const chargeReleaseMs = Math.round(impactMs * 0.34);
  /*
   * The beam does NOT fade during the impact stage at all — full opacity for
   * its entire duration, cut only at the hard stage boundary.
   *
   * First attempt moved the fade to the impact stage's last quarter, which
   * was still wrong: watching a real cast, Raheem wanted the beam "visible
   * for the whole [impact] frame, not disappearing... it needs to be there
   * at least three times as long as that." The aftermath cut itself was
   * already right ("aftermath is great, aftermath is how it is now") — the
   * only problem was a fade starting DURING impact at all.
   *
   * So the delay is set to the full impact duration: within 'impact' the CSS
   * animation never leaves its pre-delay (full-opacity) phase, and the fade
   * would only begin exactly when impact ends — by which point
   * `LashRenderer`'s `streaming` check (which excludes `'aftermath'`) has
   * already unmounted the beam anyway, so the fade never actually plays. The
   * cut to aftermath is the clean instant one Raheem already approved.
   */
  const beamReleaseDelayMs = impactMs;
  const beamReleaseMs = 1;
  /*
   * Authored charge art, when the kit has it. Drawn smaller than the version
   * the ability produces at the target — same object, two sizes, which is what
   * makes the second read as having come from the first.
   */
  const chargeKit = getAssetKit(assetKitIdFor(perf.form, perf.material.element));
  const chargeArt = assetAvailable(chargeKit?.charge)
    ? {
        src: performanceAssetUrl(chargeKit.charge),
        sizePx: Math.round(chargeKit.charge.dimensions.width * CHARGE_ART_SCALE),
      }
    : undefined;

  /*
   * The charge tell belongs to the CARD, not to the delivery's origin.
   *
   * For most abilities those are the same point. For Rootgrasp they are not:
   * the plant blooms on the card while the roots erupt from the ground around
   * the boss. Anchoring the tell to `castAnchor` put the plant at the boss's
   * feet, which read as the boss growing it. Charging is something the caster
   * does, so it is always drawn at the caster.
   */
  const chargeTell = chargeVisible ? (
    <ChargeTell
      at={resolveAnchor('caster_card_front', anchorContext)}
      kit={perf.material}
      motionLevel={motionLevel}
      chargeMs={chargeMs}
      firing={stageName !== 'charge'}
      // The surge just before the ability resolves at the target. `cast` is
      // the beat between gathering and delivery, which is exactly the moment
      // the card should look like it is about to let go.
      flaring={stageName === 'cast' || stageName === 'manifest'}
      releasing={releasing}
      releaseMs={chargeReleaseMs}
      art={chargeArt}
      intensity={perf.intensity}
      sizeMultiplier={4.5}
      zIndex={24}
    />
  ) : null;

  // A finished performance unmounts itself. Leaving it up would accumulate
  // one dead SVG layer per cast for the whole battle — the "unbounded DOM
  // nodes per effect" the budget forbids.
  if (clock.finished && clockOptions?.pinnedStageIndex === undefined) return null;

  return (
    <>
      {import.meta.env.DEV && observation && (
        <output
          hidden
          data-battle-performance
          data-performance-id={perf.id}
          data-performance-form={perf.form}
          data-performance-stage={stageName ?? undefined}
          data-caster-actor-id={observation.casterActorId}
          data-target-actor-id={observation.targetActorId}
          data-from-x={from.x}
          data-from-y={from.y}
          data-to-x={to.x}
          data-to-y={to.y}
        />
      )}
      {chargeTell}
      {renderBody()}
    </>
  );

  function renderBody() {
  const deliveryKit = getAssetKit(assetKitIdFor(perf.form, perf.material.element));
  const hasReviewedStream = assetAvailable(deliveryKit?.stream);
  switch (perf.form) {
    case 'lash':
    case 'drain':
      return (
        <LashRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          progressRef={clock.progressRef}
          stageName={stageName}
          contactProgress={contactProgress}
          releasing={releasing}
          releaseDelayMs={beamReleaseDelayMs}
          releaseMs={beamReleaseMs}
          impactVisibleMs={impactVisibleMs}
        />
      );

    case 'growth':
      return (
        <GrowthRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          stageName={stageName}
          manifestMs={manifestMs}
        />
      );

    case 'barrier':
      return (
        <BarrierRenderer
          performance={perf}
          at={to}
          motionLevel={motionLevel}
          stageName={stageName}
          manifestMs={manifestMs}
          integrity={shieldIntegrity}
        />
      );

    case 'projectile':
    case 'generic':
      if (hasReviewedStream) {
        return (
          <LashRenderer
            performance={perf}
            from={from}
            to={to}
            motionLevel={motionLevel}
            progressRef={clock.progressRef}
            stageName={stageName}
            contactProgress={contactProgress}
            releasing={releasing}
            releaseDelayMs={beamReleaseDelayMs}
            releaseMs={beamReleaseMs}
            impactVisibleMs={impactVisibleMs}
          />
        );
      }
      return (
        <GenericRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          stageName={stageName}
        />
      );
    default:
      return (
        <GenericRenderer
          performance={perf}
          from={from}
          to={to}
          motionLevel={motionLevel}
          stageName={stageName}
        />
      );
  }
  }
}

/** Convenience for anywhere that renders several at once. */
export function PerformanceLayer({
  performances,
  motionLevel,
  anchorContext,
  shieldIntegrity,
}: {
  performances: readonly ResolvedPerformance[];
  motionLevel: MotionLevel;
  anchorContext: AnchorContext;
  shieldIntegrity?: number;
}) {
  return (
    <>
      {performances.map((p) => (
        <PerformanceView
          key={p.id}
          performance={p}
          motionLevel={motionLevel}
          anchorContext={anchorContext}
          shieldIntegrity={shieldIntegrity}
        />
      ))}
      <PerformanceStyles />
    </>
  );
}

/**
 * One stylesheet for every performance renderer.
 *
 * Mounted once by the layer rather than per renderer, following the precedent
 * `CardCombatFxStyles` set: three effects each injecting an identical
 * `<style>` block is three copies of the same rules in the document, and any
 * future edit has to keep them in step.
 *
 * Note there is NO `@media (prefers-reduced-motion)` block here. That is
 * deliberate. Every animation below is gated in JSX on the resolved
 * `motionLevel`, which honours both the OS flag AND the in-game Motion
 * setting. A raw media query would silently ignore a player who turned motion
 * off in the game without setting the OS flag — which is exactly the bug this
 * work fixes in `CardCombatFx`, `PartyDock` and `AttackVFX`.
 */
export function PerformanceStyles() {
  return (
    <style>{`
      @keyframes perf-particle-fly {
        0%   { opacity: 0; transform: translate(0, 0) scale(0.6); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: translate(var(--pdx, 0), var(--pdy, 0)) scale(0.9); }
      }
      .perf-particle { animation: perf-particle-fly 460ms ease-out forwards; }

      @keyframes perf-bolt-travel {
        0%   { opacity: 0; transform: scaleX(0); }
        18%  { opacity: 1; }
        70%  { opacity: 1; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }
      /* transform-origin and rotate come from the inline style; the keyframe
         only drives scaleX, so it composes with the element's own rotation. */
      .perf-bolt { animation: perf-bolt-travel 240ms ease-in forwards; }

      @keyframes perf-generic-line-draw {
        0%   { opacity: 0; stroke-dashoffset: 1; }
        12%  { opacity: 1; }
        82%  { opacity: 1; }
        100% { opacity: 0; stroke-dashoffset: 0; }
      }
      .perf-generic-line {
        stroke-dasharray: 1;
        animation: perf-generic-line-draw 460ms ease-in-out forwards;
      }

      @keyframes perf-burst-out {
        0%, 40% { opacity: 0; transform: scale(0.3); }
        60%     { opacity: 1; transform: scale(1.15); }
        100%    { opacity: 0; transform: scale(1.6); }
      }
      .perf-burst { animation: perf-burst-out 380ms ease-out forwards; }

      /* Generated impact art. Punches in slightly oversized and settles, which
         is what makes a still image read as a hit rather than as a sticker
         appearing. Never fades to nothing during the impact beat — the splash
         is the payoff and it has to stay legible for the whole beat. */
      /* Fast in, then HOLD. The gap between the beam arriving and the splash
         appearing has to be tight or contact feels mushy — so the punch is
         240ms — but the splash then sits at full opacity for the rest of the
         aftermath, because that is the art the player is meant to enjoy. */
      @keyframes perf-impact-art-hit {
        0%   { opacity: 0; transform: scale(0.5); }
        18%  { opacity: 1; transform: scale(1.2); }
        40%  { transform: scale(1); }
        100% { opacity: 1; transform: scale(1); }
      }
      .perf-impact-art { animation: perf-impact-art-hit 240ms cubic-bezier(0.2,0.8,0.3,1) forwards; }

      /* BLOOM — smoke and shadow, which do not hit, they materialise.
       *
       * "It feels like it hits and then it's just, like, surprised it's there.
       * It should feel like it fades in. It's smoke. It's a shadow. It fades in
       * and out of existence."
       *
       * So this fades UP over its first third rather than punching in, keeps
       * growing slowly the whole time it is on screen — smoke never stops
       * expanding — and then dissipates rather than being cut off when the
       * performance ends. Timed against the full impact + aftermath life, so
       * it always finishes exactly as the beat does whatever the tempo is. */
      @keyframes perf-impact-bloom-in {
        0%   { opacity: 0;    transform: scale(0.62); filter: blur(1.5px); }
        30%  { opacity: 0.85; transform: scale(0.95); filter: blur(0px); }
        55%  { opacity: 1;    transform: scale(1.08); }
        78%  { opacity: 0.85; transform: scale(1.18); }
        100% { opacity: 0;    transform: scale(1.32); filter: blur(1.5px); }
      }
      .perf-impact-bloom {
        animation: perf-impact-bloom-in var(--impact-life, 1600ms) ease-in-out forwards;
      }

      /* SPREAD — fire crawling outward along the surface it hit. Widens faster
         than it grows tall, which is what keeps it a sheet rather than a ball. */
      @keyframes perf-impact-spread-out {
        0%   { opacity: 0; transform: scale(0.5, 0.7); }
        22%  { opacity: 1; transform: scale(1.15, 1.05); }
        60%  { transform: scale(1.3, 0.95); }
        100% { opacity: 0.9; transform: scale(1.38, 0.9); }
      }
      .perf-impact-spread {
        animation: perf-impact-spread-out 520ms cubic-bezier(0.15,0.85,0.35,1) forwards;
      }

      @keyframes perf-bloom-rise {
        0%   { opacity: 0; transform: translateY(6px) scale(0.7); }
        40%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-10px) scale(1.25); }
      }
      .perf-bloom { animation: perf-bloom-rise 520ms ease-out forwards; }

      @keyframes perf-cleanse-lift {
        0%   { opacity: 0; transform: translateY(0) scale(0.96); }
        30%  { opacity: 0.9; }
        100% { opacity: 0; transform: translateY(var(--cleanse-rise, -16px)) scale(1.08); }
      }
      .perf-cleanse { animation: perf-cleanse-lift 460ms ease-out forwards; }

      /* The gather. Material collects at the cast point over the charge stage,
         overshooting slightly so it reads as swelling under pressure rather
         than fading in. Holds at full once gathered — the delivery emerges
         THROUGH the pool, so it must still be there when the beam fires. */
      @keyframes perf-charge-gather {
        0%   { opacity: 0; transform: scale(0.25); }
        70%  { opacity: 1; transform: scale(1.12); }
        100% { opacity: 1; transform: scale(1); }
      }
      .perf-charge-gather {
        animation: perf-charge-gather var(--charge-ms, 260ms) cubic-bezier(0.2,0.7,0.3,1) forwards;
      }

      /* Armed: the card is holding a chosen ability and waiting for the round
         to run. Breathes indefinitely rather than resolving, because this state
         has no known duration — it lasts as long as the player takes. */
      @keyframes perf-charge-breathe {
        0%, 100% { opacity: 0.72; transform: scale(0.96); }
        50%      { opacity: 1;    transform: scale(1.04); }
      }
      .perf-charge-pulse { animation: perf-charge-breathe 1400ms ease-in-out infinite; }

      /* Only materials that drip get drips — a silhouette cue, not a colour one. */
      @keyframes perf-charge-drip-fall {
        0%   { opacity: 0; transform: translateY(0) scaleY(0.7); }
        25%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(14px) scaleY(1.4); }
      }
      .perf-charge-drip { animation: perf-charge-drip-fall 900ms ease-in infinite; }

      /* Staged emergence: each root is drawn from the ground outward. The
         stagger comes from a per-branch animation-delay, which is what makes
         this growth rather than one shape scaling up. */
      @keyframes perf-root-draw {
        from { stroke-dashoffset: 140; }
        to   { stroke-dashoffset: 0; }
      }

      /* A shard's flight — split into TRAVEL and SPIN on separate elements,
         because a single CSS animation replaces an element's transform
         wholesale rather than composing with an inline one. Putting rotation
         (aim) and animation (travel) on the same element was the bug: the
         instant the flight animation started, the aim was discarded and every
         shard flew due east. Now the outer div holds the static aim, this
         travels along that div's local x axis, and a separate spin animates
         the image inside for the tumble a thrown solid has and a poured
         liquid does not. */
      @keyframes perf-volley-travel {
        0%   { opacity: 0; transform: translateX(0) scale(0.7); }
        12%  { opacity: 1; }
        88%  { opacity: 1; }
        100% { opacity: 0; transform: translateX(var(--fly-to, 300px)) scale(1); }
      }
      .perf-volley-fly {
        animation: perf-volley-travel 460ms cubic-bezier(0.35,0.1,0.6,1) forwards;
      }
      @keyframes perf-volley-tumble {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(var(--fly-spin, 220deg)); }
      }
      .perf-volley-spin {
        animation: perf-volley-tumble 460ms cubic-bezier(0.35,0.1,0.6,1) forwards;
      }

      /* ── The release, in order ─────────────────────────────────────────
         Card, then beam, then target. All three overlap at contact and then
         leave one at a time, which reads as a causal chain rather than as the
         effect being switched off. Durations come from the impact stage, so
         the order survives any tempo change. */
      @keyframes perf-release-out {
        from { opacity: 1; }
        to   { opacity: 0; }
      }
      .perf-charge-release {
        animation: perf-release-out var(--release-ms, 140ms) ease-in forwards;
      }
      .perf-beam-release {
        animation: perf-release-out var(--release-ms, 160ms) ease-in
                   var(--release-delay, 0ms) forwards;
      }

      /* The wraparound cinching in. Overshoots slightly then settles, so it
         reads as something tightening around the target rather than a band
         being pasted on. */
      @keyframes perf-wrap-cinch {
        0%   { opacity: 0; transform: scaleX(0.35) scaleY(1.4); }
        45%  { opacity: 1; transform: scaleX(1.06) scaleY(0.94); }
        100% { opacity: 1; transform: scaleX(1) scaleY(1); }
      }
      .perf-wrap-grip { animation: perf-wrap-cinch 300ms cubic-bezier(0.2,0.8,0.3,1) forwards; }

      /* The barrier is CONSECRATED, then it settles.
       *
       * It flashes into being much larger than the card, hangs there for a
       * beat so it is unmistakably an object rather than a border, and then
       * descends and shrinks onto the card it protects. Raheem's note: "get
       * big and then shrink back down into the cards, and then it'll appear on
       * whatever card that barrier has been put on."
       *
       * Scaling down IS the travel — cheaper than animating a path across the
       * stage, and it reads better, because the pane stays legible as a pane
       * the whole way instead of shrinking to a dot in transit. The small
       * upward offset at the top of the arc is what makes it read as
       * descending ONTO the card rather than merely deflating.
       */
      @keyframes perf-barrier-arrive {
        0%   { opacity: 0; transform: translateY(-26px) scale(0.55); }
        18%  { opacity: 1; transform: translateY(-34px) scale(2.0); }
        42%  { opacity: 1; transform: translateY(-30px) scale(1.85); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .perf-barrier-form {
        animation: perf-barrier-arrive var(--barrier-form-ms, 260ms)
                   cubic-bezier(0.25, 0.9, 0.3, 1) forwards;
      }

      @keyframes perf-brace-set {
        0%   { opacity: 0.15; }
        100% { opacity: 0.9; }
      }
      .perf-brace { animation: perf-brace-set 260ms ease-out forwards; }

      @keyframes perf-mote-converge {
        0%   { opacity: 0; transform: translateY(0) scale(0.5); }
        30%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(0) scale(1); }
      }
      .perf-barrier-mote { animation: perf-mote-converge 320ms ease-in forwards; }
    `}</style>
  );
}

export type { Point };

// TYPE-only. Importing Phaser's runtime here drags its device detection into
// every module that transitively reaches this file, and that probes a canvas
// which does not exist under the test environment — three unrelated suites
// stopped loading the moment this was a value import. Nothing below calls a
// Phaser static; it only ever touches the scene it was handed.
import type Phaser from 'phaser';
import { CONSTRUCT_TUNING, type ConstructPhase, type ConstructState } from '../combat/construct';
import { HITSTOP_CAP_MS } from '../combat/feel';

/**
 * How the training construct looks, and nothing else.
 *
 * STRICTLY A VIEW. It reads `ConstructState` and never writes it, never decides
 * anything, and never calls back into the state machine. That separation is the
 * reason `construct.ts` can be unit-tested at all, and the reason a missing
 * texture or a skipped tween cannot strand the fight.
 *
 * The art is procedural on purpose (Raheem's ruling, 2026-08-13): a body, a
 * shadow, a facing notch and a colour ramp, drawn with shapes. That is enough
 * to answer every question this milestone is actually asking — is the telegraph
 * readable, is the facing right, does the hit land, is the scale sane — and it
 * costs no generations, so behaviour can be tuned before any art is paid for. A
 * real sprite is a later `create-prop` run against numbers that have been played.
 *
 * The colours are deliberately NOT the courtyard's palette-matched stone. It
 * should read as scaffolding at a glance so it cannot be mistaken for approved
 * art or quietly ship (the same reason the dummy it replaces was a flat
 * rectangle).
 */

/** Body colour per phase. The telegraph is the one that has to carry meaning. */
/**
 * Body colour per phase.
 *
 * IDLE IS DELIBERATELY NOT THE OLD DUMMY'S BROWN. The first version of this
 * shipped `0xb45c2a` — byte-identical to the training dummy it replaced, at the
 * same 44x68 — so a construct standing still was indistinguishable from the
 * furniture, and the whole feature read as "nothing changed". Slate reads as
 * built-thing rather than post, and sits clearly against the courtyard's greens
 * and dirt browns.
 *
 * The ramp from here is the tell: it warms as the construct commits, so colour
 * alone carries the beat even before the ring appears.
 */
const PHASE_FILL: Record<ConstructPhase, number> = {
  disabled: 0x4a4a4a,
  idle: 0x6b7f96,
  alert: 0x8f8f8a,
  face: 0x9c9078,
  approach: 0xb08a4e,
  // The tell. Hot, and it is the only phase that also grows and pulses.
  telegraph: 0xffb02e,
  attack: 0xff5b3a,
  recovery: 0x8a6a4a,
  hitReact: 0xffe9a8,
  knockbackReact: 0xffd0a8,
  defeated: 0x3a2a1c,
  reviving: 0x6a8ab4,
};

const BODY_W = 44;
const BODY_H = 68;

export interface ConstructView {
  /**
   * `presentDeltaMs` is the PICTURE's clock, not the simulation's — zero while
   * a hit is being held. Anything this view animates by itself advances on it,
   * so a freeze that claims to stop the world actually does. Without it the
   * idle bob carried on nodding through every hitstop, which is exactly the
   * kind of small lie that makes a freeze read as a stutter instead of a hit.
   */
  update(
    state: ConstructState,
    heroFeet: { x: number; y: number },
    depthFor: (groundY: number) => number,
    presentDeltaMs: number,
  ): void;
  /** Told, not decided: reduced motion is a preference the scene owns. */
  setMotionOff(off: boolean): void;
  /**
   * It was hit. Show it on the BODY, scaled to how hard.
   *
   * The scene decides severity and owns the camera; this owns the thing that
   * was struck. Previously the scene's `flashConstruct()` claimed in a comment
   * to be "a tween on the view's own body" and in fact only shook the camera —
   * so the construct itself never acknowledged a hit at all, and the only
   * confirmation was the phase colour changing underneath it.
   */
  flash(feel: ConstructHitFeel): void;
  destroy(): void;
}

/**
 * What the view needs from a hit's feel.
 *
 * Structural rather than importing `HitFeel` whole: the presenter has no
 * business knowing about camera shake or hitstop, and a narrow parameter says
 * so in the type rather than in a comment.
 */
export interface ConstructHitFeel {
  flashPeakAlpha: number;
  flashMs: number;
  /** How long the view takes to catch up to the state's instant knockback. */
  knockbackEaseMs: number;
  staticFallback: boolean;
}

/**
 * Build the view.
 *
 * `depthFor` is passed in rather than computed here so the construct sorts
 * through exactly the same function as the hero, the projectiles and the
 * dropped cards. A second opinion about depth is how an actor ends up drawing
 * in front of a wall it is standing behind.
 */
export function createConstructView(
  scene: Phaser.Scene,
  band: Phaser.GameObjects.Layer | undefined,
  state: ConstructState,
): ConstructView {
  // Ground contact first, so the body reads as standing on the floor rather
  // than floating over it. The animals still lack this and can look adrift.
  const shadow = scene.add.ellipse(state.pos.x, state.pos.y, BODY_W * 0.9, 14, 0x000000, 0.28);

  const body = scene.add.rectangle(state.pos.x, state.pos.y, BODY_W, BODY_H, PHASE_FILL.idle);
  body.setStrokeStyle(3, 0x2a1608);
  // Feet origin, the contract every actor in this world obeys.
  body.setOrigin(0.5, 1);

  /**
   * Which way it is facing, as a mark on the ground rather than on the body.
   *
   * A facing that only exists in the sprite is invisible on a rectangle, and
   * "which way is it pointing" is one of the questions §9.1 says the construct
   * exists to answer.
   */
  const notch = scene.add.triangle(state.pos.x, state.pos.y, 0, 0, 14, 0, 7, 16, 0x2a1608, 0.85);
  notch.setOrigin(0.5, 0.5);

  /** The tell's halo. Only visible during the telegraph. */
  const tell = scene.add.circle(state.pos.x, state.pos.y, CONSTRUCT_TUNING.lungeReachPx * 0.5, 0xffb02e, 0.16);
  tell.setVisible(false);

  const hp = scene.add.rectangle(state.pos.x, state.pos.y - BODY_H - 10, BODY_W, 5, 0x59d16b);
  hp.setOrigin(0.5, 1);

  /**
   * The contact flash, as a white sheet over the body.
   *
   * An overlay rather than a tint because the body is a Rectangle, not a
   * Sprite — `setTintFill` does nothing to one — and because `update()`
   * rewrites the body's fill from the phase every single frame, so anything
   * written directly onto it would be stomped before it could be seen.
   */
  const hitFlash = scene.add.rectangle(state.pos.x, state.pos.y, BODY_W, BODY_H, 0xffffff, 0);
  hitFlash.setOrigin(0.5, 1);
  hitFlash.setVisible(false);

  for (const o of [shadow, body, notch, tell, hp, hitFlash]) band?.add(o);

  let motionOff = false;
  let bobT = 0;
  let flashTween: Phaser.Tweens.Tween | undefined;
  let flashTimer: Phaser.Time.TimerEvent | undefined;

  /**
   * How far BEHIND its true position the body is currently drawn.
   *
   * The knockback in `construct.ts` moves `pos` 36 pixels instantly, in one
   * frame, because that is the simplest thing a state machine can do and the
   * simulation has no opinion about how long a shove should look like it takes.
   * On screen that teleport is nearly invisible: the construct is simply
   * somewhere else, and the moment reads as the hit having done nothing.
   *
   * So the view lags. On a hit it records the distance it was displaced and
   * then closes that gap over `knockbackEaseMs`, which turns the teleport into
   * a shove without the state ever knowing. The STATE remains authoritative —
   * this only ever subtracts a decaying offset from where the state already
   * says the body is, so it cannot drift, cannot accumulate, and is guaranteed
   * to arrive at the truth.
   */
  let lagX = 0;
  let lagY = 0;
  let lagDecayMs = 1;
  let lastPos = { x: state.pos.x, y: state.pos.y };

  return {
    update(next, _heroFeet, depthFor, presentDeltaMs) {
      /**
       * Catch the teleport, then spend it.
       *
       * A jump larger than anything the walk could produce in one frame is a
       * knockback — the approach speed is 70px/s, so at any sane frame rate it
       * moves single-digit pixels, while the shove moves 36 at once. Adopting
       * the jump as lag and paying it back over `lagDecayMs` is what makes the
       * body appear to travel the distance rather than to have always been
       * there.
       */
      const jumped = Math.hypot(next.pos.x - lastPos.x, next.pos.y - lastPos.y);
      if (jumped > 12) {
        lagX = lastPos.x - next.pos.x;
        lagY = lastPos.y - next.pos.y;
      }
      lastPos = { x: next.pos.x, y: next.pos.y };

      // Decays on the PICTURE's clock, so the shove holds still through a
      // hitstop instead of quietly completing behind the freeze.
      if (lagX !== 0 || lagY !== 0) {
        const k = Math.max(0, 1 - presentDeltaMs / Math.max(lagDecayMs, 1));
        lagX *= k;
        lagY *= k;
        if (Math.abs(lagX) < 0.5 && Math.abs(lagY) < 0.5) {
          lagX = 0;
          lagY = 0;
        }
      }

      const groundY = next.pos.y + lagY;
      const drawX = next.pos.x + lagX;
      // Depth from the TRUE ground row, never the lagged one, so a shoved
      // construct cannot sort in front of something it is really behind.
      const depth = depthFor(next.pos.y);
      const visible = next.phase !== 'disabled';

      for (const o of [shadow, body, notch, hp]) o.setVisible(visible);
      if (!visible) {
        tell.setVisible(false);
        hitFlash.setVisible(false);
        return;
      }

      // A small idle bob, so a construct that is merely waiting still reads as
      // alive. Held still under reduced motion — the bob carries no information,
      // which is exactly the test for what may be dropped.
      // Was a flat 0.06 per frame, which made the bob's speed depend on the
      // frame rate. Driving it from the presentation clock fixes that and
      // freezes it during hitstop in the same stroke.
      bobT += motionOff ? 0 : presentDeltaMs * 0.0036;
      const bob = next.phase === 'idle' && !motionOff ? Math.sin(bobT) * 2 : 0;

      body.setPosition(drawX, groundY + bob);
      body.setDepth(depth);
      shadow.setPosition(drawX, groundY);
      shadow.setDepth(depth - 1);

      body.setFillStyle(PHASE_FILL[next.phase]);
      body.setAlpha(next.phase === 'defeated' ? 0.45 : 1);

      // The flash rides the body exactly, bob included, or a hit on a moving
      // construct would light up the patch of ground it just left.
      hitFlash.setPosition(drawX, groundY + bob);
      hitFlash.setDepth(depth + 0.5);

      // Facing lives on the ground in front of the feet.
      notch.setPosition(drawX + next.facing.x * 26, groundY + next.facing.y * 14);
      notch.setRotation(Math.atan2(next.facing.y, next.facing.x) - Math.PI / 2);
      notch.setDepth(depth - 1);
      notch.setVisible(next.phase !== 'defeated');

      /**
       * The telegraph, presented twice.
       *
       * The RING grows toward the strike — a shape, which survives with motion
       * off. The PULSE is decoration on top. Reduced motion must lose the
       * pulse and keep the ring, because the ring is the information: §10.3
       * requires the tell to remain readable without flashing, and a tell that
       * only exists as a flash is one a player with reduced motion cannot read.
       */
      if (next.phase === 'telegraph') {
        const t = Math.min(1, next.elapsedMs / CONSTRUCT_TUNING.telegraphMs);
        tell.setVisible(true);
        tell.setPosition(
          drawX + next.facing.x * CONSTRUCT_TUNING.preferredRangePx * 0.5,
          groundY + next.facing.y * CONSTRUCT_TUNING.preferredRangePx * 0.35,
        );
        tell.setRadius(CONSTRUCT_TUNING.lungeReachPx * (0.35 + 0.5 * t));
        tell.setFillStyle(0xffb02e, motionOff ? 0.3 : 0.14 + 0.26 * t);
        tell.setDepth(depth - 2);
      } else {
        tell.setVisible(false);
      }

      hp.setPosition(drawX, groundY - BODY_H - 10);
      hp.setDepth(depth + 1);
      hp.setVisible(next.phase !== 'defeated' && next.hp < CONSTRUCT_TUNING.maxHp);
      hp.setSize(BODY_W * (next.hp / CONSTRUCT_TUNING.maxHp), 5);
    },

    flash(feel) {
      // How long the shove takes to pay back is a property of how hard the hit
      // was, and this is the only moment the view is told that. Set before the
      // early return below so a zero-flash configuration still shoves.
      lagDecayMs = feel.knockbackEaseMs;
      if (feel.flashPeakAlpha <= 0 || feel.flashMs <= 0) return;

      // A second hit RESTARTS the flash rather than queueing behind the first.
      // Without this, rapid fire leaves tweens fighting over one alpha and the
      // construct settles at some arbitrary brightness between them.
      flashTween?.stop();
      flashTween = undefined;
      flashTimer?.remove();
      flashTimer = undefined;

      hitFlash.setVisible(true);
      hitFlash.setAlpha(feel.flashPeakAlpha);

      if (feel.staticFallback) {
        // Motion off: HOLD it, then clear. The flash is the whole statement
        // that a hit landed, so it is the last thing that may be dropped — it
        // gets longer here, not shorter.
        flashTimer = scene.time.delayedCall(feel.flashMs, () => {
          hitFlash.setAlpha(0);
          hitFlash.setVisible(false);
        });
        return;
      }

      flashTween = scene.tweens.add({
        targets: hitFlash,
        alpha: 0,
        duration: feel.flashMs,
        onComplete: () => {
          hitFlash.setVisible(false);
          flashTween = undefined;
        },
      });
      // Time is the backstop, as everywhere else here. Tweens are frozen during
      // hitstop, so this waits out the longest possible freeze before stepping
      // in — it must never clear a flash that is legitimately still held.
      flashTimer = scene.time.delayedCall(feel.flashMs + HITSTOP_CAP_MS + 120, () => {
        if (!flashTween) return;
        flashTween.stop();
        flashTween = undefined;
        hitFlash.setAlpha(0);
        hitFlash.setVisible(false);
      });
    },

    setMotionOff(off) {
      motionOff = off;
    },

    destroy() {
      flashTween?.stop();
      flashTimer?.remove();
      for (const o of [shadow, body, notch, tell, hp, hitFlash]) o.destroy();
    },
  };
}

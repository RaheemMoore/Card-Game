// TYPE-only. Importing Phaser's runtime here drags its device detection into
// every module that transitively reaches this file, and that probes a canvas
// which does not exist under the test environment — three unrelated suites
// stopped loading the moment this was a value import. Nothing below calls a
// Phaser static; it only ever touches the scene it was handed.
import type Phaser from 'phaser';
import { CONSTRUCT_TUNING, type ConstructPhase, type ConstructState } from '../combat/construct';

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
  update(state: ConstructState, heroFeet: { x: number; y: number }, depthFor: (groundY: number) => number): void;
  /** Told, not decided: reduced motion is a preference the scene owns. */
  setMotionOff(off: boolean): void;
  destroy(): void;
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

  for (const o of [shadow, body, notch, tell, hp]) band?.add(o);

  let motionOff = false;
  let bobT = 0;

  return {
    update(next, _heroFeet, depthFor) {
      const groundY = next.pos.y;
      const depth = depthFor(groundY);
      const visible = next.phase !== 'disabled';

      for (const o of [shadow, body, notch, hp]) o.setVisible(visible);
      if (!visible) {
        tell.setVisible(false);
        return;
      }

      // A small idle bob, so a construct that is merely waiting still reads as
      // alive. Held still under reduced motion — the bob carries no information,
      // which is exactly the test for what may be dropped.
      bobT += motionOff ? 0 : 0.06;
      const bob = next.phase === 'idle' && !motionOff ? Math.sin(bobT) * 2 : 0;

      body.setPosition(next.pos.x, groundY + bob);
      body.setDepth(depth);
      shadow.setPosition(next.pos.x, groundY);
      shadow.setDepth(depth - 1);

      body.setFillStyle(PHASE_FILL[next.phase]);
      body.setAlpha(next.phase === 'defeated' ? 0.45 : 1);

      // Facing lives on the ground in front of the feet.
      notch.setPosition(next.pos.x + next.facing.x * 26, groundY + next.facing.y * 14);
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
          next.pos.x + next.facing.x * CONSTRUCT_TUNING.preferredRangePx * 0.5,
          groundY + next.facing.y * CONSTRUCT_TUNING.preferredRangePx * 0.35,
        );
        tell.setRadius(CONSTRUCT_TUNING.lungeReachPx * (0.35 + 0.5 * t));
        tell.setFillStyle(0xffb02e, motionOff ? 0.3 : 0.14 + 0.26 * t);
        tell.setDepth(depth - 2);
      } else {
        tell.setVisible(false);
      }

      hp.setPosition(next.pos.x, groundY - BODY_H - 10);
      hp.setDepth(depth + 1);
      hp.setVisible(next.phase !== 'defeated' && next.hp < CONSTRUCT_TUNING.maxHp);
      hp.setSize(BODY_W * (next.hp / CONSTRUCT_TUNING.maxHp), 5);
    },

    setMotionOff(off) {
      motionOff = off;
    },

    destroy() {
      for (const o of [shadow, body, notch, tell, hp]) o.destroy();
    },
  };
}

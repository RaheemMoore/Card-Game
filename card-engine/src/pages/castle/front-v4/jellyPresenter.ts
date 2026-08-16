import Phaser from 'phaser';
import {
  JELLY_ANCHOR,
  JELLY_ANIM,
  JELLY_SHEET,
  jellyFrames,
  type JellyClipName,
} from '../../../data/castle/jellySprite';
import { CONSTRUCT_TUNING, type ConstructPhase } from '../combat/construct';
import type { HitFeel } from '../combat/feel';
import { LEAP_TUNING } from './jellyLeap';
import type { JellyState } from './jellyController';
import {
  DEPTH,
  GROUND_Y,
  JELLY_ANCHOR_X,
  JELLY_BODY,
  SPRITE_SCALE,
} from './layout';

/**
 * The Ember Jelly, drawn from the side.
 *
 * A SEPARATE, THINNER PRESENTER rather than the courtyard's `constructPresenter`,
 * which is built around things this view does not have: a `depthFor` callback that
 * sorts by ground contact, a facing notch offset by `facing.x * 26, facing.y * 14`,
 * and a telegraph ring at `range * 0.5, range * 0.35`. Those pairs are top-down
 * foreshortening ratios — they describe a circle seen at an angle — and there is no
 * angle here. Reusing it would mean passing a stub depth function and then fighting
 * every one of those constants.
 *
 * What it draws instead is the two things a side view actually needs: a shadow that
 * stays on the floor, and a marker on the ground where the creature is going to
 * land. In one axis, WHERE is the entire warning.
 */
export interface JellyView {
  update(state: JellyState, motionOff: boolean, groundY: number): void;
  /** White flash on contact, driven by the shared hit-feel scale. */
  flash(feel: HitFeel): void;
  /** The current clip, for the dev snapshot. */
  animation(): string;
  destroy(): void;
}

export function createJellyView(scene: Phaser.Scene, spawnX: number): JellyView {
  registerClips(scene);

  const shadow = scene.add.ellipse(spawnX, GROUND_Y, 74, 18, 0x000000, 0.34).setDepth(DEPTH.shadow);
  const tell = scene.add
    .ellipse(spawnX, GROUND_Y, 104, 28, 0xff7a3c, 0.5)
    .setDepth(DEPTH.tell)
    .setVisible(false);
  const body = scene.add
    .sprite(spawnX, GROUND_Y, JELLY_SHEET.key, 0)
    .setOrigin(JELLY_ANCHOR_X, JELLY_ANCHOR)
    .setScale(SPRITE_SCALE)
    .setDepth(DEPTH.jelly);
  const overlay = scene.add
    .sprite(spawnX, GROUND_Y, JELLY_SHEET.key, 0)
    .setOrigin(JELLY_ANCHOR_X, JELLY_ANCHOR)
    .setScale(SPRITE_SCALE)
    .setDepth(DEPTH.jellyFlash)
    .setTintFill(0xffffff)
    .setAlpha(0);
  const hpBack = scene.add.rectangle(spawnX, 0, 84, 8, 0x000000, 0.55).setDepth(DEPTH.hud);
  const hpFill = scene.add.rectangle(spawnX, 0, 80, 4, 0xff8b42).setDepth(DEPTH.hud);

  scene.textures.get(JELLY_SHEET.key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

  let clip = '';

  return {
    animation: () => clip,

    update(state, motionOff, groundY) {
      const construct = state.construct;
      const x = construct.pos.x;
      const y = groundY - state.heightPx;
      const visible = construct.phase !== 'disabled';

      body.setPosition(x, y).setVisible(visible);
      overlay.setPosition(x, y);

      // The shadow stays on the floor and shrinks with height. Airborne it is the
      // only thing on the ground plane saying where the creature is, so its alpha
      // floors rather than fading toward nothing — at the apex the first version
      // had faded it to roughly invisible, exactly when the geometry most needed
      // reading.
      const lift = Phaser.Math.Clamp(state.heightPx / LEAP_TUNING.apexPx, 0, 1);
      shadow
        .setPosition(x, groundY)
        .setScale(1 - 0.4 * lift)
        .setAlpha(0.34 - 0.14 * lift)
        .setVisible(visible && construct.phase !== 'defeated');

      // The landing marker, and it STAYS UP THROUGH THE LEAP. Hiding it at launch
      // took the information away at the exact moment the player was acting on it.
      // The commitment is already made and cannot change, so continuing to show it
      // promises nothing untrue.
      const landingX = state.leap?.landingX ?? construct.committedTarget?.x ?? null;
      const telegraphing = construct.phase === 'telegraph' && landingX !== null;
      const airborne = state.mode === 'leaping' && landingX !== null;
      tell.setVisible(telegraphing || airborne);
      if (telegraphing || airborne) {
        const t = telegraphing ? construct.elapsedMs / CONSTRUCT_TUNING.telegraphMs : 1;
        tell
          .setPosition(landingX!, groundY)
          .setScale(0.7 + 0.5 * t)
          .setAlpha(
            motionOff ? 0.6 : airborne ? 0.55 : 0.35 + 0.4 * Math.abs(Math.sin(t * Math.PI * 3)),
          );
      }

      const wanted = clipFor(construct.phase, state.mode);
      if (clip !== wanted) {
        clip = wanted;
        body.play(JELLY_ANIM[wanted], true);
      }

      const alive = visible && construct.phase !== 'defeated';
      const ratio = Phaser.Math.Clamp(construct.hp / CONSTRUCT_TUNING.maxHp, 0, 1);
      // Close over the body rather than floating above it: at 18 units clear of an
      // 82-unit creature the bar read as an unrelated stick hanging in the air.
      const barY = y - JELLY_BODY.heightPx - 9;
      hpBack.setPosition(x, barY).setVisible(alive);
      hpFill
        .setPosition(x - 40 + 40 * ratio, barY)
        .setSize(80 * ratio, 4)
        .setVisible(alive);
    },

    flash(feel) {
      if (feel.flashPeakAlpha <= 0) return;
      overlay.setAlpha(feel.flashPeakAlpha);
      scene.tweens.add({ targets: overlay, alpha: 0, duration: feel.flashMs });
    },

    destroy() {
      for (const object of [shadow, tell, body, overlay, hpBack, hpFill]) object.destroy();
    },
  };
}

/**
 * Which clip the body wears, given what it is doing.
 *
 * The hop is authored IN PLACE, with no travel in its frames, so it is the right
 * body language both for closing the distance and for being in the air — the
 * runtime supplies every unit of the displacement either way.
 */
function clipFor(phase: ConstructPhase, mode: string): JellyClipName {
  if (phase === 'defeated') return 'splat';
  if (phase === 'telegraph') return 'gather';
  if (mode === 'leaping' || phase === 'approach' || phase === 'attack') return 'hop';
  return 'idle';
}

const FPS: Record<JellyClipName, number> = { idle: 8, hop: 10, gather: 9, splat: 12 };

function registerClips(scene: Phaser.Scene) {
  for (const name of ['idle', 'hop', 'gather', 'splat'] as const) {
    const key = JELLY_ANIM[name];
    // Phaser's animation manager is global and throws on a duplicate key, so this
    // stays idempotent across scene restarts.
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: jellyFrames(name).map((frame) => ({ key: JELLY_SHEET.key, frame })),
      frameRate: FPS[name],
      repeat: name === 'splat' ? 0 : -1,
    });
  }
}

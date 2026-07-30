import Phaser from 'phaser';
import { keyboardVector, seekVector, type Vec2 } from './controls';
import { COURTYARD_EVENTS } from './events';
import { CANVAS_W, CANVAS_H, CANVAS_CENTER, WALKABLE, coverScale } from './layout';
import { HERO_SPAWN, STALLS } from './stalls';
import { SCENERY } from './scenery';
import { createAmbient, type Ambient } from './ambient';
import { WATER_LAYER } from '../../../data/castle/courtyardLayers';
import { KEEPERS, keeperIdleKey, type Keeper } from '../../../data/castle/keepers';
import { OCCLUDERS, occluderKey, occluderPath } from '../../../data/castle/occluders';
import {
  HERO_FACINGS,
  HERO_FEET,
  HERO_SHEET,
  HERO_WALK_FPS,
  HERO_WORLD_HEIGHT,
  idleFrame,
  walkFrames,
  walkKey,
  type HeroFacing,
} from '../../../data/castle/heroSprite';

/**
 * The courtyard scene.
 *
 * One fixed screen — the camera never follows and never scrolls. It sits
 * centred on the painted plate and zooms to cover the viewport, so a 16:9
 * monitor and a 4:3 tablet see different crops of the same painting without
 * either ever letterboxing.
 *
 * The plate is a top-down painted map (Lucid Origin). Colliders are authored
 * over it from stalls.ts rather than derived from the image, so the art can be
 * regenerated without touching movement code — only the traced coordinates.
 */

const PLAYER_SPEED = 200;

/**
 * A placed keeper. The base scale is kept alongside the sprite because the
 * breath tween drives scaleY away from it and reduced motion has to be able to
 * put it back exactly — a keeper frozen mid-inhale is a bug, not a still.
 */
interface KeeperView {
  keeper: Keeper;
  sprite: Phaser.GameObjects.Sprite;
  baseScale: number;
  breath: Phaser.Tweens.Tween | null;
}

/**
 * Walk-cycle frames per second at full speed. Scaled by actual velocity at
 * runtime so the feet drive the movement instead of skating over it.
 */
const BASE_WALK_FPS = HERO_WALK_FPS;

export class CourtyardScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facing: HeroFacing = 'down';
  private walking = false;

  /** Set from React; 'off' holds a standing frame instead of animating. */
  private motionOff = false;

  private seekTarget: Vec2 | null = null;
  private ambient: Ambient | null = null;
  private keepers: KeeperView[] = [];

  constructor() {
    super('courtyard');
  }

  preload() {
    this.load.image('courtyard', '/assets/castle/courtyard.png');
    this.load.image(WATER_LAYER.key, WATER_LAYER.path);
    for (const o of OCCLUDERS) this.load.image(occluderKey(o.id), occluderPath(o.id));
    this.load.spritesheet(HERO_SHEET.key, HERO_SHEET.path, {
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
    for (const k of KEEPERS) {
      // A keeper whose art has not landed yet is skipped rather than loaded with
      // zero-sized frames, which would throw and take the whole courtyard down.
      if (!k.sheet.frameWidth || !k.sheet.frameHeight || !k.sheet.frameCount) continue;
      this.load.spritesheet(k.sheet.key, k.sheet.path, {
        frameWidth: k.sheet.frameWidth,
        frameHeight: k.sheet.frameHeight,
      });
    }
  }

  create() {
    this.add.image(0, 0, 'courtyard').setOrigin(0, 0).setDisplaySize(CANVAS_W, CANVAS_H);

    // Nearest-neighbour on the SPRITE ONLY. Setting pixelArt globally would
    // also hard-edge the smooth painted plate, which looks worse than the
    // slight softness it fixes.
    this.textures.get(HERO_SHEET.key).setFilter(Phaser.Textures.FilterMode.NEAREST);

    const solids = this.buildSolids();

    this.player = this.add.sprite(
      HERO_SPAWN.x,
      HERO_SPAWN.y,
      HERO_SHEET.key,
      idleFrame('down'),
    ) as typeof this.player;
    // Origin at the FEET, not the centre. Every character in the courtyard must
    // agree that `y` means "where I stand on the ground", because three separate
    // systems compare it: depth sorting, the contact shadow, and collider
    // placement. The hero previously used the default centre origin while
    // keepers used feet, which put his physics body 50px below his own `y` — the
    // hero walked straight through the shopkeeper, and his shadow floated.
    this.player.setOrigin(0.5, 1);
    this.player.setScale(HERO_WORLD_HEIGHT / HERO_SHEET.frameHeight);
    this.createWalkAnimations();

    this.physics.add.existing(this.player);
    this.applyFeetBody();
    this.player.body.setCollideWorldBounds(true);

    this.physics.world.setBounds(
      WALKABLE.x,
      WALKABLE.y,
      WALKABLE.width,
      WALKABLE.height,
    );
    this.physics.add.collider(this.player, solids);

    // Ambient life: running water, pulsing crystal lamps, drifting motes and a
    // contact shadow. All layered over the painting; the plate is untouched.
    this.buildKeepers(solids);

    this.ambient = createAmbient(this, this.player, CANVAS_W, CANVAS_H);
    this.ambient.setMotionOff(this.motionOff);
    // Characters sort by their GROUND LINE, so whoever stands further down the
    // screen draws in front. A fixed depth would make the hero always overlap
    // the keeper, even when standing behind him. Ambient layers keep their own
    // low fixed depths and stay underneath.
    this.player.setDepth(this.player.y);

    this.buildOccluders();

    this.applyCameraCover();
    this.scale.on('resize', this.applyCameraCover, this);

    // Tracing aid: /castle?colliders=1 outlines every static body over the
    // painting. Colliders here are hand-traced onto painted art, so "is this
    // rectangle actually on the barrel" is a question that comes up every time
    // the plate changes — and eyeballing a sprite bumping into nothing is a slow
    // way to answer it. Off unless explicitly asked for.
    if (new URLSearchParams(window.location.search).get('colliders') === '1') {
      this.physics.world.createDebugGraphic();
      this.physics.world.drawDebug = true;
    }

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      this.seekTarget = { x: world.x, y: world.y };
    });

    this.game.events.on(COURTYARD_EVENTS.walkTo, this.handleWalkTo, this);
    this.game.events.on(COURTYARD_EVENTS.motionOff, this.setMotionOff, this);
    this.events.once('shutdown', () => {
      this.game.events.off(COURTYARD_EVENTS.walkTo, this.handleWalkTo, this);
      this.game.events.off(COURTYARD_EVENTS.motionOff, this.setMotionOff, this);
    });
  }

  private createWalkAnimations() {
    for (const facing of HERO_FACINGS) {
      const key = walkKey(facing);
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: walkFrames(facing).map((frame) => ({ key: HERO_SHEET.key, frame })),
        frameRate: BASE_WALK_FPS,
        repeat: -1,
      });
    }
  }

  /**
   * Feet-only collider. The body is sized in world units while the offset is
   * in the texture's own pixels, so the offset has to be divided back out by
   * the sprite's scale — otherwise the collider drifts up the body and the
   * hero stands "inside" the fountain.
   */
  private applyFeetBody() {
    const scale = this.player.scaleY || 1;
    this.player.body.setSize(HERO_FEET.width, HERO_FEET.height);
    this.player.body.setOffset(
      (HERO_SHEET.frameWidth - HERO_FEET.width / scale) / 2,
      HERO_SHEET.frameHeight - HERO_FEET.height / scale,
    );
  }

  /**
   * Shopkeepers: an idling sprite, a feet collider, and a ground-line depth.
   * They never move, so this runs once.
   *
   * Two ways to idle, by design. A keeper with a real multi-frame loop plays it.
   * A single-frame keeper is breathed by tween instead — see BREATH in
   * data/castle/keepers.ts for why generated idles were abandoned for them.
   * A single-frame keeper with no `breath` (the horse) simply stands still.
   */
  private buildKeepers(solids: Phaser.Physics.Arcade.StaticGroup) {
    for (const k of KEEPERS) {
      if (!this.textures.exists(k.sheet.key)) continue;
      this.textures.get(k.sheet.key).setFilter(Phaser.Textures.FilterMode.NEAREST);

      const key = keeperIdleKey(k.id);
      if (k.sheet.frameCount > 1 && !this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(k.sheet.key, {
            start: 0,
            end: k.sheet.frameCount - 1,
          }),
          frameRate: k.fps ?? 2,
          repeat: -1,
        });
      }

      const baseScale = k.worldHeight / k.sheet.frameHeight;
      const sprite = this.add
        .sprite(k.x, k.y, k.sheet.key, 0)
        .setOrigin(0.5, 1)
        .setScale(baseScale)
        .setDepth(k.y);

      const view: KeeperView = { keeper: k, sprite, baseScale, breath: null };
      if (!this.motionOff) this.startIdle(view);
      this.keepers.push(view);

      // Feet-only collider, positioned at his ground line.
      const box = this.add.rectangle(k.x, k.y - k.feet.height / 2, k.feet.width, k.feet.height);
      box.setVisible(false);
      solids.add(box);
      (box.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }
  }

  /** Start whichever idle this keeper uses. Safe to call when already idling. */
  private startIdle(view: KeeperView) {
    const { keeper, sprite } = view;

    if (keeper.sheet.frameCount > 1) {
      if (!sprite.anims.isPlaying) sprite.anims.play(keeperIdleKey(keeper.id), true);
      return;
    }
    if (!keeper.breath || view.breath) return;

    view.breath = this.tweens.add({
      targets: sprite,
      scaleY: view.baseScale * keeper.breath.amplitude,
      duration: keeper.breath.periodMs / 2,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      // Random phase, so a courtyard of keepers never breathes in lockstep. It
      // barely shows with two; it is the whole difference with six.
      delay: Math.random() * keeper.breath.periodMs,
    });
  }

  /**
   * Pieces of the painting that can draw in front of a character.
   *
   * Cut from the plate itself, so they line up by construction — origin (0,0)
   * at their recorded position, and deliberately NO setDisplaySize, because the
   * plate renders 1:1 and zoom is applied at the camera.
   *
   * Depth is the object's GROUND LINE, which puts these in the same 300–1040
   * band the characters sort in. That shared band is the whole mechanism.
   */
  private buildOccluders() {
    for (const o of OCCLUDERS) {
      const key = occluderKey(o.id);
      if (!this.textures.exists(key)) continue;
      this.add.image(o.x, o.y, key).setOrigin(0, 0).setDepth(o.groundY);
    }
  }

  /** Called from React when the motion-level preference changes. */
  setMotionOff(off: boolean) {
    this.motionOff = off;
    if (off) this.player?.anims?.stop();

    for (const view of this.keepers) {
      if (!off) {
        this.startIdle(view);
        continue;
      }
      view.sprite.anims.stop();
      view.sprite.setFrame(0);
      view.breath?.remove();
      view.breath = null;
      // Put the scale back exactly. Stopping the tween wherever it happened to
      // be would leave the keeper frozen mid-inhale, which is a stretched
      // sprite, not a still one.
      view.sprite.setScale(view.baseScale);
    }
    this.ambient?.setMotionOff(off);
  }

  private applyCameraCover() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, CANVAS_W, CANVAS_H);
    cam.setZoom(coverScale({ width: this.scale.width, height: this.scale.height }));
    cam.centerOn(CANVAS_CENTER.x, CANVAS_CENTER.y);
  }

  /** Invisible colliders traced onto the painted plate. */
  private buildSolids(): Phaser.Physics.Arcade.StaticGroup {
    const solids = this.physics.add.staticGroup();

    // Destinations and painted scenery collide identically; they differ only in
    // whether the player can interact with them, which is decided elsewhere.
    for (const box of [...STALLS, ...SCENERY]) {
      const rect = this.add.rectangle(box.x, box.y, box.width, box.height);
      rect.setVisible(false);
      solids.add(rect);
      (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }

    return solids;
  }

  private handleWalkTo(point: Vec2) {
    this.seekTarget = { ...point };
  }

  private directionVector(): Vec2 {
    const keys = keyboardVector(
      this.cursors.left.isDown || this.wasd.A.isDown,
      this.cursors.right.isDown || this.wasd.D.isDown,
      this.cursors.up.isDown || this.wasd.W.isDown,
      this.cursors.down.isDown || this.wasd.S.isDown,
    );

    if (keys.x !== 0 || keys.y !== 0) {
      this.seekTarget = null;
      return keys;
    }

    if (this.seekTarget) {
      const seek = seekVector({ x: this.player.x, y: this.player.y }, this.seekTarget);
      if (seek.x === 0 && seek.y === 0) this.seekTarget = null;
      return seek;
    }

    return { x: 0, y: 0 };
  }

  /**
   * Drive the walk cycle.
   *
   * The critical rule: never call play() while the same animation is already
   * running. Restarting it every frame pins the sprite on frame 0 forever,
   * which looks exactly like a static image sliding across the ground — the
   * bug this whole sprite pipeline exists to fix. `walking` + `facing` are the
   * guard.
   */
  private updateAnimation(dir: Vec2) {
    const moving = dir.x !== 0 || dir.y !== 0;

    if (moving) {
      // Favour the dominant axis so diagonal movement picks one clear facing.
      this.facing =
        Math.abs(dir.x) > Math.abs(dir.y)
          ? dir.x > 0
            ? 'right'
            : 'left'
          : dir.y < 0
            ? 'up'
            : 'down';
    }

    if (moving && !this.motionOff) {
      const key = walkKey(this.facing);
      if (!this.walking || this.player.anims.currentAnim?.key !== key) {
        this.player.anims.play(key, true);
        this.walking = true;
      }
      return;
    }

    // Standing still (or motion reduced): hold this direction's idle pose.
    if (this.walking || this.player.frame.name !== String(idleFrame(this.facing))) {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
      this.walking = false;
    }
  }

  update() {
    const dir = this.directionVector();
    this.updateAnimation(dir);
    this.player.body.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED);
    this.player.setDepth(this.player.y);
    this.ambient?.update(this.player.x, this.player.y, dir.x !== 0 || dir.y !== 0);
    this.game.events.emit(COURTYARD_EVENTS.heroMoved, {
      x: this.player.x,
      y: this.player.y,
    });
  }
}

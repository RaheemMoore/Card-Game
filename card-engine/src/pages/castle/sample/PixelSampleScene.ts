import Phaser from 'phaser';
import { keyboardVector, seekVector, type Vec2 } from '../courtyard/controls';
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
 * Pixel-courtyard SAMPLE scene — a decision artifact, not production.
 *
 * It exists to answer one question: does a PixelLab pixel-art courtyard look
 * right with the hero we already have, compared to the painted Lucid Origin
 * plate? So it deliberately reuses the real hero sheet and the real walk
 * animation code — the point is to see the hero we have in the scene we might
 * build.
 *
 * The live /castle courtyard is untouched by this file.
 *
 * Depth: a flat scene carries no depth data, so props are sorted by their
 * ground-contact Y (`baselineY`). The hero enters the same sort, which is what
 * lets him walk behind the fountain and in front of the barrel.
 */

const WORLD_W = 1024;
const WORLD_H = 768;
const PLAYER_SPEED = 200;

interface Prop {
  key: string;
  path: string;
  x: number;
  y: number;
  /** Collider footprint at the base, in world px. Omit for pure decoration. */
  collide?: { width: number; height: number };
}

/**
 * Placement is authored, not derived. y is the GROUND CONTACT point — props use
 * origin (0.5, 1) so their feet land exactly here and depth sorting is honest.
 */
const PROPS: Prop[] = [
  { key: 'fountain', path: '/assets/castle/pixel-sample/fountain.png', x: 512, y: 470, collide: { width: 104, height: 40 } },
  { key: 'stall', path: '/assets/castle/pixel-sample/stall.png', x: 250, y: 330, collide: { width: 74, height: 26 } },
  { key: 'stall2', path: '/assets/castle/pixel-sample/stall.png', x: 780, y: 330, collide: { width: 74, height: 26 } },
  { key: 'lamppost', path: '/assets/castle/pixel-sample/lamppost.png', x: 150, y: 600 },
  { key: 'lamppost2', path: '/assets/castle/pixel-sample/lamppost.png', x: 880, y: 600 },
  { key: 'barrel', path: '/assets/castle/pixel-sample/barrel.png', x: 640, y: 660, collide: { width: 40, height: 22 } },
];

export class PixelSampleScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facing: HeroFacing = 'down';
  private walking = false;
  private seekTarget: Vec2 | null = null;

  constructor() {
    super('pixel-sample');
  }

  preload() {
    this.load.image('sample-bg', '/assets/castle/pixel-sample/scene-bg.png');
    for (const p of PROPS) {
      if (!this.textures.exists(p.key)) this.load.image(p.key, p.path);
    }
    this.load.spritesheet(HERO_SHEET.key, HERO_SHEET.path, {
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
  }

  create() {
    // Nearest-neighbour on every pixel texture. Unlike the painted courtyard —
    // where global pixelArt would hard-edge the painting — here EVERYTHING is
    // pixel art, so crisp scaling is correct throughout.
    this.add.image(0, 0, 'sample-bg').setOrigin(0, 0).setDepth(0);
    for (const name of ['sample-bg', HERO_SHEET.key, ...PROPS.map((p) => p.key)]) {
      if (this.textures.exists(name)) {
        this.textures.get(name).setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    const solids = this.physics.add.staticGroup();

    for (const p of PROPS) {
      const sprite = this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1);
      // Depth = ground contact Y. The hero joins the same ordering below.
      sprite.setDepth(p.y);
      if (p.collide) {
        const box = this.add.rectangle(p.x, p.y - p.collide.height / 2, p.collide.width, p.collide.height);
        box.setVisible(false);
        solids.add(box);
        (box.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    }

    this.player = this.add.sprite(512, 620, HERO_SHEET.key, idleFrame('down')) as typeof this.player;
    this.player.setOrigin(0.5, 1);
    this.player.setScale(HERO_WORLD_HEIGHT / HERO_SHEET.frameHeight);
    this.createWalkAnimations();

    this.physics.add.existing(this.player);
    this.applyFeetBody();
    this.player.body.setCollideWorldBounds(true);
    this.physics.world.setBounds(70, 110, WORLD_W - 140, WORLD_H - 180);
    this.physics.add.collider(this.player, solids);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    const fit = () => {
      cam.setZoom(Math.min(this.scale.width / WORLD_W, this.scale.height / WORLD_H));
      cam.centerOn(WORLD_W / 2, WORLD_H / 2);
    };
    fit();
    this.scale.on('resize', fit, this);

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const world = cam.getWorldPoint(p.x, p.y);
      this.seekTarget = { x: world.x, y: world.y };
    });
  }

  private createWalkAnimations() {
    for (const facing of HERO_FACINGS) {
      const key = walkKey(facing);
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: walkFrames(facing).map((frame) => ({ key: HERO_SHEET.key, frame })),
        frameRate: HERO_WALK_FPS,
        repeat: -1,
      });
    }
  }

  /** Feet-only body; offset is in texture px so it must divide out the scale. */
  private applyFeetBody() {
    const scale = this.player.scaleY || 1;
    this.player.body.setSize(HERO_FEET.width, HERO_FEET.height);
    this.player.body.setOffset(
      (HERO_SHEET.frameWidth - HERO_FEET.width / scale) / 2,
      HERO_SHEET.frameHeight - HERO_FEET.height / scale,
    );
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

  /** Never restart a running animation — that pins it on frame 0 forever. */
  private updateAnimation(dir: Vec2) {
    const moving = dir.x !== 0 || dir.y !== 0;
    if (moving) {
      this.facing =
        Math.abs(dir.x) > Math.abs(dir.y)
          ? dir.x > 0 ? 'right' : 'left'
          : dir.y < 0 ? 'up' : 'down';
      const key = walkKey(this.facing);
      if (!this.walking || this.player.anims.currentAnim?.key !== key) {
        this.player.anims.play(key, true);
        this.walking = true;
      }
      return;
    }
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
    // Re-sort every frame against the props' ground lines.
    this.player.setDepth(this.player.y);
  }
}

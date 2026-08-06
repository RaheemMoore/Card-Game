import Phaser from 'phaser';
import courtyardV2Url from '../../../assets/dev-preview/courtyard-v2-figma.png';
import counterDepthUrl from '../../../assets/dev-preview/forge/counter-depth.png';
import benchDepthUrl from '../../../assets/dev-preview/forge/bench-depth.png';
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
import { createForgeVfx, type ForgeVfxController, type ForgeVfxSnapshot } from './forgeVfx';
import { createCrystalVfx, type CrystalVfxController, type CrystalVfxSnapshot } from './crystalVfx';
import { COURTYARD_V2_PREVIEW_EVENTS } from './events';
import {
  createHeroFootsteps,
  type FootstepSnapshot,
  type HeroFootstepsController,
} from './heroFootsteps';
import {
  PREVIEW_FORGE_AISLE,
  PREVIEW_FORGE_COUNTER_AISLE,
  PREVIEW_FORGE_COLLIDER_GRID,
  PREVIEW_FORGE_COLLIDERS,
} from './forgeColliders';

const WORLD_W = 1536;
const WORLD_H = 1152;
const PLAYER_SPEED = 205;

/** Exact Figma plate-space placement. Ground lines are the bottom bounds of the human traces. */
export const PREVIEW_FORGE_OCCLUDERS = [
  {
    id: 'forge-counter',
    key: 'courtyard-v2-counter-depth',
    url: counterDepthUrl,
    x: 894,
    y: 357,
    width: 214,
    height: 110,
    groundY: 467,
    figmaNodes: { art: '18:2', groundTrace: '13:5' },
  },
  {
    id: 'forge-bench',
    key: 'courtyard-v2-bench-depth',
    url: benchDepthUrl,
    x: 898,
    y: 452,
    width: 206,
    height: 103,
    groundY: 534.5,
    figmaNodes: { art: '34:2', groundTrace: '30:2' },
  },
] as const;

/** Approximate outer limit only. It is not a traced collision model. */
export const PREVIEW_WALK_BOUNDS = { x: 300, y: 350, width: 930, height: 500 } as const;

export interface CourtyardV2PreviewSnapshot {
  scene: 'dev-courtyard-v2-preview';
  scenario: 'courtyard-v2-hero-forge-surge-preview';
  collisionModel: 'figma-approved-preview-decomposed-rectangles';
  occlusionModel: 'figma-depth-layers';
  walkBounds: typeof PREVIEW_WALK_BOUNDS;
  collision: {
    provenance: 'figma-approved-preview-trace';
    grid: number;
    staticBodyCount: number;
    figmaNodes: string[];
    debugOverlay: boolean;
  };
  aisle: typeof PREVIEW_FORGE_AISLE & {
    testStatus: 'idle' | 'running' | 'pass' | 'fail';
    start: { x: number; y: number };
    target: { x: number; y: number };
    finalX: number | null;
  };
  rearAisle: typeof PREVIEW_FORGE_COUNTER_AISLE & {
    testStatus: 'idle' | 'running' | 'pass' | 'fail';
    start: { x: number; y: number };
    target: { x: number; y: number };
    finalX: number | null;
  };
  occluders: Array<{
    id: (typeof PREVIEW_FORGE_OCCLUDERS)[number]['id'];
    groundY: number;
    heroRelation: 'behind' | 'in-front';
  }>;
  hero: {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    facing: HeroFacing;
    walking: boolean;
    animationKey: string | null;
    frame: number;
    motionOff: boolean;
    feetOrigin: { x: 0.5; y: 1 };
    feetBody: { x: number; y: number; width: number; height: number };
    insidePreviewBounds: boolean;
  };
  footsteps: FootstepSnapshot;
  forge: ForgeVfxSnapshot;
  crystals: CrystalVfxSnapshot;
}

export class CourtyardV2PreviewScene extends Phaser.Scene {
  private forgeVfx: ForgeVfxController | null = null;
  private crystalVfx: CrystalVfxController | null = null;
  private footsteps: HeroFootstepsController | null = null;
  private player!: Phaser.GameObjects.Sprite & { body: Phaser.Physics.Arcade.Body };
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private facing: HeroFacing = 'down';
  private walking = false;
  private motionOff = false;
  private seekTarget: Vec2 | null = null;
  private debugColliders = false;
  private aisleTest: {
    status: 'idle' | 'running' | 'pass' | 'fail';
    deadline: number;
    finalX: number | null;
  } = { status: 'idle', deadline: 0, finalX: null };
  private rearAisleTest: {
    status: 'idle' | 'running' | 'pass' | 'fail';
    deadline: number;
    finalX: number | null;
  } = { status: 'idle', deadline: 0, finalX: null };

  constructor() {
    super('dev-courtyard-v2-preview');
  }

  preload() {
    this.load.image('courtyard-v2-figma-preview', courtyardV2Url);
    for (const occluder of PREVIEW_FORGE_OCCLUDERS) {
      this.load.image(occluder.key, occluder.url);
    }
    this.load.spritesheet(HERO_SHEET.key, HERO_SHEET.path, {
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
  }

  create() {
    this.add
      .image(0, 0, 'courtyard-v2-figma-preview')
      .setOrigin(0, 0)
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(0);

    const fit = () => {
      const camera = this.cameras.main;
      camera.removeBounds();
      camera.setZoom(Math.min(this.scale.width / WORLD_W, this.scale.height / WORLD_H));
      camera.centerOn(WORLD_W / 2, WORLD_H / 2);
    };
    fit();
    this.scale.on('resize', fit, this);

    this.forgeVfx = createForgeVfx(this);
    this.crystalVfx = createCrystalVfx(this);
    this.footsteps = createHeroFootsteps(this);

    this.textures.get(HERO_SHEET.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.player = this.physics.add.sprite(650, 790, HERO_SHEET.key, idleFrame('down')) as typeof this.player;
    this.player.setOrigin(0.5, 1).setScale(HERO_WORLD_HEIGHT / HERO_SHEET.frameHeight);
    this.createWalkAnimations();
    this.applyFeetBody();
    this.player.setDepth(this.player.y);
    this.buildForgeOccluders();
    const forgeSolids = this.buildForgeSolids();
    this.physics.add.collider(this.player, forgeSolids);
    this.player.body.setCollideWorldBounds(true);
    this.physics.world.setBounds(
      PREVIEW_WALK_BOUNDS.x,
      PREVIEW_WALK_BOUNDS.y,
      PREVIEW_WALK_BOUNDS.width,
      PREVIEW_WALK_BOUNDS.height,
    );

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.seekTarget = {
        x: Phaser.Math.Clamp(
          world.x,
          PREVIEW_WALK_BOUNDS.x,
          PREVIEW_WALK_BOUNDS.x + PREVIEW_WALK_BOUNDS.width,
        ),
        y: Phaser.Math.Clamp(
          world.y,
          PREVIEW_WALK_BOUNDS.y,
          PREVIEW_WALK_BOUNDS.y + PREVIEW_WALK_BOUNDS.height,
        ),
      };
    });

    this.game.events.on(COURTYARD_V2_PREVIEW_EVENTS.motionOff, this.setMotionOff, this);
    this.game.events.on(COURTYARD_V2_PREVIEW_EVENTS.sparkBurst, this.triggerSurge, this);
    this.game.events.on(COURTYARD_V2_PREVIEW_EVENTS.footsteps, this.walkDemo, this);
    this.game.events.on(
      COURTYARD_V2_PREVIEW_EVENTS.walkBehindCounter,
      this.walkBehindCounter,
      this,
    );
    this.game.events.on(COURTYARD_V2_PREVIEW_EVENTS.walkForgeAisle, this.walkForgeAisle, this);
    this.game.events.on(COURTYARD_V2_PREVIEW_EVENTS.snapshot, this.publishSnapshot, this);

    this.time.delayedCall(850, () => this.forgeVfx?.surge());

    this.events.once('shutdown', () => {
      this.scale.off('resize', fit, this);
      this.game.events.off(COURTYARD_V2_PREVIEW_EVENTS.motionOff, this.setMotionOff, this);
      this.game.events.off(COURTYARD_V2_PREVIEW_EVENTS.sparkBurst, this.triggerSurge, this);
      this.game.events.off(COURTYARD_V2_PREVIEW_EVENTS.footsteps, this.walkDemo, this);
      this.game.events.off(
        COURTYARD_V2_PREVIEW_EVENTS.walkBehindCounter,
        this.walkBehindCounter,
        this,
      );
      this.game.events.off(COURTYARD_V2_PREVIEW_EVENTS.walkForgeAisle, this.walkForgeAisle, this);
      this.game.events.off(COURTYARD_V2_PREVIEW_EVENTS.snapshot, this.publishSnapshot, this);
      this.input.off('pointerdown');
      this.footsteps?.destroy();
      this.footsteps = null;
      this.crystalVfx?.destroy();
      this.crystalVfx = null;
      this.forgeVfx?.destroy();
      this.forgeVfx = null;
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

  private buildForgeOccluders() {
    for (const occluder of PREVIEW_FORGE_OCCLUDERS) {
      this.add
        .image(occluder.x, occluder.y, occluder.key)
        .setOrigin(0, 0)
        .setDepth(occluder.groundY);
    }
  }

  private buildForgeSolids() {
    const solids = this.physics.add.staticGroup();
    this.debugColliders =
      new URLSearchParams(window.location.search).get('colliders') === '1';

    for (const box of PREVIEW_FORGE_COLLIDERS) {
      const rect = this.add
        .rectangle(box.x, box.y, box.width, box.height, 0xff182c, 0.38)
        .setStrokeStyle(2, 0xff465d, 0.95)
        .setVisible(this.debugColliders)
        .setDepth(20_000);
      rect.setData('colliderId', box.id);
      solids.add(rect);
      (rect.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    }

    return solids;
  }

  private applyFeetBody() {
    const scale = this.player.scaleY || 1;
    // Arcade scales body dimensions with the sprite. HERO_FEET is a world-space
    // contract, so convert it back to source pixels before assigning the body.
    this.player.body.setSize(HERO_FEET.width / scale, HERO_FEET.height / scale);
    this.player.body.setOffset(
      (HERO_SHEET.frameWidth - HERO_FEET.width / scale) / 2,
      HERO_SHEET.frameHeight - HERO_FEET.height / scale,
    );
  }

  private setMotionOff(off: boolean) {
    this.motionOff = off;
    if (off) {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
      this.walking = false;
    }
    this.footsteps?.setMotionOff(off);
    this.crystalVfx?.setMotionOff(off);
    this.forgeVfx?.setMotionOff(off);
    this.publishSnapshot();
  }

  private triggerSurge() {
    this.forgeVfx?.surge();
    this.publishSnapshot();
  }

  private walkDemo() {
    this.seekTarget = {
      x: this.player.x < 800 ? 900 : 650,
      y: 790,
    };
  }

  private walkBehindCounter() {
    const passageY =
      PREVIEW_FORGE_COUNTER_AISLE.forgeFront +
      (PREVIEW_FORGE_COUNTER_AISLE.availableClearance + HERO_FEET.height) / 2;
    this.player.body.reset(835, passageY);
    this.seekTarget = { x: 1165, y: passageY };
    this.rearAisleTest = {
      status: 'running',
      deadline: this.time.now + 3_500,
      finalX: null,
    };
    this.publishSnapshot();
  }

  private walkForgeAisle() {
    const passageY =
      PREVIEW_FORGE_AISLE.counterFront +
      (PREVIEW_FORGE_AISLE.availableClearance + HERO_FEET.height) / 2;
    this.player.body.reset(835, passageY);
    this.seekTarget = { x: 1165, y: passageY };
    this.aisleTest = {
      status: 'running',
      deadline: this.time.now + 3_500,
      finalX: null,
    };
    this.publishSnapshot();
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
    if (!this.seekTarget) return { x: 0, y: 0 };
    const seek = seekVector({ x: this.player.x, y: this.player.y }, this.seekTarget);
    if (seek.x === 0 && seek.y === 0) this.seekTarget = null;
    return seek;
  }

  private updateAnimation(direction: Vec2) {
    const moving = direction.x !== 0 || direction.y !== 0;
    if (moving) {
      this.facing =
        Math.abs(direction.x) > Math.abs(direction.y)
          ? direction.x > 0
            ? 'right'
            : 'left'
          : direction.y < 0
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
    if (this.walking || this.player.frame.name !== String(idleFrame(this.facing))) {
      this.player.anims.stop();
      this.player.setFrame(idleFrame(this.facing));
      this.walking = false;
    }
  }

  update() {
    if (!this.player?.body) return;
    const direction = this.directionVector();
    this.updateAnimation(direction);
    this.player.body.setVelocity(direction.x * PLAYER_SPEED, direction.y * PLAYER_SPEED);
    this.player.setDepth(this.player.y);
    this.footsteps?.update(
      this.player.x,
      this.player.y,
      direction,
    );
    this.crystalVfx?.update(this.player.x, this.player.y);

    if (this.aisleTest.status === 'running') {
      if (this.player.x >= 1157) {
        this.aisleTest = { status: 'pass', deadline: 0, finalX: this.player.x };
        this.seekTarget = null;
        this.publishSnapshot();
      } else if (this.time.now >= this.aisleTest.deadline) {
        this.aisleTest = { status: 'fail', deadline: 0, finalX: this.player.x };
        this.seekTarget = null;
        this.player.body.setVelocity(0, 0);
        this.publishSnapshot();
      }
    }

    if (this.rearAisleTest.status === 'running') {
      if (this.player.x >= 1157) {
        this.rearAisleTest = { status: 'pass', deadline: 0, finalX: this.player.x };
        this.seekTarget = null;
        this.publishSnapshot();
      } else if (this.time.now >= this.rearAisleTest.deadline) {
        this.rearAisleTest = { status: 'fail', deadline: 0, finalX: this.player.x };
        this.seekTarget = null;
        this.player.body.setVelocity(0, 0);
        this.publishSnapshot();
      }
    }
  }

  private publishSnapshot() {
    if (!this.forgeVfx || !this.crystalVfx || !this.footsteps || !this.player?.body) return;
    const velocity = this.player.body.velocity;
    const insidePreviewBounds =
      this.player.x >= PREVIEW_WALK_BOUNDS.x &&
      this.player.x <= PREVIEW_WALK_BOUNDS.x + PREVIEW_WALK_BOUNDS.width &&
      this.player.y >= PREVIEW_WALK_BOUNDS.y &&
      this.player.y <= PREVIEW_WALK_BOUNDS.y + PREVIEW_WALK_BOUNDS.height;
    const snapshot: CourtyardV2PreviewSnapshot = {
      scene: 'dev-courtyard-v2-preview',
      scenario: 'courtyard-v2-hero-forge-surge-preview',
      collisionModel: 'figma-approved-preview-decomposed-rectangles',
      occlusionModel: 'figma-depth-layers',
      walkBounds: PREVIEW_WALK_BOUNDS,
      collision: {
        provenance: 'figma-approved-preview-trace',
        grid: PREVIEW_FORGE_COLLIDER_GRID,
        staticBodyCount: PREVIEW_FORGE_COLLIDERS.length,
        figmaNodes: [...new Set(PREVIEW_FORGE_COLLIDERS.map((box) => box.figmaNode))],
        debugOverlay: this.debugColliders,
      },
      aisle: {
        ...PREVIEW_FORGE_AISLE,
        testStatus: this.aisleTest.status,
        start: {
          x: 835,
          y:
            PREVIEW_FORGE_AISLE.counterFront +
            (PREVIEW_FORGE_AISLE.availableClearance + HERO_FEET.height) / 2,
        },
        target: {
          x: 1165,
          y:
            PREVIEW_FORGE_AISLE.counterFront +
            (PREVIEW_FORGE_AISLE.availableClearance + HERO_FEET.height) / 2,
        },
        finalX: this.aisleTest.finalX,
      },
      rearAisle: {
        ...PREVIEW_FORGE_COUNTER_AISLE,
        testStatus: this.rearAisleTest.status,
        start: {
          x: 835,
          y:
            PREVIEW_FORGE_COUNTER_AISLE.forgeFront +
            (PREVIEW_FORGE_COUNTER_AISLE.availableClearance + HERO_FEET.height) / 2,
        },
        target: {
          x: 1165,
          y:
            PREVIEW_FORGE_COUNTER_AISLE.forgeFront +
            (PREVIEW_FORGE_COUNTER_AISLE.availableClearance + HERO_FEET.height) / 2,
        },
        finalX: this.rearAisleTest.finalX,
      },
      occluders: PREVIEW_FORGE_OCCLUDERS.map((occluder) => ({
        id: occluder.id,
        groundY: occluder.groundY,
        heroRelation: this.player.y < occluder.groundY ? 'behind' : 'in-front',
      })),
      hero: {
        position: { x: this.player.x, y: this.player.y },
        velocity: { x: velocity.x, y: velocity.y },
        facing: this.facing,
        walking: this.walking,
        animationKey: this.player.anims.currentAnim?.key ?? null,
        frame: Number(this.player.frame.name),
        motionOff: this.motionOff,
        feetOrigin: { x: 0.5, y: 1 },
        feetBody: {
          x: this.player.body.x,
          y: this.player.body.y,
          width: this.player.body.width,
          height: this.player.body.height,
        },
        insidePreviewBounds,
      },
      footsteps: this.footsteps.getSnapshot(),
      forge: this.forgeVfx.getSnapshot(),
      crystals: this.crystalVfx.getSnapshot(),
    };
    this.game.events.emit(`${COURTYARD_V2_PREVIEW_EVENTS.snapshot}:result`, snapshot);
  }
}

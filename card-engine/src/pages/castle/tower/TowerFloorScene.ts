import Phaser from 'phaser';
import {
  WORLD_W, WORLD_H, towerZoom, HERO_WORLD_HEIGHT, PEDESTAL_WORLD_HEIGHT,
  BOSS_WORLD_HEIGHT, PEDESTAL_FOOT, PEDESTAL_TOP_Y, HERO_SPAWN,
  SKY_PARALLAX, CLOUD_PARALLAX, CLOUD_COUNT, CLOUD_DRIFT_MIN, CLOUD_DRIFT_MAX,
  RING_PLATE, PEDESTAL_SPRITE, OCCLUDER_MANIFEST, COLLIDER_MANIFEST, getFloor,
  INTERIOR, FLOOR_FILL,
} from '../../../data/castle/tower';
import { HERO_SHEET, walkKey, idleFrame, type HeroFacing } from '../../../data/castle/heroSprite';
import { keyboardVector, seekVector, normalize, ARRIVAL_RADIUS } from '../courtyard/controls';
import { TOWER_EVENTS } from './events';

interface OccluderMeta {
  id: string; x: number; y: number; width: number; height: number; groundY: number;
}

const HERO_SPEED = 420;

/**
 * One floor of the Battle Tower.
 *
 * LAYER ORDER, and every one of these is load-bearing:
 *   sky       parallaxed slowest, painted on nothing
 *   clouds    drift BEHIND the building — visible only through the arch gaps
 *   floor     the archetype disc, the entire walkable ground
 *   plate     the colonnade, its interior and arch gaps cut to transparent
 *   pedestal  a separate cut-out object, not part of the plate
 *   actors    hero and boss, depth-sorted against the occluders
 *   occluders the eight columns, each cut from the plate with its own ground line
 *
 * The clouds sitting UNDER the plate is the whole trick. Raheem: "the cloud
 * shouldn't go in front of the arena. It feels like a painting. It needs to feel
 * like a game." Putting them behind means the only reason you ever see weather
 * is the twelve gaps he hand-cut in Figma — the gaps are windows.
 */
export class TowerFloorScene extends Phaser.Scene {
  private floorNumber = 1;
  private hero!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private seekTarget: { x: number; y: number } | null = null;
  private facing: HeroFacing = 'up';
  private clouds: Phaser.GameObjects.Image[] = [];
  private cloudSpeeds: number[] = [];
  private occluders: Phaser.GameObjects.Image[] = [];
  private boss?: Phaser.GameObjects.Sprite;
  private motionOff = false;

  constructor() {
    super('tower-floor');
  }

  init(data: { floor?: number }) {
    this.floorNumber = data?.floor ?? 1;
  }

  preload() {
    const f = getFloor(this.floorNumber);
    this.load.image('tower-sky', f.sky);
    this.load.image('tower-ground', f.ground);
    this.load.image('tower-plate', RING_PLATE);
    this.load.image('tower-pedestal', PEDESTAL_SPRITE);
    this.load.json('tower-occluders', OCCLUDER_MANIFEST);
    this.load.json('tower-colliders', COLLIDER_MANIFEST);
    // The cut columns. Named by import_traces.py from Raheem's Figma layers, so
    // the set is predictable — loading them from the manifest would need a
    // second load pass after preload has already finished.
    for (let i = 1; i <= 8; i += 1) {
      this.load.image(`tower-occ-column-${i}`, `/assets/castle/tower/occluders/column-${i}.webp`);
    }
    for (let i = 1; i <= CLOUD_COUNT; i += 1) {
      this.load.image(`tower-cloud-${i}`, `/assets/castle/tower/cloud-${i}.webp`);
    }
    this.load.spritesheet('tower-boss', '/assets/combat/bosses/debt-bearer/sprite-idle.png', {
      frameWidth: 251, frameHeight: 189,
    });
    this.load.spritesheet(HERO_SHEET.key, HERO_SHEET.path, {
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
  }

  create() {
    this.buildSky();
    this.buildClouds();
    this.buildGround();
    this.buildPlate();
    this.buildPedestal();
    this.buildBoss();
    this.buildHero();
    this.buildOccluders();
    this.buildColliders();
    this.buildCamera();

    // Dev handle set from INSIDE the live scene. Setting it in createGame
    // pointed at whichever game was constructed last, which under StrictMode's
    // double-mount is the one that got destroyed — it reported zero scenes
    // while the real room was visibly running.
    if (import.meta.env.DEV) {
      (window as unknown as { __tower?: TowerFloorScene }).__tower = this;
    }

    this.game.events.on(TOWER_EVENTS.motionOff, this.setMotionOff, this);
    this.game.events.on(TOWER_EVENTS.walkTo, this.onWalkTo, this);
    this.events.once('shutdown', () => {
      this.game.events.off(TOWER_EVENTS.motionOff, this.setMotionOff, this);
      this.game.events.off(TOWER_EVENTS.walkTo, this.onWalkTo, this);
    });
  }

  // ── layers ──────────────────────────────────────────────────────────────

  private buildSky() {
    // Sized to cover the world PLUS the distance it lags behind the camera.
    // A sky exactly world-sized runs out at the edges and shows background.
    const over = 1 + SKY_PARALLAX;
    this.add.image(WORLD_W / 2, WORLD_H / 2, 'tower-sky')
      .setDisplaySize(WORLD_W * over, WORLD_H * over)
      .setScrollFactor(SKY_PARALLAX)
      .setDepth(-2000);
  }

  private buildClouds() {
    // Drift is per-cloud so nothing moves in lockstep — the same reason the
    // courtyard randomises each keeper's breath phase.
    for (let i = 0; i < CLOUD_COUNT; i += 1) {
      const key = `tower-cloud-${(i % CLOUD_COUNT) + 1}`;
      const img = this.add.image(
        Phaser.Math.Between(0, WORLD_W),
        Phaser.Math.Between(200, WORLD_H - 400),
        key,
      )
        .setScrollFactor(CLOUD_PARALLAX)
        .setDepth(-1900)
        // Clouds ship as raw crops on BLACK and are screen-blended rather than
        // cut. Luminance keying hollowed every puff out, because a cloud's dark
        // lilac underside is indistinguishable from a black field. Screen needs
        // no alpha at all — black is its identity value — and keeps every wisp.
        .setBlendMode(Phaser.BlendModes.SCREEN);
      const h = Phaser.Math.Between(320, 620);
      img.setDisplaySize(h * (img.width / img.height), h);
      this.clouds.push(img);
      this.cloudSpeeds.push(Phaser.Math.Between(CLOUD_DRIFT_MIN, CLOUD_DRIFT_MAX));
    }
  }

  private buildGround() {
    // Sized and centred on the MEASURED interior, not on the plate's midpoint.
    // The disc is the entire walkable floor, so any gap between it and the
    // colonnade's inner lip reads immediately as the floor not fitting the room.
    this.add.image(INTERIOR.cx, INTERIOR.cy, 'tower-ground')
      .setDisplaySize(FLOOR_FILL.width, FLOOR_FILL.height)
      .setDepth(-1000);
  }

  private buildPlate() {
    // Sits ABOVE the ground and the clouds. Its cut interior lets the archetype
    // floor through; its cut arch gaps let the weather through.
    this.add.image(WORLD_W / 2, WORLD_H / 2, 'tower-plate')
      .setDisplaySize(WORLD_W, WORLD_H)
      .setDepth(-500);
  }

  private buildPedestal() {
    const ped = this.add.image(PEDESTAL_FOOT.x, PEDESTAL_FOOT.y, 'tower-pedestal')
      .setOrigin(0.5, 1);
    ped.setDisplaySize(
      PEDESTAL_WORLD_HEIGHT * (ped.width / ped.height),
      PEDESTAL_WORLD_HEIGHT,
    );
    // Depth from its FOOT, not its centre — the sort key is always ground contact.
    ped.setDepth(PEDESTAL_FOOT.y);

    this.addGroundFeather(PEDESTAL_FOOT.x, PEDESTAL_FOOT.y - 6,
      PEDESTAL_WORLD_HEIGHT * 1.15, PEDESTAL_WORLD_HEIGHT * 0.42,
      PEDESTAL_FOOT.y - 1);
  }

  private buildBoss() {
    const boss = this.add.sprite(PEDESTAL_FOOT.x, PEDESTAL_TOP_Y, 'tower-boss', 0)
      .setOrigin(0.5, 1);
    boss.setDisplaySize(BOSS_WORLD_HEIGHT * (boss.width / boss.height), BOSS_WORLD_HEIGHT);
    boss.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // The boss sorts on the PEDESTAL's ground line, not his own feet. His feet
    // are on the plinth top, far up the screen — sorting there would let a hero
    // standing well in front of the plinth draw over him.
    boss.setDepth(PEDESTAL_FOOT.y + 1);

    if (!this.anims.exists('tower-boss-idle')) {
      this.anims.create({
        key: 'tower-boss-idle',
        // 5 frames at 3fps. Slow on purpose: something this heavy breathes
        // slower than a person, and a faster loop read as panting.
        frames: this.anims.generateFrameNumbers('tower-boss', { start: 0, end: 4 }),
        frameRate: 3,
        repeat: -1,
      });
    }
    boss.play('tower-boss-idle');
    this.boss = boss;
  }

  /**
   * A soft, feathered darkening where an object meets the floor.
   *
   * A hard-edged ellipse reads as a decal sitting ON the paving. Raheem: the
   * pedestal "should look like it's stuck… blended into the ground around the
   * edges." A radial gradient with no hard edge anywhere is what does that —
   * the eye reads gradual occlusion as contact.
   *
   * Generated once as a texture rather than drawn per frame, and multiplied so
   * it darkens whatever archetype floor happens to be underneath instead of
   * painting a fixed colour over it.
   */
  private addGroundFeather(x: number, y: number, w: number, h: number, depth: number) {
    const KEY = 'tower-feather';
    if (!this.textures.exists(KEY)) {
      const R = 256;
      const c = this.textures.createCanvas(KEY, R * 2, R * 2)!;
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0.00, 'rgba(22,24,40,0.55)');
      g.addColorStop(0.45, 'rgba(22,24,40,0.34)');
      g.addColorStop(0.75, 'rgba(22,24,40,0.12)');
      g.addColorStop(1.00, 'rgba(22,24,40,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, R * 2, R * 2);
      c.refresh();
    }
    this.add.image(x, y, KEY)
      .setDisplaySize(w, h)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(depth);
  }

  private buildHero() {
    this.hero = this.physics.add.sprite(HERO_SPAWN.x, HERO_SPAWN.y, HERO_SHEET.key, idleFrame('up'));
    this.hero.setOrigin(0.5, 1);
    this.hero.setDisplaySize(
      HERO_WORLD_HEIGHT * (HERO_SHEET.frameWidth / HERO_SHEET.frameHeight),
      HERO_WORLD_HEIGHT,
    );
    this.hero.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    // Feet-only body. A full-height box would stop the hero a whole sprite
    // short of anything he walks up to.
    const bw = HERO_WORLD_HEIGHT * 0.26;
    const bh = HERO_WORLD_HEIGHT * 0.13;
    this.hero.body!.setSize(
      bw / this.hero.scaleX, bh / this.hero.scaleY,
    );
    this.hero.body!.setOffset(
      (HERO_SHEET.frameWidth - bw / this.hero.scaleX) / 2,
      HERO_SHEET.frameHeight - bh / this.hero.scaleY,
    );

    (['down', 'up', 'left', 'right'] as HeroFacing[]).forEach((f) => {
      if (this.anims.exists(walkKey(f))) return;
      this.anims.create({
        key: walkKey(f),
        frames: this.anims.generateFrameNumbers(HERO_SHEET.key, {
          start: idleFrame(f) + 1,
          end: idleFrame(f) + HERO_SHEET.columns - 1,
        }),
        frameRate: 9,
        repeat: -1,
      });
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.seekTarget = { x: p.worldX, y: p.worldY };
    });
  }

  private buildOccluders() {
    const data = this.cache.json.get('tower-occluders') as { occluders: OccluderMeta[] };
    for (const o of data.occluders) {
      const key = `tower-occ-${o.id}`;
      if (!this.textures.exists(key)) continue;
      const img = this.add.image(o.x, o.y, key).setOrigin(0, 0);
      // groundY, not y. A column's sort depth is where it MEETS THE FLOOR —
      // that single number decides whether the hero passes behind it or in
      // front, and it is the only reason the room reads as 3D at all.
      img.setDepth(o.groundY);
      this.occluders.push(img);
    }
  }

  private buildColliders() {
    const data = this.cache.json.get('tower-colliders') as {
      colliders: { id: string; boxes: { x: number; y: number; width: number; height: number }[] }[];
    };
    const solids = this.physics.add.staticGroup();
    for (const c of data.colliders) {
      for (const b of c.boxes) {
        // Invisible rectangles rather than StaticGroup.create(), which wants a
        // texture. 221 of them: the decomposed outline of Raheem's traced floor.
        const r = this.add.rectangle(
          b.x + b.width / 2, b.y + b.height / 2, b.width, b.height,
        ).setVisible(false);
        this.physics.add.existing(r, true);
        solids.add(r);
      }
    }
    this.physics.add.collider(this.hero, solids);

    if (new URLSearchParams(location.search).has('colliders')) {
      const g = this.add.graphics().setDepth(9999);
      g.lineStyle(4, 0x3b76d6, 0.9);
      for (const c of data.colliders) {
        for (const b of c.boxes) g.strokeRect(b.x, b.y, b.width, b.height);
      }
    }
  }

  private buildCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setZoom(towerZoom({ width: this.scale.width, height: this.scale.height }));
    // Follow with a DEADZONE: the camera holds still while you move around the
    // middle and pans only as you approach an edge. That is what makes "walk to
    // the rail and the sky comes into view" feel deliberate rather than seasick.
    cam.startFollow(this.hero, true, 0.09, 0.09);
    cam.setDeadzone(this.scale.width * 0.34, this.scale.height * 0.30);
    this.scale.on('resize', () => {
      cam.setZoom(towerZoom({ width: this.scale.width, height: this.scale.height }));
      cam.setDeadzone(this.scale.width * 0.34, this.scale.height * 0.30);
    });
  }

  // ── behaviour ───────────────────────────────────────────────────────────

  private onWalkTo = (p: { x: number; y: number }) => { this.seekTarget = p; };

  private setMotionOff = (off: boolean) => {
    this.motionOff = off;
    const cam = this.cameras.main;
    if (off) {
      // Snap instead of lerp. Easing IS the thing reduced motion is asking us
      // to stop doing, and a followed camera is the biggest source of it.
      cam.startFollow(this.hero, true, 1, 1);
      this.hero.anims.stop();
      this.hero.setFrame(idleFrame(this.facing));
      // Hold frame 0 at full scale. A sprite frozen mid-tween is a stretched
      // sprite, not a still one — the courtyard learned this on its keepers.
      this.boss?.anims.stop();
      this.boss?.setFrame(0);
    } else {
      cam.startFollow(this.hero, true, 0.09, 0.09);
      this.boss?.play('tower-boss-idle');
    }
  };

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    if (!this.motionOff) {
      for (let i = 0; i < this.clouds.length; i += 1) {
        const c = this.clouds[i];
        c.x += this.cloudSpeeds[i] * dt;
        // Wrap generously past the edge so a cloud never pops into existence
        // inside an arch gap where the player is looking.
        if (c.x - c.displayWidth > WORLD_W + 400) c.x = -c.displayWidth - 400;
      }
    }

    // Positional args, matching courtyard/controls.ts: (left, right, up, down).
    let v = keyboardVector(
      this.cursors.left.isDown || this.wasd.A.isDown,
      this.cursors.right.isDown || this.wasd.D.isDown,
      this.cursors.up.isDown || this.wasd.W.isDown,
      this.cursors.down.isDown || this.wasd.S.isDown,
    );

    if (v.x === 0 && v.y === 0 && this.seekTarget) {
      v = seekVector(this.hero, this.seekTarget);
      if (Math.hypot(this.seekTarget.x - this.hero.x, this.seekTarget.y - this.hero.y) < ARRIVAL_RADIUS) {
        this.seekTarget = null;
        v = { x: 0, y: 0 };
      }
    } else if (v.x !== 0 || v.y !== 0) {
      this.seekTarget = null;
    }

    const n = normalize(v);
    this.hero.setVelocity(n.x * HERO_SPEED, n.y * HERO_SPEED);

    if (n.x !== 0 || n.y !== 0) {
      this.facing = Math.abs(n.x) > Math.abs(n.y)
        ? (n.x > 0 ? 'right' : 'left')
        : (n.y > 0 ? 'down' : 'up');
      if (!this.motionOff) this.hero.anims.play(walkKey(this.facing), true);
      this.game.events.emit(TOWER_EVENTS.heroMoved, { x: this.hero.x, y: this.hero.y });
    } else {
      this.hero.anims.stop();
      this.hero.setFrame(idleFrame(this.facing));
    }

    // Depth sorting, every frame. The hero's ground line is his feet, which is
    // his y because origin is (0.5, 1).
    this.hero.setDepth(this.hero.y);
  }
}

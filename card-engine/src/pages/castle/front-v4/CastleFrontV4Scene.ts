import Phaser from 'phaser';
import { HERO_SHEET, idleFrame, walkFrames } from '../../../data/castle/heroSprite';
import {
  CARD_BLAST_MUZZLES,
  CARD_BLAST_SHEETS,
  cardBlastFrame,
  type CardBlastPhase,
} from '../../../data/castle/cardBlastSprite';
import {
  KNOCKDOWN_ANCHOR,
  KNOCKDOWN_ANIM,
  KNOCKDOWN_DURATIONS_MS,
  KNOCKDOWN_SHEET,
} from '../../../data/castle/knockdownSprite';
import { JELLY_SHEET } from '../../../data/castle/jellySprite';
import {
  ACTION_TIMING,
  canWalk,
  initialAction,
  stepAction,
  walkScale,
  type ActionState,
} from '../combat/actionState';
import { resolveAction } from '../combat/cardActions';
import {
  canFire,
  commitSelected,
  cycleSelection,
  handFromCards,
  recoverCard,
  releaseCommitted,
  scatterHand,
  selectSlot,
  type DroppedCard,
  type Hand,
} from '../combat/hand';
import {
  DEFAULT_BLAST,
  resetProjectileIds,
  scaleBlast,
  spawnProjectile,
  stepProjectile,
  type Projectile,
} from '../combat/blast';
import { effectKitFor, type EffectKit } from '../combat/effectKit';
import {
  colourOf,
  createBlastSprite,
  playDirectionalBurst,
  playImpact,
} from '../combat/blastVfx';
import { getHitFeel, severityForCharge, type HitSeverity } from '../combat/feel';
import { createHitstop, type Hitstop } from '../combat/hitstop';
import {
  CONSTRUCT_TUNING,
  defeatConstruct,
  reviveConstruct,
  setAiEnabled,
  setStrongHits,
  type ConstructHit,
  type ConstructPhase,
} from '../combat/construct';
import {
  JELLY_TARGET_RADIUS,
  type JellyWorld,
  forceJellyPhase,
  initialJelly,
  jellyCentre,
  jellyIsTargetable,
  resetJelly,
  stepJelly,
  type JellyState,
} from './jellyController';
import { blockGroundedApproach } from './jellyLeap';
import {
  applyKnockback,
  initialPlayer,
  playerBody,
  stepPlayer,
  type PlayerState,
} from './playerController';
import {
  DEFAULT_SCATTER_CONSTRAINTS,
  sideViewScatter,
  type ScatterZone,
} from './sideViewScatter';
import {
  ARENA,
  CASTLE_NO_DROP,
  DEPTH,
  FRONT_V4_VIEW,
  GROUND_Y,
  HERO_ANCHOR_Y,
  HERO_BODY,
  HERO_SPAWN_X,
  JELLY_BODY,
  JELLY_SPAWN_X,
  PICKUP_RADIUS_PX,
  SPRITE_SCALE,
  applyFitCamera,
} from './layout';
import { BACKDROP_SLOTS, paintProvisionalBackdrop } from './backdrop';
import { createJellyView, type JellyView } from './jellyPresenter';
import { loadEditorWorld, type WorldLoadResult } from './worldLoader';
import {
  FRONT_V4_EVENTS,
  type FixtureCard,
  type FrontV4ScenePort,
  type FrontV4Snapshot,
} from './types';

/**
 * The Phaser Editor scene Raheem places the world in.
 *
 * Its absence is the normal state until he has put something in it, and the game
 * plays fine without it — see worldLoader.
 */
const WORLD_SCENE = 'CastleFrontWorld';

/**
 * The side-view proof, as a Phaser scene.
 *
 * THIS FILE IS A SEAM, NOT A BRAIN. Every rule that could be wrong lives in a pure
 * module beside it â€” `playerController` for movement, `jellyLeap` for the arc and
 * its fairness, `jellyController` for the creature's superstate, `sideViewScatter`
 * for where a lost hand lands â€” and all four are unit-tested with no engine
 * running. What remains here is sampling input, calling those rules in the right
 * order, and drawing the answer. The courtyard's runtime grew to 3470 lines by
 * letting that boundary blur, and this scene exists partly to demonstrate the
 * alternative.
 *
 * NO PHYSICS ENGINE, deliberately, and it is worth being explicit because a
 * side-scroller is exactly where a reader expects Arcade gravity. Nothing here
 * needs it: he cannot jump, the leap is a closed-form parabola, and blasts fly
 * horizontally. Adding a physics body would create a second, authoritative copy of
 * every position â€” one in the simulation and one in the engine â€” and the two would
 * disagree the first time a knockback and a collision landed on the same frame.
 * The whole repository already works this way; this is not a new convention.
 *
 * Everything drawn here is PROVISIONAL. The castle is a code-drawn silhouette
 * because no side-view faÃ§ade art exists and none was authorised; the knockdown
 * clip faces the camera because only that direction was ever generated. Composition,
 * scale and feel are HUMAN REVIEW and this file does not get a vote.
 */

/**
 * Four cards so the hand is full and the scatter has something to lose.
 *
 * Fixtures, not persistence: the DEV route must run without a collection, and
 * wiring real cards in would drag storage, auth and the sync queue into a scene
 * whose entire job is proving a camera angle. Elements chosen for contrast â€”
 * Shadow's impact is a still frame, which exercises the one-frame path.
 */
const FIXTURE_CARDS: FixtureCard[] = [
  { cardId: 'front-v4-fire', name: 'Ember Sigil', element: 'Fire' },
  { cardId: 'front-v4-ice', name: 'Rime Sigil', element: 'Ice' },
  { cardId: 'front-v4-storm', name: 'Gale Sigil', element: 'Storm' },
  { cardId: 'front-v4-shadow', name: 'Umbral Sigil', element: 'Shadow' },
];

interface LiveProjectile {
  sim: Projectile;
  sprite: Phaser.GameObjects.Sprite | null;
  fallback: Phaser.GameObjects.Arc | null;
  kit: EffectKit;
  charge: number;
}

interface LiveCard {
  card: DroppedCard;
  x: number;
  view: Phaser.GameObjects.Container;
}

export class CastleFrontV4Scene extends Phaser.Scene {
  // ---- simulation -------------------------------------------------------
  private player: PlayerState = initialPlayer(HERO_SPAWN_X);
  private action: ActionState = initialAction();
  private hand: Hand = handFromCards(FIXTURE_CARDS.map((c) => c.cardId));
  private jelly: JellyState = initialJelly(JELLY_SPAWN_X);
  private projectiles: LiveProjectile[] = [];
  private cards: LiveCard[] = [];
  private pendingHits: ConstructHit[] = [];
  private committedSlot: number | null = null;
  private knockdowns = 0;
  private lastStrike: 'none' | 'hit' | 'missed' = 'none';
  private scatterReport: { degraded: boolean; reason: string | null } = { degraded: false, reason: null };
  private world: WorldLoadResult | null = null;
  /**
   * The surface everything stands on, live.
   *
   * Seeded from `layout.GROUND_Y` and replaced by the top edge of the authored
   * `GROUND` object once the Editor scene loads — so moving that rectangle in
   * Phaser Editor actually moves the floor, rather than leaving the hero walking
   * along an invisible line where the floor used to be.
   */
  private groundY = GROUND_Y;
  private errors: string[] = [];

  // ---- presentation -----------------------------------------------------
  private hero!: Phaser.GameObjects.Sprite;
  private heroShadow!: Phaser.GameObjects.Ellipse;
  private jellyView!: JellyView;
  private hitstop!: Hitstop;
  private motion: 'full' | 'off' = 'full';
  private heroAnim = '';

  // ---- input ------------------------------------------------------------
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private wheelStep = 0;
  private scriptedFireUntilMs = 0;
  private scriptedMoveX: -1 | 0 | 1 = 0;
  private scriptedMoveUntilMs = 0;
  /**
   * True only when the key-up genuinely cannot arrive.
   *
   * NOT `game.hasFocus`. That flag reads false in an embedded canvas that has
   * never been clicked â€” including the review pane this scene is judged in â€” and
   * because a cancel outranks everything in `stepAction`, every charge died the
   * frame after it began: the phase flickered charging â†’ explore forever and the
   * card could not be fired at all. It would misfire in the real game too, any
   * time the player clicked outside the canvas mid-charge.
   *
   * Real blur and real tab-hiding are the only two events where the release will
   * never come, so those are the two things listened for, and the default is
   * "carry on".
   */
  private inputLost = false;
  private focusListeners: Array<[keyof WindowEventMap | 'visibilitychange', EventListener]> = [];
  private resizeHandler?: (size: Phaser.Structs.Size) => void;

  constructor() {
    super('CastleFrontV4');
  }

  // =========================================================================
  // Boot
  // =========================================================================

  preload() {
    this.load.spritesheet(HERO_SHEET.key, HERO_SHEET.path, {
      frameWidth: HERO_SHEET.frameWidth,
      frameHeight: HERO_SHEET.frameHeight,
    });
    this.load.spritesheet(KNOCKDOWN_SHEET.key, KNOCKDOWN_SHEET.path, {
      frameWidth: KNOCKDOWN_SHEET.frameWidth,
      frameHeight: KNOCKDOWN_SHEET.frameHeight,
    });
    this.load.spritesheet(JELLY_SHEET.key, JELLY_SHEET.path, {
      frameWidth: JELLY_SHEET.frameWidth,
      frameHeight: JELLY_SHEET.frameHeight,
    });
    // Only the two horizontal facings. The up and down sheets exist and are wired
    // in cardBlastSprite.ts, but a side view can never show them, and loading art
    // that cannot appear is how a scene quietly gains a megabyte.
    for (const facing of ['left', 'right'] as const) {
      const sheet = CARD_BLAST_SHEETS[facing];
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    // Only the fixtures' elements, for the same reason â€” the full library is 52
    // strips and this route uses four.
    for (const card of FIXTURE_CARDS) {
      const kit = effectKitFor(card.element);
      for (const clip of [kit.stream, kit.impact]) {
        if (clip && !this.textures.exists(clip.key)) {
          this.load.spritesheet(clip.key, `/assets/combat/effects/packed/${clip.key}.png`, {
            frameWidth: 128,
            frameHeight: 32,
          });
        }
      }
    }
    // Raheem's own background plates, if he has delivered them yet. Attempted
    // every boot and silently absent until then — see BACKDROP_SLOTS.
    for (const slot of Object.values(BACKDROP_SLOTS)) {
      this.load.image(slot.key, slot.path);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // A missing backdrop plate is the EXPECTED state, not an error: the code
      // backdrop stands in. Only report things that were supposed to be there.
      const optional = Object.values(BACKDROP_SLOTS).some((s) => s.key === file.key);
      if (!optional) this.errors.push(`failed to load ${file.key}`);
    });
  }

  create() {
    this.motion = prefersReducedMotion() ? 'off' : 'full';
    this.hitstop = createHitstop(this);

    const provisional = paintProvisionalBackdrop(this);
    this.registerAnimations();
    this.buildActors();
    this.bindInput();

    // The authored world arrives asynchronously and slots in UNDER the actors,
    // which are already standing. Deliberately not awaited: the game is playable
    // the moment `create()` returns, and a world that is slow, missing or broken
    // delays nothing. Placement is Raheem's, in Phaser Editor; see worldLoader.
    void loadEditorWorld(this, WORLD_SCENE).then((result) => {
      this.world = result;
      // The authored scene owns the ground and the castle once it has them, so
      // the stand-ins go rather than sitting underneath being invisible.
      if (result.suppliesGround) provisional.yieldGroundToAuthoredWorld();
      if (result.ground) {
        this.adoptAuthoredGround(result.ground);
        provisional.followGroundLine(this.groundY);
      }
      if (result.status === 'failed') {
        this.errors.push(`world ${result.sceneName}: ${result.message}`);
        console.error('[front-v4] authored world failed to load', result);
      }
    });

    applyFitCamera(this.cameras.main, this.scale.gameSize);
    this.resizeHandler = (size) => applyFitCamera(this.cameras.main, size);
    this.scale.on('resize', this.resizeHandler);

    this.game.events.on(FRONT_V4_EVENTS.snapshot, this.emitSnapshot, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.teardown, this);

    this.reset();
    this.game.events.emit(FRONT_V4_EVENTS.ready, this.port());
  }

  /**
   * Stand everything on the floor Raheem drew.
   *
   * The world arrives a frame or two after `create`, so the actors are already
   * spawned on the default line when it lands. Rather than nudging each of them,
   * this re-seats the whole scene through the ordinary reset — which is the one
   * path already known to put every actor, card and projectile in a coherent
   * starting state, and therefore the one least likely to leave something behind
   * at the old height.
   *
   * It also checks the floor actually spans the walkable arena. A ground narrower
   * than `ARENA` means the player can walk off the end of it, which reads as a
   * bug in the game and is really a gap in the level — so it says so plainly
   * rather than letting him wonder.
   */
  /** The strip of world the creature lives in, at the CURRENT ground line. */
  private jellyWorld(): JellyWorld {
    return { minX: ARENA.minX, maxX: ARENA.maxX, groundY: this.groundY };
  }

  private adoptAuthoredGround(ground: { y: number; minX: number; maxX: number }) {
    if (ground.minX > ARENA.minX + 1 || ground.maxX < ARENA.maxX - 1) {
      const message =
        `authored GROUND spans ${Math.round(ground.minX)}..${Math.round(ground.maxX)} ` +
        `but the player may walk ${ARENA.minX}..${ARENA.maxX} — widen it, or he will walk off the edge`;
      this.errors.push(message);
      console.warn(`[front-v4] ${message}`);
    }
    if (Math.abs(ground.y - this.groundY) < 0.5) return;
    this.groundY = ground.y;
    this.reset();
  }

  private teardown() {
    // The scale listener and the game-level snapshot request both outlive the
    // scene otherwise: `game.events` is not torn down with it, so a route
    // re-entry would leave two scenes answering the same request.
    if (this.resizeHandler) this.scale.off('resize', this.resizeHandler);
    this.game.events.off(FRONT_V4_EVENTS.snapshot, this.emitSnapshot, this);
    for (const [event, handler] of this.focusListeners) {
      if (event === 'visibilitychange') document.removeEventListener(event, handler);
      else window.removeEventListener(event, handler);
    }
    this.focusListeners = [];
    this.hitstop?.destroy();
  }


  /**
   * The hero's clips. The jelly's belong to its presenter, which owns its whole
   * appearance — this scene never learns which frames a slime is made of.
   */
  private registerAnimations() {
    for (const facing of ['left', 'right'] as const) {
      const key = `front-v4-walk-${facing}`;
      // Phaser's animation manager is global and throws on a duplicate key, so
      // this stays idempotent across scene restarts.
      if (this.anims.exists(key)) continue;
      this.anims.create({
        key,
        frames: walkFrames(facing).map((frame) => ({ key: HERO_SHEET.key, frame })),
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists(KNOCKDOWN_ANIM)) {
      // Per-frame durations rather than a frame rate: the table sums to exactly
      // ACTION_TIMING.knockdownFallMs, so the clip and the state machine finish
      // together and the grounded pose is never cut off.
      this.anims.create({
        key: KNOCKDOWN_ANIM,
        frames: KNOCKDOWN_DURATIONS_MS.map((duration, frame) => ({
          key: KNOCKDOWN_SHEET.key,
          frame,
          duration,
        })),
        repeat: 0,
      });
    }
  }

  private buildActors() {
    this.heroShadow = this.add
      .ellipse(HERO_SPAWN_X, this.groundY, 46, 12, 0x000000, 0.32)
      .setDepth(DEPTH.shadow);
    this.hero = this.add
      .sprite(HERO_SPAWN_X, this.groundY, HERO_SHEET.key, idleFrame('right'))
      .setOrigin(0.5, HERO_ANCHOR_Y)
      .setScale(SPRITE_SCALE)
      .setDepth(DEPTH.hero);

    this.jellyView = createJellyView(this, JELLY_SPAWN_X);

    for (const key of [HERO_SHEET.key, KNOCKDOWN_SHEET.key]) {
      // Per texture, not a global `pixelArt: true`: the sky is a smooth gradient
      // and nearest-filtering the whole game would band the dusk.
      this.textures.get(key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for (const facing of ['left', 'right'] as const) {
      this.textures.get(CARD_BLAST_SHEETS[facing].key)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    this.keys = {
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      left2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      right2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      fire: kb.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      one: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      two: kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      three: kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      four: kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      reset: kb.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      ai: kb.addKey(Phaser.Input.Keyboard.KeyCodes.T),
      strong: kb.addKey(Phaser.Input.Keyboard.KeyCodes.Y),
      knock: kb.addKey(Phaser.Input.Keyboard.KeyCodes.K),
    };
    // W, SPACE and UP are deliberately unbound. See playerController: the absence
    // is the feature.

    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (dy !== 0) this.wheelStep = dy > 0 ? 1 : -1;
    });

    const lost = () => {
      this.inputLost = true;
    };
    const regained = () => {
      this.inputLost = false;
    };
    const onVisibility = () => {
      this.inputLost = document.hidden;
    };
    window.addEventListener('blur', lost);
    window.addEventListener('focus', regained);
    document.addEventListener('visibilitychange', onVisibility);
    this.focusListeners = [
      ['blur', lost],
      ['focus', regained],
      ['visibilitychange', onVisibility],
    ];
  }

  // =========================================================================
  // The frame
  // =========================================================================

  update(_time: number, realDeltaMs: number) {
    // One answer per frame about whether the picture is moving. Simulation still
    // advances during a freeze; only presentation holds.
    const dt = Math.min(50, this.hitstop.step(realDeltaMs));
    if (dt <= 0) return;

    const intent = this.readIntent();
    this.readTestKeys();
    this.applySelection();

    // 1. The creature, against LAST frame's hero position and this frame's damage.
    const jellyOut = stepJelly(
      this.jelly,
      {
        heroX: this.player.x,
        heroDownedOrGraced: this.heroIsDownOrGraced(),
        hits: this.pendingHits,
      },
      dt,
      this.jellyWorld(),
    );
    this.jelly = jellyOut.state;
    this.pendingHits = [];
    if (jellyOut.events.includes('leapStart')) this.lastStrike = 'missed';

    const heroHit = jellyOut.heroHit;
    if (heroHit) this.lastStrike = 'hit';

    // 2. What he is doing.
    const firePressed = this.keys.fire.isDown || this.time.now < this.scriptedFireUntilMs;
    const before = this.action.phase;
    this.action = stepAction(
      this.action,
      {
        firePressed,
        summonPressed: false,
        hasReadyCard: canFire(this.hand),
        heavyHit: heroHit?.kind === 'strong',
        // Committed horizontal aim. There is no mouse, and no pointer position is
        // ever sampled: Â§11's "no mouse aiming" is enforced by never asking.
        aim: { x: this.player.facing, y: 0 },
        cancelRequested: this.inputLost,
        getUpRequested: intent.left || intent.right,
      },
      dt,
    );
    this.reconcileHand(before);

    // 3. The shot, born from the card rather than from his chest.
    if (this.action.fireThisStep && this.action.committedAim) {
      this.launch();
    }

    // 4. Everything in flight.
    this.stepProjectiles(dt);

    // 5. Him.
    const previousX = this.player.x;
    this.player = stepPlayer(this.player, { intent, walkScale: walkScale(this.action.phase) }, dt);
    if (this.jelly.mode === 'ground') {
      // He may not walk through it. The evasion proof assumes exactly this rule â€”
      // cornered, he stops one body short and the leap clears him; allowed
      // through, he arrives flush and is caught by the takeoff.
      this.player = {
        ...this.player,
        x: blockGroundedApproach(this.player.x, previousX, this.jelly.construct.pos.x),
      };
    }
    if (heroHit) {
      this.player = applyKnockback(this.player, heroHit.dirX, heroHit.kind === 'strong' ? 96 : 44);
    }

    // 6. The cost of going down, and the walk back.
    if (before !== 'knockdown' && this.action.phase === 'knockdown') this.scatter();
    this.collectCards();

    this.present(dt);
  }

  private readIntent() {
    // A scripted hold is OR-ed with the real keys rather than replacing them, so a
    // human can always take over mid-scenario without the scene fighting back.
    const scripted = this.time.now < this.scriptedMoveUntilMs ? this.scriptedMoveX : 0;
    return {
      left: this.keys.left.isDown || this.keys.left2.isDown || scripted < 0,
      right: this.keys.right.isDown || this.keys.right2.isDown || scripted > 0,
    };
  }

  private applySelection() {
    if (this.wheelStep !== 0) {
      this.hand = cycleSelection(this.hand, this.wheelStep > 0 ? 1 : -1);
      this.wheelStep = 0;
    }
    const digits = [this.keys.one, this.keys.two, this.keys.three, this.keys.four];
    digits.forEach((key, index) => {
      if (Phaser.Input.Keyboard.JustDown(key)) this.hand = selectSlot(this.hand, index);
    });
  }

  private readTestKeys() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) this.resetJellyOnly();
    if (Phaser.Input.Keyboard.JustDown(this.keys.ai)) {
      this.jelly = { ...this.jelly, construct: setAiEnabled(this.jelly.construct, !this.jelly.construct.aiEnabled) };
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.strong)) {
      this.jelly = { ...this.jelly, construct: setStrongHits(this.jelly.construct, !this.jelly.construct.strongHits) };
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.knock)) this.forceKnockdown();
  }

  /**
   * Keep the hand and the action state telling one story.
   *
   * The card is committed when the windup begins and released when the action
   * ends, INCLUDING when it ends by being cancelled or interrupted. Missing the
   * cancel path is how a card leaves the hand permanently: it is neither in a
   * slot, nor on the floor, nor in flight, and the Â§7.4 invariant that a card has
   * exactly one location is silently broken with nothing to show for it.
   */
  private reconcileHand(before: string) {
    if (before === 'charging' && this.action.phase === 'windup') {
      this.committedSlot = this.hand.selected;
      this.hand = commitSelected(this.hand);
      return;
    }
    const settled = this.action.phase === 'explore' || this.action.phase === 'knockdown';
    if (settled && this.committedSlot !== null) {
      this.hand = releaseCommitted(this.hand, this.committedSlot);
      this.committedSlot = null;
    }
  }

  private launch() {
    const slot = this.committedSlot ?? this.hand.selected;
    const cardId = slot === null ? null : this.hand.slots[slot]?.cardId ?? null;
    const fixture = FIXTURE_CARDS.find((c) => c.cardId === cardId) ?? FIXTURE_CARDS[0];
    const spec = resolveAction(cardId, this.action.releaseKind);
    if (spec.kind !== 'blast') return;

    const facing = this.player.facing;
    const muzzle = CARD_BLAST_MUZZLES[facing < 0 ? 'left' : 'right'];
    // The measured offsets are in the courtyard's 1x world, so they scale with the
    // sprite. `heightPx` becomes a literal Y here â€” in a side view the card's
    // height above the ground IS its screen position, not a separate draw channel.
    const origin = {
      x: this.player.x + muzzle.groundOffsetX * SPRITE_SCALE,
      y: this.groundY - muzzle.heightPx * SPRITE_SCALE,
    };
    const charge = this.action.chargeLevel;
    const kit = effectKitFor(fixture.element);
    const sim = spawnProjectile(origin, { x: facing, y: 0 }, scaleBlast(DEFAULT_BLAST, charge));
    const sprite = createBlastSprite(this, kit, origin.x, origin.y, { x: facing, y: 0 }, charge);
    sprite?.setDepth(DEPTH.projectile);
    const fallback = sprite
      ? null
      : this.add
          .circle(origin.x, origin.y, 6 + 6 * charge, colourOf(kit.palette[0]))
          .setDepth(DEPTH.projectile);

    this.projectiles.push({ sim, sprite, fallback, kit, charge });
  }

  private stepProjectiles(dt: number) {
    const centre = jellyCentre(this.jelly, this.groundY);
    const targets = [
      { pos: centre, radiusPx: JELLY_TARGET_RADIUS, alive: jellyIsTargetable(this.jelly) },
    ];

    for (const p of this.projectiles) {
      // No blockers: the arena is bounded by range and by its own edges, and the
      // courtyard's walk polygons describe a top-down world that does not exist here.
      p.sim = stepProjectile(p.sim, dt, [], targets);
      p.sprite?.setPosition(p.sim.pos.x, p.sim.pos.y);
      p.fallback?.setPosition(p.sim.pos.x, p.sim.pos.y);

      if (p.sim.outcome === 'hitTarget') {
        this.resolveHit(p);
      }
      if (p.sim.pos.x < -80 || p.sim.pos.x > FRONT_V4_VIEW.width + 80) {
        p.sim = { ...p.sim, outcome: 'expired' };
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      if (p.sim.outcome === 'flying') return true;
      p.sprite?.destroy();
      p.fallback?.destroy();
      return false;
    });
  }

  private resolveHit(p: LiveProjectile) {
    const severity: HitSeverity = severityForCharge(p.charge);
    const feel = getHitFeel(severity, this.motion);

    this.pendingHits.push({
      amount: p.sim.def.damage,
      knockback: { x: Math.sign(p.sim.dir.x) || 1, y: 0 },
      heavy: severity === 'heavy',
    });

    playImpact(this, p.kit, p.sim.pos.x, p.sim.pos.y, DEPTH.fx, p.charge);
    playDirectionalBurst(this, {
      x: p.sim.pos.x,
      y: p.sim.pos.y,
      depth: DEPTH.fx,
      dir: p.sim.dir,
      palette: p.kit.palette,
      count: feel.particleCount,
      power: p.charge,
    });
    this.hitstop.trigger(feel.hitstopMs);
    if (feel.shakeIntensity > 0) this.cameras.main.shake(feel.shakeMs, feel.shakeIntensity);
    this.jellyView.flash(feel);
  }

  private heroIsDownOrGraced() {
    return (
      this.action.phase === 'knockdown' ||
      this.action.phase === 'standUp' ||
      this.action.graceRemainingMs > 0
    );
  }

  // =========================================================================
  // Losing the hand, and walking it back
  // =========================================================================

  private scatter() {
    const { hand, dropped } = scatterHand(this.hand);
    this.hand = hand;
    if (dropped.length === 0) return;

    const jellyX = this.jelly.construct.pos.x;
    const exclusions: ScatterZone[] = [
      CASTLE_NO_DROP,
      { minX: jellyX - JELLY_BODY.halfWidthPx, maxX: jellyX + JELLY_BODY.halfWidthPx },
    ];
    const result = sideViewScatter(
      this.player.x,
      dropped.length,
      { ...DEFAULT_SCATTER_CONSTRAINTS, exclusions },
      ++this.knockdowns,
    );
    this.scatterReport = { degraded: result.degraded, reason: result.degradedReason };

    dropped.forEach((card, i) => {
      const x = result.xs[i];
      const fixture = FIXTURE_CARDS.find((c) => c.cardId === card.cardId);
      const view = this.makeCardView(this.player.x, fixture);
      this.cards.push({ card, x, view });

      // The arc is presentation only â€” the destination was decided on the ground
      // line before any of this, and nothing here may feed back into it.
      const peak = 70 + Math.random() * 40;
      this.tweens.add({
        targets: view,
        x,
        duration: 420,
        ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: view,
        y: { from: this.groundY - 40, to: this.groundY - peak },
        duration: 190,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => view.setY(this.groundY - 10),
      });
    });
  }

  private makeCardView(x: number, fixture: FixtureCard | undefined) {
    const tint = fixture ? colourOf(effectKitFor(fixture.element).palette[0]) : 0xd8c9a0;
    const body = this.add.rectangle(0, 0, 22, 32, tint).setStrokeStyle(2, 0xf6e6c8);
    const glow = this.add.ellipse(0, 18, 34, 10, tint, 0.35);
    return this.add
      .container(x, this.groundY - 10, [glow, body])
      .setDepth(DEPTH.dropped);
  }

  /**
   * Automatic pickup by proximity. No key.
   *
   * Standing over a card and having to press something for it would put a second
   * decision inside the one moment the fight is already asking everything of him.
   */
  private collectCards() {
    if (!canWalk(this.action.phase)) return;
    this.cards = this.cards.filter((live) => {
      if (Math.abs(this.player.x - live.x) > PICKUP_RADIUS_PX) return true;
      this.hand = recoverCard(this.hand, live.card);
      this.tweens.add({
        targets: live.view,
        y: this.groundY - 90,
        alpha: 0,
        duration: 220,
        onComplete: () => live.view.destroy(),
      });
      return false;
    });
  }

  // =========================================================================
  // Drawing
  // =========================================================================

  private present(_dt: number) {
    this.presentHero();
    this.jellyView.update(this.jelly, this.motion === 'off', this.groundY);
  }

  private presentHero() {
    const phase = this.action.phase;
    this.hero.setX(this.player.x);
    this.heroShadow.setPosition(this.player.x, this.groundY).setVisible(phase !== 'knockdown');

    if (phase === 'knockdown' || phase === 'standUp') {
      // Front-facing, and therefore TEMPORARY â€” only the south direction of this
      // clip was ever generated. It is honest placeholder, not approved side art.
      if (this.hero.texture.key !== KNOCKDOWN_SHEET.key) {
        this.hero.setTexture(KNOCKDOWN_SHEET.key, 0).setOrigin(KNOCKDOWN_ANCHOR.x, KNOCKDOWN_ANCHOR.y);
      }
      this.hero.setY(this.groundY);
      const wantReverse = phase === 'standUp';
      const key = wantReverse ? `${KNOCKDOWN_ANIM}:up` : KNOCKDOWN_ANIM;
      if (this.heroAnim !== key) {
        this.heroAnim = key;
        if (wantReverse) this.hero.playReverse(KNOCKDOWN_ANIM);
        else this.hero.play(KNOCKDOWN_ANIM);
      }
      return;
    }

    if (phase !== 'explore') {
      const facing = this.player.facing < 0 ? 'left' : 'right';
      const sheet = CARD_BLAST_SHEETS[facing];
      const frame = cardBlastFrame(
        phase as CardBlastPhase,
        this.action.elapsedMs,
        this.action.chargeLevel,
        this.motion === 'off',
      );
      this.hero.setTexture(sheet.key, frame).setOrigin(sheet.anchor.x, sheet.anchor.y);
      this.hero.setY(this.groundY);
      this.hero.stop();
      this.heroAnim = `card-blast-${facing}`;
      return;
    }

    const facing = this.player.facing < 0 ? 'left' : 'right';
    if (this.hero.texture.key !== HERO_SHEET.key) {
      this.hero.setTexture(HERO_SHEET.key, idleFrame(facing)).setOrigin(0.5, HERO_ANCHOR_Y);
    }
    this.hero.setY(this.groundY);
    const moving = this.player.vx !== 0 && this.motion !== 'off';
    const key = moving ? `front-v4-walk-${facing}` : `idle-${facing}`;
    if (this.heroAnim !== key) {
      this.heroAnim = key;
      if (moving) this.hero.play(key);
      else {
        this.hero.stop();
        this.hero.setFrame(idleFrame(facing));
      }
    }
  }


  // =========================================================================
  // Commands â€” the only way automation touches this scene
  // =========================================================================

  port(): FrontV4ScenePort {
    return {
      snapshot: () => this.snapshot(),
      reset: () => this.reset(),
      placePlayer: (x) => {
        this.player = { ...this.player, x: Phaser.Math.Clamp(x, ARENA.minX, ARENA.maxX) };
      },
      holdMove: (dirX, ms) => {
        this.scriptedMoveX = dirX;
        this.scriptedMoveUntilMs = this.time.now + Math.max(0, ms);
      },
      selectSlot: (index) => {
        this.hand = selectSlot(this.hand, index);
      },
      fireTap: () => {
        this.scriptedFireUntilMs = this.time.now + 80;
      },
      fireHeld: (holdMs) => {
        this.scriptedFireUntilMs = this.time.now + Math.max(ACTION_TIMING.holdThresholdMs + 60, holdMs);
      },
      setJellyAi: (enabled) => {
        this.jelly = { ...this.jelly, construct: setAiEnabled(this.jelly.construct, enabled) };
      },
      setStrongHits: (enabled) => {
        this.jelly = { ...this.jelly, construct: setStrongHits(this.jelly.construct, enabled) };
      },
      forceJellyPhase: (phase: ConstructPhase) => {
        this.jelly = forceJellyPhase(this.jelly, phase, this.player.x, this.groundY);
      },
      forceKnockdown: () => this.forceKnockdown(),
      defeatJelly: () => {
        this.jelly = { ...this.jelly, mode: 'ground', leap: null, heightPx: 0, construct: defeatConstruct(this.jelly.construct) };
      },
      reviveJelly: () => {
        this.jelly = { ...this.jelly, construct: reviveConstruct(this.jelly.construct) };
      },
    };
  }

  private forceKnockdown() {
    this.action = stepAction(
      this.action,
      {
        firePressed: false,
        summonPressed: false,
        hasReadyCard: canFire(this.hand),
        heavyHit: true,
        aim: { x: this.player.facing, y: 0 },
        cancelRequested: false,
        getUpRequested: false,
      },
      0,
    );
    if (this.action.phase === 'knockdown') this.scatter();
  }

  private resetJellyOnly() {
    this.jelly = resetJelly(this.jelly, JELLY_SPAWN_X, this.groundY);
    this.lastStrike = 'none';
  }

  reset() {
    resetProjectileIds();
    for (const p of this.projectiles) {
      p.sprite?.destroy();
      p.fallback?.destroy();
    }
    for (const c of this.cards) c.view.destroy();
    this.projectiles = [];
    this.cards = [];
    this.pendingHits = [];
    this.committedSlot = null;
    this.knockdowns = 0;
    this.lastStrike = 'none';
    this.scatterReport = { degraded: false, reason: null };
    this.player = initialPlayer(HERO_SPAWN_X);
    this.action = initialAction();
    this.hand = handFromCards(FIXTURE_CARDS.map((c) => c.cardId));
    this.jelly = resetJelly(initialJelly(JELLY_SPAWN_X, this.groundY), JELLY_SPAWN_X, this.groundY);
    this.scriptedFireUntilMs = 0;
    this.scriptedMoveUntilMs = 0;
    this.scriptedMoveX = 0;
    this.heroAnim = '';
    this.errors = [];
  }

  private emitSnapshot = () => {
    this.game.events.emit(`${FRONT_V4_EVENTS.snapshot}:result`, this.snapshot());
  };

  snapshot(): FrontV4Snapshot {
    const body = playerBody(this.player, this.groundY, HERO_BODY);
    return {
      bridgeVersion: 1,
      scene: 'CastleFrontV4',
      // Read, not asserted. The same scene serves `/castle` and the dev harness,
      // and a snapshot that always claimed the dev route would quietly mislabel
      // every reading taken from the live game.
      route: typeof window === 'undefined' ? '' : window.location.pathname,
      view: { width: FRONT_V4_VIEW.width, height: FRONT_V4_VIEW.height },
      canvas: { width: this.scale.width, height: this.scale.height },
      camera: {
        mode: 'fixed-fit',
        zoom: this.cameras.main.zoom,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      },
      world: { groundY: this.groundY, minX: ARENA.minX, maxX: ARENA.maxX },
      player: {
        x: this.player.x,
        y: this.groundY,
        facing: this.player.facing,
        vx: this.player.vx,
        grounded: true,
        canJump: false,
        phase: this.action.phase,
        chargeLevel: this.action.chargeLevel,
        graceRemainingMs: this.action.graceRemainingMs,
        animation: this.heroAnim,
        body,
      },
      hand: {
        selected: this.hand.selected,
        canFire: canFire(this.hand),
        slots: this.hand.slots.map((slot) => {
          const fixture = FIXTURE_CARDS.find((c) => c.cardId === slot.cardId);
          return {
            cardId: slot.cardId,
            state: slot.state,
            name: fixture?.name ?? null,
            element: fixture?.element ?? null,
          };
        }),
      },
      dropped: this.cards.map((c) => ({
        cardId: c.card.cardId,
        slotIndex: c.card.slotIndex,
        x: c.x,
        y: this.groundY,
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.sim.id,
        x: p.sim.pos.x,
        y: p.sim.pos.y,
        dirX: p.sim.dir.x,
        dirY: p.sim.dir.y,
        outcome: p.sim.outcome,
      })),
      jelly: {
        mode: this.jelly.mode,
        phase: this.jelly.construct.phase,
        hp: this.jelly.construct.hp,
        maxHp: CONSTRUCT_TUNING.maxHp,
        x: this.jelly.construct.pos.x,
        heightPx: this.jelly.heightPx,
        landingX: this.jelly.leap?.landingX ?? null,
        aiEnabled: this.jelly.construct.aiEnabled,
        strongHits: this.jelly.construct.strongHits,
        animation: this.jellyView.animation(),
        lastStrike: this.lastStrike,
      },
      hitstop: { active: this.hitstop.active(), remainingMs: this.hitstop.remainingMs() },
      scatter: { lastDegraded: this.scatterReport.degraded, lastReason: this.scatterReport.reason },
      authoredWorld: {
        sceneName: WORLD_SCENE,
        status: this.world?.status ?? 'pending',
        texturesLoaded: this.world?.texturesLoaded ?? 0,
        message: this.world?.message ?? null,
      },
      errors: [...this.errors],
    };
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

import type Phaser from 'phaser';
import { WildlifeBrain } from './WildlifeBrain';
import {
  distanceBetween,
  distanceToBounds,
  pointAwayFrom,
  randomPointInBounds,
  stepToward,
} from './movement';
import type {
  WildlifeActivity,
  WildlifeAnimationSet,
  WildlifeBounds,
  WildlifeBrainSnapshot,
  WildlifeDecision,
  WildlifeFacing,
  WildlifeMoveResolver,
  WildlifePoint,
  WildlifeRandom,
  WildlifeSpeciesProfile,
  WildlifeWater,
} from './types';

export interface WildlifeAgentOptions {
  roamBounds: WildlifeBounds;
  animations: WildlifeAnimationSet;
  random?: WildlifeRandom;
  moveResolver?: WildlifeMoveResolver;
  initialFacing?: WildlifeFacing;
  /**
   * Every patch of drinkable water in the scene. The agent keeps only the ones
   * worth walking to and ignores the rest, so a scene can hand over all of them
   * without knowing which animal lives where.
   */
  waterSources?: readonly WildlifeWater[];
  /**
   * The patch of ground the animal stands on, for testing against water.
   *
   * Without it only the origin point is tested — one pixel under the middle of the
   * animal — so a fox can stand with its origin on the bank and half its body over
   * the pool, which is exactly the "not accurate enough" edge that showed up in
   * play. Collision against a foot, not against a point, is the same rule the
   * courtyard already uses for walls.
   */
  feet?: { width: number; height: number };
}

const openFloor: WildlifeMoveResolver = (_current, proposed) => proposed;

/**
 * How far outside its own territory an animal will go for a drink, as a multiple
 * of the territory's size.
 *
 * Not zero, because a pond is almost always drawn just outside the roam box
 * rather than inside it — you place the water where the water looks right, and
 * requiring an overlap would mean every pond needed its boxes redrawn. Not
 * unbounded either, or a fox in the north wood walks the length of the map.
 */
const WATER_REACH = 0.6;

/**
 * Where a submerged creature sits in the depth stack.
 *
 * NOT its own Y, which is what every land animal uses. A fish is under the water,
 * so it has to draw below the surface layer — and the surface is a small fixed
 * depth just above the pond, not a number in the hundreds. The tiny Y term keeps
 * two fish in a stable order relative to each other without escaping the band.
 *
 * Mirrors `WATER_LAYER.submerged` in sceneBehaviors/wildlifeShared.ts. Kept here
 * rather than imported because this package deliberately knows nothing about the
 * scene layer; if one moves, move the other.
 */
const SUBMERGED_DEPTH = 2;

/**
 * The underwater look. Mirrors `SUBMERGED_TINT` / `SUBMERGED_ALPHA` in
 * sceneBehaviors/wildlifeShared.ts, which the scene applies to a fish once. An
 * amphibious animal cannot be done that way — it has to change as it crosses.
 */
const SUBMERGED_TINT = 0x8fd4e8;
const SUBMERGED_ALPHA = 0.82;

/**
 * How much smaller a creature reads once it is in the water.
 *
 * Raheem, 2026-08-10: "it should shrink a little bit because the water is deep. It
 * should be further away from you." Exactly right, and it is the cue the first
 * attempt was missing — a blue tint alone says "wet", not "below the surface", so a
 * floating tortoise looked painted onto the pond rather than in it.
 *
 * Started at 0.86 and that was too timid to read as depth; 0.65 on his call.
 */
const SUBMERGED_SCALE = 0.65;

/** How long the sink and the climb-out take. Instant would pop. */
const SINK_MS = 420;

/**
 * How long an amphibious animal stays in before heading for the bank, and how long
 * it then keeps to dry land.
 *
 * Randomised per swim rather than fixed, for the same reason the drink cadence is:
 * a constant interval reads as a machine. Without any limit at all it simply never
 * comes out — it drifts from one spot in the pond to the next forever, which is
 * what happened once drifting-on-arrival was added.
 */
const SWIM_FOR_MS: readonly [number, number] = [12_000, 30_000];
const STAY_DRY_MS: readonly [number, number] = [25_000, 50_000];

/**
 * Connects one placed Phaser sprite to the shared brain. The sprite can be
 * positioned visually in Phaser Editor; this class supplies its life at run time.
 */
export class WildlifeAgent {
  private readonly brain: WildlifeBrain;
  private readonly random: WildlifeRandom;
  private readonly moveResolver: WildlifeMoveResolver;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly profile: WildlifeSpeciesProfile;
  private readonly options: WildlifeAgentOptions;
  private decision: WildlifeDecision | null = null;
  private target: WildlifePoint | null = null;
  private facing: WildlifeFacing;
  private motionOff = false;
  /** Water this animal could plausibly walk to, decided once at construction. */
  private readonly water: readonly WildlifeWater[];
  /** The patch it is currently heading for, so it can turn and face it on arrival. */
  private drinkingAt: WildlifeWater | null = null;
  /** Every patch of water in the scene — solid to a land animal, drinkable or not. */
  private readonly solidWater: readonly WildlifeWater[] = [];
  /** Sample points across the feet, for testing the footprint rather than a pixel. */
  private readonly footOffsets: readonly WildlifePoint[] = [{ x: 0, y: 0 }];
  /**
   * How many more times this routine may pick a new destination after being
   * blocked. Bounded so a cornered animal settles instead of twitching between
   * targets every frame.
   */
  private retriesLeft = 0;
  /** True for a fish. Inverts confinement, roaming, and the escape hatch. */
  private readonly aquatic: boolean;
  /**
   * True for the tortoise: allowed on BOTH sides of the waterline.
   *
   * Not a third set of rules, an absence of them — the waterline simply stops
   * being a boundary. It still gets the swimming look and the submerged depth
   * while it happens to be wet, which is decided per frame rather than once.
   */
  private readonly amphibious: boolean;
  /** Whether it was in water last frame, so the look only changes on a crossing. */
  private wasWet: boolean | null = null;
  /** A destination set from outside, consumed by the next roam. Review only. */
  private forcedTarget: WildlifePoint | null = null;
  /** 0 = fully on land, 1 = fully submerged. Eased, so entering is not a pop. */
  private waterBlend = 0;
  /** When this swim began, and how long it is allowed to last. */
  private swimSince: number | null = null;
  private swimLimitMs = 0;
  /** Keep out of the water until this time, so it actually walks about between swims. */
  private stayDryUntil = 0;
  /** The scene clock, so the swim limit can be judged without threading `now`. */
  private now = 0;
  /** The scale the Editor placed it at, which submerging is relative to. */
  private baseScaleX = 1;
  private baseScaleY = 1;

  constructor(
    sprite: Phaser.GameObjects.Sprite,
    profile: WildlifeSpeciesProfile,
    options: WildlifeAgentOptions,
  ) {
    this.sprite = sprite;
    this.profile = profile;
    this.options = options;
    this.random = options.random ?? Math.random;
    this.facing = options.initialFacing ?? 'down';
    this.brain = new WildlifeBrain(profile, this.random);

    // WATER IS SOLID, AND THAT IS WHAT PUTS THEM ON THE BANK.
    //
    // The animal aims at the middle of the pond and this stops it the instant its
    // feet would touch water — so it ends up at the waterline on whichever side it
    // approached from, which is a better shoreline than any point this code could
    // pick. Blocking is the whole mechanism; without it they wade to the centre
    // and lap at nothing, which is exactly what the first playtest showed.
    //
    // It uses EVERY water source, not the filtered drinking list, because the
    // tortoise does not drink and must still not walk into a pond. A species that
    // can swim will opt out here later — that is the hook the fish need.
    this.aquatic = profile.habitat === 'water';
    this.amphibious = profile.habitat === 'amphibious';
    // A fish has no use for the scene's walls: the pond's outline is the only
    // boundary it has, and a wall traced across dry land would only trap it.
    const scene = this.aquatic ? openFloor : (options.moveResolver ?? openFloor);
    // Kept on the instance, not just closed over: choosing where to WALK needs to
    // know about water too, not only whether a step is legal. Every source, not
    // the drinkable subset — the tortoise does not drink and must still stay out.
    this.solidWater = options.waterSources ?? [];
    // The animal's footprint, sampled at its corners, edges and middle. Nine
    // points rather than one: a single origin test lets half the body hang over
    // the water before anything objects, and the leading edge is what the eye
    // reads as "standing at the water".
    const foot = options.feet;
    this.footOffsets = foot
      ? [-0.5, 0, 0.5].flatMap((fx) =>
          [-1, -0.5, 0].map((fy) => ({ x: fx * foot.width, y: fy * foot.height })),
        )
      : [{ x: 0, y: 0 }];

    this.moveResolver = (current, proposed) => {
      const allowed = scene(current, proposed);
      // ESCAPE HATCH. Without this, an animal that is already standing in water
      // has every candidate step rejected too — including the ones heading for
      // dry land — so it is trapped for good with its legs going. Getting out
      // always beats standing in a pond forever.
      // One rule, read either way round: a land animal may not be wet, a fish may
      // not be dry. Both keep the escape hatch — being on the wrong side of the
      // waterline must never be a state you cannot leave.
      // An amphibious animal has no wrong side, so the waterline never blocks it.
      if (this.amphibious) return allowed;
      const wrongSide = (p: WildlifePoint) => this.wetAt(p) !== this.aquatic;
      if (wrongSide(current)) return allowed;
      return wrongSide(allowed) ? current : allowed;
    };

    // Filtered once rather than every frame. A species with no `drink` routine
    // keeps no water at all, which is what makes `waterAvailable` false for the
    // tortoise for free instead of via a second check somewhere else.
    const drinks = profile.routines.some((routine) => routine.activity === 'drink');
    const reach = WATER_REACH * Math.max(options.roamBounds.width, options.roamBounds.height);
    this.water = drinks
      ? (options.waterSources ?? []).filter((source) => this.boundsGap(source.bounds) <= reach)
      : [];

    this.baseScaleX = this.sprite.scaleX ?? 1;
    this.baseScaleY = this.sprite.scaleY ?? 1;
    this.sprite.setOrigin(0.5, 1);
    this.setDepthForHabitat();
  }

  /** True when the animal's FOOTPRINT at this position would be in water. */
  private wetAt(point: WildlifePoint): boolean {
    for (const patch of this.solidWater) {
      for (const offset of this.footOffsets) {
        if (patch.contains({ x: point.x + offset.x, y: point.y + offset.y })) return true;
      }
    }
    return false;
  }

  /**
   * Somewhere to wander that is not the middle of the pond.
   *
   * The pond now covers half the lab's roaming area, so an unfiltered random point
   * lands in water more often than not — the animal sets off, is stopped at the
   * bank, and stands there. Rejecting wet destinations is what stops it walking at
   * the water it cannot enter. Null when everything sampled was wet, which the
   * caller reads as "stay put" rather than "walk at it anyway".
   */
  /**
   * Somewhere else IN the water it is already in.
   *
   * Used when an amphibious animal arrives while afloat: the natural next move for
   * something that is swimming is to swim on, not to make immediately for the bank.
   * Leaving happens when the routine ends and an ordinary roam picks a dry spot.
   */
  private wetRoamTarget(): WildlifePoint | null {
    for (const patch of this.solidWater) {
      if (!patch.contains({ x: this.sprite.x, y: this.sprite.y })) continue;
      for (let attempt = 0; attempt < 16; attempt += 1) {
        const point = randomPointInBounds(patch.bounds, this.random, 8);
        if (this.bodyInWater(point) === 'in') return point;
      }
    }
    return null;
  }

  private dryRoamTarget(): WildlifePoint | null {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const point = randomPointInBounds(this.options.roamBounds, this.random, 12);
      if (this.amphibious) {
        const state = this.bodyInWater(point);
        // Anywhere WELL IN or WELL OUT — never straddling. Raheem, 2026-08-10:
        // "when he decides to come out, it should just come fully out or be fully
        // in." So the shoreline becomes a place it crosses and never a place it
        // stops, which is what stops the half-in-half-out pose entirely.
        if (state === 'crossing') continue;
        // Dry only, while it is having its spell on land or heading for the bank.
        // Otherwise it climbs out and turns straight back round.
        if (state === 'in' && (this.now < this.stayDryUntil || this.swimIsOver())) continue;
        return point;
      }
      if (this.wetAt(point) === this.aquatic) return point;
    }
    return null;
  }

  /**
   * True while this animal belongs UNDER the water rather than on the ground.
   *
   * Public because a scene that owns its own depth stack has to know not to sort
   * this one by its feet. The courtyard adds a terrace term to every animal's
   * depth, and doing that to a fish would lift it out of the water band and put
   * it on top of the ripples it is swimming beneath.
   */
  isSubmerged(): boolean {
    // A tortoise in the pond sorts like a fish; on the grass it sorts like a fox.
    return this.aquatic || (this.amphibious && this.inWater());
  }

  /** A land animal sorts by its feet; a fish sorts under the water's surface. */
  private setDepthForHabitat(): void {
    this.sprite.setDepth(
      this.isSubmerged() ? SUBMERGED_DEPTH + this.sprite.y * 0.001 : this.sprite.y,
    );
  }

  /**
   * Tint an amphibious animal while it is in the water, and clear it when it climbs
   * out. Only on a CROSSING — setting the same tint every frame is pointless work,
   * and it would also stomp any tint a scene applied for its own reasons.
   *
   * A fish is tinted once by the scene at construction and never changes, because a
   * fish never leaves.
   */
  private updateWaterLook(deltaMs: number): void {
    if (!this.amphibious) return;

    // Only a body that is ALL the way in counts as submerged, and only one that is
    // ALL the way out counts as dry. Mid-crossing it holds whatever it last was, so
    // it never goes blue with half of itself on the grass.
    const state = this.bodyInWater({ x: this.sprite.x, y: this.sprite.y });
    if (state !== 'crossing') {
      const wet = state === 'in';
      if (wet !== this.wasWet) {
        this.wasWet = wet;
        if (wet) {
          this.swimSince = this.now;
          const [least, most] = SWIM_FOR_MS;
          this.swimLimitMs = least + (most - least) * this.random();
        } else {
          this.swimSince = null;
          const [least, most] = STAY_DRY_MS;
          this.stayDryUntil = this.now + least + (most - least) * this.random();
        }
        // The clip is chosen during move(), before the crossing is known, so
        // without this it swims for one frame on the bank or walks for one in
        // the pond.
        if (this.decision) this.play(this.decision.activity);
      }
    }

    // Ease toward the target rather than snapping. Sinking is a movement, and an
    // instant scale change reads as a glitch rather than as depth.
    const goal = this.wasWet ? 1 : 0;
    const step = deltaMs / SINK_MS;
    this.waterBlend =
      goal > this.waterBlend
        ? Math.min(goal, this.waterBlend + step)
        : Math.max(goal, this.waterBlend - step);

    const shrink = 1 - (1 - SUBMERGED_SCALE) * this.waterBlend;
    this.sprite.setScale(this.baseScaleX * shrink, this.baseScaleY * shrink);
    this.sprite.setAlpha(1 - (1 - SUBMERGED_ALPHA) * this.waterBlend);
    if (this.waterBlend > 0.5) this.sprite.setTint(SUBMERGED_TINT);
    else this.sprite.clearTint();
  }

  /**
   * Is it AFLOAT right now?
   *
   * Its origin point, deliberately — not the footprint that `wetAt` tests. Those
   * answer different questions: the footprint decides whether a step is legal, and
   * one toe over the line is enough to stop a fox. Floating is about the body, and
   * a tortoise with a single foot in the shallows is still standing on the bank.
   */
  inWater(): boolean {
    return this.bodyInWater({ x: this.sprite.x, y: this.sprite.y }) === 'in';
  }

  /**
   * Has this swim run its course?
   *
   * Something has to say so, or it never comes out: arriving afloat hands it
   * another spot in the pond every single time, so it drifts between them forever.
   * The span is randomised per swim, because a tortoise that surfaces on a fixed
   * timer is a clock with a shell.
   */
  private swimIsOver(): boolean {
    return this.swimSince !== null && this.now - this.swimSince > this.swimLimitMs;
  }

  /**
   * Is the whole BODY in the water, the whole body out, or straddling the edge?
   *
   * The origin is the feet, and testing only that is what produced the complaint:
   * the instant a tortoise's feet crossed, the entire sprite went blue while half
   * of it was plainly still on the grass. What the eye judges is the body, so the
   * body is what gets sampled — four points across the picture, not one under it.
   */
  private bodyInWater(at: WildlifePoint): 'in' | 'out' | 'crossing' {
    if (this.solidWater.length === 0) return 'out';
    const halfWidth = (this.sprite.displayWidth ?? 0) * 0.5;
    const height = this.sprite.displayHeight ?? 0;
    const points: WildlifePoint[] = [
      { x: at.x, y: at.y },
      { x: at.x - halfWidth * 0.6, y: at.y - height * 0.35 },
      { x: at.x + halfWidth * 0.6, y: at.y - height * 0.35 },
      { x: at.x, y: at.y - height * 0.7 },
    ];
    let wet = 0;
    for (const point of points) {
      if (this.solidWater.some((patch) => patch.contains(point))) wet += 1;
    }
    if (wet === points.length) return 'in';
    if (wet === 0) return 'out';
    return 'crossing';
  }

  /** Shortest gap between this animal's territory and a patch of water. */
  private boundsGap(source: WildlifeBounds): number {
    const home = this.options.roamBounds;
    const dx = Math.max(0, Math.max(home.x - (source.x + source.width), source.x - (home.x + home.width)));
    const dy = Math.max(0, Math.max(home.y - (source.y + source.height), source.y - (home.y + home.height)));
    return Math.hypot(dx, dy);
  }

  /** True when this animal has water it could reach — the brain's only input about it. */
  hasWater(): boolean {
    return this.water.length > 0;
  }

  /** Review affordance — see `WildlifeBrain.makeThirsty`. */
  makeThirsty(): void {
    this.brain.makeThirsty();
  }

  /**
   * Send an amphibious animal into the nearest water, now.
   *
   * The counterpart of `makeThirsty` for a creature that does not drink. Waiting
   * for a tortoise at 20px/s to wander into the pond on its own is not a review,
   * and "did it work?" is unanswerable while you are still waiting.
   *
   * Returns false when there is nothing to do — not amphibious, or no water — so
   * the caller can say so rather than looking like it did nothing.
   */
  goSwimming(now: number): boolean {
    if (!this.amphibious) return false;
    // Asked for explicitly, so it overrides a dry spell and starts the clock fresh.
    this.now = now;
    this.stayDryUntil = 0;
    this.swimSince = null;
    for (const patch of this.solidWater) {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const point = randomPointInBounds(patch.bounds, this.random, 8);
        // Well inside, not just past the edge — the same "fully in" rule.
        if (this.bodyInWater(point) !== 'in') continue;
        this.forcedTarget = point;
        // Generous, because a tortoise crosses the field at 20px/s and being fully
        // submerged takes longer still — half a body past the edge. A hold that
        // expires on arrival shows almost no swimming, which was the first attempt.
        // It costs nothing to be long now that arriving afloat makes it drift on
        // rather than sit.
        this.decision = this.brain.hold('roam', now, 40_000);
        this.begin('roam');
        return true;
      }
    }
    return false;
  }

  /**
   * The water it is walking to or drinking from, for a harness to draw. Null at
   * every other moment, which is what makes a drawn line mean something.
   */
  drinkingFrom(): WildlifeWater | null {
    return this.decision?.activity === 'drink' ? this.drinkingAt : null;
  }

  /**
   * Where the muzzle actually meets the water, or null unless it is drinking.
   *
   * Found by walking from the animal toward the middle of the pool until the
   * water mask says yes — so it lands on the real shoreline in front of wherever
   * the animal happens to be standing, which is the only place a ripple can
   * honestly appear. Returns null while it is still travelling: a ripple on the
   * way there would be water reacting to nothing.
   */
  drinkContactPoint(): WildlifePoint | null {
    if (this.decision?.activity !== 'drink' || this.target !== null || !this.drinkingAt) return null;
    const from = { x: this.sprite.x, y: this.sprite.y };
    const box = this.drinkingAt.bounds;
    const toward = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const dx = toward.x - from.x;
    const dy = toward.y - from.y;
    const length = Math.hypot(dx, dy) || 1;
    const reach = this.profile.drinkRange ?? 30;

    // First the waterline — the edge the paws are standing against.
    let edge = -1;
    for (let step = 0; step <= reach; step += 2) {
      const probe = { x: from.x + (dx / length) * step, y: from.y + (dy / length) * step };
      if (this.drinkingAt.contains(probe)) {
        edge = step;
        break;
      }
    }
    if (edge < 0) return null;

    // Then out along the same line by the muzzle's reach, because the tongue is
    // not where the feet are. Backed off if it would leave the water again, which
    // happens where the animal drinks at a narrow inlet.
    const muzzle = this.profile.muzzleReach ?? 0;
    let best = { x: from.x + (dx / length) * edge, y: from.y + (dy / length) * edge };
    for (let step = edge + 2; step <= edge + muzzle; step += 2) {
      const probe = { x: from.x + (dx / length) * step, y: from.y + (dy / length) * step };
      if (!this.drinkingAt.contains(probe)) break;
      best = probe;
    }
    return best;
  }

  /**
   * Any foot that is actually IN the water, for a second, separate ripple.
   *
   * Normally empty: the water is solid to a land animal, so it stops with every
   * paw dry and only the tongue disturbs anything. It exists for the cases where
   * a foot legitimately IS wet — a shallow margin, and later the tortoise, which
   * is going to wade in on purpose.
   */
  wetFeet(): WildlifePoint[] {
    if (this.decision?.activity !== 'drink' || !this.drinkingAt) return [];
    const foot = this.options.feet;
    if (!foot) return [];
    const here = { x: this.sprite.x, y: this.sprite.y };
    const points: WildlifePoint[] = [];
    for (const fx of [-0.5, 0.5]) {
      const probe = { x: here.x + fx * foot.width, y: here.y };
      if (this.drinkingAt.contains(probe)) points.push(probe);
    }
    return points;
  }

  update(now: number, deltaMs: number, playerPosition?: WildlifePoint): void {
    this.now = now;
    const position = { x: this.sprite.x, y: this.sprite.y };
    const next = this.brain.decide({
      now,
      playerPosition,
      playerDistance: playerPosition ? distanceBetween(position, playerPosition) : undefined,
      waterAvailable: this.water.length > 0,
    });

    if (next !== this.decision) {
      this.decision = next;
      this.begin(next.activity, playerPosition);
    }

    if (!this.motionOff) this.move(next.activity, deltaMs, playerPosition);
    this.setDepthForHabitat();
    this.updateWaterLook(deltaMs);
  }

  /**
   * Read-only view of what this animal is thinking, for development readouts.
   * The lab draws it so that "the brain is working" is something you can watch
   * rather than something you have to take on trust.
   */
  snapshot(): WildlifeBrainSnapshot {
    return this.brain.snapshot();
  }

  setMotionOff(off: boolean): void {
    this.motionOff = off;
    if (off) {
      this.target = null;
      this.play('idle');
    }
  }

  destroy(): void {
    this.sprite.anims.stop();
  }

  private begin(activity: WildlifeActivity, playerPosition?: WildlifePoint): void {
    const position = { x: this.sprite.x, y: this.sprite.y };
    this.retriesLeft = 3;
    if (activity === 'roam') {
      this.target = this.forcedTarget ?? this.dryRoamTarget();
      this.forcedTarget = null;
    } else if (activity === 'drink') {
      // Aim at the water itself, not at a spot beside it. Walking INTO the pond
      // and being stopped by the collision that is already there puts the animal
      // exactly on the bank, wherever it approached from — which is a better
      // answer than any shoreline point this code could compute, and it costs
      // nothing because the courtyard's own resolver does it.
      // The CENTRE, not the near edge. Aiming at the edge means arriving before
      // reaching water whenever the nearest corner of the box is bank; aiming at
      // the middle guarantees the path crosses the waterline, and the block above
      // is what stops it there.
      this.drinkingAt = this.nearestWater(position);
      this.target = this.drinkingAt
        ? {
            x: this.drinkingAt.bounds.x + this.drinkingAt.bounds.width / 2,
            y: this.drinkingAt.bounds.y + this.drinkingAt.bounds.height / 2,
          }
        : null;
    } else if (activity === 'flee' && playerPosition) {
      this.target = pointAwayFrom(position, playerPosition, this.options.roamBounds, 100);
    } else {
      this.target = null;
      if (activity === 'observe' && playerPosition) this.facePoint(playerPosition);
    }
    if (activity !== 'drink') this.drinkingAt = null;
    this.play(activity);
  }

  private nearestWater(from: WildlifePoint): WildlifeWater | null {
    let best: WildlifeWater | null = null;
    let bestDistance = Infinity;
    for (const source of this.water) {
      const distance = distanceToBounds(source.bounds, from);
      if (distance < bestDistance) {
        best = source;
        bestDistance = distance;
      }
    }
    return best;
  }

  private move(
    activity: WildlifeActivity,
    deltaMs: number,
    playerPosition?: WildlifePoint,
  ): void {
    // BEING ON THE WRONG SIDE OF THE WATERLINE IS NEVER A STATE TO LINGER IN.
    // (A fox in the pond walks out; a fish on the grass swims back.)
    //
    // The resolver's escape hatch stops this being a deadlock, but on its own it
    // only frees the animal once the brain next happens to choose roaming —
    // measured at 7.7 seconds of a fox standing in the middle of the pond. Walking
    // out is not a decision worth waiting for, so it overrides whatever it thought
    // it was doing.
    const standing = { x: this.sprite.x, y: this.sprite.y };
    if (!this.amphibious && this.wetAt(standing) !== this.aquatic) {
      if (!this.target || this.wetAt(this.target)) this.target = this.dryRoamTarget();
      if (this.target) {
        const out = stepToward(
          standing,
          this.target,
          this.profile.roamSpeed,
          deltaMs,
          this.profile.arrivalRadius,
        );
        const moved = this.moveResolver(standing, out.position);
        this.sprite.setPosition(moved.x, moved.y);
        this.facing = out.facing;
        this.play('roam');
        return;
      }
    }

    // TIME TO GET OUT.
    //
    // Without this it never leaves: drifting-on-arrival hands it another spot in
    // the pond every time it arrives, forever. The swim gets a randomised span and
    // then the bank overrides whatever it was doing — which is also what makes the
    // size change worth having, since you only read the shrink against seeing it
    // full size again afterwards.
    if (this.amphibious && this.swimIsOver() && this.bodyInWater(standing) !== 'out') {
      if (!this.target || this.bodyInWater(this.target) !== 'out') {
        this.target = this.dryRoamTarget();
      }
      if (this.target) {
        const out = stepToward(
          standing,
          this.target,
          this.profile.roamSpeed,
          deltaMs,
          this.profile.arrivalRadius,
        );
        const moved = this.moveResolver(standing, out.position);
        this.sprite.setPosition(moved.x, moved.y);
        this.facing = out.facing;
        this.play('roam');
        return;
      }
    }

    // A SHORELINE IS SOMEWHERE YOU CROSS, NOT SOMEWHERE YOU STOP.
    //
    // Choosing only committed destinations is not enough on its own: a routine's
    // timer can expire mid-wade, and then it simply stands there straddling the
    // bank — measured at 11.6 seconds of exactly the pose Raheem objected to. So
    // being caught on the line overrides whatever it was doing until it is clear.
    if (this.amphibious && this.bodyInWater(standing) === 'crossing') {
      if (!this.target) this.target = this.dryRoamTarget();
      if (this.target) {
        const across = stepToward(
          standing,
          this.target,
          this.profile.roamSpeed,
          deltaMs,
          this.profile.arrivalRadius,
        );
        const moved = this.moveResolver(standing, across.position);
        this.sprite.setPosition(moved.x, moved.y);
        this.facing = across.facing;
        this.play('roam');
        return;
      }
    }

    if (activity === 'flee' && playerPosition && !this.target) {
      this.target = pointAwayFrom(
        { x: this.sprite.x, y: this.sprite.y },
        playerPosition,
        this.options.roamBounds,
        100,
      );
    }
    if (activity === 'drink' && !this.target) {
      // Standing at the water: hold still, head turned to it. Reached either by
      // arriving or by being blocked at the bank — both end with target cleared.
      if (this.drinkingAt) {
        // Face the WATER, found by probing for it — never a point clamped into the
        // bounding box. `nearestPointIn` returns your own position when you are
        // already inside the box, and an animal stopped at the waterline always is,
        // because the box includes the bank. That handed `facePoint` a zero vector,
        // which fell through to 'down' — so a fox on the west shore drank with the
        // forward clip while facing east.
        const box = this.drinkingAt.bounds;
        this.facePoint(
          this.drinkContactPoint() ?? {
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
          },
        );
      }
      this.play(activity);
      return;
    }
    if (!this.target || (activity !== 'roam' && activity !== 'flee' && activity !== 'drink')) return;

    const current = { x: this.sprite.x, y: this.sprite.y };
    const speed = activity === 'flee' ? this.profile.fleeSpeed : this.profile.roamSpeed;
    const step = stepToward(
      current,
      this.target,
      speed,
      deltaMs,
      this.profile.arrivalRadius,
    );
    const resolved = this.moveResolver(current, step.position);
    this.sprite.setPosition(resolved.x, resolved.y);

    if (step.facing !== this.facing) {
      this.facing = step.facing;
      this.play(activity);
    }
    const blocked = resolved.x === current.x && resolved.y === current.y;
    if (step.arrived || blocked) {
      // Blocked is not the same as arrived. An animal that walks into the bank or a
      // wall should try somewhere else, not stand there for the rest of the routine
      // — which is what it used to do, for up to 4.2 seconds, legs going.
      // ARRIVING AFLOAT IS NOT A REASON TO STOP.
      //
      // A land animal that reaches its destination stands there, which is what a
      // resting animal looks like. A floating one does not: the float clip plays
      // whenever it is in the water, moving or not, so standing still reads as
      // swimming on the spot — which is exactly what it did after the F key sent
      // it in and then held the routine for another twenty seconds. Afloat, it
      // picks somewhere new and drifts on. No budget needed: arriving means it got
      // there, and the routine's own timer is what ends the wandering.
      const driftOn =
        step.arrived && activity === 'roam' && this.amphibious && this.inWater() && !this.swimIsOver();
      const tryElsewhere =
        blocked && !step.arrived && activity === 'roam' && this.retriesLeft > 0;
      if (tryElsewhere) this.retriesLeft -= 1;
      this.target = driftOn
        ? (this.wetRoamTarget() ?? this.dryRoamTarget())
        : tryElsewhere
          ? this.dryRoamTarget()
          : null;
      // Blocked short of the water is not a drink. A fox stopped by a wall on the
      // way should stand there looking like a fox, not mime lapping at masonry.
      if (activity === 'drink' && this.drinkingAt) {
        const range = this.profile.drinkRange ?? 30;
        if (distanceToBounds(this.drinkingAt.bounds, resolved) > range) this.drinkingAt = null;
      }
      this.play(activity);
    }
  }

  private facePoint(point: WildlifePoint): void {
    const dx = point.x - this.sprite.x;
    const dy = point.y - this.sprite.y;
    // A point on top of the animal says nothing about where it should look, and
    // the ternary below would answer 'down' for it — which is how a targeting
    // quirk became a visible art bug. Keep whatever it was facing instead.
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    this.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
  }

  private play(activity: WildlifeActivity): void {
    // Walking to the water still looks like walking. Only once it is standing at
    // the bank does the drinking clip take over — which is also why a drink that
    // never reaches the water simply never shows one.
    // A walking clip is a claim that the animal is walking. Without this it played
    // whenever the ACTIVITY was roam or flee, so an animal with nowhere left to go
    // kept striding on the spot until the brain moved on.
    const moving = (activity === 'roam' || activity === 'flee') && this.target !== null;
    const travelling = activity === 'drink' && this.target !== null;
    const atWater = activity === 'drink' && this.target === null && this.drinkingAt !== null;

    // In the water, an amphibious animal swims instead of walking. Same activity,
    // different body — which is why crossing the bank needs no new decision.
    const afloat = this.amphibious && this.options.animations.swim && this.inWater();
    const group =
      afloat
        ? this.options.animations.swim!
        : moving || travelling
        ? this.options.animations.move
        : atWater
          ? (this.options.animations.drink ?? this.options.animations.signature)
          : activity === 'signature'
            ? this.options.animations.signature
            : activity === 'observe' && this.options.animations.observe
              ? this.options.animations.observe
              : this.options.animations.idle;
    const key = group[this.facing] ?? group.down ?? Object.values(group)[0];
    if (key && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }
}

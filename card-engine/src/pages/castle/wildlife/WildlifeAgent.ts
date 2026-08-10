import type Phaser from 'phaser';
import { WildlifeBrain } from './WildlifeBrain';
import {
  distanceBetween,
  distanceToBounds,
  nearestPointIn,
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
    const scene = options.moveResolver ?? openFloor;
    const solidWater = options.waterSources ?? [];
    // The animal's footprint, sampled at its corners, edges and middle. Nine
    // points rather than one: a single origin test lets half the body hang over
    // the water before anything objects, and the leading edge is what the eye
    // reads as "standing at the water".
    const foot = options.feet;
    const offsets: readonly WildlifePoint[] = foot
      ? [-0.5, 0, 0.5].flatMap((fx) =>
          [-1, -0.5, 0].map((fy) => ({ x: fx * foot.width, y: fy * foot.height })),
        )
      : [{ x: 0, y: 0 }];
    this.moveResolver = (current, proposed) => {
      const allowed = scene(current, proposed);
      for (const patch of solidWater) {
        for (const offset of offsets) {
          if (patch.contains({ x: allowed.x + offset.x, y: allowed.y + offset.y })) return current;
        }
      }
      return allowed;
    };

    // Filtered once rather than every frame. A species with no `drink` routine
    // keeps no water at all, which is what makes `waterAvailable` false for the
    // tortoise for free instead of via a second check somewhere else.
    const drinks = profile.routines.some((routine) => routine.activity === 'drink');
    const reach = WATER_REACH * Math.max(options.roamBounds.width, options.roamBounds.height);
    this.water = drinks
      ? (options.waterSources ?? []).filter((source) => this.boundsGap(source.bounds) <= reach)
      : [];

    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(this.sprite.y);
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
    this.sprite.setDepth(this.sprite.y);
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
    if (activity === 'roam') {
      this.target = randomPointInBounds(this.options.roamBounds, this.random, 12);
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
        this.facePoint(nearestPointIn(this.drinkingAt.bounds, { x: this.sprite.x, y: this.sprite.y }));
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
      this.target = null;
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
    this.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
  }

  private play(activity: WildlifeActivity): void {
    // Walking to the water still looks like walking. Only once it is standing at
    // the bank does the drinking clip take over — which is also why a drink that
    // never reaches the water simply never shows one.
    const travelling = activity === 'drink' && this.target !== null;
    const atWater = activity === 'drink' && this.target === null && this.drinkingAt !== null;

    const group =
      activity === 'roam' || activity === 'flee' || travelling
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

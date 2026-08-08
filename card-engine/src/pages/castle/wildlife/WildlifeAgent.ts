import type Phaser from 'phaser';
import { WildlifeBrain } from './WildlifeBrain';
import {
  distanceBetween,
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
} from './types';

export interface WildlifeAgentOptions {
  roamBounds: WildlifeBounds;
  animations: WildlifeAnimationSet;
  random?: WildlifeRandom;
  moveResolver?: WildlifeMoveResolver;
  initialFacing?: WildlifeFacing;
}

const openFloor: WildlifeMoveResolver = (_current, proposed) => proposed;

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

  constructor(
    sprite: Phaser.GameObjects.Sprite,
    profile: WildlifeSpeciesProfile,
    options: WildlifeAgentOptions,
  ) {
    this.sprite = sprite;
    this.profile = profile;
    this.options = options;
    this.random = options.random ?? Math.random;
    this.moveResolver = options.moveResolver ?? openFloor;
    this.facing = options.initialFacing ?? 'down';
    this.brain = new WildlifeBrain(profile, this.random);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setDepth(this.sprite.y);
  }

  update(now: number, deltaMs: number, playerPosition?: WildlifePoint): void {
    const position = { x: this.sprite.x, y: this.sprite.y };
    const next = this.brain.decide({
      now,
      playerPosition,
      playerDistance: playerPosition ? distanceBetween(position, playerPosition) : undefined,
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
    } else if (activity === 'flee' && playerPosition) {
      this.target = pointAwayFrom(position, playerPosition, this.options.roamBounds, 100);
    } else {
      this.target = null;
      if (activity === 'observe' && playerPosition) this.facePoint(playerPosition);
    }
    this.play(activity);
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
    if (!this.target || (activity !== 'roam' && activity !== 'flee')) return;

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
    if (step.arrived || (resolved.x === current.x && resolved.y === current.y)) this.target = null;
  }

  private facePoint(point: WildlifePoint): void {
    const dx = point.x - this.sprite.x;
    const dy = point.y - this.sprite.y;
    this.facing =
      Math.abs(dx) > Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'down' : 'up';
  }

  private play(activity: WildlifeActivity): void {
    const group =
      activity === 'roam' || activity === 'flee'
        ? this.options.animations.move
        : activity === 'signature'
          ? this.options.animations.signature
          : activity === 'observe' && this.options.animations.observe
            ? this.options.animations.observe
            : this.options.animations.idle;
    const key = group[this.facing] ?? group.down ?? Object.values(group)[0];
    if (key && this.sprite.anims.currentAnim?.key !== key) this.sprite.play(key, true);
  }
}

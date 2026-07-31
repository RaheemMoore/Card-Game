import type { DamageType, StatusApplication } from './abilities';
import type { ArchetypeName } from './card';
import type { BossIntentType, BossTargetScope, BossChargeSpec } from './combat';

/**
 * Boss library types (Master Plan §33). These are the persistence shapes
 * the admin edits and BossStore serializes. The runtime consumes a
 * BossSnapshot (in types/combat.ts) derived from the currently-active
 * BossVersion at battle start — the same snapshot rule as abilities.
 */

export const BOSS_STATUSES = ['draft', 'active', 'retired'] as const;
export type BossStatus = typeof BOSS_STATUSES[number];

export const BOSS_VERSION_STATUSES = ['draft', 'active', 'deprecated'] as const;
export type BossVersionStatus = typeof BOSS_VERSION_STATUSES[number];

export interface BossDefinition {
  id: string;
  slug: string;
  name: string;
  lore: string;
  familyIds: string[];
  currentVersionId: string;
  status: BossStatus;
  /** Optional single portrait id — B7 will introduce a phased-portrait catalog. */
  artAssetIds: string[];
  /**
   * What KIND of opponent this is.
   *
   * 'elemental' — a force, like the Emberborn Wraith. Not a person.
   * 'champion'  — one of The Overreach: someone who walked an archetype's
   *               path past its end and collapsed its central tension instead
   *               of carrying it. A player HOLDS that tension; a champion
   *               resolved it and could not stop.
   */
  bossKind?: 'elemental' | 'champion';
  /**
   * The archetype a champion overreached. Drives the mirror moment when a
   * player of the same archetype fights them.
   *
   * Deliberately ONE generic field rather than eleven bespoke ones.
   */
  mirrorArchetype?: ArchetypeName;
  /** Position in the tower. Floor 0 is the gatekeeper. */
  towerFloor?: number;
  /**
   * Which arena this boss is fought in. Falls back to the default when the
   * art does not exist yet.
   *
   * Plumbed ahead of the art on purpose: every boss currently fights on the
   * same lava dais, which actively undercuts a champion whose identity is a
   * stopped grove or an interrupted summoning. With this field the background
   * becomes a data change the day a new arena lands, rather than a code one.
   */
  arenaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BossResistanceProfile {
  resistant: DamageType[];
  weak: DamageType[];
}

export interface BossPhaseDefinition {
  id: string;
  /** HP % where this phase begins. 1.0 = full hp. */
  healthThresholdStart: number;
  /** HP % where this phase ends (next phase begins). 0 = boss dies here. */
  healthThresholdEnd: number;
  actions: BossActionDefinition[];
  /** Free-text passive descriptions, rendered in tooltips. Human-readable
   *  counterpart to `passiveStatuses` — keep the two in agreement. */
  passiveDescriptions: string[];
  /**
   * Statuses applied to the BOSS when this phase is entered.
   *
   * This is what makes a phase mechanically distinct rather than just a
   * different action list — a phase can regenerate, carry thorns, or run
   * enraged. Applied through the same `addStatus` path heroes use, so the
   * catalog's stacking rules and caps apply.
   */
  passiveStatuses?: StatusApplication[];
}

export interface BossActionDefinition {
  id: string;
  displayName: string;
  intentType: BossIntentType;
  telegraphText: string;
  priority: number;
  cooldownRounds: number;
  interruptible: boolean;
  /**
   * Numeric parameters for the action. The reducer's `bossActionDamage`
   * consumes these; future effect coverage expands the shape.
   */
  baseDamage?: number;
  scalingPerRound?: number;
  /**
   * What this action deals. Omit for `physical`.
   *
   * Until 2026-07-28 the reducer hardcoded `'fire'` for EVERY boss action, so
   * every boss in the game — present and future — dealt fire regardless of
   * what it was. That made a second boss a reskin rather than a different
   * fight, and it silently invalidated any hero's elemental resistance.
   */
  damageType?: DamageType;
  /** For `shield` intents — absorb granted to the boss. */
  shieldAmount?: number;
  /** Rounds that shield lasts. Defaults to 2. */
  shieldDurationRounds?: number;
  /**
   * Who the action hits. Defaults to 'single'.
   *
   * Authoring mirror of `BossActionSnapshot.targetScope` — see that field for
   * why sweeping the party is a scope rather than an intent name.
   */
  targetScope?: BossTargetScope;
  /** Statuses the boss applies to itself — `enrage_prep`. */
  selfStatuses?: readonly StatusApplication[];
  /** Statuses applied to targets — `curse`, `vulnerability`. */
  statusApplications?: readonly StatusApplication[];
  /** For `execute` — below this fraction of max HP, damage is multiplied. */
  executeThresholdPercent?: number;
  executeMultiplier?: number;
  /** Multi-round telegraph. See BossChargeSpec in types/combat.ts. */
  charge?: BossChargeSpec;
  /** Relative pick likelihood among filler actions. See BossActionSnapshot.weight. */
  weight?: number;
}

export interface BossVersion {
  id: string;
  bossId: string;
  versionNumber: number;
  status: BossVersionStatus;
  publishedAt?: string;
  deprecatedAt?: string;
  maxHp: number;
  resistanceProfile: BossResistanceProfile;
  phases: BossPhaseDefinition[];
  createdAt: string;
  updatedAt: string;
}

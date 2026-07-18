import type { DamageType } from './abilities';
import type { BossIntentType } from './combat';

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
  /** Free-text passive descriptions — B4 renders in tooltips. Not yet mechanical. */
  passiveDescriptions: string[];
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

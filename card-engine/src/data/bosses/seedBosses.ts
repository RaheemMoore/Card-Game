import type { BossDefinition, BossVersion } from '../../types/bosses';

/**
 * Hand-authored seed bosses. Currently: the Emberborn Wraith, a fire-elemental
 * used as the first vertical-slice encounter (B4). Numbers here are the same
 * placeholders used by the B2 harness so behavior is identical whether the
 * runtime sources the snapshot from this seed or from Supabase.
 *
 * Balance is provisional — B6 retunes based on B4 telemetry.
 */

const NOW = '2026-07-18T00:00:00.000Z';

export interface SeedBoss {
  definition: BossDefinition;
  version: BossVersion;
}

/* ---------- 1. Emberborn Wraith (fire elemental, 2 phases) ---------- */

const EMBERBORN_DEF: BossDefinition = {
  id: 'boss_fire_elemental_v0',
  slug: 'emberborn-wraith',
  name: 'Emberborn Wraith',
  lore:
    'A spirit knotted from the ash of a burned shrine. It teaches wardens the discipline of measured strikes; those who overreach it swallows whole.',
  familyIds: ['fire'],
  currentVersionId: 'bv_fire_elemental_v0_1',
  status: 'active',
  artAssetIds: [],
  createdAt: NOW,
  updatedAt: NOW,
};

const EMBERBORN_V1_DEPRECATED: BossVersion = {
  id: 'bv_fire_elemental_v0_1',
  bossId: 'boss_fire_elemental_v0',
  versionNumber: 1,
  status: 'deprecated',
  publishedAt: NOW,
  deprecatedAt: NOW,
  maxHp: 320,
  resistanceProfile: {
    resistant: ['fire'],
    weak: ['holy', 'nature'],
  },
  phases: [
    {
      id: 'phase_fe_teach',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.5,
      passiveDescriptions: ['Emits a low, patient heat.'],
      actions: [
        {
          id: 'act_fe_ember_slash',
          displayName: 'Ember Slash',
          intentType: 'heavy_attack',
          telegraphText: 'The elemental gathers a searing arc.',
          priority: 20,
          cooldownRounds: 1,
          interruptible: false,
          baseDamage: 22,
          scalingPerRound: 0.2,
        },
        {
          id: 'act_fe_flame_burst',
          displayName: 'Flame Burst',
          intentType: 'area_attack',
          telegraphText: 'Waves of heat coil outward.',
          priority: 10,
          cooldownRounds: 2,
          interruptible: false,
          baseDamage: 15,
          scalingPerRound: 0.2,
        },
      ],
    },
    {
      id: 'phase_fe_enrage',
      healthThresholdStart: 0.5,
      healthThresholdEnd: 0.0,
      passiveDescriptions: ['Wisps of white-hot spark flake off with each breath.'],
      actions: [
        {
          id: 'act_fe_infernal_lance',
          displayName: 'Infernal Lance',
          intentType: 'heavy_attack',
          telegraphText: 'A javelin of white flame gathers overhead.',
          priority: 30,
          cooldownRounds: 1,
          interruptible: false,
          baseDamage: 30,
          scalingPerRound: 0.2,
        },
        {
          id: 'act_fe_execute_pyre',
          displayName: 'Execution Pyre',
          intentType: 'execute',
          telegraphText: 'The elemental fixes its gaze — a lethal strike, if you falter.',
          priority: 25,
          cooldownRounds: 3,
          interruptible: false,
          baseDamage: 40,
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/* ---------- Emberborn Wraith v2 (B6 balance pass, 2026-07-18) ----------
 * v1 numbers were beatable in ~11 rounds at 100% by a Forged Mid Barbarian
 * spamming Ember Cleave with no risk. v2 raises each action's baseDamage by
 * ~1.8× so the hero has to actively use Radiant Ward + Guard to survive.
 * v1 stays in the version table with status='deprecated' so any battle
 * snapshotted against it resolves off the frozen numbers.
 */
const EMBERBORN_V2: BossVersion = {
  ...EMBERBORN_V1_DEPRECATED,
  id: 'bv_fire_elemental_v0_2',
  versionNumber: 2,
  status: 'active',
  publishedAt: NOW,
  deprecatedAt: undefined,
  maxHp: 340,
  phases: [
    {
      ...EMBERBORN_V1_DEPRECATED.phases[0],
      actions: [
        { ...EMBERBORN_V1_DEPRECATED.phases[0].actions[0], baseDamage: 40 },
        { ...EMBERBORN_V1_DEPRECATED.phases[0].actions[1], baseDamage: 27 },
      ],
    },
    {
      ...EMBERBORN_V1_DEPRECATED.phases[1],
      actions: [
        { ...EMBERBORN_V1_DEPRECATED.phases[1].actions[0], baseDamage: 54 },
        { ...EMBERBORN_V1_DEPRECATED.phases[1].actions[1], baseDamage: 72 },
      ],
    },
  ],
  updatedAt: NOW,
};

const EMBERBORN_DEF_V2: typeof EMBERBORN_DEF = {
  ...EMBERBORN_DEF,
  currentVersionId: 'bv_fire_elemental_v0_2',
  updatedAt: NOW,
};

export const SEED_BOSSES: SeedBoss[] = [
  { definition: EMBERBORN_DEF_V2, version: EMBERBORN_V2 },
];

/** Legacy versions kept for admin history / snapshot integrity. */
export const SEED_BOSS_LEGACY_VERSIONS: BossVersion[] = [EMBERBORN_V1_DEPRECATED];

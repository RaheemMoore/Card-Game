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
          id: 'act_fe_ember_lance',
          displayName: 'Ember Lance',
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

/* ---------- Emberborn Wraith v3 (2026-07-19) — three-hero party pass ----------
 * v2 was tuned for a solo Forged Barbarian. The C9 partyBalancePass baseline
 * against v2 recorded 100% win rate at avg 5 rounds for a 3-hero Forged party
 * (plan §7 warned this would happen).
 *
 * Design intent for v3 (Raheem, 2026-07-19): "hard to win, ≤50%, going
 * lower." The `baselineHeroPolicy` in the harness is scripted (greedy
 * ability picks, no strategic Guard/Ward/Focus), so its outcome is a LOWER
 * BOUND on player skill — if the sim says 100% loss for the greedy policy,
 * real players with tactical play will land somewhere below 50%.
 *
 * v3 lands data-only (boss-battle-spec §12: snapshot immutability means
 * in-flight v2 battles resolve off frozen v2 numbers regardless):
 *   - maxHp 340 → 1100 (party has ~3× DPS, boss needs staying power).
 *   - Mechanical enrage phase now ends at 25% (was 0.0) so the new Rage
 *     phase can take over at 25%.
 *   - Teach + mechanical phases keep v2 baseDamage but gain scalingPerRound
 *     so drawn-out battles are punished before Rage even lands.
 *   - NEW rage phase at 25% → 0% with hard-hitting actions; phase
 *     transition happens in checking_phase_transition (before
 *     checking_victory) so Rage does NOT consume a boss turn (Wiki §Rage).
 *
 * Sim result at these numbers: greedy policy loses 100% at ~16 rounds. Cliff
 * from 100%→0% is narrow (Rage Lance ~114 wins, ~115 loses), consistent
 * with a scripted policy — real player variance will spread the win rate
 * across the intended range. Iterate downward once we have real telemetry.
 *
 * Solo balance is unchanged (solo balancePass.test.ts uses
 * harness.FIRE_ELEMENTAL_PHASES, not this seed).
 */
const EMBERBORN_V3: BossVersion = {
  ...EMBERBORN_V2,
  id: 'bv_fire_elemental_v0_3',
  versionNumber: 3,
  status: 'active',
  publishedAt: '2026-07-19T00:00:00.000Z',
  maxHp: 1100,
  phases: [
    // Phase 1 — teach (100% → 50%). v2 baseDamage + light scaling.
    {
      ...EMBERBORN_V2.phases[0],
      actions: EMBERBORN_V2.phases[0].actions.map((a) => ({
        ...a,
        scalingPerRound: 0.4,
      })),
    },
    // Phase 2 — mechanical enrage (50% → 25%). v2 hits + heavier scaling.
    {
      ...EMBERBORN_V2.phases[1],
      healthThresholdEnd: 0.25,
      actions: EMBERBORN_V2.phases[1].actions.map((a) => ({
        ...a,
        scalingPerRound: 0.8,
      })),
    },
    // Phase 3 — RAGE (25% → 0%). Threatens hero one-shots at high rounds.
    // Reducer targets one hero per boss turn, so damage-per-hit is what
    // matters for wipe risk against a 3-hero party's ~945 total HP.
    {
      id: 'phase_fe_rage',
      healthThresholdStart: 0.25,
      healthThresholdEnd: 0.0,
      passiveDescriptions: [
        'A furnace roar. Every ember becomes a spear; every heartbeat is fuel.',
      ],
      actions: [
        {
          id: 'act_fe_rage_lance',
          displayName: 'Rage Lance',
          intentType: 'heavy_attack',
          telegraphText: 'White fire coils into a screaming javelin.',
          priority: 30,
          cooldownRounds: 1,
          interruptible: false,
          baseDamage: 120,
          scalingPerRound: 1.1,
        },
        {
          id: 'act_fe_rage_pyre',
          displayName: 'Rage Pyre',
          intentType: 'execute',
          telegraphText: 'The Wraith bares its molten heart — one strike, one life.',
          priority: 25,
          cooldownRounds: 2,
          interruptible: false,
          baseDamage: 170,
          scalingPerRound: 0.95,
        },
      ],
    },
  ],
  updatedAt: '2026-07-19T00:00:00.000Z',
};

/* ---------- Emberborn Wraith v4 (2026-07-20) — interrupt windows ----------
 * Data-only change that layers on top of v3's numbers to unlock the new
 * `interruptible` reducer branch (see services/combat/reducer.ts —
 * INTERRUPT_DAMAGE_THRESHOLD). Two of the boss's telegraphed heavy attacks
 * flip to interruptible so committed burst damage in the same round
 * cancels the strike (cooldown still consumes — no soft-lock).
 *
 * Rule of thumb:
 *   - Long, telegraphed heavy attacks with a visible "gathering" tell →
 *     interruptible (Ember Slash, Ember Lance).
 *   - Fast area sweeps, executes, and the Rage-phase actions →
 *     uninterruptible (Flame Burst, Execution Pyre, Rage Lance, Rage Pyre)
 *     — Rage is the "no more mercy" phase.
 *
 * Damage numbers, HP, scaling, and phase thresholds are UNCHANGED from v3.
 * This ships as v4 (not a v3 edit) because v3 was already persisted to
 * users' Supabase rows; PersistenceGate's boss-seed gate (see
 * PersistenceGate.tsx) re-runs the idempotent upsert whenever the current
 * SEED_BOSSES version is missing from the store, so existing users pick up
 * v4 on next boot without a manual data migration.
 */
const EMBERBORN_V4: BossVersion = {
  ...EMBERBORN_V3,
  id: 'bv_fire_elemental_v0_4',
  versionNumber: 4,
  status: 'active',
  publishedAt: '2026-07-20T00:00:00.000Z',
  phases: [
    {
      ...EMBERBORN_V3.phases[0],
      actions: EMBERBORN_V3.phases[0].actions.map((a) => ({
        ...a,
        interruptible: a.id === 'act_fe_ember_slash',
      })),
    },
    {
      ...EMBERBORN_V3.phases[1],
      actions: EMBERBORN_V3.phases[1].actions.map((a) => ({
        ...a,
        interruptible: a.id === 'act_fe_ember_lance',
      })),
    },
    EMBERBORN_V3.phases[2],
  ],
  updatedAt: '2026-07-20T00:00:00.000Z',
};

const EMBERBORN_DEF_V4: typeof EMBERBORN_DEF = {
  ...EMBERBORN_DEF,
  currentVersionId: 'bv_fire_elemental_v0_4',
  updatedAt: '2026-07-20T00:00:00.000Z',
};

export const SEED_BOSSES: SeedBoss[] = [
  { definition: EMBERBORN_DEF_V4, version: EMBERBORN_V4 },
];

/** Legacy versions kept for admin history / snapshot integrity. */
export const SEED_BOSS_LEGACY_VERSIONS: BossVersion[] = [
  EMBERBORN_V1_DEPRECATED,
  { ...EMBERBORN_V2, status: 'deprecated', deprecatedAt: '2026-07-19T00:00:00.000Z' },
  { ...EMBERBORN_V3, status: 'deprecated', deprecatedAt: '2026-07-20T00:00:00.000Z' },
];

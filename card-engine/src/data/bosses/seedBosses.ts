import type { BossDefinition, BossVersion } from '../../types/bosses';
import { TOWER } from './towerCurve';

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
          damageType: 'fire',
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
          damageType: 'fire',
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
          damageType: 'fire',
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
 * spamming Oathbreaker's Answer with no risk. v2 raises each action's baseDamage by
 * ~1.8× so the hero has to actively use Bearing Witness + Guard to survive.
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
        damageType: 'fire',
      })),
    },
    // Phase 2 — mechanical enrage (50% → 25%). v2 hits + heavier scaling.
    {
      ...EMBERBORN_V2.phases[1],
      healthThresholdEnd: 0.25,
      actions: EMBERBORN_V2.phases[1].actions.map((a) => ({
        ...a,
        scalingPerRound: 0.8,
        damageType: 'fire',
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
          damageType: 'fire',
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
          damageType: 'fire',
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

/* ══════════════════════════════════════════════════════════════════════ */
/*  THE OVERREACH — the champion tower                                    */
/*                                                                        */
/*  Eleven people who walked one archetype's path PAST its end. Each       */
/*  answered that archetype's central question by collapsing its tension   */
/*  instead of carrying it. A player HOLDS the tension; a champion         */
/*  resolved it and could not stop.                                       */
/*                                                                        */
/*  So each champion is that archetype's own Bible §14 avoid-list made     */
/*  flesh — which is exactly why they must read as TRAGIC, never as        */
/*  villains. Necromancer §14 forbids "automatic villainy" outright, and   */
/*  the same restraint applies to all of them.                            */
/*                                                                        */
/*  "Kingdoms and their champions" was the original framing and does not   */
/*  fit: the Bible denies archetypes polity status (Vampire §3 — lineages  */
/*  and Houses "rather than a single nation"), and "champion of a people"  */
/*  reads as a prestige title, which Global Rules §Prestige forbids        */
/*  assigning outside earned narrative. The Emberborn Wraith's own lore    */
/*  already says "those who overreach it swallows whole" — the word was    */
/*  already canon.                                                        */
/*                                                                        */
/*  Each champion applies ONE pressure that a different hero tool answers, */
/*  so ascending is about bringing the right party, not the strongest.     */
/*  Three are authored here; the numbers come from the tower curve in      */
/*  data/bosses/towerCurve.ts and are validated against the harness before */
/*  the remaining eight are written.                                       */
/* ══════════════════════════════════════════════════════════════════════ */

/* ---------- Floor 1 · The Debt-Bearer (Barbarian) ----------
 * Pressure B — escalating single-target focus. Answered by taunt + guard.
 * The teaching floor: one target, one growing threat, an obvious answer.
 * §14 check: named for a LEDGER, not for fury. The Barbarian's power is
 * memory and endurance; feral vocabulary belongs to the Lycanthrope. */

const DEBT_BEARER_DEF: BossDefinition = {
  id: 'boss_champion_barbarian',
  slug: 'the-debt-bearer',
  name: 'The Debt-Bearer',
  lore:
    'Every technique she was given, she wrote down as something owed. She meant to repay it by carrying it forward — and then the ledger grew longer than the life, and there was no one left to repay. She still counts. She will count through you.',
  familyIds: ['martial'],
  currentVersionId: 'bv_champion_barbarian_1',
  status: 'active',
  artAssetIds: [],
  bossKind: 'champion',
  mirrorArchetype: 'Barbarian',
  towerFloor: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const DEBT_BEARER_V1: BossVersion = {
  id: 'bv_champion_barbarian_1',
  bossId: 'boss_champion_barbarian',
  versionNumber: 1,
  status: 'active',
  publishedAt: NOW,
  maxHp: TOWER.hp(1),
  // Inheritance is not elemental. She is answered by defence, not by typing.
  resistanceProfile: { resistant: [], weak: [] },
  phases: [
    {
      id: 'phase_debt_counting',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.45,
      passiveDescriptions: ['She names each strike before she throws it.'],
      actions: [
        {
          id: 'act_debt_owed',
          displayName: 'What Is Owed',
          intentType: 'heavy_attack',
          telegraphText: 'She names a debt and steps in to collect it.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: TOWER.damage(1),
          scalingPerRound: TOWER.scaling(1),
          damageType: 'physical',
        },
      ],
    },
    {
      id: 'phase_debt_calling_in',
      healthThresholdStart: 0.45,
      healthThresholdEnd: 0,
      passiveDescriptions: ['The counting stops. She has reached the total.'],
      actions: [
        {
          id: 'act_debt_total',
          displayName: 'The Whole Sum',
          intentType: 'heavy_attack',
          telegraphText: 'She stops counting. This one is for all of it.',
          priority: 30,
          cooldownRounds: 1,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(1) * 1.6),
          scalingPerRound: TOWER.scaling(1),
          damageType: 'physical',
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/* ---------- Floor 2 · The Still Season (Druid) ----------
 * Pressure F — regeneration outheals chip damage. Answered by DoT, which
 * ticks through healing, and by `weakened`.
 * §14 check: nature is not decoration here and there is no companion — the
 * Druid IS the terrain, and this one stopped it. */

const STILL_SEASON_DEF: BossDefinition = {
  id: 'boss_champion_druid',
  slug: 'the-still-season',
  name: 'The Still Season',
  lore:
    'He was asked to keep the grove through a hard winter. He kept it. He is keeping it still — the same afternoon, held open, every leaf where it was. Nothing here has died in a long time. Nothing here has grown either.',
  familyIds: ['nature'],
  currentVersionId: 'bv_champion_druid_1',
  status: 'active',
  artAssetIds: [],
  bossKind: 'champion',
  mirrorArchetype: 'Druid',
  towerFloor: 2,
  createdAt: NOW,
  updatedAt: NOW,
};

const STILL_SEASON_V1: BossVersion = {
  id: 'bv_champion_druid_1',
  bossId: 'boss_champion_druid',
  versionNumber: 1,
  status: 'active',
  publishedAt: NOW,
  maxHp: TOWER.hp(2),
  // He IS the grove, so the growing world cannot be turned against him —
  // which deliberately blunts poison, the obvious damage-over-time answer.
  //
  // TWO answers, not one. Fire is the change he has been preventing, and burn
  // ticks through regeneration exactly as poison would. Tech is the other:
  // the engineered and the sterile owe nothing to a season and are not held by
  // it. A single-answer floor is a wall rather than a puzzle, and this is
  // floor 2 — early floors should have several ways through and narrow as the
  // tower rises. See TOWER_ANSWER_BUDGET in towerCurve.ts.
  resistanceProfile: { resistant: ['nature'], weak: ['fire', 'tech'] },
  phases: [
    {
      id: 'phase_season_held',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.5,
      passiveDescriptions: ['What is cut closes over before you look away.'],
      // The pressure. A party that only chips will never finish him.
      passiveStatuses: [{ statusId: 'regeneration', duration: 999, stacks: 2 }],
      actions: [
        {
          id: 'act_season_hold',
          displayName: 'Hold the Afternoon',
          intentType: 'heavy_attack',
          telegraphText: 'The light stops moving across the grove floor.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(2) * 0.85),
          scalingPerRound: TOWER.scaling(2),
          damageType: 'nature',
        },
      ],
    },
    {
      id: 'phase_season_turning',
      healthThresholdStart: 0.5,
      healthThresholdEnd: 0,
      passiveDescriptions: ['Something has begun to turn, and he is fighting it.'],
      passiveStatuses: [{ statusId: 'regeneration', duration: 999, stacks: 3 }],
      actions: [
        {
          id: 'act_season_root',
          displayName: 'Everything Held Back',
          intentType: 'area_attack',
          telegraphText: 'A whole season of growth arrives at once.',
          priority: 30,
          cooldownRounds: 2,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(2) * 0.6),
          scalingPerRound: TOWER.scaling(2),
          damageType: 'nature',
        },
        {
          id: 'act_season_close',
          displayName: 'Close Over',
          intentType: 'heavy_attack',
          telegraphText: 'He turns his attention to the wound.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(2) * 0.85),
          scalingPerRound: TOWER.scaling(2),
          damageType: 'nature',
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/* ---------- Floor 3 · The Unclosed Summons (Seraph) ----------
 * Pressure A — hits the WHOLE party, every round. Answered by group
 * regeneration and barrier; taunt and guard are traps, because there is
 * nobody to pull the blow away from.
 *
 * BALANCED-PARALYSIS, NOT FALLEN. A Fallen champion would double-book the
 * corruption arc and spend Infernal, which is Fallen-Seraph-exclusive TO
 * PLAYERS. Her collapse is refusing to let the axis resolve at all — she is
 * still standing in the summons, holding both answers, forever.
 * §14 check: no cartoonish evil signalling. She is not fallen. She is stuck. */

const UNCLOSED_SUMMONS_DEF: BossDefinition = {
  id: 'boss_champion_seraph',
  slug: 'the-unclosed-summons',
  name: 'The Unclosed Summons',
  lore:
    'She was called, and she answered, and then she was asked to choose what the answer meant. She has not chosen. She stands in the open summons with both replies still in her mouth, and the light that came for her has nowhere to go, so it goes everywhere.',
  familyIds: ['holy'],
  currentVersionId: 'bv_champion_seraph_1',
  status: 'active',
  artAssetIds: [],
  bossKind: 'champion',
  mirrorArchetype: 'Seraph',
  towerFloor: 3,
  createdAt: NOW,
  updatedAt: NOW,
};

const UNCLOSED_SUMMONS_V1: BossVersion = {
  id: 'bv_champion_seraph_1',
  bossId: 'boss_champion_seraph',
  versionNumber: 1,
  status: 'active',
  publishedAt: NOW,
  maxHp: TOWER.hp(3),
  // Unresolved light: holy passes through her without meaning anything,
  // and the answer is the profane thing she never chose.
  resistanceProfile: { resistant: ['holy'], weak: ['shadow'] },
  phases: [
    {
      id: 'phase_summons_held',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.55,
      passiveDescriptions: ['The light does not fall on anyone in particular.'],
      actions: [
        {
          id: 'act_summons_everywhere',
          displayName: 'Nowhere To Go',
          intentType: 'area_attack',
          telegraphText: 'The light rises with no direction to fall in.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(3) * 0.55),
          scalingPerRound: TOWER.scaling(3),
          damageType: 'holy',
        },
      ],
    },
    {
      id: 'phase_summons_pressing',
      healthThresholdStart: 0.55,
      healthThresholdEnd: 0,
      passiveDescriptions: ['She is being asked again, and again she does not answer.'],
      actions: [
        {
          id: 'act_summons_asked',
          displayName: 'Asked Again',
          intentType: 'shield',
          telegraphText: 'She draws the summons closed around herself.',
          priority: 30,
          cooldownRounds: 3,
          interruptible: false,
          baseDamage: 0,
          scalingPerRound: 0,
          damageType: 'holy',
          shieldAmount: Math.round(TOWER.hp(3) * 0.12),
          shieldDurationRounds: 2,
        },
        {
          id: 'act_summons_unanswered',
          displayName: 'Still Unanswered',
          intentType: 'area_attack',
          telegraphText: 'The whole unspent summons breaks over the room.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(3) * 0.7),
          scalingPerRound: TOWER.scaling(3),
          damageType: 'holy',
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

export const SEED_BOSSES: SeedBoss[] = [
  // Floor 0 — the gatekeeper. Elemental, not archetypal: a force rather than
  // a person, which is why it is not one of The Overreach. Its lore already
  // teaches measured strikes, and it is the only boss with finished art.
  { definition: EMBERBORN_DEF_V4, version: EMBERBORN_V4 },
  { definition: DEBT_BEARER_DEF, version: DEBT_BEARER_V1 },
  { definition: STILL_SEASON_DEF, version: STILL_SEASON_V1 },
  { definition: UNCLOSED_SUMMONS_DEF, version: UNCLOSED_SUMMONS_V1 },
];

/** Legacy versions kept for admin history / snapshot integrity. */
export const SEED_BOSS_LEGACY_VERSIONS: BossVersion[] = [
  EMBERBORN_V1_DEPRECATED,
  { ...EMBERBORN_V2, status: 'deprecated', deprecatedAt: '2026-07-19T00:00:00.000Z' },
  { ...EMBERBORN_V3, status: 'deprecated', deprecatedAt: '2026-07-20T00:00:00.000Z' },
];

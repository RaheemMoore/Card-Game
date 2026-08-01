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
  /**
   * RETIRED 2026-07-30. It was the C5-era placeholder boss and has been
   * superseded by the Overreach champions, which are archetype-mirrored and
   * carry the tower's difficulty curve.
   *
   * Kept in the seed rather than deleted: its `battleId`-keyed reward rows and
   * any historical ledger entries still reference this id, and the Picker
   * already filters on `status === 'active'`, so retiring is enough to remove
   * it from play without orphaning history.
   */
  status: 'retired',
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
    resistant: ['searing'],
    weak: ['radiant', 'primal'],
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
          damageType: 'searing',
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
          damageType: 'searing',
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
          damageType: 'searing',
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
        damageType: 'searing',
      })),
    },
    // Phase 2 — mechanical enrage (50% → 25%). v2 hits + heavier scaling.
    {
      ...EMBERBORN_V2.phases[1],
      healthThresholdEnd: 0.25,
      actions: EMBERBORN_V2.phases[1].actions.map((a) => ({
        ...a,
        scalingPerRound: 0.8,
        damageType: 'searing',
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
          damageType: 'searing',
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
          damageType: 'searing',
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
    'Every technique he was given, he wrote down as something owed. He meant to repay it by carrying it forward — and then the ledger grew longer than the life, and there was no one left to repay. He still counts. He will count through you.',
  familyIds: ['martial'],
  currentVersionId: 'bv_champion_barbarian_3',
  status: 'active',
  artAssetIds: [],
  bossKind: 'champion',
  mirrorArchetype: 'Barbarian',
  // His own home ground, replacing the shared fire arena he was borrowing.
  arenaId: 'barbarian_moot_ground',
  towerFloor: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

/**
 * v1 — the original two-action fight, one heavy attack per phase.
 *
 * Superseded by v2 but kept, and kept SEPARATE rather than edited in place.
 * `PersistenceGate` only re-seeds a boss when a shipped version id is MISSING
 * from the store, so adding actions to an existing id ships nothing: every
 * user who has already played keeps the old row forever. The Emberborn Wraith
 * established the convention (v1 -> v4); this version exists because the
 * Debt-Bearer's new moveset was briefly written INTO v1 and therefore never
 * reached the deployed preview at all.
 */
const DEBT_BEARER_V1: BossVersion = {
  id: 'bv_champion_barbarian_1',
  bossId: 'boss_champion_barbarian',
  versionNumber: 1,
  status: 'deprecated',
  publishedAt: NOW,
  maxHp: TOWER.hp(1),
  // Inheritance is not elemental. He is answered by defence, not by typing.
  /**
   * Floor 1 owes the player THREE answers (towerCurve answerBudget) and an
   * ~85% target win rate, so this is deliberately the most forgiving profile
   * in the tower.
   *
   * He resists fire because he is wreathed in it — burning the burning thing
   * is the mistake the fight is there to teach.
   *
   * Physical is left NEUTRAL, not weak. It is by far the most common hero
   * damage type, so making it weak would not reward a choice, it would just
   * lower the floor for everyone. The three real answers are holy and shadow
   * (both cancel a debt, from opposite directions) and tech (precision undoes
   * brute mass).
   */
  resistanceProfile: { resistant: ['searing'], weak: ['radiant', 'umbral', 'tech'] },
  phases: [
    {
      id: 'phase_debt_counting',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.45,
      passiveDescriptions: ['He names each strike before he throws it.'],
      actions: [
        {
          id: 'act_debt_owed',
          displayName: 'What Is Owed',
          intentType: 'heavy_attack',
          telegraphText: 'He names a debt and steps in to collect it.',
          priority: 20,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: TOWER.damage(1),
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
        },
      ],
    },
    {
      id: 'phase_debt_calling_in',
      healthThresholdStart: 0.45,
      healthThresholdEnd: 0,
      passiveDescriptions: ['The counting stops. He has reached the total.'],
      actions: [
        {
          id: 'act_debt_total',
          displayName: 'The Whole Sum',
          intentType: 'heavy_attack',
          telegraphText: 'He stops counting. This one is for all of it.',
          priority: 30,
          cooldownRounds: 1,
          interruptible: true,
          baseDamage: Math.round(TOWER.damage(1) * 1.6),
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/* ---------- The Debt-Bearer v2 (2026-07-30) — a real moveset ----------
 * Adds the two actions that make floor 1 a fight rather than one repeated
 * punch, and ships as a NEW VERSION so deployed users actually receive it.
 *
 *   Running the Tally (enrage_prep) — forfeits a turn for four rounds of rage.
 *     Near-neutral in expected value ON PURPOSE: it teaches the player to read
 *     the banner, because higher floors use the same intent for hits that
 *     genuinely hurt.
 *
 *   The Whole Ledger (charged ultimate) — declared, then lands on the WHOLE
 *     party two rounds later unless the party deals 18% of his max HP inside
 *     the window. Partial progress scales the damage down, so pushing on the
 *     bar always pays.
 *
 * Verified by instrumenting the balance sweep to count declared intents: Tally
 * fires once per battle, the Ledger twice, and floor 1 lands at 5 of 6 party
 * compositions clearing against its 0.85 target.
 */
const DEBT_BEARER_V2: BossVersion = {
  ...DEBT_BEARER_V1,
  id: 'bv_champion_barbarian_2',
  versionNumber: 2,
  status: 'active',
  publishedAt: '2026-07-30T00:00:00.000Z',
  deprecatedAt: undefined,
  // Phase 1 gains the tally; phase 2 gains the charged ultimate. Built by
  // extending v1's phases rather than restating them, so a later change to a
  // shared action cannot silently apply to only one version.
  phases: [
    {
      ...DEBT_BEARER_V1.phases[0],
      actions: [
        ...DEBT_BEARER_V1.phases[0].actions,
        {
          /**
           * He stops to add something up, and the next blows are worse for it.
           *
           * Deliberately near-neutral in expected value: he forfeits a turn
           * (~62 damage) to gain four rounds at +30% (~+74). It is not here to
           * raise the difficulty of floor 1 — it is here to teach the player
           * to READ THE BANNER, because floors 4+ use the same intent to set
           * up hits that genuinely hurt.
           *
           * `enrage_prep` was one of the six intents that did nothing until
           * this pass; it also needed the `strike()` fix, because the boss's
           * own statuses were being discarded when its damage was computed.
           */
          id: 'act_debt_tally',
          displayName: 'Running the Tally',
          intentType: 'enrage_prep',
          telegraphText: 'He pauses, and adds something up.',
          priority: 25,
          // Long, so it is a rhythm the player learns rather than a state he
          // sits in permanently.
          cooldownRounds: 5,
          interruptible: false,
          baseDamage: 0,
          scalingPerRound: 0,
          damageType: 'kinetic',
          selfStatuses: [{ statusId: 'rage', duration: 4, stacks: 2 }],
        },
      ],
    },
    {
      ...DEBT_BEARER_V1.phases[1],
      actions: [
        ...DEBT_BEARER_V1.phases[1].actions,
        {
          /**
           * THE WHOLE LEDGER — the fight's centrepiece, and the first charged
           * action in the game.
           *
           * He spends a turn declaring it, then it lands two rounds later on
           * the WHOLE party. The forfeited turn is its price; without that it
           * would be strictly better than attacking.
           *
           * The break is cumulative damage, not a single burst: 18% of his max
           * HP over the two-round window. Against a party doing roughly
           * 137/round that is ~248 needed out of ~274 available — reachable,
           * but only by spending BOTH rounds attacking rather than healing.
           * That choice is the mechanic.
           *
           * `partialMitigationMax: 0.6` is what stops it being a coin flip: a
           * party that gets most of the way there takes meaningfully less,
           * so pushing on the bar always pays even when it does not break.
           *
           * `interruptible: false` on purpose — that flag is the SINGLE-round
           * burst check, and an action carrying both collapses to whichever is
           * weaker.
           */
          id: 'act_debt_ledger',
          displayName: 'The Whole Ledger',
          intentType: 'ultimate',
          telegraphText: 'He opens the ledger at the first page. Every name is going to be read.',
          priority: 35,
          cooldownRounds: 4,
          interruptible: false,
          targetScope: 'all_heroes',
          baseDamage: 55,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          charge: {
            rounds: 2,
            break: { kind: 'damage', percentOfMaxHp: 0.18 },
            partialMitigationMax: 0.6,
          },
        },
      ],
    },
  ],
};
/* ---------- The Debt-Bearer v3 (2026-07-31) — the fight becomes a puzzle ----
 * v2 had four actions but played as one. Two reasons, both fixed in this pass:
 * the reducer always declared against party slot 0 (so one card absorbed the
 * entire fight), and it always took the highest-priority action off cooldown
 * (so the rotation never varied). With `heroesInScope` and the weighted picker
 * in place, an authored moveset can finally be felt.
 *
 * NINE actions, split 5/4 across the phases: a basic, three regular moves, a
 * self power-up, a shield, and three ultimates. Selection is hybrid — anything
 * at priority >= 30 (the three ultimates, and only those) fires the moment it
 * is available, so the party can plan against the moves that end fights;
 * everything below, the shield included, is a weighted seeded draw, so the
 * rest of the rotation never settles into a loop. The shield sits at 28
 * deliberately: it is the one big move that should be able to surprise you,
 * because its whole job is arriving when the party has committed to burst.
 *
 * SIZING. Party pool 960 HP across three Forged heroes, ~137 damage/round out,
 * flat per-hit mitigation averaging 11.3. Two consequences drive every number
 * below:
 *   - Mitigation is FLAT and PER HIT, so an AoE splitting 62 three ways
 *     delivers 3 x (21 - 11) = 30 net, losing over half the budget. Every
 *     sweep here is grossed up for that; they are not "62 shared out".
 *   - The interrupt bar is 15% of 1380 = 207 in ONE round, and the Ledger's
 *     charge break is 18% = 248 across two. Both sit just inside what the
 *     party can produce, which is what makes them decisions rather than
 *     formalities.
 *
 * Floor 1 is deliberately tuned HOTTER than towerCurve's 0.85: Raheem approved
 * a 0.65-0.70 target so the first floor teaches by threatening. The curve still
 * owns floors 2+.
 *
 * THREE WINNING LINES, and the numbers must support each on its own:
 *   1. Taunt-and-outlast — a tank holds taunt on the rounds Seize and Final
 *      Demand are live; taunt outranks `lowest_hp` in the retarget chain.
 *   2. Burst-and-interrupt — clear 207 in a round to deny, 248 over two to
 *      break the Ledger. The shield is this line's deliberate counter-puzzle:
 *      for two rounds, burst buys nothing.
 *   3. Control-and-sustain — two heroes guard on one round to break First
 *      Notice outright, healing keeps everyone above the 35% execute floor,
 *      cleanse strips bleed and weakened.
 */
const DEBT_BEARER_V3: BossVersion = {
  ...DEBT_BEARER_V2,
  id: 'bv_champion_barbarian_3',
  versionNumber: 3,
  status: 'active',
  publishedAt: '2026-07-31T00:00:00.000Z',
  deprecatedAt: undefined,
  phases: [
    {
      id: 'phase_debt_counting',
      // Moved from 0.45 to 0.55 so phase 1 is long enough to run a full
      // Tally -> First Notice arc before the floor changes under the player.
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.55,
      passiveDescriptions: ['He names each strike before he throws it.'],
      actions: [
        {
          /** The basic. Deliberately UNDER budget — it is the thing that
           *  happens when nothing more interesting is off cooldown, and it
           *  should feel like a reprieve. */
          id: 'act_debt_collect',
          displayName: 'What Is Owed',
          intentType: 'heavy_attack',
          telegraphText: 'He names a debt and steps in to collect it.',
          priority: 5,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: 58,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          weight: 3,
        },
        {
          /** Interest accrues on everyone. The sweep itself is small; the
           *  bleed behind it is the actual pressure, and it ticks through
           *  healing the way a debt accrues through good intentions.
           *  Answered by cleanse, or by outpacing it. */
          id: 'act_debt_interest',
          displayName: 'Interest Accrues',
          intentType: 'curse',
          telegraphText: 'He adds to what each of you already owes.',
          priority: 20,
          cooldownRounds: 3,
          interruptible: true,
          targetScope: 'all_heroes',
          baseDamage: 38,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          statusApplications: [
            { statusId: 'bleed', duration: 2, stacks: 1, amountPerTick: 7, damageType: 'kinetic' },
          ],
          weight: 2,
        },
        {
          /** Goes for the hero least able to take it, and leaves them less
           *  able to answer. `lowest_hp` is honoured by the retarget chain
           *  ONLY when nobody is taunting — standing in front of this is the
           *  whole counterplay, and the reason the tank line works. */
          id: 'act_debt_seize',
          displayName: 'Seize the Weakest Claim',
          intentType: 'heavy_attack',
          telegraphText: 'He looks for whoever is least able to pay.',
          priority: 15,
          cooldownRounds: 2,
          interruptible: true,
          targetScope: 'lowest_hp',
          baseDamage: 78,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          statusApplications: [{ statusId: 'weakened', duration: 2, stacks: 1 }],
          weight: 2,
        },
        {
          /** The self power-up, unchanged from v2 in shape but now genuinely
           *  a read: it forfeits a turn, so its value depends entirely on
           *  whether the party lets it land inside an ultimate window. */
          id: 'act_debt_tally',
          displayName: 'Running the Tally',
          intentType: 'enrage_prep',
          telegraphText: 'He pauses, and adds something up.',
          priority: 25,
          cooldownRounds: 4,
          interruptible: false,
          baseDamage: 0,
          scalingPerRound: 0,
          damageType: 'kinetic',
          selfStatuses: [{ statusId: 'rage', duration: 3, stacks: 2 }],
          // 2, not 1: at weight 1 the sweep showed it declared 0.21 times per
          // battle — a move the player would essentially never meet, and so
          // never learn to read before floors 4+ start using the same intent
          // to set up hits that hurt.
          weight: 2,
        },
        {
          /** ULTIMATE 1. Charged like the Ledger, but broken by BEHAVIOUR
           *  rather than damage: two heroes guarding in the same round. A
           *  party that can only answer with damage cannot answer this one,
           *  which is exactly why it is here — it is the reason the
           *  control-and-sustain line exists at all. */
          id: 'act_debt_first_notice',
          displayName: 'First Notice',
          intentType: 'ultimate',
          telegraphText: 'He reads the first name aloud. There is time to brace, and only time to brace.',
          priority: 30,
          cooldownRounds: 5,
          interruptible: false,
          targetScope: 'all_heroes',
          baseDamage: 120,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          charge: {
            rounds: 2,
            break: { kind: 'party_action', action: 'guard', heroCount: 2 },
            partialMitigationMax: 0.6,
          },
        },
      ],
    },
    {
      id: 'phase_debt_calling_in',
      healthThresholdStart: 0.55,
      healthThresholdEnd: 0,
      passiveDescriptions: ['The counting stops. He has reached the total.'],
      actions: [
        {
          /** v1's action, retuned DOWN from 1.6x budget to 1.0x. At 1.6x it
           *  was the entire phase; now it is the filler the phase falls back
           *  to between the shield and the two ultimates. */
          id: 'act_debt_whole_sum',
          displayName: 'The Whole Sum',
          intentType: 'heavy_attack',
          telegraphText: 'He stops counting. This one is for all of it.',
          priority: 12,
          cooldownRounds: 1,
          interruptible: true,
          baseDamage: 88,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          weight: 3,
        },
        {
          /** THE SHIELD, and the counter-puzzle to the burst line. 165 absorb
           *  is 12% of his max HP: while it holds, the party cannot clear the
           *  207 interrupt bar underneath it, so for two rounds interrupts
           *  simply do not exist. It carries chip damage so it is not a free
           *  turn for either side. */
          id: 'act_debt_shield',
          displayName: 'Close the Books',
          intentType: 'shield',
          telegraphText: 'He closes the ledger around himself. Nothing is getting through the cover.',
          priority: 28,
          cooldownRounds: 5,
          interruptible: true,
          baseDamage: 34,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          shieldAmount: 165,
          shieldDurationRounds: 2,
        },
        {
          /** ULTIMATE 2 — v2's centrepiece, base cut 55 -> 44. At 55 it landed
           *  ~132 net in a single round, 14% of the party's whole pool, and
           *  that was before this version gave him eight other things to do. */
          id: 'act_debt_ledger',
          displayName: 'The Whole Ledger',
          intentType: 'ultimate',
          telegraphText: 'He opens the ledger at the first page. Every name is going to be read.',
          priority: 35,
          cooldownRounds: 4,
          interruptible: false,
          targetScope: 'all_heroes',
          baseDamage: 135,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          charge: {
            rounds: 2,
            // 0.28, not v2's 0.18. At 18% the bar was 248 damage across a
            // window in which the party freely produces ~300, so it broke
            // EVERY time: instrumenting a 300-battle sweep found the Ledger
            // dealing 1.1% of all boss damage and killing nobody, while being
            // declared twice per fight. The centrepiece of the fight was a
            // free turn. 0.28 is 386 — more than the party makes while also
            // healing, so stopping it now costs them the rounds it should.
            break: { kind: 'damage', percentOfMaxHp: 0.28 },
            partialMitigationMax: 0.6,
          },
        },
        {
          /** ULTIMATE 3 — the closer. ~35 net against a healthy hero, but
           *  2.2x below 35% HP, which is lethal to anyone the party left
           *  wounded. `interruptible: true` ON PURPOSE: unlike the two charged
           *  ultimates, this one CAN be answered with raw burst, so the three
           *  ultimates between them demand three different answers. */
          id: 'act_debt_final_demand',
          displayName: 'Final Demand',
          intentType: 'execute',
          telegraphText: 'He finds the name with the smallest balance left, and closes the account.',
          priority: 32,
          cooldownRounds: 3,
          interruptible: true,
          targetScope: 'lowest_hp',
          baseDamage: 130,
          scalingPerRound: TOWER.scaling(1),
          damageType: 'kinetic',
          executeThresholdPercent: 0.35,
          executeMultiplier: 2.2,
        },
      ],
    },
  ],
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
  currentVersionId: 'bv_champion_druid_2',
  status: 'active',
  artAssetIds: [],
  bossKind: 'champion',
  mirrorArchetype: 'Druid',
  arenaId: 'still_season_grove',
  towerFloor: 2,
  createdAt: NOW,
  updatedAt: NOW,
};

const STILL_SEASON_V1: BossVersion = {
  id: 'bv_champion_druid_1',
  bossId: 'boss_champion_druid',
  versionNumber: 1,
  status: 'deprecated',
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
  resistanceProfile: { resistant: ['primal'], weak: ['searing', 'tech'] },
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
          damageType: 'primal',
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
          damageType: 'primal',
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
          damageType: 'primal',
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: NOW,
};

/* ---------- The Still Season v2 (fight design pass, 2026-07-31) ------------
 *
 * v1 was a stub and it played like one: phase 1 held a SINGLE action on a
 * zero cooldown against a single target, so the first half of the fight was
 * one button pressed at one hero. Raheem's note — "I don't want to just hit
 * play repeatedly", "I don't want the boss to just target one character the
 * whole time", "a move set that confuses people and encourages people to try
 * new things" — is the brief this version answers.
 *
 * FOUR THINGS IN v1's OWN COMMENTS WERE FACTUALLY WRONG, and finding them is
 * why this took a design pass rather than an edit:
 *
 *  1. It claimed fire/burn was an answer. NOTHING IN THE GAME APPLIES `burn`.
 *     `searing` is reachable only through an element-typed core ability on a
 *     Fire-element Barbarian or Monk.
 *  2. It claimed damage-over-time was the answer his regeneration invited.
 *     The only shipped DoTs are `bleed` (kinetic, neutral) and `poison` —
 *     which is `primal`, and therefore HALVED by his own resistance. The
 *     stated counterplay was the one thing he was immune to.
 *  3. A "he heals less as he breaks" arc is IMPOSSIBLE with phase passives.
 *     `applyPhasePassives` never clears the previous phase's statuses, and
 *     `regeneration` refreshes with Math.max on both stacks and duration, so
 *     a passive can only ever ratchet UP. Hence: this version runs ZERO
 *     passives and makes healing an ACTION HE SPENDS A TURN ON.
 *  4. `weakened` does not blunt regeneration — it is a −25% OUTGOING modifier
 *     and never touches `applyRegeneration`.
 *
 * WHAT MAKES HIM HARDER THAN FLOOR 1 IN KIND, NOT DEGREE.
 * The Debt-Bearer is a damage race with two brace checks: out-DPS her. Every
 * mechanic there answers "more output". The Still Season is a TEMPO race —
 * his effective HP is not a number, it is `maxHp + 23 × stacks × (the rounds
 * you let him keep the heal)`. Every mechanic asks WHEN, not HOW MUCH. It
 * invalidates all three of floor 1's winning lines in turn: taunt fails
 * against `highest_hp`, burst fails against the shield window, and sustain
 * fails because healing a hero to full paints them as the next target.
 *
 * THREE SECRETS, all readable from telegraph text without a wiki:
 *
 *  A. POISON CHOKES WHAT ITS DAMAGE CANNOT HURT. He halves primal DAMAGE, but
 *     `evaluateChargeProgress` for a `status` break counts STACKS, not damage.
 *     So the archetypes his resistance otherwise walls out are exactly the
 *     ones who can break his ultimate. That is the compensating hook that
 *     stops `resistant: ['primal']` being a flat wall for a third of the
 *     roster.
 *  B. HE HEALS ON HIS OWN TURN, AND THAT TURN IS STEALABLE. `act_season_close`
 *     is `interruptible`, so 15% of his max HP in the declare round denies the
 *     heal outright and puts it on cooldown. `act_season_thicket` exists to
 *     make that impossible for two rounds, so burst has to be banked.
 *  C. THERE IS NO SAFE HP BAND. `act_season_prune` hunts the HIGHEST hp hero
 *     and — this is engine behaviour, see the note on that action — CANNOT be
 *     intercepted by taunt. Deadfall and Last Leaf hunt the lowest. The right
 *     play is keeping the party LEVEL, which is the opposite of what floor 1
 *     teaches. A fourth, unstated: phase 3 has no heal in its list at all, so
 *     a party losing the attrition race wins by surviving into it.
 *
 * APPROVED BY RAHEEM 2026-07-31, as deliberate deviations from the curve:
 *   - 11–14 rounds vs TOWER_TARGET_ROUNDS = 10 (this is the attrition floor).
 *   - 0.55–0.68 win rate vs TOWER.targetWinRate(2) = 0.82. NOTE: this is the
 *     SECOND consecutive floor to deviate, so `targetWinRate` is drifting out
 *     of touch with what we actually ship and wants re-basing before floor 5.
 *   - `umbral` as the third answer over `astral`. VERIFIED REACHABLE before
 *     authoring — nine elements map to umbral (Shadow, Void, Blood, Bone,
 *     Nocturne, Sanguine, Dream, Psychic, Infernal) and two seeded abilities
 *     deal it directly. Astral is Monk-exclusive and would have handed a rare
 *     element a tower key. Checking reachability is the direct lesson of
 *     mistakes 1 and 2 above.
 *
 * NOT AUTHORED, because the reducer does not implement them: `cleanse` and
 * `summon` intents fall through to plain heavy_attack, boss-side `thorns` is
 * hero-only, and a `dispel` charge break is unbeatable because every shipped
 * remove_status effect is category 'negative' (self-cleanse only).
 */

const SEASON_SCALING = TOWER.scaling(2);

/**
 * THE SINGLE DIFFICULTY DIAL for this fight, and it is deliberately one number.
 *
 * The win-rate cliff here is violently steep: at 1.00 the simulated baseline
 * party won 4.7% of 300 battles, and at 0.73 it won 97.7% — a ~27% damage swing
 * covering essentially the entire outcome space. With eleven separately-tuned
 * damage numbers that cliff is invisible and every retune is a guess across
 * eleven dimensions at once.
 *
 * So the per-action multipliers below encode the fight's SHAPE (which move
 * hurts more than which), and this constant encodes its PRESSURE. Retune this
 * first, alone, and only touch an individual multiplier when one specific move
 * is wrong relative to the others.
 *
 * If the fight ever needs to be made longer rather than harder, the lever is
 * `act_season_close`'s regeneration stacks, not this and not maxHp — his
 * effective HP is a function of how many heal turns the party lets him keep.
 */
const SEASON_PRESSURE = 0.86;

const seasonDmg = (mult: number) => Math.round(TOWER.damage(2) * mult * SEASON_PRESSURE);

const STILL_SEASON_V2: BossVersion = {
  id: 'bv_champion_druid_2',
  bossId: 'boss_champion_druid',
  versionNumber: 2,
  status: 'active',
  publishedAt: '2026-07-31T00:00:00.000Z',
  maxHp: TOWER.hp(2),
  /**
   * THREE answers, because `answerBudget(2) === 3` and v1 only had two real
   * ones. `kinetic` is deliberately NOT weak — it is the most common type in
   * the game and rewards no choice at all, the same reasoning the Debt-Bearer
   * records.
   *
   * searing — fire is the change he has been preventing.
   * tech    — the engineered owes nothing to a season and is not held by one.
   * umbral  — decay and endings, against a man who refuses to let anything end.
   */
  resistanceProfile: { resistant: ['primal'], weak: ['searing', 'tech', 'umbral'] },
  phases: [
    {
      id: 'phase_season_held',
      healthThresholdStart: 1.0,
      healthThresholdEnd: 0.62,
      // NO passives. See note 3 above — a phase passive can never be taken
      // away, so all of his healing is an action he has to spend a turn on.
      passiveStatuses: [],
      passiveDescriptions: ['What is cut closes over before you look away.'],
      actions: [
        {
          id: 'act_season_hold',
          displayName: 'Hold the Afternoon',
          intentType: 'heavy_attack',
          telegraphText: 'The light stops moving across the grove floor.',
          priority: 5,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: seasonDmg(0.95),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
        },
        {
          id: 'act_season_stillness',
          displayName: 'The Air Does Not Move',
          intentType: 'curse',
          telegraphText: 'Nothing in the grove is moving. Neither are you.',
          priority: 18,
          cooldownRounds: 3,
          interruptible: true,
          baseDamage: seasonDmg(0.38),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          statusApplications: [{ statusId: 'weakened', duration: 2 }],
        },
        {
          /**
           * HUNTS THE HEALTHIEST HERO, AND TAUNT CANNOT STOP IT.
           * `heroesInScope` ignores the taunt anchor for `highest_hp`
           * (reducer.ts) — that is pre-existing engine behaviour, and this
           * action is the first thing in the game to make it load-bearing, so
           * it is written down here rather than left as a surprise.
           *
           * This is what breaks floor 1's "the tank stands in front of
           * everything" heuristic: topping a hero to full PAINTS them, and the
           * hit carries a stun that costs their next ability action.
           */
          id: 'act_season_prune',
          displayName: 'What Grew Too Fast',
          intentType: 'heavy_attack',
          telegraphText: 'He looks for whatever has grown since he last looked.',
          priority: 15,
          cooldownRounds: 2,
          interruptible: true,
          baseDamage: seasonDmg(1.30),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'highest_hp',
          statusApplications: [{ statusId: 'stunned', duration: 1 }],
        },
        {
          /**
           * THE HEAL, AND THE FIGHT'S CENTRAL DECISION.
           * Interruptible on purpose: 15% of his max HP during the declare
           * round denies it outright and puts it on cooldown. His effective HP
           * is therefore a function of how many of these turns the party is
           * willing to spend burst on, rather than a fixed number.
           */
          id: 'act_season_close',
          displayName: 'Close Over',
          intentType: 'enrage_prep',
          telegraphText: 'He turns his attention to the wound.',
          priority: 22,
          cooldownRounds: 3,
          interruptible: true,
          selfStatuses: [{ statusId: 'regeneration', duration: 3, stacks: 2 }],
        },
        {
          /**
           * The ultimate — and the scream clip in bossSpriteManifest finally
           * has an action driving it. Broken by poison STACKS, not damage:
           * see secret A. `partialMitigationMax` means one stack still buys
           * a real reduction, so the answer is graded rather than binary.
           */
          id: 'act_season_hold_open',
          displayName: 'Hold It Open',
          intentType: 'ultimate',
          telegraphText:
            'He takes hold of the whole afternoon and refuses to let it end. Only something already rotting slips out of it.',
          priority: 32,
          cooldownRounds: 4,
          interruptible: false,
          baseDamage: seasonDmg(1.28),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          charge: {
            rounds: 2,
            break: { kind: 'status', statusId: 'poison', stacks: 3 },
            partialMitigationMax: 0.7,
          },
        },
      ],
    },
    {
      id: 'phase_season_turning',
      healthThresholdStart: 0.62,
      healthThresholdEnd: 0.28,
      passiveStatuses: [],
      passiveDescriptions: ['Something has begun to turn, and he is fighting it.'],
      actions: [
        {
          id: 'act_season_root',
          displayName: 'Everything Held Back',
          intentType: 'area_attack',
          telegraphText: 'A whole season of growth arrives at once.',
          priority: 20,
          cooldownRounds: 2,
          interruptible: true,
          baseDamage: seasonDmg(0.64),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          statusApplications: [
            { statusId: 'bleed', duration: 2, stacks: 1, amountPerTick: 8 },
          ],
        },
        {
          // Hunts the WEAKEST — and unlike `prune`, this one DOES honour
          // taunt. The party has to learn that two similar-looking snipes
          // answer to different tools.
          id: 'act_season_deadfall',
          displayName: 'The Weight of What Was Kept',
          intentType: 'heavy_attack',
          telegraphText: 'Everything he never let fall comes down at once.',
          priority: 12,
          cooldownRounds: 1,
          interruptible: true,
          baseDamage: seasonDmg(1.38),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'lowest_hp',
          statusApplications: [{ statusId: 'weakened', duration: 2 }],
        },
        {
          id: 'act_season_close',
          displayName: 'Close Over',
          intentType: 'enrage_prep',
          telegraphText: 'He turns his attention to the wound.',
          priority: 22,
          cooldownRounds: 3,
          interruptible: true,
          selfStatuses: [{ statusId: 'regeneration', duration: 3, stacks: 2 }],
        },
        {
          // Exists to make the heal un-stealable for two rounds, so burst has
          // to be BANKED for the right window instead of spammed on cooldown.
          id: 'act_season_thicket',
          displayName: 'Let the Grove Close',
          intentType: 'shield',
          telegraphText: 'The grove draws in around him. There is nothing left to reach.',
          priority: 28,
          cooldownRounds: 5,
          interruptible: true,
          baseDamage: seasonDmg(0.44),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          shieldAmount: 190,
          shieldDurationRounds: 2,
        },
        {
          id: 'act_season_hold_open',
          displayName: 'Hold It Open',
          intentType: 'ultimate',
          telegraphText:
            'He takes hold of the whole afternoon and refuses to let it end. Only something already rotting slips out of it.',
          priority: 32,
          cooldownRounds: 4,
          interruptible: false,
          baseDamage: seasonDmg(1.28),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          charge: {
            rounds: 2,
            break: { kind: 'status', statusId: 'poison', stacks: 3 },
            partialMitigationMax: 0.7,
          },
        },
      ],
    },
    {
      /**
       * NO HEAL IN THIS PHASE'S ACTION LIST AT ALL.
       *
       * This is how the "he heals less as he breaks" arc gets authored without
       * touching the reducer — by simply not offering `act_season_close` here.
       * A party losing the attrition race wins by surviving into this phase,
       * and nothing tells them that except playing it.
       */
      id: 'phase_season_breaking',
      healthThresholdStart: 0.28,
      healthThresholdEnd: 0.0,
      passiveStatuses: [],
      passiveDescriptions: ['He is not holding it any more.'],
      actions: [
        {
          id: 'act_season_hold',
          displayName: 'Hold the Afternoon',
          intentType: 'heavy_attack',
          telegraphText: 'The light stops moving across the grove floor.',
          priority: 5,
          cooldownRounds: 0,
          interruptible: true,
          baseDamage: seasonDmg(1.07),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
        },
        {
          id: 'act_season_root',
          displayName: 'Everything Held Back',
          intentType: 'area_attack',
          telegraphText: 'A whole season of growth arrives at once.',
          priority: 20,
          cooldownRounds: 2,
          interruptible: true,
          baseDamage: seasonDmg(0.72),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          statusApplications: [
            { statusId: 'bleed', duration: 2, stacks: 1, amountPerTick: 8 },
          ],
        },
        {
          id: 'act_season_last_leaf',
          displayName: 'The Last Green Thing',
          intentType: 'execute',
          telegraphText: 'He reaches for the last living thing in the grove.',
          priority: 33,
          cooldownRounds: 3,
          interruptible: true,
          baseDamage: seasonDmg(2.03),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'lowest_hp',
          executeThresholdPercent: 0.35,
          executeMultiplier: 2.1,
        },
        {
          // The scream, at full. Broken by raw damage rather than poison —
          // by this phase the party has had two chances to learn the poison
          // lesson, and the finisher should test whether they can still hit
          // hard while everything is falling apart.
          id: 'act_season_break',
          displayName: 'The Season Breaks',
          intentType: 'ultimate',
          telegraphText: 'Everything he has been holding since the winter lets go at once.',
          priority: 35,
          cooldownRounds: 4,
          interruptible: false,
          baseDamage: seasonDmg(1.71),
          scalingPerRound: SEASON_SCALING,
          damageType: 'primal',
          targetScope: 'all_heroes',
          charge: {
            rounds: 2,
            break: { kind: 'damage', percentOfMaxHp: 0.26 },
            partialMitigationMax: 0.6,
          },
        },
      ],
    },
  ],
  createdAt: NOW,
  updatedAt: '2026-07-31T00:00:00.000Z',
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
  resistanceProfile: { resistant: ['radiant'], weak: ['umbral'] },
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
          damageType: 'radiant',
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
          damageType: 'radiant',
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
          damageType: 'radiant',
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
  { definition: DEBT_BEARER_DEF, version: DEBT_BEARER_V3 },
  { definition: STILL_SEASON_DEF, version: STILL_SEASON_V2 },
  { definition: UNCLOSED_SUMMONS_DEF, version: UNCLOSED_SUMMONS_V1 },
];

/** Legacy versions kept for admin history / snapshot integrity. */
export const SEED_BOSS_LEGACY_VERSIONS: BossVersion[] = [
  EMBERBORN_V1_DEPRECATED,
  { ...EMBERBORN_V2, status: 'deprecated', deprecatedAt: '2026-07-19T00:00:00.000Z' },
  { ...EMBERBORN_V3, status: 'deprecated', deprecatedAt: '2026-07-20T00:00:00.000Z' },
  { ...DEBT_BEARER_V1, deprecatedAt: '2026-07-30T00:00:00.000Z' },
  { ...DEBT_BEARER_V2, status: 'deprecated', deprecatedAt: '2026-07-31T00:00:00.000Z' },
  // The Still Season's stub. Retired rather than edited: PersistenceGate only
  // re-seeds when a version id is MISSING, so editing v1 in place would have
  // shipped nothing to anyone who had already played, and snapshot immutability
  // means in-flight v1 battles must still resolve off the frozen v1 numbers.
  { ...STILL_SEASON_V1, status: 'deprecated', deprecatedAt: '2026-07-31T00:00:00.000Z' },
];

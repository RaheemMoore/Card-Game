import type { BattleEvent } from '../../types/combat';
import type { ElementName } from '../../types/bible';

/**
 * Canned event logs for the Ability Theater.
 *
 * These are hand-written to match exactly what the reducer emits for each
 * pilot ability, taken from the ability definitions in `seedAbilities.ts`.
 * Writing them by hand rather than running a real battle is the point: the
 * theater must replay a performance identically every time, with no RNG, no
 * boss AI, and no need to fight through three rounds to see the effect you are
 * iterating on.
 *
 * They are FIXTURES, not a second source of truth. If the reducer's event
 * shape changes, these break at the type level, which is the intended alarm.
 */

export const HERO_A = 'hero_0';
export const HERO_B = 'hero_1';
export const BOSS = 'boss_emberborn_wraith';

export interface TheaterScenario {
  id: string;
  label: string;
  /** What this scenario is meant to prove. Shown in the inspector. */
  proves: string;
  abilityDefinitionId: string;
  /** Element forced on the casting card, overriding the picked one. */
  forcedElement?: ElementName;
  events: readonly BattleEvent[];
}

const roundStart: BattleEvent = { kind: 'round_started', round: 1 };

/**
 * Attuned Strike — the lash reuse proof.
 *
 * The same event log is replayed with three different caster elements. Only
 * the material changes; the recipe, the stages, the anchors and every line of
 * path code are identical. `damageType` differs because the reducer really
 * does resolve it from the element (`damageTypeSource: 'element'`), which is
 * why this ability was chosen — the comparison is a real one.
 */
function attunedStrike(damageType: BattleEvent extends never ? never : 'searing' | 'primal' | 'umbral'): readonly BattleEvent[] {
  return [
    roundStart,
    {
      kind: 'player_action_selected',
      actorId: HERO_A,
      action: { kind: 'ability', abilityDefinitionId: 'ability_attuned_strike', targetActorIds: [BOSS] },
    },
    { kind: 'resource_changed', actorId: HERO_A, delta: -1, source: 'ability_attuned_strike' },
    {
      kind: 'damage_dealt',
      sourceActorId: HERO_A,
      targetActorId: BOSS,
      amount: 14,
      damageType,
      blockedByShield: 0,
      sourceActionId: 'ability_attuned_strike',
    },
  ];
}

export const SCENARIOS: readonly TheaterScenario[] = [
  {
    id: 'lash_blood',
    label: 'Attuned Strike — Blood',
    proves: 'Lash form, Blood material. Coiling ribbon, heavy beads, wet splash, drips.',
    abilityDefinitionId: 'ability_attuned_strike',
    forcedElement: 'Blood',
    events: attunedStrike('umbral'),
  },
  {
    id: 'lash_water',
    label: 'Attuned Strike — Water',
    proves: 'Same lash code. Cresting ribbon, foam edge, splash fan. Must not read as Blood.',
    abilityDefinitionId: 'ability_attuned_strike',
    forcedElement: 'Water',
    events: attunedStrike('primal'),
  },
  {
    id: 'lash_fire',
    label: 'Attuned Strike — Fire',
    proves: 'Same lash code. Jagged tongue, forks, embers rising. Bright core, dark edge.',
    abilityDefinitionId: 'ability_attuned_strike',
    forcedElement: 'Fire',
    events: attunedStrike('searing'),
  },

  {
    id: 'rootgrasp',
    label: 'Rootgrasp — Growth × Nature',
    proves: 'Staged emergence from ground anchors, then constriction. Weakened persists.',
    abilityDefinitionId: 'ability_rootgrasp',
    forcedElement: 'Nature',
    events: [
      roundStart,
      {
        kind: 'player_action_selected',
        actorId: HERO_A,
        action: { kind: 'ability', abilityDefinitionId: 'ability_rootgrasp', targetActorIds: [BOSS] },
      },
      { kind: 'resource_changed', actorId: HERO_A, delta: -1, source: 'ability_rootgrasp' },
      {
        kind: 'damage_dealt',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        amount: 13,
        damageType: 'primal',
        blockedByShield: 0,
        sourceActionId: 'ability_rootgrasp',
      },
      {
        kind: 'status_applied',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        statusId: 'weakened',
        instanceId: 'st_weak_1',
        duration: 2,
      },
    ],
  },

  {
    id: 'bearing_witness',
    label: 'Bearing Witness — Barrier × Holy',
    proves: 'Pane forms in front of the ALLY card and persists; cleanse is its own later beat.',
    abilityDefinitionId: 'ability_bearing_witness',
    forcedElement: 'Holy',
    events: [
      roundStart,
      {
        kind: 'player_action_selected',
        actorId: HERO_A,
        action: { kind: 'ability', abilityDefinitionId: 'ability_bearing_witness', targetActorIds: [HERO_B] },
      },
      { kind: 'resource_changed', actorId: HERO_A, delta: -1, source: 'ability_bearing_witness' },
      {
        kind: 'shield_gained',
        sourceActorId: HERO_A,
        targetActorId: HERO_B,
        amount: 22,
        types: ['searing', 'kinetic'],
      },
      // No sourceActorId on this event at all — it is matched to the scope by
      // TARGET, because the scope had already touched HERO_B. That correlation
      // is exactly what the compiler exists to do.
      { kind: 'status_removed', targetActorId: HERO_B, instanceId: 'st_burn_1', reason: 'cleansed' },
    ],
  },

  {
    id: 'sanguine_tithe',
    label: 'Sanguine Tithe — Drain × Blood',
    proves: 'One action, three consequences. Damage on impact, heal on ARRIVAL, weakened after.',
    abilityDefinitionId: 'ability_sanguine_tithe',
    forcedElement: 'Blood',
    events: [
      roundStart,
      {
        kind: 'player_action_selected',
        actorId: HERO_A,
        action: { kind: 'ability', abilityDefinitionId: 'ability_sanguine_tithe', targetActorIds: [BOSS] },
      },
      { kind: 'resource_changed', actorId: HERO_A, delta: -3, source: 'ability_sanguine_tithe' },
      {
        kind: 'damage_dealt',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        amount: 30,
        damageType: 'umbral',
        blockedByShield: 0,
        sourceActionId: 'ability_sanguine_tithe',
      },
      { kind: 'healing_applied', sourceActorId: HERO_A, targetActorId: HERO_A, amount: 18, overheal: 0 },
      {
        kind: 'status_applied',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        statusId: 'weakened',
        instanceId: 'st_weak_2',
        duration: 2,
      },
    ],
  },

  {
    id: 'unmapped',
    label: 'Unmapped ability — fallback',
    proves: 'No recipe authored. Must degrade visibly and safely, never render nothing.',
    abilityDefinitionId: 'ability_no_such_thing',
    events: [
      roundStart,
      {
        kind: 'player_action_selected',
        actorId: HERO_A,
        action: { kind: 'ability', abilityDefinitionId: 'ability_no_such_thing', targetActorIds: [BOSS] },
      },
      {
        kind: 'damage_dealt',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        amount: 9,
        damageType: 'kinetic',
        blockedByShield: 0,
        sourceActionId: 'ability_no_such_thing',
      },
    ],
  },

  {
    id: 'thorns',
    label: 'Thorns during a cast — correlation guard',
    proves: 'The DEFENDER-sourced reflection must stay UNOWNED, not be folded into the cast.',
    abilityDefinitionId: 'ability_attuned_strike',
    forcedElement: 'Fire',
    events: [
      roundStart,
      {
        kind: 'player_action_selected',
        actorId: HERO_A,
        action: { kind: 'ability', abilityDefinitionId: 'ability_attuned_strike', targetActorIds: [BOSS] },
      },
      {
        kind: 'damage_dealt',
        sourceActorId: HERO_A,
        targetActorId: BOSS,
        amount: 14,
        damageType: 'searing',
        blockedByShield: 0,
        sourceActionId: 'ability_attuned_strike',
      },
      // Sourced by the BOSS mid-scope. Must not join the hero's performance.
      {
        kind: 'damage_dealt',
        sourceActorId: BOSS,
        targetActorId: HERO_A,
        amount: 4,
        damageType: 'searing',
        blockedByShield: 0,
      },
    ],
  },
];

export function scenarioById(id: string): TheaterScenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

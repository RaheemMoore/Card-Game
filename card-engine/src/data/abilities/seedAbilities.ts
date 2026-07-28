import type { AbilityDefinition, AbilityVersion } from '../../types/abilities';

/**
 * The starting ability roster.
 *
 * Replaced the original six (Ember Cleave, Aegis Ward, Thornbite, Soul Drain,
 * Radiant Ward, Ruinous Zenith) on 2026-07-28. Those were authored before the
 * reducer ran most effect types, so several of them did nothing in combat —
 * Ember Cleave's burn was dead twice over, as both `damage_over_time` and the
 * `burn` status were unimplemented.
 *
 * ── Shape ────────────────────────────────────────────────────────────────
 *   6 shared basics   — any archetype can learn them
 *   3 × 3 archetype   — Barbarian, Druid, Seraph
 *
 * Only three archetypes are authored, on purpose. Between them they exercise
 * EVERY effect type the reducer implements and BOTH of the Emberborn Wraith's
 * weaknesses (holy via Seraph, nature via Druid), which is what the balance
 * harness needs. The remaining eight are authored after the sweep, against
 * measured numbers instead of estimated ones — until then they fall back to
 * the shared basics, which is why that pool must never be empty.
 *
 * ── Authoring rules ──────────────────────────────────────────────────────
 * The power budget is computed from effect TYPES, targets, cost, cooldown and
 * charges — never from the damage numbers. Writing `amount: 500` does not
 * move the score at all. See `powerBudget.ts`.
 *
 *   core       1–2 effects, cost 1, cd 0
 *   signature  2–3 effects, cost 3, cd 2
 *   ultimate   THREE effects minimum. A two-effect ultimate scores below the
 *              20 floor and FAILS validation — that is the authoring trap,
 *              so every ultimate below is a three-effect stack.
 *
 * Basics are `resourceType: 'none'`, cost 0, deliberately. Resource rather
 * than damage is the real constraint in a long fight, and free basics are
 * what keep a hero acting when their signature is unaffordable. Costing
 * nothing also makes them usable by Mana and Tech archetypes alike, which
 * matters because they are the fallback loadout.
 *
 * `damageTypeSource: 'element'` on the core slot and on Attuned Strike means
 * those hits land as the CARD's element (see `elementDamageType.ts`). That is
 * how a player reaches a boss's elemental weakness by choosing an element,
 * rather than by being forced onto one particular archetype. Signatures and
 * ultimates keep fixed types so a card still reads as its archetype.
 *
 * Naming avoids "Ember-"/"Wraith-" (the boss owns that vocabulary) and every
 * prestige noun (Alpha, Grandmaster, Archdruid, Clan Chief, Blood Regent) —
 * prestige is narrative-earned and must never read as a purchasable ability.
 */

const NOW = '2026-07-28T00:00:00.000Z';

export interface SeedAbility {
  definition: AbilityDefinition;
  version: AbilityVersion;
}

/** Trims the boilerplate — every seed shares timestamps, status and trigger. */
function ability(
  input: Omit<AbilityDefinition, 'currentVersionId' | 'status' | 'createdAt' | 'updatedAt'> & {
    version: Omit<AbilityVersion, 'id' | 'abilityId' | 'versionNumber' | 'status' | 'triggers'>;
  },
): SeedAbility {
  const { version, ...def } = input;
  const versionId = `${def.id}_v1`;
  return {
    definition: {
      ...def,
      currentVersionId: versionId,
      status: 'approved',
      createdAt: NOW,
      updatedAt: NOW,
    },
    version: {
      ...version,
      id: versionId,
      abilityId: def.id,
      versionNumber: 1,
      triggers: [{ type: 'on_use' }],
      status: 'approved',
      publishedAt: NOW,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  Shared basics — un-flavoured verbs, learnable by any archetype        */
/*                                                                        */
/*  Named as plain actions rather than with owned vocabulary. No lifesteal */
/*  and no damage-over-time here: those belong to necromancy, beast and    */
/*  fire, and putting them in the shared pool would flatten the archetypes */
/*  that are supposed to own them.                                        */
/* ══════════════════════════════════════════════════════════════════════ */

const SET_GUARD = ability({
  id: 'ability_set_guard',
  slug: 'set-guard',
  displayName: 'Set Guard',
  familyIds: ['defense'],
  rarity: 'common',
  role: 'defense',
  tags: ['basic', 'guard'],
  descriptionShort: 'Brace behind your guard, blunting the next blow.',
  descriptionLong: 'A braced stance. Incoming damage is reduced until your next turn.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'none',
    resourceCost: 0,
    effects: [{ type: 'guard', reductionPercent: 0.35, duration: 1 }],
  },
});

const ATTUNED_STRIKE = ability({
  id: 'ability_attuned_strike',
  slug: 'attuned-strike',
  displayName: 'Attuned Strike',
  familyIds: ['martial'],
  rarity: 'common',
  role: 'damage',
  tags: ['basic', 'element'],
  descriptionShort: 'A strike carrying whatever element you carry.',
  descriptionLong:
    'The simplest attack there is, and the one every element bends to. It lands as your own element — which is what lets any archetype reach an enemy that fears fire, or light, or the growing world.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    // The whole point of this ability: every archetype can learn it, so
    // elemental counterplay is never gated behind a specific archetype pick.
    damageTypeSource: 'element',
    effects: [{ type: 'direct_damage', amount: 14, scaling: { stat: 'atk', coefficient: 0.4 } }],
    scalingRules: [{ stat: 'atk', coefficient: 0.4 }],
  },
});

const STEADY_BREATH = ability({
  id: 'ability_steady_breath',
  slug: 'steady-breath',
  displayName: 'Steady Breath',
  familyIds: ['defense'],
  rarity: 'common',
  role: 'support',
  tags: ['basic', 'cleanse'],
  descriptionShort: 'Take a breath — close what you can, shake off what you can.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 1,
    effects: [
      { type: 'healing', amount: 18, scaling: { stat: 'def', coefficient: 0.25 } },
      { type: 'remove_status', category: 'negative', count: 1 },
    ],
  },
});

const TAKE_THE_BLOW = ability({
  id: 'ability_take_the_blow',
  slug: 'take-the-blow',
  displayName: 'Take the Blow',
  familyIds: ['defense'],
  rarity: 'common',
  role: 'defense',
  tags: ['basic', 'taunt'],
  descriptionShort: 'Step forward so the next one lands on you.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'none',
    resourceCost: 0,
    effects: [{ type: 'taunt', duration: 2 }],
  },
});

const SECOND_WIND = ability({
  id: 'ability_second_wind',
  slug: 'second-wind',
  displayName: 'Second Wind',
  familyIds: ['defense'],
  rarity: 'common',
  role: 'utility',
  tags: ['basic', 'resource'],
  descriptionShort: 'Find something still left in reserve.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'none',
    resourceCost: 0,
    // One round, not two: at cd 2 the cooldown credit dropped this below the
    // core/common floor of 4, and a resource top-up wants to be there when
    // you are actually starved.
    cooldownRounds: 1,
    // `resource` is nominal — the reducer credits the caster's own pool, so
    // this works for Mana and Tech archetypes alike.
    effects: [{ type: 'resource_gain', resource: 'mana', amount: 3 }],
  },
});

const RALLY = ability({
  id: 'ability_rally',
  slug: 'rally',
  displayName: 'Rally',
  familyIds: ['defense'],
  rarity: 'common',
  role: 'utility',
  tags: ['basic', 'charge'],
  descriptionShort: 'Gather yourself. The moment is closer than it was.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 2,
    effects: [
      { type: 'resource_gain', resource: 'mana', amount: 1 },
      { type: 'ultimate_charge_gain', amount: 12 },
    ],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Barbarian — inherited technique; endurance turned into escalation     */
/*                                                                        */
/*  Named for legacy and oath, never for fury. Feral vocabulary belongs to */
/*  the Lycanthrope; a Barbarian's power source is memory and endurance,   */
/*  which is also why Bible §14 rejects generic-rage framing here.         */
/* ══════════════════════════════════════════════════════════════════════ */

const INHERITED_GUARD = ability({
  id: 'ability_inherited_guard',
  slug: 'inherited-guard',
  displayName: 'Inherited Guard',
  familyIds: ['martial'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['barbarian', 'rage'],
  descriptionShort: 'A stance someone older taught you, and the heat under it.',
  descriptionLong:
    'You settle into a guard that was never yours — it belonged to whoever taught it. Striking from it feeds the slow heat that follows.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 16, scaling: { stat: 'atk', coefficient: 0.45 } },
      { type: 'apply_status', status: { statusId: 'rage', duration: 3, stacks: 1 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.45 }],
  },
});

const OATHBREAKERS_ANSWER = ability({
  id: 'ability_oathbreakers_answer',
  slug: 'oathbreakers-answer',
  displayName: "Oathbreaker's Answer",
  familyIds: ['martial', 'beast'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['barbarian', 'bleed'],
  descriptionShort: 'The blow you keep for someone who broke their word.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      {
        type: 'direct_damage',
        amount: 30,
        damageType: 'physical',
        scaling: { stat: 'atk', coefficient: 0.6 },
      },
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 7, duration: 3 },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.6 }],
  },
});

const THE_NAME_THEY_LEFT_ME = ability({
  id: 'ability_the_name_they_left_me',
  slug: 'the-name-they-left-me',
  displayName: 'The Name They Left Me',
  familyIds: ['martial'],
  rarity: 'common',
  role: 'damage',
  tags: ['barbarian', 'ultimate', 'multi-hit'],
  descriptionShort: 'Every strike they taught you, in the order you learned them.',
  descriptionLong:
    'Not a berserk flurry — a recitation. Each blow is one you were shown, thrown in sequence, and only the last one is yours.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      {
        type: 'multi_hit',
        hitCount: 5,
        amountPerHit: 14,
        damageType: 'physical',
        scaling: { stat: 'atk', coefficient: 0.22 },
      },
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 8, duration: 3 },
      { type: 'apply_status', status: { statusId: 'rage', duration: 3, stacks: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.22 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Druid — the grove asserting itself; attrition rather than burst        */
/*                                                                        */
/*  Never companion language: that belongs to the Beastmaster. The Druid   */
/*  IS the terrain, and Bible §14 rejects nature-as-decoration framing.    */
/* ══════════════════════════════════════════════════════════════════════ */

const ROOTGRASP = ability({
  id: 'ability_rootgrasp',
  slug: 'rootgrasp',
  displayName: 'Rootgrasp',
  familyIds: ['nature'],
  rarity: 'uncommon',
  role: 'control',
  tags: ['druid', 'control'],
  descriptionShort: 'The ground takes an interest in whoever stands on it.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 13, scaling: { stat: 'mana', coefficient: 0.4 } },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.4 }],
  },
});

const THORNMANTLE = ability({
  id: 'ability_thornmantle',
  slug: 'thornmantle',
  displayName: 'Thornmantle',
  familyIds: ['nature'],
  rarity: 'uncommon',
  role: 'support',
  tags: ['druid', 'thorns', 'regeneration'],
  descriptionShort: 'Growth closes over the party — and it has thorns.',
  descriptionLong:
    'Bramble crawls up over everyone still standing. It knits what is torn, and it answers anything that strikes through it.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'all_allies' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'apply_status', status: { statusId: 'thorns', duration: 3 } },
      { type: 'apply_status', status: { statusId: 'regeneration', duration: 3, stacks: 1 } },
    ],
  },
});

const THE_GROVE_REMEMBERS = ability({
  id: 'ability_the_grove_remembers',
  slug: 'the-grove-remembers',
  displayName: 'The Grove Remembers',
  familyIds: ['nature'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['druid', 'ultimate', 'nature'],
  descriptionShort: 'Everything that ever grew here arrives at once.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'all_enemies' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      {
        type: 'direct_damage',
        amount: 48,
        damageType: 'nature',
        scaling: { stat: 'mana', coefficient: 0.9 },
      },
      { type: 'damage_over_time', statusId: 'poison', amountPerTick: 9, duration: 4 },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.9 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Seraph — conviction made weapon; shield-or-smite                      */
/*                                                                        */
/*  A Fallen Seraph's retype is SHADOW, never fire: Infernal is molten     */
/*  obsidian and black light, and Bible §14 forbids the fire-orange read.  */
/*  That mapping lives in `elementDamageType.ts`, not here.                */
/* ══════════════════════════════════════════════════════════════════════ */

const BEARING_WITNESS = ability({
  id: 'ability_bearing_witness',
  slug: 'bearing-witness',
  displayName: 'Bearing Witness',
  familyIds: ['holy', 'defense'],
  rarity: 'uncommon',
  role: 'support',
  tags: ['seraph', 'shield', 'cleanse'],
  descriptionShort: 'You are seen, and what was put on you is lifted.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_ally' },
    resourceType: 'mana',
    resourceCost: 1,
    effects: [
      { type: 'shielding', amount: 22, scaling: { stat: 'mana', coefficient: 0.35 }, duration: 2 },
      { type: 'remove_status', category: 'negative', count: 1 },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.35 }],
  },
});

const THE_VERDICT = ability({
  id: 'ability_the_verdict',
  slug: 'the-verdict',
  displayName: 'The Verdict',
  familyIds: ['holy'],
  // Rare rather than uncommon: the conditional execute pushes it past the
  // uncommon signature ceiling, and the mechanic is worth more than the
  // rarity was. Trimming the effect to fit the label would be the wrong way
  // round.
  rarity: 'rare',
  role: 'damage',
  tags: ['seraph', 'holy'],
  descriptionShort: 'Judgement — and it lands heavier on the already-failing.',
  descriptionLong:
    'Not wrath. A finding, delivered. What is already broken takes the greater share of it.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      {
        type: 'direct_damage',
        amount: 34,
        damageType: 'holy',
        scaling: { stat: 'mana', coefficient: 0.6 },
      },
      { type: 'apply_status', status: { statusId: 'mark', duration: 2 } },
      {
        type: 'conditional_bonus',
        condition: { type: 'boss_hp_below_threshold', percent: 0.5 },
        effects: [{ type: 'direct_damage', amount: 18, damageType: 'holy' }],
      },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.6 }],
  },
});

const WHAT_THE_SUMMONS_COSTS = ability({
  id: 'ability_what_the_summons_costs',
  slug: 'what-the-summons-costs',
  displayName: 'What the Summons Costs',
  familyIds: ['holy', 'defense'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['seraph', 'ultimate', 'holy'],
  descriptionShort: 'You answer the call. It was never free.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'all_enemies' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    // Reserved for the Balanced-Seraph dual-cast. The reducer does not
    // consume this yet; it records the intent so the data is ready.
    hasTwilightMode: true,
    effects: [
      {
        type: 'direct_damage',
        amount: 52,
        damageType: 'holy',
        scaling: { stat: 'mana', coefficient: 0.95 },
      },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
      { type: 'shielding', amount: 20, duration: 2 },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.95 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */

/**
 * Learnable by every archetype.
 *
 * The assigner falls back to these for the eight archetypes with no authored
 * set yet — and `useBattle` THROWS on a card that resolves zero abilities, so
 * this pool is load-bearing rather than a convenience.
 */
export const SHARED_BASIC_ABILITY_IDS: readonly string[] = [
  SET_GUARD.definition.id,
  ATTUNED_STRIKE.definition.id,
  STEADY_BREATH.definition.id,
  TAKE_THE_BLOW.definition.id,
  SECOND_WIND.definition.id,
  RALLY.definition.id,
];

export const SEED_ABILITIES: SeedAbility[] = [
  SET_GUARD,
  ATTUNED_STRIKE,
  STEADY_BREATH,
  TAKE_THE_BLOW,
  SECOND_WIND,
  RALLY,
  INHERITED_GUARD,
  OATHBREAKERS_ANSWER,
  THE_NAME_THEY_LEFT_ME,
  ROOTGRASP,
  THORNMANTLE,
  THE_GROVE_REMEMBERS,
  BEARING_WITNESS,
  THE_VERDICT,
  WHAT_THE_SUMMONS_COSTS,
];

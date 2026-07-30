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
 *   8 shared basics   — any archetype can learn them; they cover core,
 *                       signature AND ultimate, so a card whose archetype has
 *                       no authored set can still fill a full loadout
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

/**
 * The basics above are all CORE slot, which left every unauthored archetype
 * able to fill only one slot — a Forged Mech Pilot went into battle with a
 * single ability and lost 100% of sweeps. These two exist so the shared pool
 * can fill a full loadout at any rank.
 *
 * Kept deliberately plain. They are what you get when your archetype has no
 * authored set, so they must be functional without being interesting enough
 * to compete with a real signature.
 */
const MEASURED_STRIKE = ability({
  id: 'ability_measured_strike',
  slug: 'measured-strike',
  displayName: 'Measured Strike',
  familyIds: ['martial'],
  rarity: 'common',
  role: 'damage',
  tags: ['basic', 'element'],
  descriptionShort: 'Pick the opening, take it, and leave a mark behind.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 2,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 26, scaling: { stat: 'atk', coefficient: 0.55 } },
      { type: 'apply_status', status: { statusId: 'mark', duration: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.55 }],
  },
});

const LAST_STAND = ability({
  id: 'ability_last_stand',
  slug: 'last-stand',
  displayName: 'Last Stand',
  familyIds: ['martial'],
  rarity: 'common',
  role: 'damage',
  tags: ['basic', 'ultimate', 'element'],
  descriptionShort: 'Everything left, spent at once, on whatever is still standing.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'multi_hit', hitCount: 3, amountPerHit: 15, scaling: { stat: 'atk', coefficient: 0.25 } },
      { type: 'direct_damage', amount: 30, scaling: { stat: 'atk', coefficient: 0.5 } },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.5 }],
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
/*  Monk — economy of motion; strength from stacking, not from one blow    */
/*  §14: no glowing fists as the key. The payoff is repetition.            */
/* ══════════════════════════════════════════════════════════════════════ */

const REPEATING_FORM = ability({
  id: 'ability_repeating_form',
  slug: 'repeating-form',
  displayName: 'Repeating Form',
  familyIds: ['martial'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['monk', 'multi-hit', 'focus'],
  descriptionShort: 'The same two movements, done correctly, again.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'multi_hit', hitCount: 2, amountPerHit: 11, scaling: { stat: 'atk', coefficient: 0.22 } },
      { type: 'apply_status', status: { statusId: 'focus', duration: 2, stacks: 1 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.22 }],
  },
});

const STILL_WATER_STANCE = ability({
  id: 'ability_still_water_stance',
  slug: 'still-water-stance',
  displayName: 'Still Water Stance',
  familyIds: ['defense', 'holy'],
  rarity: 'common',
  role: 'defense',
  tags: ['monk', 'guard', 'cleanse'],
  descriptionShort: 'Nothing lands on water that water does not let land.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'self' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'guard', reductionPercent: 0.45, duration: 2 },
      { type: 'remove_status', category: 'negative', count: 2 },
    ],
  },
});

const TEN_THOUSAND_MORNINGS = ability({
  id: 'ability_ten_thousand_mornings',
  slug: 'ten-thousand-mornings',
  displayName: 'Ten Thousand Mornings',
  familyIds: ['martial', 'holy'],
  rarity: 'common',
  role: 'damage',
  tags: ['monk', 'ultimate', 'multi-hit'],
  descriptionShort: 'Every practice you ever did, arriving at the same instant.',
  descriptionLong:
    'Not a technique — an accumulation. The strike is unremarkable; there have simply been ten thousand of them.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'multi_hit', hitCount: 6, amountPerHit: 12, damageType: 'holy', scaling: { stat: 'atk', coefficient: 0.2 } },
      { type: 'direct_damage', amount: 28, damageType: 'holy', scaling: { stat: 'mana', coefficient: 0.4 } },
      { type: 'apply_status', status: { statusId: 'focus', duration: 2, stacks: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.2 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Human — adaptation; the only kit that reads the battle state           */
/*  §14: NOT a blank slate and NOT a generic adventurer. Conditionals are  */
/*  Human's mechanical signature and stay rare elsewhere.                  */
/* ══════════════════════════════════════════════════════════════════════ */

const READ_THE_ROOM = ability({
  id: 'ability_read_the_room',
  slug: 'read-the-room',
  displayName: 'Read the Room',
  familyIds: ['martial'],
  rarity: 'rare',
  role: 'damage',
  tags: ['human', 'conditional'],
  descriptionShort: 'You notice who is struggling, and you hit harder for it.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 15, scaling: { stat: 'atk', coefficient: 0.45 } },
      {
        type: 'conditional_bonus',
        condition: { type: 'user_hp_below_threshold', percent: 0.5 },
        effects: [{ type: 'apply_status', status: { statusId: 'rage', duration: 2, stacks: 2 } }],
      },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.45 }],
  },
});

const LEARNED_THE_HARD_WAY = ability({
  id: 'ability_learned_the_hard_way',
  slug: 'learned-the-hard-way',
  displayName: 'Learned the Hard Way',
  familyIds: ['martial', 'defense'],
  rarity: 'uncommon',
  role: 'control',
  tags: ['human', 'mark'],
  descriptionShort: 'You have met this before. It went badly. It will not again.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'apply_status', status: { statusId: 'mark', duration: 3 } },
      { type: 'direct_damage', amount: 27, damageType: 'physical', scaling: { stat: 'atk', coefficient: 0.55 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.55 }],
  },
});

const THE_CHOICE = ability({
  id: 'ability_the_choice',
  slug: 'the-choice',
  displayName: 'The Choice',
  familyIds: ['martial', 'holy'],
  rarity: 'common',
  role: 'damage',
  tags: ['human', 'ultimate'],
  descriptionShort: 'The moment where you stop weighing it and simply decide.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'direct_damage', amount: 50, damageType: 'holy', scaling: { stat: 'atk', coefficient: 0.9 } },
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 8, duration: 3 },
      { type: 'apply_status', status: { statusId: 'mark', duration: 3 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.9 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Necromancer — consequence; delayed and inevitable, never a summoner    */
/*  §14: no green smoke, no skulls in names, no villain diction.           */
/* ══════════════════════════════════════════════════════════════════════ */

const LEDGER_OF_NAMES = ability({
  id: 'ability_ledger_of_names',
  slug: 'ledger-of-names',
  displayName: 'Ledger of Names',
  familyIds: ['necromancy'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['necromancer', 'decay'],
  descriptionShort: 'Each stack is a name written down. Nothing is forgotten.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    effects: [
      { type: 'damage_over_time', statusId: 'poison', amountPerTick: 8, duration: 4 },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
  },
});

const PRICE_PAID_FORWARD = ability({
  id: 'ability_price_paid_forward',
  slug: 'price-paid-forward',
  displayName: 'Price Paid Forward',
  familyIds: ['necromancy'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['necromancer', 'cost'],
  descriptionShort: 'The debt comes due later, and not for you.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'damage_over_time', statusId: 'poison', amountPerTick: 12, duration: 4 },
      { type: 'apply_status', status: { statusId: 'mark', duration: 3 } },
    ],
  },
});

const THE_LONG_ANSWER = ability({
  id: 'ability_the_long_answer',
  slug: 'the-long-answer',
  displayName: 'The Long Answer',
  familyIds: ['necromancy'],
  rarity: 'common',
  role: 'damage',
  tags: ['necromancer', 'ultimate'],
  descriptionShort: 'Everything written in the ledger, called in at once.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      // 'true' damage: a reckoning is not resisted, which is also what keeps
      // the Necromancer useful against a boss that resists their element.
      { type: 'direct_damage', amount: 46, damageType: 'true', scaling: { stat: 'mana', coefficient: 0.85 } },
      { type: 'damage_over_time', statusId: 'poison', amountPerTick: 10, duration: 4 },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 3 } },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.85 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Vampire — sustain under restraint; immediate, personal, self-healing   */
/*  §14: no seduction framing, no daylight imagery. RESTRAINT is the       */
/*  identity — blood is not the whole personality.                         */
/* ══════════════════════════════════════════════════════════════════════ */

const FIRST_RESTRAINT = ability({
  id: 'ability_first_restraint',
  slug: 'first-restraint',
  displayName: 'First Restraint',
  familyIds: ['necromancy', 'martial'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['vampire', 'drain'],
  descriptionShort: 'Take only what is needed. That is the discipline.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 15, scaling: { stat: 'mana', coefficient: 0.4 } },
      // Ordering matters: lifesteal reads damage dealt EARLIER in the action,
      // and the validator now rejects it if placed first.
      { type: 'lifesteal', percentOfDamage: 0.5 },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.4 }],
  },
});

const SANGUINE_TITHE = ability({
  id: 'ability_sanguine_tithe',
  slug: 'sanguine-tithe',
  displayName: 'Sanguine Tithe',
  familyIds: ['necromancy'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['vampire', 'drain'],
  descriptionShort: 'What is owed, collected — and it is owed more when you are low.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'direct_damage', amount: 30, damageType: 'shadow', scaling: { stat: 'mana', coefficient: 0.6 } },
      { type: 'lifesteal', percentOfDamage: 0.6 },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.6 }],
  },
});

const THE_HOUR_BEFORE_DAWN = ability({
  id: 'ability_the_hour_before_dawn',
  slug: 'the-hour-before-dawn',
  displayName: 'The Hour Before Dawn',
  familyIds: ['necromancy', 'martial'],
  rarity: 'common',
  role: 'hybrid',
  tags: ['vampire', 'ultimate', 'drain'],
  descriptionShort: 'The last hour you are permitted, spent all at once.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'multi_hit', hitCount: 4, amountPerHit: 16, damageType: 'shadow', scaling: { stat: 'mana', coefficient: 0.25 } },
      { type: 'lifesteal', percentOfDamage: 0.7 },
      { type: 'shielding', amount: 24, duration: 2 },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.25 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Lycanthrope — controlled release; a CHOSEN surge, then reined back     */
/*  §14: no Alpha framing, no chains, no solitary-monster read.            */
/* ══════════════════════════════════════════════════════════════════════ */

const MOONLIT_STEP = ability({
  id: 'ability_moonlit_step',
  slug: 'moonlit-step',
  displayName: 'Moonlit Step',
  familyIds: ['beast'],
  rarity: 'rare',
  role: 'damage',
  tags: ['lycanthrope', 'bleed'],
  descriptionShort: 'One step closer than anyone expected you to be.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'direct_damage', amount: 16, scaling: { stat: 'atk', coefficient: 0.45 } },
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 6, duration: 3 },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.45 }],
  },
});

const LET_IT_RISE = ability({
  id: 'ability_let_it_rise',
  slug: 'let-it-rise',
  displayName: 'Let It Rise',
  familyIds: ['beast', 'martial'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['lycanthrope', 'rage'],
  descriptionShort: 'You let it up as far as the leash allows, and no further.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'apply_status', status: { statusId: 'rage', duration: 3, stacks: 3 } },
      { type: 'direct_damage', amount: 26, damageType: 'physical', scaling: { stat: 'atk', coefficient: 0.55 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.55 }],
  },
});

const GODDESS_GIVEN_RESTRAINT = ability({
  id: 'ability_goddess_given_restraint',
  slug: 'goddess-given-restraint',
  displayName: 'Goddess-Given Restraint',
  familyIds: ['beast', 'nature'],
  rarity: 'common',
  role: 'damage',
  tags: ['lycanthrope', 'ultimate'],
  descriptionShort: 'The Goddess did not give you the strength. She gave you the stopping.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'direct_damage', amount: 52, damageType: 'nature', scaling: { stat: 'atk', coefficient: 0.95 } },
      { type: 'damage_over_time', statusId: 'bleed', amountPerTick: 10, duration: 3 },
      { type: 'apply_status', status: { statusId: 'rage', duration: 3, stacks: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.95 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Beastmaster — coordination; mark the prey, everyone hits it harder     */
/*  §14: never Command, Leash, Tame, or Master's. A partnership.           */
/* ══════════════════════════════════════════════════════════════════════ */

const TWO_SETS_OF_EYES = ability({
  id: 'ability_two_sets_of_eyes',
  slug: 'two-sets-of-eyes',
  displayName: 'Two Sets of Eyes',
  familyIds: ['beast'],
  rarity: 'uncommon',
  role: 'control',
  tags: ['beastmaster', 'mark'],
  descriptionShort: 'One of you watches. The other has already moved.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'apply_status', status: { statusId: 'mark', duration: 3 } },
      { type: 'direct_damage', amount: 14, scaling: { stat: 'atk', coefficient: 0.4 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.4 }],
  },
});

const FLANKING_TRUST = ability({
  id: 'ability_flanking_trust',
  slug: 'flanking-trust',
  displayName: 'Flanking Trust',
  familyIds: ['beast', 'martial'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['beastmaster', 'multi-hit'],
  descriptionShort: 'Neither of you looks to check. That is the whole trick.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'mana',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'multi_hit', hitCount: 3, amountPerHit: 14, damageType: 'physical', scaling: { stat: 'atk', coefficient: 0.28 } },
      { type: 'apply_status', status: { statusId: 'mark', duration: 2 } },
    ],
    scalingRules: [{ stat: 'atk', coefficient: 0.28 }],
  },
});

const WE_MOVE_AS_ONE = ability({
  id: 'ability_we_move_as_one',
  slug: 'we-move-as-one',
  displayName: 'We Move as One',
  familyIds: ['beast', 'nature'],
  rarity: 'uncommon',
  role: 'support',
  tags: ['beastmaster', 'ultimate', 'party'],
  descriptionShort: 'Nobody gives an order. Everybody goes.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'all_allies' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'apply_status', status: { statusId: 'focus', duration: 3, stacks: 2 } },
      { type: 'healing', amount: 34, scaling: { stat: 'mana', coefficient: 0.5 } },
      { type: 'apply_status', status: { statusId: 'regeneration', duration: 3, stacks: 2 } },
    ],
    scalingRules: [{ stat: 'mana', coefficient: 0.5 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Mech Pilot — systems under load; power now, vulnerability later        */
/*  §14: no neon-cyberpunk names, and NO fire.                            */
/* ══════════════════════════════════════════════════════════════════════ */

const LOAD_BEARING = ability({
  id: 'ability_load_bearing',
  slug: 'load-bearing',
  displayName: 'Load-Bearing',
  familyIds: ['defense'],
  rarity: 'uncommon',
  role: 'defense',
  tags: ['mech-pilot', 'taunt'],
  descriptionShort: 'The frame was built to take this. Let it.',
  version: {
    slotType: 'core',
    targetRule: { type: 'self' },
    resourceType: 'tech',
    resourceCost: 1,
    effects: [
      { type: 'taunt', duration: 2 },
      { type: 'guard', reductionPercent: 0.4, duration: 2 },
    ],
  },
});

const REDLINE = ability({
  id: 'ability_redline',
  slug: 'redline',
  displayName: 'Redline',
  familyIds: ['tech'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['mech-pilot', 'overload'],
  descriptionShort: 'Past the safe band, for exactly as long as it holds.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'tech',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'direct_damage', amount: 36, damageType: 'tech', scaling: { stat: 'tech', coefficient: 0.65 } },
      // The cost of overclocking lands on the PILOT, next round.
      { type: 'apply_status', status: { statusId: 'weakened', duration: 1 } },
    ],
    scalingRules: [{ stat: 'tech', coefficient: 0.65 }],
  },
});

const EVERYONE_WHO_SAT_HERE = ability({
  id: 'ability_everyone_who_sat_here',
  slug: 'everyone-who-sat-here',
  displayName: 'Everyone Who Sat Here',
  familyIds: ['tech', 'defense'],
  rarity: 'common',
  role: 'damage',
  tags: ['mech-pilot', 'ultimate'],
  descriptionShort: 'The machine remembers every pilot. Tonight it uses all of them.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      { type: 'multi_hit', hitCount: 4, amountPerHit: 15, damageType: 'tech', scaling: { stat: 'tech', coefficient: 0.24 } },
      { type: 'direct_damage', amount: 30, damageType: 'tech', scaling: { stat: 'tech', coefficient: 0.5 } },
      { type: 'apply_status', status: { statusId: 'weakened', duration: 2 } },
    ],
    scalingRules: [{ stat: 'tech', coefficient: 0.5 }],
  },
});

/* ══════════════════════════════════════════════════════════════════════ */
/*  Android — self-rewriting; reconfigures mid-fight                       */
/*  §14: becoming more human is NOT the power-up.                          */
/* ══════════════════════════════════════════════════════════════════════ */

const RECONFIGURE = ability({
  id: 'ability_reconfigure',
  slug: 'reconfigure',
  displayName: 'Reconfigure',
  familyIds: ['tech'],
  rarity: 'uncommon',
  role: 'hybrid',
  tags: ['android', 'focus'],
  descriptionShort: 'Rewrite the approach mid-swing. You are allowed to.',
  version: {
    slotType: 'core',
    targetRule: { type: 'single_enemy' },
    resourceType: 'tech',
    resourceCost: 1,
    damageTypeSource: 'element',
    effects: [
      { type: 'apply_status', status: { statusId: 'focus', duration: 2, stacks: 1 } },
      { type: 'direct_damage', amount: 15, scaling: { stat: 'tech', coefficient: 0.42 } },
    ],
    scalingRules: [{ stat: 'tech', coefficient: 0.42 }],
  },
});

const DEVIATION_PROTOCOL = ability({
  id: 'ability_deviation_protocol',
  slug: 'deviation-protocol',
  displayName: 'Deviation Protocol',
  familyIds: ['tech'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['android', 'multi-hit', 'mark'],
  descriptionShort: 'The specification did not cover this. You proceed anyway.',
  version: {
    slotType: 'signature',
    targetRule: { type: 'single_enemy' },
    resourceType: 'tech',
    resourceCost: 3,
    cooldownRounds: 2,
    effects: [
      { type: 'multi_hit', hitCount: 3, amountPerHit: 15, damageType: 'tech', scaling: { stat: 'tech', coefficient: 0.3 } },
      { type: 'apply_status', status: { statusId: 'mark', duration: 2 } },
    ],
    scalingRules: [{ stat: 'tech', coefficient: 0.3 }],
  },
});

const NO_ONE_PROGRAMMED_THIS = ability({
  id: 'ability_no_one_programmed_this',
  slug: 'no-one-programmed-this',
  displayName: 'No One Programmed This',
  familyIds: ['tech'],
  rarity: 'common',
  role: 'damage',
  tags: ['android', 'ultimate'],
  descriptionShort: 'Not a malfunction. Not a gift. Something you worked out yourself.',
  version: {
    slotType: 'ultimate',
    targetRule: { type: 'single_enemy' },
    resourceType: 'none',
    resourceCost: 0,
    cooldownRounds: 3,
    maxCharges: 1,
    effects: [
      // 'true' damage: an unprecedented approach has nothing to be resisted by.
      { type: 'direct_damage', amount: 44, damageType: 'true', scaling: { stat: 'tech', coefficient: 0.8 } },
      { type: 'multi_hit', hitCount: 3, amountPerHit: 13, damageType: 'tech', scaling: { stat: 'tech', coefficient: 0.22 } },
      { type: 'apply_status', status: { statusId: 'mark', duration: 3 } },
    ],
    scalingRules: [{ stat: 'tech', coefficient: 0.8 }],
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
  MEASURED_STRIKE.definition.id,
  LAST_STAND.definition.id,
];

export const SEED_ABILITIES: SeedAbility[] = [
  SET_GUARD,
  ATTUNED_STRIKE,
  STEADY_BREATH,
  TAKE_THE_BLOW,
  SECOND_WIND,
  RALLY,
  MEASURED_STRIKE,
  LAST_STAND,
  INHERITED_GUARD,
  OATHBREAKERS_ANSWER,
  THE_NAME_THEY_LEFT_ME,
  ROOTGRASP,
  THORNMANTLE,
  THE_GROVE_REMEMBERS,
  BEARING_WITNESS,
  THE_VERDICT,
  WHAT_THE_SUMMONS_COSTS,
  REPEATING_FORM,
  STILL_WATER_STANCE,
  TEN_THOUSAND_MORNINGS,
  READ_THE_ROOM,
  LEARNED_THE_HARD_WAY,
  THE_CHOICE,
  LEDGER_OF_NAMES,
  PRICE_PAID_FORWARD,
  THE_LONG_ANSWER,
  FIRST_RESTRAINT,
  SANGUINE_TITHE,
  THE_HOUR_BEFORE_DAWN,
  MOONLIT_STEP,
  LET_IT_RISE,
  GODDESS_GIVEN_RESTRAINT,
  TWO_SETS_OF_EYES,
  FLANKING_TRUST,
  WE_MOVE_AS_ONE,
  LOAD_BEARING,
  REDLINE,
  EVERYONE_WHO_SAT_HERE,
  RECONFIGURE,
  DEVIATION_PROTOCOL,
  NO_ONE_PROGRAMMED_THIS,
];

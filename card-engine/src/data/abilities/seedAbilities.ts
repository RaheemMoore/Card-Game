import type { AbilityDefinition, AbilityVersion } from '../../types/abilities';

/**
 * Five hand-authored abilities that pass the A2 validator. Two are the Figma
 * benchmarks (Ember Cleave, Aegis Ward); three fill out family coverage
 * (Nature, Necromancy, Holy) so A3's seeding pass has one exemplar per
 * "must-cover" family.
 *
 * Numbers here are provisional — they satisfy the power-budget bands but the
 * final live values will be tuned at Stage B4 against real playtest data.
 * None of these have canonical art yet (canonicalArtAssetId omitted).
 */

const NOW = '2026-07-18T00:00:00.000Z';

export interface SeedAbility {
  definition: AbilityDefinition;
  version: AbilityVersion;
}

/* ---------- 1. Ember Cleave (Martial + Fire, Mana, Signature) ---------- */

const EMBER_CLEAVE_DEF: AbilityDefinition = {
  id: 'ability_ember_cleave',
  slug: 'ember-cleave',
  displayName: 'Ember Cleave',
  familyIds: ['martial', 'fire'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['sweep', 'burn', 'martial'],
  descriptionShort: 'A sweeping strike that leaves the target burning.',
  descriptionLong:
    'A wide, ember-wreathed cleave. Impact deals physical damage; the trailing flame applies a lingering Burn to the target.',
  lore: 'Forged in the ember-hearths of the highland clans, this cleave sears intent into steel.',
  currentVersionId: 'ability_ember_cleave_v1',
  status: 'approved',
  createdAt: NOW,
  updatedAt: NOW,
};

const EMBER_CLEAVE_V1: AbilityVersion = {
  id: 'ability_ember_cleave_v1',
  abilityId: 'ability_ember_cleave',
  versionNumber: 1,
  slotType: 'signature',
  targetRule: { type: 'single_enemy' },
  resourceType: 'mana',
  resourceCost: 3,
  cooldownRounds: 1,
  effects: [
    {
      type: 'direct_damage',
      amount: 18,
      damageType: 'physical',
      scaling: { stat: 'atk', coefficient: 0.5 },
    },
    {
      type: 'damage_over_time',
      statusId: 'burn',
      amountPerTick: 4,
      duration: 3,
    },
  ],
  triggers: [{ type: 'on_use' }],
  scalingRules: [{ stat: 'atk', coefficient: 0.5 }],
  status: 'approved',
  publishedAt: NOW,
};

/* ---------- 2. Aegis Ward (Defense, Tech, Signature) ---------- */

const AEGIS_WARD_DEF: AbilityDefinition = {
  id: 'ability_aegis_ward',
  slug: 'aegis-ward',
  displayName: 'Aegis Ward',
  familyIds: ['defense'],
  rarity: 'uncommon',
  role: 'defense',
  tags: ['barrier', 'guard', 'tech'],
  descriptionShort: 'Project a shielding barrier over an ally and guard the caster.',
  descriptionLong:
    'A geometric barrier snaps into place, absorbing incoming damage on the chosen ally while the caster braces to intercept a follow-up strike.',
  lore: 'A machine-arc ward learned from the collapse of the Second Bastion.',
  currentVersionId: 'ability_aegis_ward_v1',
  status: 'approved',
  createdAt: NOW,
  updatedAt: NOW,
};

const AEGIS_WARD_V1: AbilityVersion = {
  id: 'ability_aegis_ward_v1',
  abilityId: 'ability_aegis_ward',
  versionNumber: 1,
  slotType: 'signature',
  targetRule: { type: 'single_ally' },
  resourceType: 'tech',
  resourceCost: 2,
  cooldownRounds: 2,
  effects: [
    {
      type: 'shielding',
      amount: 20,
      duration: 3,
      scaling: { stat: 'def', coefficient: 0.4 },
    },
    {
      type: 'apply_status',
      status: { statusId: 'barrier', duration: 3 },
    },
  ],
  triggers: [{ type: 'on_use' }],
  scalingRules: [{ stat: 'def', coefficient: 0.4 }],
  status: 'approved',
  publishedAt: NOW,
};

/* ---------- 3. Thornbite (Nature, Mana, Core) ---------- */

const THORNBITE_DEF: AbilityDefinition = {
  id: 'ability_thornbite',
  slug: 'thornbite',
  displayName: 'Thornbite',
  familyIds: ['nature'],
  rarity: 'common',
  role: 'defense',
  tags: ['thorns', 'retaliation', 'druid'],
  descriptionShort: 'Sprout thorns that retaliate against attackers.',
  descriptionLong:
    'A cheap living ward. Attackers striking the caster suffer a pulse of nature damage until the thorns wither.',
  currentVersionId: 'ability_thornbite_v1',
  status: 'approved',
  createdAt: NOW,
  updatedAt: NOW,
};

const THORNBITE_V1: AbilityVersion = {
  id: 'ability_thornbite_v1',
  abilityId: 'ability_thornbite',
  versionNumber: 1,
  slotType: 'core',
  targetRule: { type: 'self' },
  resourceType: 'mana',
  resourceCost: 1,
  effects: [
    {
      type: 'apply_status',
      status: { statusId: 'thorns', duration: 3 },
    },
  ],
  triggers: [{ type: 'on_use' }],
  status: 'approved',
  publishedAt: NOW,
};

/* ---------- 4. Soul Drain (Necromancy, Mana, Core) ---------- */

const SOUL_DRAIN_DEF: AbilityDefinition = {
  id: 'ability_soul_drain',
  slug: 'soul-drain',
  displayName: 'Soul Drain',
  familyIds: ['necromancy'],
  rarity: 'uncommon',
  role: 'damage',
  tags: ['lifesteal', 'shadow', 'necromancer'],
  descriptionShort: 'Drain the target and heal for a fraction of the damage.',
  descriptionLong:
    'A whispered curse pulls a thread of vitality from the target. Damage dealt is partially returned as healing.',
  currentVersionId: 'ability_soul_drain_v1',
  status: 'approved',
  createdAt: NOW,
  updatedAt: NOW,
};

const SOUL_DRAIN_V1: AbilityVersion = {
  id: 'ability_soul_drain_v1',
  abilityId: 'ability_soul_drain',
  versionNumber: 1,
  slotType: 'core',
  targetRule: { type: 'single_enemy' },
  resourceType: 'mana',
  resourceCost: 2,
  effects: [
    {
      type: 'direct_damage',
      amount: 10,
      damageType: 'shadow',
      scaling: { stat: 'mana', coefficient: 0.3 },
    },
    {
      type: 'lifesteal',
      percentOfDamage: 0.5,
    },
  ],
  triggers: [{ type: 'on_use' }],
  scalingRules: [{ stat: 'mana', coefficient: 0.3 }],
  status: 'approved',
  publishedAt: NOW,
};

/* ---------- 5. Radiant Ward (Holy, Mana, Signature) ---------- */

const RADIANT_WARD_DEF: AbilityDefinition = {
  id: 'ability_radiant_ward',
  slug: 'radiant-ward',
  displayName: 'Radiant Ward',
  familyIds: ['holy', 'defense'],
  rarity: 'uncommon',
  role: 'support',
  tags: ['ward', 'heal', 'seraph'],
  descriptionShort: 'Ward an ally with light and healing.',
  descriptionLong:
    'A ring of radiant light restores the ally\'s health and grants a protective barrier that persists into the next round.',
  currentVersionId: 'ability_radiant_ward_v1',
  status: 'approved',
  createdAt: NOW,
  updatedAt: NOW,
};

const RADIANT_WARD_V1: AbilityVersion = {
  id: 'ability_radiant_ward_v1',
  abilityId: 'ability_radiant_ward',
  versionNumber: 1,
  slotType: 'signature',
  targetRule: { type: 'lowest_health_ally' },
  resourceType: 'mana',
  resourceCost: 3,
  cooldownRounds: 2,
  effects: [
    {
      type: 'healing',
      amount: 14,
      scaling: { stat: 'mana', coefficient: 0.4 },
    },
    {
      type: 'shielding',
      amount: 10,
      duration: 2,
    },
  ],
  triggers: [{ type: 'on_use' }],
  scalingRules: [{ stat: 'mana', coefficient: 0.4 }],
  status: 'approved',
  publishedAt: NOW,
};

export const SEED_ABILITIES: SeedAbility[] = [
  { definition: EMBER_CLEAVE_DEF,  version: EMBER_CLEAVE_V1 },
  { definition: AEGIS_WARD_DEF,    version: AEGIS_WARD_V1 },
  { definition: THORNBITE_DEF,     version: THORNBITE_V1 },
  { definition: SOUL_DRAIN_DEF,    version: SOUL_DRAIN_V1 },
  { definition: RADIANT_WARD_DEF,  version: RADIANT_WARD_V1 },
];

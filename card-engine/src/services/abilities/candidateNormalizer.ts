import type {
  AbilityCandidate,
  AbilityDefinition,
  AbilityVersion,
} from '../../types/abilities';

/**
 * Normalize a raw candidate (from Claude or a test harness) into the
 * paired (definition, version) rows the library stores.
 *
 * This function ONLY structures the data — it does not validate against
 * the A2 catalogs (see validator.ts) or check for duplicates (see
 * duplicateDetector.ts). Callers (proposalService) run those in order.
 */

export interface NormalizedProposal {
  definition: AbilityDefinition;
  version: AbilityVersion;
}

const ABILITY_ID_PREFIX = 'ability_';
const VERSION_ID_SUFFIX = '_v1';

/** Convert a display name to a kebab-case slug. */
export function slugify(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slug → stable ability id, e.g. "ember-cleave" → "ability_ember_cleave". */
export function slugToAbilityId(slug: string): string {
  return `${ABILITY_ID_PREFIX}${slug.replace(/-/g, '_')}`;
}

/** Convert AbilityCandidate → NormalizedProposal. */
export function normalizeCandidate(
  candidate: AbilityCandidate,
  opts: { now?: string } = {},
): NormalizedProposal {
  const now = opts.now ?? new Date().toISOString();
  const slug = candidate.slug?.trim() || slugify(candidate.displayName);
  const abilityId = slugToAbilityId(slug);
  const versionId = `${abilityId}${VERSION_ID_SUFFIX}`;

  const definition: AbilityDefinition = {
    id: abilityId,
    slug,
    displayName: candidate.displayName,
    familyIds: candidate.familyIds,
    rarity: candidate.rarity,
    role: candidate.role,
    tags: candidate.tags,
    descriptionShort: candidate.descriptionShort,
    descriptionLong: candidate.descriptionLong,
    lore: candidate.lore,
    currentVersionId: versionId,
    status: 'proposed',
    createdAt: now,
    updatedAt: now,
  };

  const version: AbilityVersion = {
    id: versionId,
    abilityId,
    versionNumber: 1,
    slotType: candidate.slotType,
    targetRule: candidate.targetRule,
    resourceType: candidate.resourceType,
    resourceCost: candidate.resourceCost,
    cooldownRounds: candidate.cooldownRounds,
    maxCharges: candidate.maxCharges,
    effects: candidate.effects,
    triggers: candidate.triggers,
    conditions: candidate.conditions,
    scalingRules: candidate.scalingRules,
    status: 'draft',
  };

  return { definition, version };
}

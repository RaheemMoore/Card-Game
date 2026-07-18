import type {
  AbilityDefinition,
  AbilityVersion,
  DuplicateResult,
} from '../../types/abilities';

/**
 * Layered duplicate detection per spec §6.1. Per Raheem's A4 decision, ONLY
 * an exact normalized signature match auto-attaches — everything else routes
 * to the admin queue with an overlap score so the reviewer sees how close
 * it was to an existing identity.
 *
 * Signature = canonical JSON of (slot, resource, target.type, sorted
 * effect types, sorted trigger types, sorted condition types, sorted
 * familyIds, role). Names/descriptions/tags do NOT participate in the
 * signature — a rename of "Flame Slash" to "Fiery Slash" is a duplicate.
 *
 * Overlap (for admin context) is a weighted Jaccard on
 * (effect types ∪ trigger types ∪ condition types ∪ tags ∪ familyIds).
 */

const HIGH_SIMILARITY_OVERLAP = 0.6;

interface Signable {
  slotType: string;
  resourceType: string;
  targetType: string;
  effectTypes: string[];
  triggerTypes: string[];
  conditionTypes: string[];
  familyIds: string[];
  role: string;
}

function toSignable(def: AbilityDefinition, version: AbilityVersion): Signable {
  return {
    slotType: version.slotType,
    resourceType: version.resourceType,
    targetType: version.targetRule.type,
    effectTypes: sortUnique(version.effects.map((e) => e.type)),
    triggerTypes: sortUnique((version.triggers ?? []).map((t) => t.type)),
    conditionTypes: sortUnique((version.conditions ?? []).map((c) => c.type)),
    familyIds: sortUnique(def.familyIds),
    role: def.role,
  };
}

function sortUnique(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

/** Canonical JSON signature. Identical signatures = exact-match duplicates. */
export function signatureOf(def: AbilityDefinition, version: AbilityVersion): string {
  return JSON.stringify(toSignable(def, version));
}

function jaccard(a: string[], b: string[]): number {
  // Empty ∩ empty = "neither uses this category" — that isn't shared
  // overlap. Return 0 so absent categories don't inflate the score.
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) if (setB.has(x)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Weighted Jaccard across effect / trigger / condition / tag / family
 * categories. Effects weighted highest because they're the mechanical
 * essence; tags weighted lowest because they're author-controlled.
 */
export function overlapScore(
  a: { def: AbilityDefinition; version: AbilityVersion },
  b: { def: AbilityDefinition; version: AbilityVersion },
): number {
  const sa = toSignable(a.def, a.version);
  const sb = toSignable(b.def, b.version);
  const effect = jaccard(sa.effectTypes, sb.effectTypes) * 0.4;
  const trigger = jaccard(sa.triggerTypes, sb.triggerTypes) * 0.15;
  const condition = jaccard(sa.conditionTypes, sb.conditionTypes) * 0.15;
  const family = jaccard(sa.familyIds, sb.familyIds) * 0.15;
  const tag = jaccard(a.def.tags, b.def.tags) * 0.15;
  return effect + trigger + condition + family + tag;
}

/**
 * Given a candidate (normalized as def+version) and the current library,
 * classify it as exact_match / high_similarity / novel. Only exact_match
 * auto-attaches — high_similarity queues with the overlap for admin review.
 *
 * Library entries with status = 'merged' or 'deprecated' are excluded from
 * matching — we don't want deprecated identities to soak up new discoveries.
 */
export function detectDuplicate(
  candidate: { def: AbilityDefinition; version: AbilityVersion },
  library: Array<{ def: AbilityDefinition; version: AbilityVersion }>,
): DuplicateResult {
  const candidateSig = signatureOf(candidate.def, candidate.version);

  let bestOverlap = 0;
  let bestId: string | undefined;

  for (const entry of library) {
    if (entry.def.status === 'merged' || entry.def.status === 'deprecated') continue;
    // Note: we intentionally do NOT skip entries with the same id as the
    // candidate. A normalized candidate always has an id derived from its
    // slug, so a same-id match against the library is a legitimate exact
    // match (typically: caller re-proposed the same ability).

    if (signatureOf(entry.def, entry.version) === candidateSig) {
      return { kind: 'exact_match', abilityId: entry.def.id };
    }
    const score = overlapScore(candidate, entry);
    if (score > bestOverlap) {
      bestOverlap = score;
      bestId = entry.def.id;
    }
  }

  if (bestId && bestOverlap >= HIGH_SIMILARITY_OVERLAP) {
    return { kind: 'high_similarity', abilityId: bestId, overlap: bestOverlap };
  }
  return { kind: 'novel' };
}

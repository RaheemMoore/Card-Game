import type {
  AbilityDefinition,
  AbilityVersion,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';

/**
 * Moderation actions on ability library rows. Every action is idempotent —
 * calling approve() on an already-approved ability is a no-op with a clear
 * outcome kind.
 *
 * Actions mutate BOTH the AbilityDefinition status and (where meaningful)
 * the current AbilityVersion status so downstream reads see a consistent
 * view: an approved definition always has an approved current version.
 *
 * All actions require admin RLS at the Supabase layer — non-admins get
 * rejected at write time. Callers should surface the resulting outcome.
 */

export type ModerationOutcome =
  | { kind: 'ok'; abilityId: string }
  | { kind: 'no_op'; abilityId: string; reason: string }
  | { kind: 'not_found'; abilityId: string }
  | { kind: 'invalid'; abilityId: string; reason: string };

function nowIso(): string {
  return new Date().toISOString();
}

async function updateVersionStatus(
  store: AbilityStore,
  version: AbilityVersion,
  next: AbilityVersion['status'],
  when: string,
): Promise<void> {
  const updated: AbilityVersion = {
    ...version,
    status: next,
    publishedAt: next === 'approved' ? (version.publishedAt ?? when) : version.publishedAt,
    deprecatedAt: next === 'deprecated' ? when : version.deprecatedAt,
  };
  await store.saveVersion(updated);
}

/**
 * Approve a proposed or experimental ability. Promotes both the definition
 * and its current version to `approved`. Requires the current version to
 * exist (defensive; the normalizer always creates one).
 */
export async function approveAbility(
  store: AbilityStore,
  abilityId: string,
  now = nowIso(),
): Promise<ModerationOutcome> {
  const def = store.getDefinition(abilityId);
  if (!def) return { kind: 'not_found', abilityId };
  if (def.status === 'approved') {
    return { kind: 'no_op', abilityId, reason: 'already approved' };
  }
  if (def.status === 'merged' || def.status === 'deprecated') {
    return { kind: 'invalid', abilityId, reason: `cannot approve a ${def.status} identity` };
  }

  const version = store.getCurrentVersion(abilityId);
  if (!version) return { kind: 'invalid', abilityId, reason: 'no current version to publish' };

  await updateVersionStatus(store, version, 'approved', now);
  await store.saveDefinition({ ...def, status: 'approved', updatedAt: now });
  return { kind: 'ok', abilityId };
}

/**
 * Reject an ability — mark the definition + current version as deprecated.
 * Discovery history is preserved; cards that reference it can still resolve
 * combat off the snapshotted version (per Master Plan §16).
 */
export async function rejectAbility(
  store: AbilityStore,
  abilityId: string,
  reason?: string,
  now = nowIso(),
): Promise<ModerationOutcome> {
  const def = store.getDefinition(abilityId);
  if (!def) return { kind: 'not_found', abilityId };
  if (def.status === 'deprecated' || def.status === 'merged') {
    return { kind: 'no_op', abilityId, reason: `already ${def.status}` };
  }

  const version = store.getCurrentVersion(abilityId);
  if (version) await updateVersionStatus(store, version, 'deprecated', now);
  await store.saveDefinition({
    ...def,
    status: 'deprecated',
    updatedAt: now,
    descriptionLong: reason
      ? `${def.descriptionLong ? def.descriptionLong + '\n\n' : ''}[deprecated ${now}] ${reason}`
      : def.descriptionLong,
  });
  return { kind: 'ok', abilityId };
}

/**
 * Merge a proposed/experimental ability into an existing permanent identity.
 * Marks the source `merged` and sets mergedIntoAbilityId → target so admin
 * queries can trace where a candidate went. The target's discovery record
 * (if the caller had one) transfers via a separate flow in the discovery
 * ledger — not this function's job.
 */
export async function mergeAbility(
  store: AbilityStore,
  sourceAbilityId: string,
  targetAbilityId: string,
  now = nowIso(),
): Promise<ModerationOutcome> {
  if (sourceAbilityId === targetAbilityId) {
    return { kind: 'invalid', abilityId: sourceAbilityId, reason: 'cannot merge an ability into itself' };
  }
  const source = store.getDefinition(sourceAbilityId);
  const target = store.getDefinition(targetAbilityId);
  if (!source) return { kind: 'not_found', abilityId: sourceAbilityId };
  if (!target) return { kind: 'not_found', abilityId: targetAbilityId };
  if (target.status !== 'approved') {
    return { kind: 'invalid', abilityId: targetAbilityId, reason: 'merge target must be approved' };
  }
  if (source.status === 'merged') {
    return { kind: 'no_op', abilityId: sourceAbilityId, reason: 'already merged' };
  }

  const version = store.getCurrentVersion(sourceAbilityId);
  if (version) await updateVersionStatus(store, version, 'deprecated', now);

  await store.saveDefinition({
    ...source,
    status: 'merged',
    mergedIntoAbilityId: targetAbilityId,
    updatedAt: now,
  });
  return { kind: 'ok', abilityId: sourceAbilityId };
}

/** Retire an already-approved ability. Alias for reject() with clearer intent. */
export async function deprecateAbility(
  store: AbilityStore,
  abilityId: string,
  reason?: string,
  now = nowIso(),
): Promise<ModerationOutcome> {
  return rejectAbility(store, abilityId, reason, now);
}

/**
 * Analytics snapshot for the admin dashboard. All numbers derived from the
 * current in-memory store — no separate events pipeline (Master Plan §48
 * defers real analytics to Phase 3+).
 */
export interface AbilityLibraryAnalytics {
  totalDefinitions: number;
  approvedCount: number;
  proposedCount: number;
  experimentalCount: number;
  mergedCount: number;
  deprecatedCount: number;
  totalDiscoveries: number;
  firstDiscoveredGloballyCount: number;
  perFamily: Array<{
    familyId: string;
    familyName: string;
    total: number;
    approved: number;
  }>;
}

export function computeAnalytics(store: AbilityStore): AbilityLibraryAnalytics {
  const defs = store.getAllDefinitions();
  const discs = store.getAllDiscoveries();
  const families = store.getAllFamilies();

  const bucket = { approved: 0, proposed: 0, experimental: 0, merged: 0, deprecated: 0 };
  for (const d of defs) bucket[d.status]++;

  const perFamily = families.map((f) => {
    const inFamily = defs.filter((d) => d.familyIds.includes(f.id));
    return {
      familyId: f.id,
      familyName: f.name,
      total: inFamily.length,
      approved: inFamily.filter((d) => d.status === 'approved').length,
    };
  });

  return {
    totalDefinitions: defs.length,
    approvedCount: bucket.approved,
    proposedCount: bucket.proposed,
    experimentalCount: bucket.experimental,
    mergedCount: bucket.merged,
    deprecatedCount: bucket.deprecated,
    totalDiscoveries: discs.length,
    firstDiscoveredGloballyCount: discs.filter((d) => d.firstDiscoveredGlobally).length,
    perFamily,
  };
}

/**
 * List of abilities awaiting admin review — sorted by createdAt ascending
 * so the oldest queue entries surface first. Includes both `proposed` and
 * `experimental` since they both need action.
 */
export function listReviewQueue(store: AbilityStore): AbilityDefinition[] {
  return store
    .getAllDefinitions()
    .filter((d) => d.status === 'proposed' || d.status === 'experimental')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

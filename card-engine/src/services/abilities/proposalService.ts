import type {
  AbilityCandidate,
  AbilityDefinition,
  AbilityVersion,
  PlayerAbilityDiscovery,
  ProposalOutcome,
} from '../../types/abilities';
import type { AbilityStore } from '../persistence/AbilityStore';
import { normalizeCandidate } from './candidateNormalizer';
import { validateAbilityVersion, type ValidationError } from './validator';
import { detectDuplicate } from './duplicateDetector';
import { EFFECT_CATALOG } from '../../data/abilities/effects';
import { TARGET_CATALOG } from '../../data/abilities/targets';
import { TRIGGER_CATALOG } from '../../data/abilities/triggers';
import { CONDITION_CATALOG } from '../../data/abilities/conditions';

/**
 * A4 orchestrator. Route a candidate through:
 *   normalize → primitive-support check → validate → duplicate detect → dispatch.
 *
 * Per Raheem's A4 decision, only exact-normalized-match auto-attaches. Novel
 * and high-similarity candidates enter the admin queue as `status: proposed`.
 * Candidates using unknown primitives are quarantined as `experimental`.
 *
 * Discovery ledger writes are inserted for the caller's userId on the
 * auto-attach path; the reward transaction itself waits for A6 (economy
 * governance §13 approval of the reward value).
 */

export interface ProposeInput {
  candidate: AbilityCandidate;
  userId: string;
  /** Optional now() override for deterministic tests. */
  now?: string;
}

export function proposeAbility(
  store: AbilityStore,
  input: ProposeInput,
): ProposalOutcome {
  const now = input.now ?? new Date().toISOString();
  const { candidate, userId } = input;

  const { definition: candidateDef, version: candidateVer } = normalizeCandidate(candidate, { now });

  // 1. Primitive-support check. Unknown primitives → experimental quarantine.
  const unknownPrimitives = collectUnknownPrimitives(candidateVer);
  if (unknownPrimitives.length > 0) {
    const experimentalDef: AbilityDefinition = {
      ...candidateDef,
      status: 'experimental',
    };
    const experimentalVer: AbilityVersion = {
      ...candidateVer,
      status: 'experimental',
    };
    void store.saveDefinition(experimentalDef);
    void store.saveVersion(experimentalVer);
    return {
      kind: 'queued',
      abilityId: experimentalDef.id,
      abilityVersionId: experimentalVer.id,
      experimental: true,
    };
  }

  // 2. Structural + power-budget validation.
  const validation = validateAbilityVersion(candidateVer, candidateDef);
  if (!validation.ok) {
    return { kind: 'rejected', errors: validation.errors as ValidationError[] };
  }

  // 3. Duplicate detection against the current library.
  const library = buildLibraryPairs(store);
  const dup = detectDuplicate({ def: candidateDef, version: candidateVer }, library);

  if (dup.kind === 'exact_match') {
    // Existing identity survives. Credit discovery for this player if new.
    const existingDef = store.getDefinition(dup.abilityId)!;
    const existingVer = store.getCurrentVersion(dup.abilityId)!;
    const firstForPlayer = !store.getDiscovery(dup.abilityId);
    if (firstForPlayer) {
      const disc: PlayerAbilityDiscovery = {
        playerId: userId,
        abilityId: dup.abilityId,
        discoveredAt: now,
        firstDiscoveredGlobally: !existingDef.firstDiscoveredByUserId,
        timesSeen: 1,
        timesOwnedOnCards: 0,
        rewardGranted: false,
      };
      store.saveDiscovery(disc);
    } else {
      // Bump timesSeen so analytics can track re-encounters.
      const prior = store.getDiscovery(dup.abilityId)!;
      store.saveDiscovery({ ...prior, timesSeen: prior.timesSeen + 1 });
    }
    return {
      kind: 'attached',
      abilityId: existingDef.id,
      abilityVersionId: existingVer.id,
      wasExactMatch: true,
      firstDiscoveryForPlayer: firstForPlayer,
    };
  }

  // 4. Novel or high-similarity → admin queue. Save both rows with
  //    status='proposed' so the admin queue can find them.
  void store.saveDefinition(candidateDef);
  void store.saveVersion(candidateVer);
  return {
    kind: 'queued',
    abilityId: candidateDef.id,
    abilityVersionId: candidateVer.id,
    experimental: false,
    similarityNote:
      dup.kind === 'high_similarity'
        ? { nearestAbilityId: dup.abilityId, overlap: dup.overlap }
        : undefined,
  };
}

function collectUnknownPrimitives(version: AbilityVersion): string[] {
  const unknown: string[] = [];
  if (!(version.targetRule.type in TARGET_CATALOG)) {
    unknown.push(`target:${version.targetRule.type}`);
  }
  for (const eff of version.effects) {
    if (!(eff.type in EFFECT_CATALOG)) unknown.push(`effect:${eff.type}`);
  }
  for (const t of version.triggers ?? []) {
    if (!(t.type in TRIGGER_CATALOG)) unknown.push(`trigger:${t.type}`);
  }
  for (const c of version.conditions ?? []) {
    if (!(c.type in CONDITION_CATALOG)) unknown.push(`condition:${c.type}`);
  }
  return unknown;
}

function buildLibraryPairs(
  store: AbilityStore,
): Array<{ def: AbilityDefinition; version: AbilityVersion }> {
  const out: Array<{ def: AbilityDefinition; version: AbilityVersion }> = [];
  for (const def of store.getAllDefinitions()) {
    const version = store.getCurrentVersion(def.id);
    if (!version) continue;
    out.push({ def, version });
  }
  return out;
}

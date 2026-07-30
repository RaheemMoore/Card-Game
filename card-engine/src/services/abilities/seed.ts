import type { AbilityStore } from '../persistence/AbilityStore';
import { ABILITY_FAMILIES } from '../../data/abilities/families';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import { validateAbilityVersion } from './validator';
import { registerPlaceholderArt } from './canonicalArtPipeline';

/**
 * Idempotently populate the ability library with the launch taxonomy (8
 * families) and the starting ability roster (6 shared basics + 3 each for
 * Barbarian, Druid and Seraph — see data/abilities/seedAbilities.ts).
 *
 * Safe to call every session — existing rows are overwritten with the
 * latest catalog values. Admin-only against Supabase (RLS enforces).
 *
 * Returns a summary of what was written so callers can log outcomes.
 */
export interface SeedResult {
  familiesUpserted: number;
  definitionsUpserted: number;
  versionsUpserted: number;
  skippedFamilies: number;
  skippedDefinitions: number;
  skippedVersions: number;
  placeholderArtsCreated: number;
  /** Seeds rejected by the validator. Always 0 in DEV — it throws instead. */
  invalidSkipped: number;
}

export async function seedAbilityLibrary(store: AbilityStore): Promise<SeedResult> {
  const result: SeedResult = {
    familiesUpserted: 0,
    definitionsUpserted: 0,
    versionsUpserted: 0,
    skippedFamilies: 0,
    skippedDefinitions: 0,
    skippedVersions: 0,
    placeholderArtsCreated: 0,
    invalidSkipped: 0,
  };

  for (const family of ABILITY_FAMILIES) {
    if (isSameFamily(store.getFamily(family.id), family)) {
      result.skippedFamilies++;
      continue;
    }
    await store.saveFamily(family);
    result.familiesUpserted++;
  }

  for (const seed of SEED_ABILITIES) {
    // Validate at SEED time, not only on the player-proposal path.
    //
    // With a hand-authored roster the traps are real and quiet: an ultimate
    // built from two effects scores below its band floor, a lifesteal placed
    // before any damage heals nothing, a status id typo references something
    // that does not exist. All three produce an ability that looks fine in
    // the Codex and does nothing in combat. Failing loudly in DEV is how they
    // get caught at boot instead of mid-battle; in production we log and keep
    // going rather than bricking the app over one bad row.
    const validation = validateAbilityVersion(seed.version, seed.definition);
    if (!validation.ok) {
      const detail = validation.errors.map((e) => `${e.path}: ${e.message}`).join('; ');
      const message = `[abilities] seed "${seed.definition.slug}" is invalid — ${detail}`;
      if (import.meta.env.DEV) throw new Error(message);
      // eslint-disable-next-line no-console
      console.error(message);
      result.invalidSkipped++;
      continue;
    }

    if (isSameDefinition(store.getDefinition(seed.definition.id), seed.definition)) {
      result.skippedDefinitions++;
    } else {
      await store.saveDefinition(seed.definition);
      result.definitionsUpserted++;
    }
    if (isSameVersion(store.getVersion(seed.version.id), seed.version)) {
      result.skippedVersions++;
    } else {
      await store.saveVersion(seed.version);
      result.versionsUpserted++;
    }
    // Auto-register a placeholder so the Codex has something to render at
    // 64px. Idempotent: skips if any art asset already exists (including a
    // real Leonardo one that landed later).
    const primaryFamily = seed.definition.familyIds[0];
    const family = primaryFamily ? store.getFamily(primaryFamily) : undefined;
    const placeholder = await registerPlaceholderArt(store, seed.definition, family);
    if (placeholder) result.placeholderArtsCreated++;
  }

  return result;
}

function isSameFamily(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function isSameDefinition(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function isSameVersion(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Clears a locally-cached ability library when the roster has been replaced.
 *
 * `seedAbilityLibrary` is UPSERT-ONLY — it has no prune path. So when the
 * roster shrinks or is renamed, every browser that has run the app before
 * keeps the retired abilities in localStorage indefinitely: they stay visible
 * in the Codex, stay pickable by the assigner, and stay attached to cards
 * that reference them. Bumping the version below is what evicts them.
 *
 * On the Supabase path this clears only the local cache; the SQL migration
 * (`supabase/migrations/20260728_ability_roster_reset.sql`) owns the remote
 * rows. Both are needed — neither substitutes for the other.
 */

/** Bump when the roster changes in a way that must evict cached copies. */
export const ABILITY_ROSTER_VERSION = 2;

const VERSION_KEY = 'card-engine-ability-roster-version';

/**
 * Everything the local ability library writes. All three go together: keeping
 * references while dropping definitions would leave cards pointing at
 * abilities that no longer exist, which is exactly the state `useBattle`
 * throws on.
 */
const LOCAL_KEYS = [
  'card-engine-ability-library',
  'card-engine-ability-references',
  'card-engine-ability-discoveries',
] as const;

function readStoredVersion(): number {
  if (typeof window === 'undefined') return ABILITY_ROSTER_VERSION;
  try {
    const raw = window.localStorage.getItem(VERSION_KEY);
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    // Storage unavailable (private browsing). Treat as current so we do not
    // wipe on every boot in a session that cannot remember the version.
    return ABILITY_ROSTER_VERSION;
  }
}

/**
 * Wipe the cached library if it predates the current roster.
 *
 * Returns true when a reset happened, so the caller can force a reassignment
 * pass afterwards instead of leaving every card without abilities.
 *
 * Must run BEFORE `seedAbilityLibrary`, or the fresh roster is written and
 * then immediately deleted.
 */
export function resetAbilityRosterIfStale(): boolean {
  if (typeof window === 'undefined') return false;
  if (readStoredVersion() >= ABILITY_ROSTER_VERSION) return false;

  try {
    for (const key of LOCAL_KEYS) window.localStorage.removeItem(key);
    window.localStorage.setItem(VERSION_KEY, String(ABILITY_ROSTER_VERSION));
    return true;
  } catch {
    return false;
  }
}

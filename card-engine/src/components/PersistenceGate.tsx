import { useEffect, useState, type ReactNode } from 'react';
import { ensureSession, isSupabaseConfigured, type EnsureSessionReason } from '../services/persistence/supabaseClient';
import { SupabaseCardStore } from '../services/persistence/SupabaseCardStore';
import { SupabaseLedgerStore } from '../services/persistence/SupabaseLedgerStore';
import { SupabaseAbilityStore } from '../services/persistence/SupabaseAbilityStore';
import { SupabaseBossStore } from '../services/persistence/SupabaseBossStore';
import { setCardStore, getAllCards } from '../services/storage';
import { setAbilityStore, getAbilityStore } from '../services/abilities/registry';
import { setBossStore, getBossStore } from '../services/bosses/registry';
import { seedAbilityLibrary } from '../services/abilities/seed';
import { seedBossLibrary } from '../services/bosses/seed';
import { SEED_BOSSES } from '../data/bosses/seedBosses';
import { backfillCardAbilities } from '../services/abilities/legacyBackfill';
import {
  generateCanonicalArt,
  backfillApprovedArt,
} from '../services/abilities/canonicalArtPipeline';
import * as ledger from '../services/economy/transactionLedger';
import { initialize as initializeWallet, auditBalance } from '../services/economy/walletService';
import { resumeIfPending as resumeForgeIfPending, sweepOrphanedReservations } from '../services/forge/forgeController';
import { sweepOrphanedCardReservations } from '../services/forge/cardJobController';
import { runMigrationIfNeeded, clearLegacyLocalStorage } from '../services/persistence/migration';
import { drain as drainSyncQueue, reviveDeadLetters } from '../services/persistence/SyncQueue';

type GateState =
  | { kind: 'loading'; step: string }
  | { kind: 'ready'; mode: 'supabase' | 'local'; note?: string }
  | { kind: 'error'; reason: EnsureSessionReason | 'migration' | 'hydrate' | 'unknown'; message: string };

/**
 * Dev-only trigger to fire Leonardo for a single ability. Callable from
 * the browser console as `window.__cardEngineDev.generateArt('ability_id')`.
 * Guarded by import.meta.env.DEV; the assignment is a no-op in production.
 *
 * Real production art moderation lives in the (future) admin panel A9.
 */
function installDevArtTools(): void {
  if (!import.meta.env.DEV) return;
  const w = globalThis as unknown as { __cardEngineDev?: Record<string, unknown> };
  w.__cardEngineDev = w.__cardEngineDev ?? {};
  (w.__cardEngineDev as Record<string, unknown>).generateArt = async (abilityId: string) => {
    const store = getAbilityStore();
    const def = store.getDefinition(abilityId);
    const version = store.getCurrentVersion(abilityId);
    if (!def || !version) throw new Error(`No definition/version for ${abilityId}`);
    const family = store.getFamily(def.familyIds[0]);
    const result = await generateCanonicalArt(store, { def, version, family });
    // eslint-disable-next-line no-console
    console.debug(`[dev-art] generated ${abilityId} → asset ${result.asset.id}`);
    return result.asset.id;
  };
}

async function seedAndBackfillAbilitiesLocal(): Promise<void> {
  const store = getAbilityStore();
  try {
    if (store.getAllDefinitions().length === 0) {
      await seedAbilityLibrary(store);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[abilities] local seed failed:', err);
  }
  // Runs unconditionally — heals accounts that had definitions seeded
  // before Gate 7A landed (their art rows are stale placeholders).
  try {
    const artResult = await backfillApprovedArt(store);
    if (artResult.upgraded > 0 && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(`[abilities] approved-art backfill upgraded ${artResult.upgraded} row(s)`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[abilities] approved-art backfill failed:', err);
  }
  try {
    const result = backfillCardAbilities(store, getAllCards());
    if (result.cardsUpdated > 0 && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        `[abilities] local backfill wrote ${result.referencesWritten} refs across ${result.cardsUpdated} card(s)`,
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[abilities] local backfill failed:', err);
  }
}

async function seedBossesLocal(): Promise<void> {
  const store = getBossStore();
  try {
    if (store.getAllDefinitions().length === 0) {
      await seedBossLibrary(store);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[bosses] local seed failed:', err);
  }
}

// Forge job reconciliation. Runs after the wallet is initialized so the ledger
// is populated. Resumes a recently-interrupted forge (reusing its reservation)
// and refunds any pending forge reservation orphaned by a closed tab — healing
// money silently lost before the forge controller existed.
function reconcileForgeJobs(): void {
  try {
    resumeForgeIfPending();
    const reclaimed = sweepOrphanedReservations();
    if (reclaimed > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[forge] reclaimed ${reclaimed} orphaned forge reservation(s) on startup`);
    }
    // A hard reload drops any in-flight reforge / tier-up job (see
    // cardJobController header) — refund whatever reservation it was holding.
    const cardReclaimed = sweepOrphanedCardReservations();
    if (cardReclaimed > 0) {
      // eslint-disable-next-line no-console
      console.warn(`[forge] reclaimed ${cardReclaimed} orphaned card-job reservation(s) on startup`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[forge] reconciliation failed:', err);
  }
}

// Retry a transient boot operation. Under load the Supabase instance can
// return a Postgres statement-timeout (surfaced as a 5xx) on an otherwise
// healthy read; without this a single blip hard-fails the whole login into
// the "forge is unreachable" screen. A couple of backoff attempts lets the
// query succeed once the momentary contention clears. A genuinely persistent
// error still throws after the last attempt and surfaces the error screen.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 600 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const obj = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (obj.message) parts.push(String(obj.message));
    if (obj.details) parts.push(`details=${String(obj.details)}`);
    if (obj.hint) parts.push(`hint=${String(obj.hint)}`);
    if (obj.code) parts.push(`code=${String(obj.code)}`);
    if (parts.length > 0) return parts.join(' — ');
    try {
      return JSON.stringify(err);
    } catch {
      return '(unserializable error)';
    }
  }
  return String(err);
}

// Mounts before the router. Responsible for:
//   1. Choosing the persistence mode (Supabase if configured, otherwise
//      the legacy localStorage-only path).
//   2. Signing in anonymously.
//   3. Running the one-time localStorage → Supabase migration.
//   4. Swapping in Supabase-backed card + ledger stores.
//   5. Hydrating both caches from Supabase.
//   6. Seeding demo wallet balances if the ledger is fresh.
//   7. Running auditBalance() to detect drift and warn.
export function PersistenceGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: 'loading', step: 'Awakening the forge…' });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      // Legacy path — Supabase not configured. Behavior identical to
      // pre-Phase-2. Fires and renders immediately.
      if (!isSupabaseConfigured()) {
        initializeWallet();
        reconcileForgeJobs();
        await seedAndBackfillAbilitiesLocal();
        await seedBossesLocal();
        installDevArtTools();
        if (!cancelled) setState({ kind: 'ready', mode: 'local', note: 'localStorage (no VITE_SUPABASE_URL set)' });
        return;
      }

      // Auth.
      setState({ kind: 'loading', step: 'Signing in…' });
      const session = await ensureSession();
      if (cancelled) return;
      if (!session.ok) {
        if (session.reason === 'anon_disabled') {
          // Fall back to legacy path so the app still works when the
          // project hasn't enabled anonymous sign-ins yet.
          initializeWallet();
          reconcileForgeJobs();
          await seedAndBackfillAbilitiesLocal();
          installDevArtTools();
          if (!cancelled) {
            setState({
              kind: 'ready',
              mode: 'local',
              note: 'Anonymous sign-in disabled in Supabase — running on localStorage. Enable in Auth → Providers.',
            });
          }
          return;
        }
        setState({ kind: 'error', reason: session.reason, message: session.message });
        return;
      }

      // Migration (idempotent, guarded by sentinel).
      setState({ kind: 'loading', step: 'Migrating your collection…' });
      const migration = await runMigrationIfNeeded();
      if (cancelled) return;
      if (migration.reason === 'failed') {
        setState({ kind: 'error', reason: 'migration', message: migration.error ?? 'Migration failed.' });
        return;
      }
      if (migration.reason === 'lock_contended') {
        // Another tab is doing the migration. Wait a beat and retry
        // hydrate — its sentinel should be set by then.
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (migration.ran && import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug(
          `[persistence] migrated ${migration.cardCount} card(s), ${migration.txnCount} txn(s), ${migration.portraitCount} portrait(s)` +
            (migration.portraitFailures.length ? ` (${migration.portraitFailures.length} portrait upload(s) failed — cards keep prior URL)` : ''),
        );
      }

      // Swap stores and hydrate caches.
      setState({ kind: 'loading', step: 'Loading your cards…' });
      const cardStore = new SupabaseCardStore();
      const ledgerStore = new SupabaseLedgerStore();
      const abilityStore = new SupabaseAbilityStore();
      const bossStore = new SupabaseBossStore();
      setCardStore(cardStore);
      ledger.setStore(ledgerStore);
      setAbilityStore(abilityStore);
      setBossStore(bossStore);
      try {
        await Promise.all([
          withRetry(() => cardStore.hydrate()),
          withRetry(() => ledgerStore.hydrate()),
          withRetry(() => abilityStore.hydrate()),
          withRetry(() => bossStore.hydrate()),
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[persistence] hydrate failed:', err);
        setState({
          kind: 'error',
          reason: 'hydrate',
          message: extractErrorMessage(err),
        });
        return;
      }
      if (cancelled) return;

      // Ability library seed — admin-only. RLS rejects non-admin writes.
      // Best-effort: if the library is empty and the caller isn't admin,
      // the failure is logged and Codex reads simply return empty until an
      // admin runs the seed. Backfill runs regardless — it only writes
      // per-user references which every user is allowed to write.
      if (abilityStore.getAllDefinitions().length === 0) {
        try {
          const seedResult = await seedAbilityLibrary(abilityStore);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug(
              `[abilities] seeded library: ${seedResult.familiesUpserted} families, ${seedResult.definitionsUpserted} definitions, ${seedResult.versionsUpserted} versions`,
            );
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug(
              '[abilities] library seed skipped (likely non-admin session):',
              extractErrorMessage(err),
            );
          }
        }
      }

      try {
        const artResult = await backfillApprovedArt(abilityStore);
        if (artResult.upgraded > 0 && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            `[abilities] approved-art backfill upgraded ${artResult.upgraded} row(s)`,
          );
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            '[abilities] approved-art backfill skipped:',
            extractErrorMessage(err),
          );
        }
      }

      // Boss seed runs when the store is empty OR when the currently-shipped
      // SEED_BOSSES version isn't present yet (new version added in code but
      // the user's Supabase row still holds an older version). The seed's
      // upsert is idempotent — writing v4 on top of v3 is a no-op cost but
      // makes the interruptible-actions rollout invisible to existing users.
      const bossSeedNeeded =
        bossStore.getAllDefinitions().length === 0 ||
        SEED_BOSSES.some(({ version }) => !bossStore.getVersion(version.id));
      if (bossSeedNeeded) {
        try {
          const seedResult = await seedBossLibrary(bossStore);
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug(
              `[bosses] seeded library: ${seedResult.definitionsUpserted} definitions, ${seedResult.versionsUpserted} versions`,
            );
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.debug(
              '[bosses] library seed skipped (likely non-admin session):',
              extractErrorMessage(err),
            );
          }
        }
      }

      try {
        const backfill = backfillCardAbilities(abilityStore, getAllCards());
        if (backfill.cardsUpdated > 0 && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            `[abilities] legacy backfill wrote ${backfill.referencesWritten} refs across ${backfill.cardsUpdated} card(s); ${backfill.cardsSkippedNoSeedMatch} card(s) had no seed match yet`,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[abilities] backfill failed:', extractErrorMessage(err));
      }

      // Seed demo balances if the ledger is empty (first-ever boot).
      // Idempotent — no-op if the migration or hydrate already populated
      // transactions.
      initializeWallet();
      reconcileForgeJobs();
      // Give any previously dead-lettered ops a fresh chance now that a fix may
      // have shipped (e.g. a dropped DB constraint), then kick a drain — also
      // covers anything initializeWallet's seed enqueued.
      void reviveDeadLetters().then(() => drainSyncQueue());

      // Drift check — governance §13 auditability. Warn only; do not
      // silently overwrite.
      for (const currency of ['premium', 'gameplay'] as const) {
        const drift = auditBalance(currency);
        if (drift) {
          // eslint-disable-next-line no-console
          console.warn(`[persistence] balance drift for ${currency}: derived=${drift.derived} ledgerSum=${drift.ledgerSum}`);
        }
      }

      // Hard cutover — wipe legacy localStorage keys now that Supabase
      // owns the state. Self-gated by the migration sentinel.
      clearLegacyLocalStorage(session.session.user.id);

      installDevArtTools();
      if (!cancelled) setState({ kind: 'ready', mode: 'supabase' });
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'ready') {
    // Persistence-mode note is exposed via a data attribute so it's
    // discoverable without cluttering the UI.
    return (
      <div data-persistence-mode={state.mode} data-persistence-note={state.note ?? ''}>
        {children}
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div
          className="max-w-md p-6 rounded-lg border shadow-lg text-sm"
          style={{
            background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
            color: '#4a3211',
            borderColor: 'rgba(74,50,17,0.4)',
          }}
        >
          <h2 className="font-fantasy text-lg font-bold mb-2">The forge is unreachable.</h2>
          <p className="mb-3">
            <span className="font-mono text-xs">{state.reason}</span>: {state.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded font-fantasy font-bold text-sm"
            style={{ background: '#8a1c1c', color: '#faeaca' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <div
          className="inline-block w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ borderColor: 'rgba(250,234,202,0.4)', borderTopColor: 'transparent' }}
        />
        <p className="font-fantasy text-bone/80 text-sm tracking-wider">{state.step}</p>
      </div>
    </div>
  );
}

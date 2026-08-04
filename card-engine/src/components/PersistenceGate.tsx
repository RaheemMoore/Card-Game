import { useEffect, useState, type ReactNode } from 'react';
import {
  ensureSession,
  isCurrentUserAnonymous,
  isSupabaseConfigured,
  type EnsureSessionReason,
} from '../services/persistence/supabaseClient';
import { Login } from '../pages/Login';
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
import { assignAbilitiesForCards } from '../services/abilities/rosterAssigner';
import { resetAbilityRosterIfStale } from '../services/abilities/rosterReset';
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
  | { kind: 'needs_login' }
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
  // BEFORE seeding: seedAbilityLibrary is upsert-only with no prune, so a
  // browser that ran the old roster keeps those definitions forever unless
  // the cache is evicted first. Returns true when it actually wiped, which
  // is also the signal that every card needs a fresh loadout.
  const rosterWasReset = resetAbilityRosterIfStale();
  try {
    // Always call — seedAbilityLibrary is idempotent per-item (diffs each
    // definition/version individually), so this is cheap once seeded.
    // Gating on "store is completely empty" meant any ability added to
    // SEED_ABILITIES after the first-ever boot silently never reached an
    // already-bootstrapped store — a real bug, not just belt-and-suspenders.
    await seedAbilityLibrary(store);
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
    // `force` only after a reset: a routine boot fills cards that have no
    // abilities, but must not reshuffle a loadout the player already has.
    const result = assignAbilitiesForCards(store, getAllCards(), { force: rosterWasReset });
    if (result.cardsUpdated > 0 && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug(
        `[abilities] assigned ${result.referencesWritten} refs across ${result.cardsUpdated} card(s)` +
          (result.cardsUsingFallback > 0
            ? ` — ${result.cardsUsingFallback} used the shared basics (archetype not authored yet)`
            : ''),
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[abilities] roster assignment failed:', err);
  }
}

async function seedBossesLocal(): Promise<void> {
  const store = getBossStore();
  try {
    // Always call. `seedBossLibrary` is a plain idempotent upsert, so this is
    // cheap once seeded — and gating on "the store is completely empty" meant
    // any boss added to SEED_BOSSES after the first-ever boot silently never
    // reached an already-bootstrapped store. The three Overreach champions
    // were invisible in the picker for exactly this reason. The ability seed
    // path hit the same bug and fixed it the same way; this one was missed.
    await seedBossLibrary(store);
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

// Backoff across repeated boot attempts (manual Retry, a plain F5, or a
// fresh tab all re-run boot() from scratch). Without this, every reload
// during an outage immediately re-fires the sign-in call plus up to four
// concurrent hydrate queries, which piles more load onto a backend that's
// already struggling to recover instead of giving it room to. Persisted in
// sessionStorage so the wait survives the reload that triggered it.
const COOLDOWN_KEY = 'persistenceGateCooldown';
const BASE_BACKOFF_MS = 15_000;
const MAX_BACKOFF_MS = 120_000;

interface Cooldown {
  failCount: number;
  nextAttempt: number;
}

function readCooldown(): Cooldown {
  try {
    const raw = sessionStorage.getItem(COOLDOWN_KEY);
    if (!raw) return { failCount: 0, nextAttempt: 0 };
    return JSON.parse(raw) as Cooldown;
  } catch {
    return { failCount: 0, nextAttempt: 0 };
  }
}

function recordFailure(): void {
  const prev = readCooldown();
  const failCount = prev.failCount + 1;
  const backoff = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (failCount - 1));
  try {
    sessionStorage.setItem(COOLDOWN_KEY, JSON.stringify({ failCount, nextAttempt: Date.now() + backoff }));
  } catch {
    // sessionStorage unavailable (private mode, etc.) — backoff just won't persist.
  }
}

function clearCooldown(): void {
  try {
    sessionStorage.removeItem(COOLDOWN_KEY);
  } catch {
    // ignore
  }
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
/**
 * The deliberately narrow exceptions to the wall above.
 *
 * `/dev/sprite-preview` is an art tool: it reads sprite manifests and PNGs the
 * operator picks off their own disk, renders them, and talks to nothing else.
 * `/dev/boss-readout` reads the shipped boss definitions and runs the combat
 * reducer in memory to measure them. Neither has player data on it to protect,
 * and requiring a signed-in session to look at a sprite sheet — or to print a
 * boss writeup for the team — is friction with nothing behind it.
 *
 * Two properties keep this from becoming the hole the comment above warns
 * about:
 *
 *   1. `import.meta.env.DEV` is statically replaced at build time, so in a
 *      production bundle this function's body is dead code and the routes are
 *      unreachable no matter what path a visitor types.
 *   2. It matches EXACT pathnames from a fixed list rather than a `/dev/`
 *      prefix. A prefix would silently exempt every future dev route,
 *      including any that DOES touch player data — which is precisely how a
 *      narrow exception turns into a general one. Adding a route here has to
 *      be a decision, not an accident of naming.
 */
const DEV_ONLY_UNGATED_ROUTES = [
  '/dev/sprite-preview',
  '/dev/boss-readout',
  ...(import.meta.env.DEV ? ['/dev/courtyard-v2-preview'] : []),
];

function isDevOnlyArtRoute(): boolean {
  if (!import.meta.env.DEV) return false;
  return DEV_ONLY_UNGATED_ROUTES.includes(window.location.pathname);
}

/** Storage key for the local-dev auth bypass. */
const DEV_AUTH_KEY = 'cardEngine.dev.bypassLogin';

/**
 * Local-development escape from the login wall.
 *
 * The wall rejects anonymous sessions, and everything downstream of it —
 * migration, ability seeding, BOSS seeding, hydration — is skipped when it
 * trips. So working on combat means either signing in on every reload, or
 * being unable to open the battle at all. This lets the anonymous session
 * Supabase already handed us continue through the full startup path, which is
 * exactly how the app behaved before the login screen became the front door.
 *
 * Three things keep it from being the hole the wall exists to close:
 *
 *   1. `import.meta.env.DEV` is replaced at build time, so in a production
 *      bundle this function is dead code and always returns false.
 *   2. It is OPT-IN, not the default. A plain `npm run dev` still shows the
 *      login screen, so the real front door stays testable locally.
 *   3. It grants nothing but an anonymous session — the same one any visitor
 *      already gets. It does not fabricate a role, and `is_admin()` on the
 *      server is unaffected.
 *
 * Enable with `?devauth=1` (persists), disable with `?devauth=0`.
 */
function devAuthBypassEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const param = new URLSearchParams(window.location.search).get('devauth');
    if (param === '1') localStorage.setItem(DEV_AUTH_KEY, '1');
    if (param === '0') localStorage.removeItem(DEV_AUTH_KEY);
    return localStorage.getItem(DEV_AUTH_KEY) === '1';
  } catch {
    // Private mode / storage disabled — fail CLOSED, never open.
    return false;
  }
}

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

      // Backoff — if a prior attempt this session failed, wait out the
      // cooldown before touching Supabase again (see recordFailure above).
      const cooldown = readCooldown();
      const waitMs = cooldown.nextAttempt - Date.now();
      if (waitMs > 0) {
        const seconds = Math.ceil(waitMs / 1000);
        setState({ kind: 'loading', step: `The forge needs a moment to recover — retrying in ${seconds}s…` });
        await new Promise((r) => setTimeout(r, waitMs));
        if (cancelled) return;
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
        recordFailure();
        setState({ kind: 'error', reason: session.reason, message: session.message });
        return;
      }

      // ---- THE WALL --------------------------------------------------------
      // The login screen is the landing page. An anonymous session counts as
      // signed OUT: Supabase hands one to every visitor automatically, so
      // treating it as signed in is exactly how "anyone can go to the main page
      // and spend api tokens" happened.
      //
      // Gates on SESSION SHAPE ONLY, never on role. `fetchMyRole()` answers
      // 'user' on a network blip, so gating the door on it would eject a
      // legitimately signed-in operator over a dropped packet.
      //
      // Deliberately before hydration — a signed-out visitor should reach the
      // login art immediately, not after their (nonexistent) cards load.
      if (isCurrentUserAnonymous() && !devAuthBypassEnabled()) {
        if (!cancelled) setState({ kind: 'needs_login' });
        return;
      }

      // Dev bypass takes the LOCAL path, not the Supabase one.
      //
      // Letting an anonymous session continue into the normal startup ran
      // straight into `new row violates row-level security policy for table
      // "cards"` — the migration tries to push localStorage rows up, and RLS
      // is keyed on a real signed-in uid. That is the policy working
      // correctly; the bypass has no business arguing with it.
      //
      // So this mirrors the existing `anon_disabled` fallback — everything
      // stays on localStorage — plus the boss seed that fallback is missing.
      // Without bosses the battle picker is empty, which is the one thing this
      // bypass exists to let us look at.
      if (isCurrentUserAnonymous()) {
        setState({ kind: 'loading', step: 'Dev mode — seeding locally…' });
        initializeWallet();
        reconcileForgeJobs();
        await seedAndBackfillAbilitiesLocal();
        await seedBossesLocal();
        installDevArtTools();
        if (!cancelled) {
          setState({
            kind: 'ready',
            mode: 'local',
            note: 'DEV LOGIN BYPASS — anonymous session on localStorage. Append ?devauth=0 to disable.',
          });
        }
        return;
      }

      // Migration (idempotent, guarded by sentinel).
      setState({ kind: 'loading', step: 'Migrating your collection…' });
      const migration = await runMigrationIfNeeded();
      if (cancelled) return;
      if (migration.reason === 'failed') {
        recordFailure();
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
        recordFailure();
        setState({
          kind: 'error',
          reason: 'hydrate',
          message: extractErrorMessage(err),
        });
        return;
      }
      if (cancelled) return;

      // Ability library seed — admin-only. RLS rejects non-admin writes.
      // Best-effort: if the caller isn't admin, the failure is logged and
      // Codex reads simply return whatever's already there until an admin
      // runs the seed. Backfill runs regardless — it only writes per-user
      // references which every user is allowed to write.
      //
      // Always attempted (not just when the library is empty) — seedAbilityLibrary
      // diffs each definition/version individually and is a no-op once already
      // current, so gating on "empty" meant any ability added to SEED_ABILITIES
      // after the first-ever admin boot would never reach an already-seeded store.
      // Same reason as the local path: evict a stale cached library before
      // seeding, since seeding cannot prune. The SQL migration handles the
      // remote rows; this only clears what this browser cached.
      const rosterWasReset = resetAbilityRosterIfStale();
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
        // On this path the SQL migration owns the remote wipe; the local call
        // above only evicted this browser's cache. Force here too so a card
        // whose old references the migration deleted gets a new loadout
        // instead of entering battle with none — which throws.
        const backfill = assignAbilitiesForCards(abilityStore, getAllCards(), {
          force: rosterWasReset,
        });
        if (backfill.cardsUpdated > 0 && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug(
            `[abilities] assigned ${backfill.referencesWritten} refs across ${backfill.cardsUpdated} card(s); ${backfill.cardsUsingFallback} used the shared basics`,
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
      clearCooldown();
      if (!cancelled) setState({ kind: 'ready', mode: 'supabase' });
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === 'needs_login') {
    // The router never mounts. That is the point of putting the wall here
    // rather than in a route guard: App.tsx has 20+ routes and a per-route
    // guard is one forgotten route away from a hole.
    //
    // The one exception mounts the router WITHOUT waiting for persistence to
    // come up, because the art tool does not read any of it. Returning
    // `children` here rather than falling through matters: every branch below
    // this point assumes a resolved session, so a fallthrough lands on the
    // loading state and the tool never renders.
    return isDevOnlyArtRoute() ? <>{children}</> : <Login />;
  }

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

  // Boot screen. This is the beat straight after signing in — the courtyard's
  // Phaser chunk is ~1.2 MB and the cards are still hydrating — so it gets the
  // courtyard plate behind it rather than a spinner on black. Landing in the
  // world should start here, not at the moment the canvas appears.
  return (
    <div className="relative min-h-dvh flex items-center justify-center overflow-hidden">
      <img
        src="/assets/castle/courtyard.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'blur(3px) brightness(0.55)', transform: 'scale(1.06)' }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(20,14,6,0.35)' }} />

      <div className="relative text-center px-6">
        <h1
          className="font-fantasy text-3xl md:text-4xl font-bold mb-2 tracking-wide"
          style={{ color: '#f5d98a', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}
        >
          The Courtyard
        </h1>
        <div
          className="mx-auto mb-5 h-px w-32"
          style={{ background: 'linear-gradient(to right, transparent, #f5d98a, transparent)' }}
        />
        <div
          className="inline-block w-10 h-10 rounded-full border-4 border-t-transparent animate-spin mb-4 motion-reduce:animate-none"
          style={{ borderColor: 'rgba(245,217,138,0.45)', borderTopColor: 'transparent' }}
        />
        {/* aria-live so a screen reader hears progress rather than silence. */}
        <p
          className="font-fantasy text-sm tracking-wider"
          style={{ color: '#e8d4ae', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
          aria-live="polite"
        >
          {state.step}
        </p>
      </div>
    </div>
  );
}

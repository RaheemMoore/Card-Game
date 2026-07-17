// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { EconomyTransaction } from '../../types/economy';
import { backfillSequences, runMigrationIfNeeded } from './migration';
import { __setClientForTest } from './supabaseClient';
import { LEDGER_STORAGE_KEY } from '../../data/economy/assumptions';

const CARD_STORAGE_KEY = 'card-engine-collection';
const SENTINEL_PREFIX = 'card-engine-migrated-to:';
const FAKE_USER_ID = '00000000-0000-4000-8000-000000000001';

// jsdom v29 dropped the built-in Storage implementation, so tests that
// touch localStorage need their own polyfill. Minimal, per-test in-memory.
function installFakeLocalStorage() {
  const bag = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return bag.size;
    },
    clear() {
      bag.clear();
    },
    getItem(key) {
      return bag.has(key) ? bag.get(key)! : null;
    },
    key(index) {
      return Array.from(bag.keys())[index] ?? null;
    },
    removeItem(key) {
      bag.delete(key);
    },
    setItem(key, value) {
      bag.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
}

function txn(id: string, createdAt: string, sequence?: number): EconomyTransaction {
  return {
    transactionId: id,
    currency: 'premium',
    amount: 10,
    type: 'reward',
    status: 'committed',
    balanceBefore: 0,
    balanceAfter: 10,
    sequence: sequence as number,
    createdAt,
  };
}

// Minimal Supabase stand-in — enough surface for the migration's
// upsert calls to resolve `{ error: null }` without pulling in a real
// client. Records what was called so tests can assert.
function makeFakeClient() {
  const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
  const client = {
    from(table: string) {
      return {
        upsert(payload: unknown) {
          calls.push({ table, op: 'upsert', payload });
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
    storage: {
      from() {
        return {
          upload() {
            return Promise.resolve({ data: null, error: null });
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://fake.supabase/${path}` } };
          },
        };
      },
    },
  };
  return { client, calls };
}

describe('backfillSequences', () => {
  it('leaves already-sequenced transactions untouched', () => {
    const input = [txn('a', '2026-07-17T00:00:00Z', 1), txn('b', '2026-07-17T00:00:01Z', 2)];
    const out = backfillSequences(input);
    expect(out.map((t) => t.sequence)).toEqual([1, 2]);
  });

  it('assigns sequences to unsequenced txns in createdAt order', () => {
    // Deliberately out of order in the input array.
    const input = [
      txn('b', '2026-07-17T00:00:02Z'),
      txn('a', '2026-07-17T00:00:01Z'),
      txn('c', '2026-07-17T00:00:03Z'),
    ];
    const out = backfillSequences(input);
    const byId = new Map(out.map((t) => [t.transactionId, t.sequence]));
    expect(byId.get('a')).toBe(1);
    expect(byId.get('b')).toBe(2);
    expect(byId.get('c')).toBe(3);
  });

  it('continues numbering from the existing max', () => {
    const input = [
      txn('a', '2026-07-17T00:00:00Z', 5), // already sequenced at 5
      txn('b', '2026-07-17T00:00:01Z'), // unsequenced — should be 6
      txn('c', '2026-07-17T00:00:02Z'), // unsequenced — should be 7
    ];
    const out = backfillSequences(input);
    const byId = new Map(out.map((t) => [t.transactionId, t.sequence]));
    expect(byId.get('a')).toBe(5);
    expect(byId.get('b')).toBe(6);
    expect(byId.get('c')).toBe(7);
  });
});

describe('runMigrationIfNeeded — fast paths', () => {
  beforeEach(() => {
    installFakeLocalStorage();
    __setClientForTest(null, null);
  });

  afterEach(() => {
    localStorage.clear();
    __setClientForTest(null, null);
  });

  it('no-op when the local sentinel is already set', async () => {
    const { client, calls } = makeFakeClient();
    __setClientForTest(client as never, FAKE_USER_ID);
    localStorage.setItem(`${SENTINEL_PREFIX}${FAKE_USER_ID}`, '2026-07-17T00:00:00Z');

    const result = await runMigrationIfNeeded();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe('already_migrated');
    expect(calls.length).toBe(0);
  });

  it('sets sentinels and does not run when there is no local state', async () => {
    const { client, calls } = makeFakeClient();
    __setClientForTest(client as never, FAKE_USER_ID);

    const result = await runMigrationIfNeeded();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe('no_local_state');
    // profiles.upsert(migrated_at) is the only remote call in this path.
    expect(calls.some((c) => c.table === 'profiles')).toBe(true);
    // Local sentinel is set so subsequent boots hit the fast path.
    expect(localStorage.getItem(`${SENTINEL_PREFIX}${FAKE_USER_ID}`)).toBeTruthy();
  });

  it('reports failure when no supabase client is available', async () => {
    __setClientForTest(null, null);
    // Put something in localStorage so the sentinel/no-state paths don't
    // short-circuit; the missing client should be the first thing the
    // function complains about.
    localStorage.setItem(
      CARD_STORAGE_KEY,
      JSON.stringify([{ cardId: 'x', archetype: 'Barbarian', stats: { Atk: { value: 50, bias: 'Mid', hardCap: 85 } } }]),
    );
    void LEDGER_STORAGE_KEY;

    const result = await runMigrationIfNeeded();
    expect(result.ran).toBe(false);
    expect(result.reason).toBe('no_local_state');
    expect(result.error).toContain('Supabase');
  });
});

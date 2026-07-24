import { openDB, type IDBPDatabase } from 'idb';

// FIFO write-through queue for Supabase upserts.
//
// Reads never touch this — they read the local cache maintained by each
// store adapter. Writes hit the cache synchronously, then enqueue a SyncOp
// which is drained in order.
//
// Ops are persisted to IndexedDB so a mid-flush crash survives reload.
// Every SyncOp has a client-generated id; handlers must be idempotent so
// duplicate delivery after a partial flush is safe.

export type SyncOpKind =
  | 'card_upsert'
  | 'card_delete'
  | 'txn_upsert'
  | 'profile_upsert'
  | 'ability_ref_upsert'
  | 'ability_ref_delete'
  | 'player_discovery_upsert';

export interface SyncOp {
  id: string;
  kind: SyncOpKind;
  payload: unknown;
  attempts: number;
  createdAt: string;
  lastError?: string;
  // Set once an op has exhausted MAX_ATTEMPTS. Dead ops are skipped by the
  // drain loop so a single poison op (e.g. one that violates a DB constraint)
  // can't block every healthy op queued behind it. They still keep the status
  // pill in 'error' so the failure stays visible, and reviveDeadLetters()
  // gives them a fresh chance on boot (after a fix ships, they drain cleanly).
  dead?: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export type SyncHandler = (payload: unknown) => Promise<void>;

const DB_NAME = 'card-engine-sync';
const STORE_NAME = 'ops';
const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 30_000;

const handlers = new Map<SyncOpKind, SyncHandler>();

let dbPromise: Promise<IDBPDatabase> | null = null;
let status: SyncStatus = 'idle';
let draining = false;
let drainPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  for (const fn of listeners) fn();
}

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(idb) {
        if (!idb.objectStoreNames.contains(STORE_NAME)) {
          const store = idb.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}

export function registerHandler(kind: SyncOpKind, fn: SyncHandler): void {
  handlers.set(kind, fn);
}

export function getStatus(): SyncStatus {
  return status;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function backoffMs(attempts: number): number {
  const raw = BASE_BACKOFF_MS * 2 ** (attempts - 1);
  return Math.min(raw, MAX_BACKOFF_MS);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readAll(): Promise<SyncOp[]> {
  const idb = await db();
  const tx = idb.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('createdAt');
  const all: SyncOp[] = [];
  let cursor = await index.openCursor();
  while (cursor) {
    all.push(cursor.value as SyncOp);
    cursor = await cursor.continue();
  }
  await tx.done;
  return all;
}

async function put(op: SyncOp): Promise<void> {
  const idb = await db();
  await idb.put(STORE_NAME, op);
}

async function remove(id: string): Promise<void> {
  const idb = await db();
  await idb.delete(STORE_NAME, id);
}

// Add an op to the durable queue and kick off draining. Resolves once the
// op is persisted to IndexedDB — NOT once it has been delivered.
export async function enqueue(op: Omit<SyncOp, 'attempts' | 'createdAt'>): Promise<void> {
  const full: SyncOp = {
    ...op,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  await put(full);
  void drain();
}

// Drain the queue. Called automatically after enqueue and on boot. Safe to
// call concurrently — only one drain runs at a time.
export function drain(): Promise<void> {
  if (drainPromise) return drainPromise;
  drainPromise = (async () => {
    if (draining) return;
    draining = true;
    try {
      while (true) {
        const ops = await readAll();
        // Skip dead-lettered ops when choosing the next op to deliver — they've
        // already exhausted their retries and must not block healthy ops behind
        // them. They still count toward the error status below.
        const op = ops.find((o) => !o.dead);
        if (!op) {
          // Nothing actionable. If dead ops remain, keep surfacing an error so
          // the stuck writes stay visible; otherwise we're fully drained.
          notify(ops.length > 0 ? 'error' : 'idle');
          return;
        }
        notify('syncing');
        const handler = handlers.get(op.kind);
        if (!handler) {
          // Handler not yet registered (adapter still booting). Wait a beat
          // and retry once more; if still missing, give up on this pass.
          await delay(BASE_BACKOFF_MS);
          if (!handlers.get(op.kind)) return;
          continue;
        }
        try {
          await handler(op.payload);
          await remove(op.id);
        } catch (err) {
          op.attempts += 1;
          op.lastError = err instanceof Error ? err.message : String(err);
          if (op.attempts >= MAX_ATTEMPTS) {
            // Poison op — dead-letter it so it stops blocking the queue. Status
            // stays 'error' (a dead op remains), but subsequent healthy ops now
            // get a chance to drain on the next loop iteration.
            op.dead = true;
            await put(op);
            notify('error');
            continue;
          }
          await put(op);
          notify('error');
          await delay(backoffMs(op.attempts));
          // Fall through to next loop iteration to retry the same op.
        }
      }
    } finally {
      draining = false;
      drainPromise = null;
    }
  })();
  return drainPromise;
}

// Revive dead-lettered ops: clear their `dead` flag and reset attempts so the
// next drain gives them a fresh set of retries. Called once on boot — after a
// fix ships (e.g. a dropped DB constraint), a previously-poison op drains
// cleanly; if it's still poison it simply re-dead-letters without blocking the
// queue. Returns how many ops were revived.
export async function reviveDeadLetters(): Promise<number> {
  const ops = await readAll();
  let revived = 0;
  for (const op of ops) {
    if (!op.dead) continue;
    op.dead = false;
    op.attempts = 0;
    await put(op);
    revived += 1;
  }
  return revived;
}

// Testing helper — clears the durable queue. Never call from production.
export async function resetForDev(): Promise<void> {
  const idb = await db();
  await idb.clear(STORE_NAME);
  notify('idle');
}

// Testing helper — returns the current pending op count.
export async function pendingCount(): Promise<number> {
  const ops = await readAll();
  return ops.length;
}

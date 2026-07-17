import type { Card } from '../../types/card';
import type { EconomyTransaction } from '../../types/economy';
import { LEDGER_STORAGE_KEY } from '../../data/economy/assumptions';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';

// One-time upload of pre-Phase-2 localStorage state into Supabase.
//
// Called by <PersistenceGate/> before the router mounts. Idempotent —
// re-running is a no-op once the local sentinel + profiles.migrated_at
// are both set. A BroadcastChannel lock keeps concurrent tabs from
// racing each other on the same identity.

const CARD_STORAGE_KEY = 'card-engine-collection';
const MIGRATED_SENTINEL_PREFIX = 'card-engine-migrated-to:';
const MIGRATION_LOCK_CHANNEL = 'card-engine-migration';

export interface MigrationResult {
  ran: boolean;
  reason?: 'no_local_state' | 'already_migrated' | 'lock_contended' | 'failed';
  cardCount: number;
  txnCount: number;
  portraitCount: number;
  portraitFailures: string[];
  error?: string;
}

// Supabase errors are plain objects, not Error instances — `String(err)`
// yields "[object Object]". Extract something readable.
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const obj = err as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown; code?: unknown };
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

function sentinelKey(userId: string): string {
  return `${MIGRATED_SENTINEL_PREFIX}${userId}`;
}

function readLocalCards(): Card[] {
  const raw = globalThis.localStorage?.getItem(CARD_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Card[]) : [];
  } catch {
    return [];
  }
}

function readLocalLedger(): EconomyTransaction[] {
  const raw = globalThis.localStorage?.getItem(LEDGER_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EconomyTransaction[]) : [];
  } catch {
    return [];
  }
}

// Assign sequence numbers in createdAt order to any transactions that
// pre-date the sequence field (localStorage state from before this PR).
// Exported for direct unit-testing; not part of the module's public API.
export function backfillSequences(txns: EconomyTransaction[]): EconomyTransaction[] {
  const missing = txns.filter((t) => typeof t.sequence !== 'number');
  if (missing.length === 0) return txns;
  const sorted = [...missing].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const existingMax = txns.reduce((m, t) => (typeof t.sequence === 'number' && t.sequence > m ? t.sequence : m), 0);
  const idToSeq = new Map<string, number>();
  sorted.forEach((t, i) => {
    idToSeq.set(t.transactionId, existingMax + i + 1);
  });
  return txns.map((t) => (idToSeq.has(t.transactionId) ? { ...t, sequence: idToSeq.get(t.transactionId)! } : t));
}

async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, isBase64, payload] = match;
  if (isBase64) {
    const binary = atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(payload)], { type: mime });
}

function extensionForMime(mime: string): string {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('svg')) return 'svg';
  return 'jpg';
}

// Upload a single portrait to the bucket. Returns the public/signed URL
// to store on the card, or null on failure (card keeps its old URL).
async function uploadPortrait(
  userId: string,
  cardId: string,
  asset: string,
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  let blob: Blob | null = null;
  if (asset.startsWith('data:')) {
    blob = dataUrlToBlob(asset);
  } else if (/^https?:\/\//i.test(asset)) {
    blob = await fetchAsBlob(asset);
  }
  if (!blob) return null;

  const ext = extensionForMime(blob.type || 'image/jpeg');
  const path = `${userId}/${cardId}/current.${ext}`;
  const { error } = await client.storage
    .from('portraits')
    .upload(path, blob, {
      cacheControl: '31536000',
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });
  if (error) return null;
  const { data } = client.storage.from('portraits').getPublicUrl(path);
  return data.publicUrl;
}

// Rewrite the card's portraitAsset (and the same rank's ArtSnapshot in
// evolutionHistory, if it points at the same asset) to use the bucket URL.
function withPortraitUrl(card: Card, newUrl: string): Card {
  const oldUrl = card.portraitAsset;
  if (!card.evolutionHistory) return { ...card, portraitAsset: newUrl };
  const history: Card['evolutionHistory'] = {};
  for (const [statName, ranks] of Object.entries(card.evolutionHistory)) {
    if (!ranks) continue;
    const rewrittenRanks: Record<string, unknown> = {};
    for (const [rank, snapshot] of Object.entries(ranks)) {
      if (snapshot && typeof snapshot === 'object' && 'portraitUrl' in snapshot && snapshot.portraitUrl === oldUrl) {
        rewrittenRanks[rank] = { ...snapshot, portraitUrl: newUrl };
      } else {
        rewrittenRanks[rank] = snapshot;
      }
    }
    (history as Record<string, unknown>)[statName] = rewrittenRanks;
  }
  return { ...card, portraitAsset: newUrl, evolutionHistory: history };
}

async function acquireLock(userId: string): Promise<{ release: () => void } | null> {
  if (typeof BroadcastChannel === 'undefined') {
    return { release: () => {} };
  }
  const ch = new BroadcastChannel(MIGRATION_LOCK_CHANNEL);
  // Simple lease: broadcast a claim, wait a tick, if no other tab has
  // claimed for the same uid, we own the lock.
  let contended = false;
  const listener = (event: MessageEvent) => {
    if (event.data?.type === 'claim' && event.data.userId === userId) {
      contended = true;
    }
  };
  ch.addEventListener('message', listener);
  ch.postMessage({ type: 'claim', userId, at: Date.now() });
  await new Promise((r) => setTimeout(r, 50));
  if (contended) {
    ch.removeEventListener('message', listener);
    ch.close();
    return null;
  }
  // Answer subsequent claim messages so the other tab knows we're active.
  ch.addEventListener('message', (event) => {
    if (event.data?.type === 'claim' && event.data.userId === userId) {
      ch.postMessage({ type: 'claim', userId, at: Date.now() });
    }
  });
  return {
    release: () => {
      ch.removeEventListener('message', listener);
      ch.close();
    },
  };
}

// Public entry point. Called once by PersistenceGate. Safe to call from
// multiple tabs — only one will win the lock; others get lock_contended.
export async function runMigrationIfNeeded(): Promise<MigrationResult> {
  const client = getSupabaseClient();
  const userId = getCurrentUserId();
  if (!client || !userId) {
    return {
      ran: false,
      reason: 'no_local_state',
      cardCount: 0,
      txnCount: 0,
      portraitCount: 0,
      portraitFailures: [],
      error: 'Supabase not ready.',
    };
  }

  // Fast local sentinel — most boots skip everything here.
  if (globalThis.localStorage?.getItem(sentinelKey(userId))) {
    return {
      ran: false,
      reason: 'already_migrated',
      cardCount: 0,
      txnCount: 0,
      portraitCount: 0,
      portraitFailures: [],
    };
  }

  const cards = readLocalCards();
  const txns = readLocalLedger();
  if (cards.length === 0 && txns.length === 0) {
    // Nothing to migrate — set the sentinels so future boots skip fast.
    await client.from('profiles').upsert({ user_id: userId, migrated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    globalThis.localStorage?.setItem(sentinelKey(userId), new Date().toISOString());
    return {
      ran: false,
      reason: 'no_local_state',
      cardCount: 0,
      txnCount: 0,
      portraitCount: 0,
      portraitFailures: [],
    };
  }

  const lock = await acquireLock(userId);
  if (!lock) {
    return {
      ran: false,
      reason: 'lock_contended',
      cardCount: 0,
      txnCount: 0,
      portraitCount: 0,
      portraitFailures: [],
    };
  }

  try {
    // Upload portraits + rewrite blobs.
    const rewrittenCards: Card[] = [];
    let portraitCount = 0;
    const portraitFailures: string[] = [];
    for (const card of cards) {
      if (!card.portraitAsset) {
        rewrittenCards.push(card);
        continue;
      }
      // If it's already a bucket URL from a partial prior run, skip.
      if (card.portraitAsset.includes('/storage/v1/object/public/portraits/')) {
        rewrittenCards.push(card);
        continue;
      }
      const url = await uploadPortrait(userId, card.cardId, card.portraitAsset);
      if (url) {
        rewrittenCards.push(withPortraitUrl(card, url));
        portraitCount++;
      } else {
        rewrittenCards.push(card);
        portraitFailures.push(card.cardId);
      }
    }

    // Backfill sequence numbers on pre-Phase-2 transactions.
    const sequencedTxns = backfillSequences(txns);

    // Ensure the profile row exists first (foreign keys point at it).
    // Do NOT set migrated_at yet — only after cards + transactions land.
    const profileUpsert = await client
      .from('profiles')
      .upsert({ user_id: userId }, { onConflict: 'user_id' });
    if (profileUpsert.error) throw profileUpsert.error;

    if (rewrittenCards.length > 0) {
      const cardRows = rewrittenCards.map((c) => ({
        card_id: c.cardId,
        user_id: userId,
        archetype: c.archetype,
        portrait_url: c.portraitAsset || null,
        data: c,
      }));
      const cardUpsert = await client.from('cards').upsert(cardRows, { onConflict: 'card_id' });
      if (cardUpsert.error) throw cardUpsert.error;
    }

    if (sequencedTxns.length > 0) {
      const txnRows = sequencedTxns.map((t) => ({
        transaction_id: t.transactionId,
        user_id: userId,
        currency: t.currency,
        amount: t.amount,
        type: t.type,
        status: t.status,
        action_id: t.actionId ?? null,
        card_id: t.cardId ?? null,
        reward_id: t.rewardId ?? null,
        balance_before: t.balanceBefore,
        balance_after: t.balanceAfter,
        sequence: t.sequence,
        metadata: t.metadata ?? null,
        created_at: t.createdAt,
        completed_at: t.completedAt ?? null,
      }));
      const txnUpsert = await client.from('economy_transactions').upsert(txnRows, { onConflict: 'transaction_id' });
      if (txnUpsert.error) throw txnUpsert.error;
    }

    // All payloads landed — flip the sentinels.
    const at = new Date().toISOString();
    await client.from('profiles').upsert({ user_id: userId, migrated_at: at }, { onConflict: 'user_id' });
    globalThis.localStorage?.setItem(sentinelKey(userId), at);

    return {
      ran: true,
      cardCount: rewrittenCards.length,
      txnCount: sequencedTxns.length,
      portraitCount,
      portraitFailures,
    };
  } catch (err) {
    // Log the raw error so devs can inspect it in the console; the
    // returned string is what gets rendered to the user.
    // eslint-disable-next-line no-console
    console.error('[migration] failed:', err);
    return {
      ran: false,
      reason: 'failed',
      cardCount: 0,
      txnCount: 0,
      portraitCount: 0,
      portraitFailures: [],
      error: errorMessage(err),
    };
  } finally {
    lock.release();
  }
}

// Post-migration cleanup. Hard cutover — after both sentinels are set,
// localStorage cards + ledger keys are no longer read by anything.
// Called by PersistenceGate on boots where the sentinel is already set.
export function clearLegacyLocalStorage(userId: string): void {
  if (!globalThis.localStorage?.getItem(sentinelKey(userId))) return;
  globalThis.localStorage.removeItem(CARD_STORAGE_KEY);
  globalThis.localStorage.removeItem(LEDGER_STORAGE_KEY);
}

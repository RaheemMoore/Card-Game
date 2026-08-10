import type { Card } from '../../types/card';
import type { CardStore } from './CardStore';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';
import { enqueue, registerHandler } from './SyncQueue';

// Rows per hydrate page.
//
// Lowered from 200 to 5 (2026-08-10) after sign-in started failing outright
// with `57014 canceling statement due to statement timeout`.
//
// The old comment claimed 200 kept each statement "well under" the timeout
// "regardless of total collection size". That was true only while rows stayed
// small, and they did not: 31 of 34 live cards still carry their portrait as
// an inline base64 data URL. Measured on the live database —
//
//     average row   3.2 MB serialized
//     5 rows         11 MB
//     14 rows        44 MB   ← one account, and it exceeds the 8s
//                              statement_timeout on the `authenticated` role
//
// A page is counted in ROWS but paid for in BYTES, and nothing tied the two
// together. Five rows is ~11 MB, which completes comfortably.
//
// This is a floor that makes the app usable, NOT the fix. The fix is moving
// those portraits into the `portraits` bucket — migration.ts already has
// uploadPortrait for exactly this — and storing a URL instead of 3 MB of
// base64. Until that runs, every sign-in ships 44 MB to the browser.
const HYDRATE_PAGE_SIZE = 5;

interface CardRow {
  card_id: string;
  user_id: string;
  archetype: string;
  portrait_url: string | null;
  data: Card;
}

function toRow(card: Card, userId: string): CardRow {
  return {
    card_id: card.cardId,
    user_id: userId,
    archetype: card.archetype,
    portrait_url: card.portraitAsset || null,
    data: card,
  };
}

// Reads: sync from in-memory cache (populated by hydrate).
// Writes: update cache synchronously + enqueue upsert on the SyncQueue.
// Deletes: mirror.
export class SupabaseCardStore implements CardStore {
  private cache = new Map<string, Card>();
  private listeners = new Set<() => void>();

  constructor() {
    registerHandler('card_upsert', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const row = payload as CardRow;
      const { error } = await client.from('cards').upsert(row, { onConflict: 'card_id' });
      if (error) throw error;
    });
    registerHandler('card_delete', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const { cardId } = payload as { cardId: string };
      const { error } = await client.from('cards').delete().eq('card_id', cardId);
      if (error) throw error;
    });
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  read(): Card[] {
    return Array.from(this.cache.values());
  }

  save(card: Card): void {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('SupabaseCardStore.save called before session ready.');
    this.cache.set(card.cardId, card);
    this.notify();
    void enqueue({
      id: `card:${card.cardId}:${Date.now()}`,
      kind: 'card_upsert',
      payload: toRow(card, userId),
    });
  }

  delete(cardId: string): void {
    this.cache.delete(cardId);
    this.notify();
    void enqueue({
      id: `card-del:${cardId}:${Date.now()}`,
      kind: 'card_delete',
      payload: { cardId },
    });
  }

  // Fetch all cards for the current user into the in-memory cache. Called
  // once by <PersistenceGate/> before the router mounts. Paginated so a
  // large collection can't push a single statement past Supabase's
  // statement timeout (each `data` row carries the full Card jsonb blob).
  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available for hydrate.');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('hydrate called before session ready.');

    this.cache.clear();
    let offset = 0;
    let pageSize = HYDRATE_PAGE_SIZE;

    for (;;) {
      const { data, error } = await client
        .from('cards')
        .select('data')
        .eq('user_id', userId)
        .order('card_id')
        .range(offset, offset + pageSize - 1);

      if (error) {
        // 57014 = statement_timeout. A page is counted in ROWS, but the cost of
        // a page is measured in BYTES, and those two came apart badly: cards
        // whose portrait is still an inline base64 data URL run to ~3 MB each,
        // so a 200-row page asks Postgres for tens of megabytes in one
        // statement and it is cancelled. The player then cannot sign in at all.
        //
        // Halving and retrying makes the reader adapt to whatever the rows
        // actually weigh instead of assuming they are small. It is a fallback,
        // not the fix — see the note on HYDRATE_PAGE_SIZE.
        if (error.code === '57014' && pageSize > 1) {
          pageSize = Math.max(1, Math.floor(pageSize / 4));
          console.warn(
            `[cards] hydrate timed out; retrying with ${pageSize} row(s) per page. ` +
              'Cards with inline base64 portraits are the usual cause.',
          );
          continue;
        }
        throw error;
      }

      for (const row of data ?? []) {
        const card = (row as { data: Card }).data;
        if (card && card.cardId) this.cache.set(card.cardId, card);
      }
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // Test helper — bypass the queue and seed the cache directly.
  seedForTest(cards: Card[]): void {
    this.cache.clear();
    for (const c of cards) this.cache.set(c.cardId, c);
    this.notify();
  }
}

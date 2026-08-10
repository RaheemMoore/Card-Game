import type { Card } from '../../types/card';
import type { CardStore } from './CardStore';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';
import { enqueue, registerHandler } from './SyncQueue';

// How many BYTES of card payload to ask for in one statement.
//
// hydrate() used to page by row count — 200 of them — with a comment claiming
// that stayed "well under" the statement timeout "regardless of total
// collection size". That held only while rows were small, and they are not:
// 31 of 34 live cards still store their portrait as inline base64, averaging
// 3.2 MB each, so one account's 14 cards is 44 MB. Sign-in failed outright
// with `57014 canceling statement due to statement timeout`.
//
// Guessing a smaller row count does not fix it, because a page is counted in
// rows and paid for in BYTES, and nothing tied the two together. So now the
// client asks the database how big each card is first — pg_column_size() reads
// the stored size without detoasting, 0.19 ms for a whole collection — and
// builds pages that fit this budget.
//
// Measured on the live database: detoasting and serialising all 44 MB takes
// the SERVER only 1.6 s. The timeout is therefore not computation — it is the
// statement staying open while those bytes cross the wire, so the limit that
// matters is the client's bandwidth, which we cannot know.
//
// 4 MB per statement is roughly 3 s on a slow-ish connection and near-instant
// on a fast one, and a whole ordinary collection still fits in one request.
// If it is still too much, hydrate halves it and retries.
const HYDRATE_BYTE_BUDGET = 4 * 1024 * 1024;

// Fallback when the size probe is unavailable (an older database without the
// card_payload_sizes function). Small enough to survive fat rows.
const FALLBACK_PAGE_SIZE = 3;

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

    // Ask how heavy the collection is before asking for it. RLS scopes the
    // function to this user, so no filter is needed here.
    const { data: sizes, error: sizeError } = await client.rpc('card_payload_sizes');

    if (sizeError || !Array.isArray(sizes)) {
      // The probe is an optimisation, not a dependency. Without it, fall back
      // to small fixed pages rather than refusing to load the collection.
      console.warn('[cards] size probe unavailable; paging conservatively', sizeError?.message);
      await this.hydrateByRowCount(client, userId, FALLBACK_PAGE_SIZE);
      this.notify();
      return;
    }

    // Group ids into pages that fit the byte budget. A single card larger than
    // the whole budget still gets its own page — one oversized row is always
    // better attempted alone than skipped.
    const rows = sizes as Array<{ card_id: string; bytes: number }>;
    const pages: string[][] = [];
    let page: string[] = [];
    let pageBytes = 0;
    for (const row of rows) {
      const bytes = Number(row.bytes) || 0;
      if (page.length > 0 && pageBytes + bytes > HYDRATE_BYTE_BUDGET) {
        pages.push(page);
        page = [];
        pageBytes = 0;
      }
      page.push(row.card_id);
      pageBytes += bytes;
    }
    if (page.length > 0) pages.push(page);

    for (const ids of pages) {
      await this.fetchPage(client, ids);
    }

    this.notify();
  }

  /**
   * Fetch one page, splitting it in half and retrying if the statement is
   * still cancelled. The budget is a guess about someone's bandwidth; halving
   * on an actual timeout is how it stops being a guess.
   */
  private async fetchPage(
    client: NonNullable<ReturnType<typeof getSupabaseClient>>,
    ids: string[],
  ): Promise<void> {
    const { data, error } = await client.from('cards').select('data').in('card_id', ids);

    if (error) {
      if (error.code === '57014' && ids.length > 1) {
        const middle = Math.ceil(ids.length / 2);
        console.warn(`[cards] page of ${ids.length} timed out; splitting`);
        await this.fetchPage(client, ids.slice(0, middle));
        await this.fetchPage(client, ids.slice(middle));
        return;
      }
      throw error;
    }

    for (const record of data ?? []) {
      const card = (record as { data: Card }).data;
      if (card && card.cardId) this.cache.set(card.cardId, card);
    }
  }

  /** Row-count paging, used only when the byte probe is unavailable. */
  private async hydrateByRowCount(
    client: NonNullable<ReturnType<typeof getSupabaseClient>>,
    userId: string,
    pageSize: number,
  ): Promise<void> {
    let offset = 0;
    for (;;) {
      const { data, error } = await client
        .from('cards')
        .select('data')
        .eq('user_id', userId)
        .order('card_id')
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      for (const record of data ?? []) {
        const card = (record as { data: Card }).data;
        if (card && card.cardId) this.cache.set(card.cardId, card);
      }
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
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

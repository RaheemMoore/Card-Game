import type { Card } from '../../types/card';
import type { CardStore } from './CardStore';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';
import { enqueue, registerHandler } from './SyncQueue';

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
  // once by <PersistenceGate/> before the router mounts.
  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available for hydrate.');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('hydrate called before session ready.');

    const { data, error } = await client
      .from('cards')
      .select('data')
      .eq('user_id', userId);
    if (error) throw error;

    this.cache.clear();
    for (const row of data ?? []) {
      const card = (row as { data: Card }).data;
      if (card && card.cardId) this.cache.set(card.cardId, card);
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

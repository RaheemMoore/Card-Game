import type { Card } from '../types/card';
import { LocalStorageCardStore, type CardStore } from './persistence/CardStore';

// storage.ts is a thin facade over CardStore. The active store is chosen
// at boot (PersistenceGate swaps in SupabaseCardStore when the app is
// configured against a Supabase project). Public API stays sync so
// components and services don't need to learn `await`.

let store: CardStore = new LocalStorageCardStore();

export function setCardStore(next: CardStore): void {
  store = next;
}

export function getCardStore(): CardStore {
  return store;
}

export function saveCard(card: Card): void {
  store.save(card);
}

export function getCard(cardId: string): Card | null {
  return store.read().find((c) => c.cardId === cardId) ?? null;
}

export function getAllCards(): Card[] {
  return store.read();
}

export function deleteCard(cardId: string): void {
  store.delete(cardId);
}

export function getCollectionStats() {
  const cards = store.read();
  const byArchetype: Record<string, number> = {};
  for (const card of cards) {
    byArchetype[card.archetype] = (byArchetype[card.archetype] ?? 0) + 1;
  }
  return { total: cards.length, byArchetype };
}

import type { Card } from '../types/card';

const STORAGE_KEY = 'card-engine-collection';

function readCollection(): Card[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const cards = JSON.parse(raw) as Card[];
    return cards.filter((c) => c.stats && 'atk' in c.stats && 'def' in c.stats);
  } catch {
    return [];
  }
}

function writeCollection(cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function saveCard(card: Card): void {
  const cards = readCollection();
  const idx = cards.findIndex((c) => c.cardId === card.cardId);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  writeCollection(cards);
}

export function getCard(cardId: string): Card | null {
  const cards = readCollection();
  return cards.find((c) => c.cardId === cardId) ?? null;
}

export function getAllCards(): Card[] {
  return readCollection();
}

export function deleteCard(cardId: string): void {
  const cards = readCollection().filter((c) => c.cardId !== cardId);
  writeCollection(cards);
}

export function getCollectionStats() {
  const cards = readCollection();
  const byArchetype: Record<string, number> = {};
  const byRank: Record<string, number> = {};

  for (const card of cards) {
    byArchetype[card.archetype] = (byArchetype[card.archetype] ?? 0) + 1;
    byRank[card.rank] = (byRank[card.rank] ?? 0) + 1;
  }

  return { total: cards.length, byArchetype, byRank };
}

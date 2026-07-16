import type { Card } from '../types/card';

const STORAGE_KEY = 'card-engine-collection';

function isNewFormatCard(c: unknown): c is Card {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  if (!obj.stats || typeof obj.stats !== 'object') return false;
  const stats = obj.stats as Record<string, unknown>;
  return (
    stats.Atk !== undefined &&
    typeof stats.Atk === 'object' &&
    (stats.Atk as Record<string, unknown>).value !== undefined
  );
}

/**
 * Is this a portraitAsset value the CardRenderer can actually display?
 * Some cards were saved with `data:text/html;base64,…` from an earlier bug
 * where a null Leonardo URL was fetched as text and stored as a data URL.
 */
function isDisplayablePortrait(asset: unknown): asset is string {
  if (typeof asset !== 'string' || asset.length === 0) return false;
  return (
    asset.startsWith('data:image/') ||
    asset.startsWith('/assets/') ||
    /^https?:\/\//i.test(asset)
  );
}

function readCollection(): Card[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const items = JSON.parse(raw) as unknown[];
    const validItems = items.filter(isNewFormatCard);
    const droppedCount = items.length - validItems.length;
    let sanitizedCount = 0;
    const cards = validItems.map((c) => {
      if (isDisplayablePortrait(c.portraitAsset)) return c;
      sanitizedCount++;
      return { ...c, portraitAsset: '' };
    });
    if (droppedCount > 0) {
      console.warn(`Filtered out ${droppedCount} legacy card(s) with old stat format`);
    }
    if (sanitizedCount > 0) {
      console.warn(`Sanitized ${sanitizedCount} card(s) with corrupted portrait data — use "Regenerate Portrait" to rebuild.`);
    }
    if (droppedCount > 0 || sanitizedCount > 0) {
      writeCollection(cards);
    }
    return cards;
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

  for (const card of cards) {
    byArchetype[card.archetype] = (byArchetype[card.archetype] ?? 0) + 1;
  }

  return { total: cards.length, byArchetype };
}

import type { Card } from '../../types/card';

// Every card storage backend implements this. Reads are sync (from an
// in-memory cache); writes are sync too but may schedule async remote work.
//
// Mirrors LedgerStore's shape in services/economy/transactionLedger.ts so
// the module boundary is consistent.
export interface CardStore {
  read(): Card[];
  save(card: Card): void;
  delete(cardId: string): void;
  // Called once by PersistenceGate before the router mounts. LocalStorage
  // implementation does nothing; Supabase implementation fetches all cards
  // for the current user into the in-memory cache.
  hydrate(): Promise<void>;
  // Notify listeners when the local cache changes (e.g. after a remote
  // write completes). Currently only used to support future reactive views;
  // page-level reads still call read() on mount.
  subscribe(fn: () => void): () => void;
}

const STORAGE_KEY = 'card-engine-collection';

// Reject legacy cards whose shape doesn't match the current stat model.
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

// Some cards were saved with `data:text/html;base64,…` from an earlier bug
// where a null Leonardo URL was fetched as text and stored as a data URL.
function isDisplayablePortrait(asset: unknown): asset is string {
  if (typeof asset !== 'string' || asset.length === 0) return false;
  return (
    asset.startsWith('data:image/') ||
    asset.startsWith('/assets/') ||
    /^https?:\/\//i.test(asset)
  );
}

function sanitize(cards: Card[]): { cards: Card[]; dropped: number; sanitized: number } {
  const kept = cards.filter(isNewFormatCard);
  const dropped = cards.length - kept.length;
  let sanitized = 0;
  const out = kept.map((c) => {
    if (isDisplayablePortrait(c.portraitAsset)) return c;
    sanitized++;
    return { ...c, portraitAsset: '' };
  });
  return { cards: out, dropped, sanitized };
}

export class LocalStorageCardStore implements CardStore {
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private write(cards: Card[]): void {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  read(): Card[] {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const items = JSON.parse(raw) as unknown[];
      const { cards, dropped, sanitized } = sanitize(items as Card[]);
      if (dropped > 0) {
        console.warn(`Filtered out ${dropped} legacy card(s) with old stat format`);
      }
      if (sanitized > 0) {
        console.warn(
          `Sanitized ${sanitized} card(s) with corrupted portrait data — use "Regenerate Portrait" to rebuild.`,
        );
      }
      if (dropped > 0 || sanitized > 0) {
        this.write(cards);
      }
      return cards;
    } catch {
      return [];
    }
  }

  save(card: Card): void {
    const cards = this.read();
    const idx = cards.findIndex((c) => c.cardId === card.cardId);
    if (idx >= 0) cards[idx] = card;
    else cards.push(card);
    this.write(cards);
    this.notify();
  }

  delete(cardId: string): void {
    const cards = this.read().filter((c) => c.cardId !== cardId);
    this.write(cards);
    this.notify();
  }

  async hydrate(): Promise<void> {
    // No-op — localStorage reads are lazy and don't need bootstrap.
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export class InMemoryCardStore implements CardStore {
  private cards = new Map<string, Card>();
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  read(): Card[] {
    return Array.from(this.cards.values());
  }

  save(card: Card): void {
    this.cards.set(card.cardId, card);
    this.notify();
  }

  delete(cardId: string): void {
    this.cards.delete(cardId);
    this.notify();
  }

  async hydrate(): Promise<void> {
    // No-op — in-memory store is populated by tests directly.
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // Test helper.
  seedForTest(cards: Card[]): void {
    this.cards.clear();
    for (const c of cards) this.cards.set(c.cardId, c);
    this.notify();
  }
}

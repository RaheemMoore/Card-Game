import type { EconomyTransaction, TransactionStatus } from '../../types/economy';
import { LEDGER_STORAGE_KEY } from '../../data/economy/assumptions';

// The ledger reads/writes through this narrow interface so that:
//   1. Tests can inject an in-memory adapter without needing jsdom/happy-dom.
//   2. Phase 5 (server backend) swaps this for a remote-backed store without
//      touching walletService or any component.
export interface LedgerStore {
  read(): string | null;
  write(value: string): void;
  remove(): void;
  // Optional. Async bootstrap for remote-backed stores; called by
  // PersistenceGate before the router mounts. LocalStorage/InMemory
  // implementations don't need this — reads are already fresh.
  hydrate?(): Promise<void>;
}

class LocalStorageLedgerStore implements LedgerStore {
  read(): string | null {
    return globalThis.localStorage?.getItem(LEDGER_STORAGE_KEY) ?? null;
  }
  write(value: string): void {
    globalThis.localStorage?.setItem(LEDGER_STORAGE_KEY, value);
  }
  remove(): void {
    globalThis.localStorage?.removeItem(LEDGER_STORAGE_KEY);
  }
}

export class InMemoryLedgerStore implements LedgerStore {
  private value: string | null = null;
  read(): string | null {
    return this.value;
  }
  write(value: string): void {
    this.value = value;
  }
  remove(): void {
    this.value = null;
  }
}

let store: LedgerStore = new LocalStorageLedgerStore();

export function setStore(next: LedgerStore): void {
  store = next;
}

function readAll(): EconomyTransaction[] {
  const raw = store.read();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as EconomyTransaction[];
  } catch {
    return [];
  }
}

function writeAll(txns: EconomyTransaction[]): void {
  store.write(JSON.stringify(txns));
}

export function isEmpty(): boolean {
  return readAll().length === 0;
}

export function append(txn: EconomyTransaction): void {
  const txns = readAll();
  txns.push(txn);
  writeAll(txns);
}

export function all(): EconomyTransaction[] {
  return readAll();
}

export function byId(transactionId: string): EconomyTransaction | undefined {
  return readAll().find((t) => t.transactionId === transactionId);
}

export function byActionId(actionId: string): EconomyTransaction[] {
  return readAll().filter((t) => t.actionId === actionId);
}

export function byStatus(status: TransactionStatus): EconomyTransaction[] {
  return readAll().filter((t) => t.status === status);
}

export function updateStatus(
  transactionId: string,
  update: Partial<Pick<EconomyTransaction, 'status' | 'completedAt' | 'metadata' | 'amount' | 'balanceAfter'>>,
): EconomyTransaction | undefined {
  const txns = readAll();
  const idx = txns.findIndex((t) => t.transactionId === transactionId);
  if (idx === -1) return undefined;
  txns[idx] = {
    ...txns[idx],
    ...update,
    metadata: update.metadata
      ? { ...txns[idx].metadata, ...update.metadata }
      : txns[idx].metadata,
  };
  writeAll(txns);
  return txns[idx];
}

// Dev/testing helper. Not for production; wipes the ledger.
export function resetForDev(): void {
  store.remove();
}

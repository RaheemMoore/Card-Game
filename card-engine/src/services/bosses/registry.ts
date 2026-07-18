import type { BossDefinition, BossVersion } from '../../types/bosses';
import { LocalStorageBossStore, type BossStore } from '../persistence/BossStore';

/**
 * Thin facade over BossStore — mirrors services/abilities/registry.ts.
 * The active store is chosen at boot in PersistenceGate.
 */
let store: BossStore = new LocalStorageBossStore();

export function setBossStore(next: BossStore): void {
  store = next;
}
export function getBossStore(): BossStore {
  return store;
}

export function getAllBossDefinitions(): BossDefinition[] {
  return store.getAllDefinitions();
}
export function getBossDefinition(id: string): BossDefinition | undefined {
  return store.getDefinition(id);
}
export function getCurrentBossVersion(bossId: string): BossVersion | undefined {
  return store.getCurrentVersion(bossId);
}

import type {
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
  CardAbilityReference,
  PlayerAbilityDiscovery,
} from '../../types/abilities';
import { LocalStorageAbilityStore, type AbilityStore } from '../persistence/AbilityStore';

/**
 * Thin facade over AbilityStore, matching the shape of services/storage.ts.
 * The active store is chosen at boot; public API stays sync so components
 * and services don't need to learn `await` for reads.
 *
 * Library writes stay async — they're admin-only and rare enough that
 * hiding the promise would be misleading.
 */

let store: AbilityStore = new LocalStorageAbilityStore();

export function setAbilityStore(next: AbilityStore): void {
  store = next;
}

export function getAbilityStore(): AbilityStore {
  return store;
}

// ---- Library reads ----
export function getAllFamilies(): AbilityFamily[] {
  return store.getAllFamilies();
}
export function getFamily(id: string): AbilityFamily | undefined {
  return store.getFamily(id);
}
export function getAllDefinitions(): AbilityDefinition[] {
  return store.getAllDefinitions();
}
export function getDefinition(id: string): AbilityDefinition | undefined {
  return store.getDefinition(id);
}
export function getAllVersions(abilityId: string): AbilityVersion[] {
  return store.getAllVersions(abilityId);
}
export function getVersion(id: string): AbilityVersion | undefined {
  return store.getVersion(id);
}
export function getCurrentVersion(abilityId: string): AbilityVersion | undefined {
  return store.getCurrentVersion(abilityId);
}
export function getArtForAbility(abilityId: string): CanonicalArtAsset | undefined {
  return store.getArtForAbility(abilityId);
}

// ---- Library writes (admin-only via RLS) ----
export function saveFamily(family: AbilityFamily): Promise<void> {
  return store.saveFamily(family);
}
export function saveDefinition(def: AbilityDefinition): Promise<void> {
  return store.saveDefinition(def);
}
export function saveVersion(version: AbilityVersion): Promise<void> {
  return store.saveVersion(version);
}
export function saveArt(asset: CanonicalArtAsset): Promise<void> {
  return store.saveArt(asset);
}

// ---- Per-card references ----
export function getReferencesForCard(cardId: string): CardAbilityReference[] {
  return store.getReferencesForCard(cardId);
}
export function saveReference(ref: CardAbilityReference): void {
  store.saveReference(ref);
}
export function deleteReferencesForCard(cardId: string): void {
  store.deleteReferencesForCard(cardId);
}

// ---- Per-user discoveries ----
export function getAllDiscoveries(): PlayerAbilityDiscovery[] {
  return store.getAllDiscoveries();
}
export function getDiscovery(abilityId: string): PlayerAbilityDiscovery | undefined {
  return store.getDiscovery(abilityId);
}
export function saveDiscovery(disc: PlayerAbilityDiscovery): void {
  store.saveDiscovery(disc);
}

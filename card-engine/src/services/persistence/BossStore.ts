import type { BossDefinition, BossVersion } from '../../types/bosses';

/**
 * BossStore — persistent boss library. Mirrors AbilityStore's library-only
 * subset (there is no per-user boss data at B3; battle records land in B5).
 *
 * Library reads return from an in-memory cache populated by hydrate().
 * Writes are admin-only via Supabase RLS; local/in-memory implementations
 * accept writes freely so tests can construct fixtures.
 */
export interface BossStore {
  getAllDefinitions(): BossDefinition[];
  getDefinition(id: string): BossDefinition | undefined;

  getAllVersions(bossId: string): BossVersion[];
  getVersion(id: string): BossVersion | undefined;
  getCurrentVersion(bossId: string): BossVersion | undefined;

  saveDefinition(def: BossDefinition): Promise<void>;
  saveVersion(version: BossVersion): Promise<void>;

  hydrate(): Promise<void>;
  subscribe(fn: () => void): () => void;
}

const LIBRARY_KEY = 'card-engine-boss-library';

interface BossLibrarySnapshot {
  definitions: BossDefinition[];
  versions: BossVersion[];
}

function emptyLibrary(): BossLibrarySnapshot {
  return { definitions: [], versions: [] };
}

export class LocalStorageBossStore implements BossStore {
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private read(): BossLibrarySnapshot {
    const raw = globalThis.localStorage?.getItem(LIBRARY_KEY);
    if (!raw) return emptyLibrary();
    try {
      return JSON.parse(raw) as BossLibrarySnapshot;
    } catch {
      return emptyLibrary();
    }
  }

  private write(snapshot: BossLibrarySnapshot): void {
    globalThis.localStorage?.setItem(LIBRARY_KEY, JSON.stringify(snapshot));
  }

  getAllDefinitions(): BossDefinition[] {
    return this.read().definitions;
  }
  getDefinition(id: string): BossDefinition | undefined {
    return this.read().definitions.find((d) => d.id === id);
  }
  getAllVersions(bossId: string): BossVersion[] {
    return this.read().versions.filter((v) => v.bossId === bossId);
  }
  getVersion(id: string): BossVersion | undefined {
    return this.read().versions.find((v) => v.id === id);
  }
  getCurrentVersion(bossId: string): BossVersion | undefined {
    const def = this.getDefinition(bossId);
    if (!def) return undefined;
    return this.getVersion(def.currentVersionId);
  }

  async saveDefinition(def: BossDefinition): Promise<void> {
    const lib = this.read();
    const idx = lib.definitions.findIndex((d) => d.id === def.id);
    if (idx >= 0) lib.definitions[idx] = def;
    else lib.definitions.push(def);
    this.write(lib);
    this.notify();
  }

  async saveVersion(version: BossVersion): Promise<void> {
    const lib = this.read();
    const idx = lib.versions.findIndex((v) => v.id === version.id);
    if (idx >= 0) lib.versions[idx] = version;
    else lib.versions.push(version);
    this.write(lib);
    this.notify();
  }

  async hydrate(): Promise<void> {
    // localStorage is read on demand.
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/** Non-persistent store for tests. */
export class InMemoryBossStore implements BossStore {
  private library: BossLibrarySnapshot = emptyLibrary();
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  getAllDefinitions(): BossDefinition[] {
    return this.library.definitions.slice();
  }
  getDefinition(id: string): BossDefinition | undefined {
    return this.library.definitions.find((d) => d.id === id);
  }
  getAllVersions(bossId: string): BossVersion[] {
    return this.library.versions.filter((v) => v.bossId === bossId);
  }
  getVersion(id: string): BossVersion | undefined {
    return this.library.versions.find((v) => v.id === id);
  }
  getCurrentVersion(bossId: string): BossVersion | undefined {
    const def = this.getDefinition(bossId);
    if (!def) return undefined;
    return this.getVersion(def.currentVersionId);
  }

  async saveDefinition(def: BossDefinition): Promise<void> {
    const idx = this.library.definitions.findIndex((d) => d.id === def.id);
    if (idx >= 0) this.library.definitions[idx] = def;
    else this.library.definitions.push(def);
    this.notify();
  }

  async saveVersion(version: BossVersion): Promise<void> {
    const idx = this.library.versions.findIndex((v) => v.id === version.id);
    if (idx >= 0) this.library.versions[idx] = version;
    else this.library.versions.push(version);
    this.notify();
  }

  async hydrate(): Promise<void> {}

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

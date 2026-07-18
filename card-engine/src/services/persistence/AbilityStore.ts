import type {
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
  CardAbilityReference,
  PlayerAbilityDiscovery,
} from '../../types/abilities';

/**
 * Every ability backend implements this. Mirrors CardStore's shape so
 * PersistenceGate can hydrate both stores identically.
 *
 * Library reads (families / definitions / versions / art) return from an
 * in-memory cache populated by hydrate(). Library writes are admin-only —
 * they hit the backend asynchronously and throw when the caller lacks the
 * admin role.
 *
 * Per-user data (references / discoveries) mirrors CardStore's pattern:
 * sync cache reads, sync cache writes, remote persistence via SyncQueue.
 */
export interface AbilityStore {
  // ---- Library reads (sync, from cache) ----
  getAllFamilies(): AbilityFamily[];
  getFamily(id: string): AbilityFamily | undefined;

  getAllDefinitions(): AbilityDefinition[];
  getDefinition(id: string): AbilityDefinition | undefined;

  getAllVersions(abilityId: string): AbilityVersion[];
  getVersion(id: string): AbilityVersion | undefined;
  getCurrentVersion(abilityId: string): AbilityVersion | undefined;

  getArtForAbility(abilityId: string): CanonicalArtAsset | undefined;

  // ---- Library writes (async, admin-only via RLS) ----
  saveFamily(family: AbilityFamily): Promise<void>;
  saveDefinition(def: AbilityDefinition): Promise<void>;
  saveVersion(version: AbilityVersion): Promise<void>;
  saveArt(asset: CanonicalArtAsset): Promise<void>;

  // ---- Per-card references (sync, owner-write via RLS) ----
  getReferencesForCard(cardId: string): CardAbilityReference[];
  saveReference(ref: CardAbilityReference): void;
  deleteReferencesForCard(cardId: string): void;

  // ---- Per-user discoveries (sync, owner-write via RLS) ----
  getAllDiscoveries(): PlayerAbilityDiscovery[];
  getDiscovery(abilityId: string): PlayerAbilityDiscovery | undefined;
  saveDiscovery(disc: PlayerAbilityDiscovery): void;

  // ---- Lifecycle ----
  hydrate(): Promise<void>;
  subscribe(fn: () => void): () => void;
}

const LIBRARY_KEY = 'card-engine-ability-library';
const REFS_KEY = 'card-engine-ability-references';
const DISCOVERIES_KEY = 'card-engine-ability-discoveries';

interface LibrarySnapshot {
  families: AbilityFamily[];
  definitions: AbilityDefinition[];
  versions: AbilityVersion[];
  art: CanonicalArtAsset[];
}

function emptyLibrary(): LibrarySnapshot {
  return { families: [], definitions: [], versions: [], art: [] };
}

/**
 * LocalStorage-backed store used when Supabase isn't available (tests,
 * offline dev). Library data is populated by seedLibraryForTest() or by
 * the seed loader; user data persists locally.
 */
export class LocalStorageAbilityStore implements AbilityStore {
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private readLibrary(): LibrarySnapshot {
    const raw = globalThis.localStorage?.getItem(LIBRARY_KEY);
    if (!raw) return emptyLibrary();
    try {
      return JSON.parse(raw) as LibrarySnapshot;
    } catch {
      return emptyLibrary();
    }
  }

  private writeLibrary(snapshot: LibrarySnapshot): void {
    globalThis.localStorage?.setItem(LIBRARY_KEY, JSON.stringify(snapshot));
  }

  private readRefs(): CardAbilityReference[] {
    const raw = globalThis.localStorage?.getItem(REFS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as CardAbilityReference[];
    } catch {
      return [];
    }
  }

  private writeRefs(refs: CardAbilityReference[]): void {
    globalThis.localStorage?.setItem(REFS_KEY, JSON.stringify(refs));
  }

  private readDiscoveries(): PlayerAbilityDiscovery[] {
    const raw = globalThis.localStorage?.getItem(DISCOVERIES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PlayerAbilityDiscovery[];
    } catch {
      return [];
    }
  }

  private writeDiscoveries(discs: PlayerAbilityDiscovery[]): void {
    globalThis.localStorage?.setItem(DISCOVERIES_KEY, JSON.stringify(discs));
  }

  getAllFamilies(): AbilityFamily[] {
    return this.readLibrary().families;
  }
  getFamily(id: string): AbilityFamily | undefined {
    return this.readLibrary().families.find((f) => f.id === id);
  }
  getAllDefinitions(): AbilityDefinition[] {
    return this.readLibrary().definitions;
  }
  getDefinition(id: string): AbilityDefinition | undefined {
    return this.readLibrary().definitions.find((d) => d.id === id);
  }
  getAllVersions(abilityId: string): AbilityVersion[] {
    return this.readLibrary().versions.filter((v) => v.abilityId === abilityId);
  }
  getVersion(id: string): AbilityVersion | undefined {
    return this.readLibrary().versions.find((v) => v.id === id);
  }
  getCurrentVersion(abilityId: string): AbilityVersion | undefined {
    const def = this.getDefinition(abilityId);
    if (!def) return undefined;
    return this.getVersion(def.currentVersionId);
  }
  getArtForAbility(abilityId: string): CanonicalArtAsset | undefined {
    return this.readLibrary().art.find(
      (a) => a.abilityId === abilityId && a.status === 'approved',
    );
  }

  async saveFamily(family: AbilityFamily): Promise<void> {
    const lib = this.readLibrary();
    const idx = lib.families.findIndex((f) => f.id === family.id);
    if (idx >= 0) lib.families[idx] = family;
    else lib.families.push(family);
    this.writeLibrary(lib);
    this.notify();
  }
  async saveDefinition(def: AbilityDefinition): Promise<void> {
    const lib = this.readLibrary();
    const idx = lib.definitions.findIndex((d) => d.id === def.id);
    if (idx >= 0) lib.definitions[idx] = def;
    else lib.definitions.push(def);
    this.writeLibrary(lib);
    this.notify();
  }
  async saveVersion(version: AbilityVersion): Promise<void> {
    const lib = this.readLibrary();
    const idx = lib.versions.findIndex((v) => v.id === version.id);
    if (idx >= 0) lib.versions[idx] = version;
    else lib.versions.push(version);
    this.writeLibrary(lib);
    this.notify();
  }
  async saveArt(asset: CanonicalArtAsset): Promise<void> {
    const lib = this.readLibrary();
    const idx = lib.art.findIndex((a) => a.id === asset.id);
    if (idx >= 0) lib.art[idx] = asset;
    else lib.art.push(asset);
    this.writeLibrary(lib);
    this.notify();
  }

  getReferencesForCard(cardId: string): CardAbilityReference[] {
    return this.readRefs().filter((r) => r.cardId === cardId);
  }
  saveReference(ref: CardAbilityReference): void {
    const refs = this.readRefs();
    const idx = refs.findIndex(
      (r) =>
        r.cardId === ref.cardId &&
        r.slotType === ref.slotType &&
        r.localTier === ref.localTier,
    );
    if (idx >= 0) refs[idx] = ref;
    else refs.push(ref);
    this.writeRefs(refs);
    this.notify();
  }
  deleteReferencesForCard(cardId: string): void {
    this.writeRefs(this.readRefs().filter((r) => r.cardId !== cardId));
    this.notify();
  }

  getAllDiscoveries(): PlayerAbilityDiscovery[] {
    return this.readDiscoveries();
  }
  getDiscovery(abilityId: string): PlayerAbilityDiscovery | undefined {
    return this.readDiscoveries().find((d) => d.abilityId === abilityId);
  }
  saveDiscovery(disc: PlayerAbilityDiscovery): void {
    const discs = this.readDiscoveries();
    const idx = discs.findIndex((d) => d.abilityId === disc.abilityId);
    if (idx >= 0) discs[idx] = disc;
    else discs.push(disc);
    this.writeDiscoveries(discs);
    this.notify();
  }

  async hydrate(): Promise<void> {
    // No-op — localStorage reads are lazy.
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

/**
 * In-memory store for tests. Same shape as LocalStorage but never touches
 * globalThis.localStorage.
 */
export class InMemoryAbilityStore implements AbilityStore {
  private library: LibrarySnapshot = emptyLibrary();
  private refs: CardAbilityReference[] = [];
  private discoveries: PlayerAbilityDiscovery[] = [];
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  getAllFamilies(): AbilityFamily[] {
    return [...this.library.families];
  }
  getFamily(id: string): AbilityFamily | undefined {
    return this.library.families.find((f) => f.id === id);
  }
  getAllDefinitions(): AbilityDefinition[] {
    return [...this.library.definitions];
  }
  getDefinition(id: string): AbilityDefinition | undefined {
    return this.library.definitions.find((d) => d.id === id);
  }
  getAllVersions(abilityId: string): AbilityVersion[] {
    return this.library.versions.filter((v) => v.abilityId === abilityId);
  }
  getVersion(id: string): AbilityVersion | undefined {
    return this.library.versions.find((v) => v.id === id);
  }
  getCurrentVersion(abilityId: string): AbilityVersion | undefined {
    const def = this.getDefinition(abilityId);
    if (!def) return undefined;
    return this.getVersion(def.currentVersionId);
  }
  getArtForAbility(abilityId: string): CanonicalArtAsset | undefined {
    return this.library.art.find((a) => a.abilityId === abilityId && a.status === 'approved');
  }

  async saveFamily(family: AbilityFamily): Promise<void> {
    const idx = this.library.families.findIndex((f) => f.id === family.id);
    if (idx >= 0) this.library.families[idx] = family;
    else this.library.families.push(family);
    this.notify();
  }
  async saveDefinition(def: AbilityDefinition): Promise<void> {
    const idx = this.library.definitions.findIndex((d) => d.id === def.id);
    if (idx >= 0) this.library.definitions[idx] = def;
    else this.library.definitions.push(def);
    this.notify();
  }
  async saveVersion(version: AbilityVersion): Promise<void> {
    const idx = this.library.versions.findIndex((v) => v.id === version.id);
    if (idx >= 0) this.library.versions[idx] = version;
    else this.library.versions.push(version);
    this.notify();
  }
  async saveArt(asset: CanonicalArtAsset): Promise<void> {
    const idx = this.library.art.findIndex((a) => a.id === asset.id);
    if (idx >= 0) this.library.art[idx] = asset;
    else this.library.art.push(asset);
    this.notify();
  }

  getReferencesForCard(cardId: string): CardAbilityReference[] {
    return this.refs.filter((r) => r.cardId === cardId);
  }
  saveReference(ref: CardAbilityReference): void {
    const idx = this.refs.findIndex(
      (r) =>
        r.cardId === ref.cardId &&
        r.slotType === ref.slotType &&
        r.localTier === ref.localTier,
    );
    if (idx >= 0) this.refs[idx] = ref;
    else this.refs.push(ref);
    this.notify();
  }
  deleteReferencesForCard(cardId: string): void {
    this.refs = this.refs.filter((r) => r.cardId !== cardId);
    this.notify();
  }

  getAllDiscoveries(): PlayerAbilityDiscovery[] {
    return [...this.discoveries];
  }
  getDiscovery(abilityId: string): PlayerAbilityDiscovery | undefined {
    return this.discoveries.find((d) => d.abilityId === abilityId);
  }
  saveDiscovery(disc: PlayerAbilityDiscovery): void {
    const idx = this.discoveries.findIndex((d) => d.abilityId === disc.abilityId);
    if (idx >= 0) this.discoveries[idx] = disc;
    else this.discoveries.push(disc);
    this.notify();
  }

  async hydrate(): Promise<void> {
    // No-op — populated by tests directly.
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  // Test helper.
  seedLibraryForTest(snapshot: Partial<LibrarySnapshot>): void {
    this.library = {
      families: snapshot.families ?? [],
      definitions: snapshot.definitions ?? [],
      versions: snapshot.versions ?? [],
      art: snapshot.art ?? [],
    };
    this.notify();
  }
}

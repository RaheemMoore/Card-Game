import type {
  AbilityDefinition,
  AbilityFamily,
  AbilityVersion,
  CanonicalArtAsset,
  CardAbilityReference,
  PlayerAbilityDiscovery,
} from '../../types/abilities';
import type { AbilityStore } from './AbilityStore';
import { getSupabaseClient, getCurrentUserId } from './supabaseClient';
import { enqueue, registerHandler } from './SyncQueue';

/**
 * Supabase implementation.
 *
 * - Library reads come from an in-memory cache populated by hydrate() —
 *   fetched fresh at session start and refreshed only when the admin queue
 *   publishes a new version (post-A9).
 * - Library writes are admin-only. They bypass the SyncQueue and go direct
 *   so admin failures surface immediately; RLS rejects non-admins.
 * - Card refs + player discoveries mirror CardStore: cache write is sync,
 *   remote persistence is queued and idempotent.
 */

interface FamilyRow { id: string; name: string; status: string; sort_order: number; data: AbilityFamily; }
interface DefinitionRow {
  id: string; slug: string; display_name: string; rarity: string; role: string;
  status: string; current_version_id: string | null; data: AbilityDefinition;
}
interface VersionRow {
  id: string; ability_id: string; version_number: number; slot_type: string;
  resource_type: string; status: string; data: AbilityVersion;
}
interface ArtRow {
  id: string; ability_id: string; provider: string; status: string;
  asset_url: string; thumbnail_url: string | null; source_prompt_version: string | null;
  data: CanonicalArtAsset;
}
interface RefRow {
  card_id: string; slot_type: string; local_tier: string; user_id: string;
  ability_id: string; ability_version_id: string | null; display_order: number;
  data: CardAbilityReference;
}
interface DiscoveryRow {
  user_id: string; ability_id: string; discovered_at: string;
  first_discovered_globally: boolean; times_seen: number; times_owned_on_cards: number;
  reward_granted: boolean; reward_transaction_id: string | null;
  data: PlayerAbilityDiscovery;
}

export class SupabaseAbilityStore implements AbilityStore {
  private families = new Map<string, AbilityFamily>();
  private definitions = new Map<string, AbilityDefinition>();
  private versions = new Map<string, AbilityVersion>();
  private art = new Map<string, CanonicalArtAsset>();
  private refs = new Map<string, CardAbilityReference>();
  private discoveries = new Map<string, PlayerAbilityDiscovery>();
  private listeners = new Set<() => void>();

  constructor() {
    registerHandler('ability_ref_upsert', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const row = payload as RefRow;
      const { error } = await client
        .from('card_ability_references')
        .upsert(row, { onConflict: 'card_id,slot_type,local_tier' });
      if (error) throw error;
    });
    registerHandler('ability_ref_delete', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const { cardId } = payload as { cardId: string };
      const { error } = await client
        .from('card_ability_references')
        .delete()
        .eq('card_id', cardId);
      if (error) throw error;
    });
    registerHandler('player_discovery_upsert', async (payload) => {
      const client = getSupabaseClient();
      if (!client) throw new Error('Supabase client not available.');
      const row = payload as DiscoveryRow;
      const { error } = await client
        .from('player_ability_discoveries')
        .upsert(row, { onConflict: 'user_id,ability_id' });
      if (error) throw error;
    });
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  private refKey(ref: CardAbilityReference): string {
    return `${ref.cardId}::${ref.slotType}::${ref.localTier}`;
  }

  // ---- Library reads ----
  getAllFamilies(): AbilityFamily[] { return Array.from(this.families.values()); }
  getFamily(id: string): AbilityFamily | undefined { return this.families.get(id); }
  getAllDefinitions(): AbilityDefinition[] { return Array.from(this.definitions.values()); }
  getDefinition(id: string): AbilityDefinition | undefined { return this.definitions.get(id); }
  getAllVersions(abilityId: string): AbilityVersion[] {
    return Array.from(this.versions.values()).filter((v) => v.abilityId === abilityId);
  }
  getVersion(id: string): AbilityVersion | undefined { return this.versions.get(id); }
  getCurrentVersion(abilityId: string): AbilityVersion | undefined {
    const def = this.definitions.get(abilityId);
    if (!def) return undefined;
    return this.versions.get(def.currentVersionId);
  }
  getArtForAbility(abilityId: string): CanonicalArtAsset | undefined {
    for (const asset of this.art.values()) {
      if (asset.abilityId === abilityId && asset.status === 'approved') return asset;
    }
    return undefined;
  }

  // ---- Library writes (admin-only) ----
  async saveFamily(family: AbilityFamily): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: FamilyRow = {
      id: family.id,
      name: family.name,
      status: family.status,
      sort_order: family.sortOrder,
      data: family,
    };
    const { error } = await client.from('ability_families').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.families.set(family.id, family);
    this.notify();
  }

  async saveDefinition(def: AbilityDefinition): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: DefinitionRow = {
      id: def.id,
      slug: def.slug,
      display_name: def.displayName,
      rarity: def.rarity,
      role: def.role,
      status: def.status,
      current_version_id: def.currentVersionId,
      data: def,
    };
    const { error } = await client.from('ability_definitions').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.definitions.set(def.id, def);
    this.notify();
  }

  async saveVersion(version: AbilityVersion): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: VersionRow = {
      id: version.id,
      ability_id: version.abilityId,
      version_number: version.versionNumber,
      slot_type: version.slotType,
      resource_type: version.resourceType,
      status: version.status,
      data: version,
    };
    const { error } = await client.from('ability_versions').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.versions.set(version.id, version);
    this.notify();
  }

  async saveArt(asset: CanonicalArtAsset): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: ArtRow = {
      id: asset.id,
      ability_id: asset.abilityId,
      provider: asset.provider,
      status: asset.status,
      asset_url: asset.assetUrl,
      thumbnail_url: asset.thumbnailUrl ?? null,
      source_prompt_version: asset.sourcePromptVersion ?? null,
      data: asset,
    };
    const { error } = await client.from('canonical_art_assets').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.art.set(asset.id, asset);
    this.notify();
  }

  // ---- Per-card references ----
  getReferencesForCard(cardId: string): CardAbilityReference[] {
    return Array.from(this.refs.values()).filter((r) => r.cardId === cardId);
  }

  saveReference(ref: CardAbilityReference): void {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('SupabaseAbilityStore.saveReference called before session ready.');
    this.refs.set(this.refKey(ref), ref);
    this.notify();
    const row: RefRow = {
      card_id: ref.cardId,
      slot_type: ref.slotType,
      local_tier: ref.localTier,
      user_id: userId,
      ability_id: ref.abilityId,
      ability_version_id: ref.abilityVersionId ?? null,
      display_order: ref.displayOrder,
      data: ref,
    };
    void enqueue({
      id: `abref:${ref.cardId}:${ref.slotType}:${ref.localTier}:${Date.now()}`,
      kind: 'ability_ref_upsert',
      payload: row,
    });
  }

  deleteReferencesForCard(cardId: string): void {
    for (const key of Array.from(this.refs.keys())) {
      if (this.refs.get(key)?.cardId === cardId) this.refs.delete(key);
    }
    this.notify();
    void enqueue({
      id: `abref-del:${cardId}:${Date.now()}`,
      kind: 'ability_ref_delete',
      payload: { cardId },
    });
  }

  // ---- Per-user discoveries ----
  getAllDiscoveries(): PlayerAbilityDiscovery[] {
    return Array.from(this.discoveries.values());
  }
  getDiscovery(abilityId: string): PlayerAbilityDiscovery | undefined {
    return this.discoveries.get(abilityId);
  }
  saveDiscovery(disc: PlayerAbilityDiscovery): void {
    const userId = getCurrentUserId();
    if (!userId) throw new Error('SupabaseAbilityStore.saveDiscovery called before session ready.');
    this.discoveries.set(disc.abilityId, disc);
    this.notify();
    const row: DiscoveryRow = {
      user_id: userId,
      ability_id: disc.abilityId,
      discovered_at: disc.discoveredAt,
      first_discovered_globally: disc.firstDiscoveredGlobally,
      times_seen: disc.timesSeen,
      times_owned_on_cards: disc.timesOwnedOnCards,
      reward_granted: disc.rewardGranted,
      reward_transaction_id: disc.rewardTransactionId ?? null,
      data: disc,
    };
    void enqueue({
      id: `disc:${disc.abilityId}:${Date.now()}`,
      kind: 'player_discovery_upsert',
      payload: row,
    });
  }

  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available for hydrate.');
    const userId = getCurrentUserId();
    if (!userId) throw new Error('hydrate called before session ready.');

    // Library data — every authenticated user can read.
    const [familiesRes, definitionsRes, versionsRes, artRes] = await Promise.all([
      client.from('ability_families').select('data'),
      client.from('ability_definitions').select('data'),
      client.from('ability_versions').select('data'),
      client.from('canonical_art_assets').select('data, asset_url, thumbnail_url').eq('status', 'approved'),
    ]);

    if (familiesRes.error) throw familiesRes.error;
    if (definitionsRes.error) throw definitionsRes.error;
    if (versionsRes.error) throw versionsRes.error;
    if (artRes.error) throw artRes.error;

    this.families.clear();
    for (const row of familiesRes.data ?? []) {
      const family = (row as { data: AbilityFamily }).data;
      if (family?.id) this.families.set(family.id, family);
    }
    this.definitions.clear();
    for (const row of definitionsRes.data ?? []) {
      const def = (row as { data: AbilityDefinition }).data;
      if (def?.id) this.definitions.set(def.id, def);
    }
    this.versions.clear();
    for (const row of versionsRes.data ?? []) {
      const v = (row as { data: AbilityVersion }).data;
      if (v?.id) this.versions.set(v.id, v);
    }
    this.art.clear();
    for (const row of artRes.data ?? []) {
      const r = row as { data: CanonicalArtAsset; asset_url: string; thumbnail_url: string | null };
      const a = r.data;
      if (!a?.id) continue;
      // Rehydrate assetUrl/thumbnailUrl from the columns so the jsonb `data`
      // blob doesn't have to duplicate the (potentially huge) data URL.
      const merged: CanonicalArtAsset = {
        ...a,
        assetUrl: a.assetUrl || r.asset_url,
        thumbnailUrl: a.thumbnailUrl || r.thumbnail_url || undefined,
      };
      this.art.set(a.id, merged);
    }

    // Per-user data.
    const [refsRes, discRes] = await Promise.all([
      client.from('card_ability_references').select('data').eq('user_id', userId),
      client.from('player_ability_discoveries').select('data').eq('user_id', userId),
    ]);
    if (refsRes.error) throw refsRes.error;
    if (discRes.error) throw discRes.error;

    this.refs.clear();
    for (const row of refsRes.data ?? []) {
      const ref = (row as { data: CardAbilityReference }).data;
      if (ref) this.refs.set(this.refKey(ref), ref);
    }
    this.discoveries.clear();
    for (const row of discRes.data ?? []) {
      const d = (row as { data: PlayerAbilityDiscovery }).data;
      if (d?.abilityId) this.discoveries.set(d.abilityId, d);
    }

    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

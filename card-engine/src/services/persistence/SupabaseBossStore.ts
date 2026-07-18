import type { BossDefinition, BossVersion } from '../../types/bosses';
import type { BossStore } from './BossStore';
import { getSupabaseClient } from './supabaseClient';

/**
 * Supabase implementation of BossStore.
 *
 * Library data is globally readable to authenticated users; writes are
 * admin-only via RLS. Writes bypass the SyncQueue so admin failures surface
 * synchronously (matching SupabaseAbilityStore's library-write path).
 */

interface DefinitionRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  current_version_id: string | null;
  data: BossDefinition;
}

interface VersionRow {
  id: string;
  boss_id: string;
  version_number: number;
  status: string;
  published_at: string | null;
  deprecated_at: string | null;
  data: BossVersion;
}

export class SupabaseBossStore implements BossStore {
  private definitions = new Map<string, BossDefinition>();
  private versions = new Map<string, BossVersion>();
  private listeners = new Set<() => void>();

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  getAllDefinitions(): BossDefinition[] {
    return Array.from(this.definitions.values());
  }
  getDefinition(id: string): BossDefinition | undefined {
    return this.definitions.get(id);
  }
  getAllVersions(bossId: string): BossVersion[] {
    return Array.from(this.versions.values()).filter((v) => v.bossId === bossId);
  }
  getVersion(id: string): BossVersion | undefined {
    return this.versions.get(id);
  }
  getCurrentVersion(bossId: string): BossVersion | undefined {
    const def = this.definitions.get(bossId);
    if (!def) return undefined;
    return this.versions.get(def.currentVersionId);
  }

  async saveDefinition(def: BossDefinition): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: DefinitionRow = {
      id: def.id,
      slug: def.slug,
      name: def.name,
      status: def.status,
      current_version_id: def.currentVersionId || null,
      data: def,
    };
    const { error } = await client.from('boss_definitions').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.definitions.set(def.id, def);
    this.notify();
  }

  async saveVersion(version: BossVersion): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');
    const row: VersionRow = {
      id: version.id,
      boss_id: version.bossId,
      version_number: version.versionNumber,
      status: version.status,
      published_at: version.publishedAt ?? null,
      deprecated_at: version.deprecatedAt ?? null,
      data: version,
    };
    const { error } = await client.from('boss_versions').upsert(row, { onConflict: 'id' });
    if (error) throw error;
    this.versions.set(version.id, version);
    this.notify();
  }

  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available for hydrate.');
    const [defRes, verRes] = await Promise.all([
      client.from('boss_definitions').select('data'),
      client.from('boss_versions').select('data'),
    ]);
    if (defRes.error) throw defRes.error;
    if (verRes.error) throw verRes.error;

    this.definitions.clear();
    for (const row of defRes.data ?? []) {
      const def = (row as { data: BossDefinition }).data;
      if (def?.id) this.definitions.set(def.id, def);
    }
    this.versions.clear();
    for (const row of verRes.data ?? []) {
      const v = (row as { data: BossVersion }).data;
      if (v?.id) this.versions.set(v.id, v);
    }
    this.notify();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

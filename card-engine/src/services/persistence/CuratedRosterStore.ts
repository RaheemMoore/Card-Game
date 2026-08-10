import type { ArchetypeName } from '../../types/card';
import type {
  CuratedCharacter,
  CuratedCharacterRow,
  CuratedVariant,
  CuratedVariantRow,
} from '../../types/curatedCard';
import { getSupabaseClient } from './supabaseClient';

/**
 * The permanent roster store.
 *
 * Modeled on SupabaseAbilityStore's library half, and for the same reasons:
 * this is shared game content with no `user_id`, reads come from an in-memory
 * cache filled by hydrate(), and writes go DIRECT rather than through the
 * SyncQueue.
 *
 * Direct writes are the important choice. The SyncQueue exists so a player's
 * card is never lost to a flaky connection; it swallows the round trip and
 * retries later. That is exactly wrong for an authoring tool — when Tori saves
 * a lore paragraph and RLS rejects it, she has to find out immediately, not
 * discover an hour later that the last hour did not persist.
 *
 * Every mutator therefore returns a promise that rejects on failure, and the
 * cache is only updated once the write has actually landed.
 */

export class CuratedRosterStore {
  private characters = new Map<string, CuratedCharacter>();
  private variants = new Map<string, CuratedVariant>();
  private listeners = new Set<() => void>();
  private hydrated = false;

  // ---- Subscription ----

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  // ---- Reads (synchronous, off the cache) ----

  isHydrated(): boolean {
    return this.hydrated;
  }

  getCharacter(id: string): CuratedCharacter | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): CuratedCharacter[] {
    return Array.from(this.characters.values());
  }

  getCharactersForArchetype(archetype: ArchetypeName): CuratedCharacter[] {
    return this.getAllCharacters()
      .filter((c) => c.archetype === archetype)
      .sort((a, b) => a.slotIndex - b.slotIndex);
  }

  /** The occupant of a roster slot, if any. Slots are 1-indexed. */
  getCharacterInSlot(archetype: ArchetypeName, slotIndex: number): CuratedCharacter | undefined {
    return this.getAllCharacters().find(
      (c) => c.archetype === archetype && c.slotIndex === slotIndex,
    );
  }

  getVariant(id: string): CuratedVariant | undefined {
    return this.variants.get(id);
  }

  getVariantsForCharacter(characterId: string): CuratedVariant[] {
    return Array.from(this.variants.values()).filter((v) => v.characterId === characterId);
  }

  /** Everything actually in the game — the far side of the permanent boundary. */
  getPermanentVariants(): CuratedVariant[] {
    return Array.from(this.variants.values()).filter((v) => v.status === 'permanent');
  }

  // ---- Hydrate ----

  /**
   * Load the whole roster. It is small by construction — ~110 characters and
   * their variants — so there is no paging here, unlike CardStore which pages
   * a player's unbounded collection.
   */
  async hydrate(): Promise<void> {
    const client = getSupabaseClient();
    // Throw rather than return quietly. A silent early return renders as an
    // empty roster, which is indistinguishable from "nothing has been authored
    // yet" and means the opposite. There are three states here — empty,
    // unreadable, and unconfigured — and the UI must be able to tell them
    // apart. Same wording as the rest of the admin surface.
    if (!client) {
      throw new Error(
        'Supabase is not configured (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing). ' +
          'The roster lives in the database, so nothing can be read or authored without it.',
      );
    }

    const [charsResult, variantsResult] = await Promise.all([
      client.from('curated_characters').select('data'),
      client.from('curated_variants').select('data'),
    ]);

    if (charsResult.error) throw charsResult.error;
    if (variantsResult.error) throw variantsResult.error;

    this.characters.clear();
    this.variants.clear();

    for (const row of (charsResult.data ?? []) as Array<{ data: CuratedCharacter }>) {
      if (row.data?.id) this.characters.set(row.data.id, row.data);
    }
    for (const row of (variantsResult.data ?? []) as Array<{ data: CuratedVariant }>) {
      if (row.data?.id) this.variants.set(row.data.id, row.data);
    }

    this.hydrated = true;
    this.notify();
  }

  // ---- Writes (direct; reject loudly) ----

  async saveCharacter(character: CuratedCharacter): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');

    const row: CuratedCharacterRow = {
      id: character.id,
      archetype: character.archetype,
      slot_index: character.slotIndex,
      status: character.status,
      display_name: character.displayName || null,
      data: character,
    };

    const { error } = await client
      .from('curated_characters')
      .upsert(row, { onConflict: 'id' });
    if (error) throw error;

    this.characters.set(character.id, character);
    this.notify();
  }

  async saveVariant(variant: CuratedVariant): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');

    const row: CuratedVariantRow = {
      id: variant.id,
      character_id: variant.characterId,
      element: variant.element,
      status: variant.status,
      art_mode: variant.artMode,
      data: variant,
    };

    const { error } = await client
      .from('curated_variants')
      .upsert(row, { onConflict: 'id' });
    if (error) throw error;

    this.variants.set(variant.id, variant);
    this.notify();
  }

  /** Deleting a character cascades its variants in the database. */
  async deleteCharacter(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');

    const { error } = await client.from('curated_characters').delete().eq('id', id);
    if (error) throw error;

    this.characters.delete(id);
    for (const [variantId, variant] of this.variants) {
      if (variant.characterId === id) this.variants.delete(variantId);
    }
    this.notify();
  }

  async deleteVariant(id: string): Promise<void> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase client not available.');

    const { error } = await client.from('curated_variants').delete().eq('id', id);
    if (error) throw error;

    this.variants.delete(id);
    this.notify();
  }

  /** Test seam — fills the cache without touching Supabase. */
  seedForTest(characters: CuratedCharacter[], variants: CuratedVariant[] = []): void {
    this.characters.clear();
    this.variants.clear();
    for (const c of characters) this.characters.set(c.id, c);
    for (const v of variants) this.variants.set(v.id, v);
    this.hydrated = true;
    this.notify();
  }
}

// ---- Module singleton ----
//
// One store per app, like the ability library. The Workshop is the only writer.

let store: CuratedRosterStore | null = null;

export function getCuratedRosterStore(): CuratedRosterStore {
  store ??= new CuratedRosterStore();
  return store;
}

/** Test seam — drops the singleton so a fresh store can be installed. */
export function resetCuratedRosterStore(): void {
  store = null;
}

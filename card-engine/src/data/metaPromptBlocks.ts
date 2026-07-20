import type { ArchetypeName } from '../types/card';

/**
 * Per-archetype Layer-D escalation blocks that (will) live inside the
 * Bible-driven claudeApi.ts pipeline. Read-only in the Archetype Workshop
 * UI so lore directors can see exactly what mandate (if any) each
 * archetype currently ships with, and file proposals against it.
 *
 * CURRENTLY EMPTY. The pre-Bible claudeApi.ts had inline archetype-specific
 * blocks (Lycanthrope wolf-anatomy mandate, Tech-class "more machine" rule);
 * those were removed during the 2026-07-19 Bible pipeline migration and the
 * Bible chapter's identityMatrix + rank continuity clauses now cover the
 * same territory generically. Step (b) — the point of the Workshop — is to
 * walk each archetype and decide whether it needs a dedicated escalation
 * block back on top of the Bible pipeline. When one lands, add it here
 * AND wire it into claudeApi.ts. A later PR should unify them so both
 * read from one place.
 */
export const META_PROMPT_BLOCKS: Partial<Record<ArchetypeName, string>> = {};

export function getMetaPromptBlock(archetype: ArchetypeName): string | null {
  return META_PROMPT_BLOCKS[archetype] ?? null;
}

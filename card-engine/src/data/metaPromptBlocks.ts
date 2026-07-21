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
export const META_PROMPT_BLOCKS: Partial<Record<ArchetypeName, string>> = {
  // Seraph corruption arc (P6) — three-path anchor mandate. The Seraph's
  // alignment (Good / Fallen / Balanced) is a narrative axis resolved from
  // Story Pillar answers at tier-up, NOT a fashion role. Rank governs how
  // much of the chosen path is visible.
  Seraph: [
    'SERAPH THREE-PATH ANCHOR MANDATE (alignment axis, not a fashion role):',
    '- Foundation: austerity. Plain unbleached linen / monastic robe. NO armor, halo, wings, horns, or aura — alignment has not declared yet; the divine spark could turn either way.',
    '- Forged: exactly ONE ceremonial piece over the cloth base, matching the declared path — gilded gear / gold-veined implement (Good); blackened obsidian piece / soot-veined weapon (Fallen); a single grey-lacquered piece (Balanced).',
    '- Ascendant: full commitment to the declared path — Good = radiant gold-and-white regalia; Fallen = full obsidian regalia with Infernal-wreathed weapons, molten black light, broken/inverted halo (Infernal is Fallen-Seraph-exclusive, molten obsidian + black light, never fire-orange); Balanced = asymmetric split-crown regalia, half gold / half obsidian, mismatched wings.',
    'The six Orders are independent of the alignment axis. Never collapse them into good-vs-evil, and never use horned-red-imp / pentagram / sexy-demoness shorthand for Fallen.',
  ].join('\n'),
};

export function getMetaPromptBlock(archetype: ArchetypeName): string | null {
  return META_PROMPT_BLOCKS[archetype] ?? null;
}

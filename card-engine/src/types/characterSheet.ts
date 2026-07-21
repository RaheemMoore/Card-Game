import type { ArchetypeName, Rank } from './card';
import type { ElementBond, ElementName, HiddenFate } from './bible';
import type { CardAbilityReference } from './abilities';

/**
 * The seam between the Lore Engine and the Image Engine (2026-07-21
 * image/lore decoupling).
 *
 * Background: card generation used to run through ONE Claude call that
 * returned name + title + lore AND the Leonardo portraitPrompt in a single
 * JSON blob, assembled from a ~1200-line braided prompt. Lore and image
 * could not be improved independently — every image fix risked corrupting
 * the name/lore, and vice versa (see the defensive "IMAGE-only, never touch
 * lore" comments throughout services/claudeApi.ts).
 *
 * The fix is this typed contract. The Lore Engine (the Claude call) writes a
 * CharacterSheet describing WHO the character is. The Image Engine
 * (services/portraitAssembler.ts — pure, deterministic TypeScript) READS the
 * sheet and produces the Leonardo prompt. It invents no identity.
 *
 * THE SEAM IS ONE OMISSION: this sheet deliberately does NOT carry
 * `cardName`, `nameAndTitle`, or `lore`. The Image Engine physically never
 * receives them, so it cannot corrupt the character's name or story by
 * trying to stage a better picture. That omission is the guarantee.
 *
 * The sheet is EPHEMERAL — it is never persisted. `hiddenFate` remains the
 * only persisted contract; a sheet is derived from a Card on demand, so no
 * Supabase migration is needed.
 */
export interface CharacterSheet {
  // ---- Written by the Lore Engine (identity + narrative substrate) ----

  /**
   * Bible §Hidden Fate — the full identity substrate the Image Engine reads:
   * locked anchors (age/sex/bodyType/skinTone/facialStructure/hair/
   * disability/scars), structured body/skin/hair/fashion decompositions, and
   * the mutable scene fields (weather/lighting/environmentDetails). This is
   * the ONE substrate legitimately shared by both engines.
   */
  hiddenFate: HiddenFate;

  /**
   * Resolved visual objects, materials, and symbols the Story Pillar answers
   * imply — emitted by the Lore Engine as concrete tokens (e.g. "a
   * bone-handled ritual dagger", "a funeral shroud embroidered with names")
   * so the Image Engine never has to parse Story Pillar text. Bible §Step 10
   * story-derived detail. May be empty.
   */
  storyMotifs: readonly string[];

  // ---- Caller-supplied render context (Image Engine reads only) ----

  archetype: ArchetypeName;
  rank: Rank;

  /**
   * The element as it should render NOW — a Fallen Seraph's transmuted
   * Infernal, otherwise the origin element. Drives the element lockdown,
   * rank spectacle, and anti-contamination negatives.
   */
  resolvedElement: ElementName;
  elementBond?: ElementBond;

  /**
   * The required pose for this render (from the archetype pose pool on a
   * fresh forge). Empty string on tier-up / regen, where identity + pose
   * family are locked and the assembler falls back to rank-scaled action.
   */
  pose: string;

  /**
   * The forced diversity axis for a fresh forge. Empty string on tier-up /
   * regen (identity is locked, so no new axis is rolled).
   */
  diversityAxis: string;

  /**
   * True when this is a tier-up / regen of an already-generated character
   * (existingHiddenFate was present). Turns on the rank-continuity clauses
   * (locked palette, "same person aged and hardened", drift bans).
   */
  isEvolution: boolean;

  /** P6 Seraph corruption arc — resolved narrative-axis path when present. */
  narrativeAxisPath?: string;

  /**
   * The character's current ability refs, so the assembler can weave each
   * ability's visual signature into the render. Empty on a bare Foundation
   * forge before the core ability attaches.
   */
  abilityRefs: readonly CardAbilityReference[];
}

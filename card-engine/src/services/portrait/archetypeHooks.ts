import type { ArchetypeName } from '../../types/card';
import type { CharacterSheet } from '../../types/characterSheet';

/**
 * Per-archetype portrait "hooks" — the seam that lets a few archetypes inject
 * special-case prompt fragments into the otherwise archetype-agnostic Image
 * Engine, WITHOUT a pile of `if (archetype === …)` branches in the assembler.
 *
 * Each hook is a pure string-returner (a throw would fail the whole forge for
 * that archetype). The assembler calls them at fixed insertion points and
 * filters out empties. Registered per archetype in ARCHETYPE_PORTRAIT_HOOKS;
 * an archetype with no entry behaves generically.
 *
 * Populated in Step 3 of the image-engine migration (Vampire feral gate,
 * Lycanthrope rank-aware pose + Ascendant all-fours, Seraph three-path anchor,
 * Mech Pilot mandatory-mech, Android human touchpoints). Empty for now so the
 * assembler wiring lands first with zero behavior change.
 */
export interface ArchetypePortraitHooks {
  /** Overrides the generic pose prefix (e.g. Lycan rank-aware form, Vampire
   *  feral). Return a non-empty string to override; the assembler uses the
   *  generic pose prefix when this is absent or returns empty. */
  posePrefix?(sheet: CharacterSheet): string;
  /** A segment that MUST always render for this archetype (e.g. Mech Pilot's
   *  mandatory mech in frame at every rank). */
  mandatorySegment?(sheet: CharacterSheet): string;
  /** A narrative-axis anchor (e.g. Seraph's Good/Fallen/Balanced path from
   *  sheet.narrativeAxisPath). */
  narrativeAnchor?(sheet: CharacterSheet): string;
}

const ARCHETYPE_PORTRAIT_HOOKS: Partial<Record<ArchetypeName, ArchetypePortraitHooks>> = {
  // Step 3: Vampire, Lycanthrope, Seraph, 'Mech Pilot', Android.
};

export function getPortraitHooks(archetype: ArchetypeName): ArchetypePortraitHooks | undefined {
  return ARCHETYPE_PORTRAIT_HOOKS[archetype];
}

/** The archetype's pose-prefix override, or null to use the generic prefix. */
export function hookPosePrefix(sheet: CharacterSheet): string | null {
  const fn = getPortraitHooks(sheet.archetype)?.posePrefix;
  const out = fn ? fn(sheet) : '';
  return out && out.trim().length > 0 ? out : null;
}

/** The archetype's mandatory segment, or '' if none. */
export function hookMandatorySegment(sheet: CharacterSheet): string {
  const fn = getPortraitHooks(sheet.archetype)?.mandatorySegment;
  return fn ? fn(sheet) : '';
}

/** The archetype's narrative anchor, or '' if none. */
export function hookNarrativeAnchor(sheet: CharacterSheet): string {
  const fn = getPortraitHooks(sheet.archetype)?.narrativeAnchor;
  return fn ? fn(sheet) : '';
}

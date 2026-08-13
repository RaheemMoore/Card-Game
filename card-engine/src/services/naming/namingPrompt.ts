import type { ArchetypeName } from '../../types/card';
import {
  NAMING_BIBLE,
  NAME_STRUCTURE_LABELS,
  NAMING_BANNED_TROPES,
  NAMING_QUALITY_REMINDERS,
  EPITHET_BY_RANK,
  rotateSlice,
  type NameStructure,
} from '../../data/namingBible';

/**
 * The Fantasy Character Naming Bible prompt block, in one place.
 *
 * This used to be a template literal inside claudeApi.ts. It moved here when
 * the Lore Desk needed the SAME block to ask for name candidates for a
 * curated character (2026-08-11) — two copies of the Bible's enforcement
 * would drift, and the banned-trope list is the kind of thing that must be
 * identical everywhere or it is not a rule.
 *
 * Two exports, one selection:
 *
 *   buildNamingBibleBlock  → the prompt text a model sees
 *   selectNamingSparks     → the same choices as data, for the desk's panel
 *
 * They share `pick()` deliberately. The desk shows a director the examples
 * "for rhythm reference" beside a button that sends those same examples to
 * the model; if the two lists disagreed, the panel would be lying about what
 * the model was told.
 *
 * PURE — no window, no localStorage. The rotation cursor belongs to the
 * caller (claudeApi keeps `card-engine-naming-offset`; the desk uses local
 * component state), because a shared module reaching into storage is how the
 * forge and the desk would start fighting over one counter.
 */

export interface NamingSelectionInput {
  archetype: ArchetypeName;
  rank: 'Foundation' | 'Forged' | 'Ascendant';
  /** Rotation cursor. The caller owns it. */
  offset: number;
  sampleCount: number;
  fullCount: number;
  registerCount: number;
}

export interface NamingBlockInput extends NamingSelectionInput {
  /** Already formatted by the caller. '' renders the "early forge" note. */
  recentNamesStr: string;
}

interface Picked {
  guide: (typeof NAMING_BIBLE)[ArchetypeName] | undefined;
  sampleNames: readonly string[];
  sampleFullNames: readonly string[];
  registers: readonly string[];
}

/**
 * The one place the rotation multipliers live. They are not arbitrary: the
 * three lists are different lengths, and stepping them at different rates is
 * what stops the same name/register PAIRING recurring every few forges.
 */
function pick(input: NamingSelectionInput): Picked {
  const guide = NAMING_BIBLE[input.archetype];
  if (!guide) {
    return { guide: undefined, sampleNames: [], sampleFullNames: [], registers: [] };
  }
  return {
    guide,
    sampleNames: rotateSlice(guide.sampleNames, input.offset * 3, input.sampleCount),
    sampleFullNames: rotateSlice(guide.sampleFullNames, input.offset * 2, input.fullCount),
    registers: rotateSlice(guide.culturalRegisters, input.offset, input.registerCount),
  };
}

/**
 * The prompt block, character-for-character as claudeApi.ts rendered it
 * before the extraction. The leading and trailing newlines are part of the
 * contract — the caller interpolates this straight into a larger template.
 */
export function buildNamingBibleBlock(input: NamingBlockInput): string {
  const { guide, sampleNames, sampleFullNames, registers } = pick(input);
  const { archetype, rank, recentNamesStr } = input;
  return `
=== FANTASY CHARACTER NAMING BIBLE (Raheem v1.0 — enforce for cardName and nameAndTitle) ===
CORE PRINCIPLE: A name is compressed worldbuilding. It should feel like the character existed BEFORE the prompt. Do NOT sample the example names below verbatim — they are showing STRUCTURE, RHYTHM, and CULTURAL DIRECTION only. Generate an ORIGINAL name that fits THIS character's ancestry (from the diversity axis + hiddenFate.skinTone), archetype, and story.

ARCHETYPE NAMING IDENTITY (${archetype}): ${guide?.identity ?? ''}.

CULTURAL DIRECTION (pick ONE that fits the character's ancestry — do NOT default to a Norse/Latin/East-Asian stereotype for this archetype):
${registers.map((r) => `  - ${r}`).join('\n')}

SUITABLE NAME STRUCTURES for ${archetype} (choose ONE):
${(guide?.structures ?? []).map((s) => `  - ${NAME_STRUCTURE_LABELS[s]}`).join('\n')}

EXAMPLE PERSONAL NAMES (for tone/rhythm reference — DO NOT copy verbatim): ${sampleNames.join(', ')}
EXAMPLE FULL NAMES (for structure/epithet reference — DO NOT copy verbatim): ${sampleFullNames.join(' ; ')}

BANNED TROPES (project-wide — DO NOT use, no exceptions):
  ${NAMING_BANNED_TROPES.slice(0, 25).join(', ')}
  (and: any "X, Keeper of Y" / "X, the Warden of Y" / "X, Y's Vigil" default epithets — these are the exact tropes we are eliminating)

ARCHETYPE-SPECIFIC AVOID for ${archetype}:
${(guide?.avoid ?? []).map((a) => `  - ${a}`).join('\n')}

EPITHET GUIDANCE (rank = ${rank}): ${EPITHET_BY_RANK[rank]}

QUALITY REMINDERS:
${NAMING_QUALITY_REMINDERS.map((q) => `  - ${q}`).join('\n')}

RECENT CARD NAMES (do NOT repeat these, do NOT reuse the same first-name shape or ending): ${recentNamesStr || '(none yet — this is an early forge)'}

Before returning cardName + nameAndTitle, verify: (1) does it fit THIS character's specific ancestry/story, not just a generic archetype cliché? (2) is it structurally different from the recent names above? (3) is it FREE of every banned trope? (4) is any epithet EARNED by a specific Story Pillar answer (Foundation: usually no epithet)? If any answer is weak, revise the name.
`;
}

// ---------------------------------------------------------------------------
// The same selection, as data — for the Lore Desk's Sparks panel.
// ---------------------------------------------------------------------------

export interface NamingSparks {
  identity: string;
  structures: Array<{ key: NameStructure; label: string }>;
  registers: readonly string[];
  /** Show these labelled as rhythm reference. They must NEVER be used as-is. */
  sampleNames: readonly string[];
  sampleFullNames: readonly string[];
  /** EPITHET_BY_RANK for the requested rank. */
  epithetGuidance: string;
  /** Every rank's guidance, so the panel can show where a name may travel. */
  epithetByRank: Record<'Foundation' | 'Forged' | 'Ascendant', string>;
  avoid: readonly string[];
}

export function selectNamingSparks(input: NamingSelectionInput): NamingSparks {
  const { guide, sampleNames, sampleFullNames, registers } = pick(input);
  return {
    identity: guide?.identity ?? '',
    structures: (guide?.structures ?? []).map((key) => ({
      key,
      label: NAME_STRUCTURE_LABELS[key],
    })),
    registers,
    sampleNames,
    sampleFullNames,
    epithetGuidance: EPITHET_BY_RANK[input.rank],
    epithetByRank: EPITHET_BY_RANK,
    avoid: guide?.avoid ?? [],
  };
}

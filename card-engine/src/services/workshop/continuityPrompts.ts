import type { CuratedCharacter } from '../../types/curatedCard';
import type { Rank } from '../../types/card';

/**
 * Which facts from the art the lore has not reckoned with yet.
 *
 * This is the Muse's main job — catching drift between what the paintings
 * show and what the writing says — done locally, for free, and updating as
 * you type. The paid call is for ideas; this is for the thing that must not
 * be got wrong, and it should never have cost money or a button press.
 *
 * On a blank character it doubles as a starting palette: every fact the art
 * hands you, listed. That is why the panel is titled "not yet in the lore"
 * rather than "problems" — on a fresh page the same list is an invitation.
 *
 * Deliberately NOT part of loreProblems / the confirm gate. A director may
 * have excellent reasons to leave a fact unmentioned, and a gate that cannot
 * be satisfied by good judgement is a gate people learn to resent. This
 * informs; it never blocks.
 */

const RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

/**
 * The identity fields lore is expected to reckon with, most load-bearing
 * first. Scene fields (weather, lighting) are deliberately absent: they
 * describe a moment, not a person, and prompting about them would train
 * people to ignore the panel.
 *
 * `disabilityOrCondition` and `scars` lead because Bible §Rank continuity
 * turns on exactly those — they are the facts an advancing character is most
 * often quietly written out of.
 */
const WATCHED_FIELDS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'disabilityOrCondition', label: 'Condition' },
  { key: 'scars', label: 'Scars' },
  { key: 'age', label: 'Age' },
  { key: 'bodyType', label: 'Body' },
  { key: 'posture', label: 'Bearing' },
  { key: 'clothingConstruction', label: 'What they wear' },
  { key: 'hair', label: 'Hair' },
  { key: 'minorAccessories', label: 'Carried' },
];

/** Values that assert an absence — nothing to write about. */
const EMPTY_VALUE = /^\s*(none|none visible|no |unclear|n\/?a|unknown)\b/i;

/**
 * Words too common to prove a fact was addressed. "black" appearing in the
 * lore does not mean her braids did.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'with', 'over', 'under', 'from', 'that', 'this',
  'her', 'his', 'their', 'them', 'they', 'across', 'above', 'below', 'into',
  'left', 'right', 'front', 'back', 'side', 'full', 'half', 'some', 'more',
  'very', 'quite', 'rather', 'been', 'being', 'have', 'has', 'had',
  'presenting', 'visible', 'visibly', 'appears', 'apparent', 'tone', 'toned',
  'coloured', 'colored', 'colour', 'color', 'style', 'styled', 'looking',
]);

function significantTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/** Everything the director has written, as one lowercase haystack. */
function loreHaystack(character: CuratedCharacter): string {
  const parts = [
    character.coreLore ?? '',
    character.lore?.cardName ?? '',
    character.lore?.nameAndTitle ?? '',
    ...RANKS.map((r) => character.lore?.rankLore?.[r] ?? ''),
  ];
  return parts.join(' \n ').toLowerCase();
}

export interface ContinuityPrompt {
  /** The identity field key. */
  id: string;
  label: string;
  /** What the art shows. */
  value: string;
}

/**
 * Facts present in the identity sheet that no written word touches yet.
 *
 * Matching is generous on purpose — ANY significant word from the fact
 * appearing anywhere in the lore counts as addressed. A false "already
 * covered" costs nothing; a false "you forgot this" on a fact the director
 * handled in her own words would make the panel a nag, and she would stop
 * reading it.
 */
export function continuityPrompts(
  character: CuratedCharacter,
  limit = 6,
): ContinuityPrompt[] {
  const identity = (character.identity ?? {}) as unknown as Record<string, unknown>;
  const haystack = loreHaystack(character);
  const out: ContinuityPrompt[] = [];

  for (const field of WATCHED_FIELDS) {
    if (out.length >= limit) break;
    const raw = identity[field.key];
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!value || EMPTY_VALUE.test(value)) continue;

    const tokens = significantTokens(value);
    // A fact with no distinctive words cannot be checked for; leaving it out
    // beats prompting about something we could never mark as done.
    if (tokens.length === 0) continue;

    const addressed = tokens.some((t) => haystack.includes(t));
    if (!addressed) out.push({ id: field.key, label: field.label, value });
  }

  return out;
}

/** True when nothing has been written yet — the panel reads as a palette, not a warning. */
export function loreIsBlank(character: CuratedCharacter): boolean {
  return loreHaystack(character).trim().length === 0;
}

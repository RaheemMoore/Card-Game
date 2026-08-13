import type { CuratedCharacter } from '../../types/curatedCard';
import type { NameStructure } from '../../data/namingBible';
import { buildNamingBibleBlock } from '../naming/namingPrompt';
import { getRecentNames, formatRecentForPrompt } from '../nameHistory';
import { callAnthropicMessages } from '../anthropicClient';
import { identityLines, canonLines, draftLines, extractObject } from './loreAssist';

/**
 * Name candidates for a curated character.
 *
 * The Fantasy Character Naming Bible is emphatic that its example names show
 * STRUCTURE, RHYTHM and CULTURAL DIRECTION and must never be used as-is. So
 * the desk cannot simply deal a director a name off the list — a shuffler
 * would be handing her names the Bible forbids. What it can do is send the
 * same Bible block the forge sends, plus the things the forge never has: the
 * finished art's identity sheet and a written life. A curated character's
 * name should fit the person in the painting.
 *
 * Rank is pinned to FOUNDATION (Raheem, 2026-08-12). A curated card stores one
 * name pair, and that is the card a player receives and grows; feeding
 * Ascendant epithet guidance would produce "the Howl That Broke Winter" as a
 * starting name. `ascendantPreview` comes back in the same call so a director
 * can see whether a name has room to grow — it is shown and never stored.
 */

const MODEL = 'claude-haiku-4-5-20251001';

/** Matches claudeApi's non-retry tier, so the desk sees the forge's slice sizes. */
const SAMPLE_COUNT = 6;
const FULL_COUNT = 4;
const REGISTER_COUNT = 3;

export interface NameCandidate {
  /** Foundation-appropriate. Usually no epithet. */
  cardName: string;
  nameAndTitle: string;
  /** Where the name could travel by Ascendant. Display only — never saved. */
  ascendantPreview: string;
  /** One clause tied to a specific fact about her. */
  reason: string;
  register: string;
  structure: NameStructure | null;
}

const STRUCTURE_KEYS: readonly NameStructure[] = [
  'personal_only',
  'personal_family',
  'personal_clan',
  'personal_order_place',
  'personal_earned_byname',
  'personal_house',
  'manufactured_designation',
  'celestial_liturgical',
];

/**
 * Sibling names only. Collision avoidance needs nothing more than the names,
 * and their lore would triple the prompt for no gain — unlike the tiebreaker
 * questions, which need the substance.
 */
function siblingNameLines(siblings: readonly CuratedCharacter[]): string {
  const names = siblings
    .map((s) => s.lore?.cardName?.trim())
    .filter((n): n is string => Boolean(n));
  if (names.length === 0) return '(she is the first character in this archetype)';
  return names.map((n) => `  - ${n}`).join('\n');
}

export function buildNameCandidatePrompt(
  character: CuratedCharacter,
  siblings: readonly CuratedCharacter[],
  namingBlock: string,
): string {
  return [
    `You are naming ONE character for a fantasy card game. She already exists — three finished paintings and a written life. Your job is to find the name she has always had, not to invent a name and attach a person to it.`,
    '',
    'WHAT THE ART SHOWS (immutable — the name must fit this person\'s ancestry, age, bearing and condition):',
    identityLines(character),
    '',
    `${character.archetype.toUpperCase()} CANON:`,
    canonLines(character.archetype),
    '',
    'HER WRITTEN LIFE:',
    draftLines(character),
    namingBlock,
    'ALREADY TAKEN — other characters in this same archetype bank. A player sees these side by side, so a new name must not rhyme with, alliterate with, or share a first syllable or ending with any of them:',
    siblingNameLines(siblings),
    '',
    'Propose 6 candidates. Each must:',
    '  - be pronounceable, and fit the ancestry and era the art shows;',
    '  - draw on ONE of the cultural directions listed above and ONE of the listed name structures — say which, so the director can see the reasoning;',
    '  - be a FOUNDATION name. That is the card a player receives and grows from. At Foundation there is usually NO epithet at all — a personal name, or a personal name plus clan/family/order. Do not award a title here.',
    '  - be justified in one clause tied to a SPECIFIC fact above ("the burn on her forearm", "she left the pass and never named it") — never "sounds strong" or "evokes power".',
    '',
    'For each candidate also give ascendantPreview: where that same name could honestly travel by Ascendant IF her story earned it. This is shown to the director as a sanity check on whether the name has room to grow. It is NOT saved and must not influence the Foundation name.',
    '',
    'Return ONLY a JSON object, no prose around it, shaped:',
    '{"candidates":[{"cardName":"...","nameAndTitle":"...","ascendantPreview":"...","reason":"...","register":"...","structure":"personal_earned_byname"}]}',
  ].join('\n');
}

/**
 * Tolerant of a fence, strict afterwards — a candidate with no usable
 * cardName is dropped rather than rendered as an empty button.
 */
export function parseNameCandidates(raw: string): NameCandidate[] {
  const source = extractObject(raw) as { candidates?: unknown };
  if (!Array.isArray(source.candidates)) {
    throw new Error('The model returned no candidates array.');
  }
  const out: NameCandidate[] = [];
  for (const item of source.candidates) {
    if (typeof item !== 'object' || item === null) continue;
    const c = item as Record<string, unknown>;
    const cardName = typeof c.cardName === 'string' ? c.cardName.trim() : '';
    if (!cardName) continue;
    const nameAndTitle =
      typeof c.nameAndTitle === 'string' && c.nameAndTitle.trim()
        ? c.nameAndTitle.trim()
        : cardName;
    const structure = STRUCTURE_KEYS.includes(c.structure as NameStructure)
      ? (c.structure as NameStructure)
      : null;
    out.push({
      cardName,
      nameAndTitle,
      ascendantPreview: typeof c.ascendantPreview === 'string' ? c.ascendantPreview.trim() : '',
      reason: typeof c.reason === 'string' ? c.reason.trim() : '',
      register: typeof c.register === 'string' ? c.register.trim() : '',
      structure,
    });
  }
  return out;
}

export async function requestNameCandidates(
  character: CuratedCharacter,
  siblings: readonly CuratedCharacter[],
  offset: number,
): Promise<NameCandidate[]> {
  // Recent FORGE names are passed in so a desk name will not collide with one
  // a player just generated. Deliberately one-way: the desk never calls
  // recordName(). nameHistory is the forge pipeline's localStorage window, and
  // writing curated names into it would silently change forge behaviour for
  // whoever is sitting at this browser.
  const namingBlock = buildNamingBibleBlock({
    archetype: character.archetype,
    rank: 'Foundation',
    offset,
    sampleCount: SAMPLE_COUNT,
    fullCount: FULL_COUNT,
    registerCount: REGISTER_COUNT,
    recentNamesStr: formatRecentForPrompt(getRecentNames(), 15),
  });

  const response = await callAnthropicMessages({
    model: MODEL,
    max_tokens: 1400,
    temperature: 0.9,
    messages: [
      { role: 'user', content: buildNameCandidatePrompt(character, siblings, namingBlock) },
    ],
    gameAction: 'desk_name_candidates',
    cardId: character.id,
  });

  const text = response.content?.map((c) => c.text ?? '').join('') ?? '';
  return parseNameCandidates(text);
}

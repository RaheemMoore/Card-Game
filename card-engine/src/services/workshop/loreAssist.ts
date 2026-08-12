import type { ArchetypeName, Rank } from '../../types/card';
import { RANKS } from '../../types/card';
import type {
  CuratedCharacter,
  GeneratedQuestion,
} from '../../types/curatedCard';
import { ARCHETYPE_BIBLE } from '../../data/archetypeBible';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../../data/storyPillars';
import { callAnthropicMessages } from '../anthropicClient';

/**
 * The Lore Desk's two AI helpers.
 *
 * 1. The Muse — suggestions BESIDE the writing, never in it. Claude reads the
 *    identity sheet (what the art shows), the archetype's Bible chapter, and
 *    whatever Tori has written so far, and offers angles, phrases, and
 *    continuity flags. Nothing is ever inserted into a field programmatically;
 *    she copies what she likes. Fired by an explicit button — one call per
 *    click, never on a typing pause (cost, and it would race the autosave).
 *
 * 2. The Question Forge — bespoke selection questions drafted FROM the
 *    finished lore (Raheem, 2026-08-11). Claude proposes 3–5 questions in the
 *    Story Pillar voice; Tori edits, marks which options are true of this
 *    character, and approves or discards each one. Approved questions join the
 *    pool players will answer to be matched to the character bank.
 *
 * Pattern-matches readArt.ts: prompts and parsers are pure and tested; the
 * transport is callAnthropicMessages through the existing JWT-gated proxy.
 * The `desk_` gameAction prefix is role-gated server-side (lore director or
 * admin) in api/anthropic-messages.ts.
 */

const MODEL = 'claude-haiku-4-5-20251001';

// ---------------------------------------------------------------------------
// Shared context builders
// ---------------------------------------------------------------------------

function identityLines(character: CuratedCharacter): string {
  const entries = Object.entries(character.identity ?? {}).filter(
    ([, v]) => typeof v === 'string' && v.trim(),
  );
  if (entries.length === 0) return '(no identity sheet)';
  return entries
    .map(([k, v]) => `- ${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${String(v).trim()}`)
    .join('\n');
}

function canonLines(archetype: ArchetypeName): string {
  const chapter = ARCHETYPE_BIBLE[archetype];
  if (!chapter) return '(no chapter)';
  return [
    `- identity through: ${chapter.identityThrough}`,
    `- core fantasy: ${chapter.coreFantasy}`,
    `- Foundation means: ${chapter.rankEvolution.Foundation}`,
    `- Forged means: ${chapter.rankEvolution.Forged}`,
    `- Ascendant means: ${chapter.rankEvolution.Ascendant}`,
  ].join('\n');
}

function draftLines(character: CuratedCharacter): string {
  const lore = character.lore;
  const rank = (r: Rank) => {
    const text = lore?.rankLore?.[r]?.trim();
    return `${r}: ${text ? text : '(not written yet)'}`;
  };
  return [
    `Card name: ${lore?.cardName?.trim() || '(not written yet)'}`,
    `Name and title: ${lore?.nameAndTitle?.trim() || '(not written yet)'}`,
    `Premise: ${character.coreLore?.trim() || '(not written yet)'}`,
    rank('Foundation'),
    rank('Forged'),
    rank('Ascendant'),
  ].join('\n');
}

function lastSendBack(character: CuratedCharacter): string | null {
  const notes = character.reviewThread ?? [];
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    if (notes[i].kind === 'send_back') return notes[i].body;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The Muse
// ---------------------------------------------------------------------------

export type SuggestionKind = 'angle' | 'phrase' | 'continuity';

export interface LoreSuggestion {
  kind: SuggestionKind;
  text: string;
  /** The rank this is about, when it is about one specifically. */
  about: Rank | null;
}

export function buildSuggestionPrompt(character: CuratedCharacter): string {
  const sendBack = lastSendBack(character);
  return [
    `You are a writing companion for the lore director of a fantasy card game. She is writing the permanent lore for one ${character.archetype} character. You suggest; you NEVER write the lore for her.`,
    '',
    'WHAT THE ART SHOWS (the character\'s three images are the truth — the lore must agree with every line of this):',
    identityLines(character),
    '',
    `${character.archetype.toUpperCase()} CANON:`,
    canonLines(character.archetype),
    '',
    'HER DRAFT SO FAR:',
    draftLines(character),
    ...(sendBack ? ['', `THE REVIEWER SENT THIS BACK WITH: "${sendBack}"`] : []),
    '',
    'Offer 3 to 6 short suggestions. Each is one of:',
    '- "angle": a direction, tension, or story idea the draft has not tried — grounded in the identity sheet or canon.',
    '- "phrase": a striking fragment or image she might steal and rework. A phrase, not a paragraph.',
    '- "continuity": a place where the draft CONTRADICTS the identity sheet or the canon. Quote what disagrees. Only when there is a real contradiction.',
    '',
    'Ground every suggestion in what is actually in the sheet, the canon, or her draft. Never invent facts about the character the art does not show. Respect what she has written — build on it, do not replace it.',
    '',
    'Return ONLY a JSON object, no prose around it, shaped:',
    '{"suggestions":[{"kind":"angle|phrase|continuity","text":"...","about":"Foundation|Forged|Ascendant|null"}]}',
    '',
    '"about" is the rank the suggestion concerns, or null when it concerns the whole character.',
  ].join('\n');
}

/**
 * Tolerant of prose or a fence around the JSON, strict afterwards: unknown
 * kinds and non-string texts are dropped rather than rendered, and `about` is
 * only kept when it is a real rank.
 */
export function parseSuggestions(raw: string): LoreSuggestion[] {
  const source = extractObject(raw) as { suggestions?: unknown };
  if (!Array.isArray(source.suggestions)) {
    throw new Error('The model returned no suggestions array.');
  }
  const out: LoreSuggestion[] = [];
  for (const item of source.suggestions) {
    if (typeof item !== 'object' || item === null) continue;
    const { kind, text, about } = item as { kind?: unknown; text?: unknown; about?: unknown };
    if (kind !== 'angle' && kind !== 'phrase' && kind !== 'continuity') continue;
    if (typeof text !== 'string' || !text.trim()) continue;
    out.push({
      kind,
      text: text.trim(),
      about: about === 'Foundation' || about === 'Forged' || about === 'Ascendant' ? about : null,
    });
  }
  return out;
}

export async function requestLoreSuggestions(
  character: CuratedCharacter,
): Promise<LoreSuggestion[]> {
  const response = await callAnthropicMessages({
    model: MODEL,
    max_tokens: 1200,
    // Ideation, unlike readArt's describe-what-you-see task.
    temperature: 0.8,
    messages: [{ role: 'user', content: buildSuggestionPrompt(character) }],
    gameAction: 'desk_lore_suggestions',
    cardId: character.id,
  });
  const text = response.content?.map((c) => c.text ?? '').join('') ?? '';
  return parseSuggestions(text);
}

// ---------------------------------------------------------------------------
// The Question Forge
// ---------------------------------------------------------------------------

/** A drafted question before it gets ids — the parser's output. */
export interface DraftedQuestion {
  prompt: string;
  options: string[];
  /** Indexes into `options` the model believes are true of this character. */
  trueOfThisCharacter: number[];
}

/**
 * Two real Story Pillar questions with their options, as style examples. The
 * generated questions must read like the hand-authored bank — in-world,
 * second person, complete-sentence answers — or they will feel like a survey
 * bolted onto a ritual.
 */
function styleExamples(archetype: ArchetypeName): string {
  const questions = getQuestionsForArchetype(archetype).slice(0, 2);
  if (questions.length === 0) return '(none available)';
  return questions
    .map((q) => {
      const options = getOptionsForQuestion(archetype, q.id)
        .slice(0, 4)
        .map((o) => `   - ${o.text}`)
        .join('\n');
      return `Q: ${q.prompt}\n${options}`;
    })
    .join('\n\n');
}

export function buildQuestionPrompt(character: CuratedCharacter): string {
  return [
    `You are drafting SELECTION QUESTIONS for a fantasy card game. Players answer a short series of in-world questions, and their answers lead them to one permanent ${character.archetype} character from a curated bank. You are writing questions derived from ONE character's finished lore, below. The lore director will edit and approve them.`,
    '',
    'THE CHARACTER (what the art shows):',
    identityLines(character),
    '',
    `${character.archetype.toUpperCase()} CANON:`,
    canonLines(character.archetype),
    '',
    'THE FINISHED LORE:',
    draftLines(character),
    '',
    'STYLE — these are real questions from the game. Match this voice exactly: in-world, second person, evocative, with complete-sentence answers a player chooses between:',
    styleExamples(character.archetype),
    '',
    'Draft 3 to 5 questions. RULES:',
    '1. Each question grows out of something specific in THIS character\'s lore — a wound, a vow, a temptation, a way of seeing — but must read as a question about the PLAYER, never about the character. The player has never heard of this character.',
    '2. Each question has 4 or 5 answer options. One or two options are true of this character; the others are plausible answers a different kind of person would choose — real alternatives, not filler.',
    '3. Never name the character or quote the lore directly. The lore is the soil, not the text.',
    '4. No question may be answerable from the art alone, and none may mention cards, ranks, or game mechanics.',
    '',
    'Return ONLY a JSON object, no prose around it, shaped:',
    '{"questions":[{"prompt":"...","options":["...","..."],"trueOfThisCharacter":[0]}]}',
    '',
    '"trueOfThisCharacter" lists the zero-based indexes of the options that are true of this character.',
  ].join('\n');
}

/**
 * Parse the model's drafts into GeneratedQuestions with real ids. Options that
 * are not non-empty strings are dropped; a question with fewer than 3
 * surviving options is dropped whole; claimed indexes outside the surviving
 * list are dropped. `startIndex` keeps ids unique across re-generations.
 */
export function parseGeneratedQuestions(
  raw: string,
  characterId: string,
  startIndex: number,
  now: string,
): Array<{ question: GeneratedQuestion; trueOptionIds: string[] }> {
  const source = extractObject(raw) as { questions?: unknown };
  if (!Array.isArray(source.questions)) {
    throw new Error('The model returned no questions array.');
  }

  const out: Array<{ question: GeneratedQuestion; trueOptionIds: string[] }> = [];
  let index = startIndex;

  for (const item of source.questions) {
    if (typeof item !== 'object' || item === null) continue;
    const { prompt, options, trueOfThisCharacter } = item as {
      prompt?: unknown;
      options?: unknown;
      trueOfThisCharacter?: unknown;
    };
    if (typeof prompt !== 'string' || !prompt.trim()) continue;
    if (!Array.isArray(options)) continue;

    const keptTexts: string[] = [];
    const keptOriginalIndexes: number[] = [];
    options.forEach((o, i) => {
      if (typeof o === 'string' && o.trim()) {
        keptTexts.push(o.trim());
        keptOriginalIndexes.push(i);
      }
    });
    if (keptTexts.length < 3) continue;

    const questionId = `gq_${characterId}_${index}`;
    const question: GeneratedQuestion = {
      id: questionId,
      prompt: prompt.trim(),
      options: keptTexts.map((text, i) => ({ id: `${questionId}_a${i}`, text })),
      status: 'draft',
      generatedAt: now,
    };

    const claimed = Array.isArray(trueOfThisCharacter) ? trueOfThisCharacter : [];
    const trueOptionIds = claimed
      .map((n) => (typeof n === 'number' ? keptOriginalIndexes.indexOf(n) : -1))
      .filter((i) => i >= 0)
      .map((i) => question.options[i].id);

    out.push({ question, trueOptionIds });
    index += 1;
  }
  return out;
}

export async function requestGeneratedQuestions(
  character: CuratedCharacter,
): Promise<Array<{ question: GeneratedQuestion; trueOptionIds: string[] }>> {
  const response = await callAnthropicMessages({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.8,
    messages: [{ role: 'user', content: buildQuestionPrompt(character) }],
    gameAction: 'desk_generate_questions',
    cardId: character.id,
  });
  const text = response.content?.map((c) => c.text ?? '').join('') ?? '';
  return parseGeneratedQuestions(
    text,
    character.id,
    nextQuestionIndex(character),
    new Date().toISOString(),
  );
}

/**
 * Max existing suffix + 1, not array length — a hard-deleted question must
 * never free its id for reuse, because an old binding or review note may still
 * name it.
 */
export function nextQuestionIndex(character: CuratedCharacter): number {
  let max = -1;
  for (const q of character.generatedQuestions ?? []) {
    const n = Number(q.id.slice(q.id.lastIndexOf('_') + 1));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}

// ---------------------------------------------------------------------------

/** Same tolerant extraction as readArt.parseReading. */
function extractObject(raw: string): object {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('The model did not return a readable JSON object.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new Error('The model returned malformed JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('The model returned something that is not an object.');
  }
  return parsed;
}

// RANKS is imported for consumers that want to iterate suggestions by rank.
export { RANKS };

import type { ArchetypeName, Rank } from '../../types/card';
import type { HiddenFate } from '../../types/bible';
import { callAnthropicMessages, type AnthropicContentBlock } from '../anthropicClient';

/**
 * Read a character's three rank images and describe what is in them.
 *
 * **This inverts the pipeline the game was built on, and that is the point.**
 * Until now identity was text a model invented and the art tried to obey —
 * which is why rank continuity needed a locked-field list, a preservation
 * function, and a Bible clause to defend it. Here the art is the truth and the
 * sheet describes it. All three ranks are in hand at once, so continuity is not
 * enforced, it is simply observed.
 *
 * It is also what makes the lore director's job possible: Tori receives a
 * factual description of the character she is writing, not a guess.
 *
 * The model is told to describe, never to invent, and to say "unclear" where
 * the images do not show something. A confident wrong answer here is worse than
 * an admitted gap, because a human accepts these fields field by field and an
 * invented detail reads exactly like an observed one.
 */

/** The visual fields of HiddenFate — the ones an image can actually answer. */
export const READABLE_FIELDS = [
  'age',
  'sex',
  'bodyType',
  'skinTone',
  'facialStructure',
  'hair',
  'disabilityOrCondition',
  'posture',
  'scars',
  'clothingConstruction',
  'minorAccessories',
  'weather',
  'lighting',
  'environmentDetails',
] as const;

export type ReadableField = (typeof READABLE_FIELDS)[number];

export type Confidence = 'high' | 'medium' | 'low';

export interface ArtReading {
  fields: Partial<Record<ReadableField, string>>;
  confidence: Partial<Record<ReadableField, Confidence>>;
  /** Anything the model noticed that no field covers. Shown, never auto-applied. */
  notes?: string;
}

export interface RankImage {
  rank: Rank;
  /** A public `curated-art` URL, or a data URL for something not yet uploaded. */
  url: string;
}

const FIELD_GUIDE: Record<ReadableField, string> = {
  age: 'Apparent age band — child, young adult, prime, middle-aged, elderly, or ageless.',
  sex: 'How the figure presents. "unclear" is a legitimate answer.',
  bodyType: 'Height, frame, mass and musculature as actually drawn. Be plain and accurate; do not flatter.',
  skinTone: 'Depth and undertone. Describe darker skin with the same specificity as lighter skin.',
  facialStructure: 'Face shape, jaw, brow, nose, notable features.',
  hair: 'Texture, length, style, colour, and how it sits under any headwear.',
  disabilityOrCondition: 'Any prosthetic, missing limb, blindness, or physical condition VISIBLE in the art. "none visible" if there is none — never invent one, and never omit one that is there.',
  scars: 'Visible scars, brands, or markings, and where they are.',
  posture: 'How they carry themselves — stance, bearing, weight.',
  clothingConstruction: 'Garment layers, materials, armour, fastenings, wear state.',
  minorAccessories: 'Small carried or worn objects. Two or three at most.',
  weather: 'Weather in the scene, if any is shown.',
  lighting: 'Light source, direction, and colour.',
  environmentDetails: 'Where they are standing and what is behind them.',
};

/**
 * Haiku 4.5 — the model the rest of this pipeline already uses and the one the
 * cost catalog is priced against. It has vision and this is a describe-what-you
 * -see task rather than a reasoning one.
 *
 * If reads come back thin on the fine detail (fastenings, small accessories,
 * scar placement), this is the single line to change — the prompt and parsing
 * are model-agnostic.
 */
const MODEL = 'claude-haiku-4-5-20251001';

function buildPrompt(archetype: ArchetypeName): string {
  const fieldLines = READABLE_FIELDS.map((f) => `- ${f}: ${FIELD_GUIDE[f]}`).join('\n');
  return [
    `You are looking at three images of ONE ${archetype} character, in order: Foundation (their beginning), Forged (their middle), and Ascendant (their peak).`,
    '',
    'They are the same person at three points in their life. Describe the person as they actually appear.',
    '',
    'RULES:',
    '1. Describe only what you can SEE. Never infer backstory, motivation, or history.',
    '2. If the images do not show something, the value is exactly "unclear". An admitted gap is useful; a confident guess is not, because a human will accept these values one by one and cannot tell an invention from an observation.',
    '3. Where the three images disagree on something that should not change — build, skin tone, a scar — describe what the MAJORITY show and say so in notes.',
    '4. Describe age, body and skin factually and respectfully. Do not slim, youthen, or idealise what is drawn, and do not editorialise about it.',
    '5. A visible disability or prosthetic must be reported. Do not omit it, and do not add one that is not there.',
    '',
    'FIELDS:',
    fieldLines,
    '',
    'Return ONLY a JSON object, no prose around it, shaped:',
    '{"fields":{"<field>":"<description>"},"confidence":{"<field>":"high|medium|low"},"notes":"<anything the fields do not cover, or empty>"}',
    '',
    'Confidence is how clearly the IMAGES show it, not how sure you are of your wording. Use "low" whenever you wrote "unclear".',
  ].join('\n');
}

export async function proposeIdentityFromArt(input: {
  archetype: ArchetypeName;
  images: readonly RankImage[];
}): Promise<ArtReading> {
  if (input.images.length === 0) {
    throw new Error('There are no images to read yet.');
  }

  const content: AnthropicContentBlock[] = [];
  for (const image of input.images) {
    content.push({ type: 'text', text: `${image.rank}:` });
    content.push(toImageBlock(image.url));
  }
  content.push({ type: 'text', text: buildPrompt(input.archetype) });

  const response = await callAnthropicMessages({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content }],
    gameAction: 'workshop_read_art',
  });

  const text = response.content?.map((c) => c.text ?? '').join('') ?? '';
  return parseReading(text);
}

/**
 * Public bucket URLs go as `url` blocks — no reason to pull megabytes into the
 * browser and base64 them just to send them back out. A data URL (art that has
 * not been uploaded yet) is split into the base64 form the API expects.
 */
function toImageBlock(url: string): AnthropicContentBlock {
  const dataUrl = /^data:([^;,]+);base64,(.+)$/.exec(url);
  if (dataUrl) {
    return { type: 'image', source: { type: 'base64', media_type: dataUrl[1], data: dataUrl[2] } };
  }
  return { type: 'image', source: { type: 'url', url } };
}

/**
 * Tolerant of the model wrapping JSON in prose or a fence, strict about what it
 * accepts afterwards: unknown keys are dropped rather than carried into a
 * HiddenFate, and a non-string value is ignored instead of being stringified
 * into something that reads like a description.
 */
export function parseReading(raw: string): ArtReading {
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

  const source = parsed as { fields?: unknown; confidence?: unknown; notes?: unknown };
  const fields: Partial<Record<ReadableField, string>> = {};
  const confidence: Partial<Record<ReadableField, Confidence>> = {};

  const rawFields = (source.fields ?? {}) as Record<string, unknown>;
  const rawConfidence = (source.confidence ?? {}) as Record<string, unknown>;

  for (const field of READABLE_FIELDS) {
    const value = rawFields[field];
    if (typeof value === 'string' && value.trim()) fields[field] = value.trim();
    const conf = rawConfidence[field];
    if (conf === 'high' || conf === 'medium' || conf === 'low') confidence[field] = conf;
    // An "unclear" value is low confidence whatever the model claimed — the two
    // disagreeing is exactly the case a reviewer must not have to notice.
    if (fields[field]?.toLowerCase().startsWith('unclear')) confidence[field] = 'low';
  }

  return {
    fields,
    confidence,
    notes: typeof source.notes === 'string' && source.notes.trim() ? source.notes.trim() : undefined,
  };
}

/** Merge accepted values onto an existing sheet. Only accepted keys are written. */
export function applyAcceptedFields(
  identity: HiddenFate,
  accepted: Partial<Record<ReadableField, string>>,
): HiddenFate {
  const next: HiddenFate = { ...identity };
  for (const [field, value] of Object.entries(accepted)) {
    if (value && value.trim()) {
      (next as unknown as Record<string, string>)[field] = value.trim();
    }
  }
  return next;
}

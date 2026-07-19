import type { ArchetypeName, CardStats, Rank } from '../types/card';
import type {
  ElementSelection,
  HiddenFate,
  StoryPillarAnswers,
} from '../types/bible';
import type { AbilityCandidate, AbilitySlotType } from '../types/abilities';
import { getBibleChapter } from '../data/archetypeBible';
import { getQuestionsForArchetype } from '../data/storyPillars';
import { assemblePortraitPrompt } from './promptAssembler';
import {
  deriveStatRanks,
  getDominantStat,
  getOverallRank,
  getStatNames,
} from '../data/powerSystem';
import { emptyHiddenFate, parseHiddenFate, preserveIdentityAcrossRanks } from './hiddenFate';
import { buildAbilityPromptFragment, parseAbilityCandidate } from './abilities/promptFragment';

/**
 * Bible-driven card text + portrait prompt generator.
 *
 * Follows Bible §Claude Generation Pipeline (fourteen steps):
 *   1. Global Rules
 *   2. Archetype chapter
 *   3. Story Pillar answers (immutable)
 *   4. Element + bond
 *   5. Classify tensions
 *   6. Preserve valid facts
 *   7. Emotional throughline
 *   8. Coherent summary
 *   9. Hidden Fate
 *   10. Visual identity summary
 *   11. Validate archetype recognition + rank continuity
 *   12. Remove details that do not affect the image
 *   13. Compress Leonardo prompt below 1500 chars
 *   14. Preserve structured facts for future rank evolution
 *
 * Rank continuity is inviolable: no automatic aging, no automatic muscle,
 * no automatic disability erasure, no automatic beauty escalation.
 */

const RANK_MEANINGS: Record<Rank, string> = {
  Foundation:
    'The beginning — the character carries their identity but has not yet been fully tested by it.',
  Forged:
    'Changed by trials — the character has integrated the consequences of their choices without abandoning who they are.',
  Ascendant:
    'A living reference point — the character\'s completed choices reshape what their tradition means going forward. NOT apotheosis. NOT a mythic dissolution of their body or identity.',
};

const PORTRAIT_PROMPT_MAX = 1300;
const NEGATIVE_PROMPT_MAX = 400;

const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  'gore', 'graphic violence', 'severed body parts', 'exposed wounds',
  'blood spatter', 'nudity', 'suggestive',
  // Bible §Rank continuity forbids automatic escalation across ranks —
  // added universally to steer Leonardo away from these defaults.
  'younger than previous rank', 'thinner than previous rank',
  'more muscular than previous rank', 'healthier than previous rank',
  'more conventionally attractive than previous rank',
  'disability removed', 'scars erased',
  // Bible §14 universal Avoid signals across archetypes.
  'generic fantasy stereotype', 'costume-carrying stereotype',
].join(', ');

interface GeneratedText {
  cardName: string;
  nameAndTitle: string;
  lore: string;
  /** Compressed Leonardo prompt, guaranteed <= PORTRAIT_PROMPT_MAX chars. */
  portraitPrompt: string;
  negativePrompt: string;
  /** Bible §Hidden Fate — what Claude inferred to complete the picture. */
  hiddenFate: HiddenFate;
  /**
   * Ability candidate for the requested slot. Present when abilitySlotToFill
   * is provided. Undefined when Claude omits or malforms the field.
   */
  abilityCandidate?: AbilityCandidate;
}

// ============================================================================
// Prompt assembly
// ============================================================================

function formatAnswers(archetype: ArchetypeName, answers: StoryPillarAnswers): string {
  const questions = getQuestionsForArchetype(archetype);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return answers.answers
    .map((a) => {
      const q = questionById.get(a.questionId);
      return q ? `Q: ${q.prompt}\nA: ${a.answer}` : `A: ${a.answer}`;
    })
    .join('\n');
}

function formatStats(stats: CardStats, archetype: ArchetypeName): string {
  const ranks = deriveStatRanks(stats);
  return getStatNames(archetype)
    .map((name) => {
      const entry = stats[name]!;
      return `${name} ${entry.value} (${ranks[name]}, bias ${entry.bias})`;
    })
    .join(', ');
}

function formatBibleChapter(archetype: ArchetypeName): string {
  const c = getBibleChapter(archetype);
  return [
    `IDENTITY THROUGH: ${c.identityThrough}`,
    `CORE FANTASY: ${c.coreFantasy}`,
    `CORE FANTASY PROMISE: ${c.coreFantasyPromise.promise}`,
    `EMOTIONAL PILLARS: ${c.coreFantasyPromise.emotionalPillars.join(', ')}`,
    `ORIGINS: ${c.origins}`,
    `CULTURE AND DAILY LIFE: ${c.cultureAndDailyLife}`,
    `VIRTUES: ${c.beliefs.virtues.join(', ')}`,
    `TABOOS: ${c.beliefs.taboos.join(', ')}`,
    `FEARS: ${c.beliefs.fears.join(', ')}`,
    `INTERNAL DIVERSITY: ${c.internalDiversity.groups.join('; ')}`,
    `VISUAL DNA (recognition cues): ${c.visualDNA.recognitionCues}`,
    `VISUAL DNA (AVOID): ${c.visualDNA.avoid}`,
    `MATERIALS: ${c.symbolAndMaterial.materials}`,
    `SYMBOLS: ${c.symbolAndMaterial.symbols}`,
    `GENERATION PRIORITIES: ${c.claudeGuidance.generationPriorities.join(', ')}`,
    `AVOID (§14): ${c.claudeGuidance.avoid.join(', ')}`,
    `RECOGNITION CHECKLIST: ${c.claudeGuidance.recognitionChecklist.join(' | ')}`,
  ].join('\n');
}

function buildPrompt(input: {
  archetype: ArchetypeName;
  stats: CardStats;
  answers: StoryPillarAnswers;
  element: ElementSelection;
  overallRank: Rank;
  existingName?: string;
  existingHiddenFate?: HiddenFate;
  abilitySlotToFill?: AbilitySlotType;
}): string {
  const { archetype, stats, answers, element, overallRank, existingName, existingHiddenFate, abilitySlotToFill } = input;
  const c = getBibleChapter(archetype);
  const isEvolution = Boolean(existingName);
  const rankProgression = c.rankEvolution[overallRank];
  const continuityNote = c.rankEvolution.continuityNote ?? '';

  return `You are the generation authority for a fantasy card game. You are following the Character Generation Bible, which is the canonical source of truth. Ignore any prior stylistic conventions from other fantasy games or previous versions of this game.

=== BIBLE GLOBAL RULES (inviolable) ===
- Every archetype supports the full diversity of real bodies: fat, heavyset, soft-bodied, average-built, muscular, lean, wiry, tall and narrow, short and broad, gaunt, sickly, elderly, disabled, scarred, and visibly weathered. Archetype identity comes from culture, history, beliefs, role, equipment, and lived history — NEVER from one required heroic physique.
- Rank progression preserves sex, age, body type, ancestry, disability, physical condition, defining scars, and core identity. Advancement must NOT automatically make a character younger, thinner, more muscular, healthier, less disabled, or more conventionally attractive.
- Player-selected Story Pillar answers are IMMUTABLE generation facts. You may connect and interpret them, but must not ignore, replace, soften, or contradict them.
- Prestige roles (Alpha, Grandmaster, Archdruid, Clan Chief, Blood Regent, and equivalents) emerge from narrative — you do NOT invent one uninvited. If none is warranted, leave the epithet in the range of ordinary earned titles.
- Element rarity affects DISCOVERY FREQUENCY, not power. Do not treat the Rare bucket as "stronger" — it is less common.
- Hidden Fate details you infer must REINFORCE the player's story, not compete with it.

=== ARCHETYPE CHAPTER (${archetype}) ===
${formatBibleChapter(archetype)}

=== RANK ===
Overall rank: ${overallRank}
${RANK_MEANINGS[overallRank]}
Rank progression for this archetype: ${rankProgression}
${continuityNote ? `Continuity note: ${continuityNote}` : ''}

=== STATS ===
${formatStats(stats, archetype)}
Dominant stat: ${getDominantStat(stats) ?? 'None (tied)'}

=== STORY PILLAR ANSWERS (immutable) ===
${formatAnswers(archetype, answers)}

=== ELEMENT + BOND ===
Element: ${element.element}
Compatibility bucket: ${element.compatibility}
Bond: "${element.bond}"
The element and bond must affect biography, environment, materials, equipment, posture, visible effects, and ability flavor. Bond guidance: interpret the bond literally — an "inheritance" element is inherited; a "prison" element restricts; a "teacher" element guides; an "ally" element cooperates.

${existingHiddenFate ? `=== LOCKED HIDDEN FATE (Rank continuity — preserve verbatim) ===
This character has already been generated at least once. The following identity anchors MUST NOT change. Weave them into the new portraitPrompt verbatim.
- age: ${existingHiddenFate.age}
- sex: ${existingHiddenFate.sex}
- bodyType: ${existingHiddenFate.bodyType}
- skinTone: ${existingHiddenFate.skinTone}
- facialStructure: ${existingHiddenFate.facialStructure}
- hair: ${existingHiddenFate.hair}
- disabilityOrCondition: ${existingHiddenFate.disabilityOrCondition}
- scars: ${existingHiddenFate.scars}

The character may look older/wearier in language cues, but the underlying body and identity are the same person. If the previous character was heavyset, they remain heavyset. If they had a prosthetic, they still have it. If they were elderly, they are older still — NOT youthened.
` : ''}

${existingName ? `=== EVOLUTION CONTEXT ===
This character's name is "${existingName}". Do NOT change the cardName — return it verbatim. Generate a new title/epithet and new lore that reflect the ${overallRank} rank per Bible §9. If the archetype's approved prestige roles are earned (see approved list in code), you MAY use one for the epithet — but only if the story pillar answers plainly support it.
` : ''}

=== YOUR TASK ===
Follow the Bible generation pipeline internally:
  a) Read the archetype chapter, the Story Pillar answers, and the element + bond.
  b) Classify tensions between answers — compatible, productive tension, or hard contradiction. Preserve productive tension; only flag factual impossibilities.
  c) Identify the strongest emotional throughline from the Emotional Pillars.
  d) Generate a coherent character summary (do not output — internal use).
  e) Infer Hidden Fate for age, sex, bodyType, skinTone, facialStructure, hair, disabilityOrCondition, posture, scars, weather, lighting, clothingConstruction, minorAccessories, environmentDetails. These MUST reinforce the answers.
  f) Compose the visual summary, then compress it into a Leonardo prompt below ${PORTRAIT_PROMPT_MAX} characters.

Return ONLY a JSON object with these fields:

{
  "cardName": ${existingName ? `MUST be exactly "${existingName}" — do not change.` : 'a 1-3 word name that fits the archetype\'s culture and the answers'},
  "nameAndTitle": "full name with epithet, e.g. \\"Kaelen, Keeper of Names\\". Ordinary earned title — no prestige role unless the answers plainly earn it.",
  "lore": "2-3 sentences of flavor text. Weave the Story Pillar answers into the mood WITHOUT quoting them literally. Reflect the emotional throughline you identified. ${isEvolution ? `Reference the character's growth into ${overallRank} — same person, deepened by trials.` : ''}",
  "portraitPrompt": "single dense comma-separated Leonardo prompt under ${PORTRAIT_PROMPT_MAX} characters. Structure: [style anchor: 'fantasy character portrait, painterly digital art, chest-up, single character centered, detailed face, rich textures'], [IDENTITY BLOCK — verbatim age/sex/bodyType/skinTone/facialStructure/hair/disabilityOrCondition/scars from Hidden Fate], [archetype-specific recognition cues from the Visual DNA field above], [element woven physically — visible in equipment/environment/posture, NEVER replacing the character], [Story-Pillar-derived materials, symbols, and specific objects], [weather + lighting + environmentDetails from Hidden Fate], [rank-appropriate carriage per the archetype chapter — NOT rank-appropriate spectacle]. Do NOT add magical aura escalation, do NOT add younger/thinner/more-muscular language, do NOT contradict any locked identity above.",
  "negativePrompt": "starts with \\"${BASE_NEGATIVE}\\" then add archetype-specific §14 Avoid items and any anti-continuity terms that fit this specific character. Comma-separated, under ${NEGATIVE_PROMPT_MAX} characters.",
  "hiddenFate": {
    "age": "e.g. 'early 60s' — inferred from the answers, LOCKED after this call",
    "sex": "male / female / nonbinary / androgynous — respect the answers where relevant",
    "bodyType": "specific — do NOT default to 'lean and wiry' or 'athletic'; roll for real variety per Bible diversity mandate",
    "skinTone": "specific, from any real-world human descent",
    "facialStructure": "specific",
    "hair": "specific",
    "disabilityOrCondition": "if applicable, name it; empty string if not — but Bible diversity mandate says roll for it more than you would by default",
    "posture": "how they hold themselves — reflects role and answers",
    "scars": "specific if any; empty string if none",
    "weather": "reinforces the answers",
    "lighting": "reinforces the answers",
    "clothingConstruction": "materials + repair state per §8",
    "minorAccessories": "small tokens that reference specific answers",
    "environmentDetails": "reinforces the answers"
  }${abilitySlotToFill ? `,
  "abilityCandidate": { see ABILITY GENERATION block below }` : ''}
}

${abilitySlotToFill ? buildAbilityPromptFragment({ archetype, stats, rank: overallRank, slotType: abilitySlotToFill }) : ''}

Respond with ONLY valid JSON, no markdown, no explanation. Ensure portraitPrompt is under ${PORTRAIT_PROMPT_MAX} chars — hard cap from the image API.`;
}

// ============================================================================
// Public entry point
// ============================================================================

export interface GenerateCardTextInput {
  archetype: ArchetypeName;
  stats: CardStats;
  answers: StoryPillarAnswers;
  element: ElementSelection;
  /** Provided on tier-up / regeneration — enforces Bible §Rank continuity. */
  existingHiddenFate?: HiddenFate;
  /** Provided on tier-up — locks the card name. */
  existingName?: string;
  /** Foundation forge = 'core'; Forged tier-up = 'signature'; Ascendant tier-up = 'ultimate'. */
  abilitySlotToFill?: AbilitySlotType;
}

export async function generateCardText(input: GenerateCardTextInput): Promise<GeneratedText> {
  const overallRank = getOverallRank(input.stats);

  const prompt = buildPrompt({
    archetype: input.archetype,
    stats: input.stats,
    answers: input.answers,
    element: input.element,
    overallRank,
    existingName: input.existingName,
    existingHiddenFate: input.existingHiddenFate,
    abilitySlotToFill: input.abilitySlotToFill,
  });

  try {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn('No Anthropic API set — using fallback generator');
      return generateFallbackText(input, overallRank);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        temperature: 1,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const raw = data.content[0].text;
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as Partial<GeneratedText>;

    if (!parsed.cardName || !parsed.nameAndTitle || !parsed.lore) {
      throw new Error('Incomplete response — missing lore fields');
    }

    const composed = composePortraitFallback(input, overallRank);
    const portraitPrompt = truncateToLimit(parsed.portraitPrompt ?? composed.prompt, PORTRAIT_PROMPT_MAX);
    const negativePrompt = truncateToLimit(parsed.negativePrompt ?? composed.negativePrompt, NEGATIVE_PROMPT_MAX);

    // Hidden Fate: parse what Claude returned, then enforce Bible §Rank
    // continuity — if the caller passed an existingHiddenFate, locked
    // fields must survive verbatim.
    let hiddenFate = parseHiddenFate(parsed.hiddenFate);
    if (input.existingHiddenFate) {
      hiddenFate = preserveIdentityAcrossRanks(input.existingHiddenFate, hiddenFate);
    }

    const abilityCandidate = input.abilitySlotToFill
      ? parseAbilityCandidate((parsed as unknown as { abilityCandidate?: unknown }).abilityCandidate)
      : undefined;

    return {
      cardName: parsed.cardName,
      nameAndTitle: parsed.nameAndTitle,
      lore: parsed.lore,
      portraitPrompt,
      negativePrompt,
      hiddenFate,
      abilityCandidate,
    };
  } catch (err) {
    console.error('Claude API error, using fallback:', err);
    return generateFallbackText(input, overallRank);
  }
}

// ============================================================================
// Fallbacks
// ============================================================================

function composePortraitFallback(input: GenerateCardTextInput, rank: Rank): { prompt: string; negativePrompt: string } {
  const anchor = input.existingHiddenFate
    ? `${input.existingHiddenFate.sex}, ${input.existingHiddenFate.skinTone}, ${input.existingHiddenFate.bodyType}, ${input.existingHiddenFate.hair}, ${input.existingHiddenFate.disabilityOrCondition ? `${input.existingHiddenFate.disabilityOrCondition}, ` : ''}${input.existingHiddenFate.scars ? `${input.existingHiddenFate.scars}, ` : ''}same character across ranks, identical facial structure and skin tone`
    : '';
  const { prompt, negativePrompt } = assemblePortraitPrompt({
    archetype: input.archetype,
    rank,
    stats: input.stats,
    element: input.element,
    answers: input.answers,
  });
  const finalPrompt = anchor ? `${prompt}. IDENTITY (must be preserved): ${anchor}` : prompt;
  return {
    prompt: truncateToLimit(finalPrompt, PORTRAIT_PROMPT_MAX),
    negativePrompt: truncateToLimit(negativePrompt, NEGATIVE_PROMPT_MAX),
  };
}

function generateFallbackText(input: GenerateCardTextInput, rank: Rank): GeneratedText {
  const c = getBibleChapter(input.archetype);
  const { prompt: portraitPrompt, negativePrompt } = composePortraitFallback(input, rank);
  const hiddenFate = input.existingHiddenFate ?? emptyHiddenFate();
  const name = input.existingName ?? `Unnamed ${input.archetype}`;
  return {
    cardName: name,
    nameAndTitle: `${name}, of the ${c.internalDiversity.groups[0] ?? 'unnamed order'}`,
    lore: `A ${rank.toLowerCase()} ${input.archetype.toLowerCase()} whose story is still being written.`,
    portraitPrompt,
    negativePrompt,
    hiddenFate,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function truncateToLimit(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const window = text.slice(0, limit);
  const lastComma = window.lastIndexOf(',');
  if (lastComma > limit * 0.6) return window.slice(0, lastComma);
  return window;
}

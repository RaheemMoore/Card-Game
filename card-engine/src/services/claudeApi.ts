import type { ArchetypeName, CardStats, Rank } from '../types/card';
import type {
  ElementSelection,
  HiddenFate,
  StoryPillarAnswers,
} from '../types/bible';
import type { AbilityCandidate, AbilitySlotType, CardAbilityReference } from '../types/abilities';
import { getBibleChapter } from '../data/archetypeBible';
import { getQuestionsForArchetype } from '../data/storyPillars';
import { getDefinition, getCurrentVersion, getFamily } from './abilities/registry';
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
    'The beginning — the character carries their identity but has not yet been fully tested by it. Element and power hint subtly (visible but restrained).',
  Forged:
    'Changed by trials — the character has integrated the consequences of their choices without abandoning who they are. Element and abilities are visibly active around them; combat readiness is legible in stance and equipment.',
  Ascendant:
    'A living reference point whose completed choices reshape what their tradition means. Bible §Rank continuity: body, age, ancestry, disability, and scars are preserved verbatim from prior ranks. Bible §Visual quality rule: rank glow, elemental effects, and ability spectacle SHOULD be fully manifested and can be removed to test recognition — meaning the character MUST show visible mastery of their element and their signature abilities (weapon aura, elemental effects around body and environment, summoned allies or spectral constructs where lore fits, ultimate stance). NOT mythic dissolution — the SAME PERSON channeling earned power at full manifestation.',
};

/**
 * Rank-progressive elemental spectacle guidance. Bible §Visual quality rule
 * expects elements + rank effects + ability spectacle to be removable while
 * the character remains recognizable — meaning these effects SHOULD be there.
 * The character underneath stays continuous; the visible power grows.
 */
const ELEMENT_SPECTACLE_BY_RANK: Record<Rank, string> = {
  Foundation:
    'Subtle: the element hints in a small object, garment detail, environmental cue, or a faint mark. Not overwhelming — this is a character who carries the potential, not yet the display.',
  Forged:
    'Active: the element is visibly channeled — flame at the fingertips, frost across a blade, storm circling the shoulders, spirit-light through the eyes, tech-glow along armor seams. Ability signatures show in the pose (a raised weapon crackling, a casting stance, a companion nearby).',
  Ascendant:
    'Fully manifested: the element is a visible presence in the composition — aura around the body, environmental effects (weather, ground scarring, light bending), ability spectacle (weapon wreathed in power, elemental constructs, summoned allies, ultimate-move stance mid-cast). This is a fantasy card portrait at climactic power — WHILE the same person from Foundation is unmistakably underneath: same body, same age, same ancestry, same disability, same scars.',
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

/**
 * Formats a card's existing ability refs into a prompt block so Claude can
 * weave each ability's visual signature into the portrait. Returns empty
 * string when the card has no existing abilities (Foundation forge).
 */
function formatAbilityContext(refs?: CardAbilityReference[]): string {
  if (!refs || refs.length === 0) return '';
  const lines: string[] = [];
  for (const ref of refs) {
    const def = getDefinition(ref.abilityId);
    if (!def) continue;
    const version = getCurrentVersion(ref.abilityId);
    const familyNames = def.familyIds.map((id) => getFamily(id)?.name ?? id).join(' + ');
    const effectSummary = version?.effects
      .map((e) => e.type.replace(/_/g, ' '))
      .join(', ') ?? '';
    lines.push(
      `- ${def.displayName} (${ref.slotType}, families: ${familyNames}${effectSummary ? `; effects: ${effectSummary}` : ''}) — ${def.descriptionShort}`,
    );
  }
  return lines.join('\n');
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
  existingAbilityRefs?: CardAbilityReference[];
}): string {
  const { archetype, stats, answers, element, overallRank, existingName, existingHiddenFate, abilitySlotToFill, existingAbilityRefs } = input;
  const c = getBibleChapter(archetype);
  const isEvolution = Boolean(existingName);
  const rankProgression = c.rankEvolution[overallRank];
  const continuityNote = c.rankEvolution.continuityNote ?? '';
  const abilityContext = formatAbilityContext(existingAbilityRefs);
  const elementSpectacle = ELEMENT_SPECTACLE_BY_RANK[overallRank];

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

=== ELEMENT SPECTACLE (${overallRank}) ===
${elementSpectacle}
This game is a fantasy card BATTLE game — elements ALWAYS show visually on the portrait. The rank determines intensity. The player picked "${element.element}" and their bond is "${element.bond}" — both must be visible in the composition.

${abilityContext ? `=== EXISTING ABILITIES ON THIS CARD (weave their visual signature into the portrait) ===
${abilityContext}
Weave each ability's visual signature into the portraitPrompt as concrete objects, effects, or pose. If the ability is "Ember Cleave" (fire + martial), the sword or weapon should be visibly wreathed in fire in the pose. If the ability is "Soul Drain" (necromancy), spectral hands, drifting spirits, or drawn-out lifelight should be visible. Ability spectacle intensifies with rank per the ELEMENT SPECTACLE block above.
` : ''}

${existingHiddenFate ? `=== LOCKED HIDDEN FATE (Rank continuity — preserve verbatim, HARD CONSTRAINT) ===
This character has already been generated at at least one lower rank. Rank continuity is INVIOLABLE per Bible §Rank continuity. The following identity anchors MUST NOT change and MUST be echoed verbatim in your hiddenFate output AND woven verbatim into your portraitPrompt IDENTITY BLOCK.

- age: "${existingHiddenFate.age}"  (return this string verbatim in hiddenFate.age; the character reads OLDER in language cues, never younger)
- sex: "${existingHiddenFate.sex}"  (return this string verbatim; no shift)
- bodyType: "${existingHiddenFate.bodyType}"  (return this string verbatim; if it says "heavyset", the Ascendant is heavyset — DO NOT slim, DO NOT gain a "warrior figure", DO NOT trade for elegance)
- skinTone: "${existingHiddenFate.skinTone}"  (verbatim; no lightening, no dulling)
- facialStructure: "${existingHiddenFate.facialStructure}"  (verbatim; same face)
- hair: "${existingHiddenFate.hair}"  (verbatim; may add gray if age forward, may not restyle away entirely)
- disabilityOrCondition: "${existingHiddenFate.disabilityOrCondition}"  (verbatim; a prosthetic stays; a scar-shut eye stays; no healing)
- scars: "${existingHiddenFate.scars}"  (verbatim; scars deepen never disappear)

IF you write anything in portraitPrompt or hiddenFate that contradicts an anchor above, you have failed the Bible §Rank continuity rule. Failure examples that will be REJECTED:
- Foundation bodyType "heavyset with barrel chest" → Ascendant portraitPrompt describes "slim" / "elegant" / "narrow-shouldered" / "warrior figure"
- Foundation disability "prosthetic left leg" → Ascendant portraitPrompt shows both legs
- Foundation scars "burn scar across left cheek" → Ascendant portraitPrompt shows unmarked skin
` : ''}

${existingName ? `=== EVOLUTION CONTEXT (cardName lock — HARD CONSTRAINT) ===
This character's cardName is "${existingName}". Your JSON response MUST return cardName EXACTLY "${existingName}" — do not restyle, do not shorten, do not lengthen, do not translate. "Miren" stays "Miren", not "Miriam", not "Mira". The TITLE (nameAndTitle after the comma) MAY evolve to reflect the ${overallRank} rank per Bible §9. Example: Foundation nameAndTitle "Miren, Keeper of Names" → Ascendant nameAndTitle "Miren, Living Archive" — cardName remains "Miren" in both.

Generate NEW lore that reflects the ${overallRank} rank. If the archetype's approved prestige roles are earned by the story pillar answers, you MAY reference one in the title — but only if plainly earned.
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
  "portraitPrompt": "single dense comma-separated Leonardo prompt under ${PORTRAIT_PROMPT_MAX} characters. Structure in this order: [style anchor: 'fantasy character portrait, painterly digital art, chest-up, single character centered, detailed face, rich textures'], [IDENTITY BLOCK — verbatim age/sex/bodyType/skinTone/facialStructure/hair/disabilityOrCondition/scars ${existingHiddenFate ? 'from LOCKED HIDDEN FATE above (verbatim)' : 'from Hidden Fate you inferred'}], [archetype-specific recognition cues from the Visual DNA field above], [ELEMENT SPECTACLE — the ${element.element} element visibly manifested per the ELEMENT SPECTACLE guidance for ${overallRank} rank; this is a fantasy battle game — show the power], [ABILITY SPECTACLE — visual signature of the character's abilities woven into equipment, pose, or environment per the EXISTING ABILITIES block above], [Story-Pillar-derived materials, symbols, and specific objects], [weather + lighting + environmentDetails from Hidden Fate], [rank-appropriate carriage per the archetype chapter]. ${overallRank === 'Ascendant' ? "This is a climactic Ascendant portrait — the character's mastery of their element and their signature abilities is FULLY MANIFESTED (aura around body, elemental effects, ultimate stance, summoned allies where lore fits). BUT the same body/age/scars from LOCKED HIDDEN FATE are preserved — heavyset stays heavyset, elderly stays elderly, disabled stays disabled. Bible §Visual quality rule: elemental effects + rank glow + ability spectacle can be removed and the character still remains recognizable through silhouette + body + materials." : ''} Do NOT contradict any locked identity above.",
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
  /**
   * The card's existing ability refs, so Claude can weave their visual
   * signatures into the portrait prompt. Foundation forge omits this;
   * tier-up passes the current-rank refs before the new slot fills.
   */
  existingAbilityRefs?: CardAbilityReference[];
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
    existingAbilityRefs: input.existingAbilityRefs,
  });

  // Model selection — Sonnet for tier-ups (existingName present) to reduce
  // cardName / body-lock compliance drift observed with Haiku. Foundation
  // forges stay on Haiku (Sonnet is bundled cost — no player-visible price
  // change; see PREMIUM_PRICE_CATALOG for governance).
  const model = input.existingName
    ? 'claude-sonnet-5'
    : 'claude-haiku-4-5-20251001';

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
        model,
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

    // Bug 2 fix — hard cardName lock. If a tier-up call receives a
    // different cardName than existingName, we do NOT trust Claude and
    // overwrite with existingName. The title/epithet in nameAndTitle
    // is free to evolve; only the leading name is locked.
    let cardName = parsed.cardName;
    let nameAndTitle = parsed.nameAndTitle;
    if (input.existingName && parsed.cardName !== input.existingName) {
      console.warn(
        `Claude drifted cardName "${input.existingName}" → "${parsed.cardName}". Overwriting with existingName; patching nameAndTitle.`,
      );
      cardName = input.existingName;
      // Best-effort: replace the leading name in nameAndTitle up to the first comma.
      const commaIdx = parsed.nameAndTitle.indexOf(',');
      nameAndTitle = commaIdx >= 0
        ? `${input.existingName}${parsed.nameAndTitle.slice(commaIdx)}`
        : input.existingName;
    }

    return {
      cardName,
      nameAndTitle,
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

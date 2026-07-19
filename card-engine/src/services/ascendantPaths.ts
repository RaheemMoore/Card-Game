import type { Card } from '../types/card';
import { getBibleChapter } from '../data/archetypeBible';
import { callAnthropicMessages } from './anthropicClient';

/**
 * Ascendant Paths — Bible §Rank Evolution.
 *
 * The Bible reframes Ascendant per archetype:
 *  - NOT apotheosis
 *  - NOT a mythic combined image
 *  - NOT a forced fusion of whispers
 *
 * Instead, each archetype's Ascendant is a "living reference point who
 * changes what the legacy will become" (Barbarian), "a living interpretation
 * of the discipline" (Monk), "an authority whose work changes how the living
 * remember" (Necromancer), etc.
 *
 * The two paths this function generates offer two believable directions the
 * character's completed choices could take them. Both paths must:
 *  - preserve the character's identity, body, and disability
 *  - preserve their Story Pillar answers
 *  - avoid inventing a prestige role (Bible §Prestige — prestige is
 *    emergent, inferred by prestigeInference, NOT chosen here)
 *
 * The chosen path is threaded into the tier-up as flavor context — not as
 * a heavy directive that overrides the answers.
 */

export interface AscendantPath {
  title: string;
  narrative: string;
}

// M4.9 — Haiku. Sonnet was removed from the entire pipeline; it was
// over-detailing prompts, dropping fields at tier-up, and producing
// homogenized characters. Haiku is now the only model.
const AI_MODEL = 'claude-haiku-4-5-20251001';

export async function generateAscendantPaths(card: Card): Promise<AscendantPath[]> {
  if (!card.storyPillars || !card.elementSelection) {
    return fallbackPaths(card);
  }

  const chapter = getBibleChapter(card.archetype);
  const answers = card.storyPillars.answers
    .map((a) => `- ${a.answer}`)
    .join('\n');

  const prompt = `You are following the Character Generation Bible. This character is about to reach Ascendant rank. Bible §Rank Evolution for ${card.archetype}:

"${chapter.rankEvolution.Ascendant}"
${chapter.rankEvolution.continuityNote ? `Continuity: ${chapter.rankEvolution.continuityNote}` : ''}

CHARACTER:
- Name: ${card.cardName}
- Current title: ${card.nameAndTitle}
- Identity through: ${chapter.identityThrough}
- Element: ${card.elementSelection.element} (bond: "${card.elementSelection.bond}")

STORY PILLAR ANSWERS (immutable — do NOT contradict):
${answers}

YOUR TASK:
Generate TWO distinct paths this character's Ascendant story could take. Each path is a believable continuation of their Story Pillar answers — one might tilt toward broader service; the other toward more focused stewardship, or vice versa. Both paths must:
- preserve the character's body, age, disability, and scars — the Bible forbids automatic beautification or youthening at rank change
- extend the Story Pillar answers rather than replace them
- NOT invent a prestige role (Alpha, Grandmaster, etc.) — those are inferred separately, not chosen here
- keep the character recognizable without magical effects
- fit ${chapter.identityThrough}-driven identity

Return ONLY JSON:
{
  "paths": [
    {"title": "6-10 word evocative name, no prestige title", "narrative": "2 sentences of grounded, believable extension of the character's arc into their Ascendant form"},
    {"title": "different direction, same rules", "narrative": "2 sentences, different direction"}
  ]
}`;

  try {
    const data = await callAnthropicMessages({
      model: AI_MODEL,
      max_tokens: 600,
      temperature: 1,
      messages: [{ role: 'user', content: prompt }],
      gameAction: 'ascendant_paths',
      cardId: card.cardId,
    });
    const raw = data.content?.[0]?.text ?? '';
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const parsed = JSON.parse(text) as { paths?: unknown };

    if (!Array.isArray(parsed.paths) || parsed.paths.length < 2) throw new Error('Malformed paths response');

    const paths = parsed.paths.slice(0, 2).map((p, i) => {
      const obj = p as Record<string, unknown>;
      const title = typeof obj.title === 'string' && obj.title.trim() ? obj.title : `Ascendant Path ${i + 1}`;
      const narrative = typeof obj.narrative === 'string' && obj.narrative.trim() ? obj.narrative : '';
      return { title, narrative };
    });
    if (paths.some((p) => !p.narrative)) throw new Error('Missing narrative on a path');
    return paths;
  } catch (err) {
    console.warn('Ascendant paths generation failed, using fallback:', err);
    return fallbackPaths(card);
  }
}

function fallbackPaths(card: Card): AscendantPath[] {
  const chapter = getBibleChapter(card.archetype);
  return [
    {
      title: `${card.cardName}, Living Witness`,
      narrative:
        `${card.cardName} carries their ${chapter.identityThrough.toLowerCase()} forward into a longer, more visible role — the same person, deepened by choice, now standing where others come to learn what their tradition still means.`,
    },
    {
      title: `${card.cardName}, Quiet Steward`,
      narrative:
        `${card.cardName} chooses the smaller, more specific work — refusing spectacle, keeping the ${chapter.identityThrough.toLowerCase()} alive in the daily habits of their community rather than on any larger stage.`,
    },
  ];
}

import type { ArchetypeName, Rank, CardStats } from '../types/card';
import type { ElementSelection, StoryPillarAnswers } from '../types/bible';
import { getBibleChapter } from '../data/archetypeBible';

/**
 * Local Leonardo prompt fallback for when the Claude API is unavailable.
 * Bible-compliant: no automatic aging escalation, no muscle escalation, no
 * "MORE machine each rank" language. Rank drives carriage and setting
 * detail — not body reshaping.
 */

const RANK_CARRIAGE: Record<Rank, string> = {
  Foundation:
    'grounded, ready stance, the character carries their identity but has not yet been fully tested by it, calm focused expression, clear posture that reflects their role',
  Forged:
    'settled, weathered stance that shows earned experience without shrinking or inflating the body, expression of someone whose choices have integrated into who they are, environment showing signs of the trials they have passed through',
  Ascendant:
    'a person whose completed choices have reshaped what their tradition means — carriage of authority earned through service rather than spectacle, expression of witness, environment reflecting the long arc of the character\'s life',
};

const BASE_NEGATIVE = [
  'text', 'watermark', 'logo', 'signature', 'blurry', 'deformed',
  'extra limbs', 'extra fingers', 'disfigured', 'bad anatomy',
  'bad proportions', 'duplicate', 'multiple characters', 'split frame',
  'comic panels', 'UI elements', 'border', 'frame', 'card border',
  'gore', 'graphic violence', 'severed body parts', 'exposed wounds',
  'blood spatter', 'nudity', 'suggestive',
  'head cropped', 'face cropped', 'face cut off', 'forehead cropped',
  'eyes cropped', 'top of head cropped', 'headless', 'decapitated',
  'chin only', 'face out of frame', 'head out of frame',
  'zoomed too close', 'extreme close-up',
  'younger than previous rank', 'thinner than previous rank',
  'more muscular than previous rank', 'healthier than previous rank',
  'more conventionally attractive than previous rank',
  'disability removed', 'scars erased',
  'generic fantasy stereotype', 'costume-carrying stereotype',
].join(', ');

export interface AssemblePromptInput {
  archetype: ArchetypeName;
  rank: Rank;
  stats: CardStats;
  element: ElementSelection;
  answers: StoryPillarAnswers;
}

export function assemblePortraitPrompt(
  input: AssemblePromptInput,
): { prompt: string; negativePrompt: string } {
  const c = getBibleChapter(input.archetype);

  // Fold up to three Story Pillar answers into a single evocative clause.
  // Keeps prompt length reasonable while carrying player-selected facts.
  const pillarSeed = input.answers.answers
    .slice(0, 3)
    .map((a) => a.answer)
    .join(' ; ');

  const parts: string[] = [
    'fantasy character portrait, painterly digital art, chest-up composition, single character centered in frame, entire head fully visible from top of hair to shoulders, detailed face with eyes and forehead clearly rendered, rich textures',
    `Archetype: ${input.archetype} — identity through ${c.identityThrough}`,
    `Recognition cues: ${c.visualDNA.recognitionCues}`,
    `Materials: ${c.symbolAndMaterial.materials}`,
    `Rank carriage (${input.rank}): ${RANK_CARRIAGE[input.rank]}`,
    `Element woven into equipment or environment: ${input.element.element} (${input.element.compatibility.replace(/_/g, ' ')}); bond: ${input.element.bond}`,
  ];

  if (pillarSeed) parts.push(`Story anchors (must be visible): ${pillarSeed}`);
  parts.push('entire head fully in frame, eyes and forehead visible, chest-up composition centered');

  const prompt = parts.join('. ');

  // Fold archetype-specific §14 Avoid into the negative prompt.
  const archetypeNegatives = c.claudeGuidance.avoid.join(', ');
  const negativePrompt = `${BASE_NEGATIVE}, ${archetypeNegatives}`;

  return { prompt, negativePrompt };
}

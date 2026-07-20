import type { StoryPillarAnswers } from '../types/bible';
import type { Rank, NarrativeAxisState } from '../types/card';
import type { NarrativeAxisDefinition } from '../data/narrativeAxes';
import { STORY_PILLAR_CHAINS } from '../data/storyPillars';

/**
 * P5 Seraph corruption arc — narrative-axis scoring.
 *
 * The alignment score is the sum of `alignmentWeight` on the player's chosen
 * Story Pillar options (data/storyPillars.ts). Untagged options count as 0.
 * The score is clamped to the axis definition's scoreRange and resolved to a
 * band (path) by min/max. Recomputed at tier-up (see services/tierUp.ts).
 *
 * Returns null when NONE of the answered options carry a defined
 * alignmentWeight — so legacy cards and other-archetype cards do not get a
 * spurious 'balanced' path.
 */

export interface AlignmentResult {
  score: number;
  path: string;
}

/** Build optionId → alignmentWeight for every archetype the axis applies to. */
function buildWeightLookup(def: NarrativeAxisDefinition): Map<string, number> {
  const weightById = new Map<string, number>();
  for (const archetype of def.appliesToArchetypes) {
    const chain = STORY_PILLAR_CHAINS[archetype];
    if (!chain) continue;
    for (const option of chain.options) {
      if (typeof option.alignmentWeight === 'number') {
        weightById.set(option.id, option.alignmentWeight);
      }
    }
  }
  return weightById;
}

export function computeAlignment(
  answers: StoryPillarAnswers,
  def: NarrativeAxisDefinition,
): AlignmentResult | null {
  const weightById = buildWeightLookup(def);

  let sawTaggedAnswer = false;
  let raw = 0;
  for (const answer of answers.answers) {
    const weight = weightById.get(answer.optionId);
    if (weight === undefined) continue;
    sawTaggedAnswer = true;
    raw += weight;
  }
  if (!sawTaggedAnswer) return null;

  const score = Math.max(def.scoreRange.min, Math.min(def.scoreRange.max, raw));
  const band = def.bands.find((b) => score >= b.min && score <= b.max);
  return { score, path: band ? band.id : 'balanced' };
}

/**
 * P8 "Resist the Fall" — pure. Shifts the axis score one step toward 0 (per
 * def.resistOverride.shiftTowardCenter), re-derives the band, stamps the new
 * rank, and flags resistedFall. The wallet charge is wired separately (see
 * services/economy/resistFall.ts + the Seraph tier-up UI).
 */
export function resistFall(
  axisState: NarrativeAxisState,
  def: NarrativeAxisDefinition,
  rank: Rank,
): NarrativeAxisState {
  const step = def.resistOverride?.shiftTowardCenter ?? 1;
  let score = axisState.score;
  if (score > 0) score = Math.max(0, score - step);
  else if (score < 0) score = Math.min(0, score + step);
  const clamped = Math.max(def.scoreRange.min, Math.min(def.scoreRange.max, score));
  const band = def.bands.find((b) => clamped >= b.min && clamped <= b.max);
  return {
    ...axisState,
    score: clamped,
    path: band ? band.id : axisState.path,
    resolvedAtRank: rank,
    resistedFall: true,
  };
}

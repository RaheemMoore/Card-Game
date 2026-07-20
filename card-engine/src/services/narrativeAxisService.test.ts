import { describe, it, expect } from 'vitest';
import { computeAlignment, resistFall } from './narrativeAxisService';
import { SERAPH_ALIGNMENT } from '../data/narrativeAxes';
import type { StoryPillarAnswers } from '../types/bible';
import type { NarrativeAxisState } from '../types/card';

function answers(...optionIds: string[]): StoryPillarAnswers {
  return {
    answers: optionIds.map((optionId) => ({
      questionId: optionId.replace(/_a\d+$/, ''),
      optionId,
      answer: optionId,
    })),
  };
}

describe('computeAlignment (Seraph alignment axis)', () => {
  it('all-good picks resolve to the good band at max score', () => {
    // +1 each across the four tagged questions.
    const result = computeAlignment(
      answers('ser_p1_q1_a1', 'ser_p2_q1_a1', 'ser_p3_q1_a1', 'ser_p3_q2_a3'),
      SERAPH_ALIGNMENT,
    );
    expect(result).toEqual({ score: 4, path: 'good' });
  });

  it('all-fallen picks resolve to the fallen band at min score', () => {
    // -1 each across the four tagged questions.
    const result = computeAlignment(
      answers('ser_p1_q1_a11', 'ser_p2_q1_a7', 'ser_p3_q1_a11', 'ser_p3_q2_a11'),
      SERAPH_ALIGNMENT,
    );
    expect(result).toEqual({ score: -4, path: 'fallen' });
  });

  it('cancelling picks resolve to the balanced band at score 0', () => {
    // +1 and -1 cancel out.
    const result = computeAlignment(
      answers('ser_p1_q1_a1', 'ser_p2_q1_a7'),
      SERAPH_ALIGNMENT,
    );
    expect(result).toEqual({ score: 0, path: 'balanced' });
  });

  it('returns null when no answered option carries a defined weight', () => {
    // Barbarian options are untagged for this axis.
    const result = computeAlignment(
      answers('bar_p1_q1_a1', 'bar_p1_q2_a1'),
      SERAPH_ALIGNMENT,
    );
    expect(result).toBeNull();
  });
});

describe('resistFall', () => {
  const axis = (score: number, path: string): NarrativeAxisState => ({
    axisId: 'seraph_alignment',
    score,
    path,
    resolvedAtRank: 'Forged',
  });

  it('shifts a Fallen score one step toward center and flags resistedFall', () => {
    const result = resistFall(axis(-3, 'fallen'), SERAPH_ALIGNMENT, 'Ascendant');
    expect(result.score).toBe(-2);
    expect(result.path).toBe('fallen');
    expect(result.resistedFall).toBe(true);
    expect(result.resolvedAtRank).toBe('Ascendant');
  });

  it('moves off the Fallen band when the step reaches 0', () => {
    const result = resistFall(axis(-1, 'fallen'), SERAPH_ALIGNMENT, 'Forged');
    expect(result.score).toBe(0);
    expect(result.path).toBe('balanced');
  });

  it('does not overshoot past center', () => {
    const result = resistFall(axis(1, 'good'), SERAPH_ALIGNMENT, 'Forged');
    expect(result.score).toBe(0);
    expect(result.path).toBe('balanced');
  });
});

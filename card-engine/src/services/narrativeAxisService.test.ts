import { describe, it, expect } from 'vitest';
import { computeAlignment } from './narrativeAxisService';
import { SERAPH_ALIGNMENT } from '../data/narrativeAxes';
import type { StoryPillarAnswers } from '../types/bible';

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

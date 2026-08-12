import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ArchetypeName } from '../../../types/card';
import type { StoryPillarQuestion } from '../../../types/bible';
import { getOptionsForQuestion } from '../../../data/storyPillars';
import { AdminButton } from '../../../components/admin/ui';

/**
 * One question at a time (Raheem, 2026-08-12).
 *
 * Six questions with ten options each put sixty checkboxes on screen at once,
 * which is a wall rather than a decision. This shows one question, and puts a
 * segment strip above it so the SHAPE of the work — which questions still
 * have nothing claimed — stays visible while only one is in front of you.
 *
 * The strip is the important half. A question with no claimed answer is a
 * dead end for every player who picks it, so finding the gaps has to be
 * easier than remembering where they were.
 */

/** Where the work is. Opening on question 1 every time wastes a click. */
export function firstGapIndex(
  questions: readonly StoryPillarQuestion[],
  claimedCountFor: (questionId: string) => number,
): number {
  const gap = questions.findIndex((q) => claimedCountFor(q.id) === 0);
  return gap === -1 ? 0 : gap;
}

export function ClaimStepper({
  archetype,
  questions,
  claimedCountFor,
  isClaimed,
  onToggle,
}: {
  archetype: ArchetypeName;
  questions: readonly StoryPillarQuestion[];
  claimedCountFor: (questionId: string) => number;
  isClaimed: (questionId: string, optionId: string) => boolean;
  onToggle: (questionId: string, optionId: string) => void;
}) {
  const [index, setIndex] = useState(() => firstGapIndex(questions, claimedCountFor));

  if (questions.length === 0) {
    return (
      <p className="m-0 text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>
        This archetype has no Story Pillar questions yet.
      </p>
    );
  }

  const safeIndex = Math.min(index, questions.length - 1);
  const question = questions[safeIndex];
  const claimed = claimedCountFor(question.id);
  const nextGap = questions.findIndex((q, i) => i !== safeIndex && claimedCountFor(q.id) === 0);

  return (
    <div className="grid gap-3">
      {/* Segment strip — the shape of the work */}
      <div
        role="tablist"
        aria-label="Story Pillar questions"
        className="flex gap-1"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') setIndex(Math.min(safeIndex + 1, questions.length - 1));
          if (e.key === 'ArrowLeft') setIndex(Math.max(safeIndex - 1, 0));
        }}
      >
        {questions.map((q, i) => {
          const count = claimedCountFor(q.id);
          const active = i === safeIndex;
          return (
            <button
              key={q.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Question ${i + 1}: ${count ? `${count} claimed` : 'nothing claimed'}`}
              title={q.prompt}
              onClick={() => setIndex(i)}
              className="flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
              style={{
                height: 8,
                borderRadius: 999,
                cursor: 'pointer',
                background: count ? 'var(--admin-success)' : 'transparent',
                border: `1px solid ${count ? 'var(--admin-success)' : 'var(--admin-border)'}`,
                boxShadow: active ? '0 2px 0 var(--admin-accent)' : undefined,
              }}
            />
          );
        })}
      </div>

      {/* The one question */}
      <div>
        <p
          className="m-0 mb-1 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          Question {safeIndex + 1} of {questions.length}
        </p>
        <p className="m-0 mb-2 text-[13px] font-medium" style={{ color: 'var(--admin-text)' }}>
          {question.prompt}
        </p>
        <ul className="grid gap-1.5 m-0 p-0 list-none">
          {getOptionsForQuestion(archetype, question.id).map((option) => (
            <li key={option.id}>
              <label
                className="flex items-start gap-2 text-xs cursor-pointer"
                style={{ color: 'var(--admin-text)' }}
              >
                <input
                  type="checkbox"
                  checked={isClaimed(question.id, option.id)}
                  onChange={() => onToggle(question.id, option.id)}
                  className="shrink-0 mt-0.5 w-4 h-4 accent-[var(--admin-accent)]"
                />
                <span>{option.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Move */}
      <div className="flex items-center gap-2 flex-wrap">
        <AdminButton
          size="sm"
          variant="ghost"
          icon={<ArrowLeft size={13} />}
          disabled={safeIndex === 0}
          onClick={() => setIndex(safeIndex - 1)}
        >
          Back
        </AdminButton>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: claimed ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}
        >
          {claimed ? `${claimed} claimed` : 'nothing claimed yet'}
        </span>
        <span className="flex-1" />
        {nextGap !== -1 && (
          <AdminButton size="sm" variant="ghost" onClick={() => setIndex(nextGap)}>
            Next gap →
          </AdminButton>
        )}
        <AdminButton
          size="sm"
          variant="ghost"
          icon={<ArrowRight size={13} />}
          disabled={safeIndex === questions.length - 1}
          onClick={() => setIndex(safeIndex + 1)}
        >
          Next
        </AdminButton>
      </div>
    </div>
  );
}

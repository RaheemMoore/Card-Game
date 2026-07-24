import { useCallback, useMemo, useState } from 'react';
import type { ArchetypeName } from '../types/card';
import type {
  StoryPillarAnswer,
  StoryPillarAnswers,
  StoryPillarOption,
  StoryPillarQuestion,
} from '../types/bible';
import {
  getOptionsForQuestion,
  getQuestionsForArchetype,
} from '../data/storyPillars';
import type { VisualQuestionSet } from '../data/visualPillars';

/**
 * Story Pillar wizard — Bible §Guided Narrative Chains.
 *
 * Presents ~5 options at a time per question. Players may lock individual
 * options while they refresh the others. Unlimited refreshes during
 * initial implementation. No free-form input — refresh until an option
 * fits.
 *
 * Answers are IMMUTABLE generation facts and get carried verbatim into
 * the Claude pipeline.
 */

const OPTIONS_PER_QUESTION = 5;

interface StoryPillarWizardProps {
  archetype: ArchetypeName;
  onComplete: (answers: StoryPillarAnswers) => void;
  /**
   * Image-first (2026-07-24) — when provided, the wizard renders THIS set of
   * image-pinned questions (form / build / weapon / companion) instead of the
   * archetype's legacy Story Pillar chain. `collectImagePins` reads the same set
   * so the pins can't drift. See data/visualPillars.ts.
   */
  questionSet?: VisualQuestionSet;
}

interface QuestionState {
  question: StoryPillarQuestion;
  /** Currently visible options. */
  shown: StoryPillarOption[];
  /** Indices in `shown` that are locked (never refreshed until picked or manually unlocked). */
  lockedIndices: Set<number>;
  /** Every option id ever shown for this question — feeds the "avoid immediate repeats" rule. */
  everShown: string[];
  /** The player's committed answer, if any. Advances the flow when set. */
  committed?: StoryPillarAnswer;
}

function initialQuestionState(
  question: StoryPillarQuestion,
  pool: StoryPillarOption[],
): QuestionState {
  const shown = sampleFromPool(pool, OPTIONS_PER_QUESTION);
  return {
    question,
    shown,
    lockedIndices: new Set(),
    everShown: shown.map((o) => o.id),
  };
}

export function StoryPillarWizard({ archetype, onComplete, questionSet }: StoryPillarWizardProps) {
  const orderedQuestions = useMemo<StoryPillarQuestion[]>(
    () => sequenceQuestions(questionSet?.questions ?? getQuestionsForArchetype(archetype)),
    [archetype, questionSet],
  );

  // One resolver for the option pool — the injected visual set wins, else the
  // legacy archetype chain. Both the wizard and collectImagePins read the same
  // set, so a rendered option and its image pin never diverge.
  const resolveOptions = useCallback(
    (questionId: string): StoryPillarOption[] =>
      questionSet
        ? questionSet.options.filter((o) => o.questionId === questionId)
        : getOptionsForQuestion(archetype, questionId),
    [archetype, questionSet],
  );

  const [states, setStates] = useState<QuestionState[]>(() =>
    orderedQuestions.map((q) =>
      initialQuestionState(
        q,
        questionSet
          ? questionSet.options.filter((o) => o.questionId === q.id)
          : getOptionsForQuestion(archetype, q.id),
      ),
    ),
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  const current = states[currentIndex];
  const totalQuestions = orderedQuestions.length;

  const refresh = useCallback(() => {
    setStates((prev) => {
      const next = [...prev];
      const state = { ...next[currentIndex] };
      if (state.committed) return prev;

      const lockedOptions = state.shown.filter((_, i) => state.lockedIndices.has(i));
      const lockedIds = new Set(lockedOptions.map((o) => o.id));
      const slotsToFill = OPTIONS_PER_QUESTION - lockedOptions.length;

      // Sample avoiding everything ever shown; if we run out of pool, allow
      // repeats from earlier shows but not the locked ones.
      const pool = resolveOptions(state.question.id);
      const freshCandidates = pool.filter(
        (o) => !state.everShown.includes(o.id) && !lockedIds.has(o.id),
      );
      let fresh: StoryPillarOption[];
      if (freshCandidates.length >= slotsToFill) {
        fresh = shuffle(freshCandidates).slice(0, slotsToFill);
      } else {
        // Pool exhausted — fall back to any non-locked options.
        const anyNonLocked = pool.filter((o) => !lockedIds.has(o.id));
        fresh = shuffle(anyNonLocked).slice(0, slotsToFill);
      }

      // Preserve locked positions; fill the rest with fresh in order.
      const newShown: StoryPillarOption[] = [];
      const newLockedIndices = new Set<number>();
      let freshCursor = 0;
      for (let i = 0; i < OPTIONS_PER_QUESTION; i++) {
        if (state.lockedIndices.has(i)) {
          newShown.push(state.shown[i]);
          newLockedIndices.add(i);
        } else {
          newShown.push(fresh[freshCursor++] ?? state.shown[i]);
        }
      }

      state.shown = newShown;
      state.lockedIndices = newLockedIndices;
      state.everShown = Array.from(new Set([...state.everShown, ...newShown.map((o) => o.id)]));
      next[currentIndex] = state;
      return next;
    });
  }, [currentIndex, resolveOptions]);

  const toggleLock = useCallback(
    (i: number) => {
      setStates((prev) => {
        const next = [...prev];
        const state = { ...next[currentIndex] };
        const locked = new Set(state.lockedIndices);
        if (locked.has(i)) locked.delete(i);
        else locked.add(i);
        state.lockedIndices = locked;
        next[currentIndex] = state;
        return next;
      });
    },
    [currentIndex],
  );

  const pick = useCallback(
    (option: StoryPillarOption) => {
      setStates((prev) => {
        const next = [...prev];
        const state = { ...next[currentIndex] };
        state.committed = {
          questionId: state.question.id,
          optionId: option.id,
          answer: option.text,
        };
        next[currentIndex] = state;
        return next;
      });

      // Advance to next unanswered question, or complete.
      const nextUnanswered = states.findIndex(
        (s, idx) => idx > currentIndex && !s.committed,
      );
      if (nextUnanswered !== -1) {
        setCurrentIndex(nextUnanswered);
      } else {
        // All answered — build the immutable answers set.
        const finalAnswers: StoryPillarAnswer[] = states.map((s, idx) => {
          if (idx === currentIndex) {
            return {
              questionId: s.question.id,
              optionId: option.id,
              answer: option.text,
            };
          }
          return s.committed!;
        });
        onComplete({ answers: finalAnswers });
      }
    },
    [currentIndex, onComplete, states],
  );

  const goBack = useCallback((targetIndex: number) => {
    setStates((prev) => {
      const next = [...prev];
      const state = { ...next[targetIndex] };
      state.committed = undefined;
      next[targetIndex] = state;
      return next;
    });
    setCurrentIndex(targetIndex);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <header className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Your Story</h2>
        <p className="text-ash text-sm italic">
          Question {currentIndex + 1} of {totalQuestions}. Your answers become part of who
          they are — they will not be forgotten.
        </p>
      </header>

      {/* Progress dots + backtrack */}
      <div className="flex justify-center items-center gap-2">
        {states.map((s, i) => (
          <button
            key={i}
            onClick={() => (i < currentIndex || s.committed) && goBack(i)}
            disabled={i > currentIndex && !s.committed}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === currentIndex
                ? 'bg-gold'
                : s.committed
                  ? 'bg-gold/60 hover:bg-gold/80'
                  : 'bg-slate-dark'
            }`}
            aria-label={`Question ${i + 1}`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="text-center space-y-1">
        <h3 className="font-fantasy text-xl text-gold leading-snug">
          {current.question.prompt}
        </h3>
        {current.question.followUp && (
          <p className="text-[10px] uppercase tracking-widest text-ash/60">
            follow-up to your last answer
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {current.shown.map((option, i) => {
          const locked = current.lockedIndices.has(i);
          return (
            <div
              key={`${current.question.id}_${option.id}`}
              className={`flex items-stretch border rounded-lg transition-colors overflow-hidden ${
                locked
                  ? 'border-gold/60 bg-gold/5'
                  : 'border-slate-dark bg-obsidian/60 hover:border-ash/50'
              }`}
            >
              <button
                onClick={() => pick(option)}
                className="flex-1 text-left px-4 py-3 font-fantasy text-sm text-bone/90 hover:text-ivory transition-colors"
              >
                {option.text}
              </button>
              <button
                onClick={() => toggleLock(i)}
                className={`shrink-0 w-10 border-l flex items-center justify-center text-sm transition-colors ${
                  locked
                    ? 'border-gold/60 text-gold bg-gold/10'
                    : 'border-slate-dark text-ash hover:text-ivory hover:border-ash/50'
                }`}
                aria-label={locked ? 'Unlock this option' : 'Lock this option'}
                title={locked ? 'Locked — will not refresh' : 'Lock this option'}
              >
                {locked ? '🔒' : '🔓'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Refresh */}
      <div className="flex justify-center">
        <button
          onClick={refresh}
          className="px-5 py-2 rounded-lg border border-slate-dark text-ash hover:text-ivory
            hover:border-ash/60 font-fantasy text-sm transition-colors"
        >
          ↻ Show different options
          {current.lockedIndices.size > 0 && (
            <span className="ml-2 text-[10px] text-gold/80">
              ({current.lockedIndices.size} locked)
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ---------- Helpers ----------

/**
 * Order questions so each pillar's follow-up appears immediately after its
 * parent, and pillars are visited in order (P1, P2, P3, P4).
 */
function sequenceQuestions(questions: StoryPillarQuestion[]): StoryPillarQuestion[] {
  const byParent = new Map<string, StoryPillarQuestion[]>();
  const roots: StoryPillarQuestion[] = [];
  for (const q of questions) {
    if (q.parentId) {
      const arr = byParent.get(q.parentId) ?? [];
      arr.push(q);
      byParent.set(q.parentId, arr);
    } else {
      roots.push(q);
    }
  }
  roots.sort((a, b) => a.pillarIndex - b.pillarIndex);
  const ordered: StoryPillarQuestion[] = [];
  for (const root of roots) {
    ordered.push(root);
    const followUps = byParent.get(root.id) ?? [];
    for (const f of followUps) ordered.push(f);
  }
  return ordered;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Show up to n options from a pool (small pools — e.g. a 2-form question —
 *  simply show all of them). */
function sampleFromPool(pool: StoryPillarOption[], n: number): StoryPillarOption[] {
  return shuffle(pool).slice(0, n);
}

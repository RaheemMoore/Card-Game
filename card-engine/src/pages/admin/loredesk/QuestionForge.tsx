import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { CuratedCharacter, GeneratedQuestion } from '../../../types/curatedCard';
import { MIN_APPROVED_GENERATED_QUESTIONS, DEFAULT_BINDING_WEIGHT } from '../../../types/curatedCard';
import { requestGeneratedQuestions } from '../../../services/workshop/loreAssist';
import {
  approveGeneratedQuestion,
  discardGeneratedQuestion,
  approvedQuestions,
} from '../../../services/workshop/loreReadiness';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import { AdminButton, AdminField, AdminStatusBadge } from '../../../components/admin/ui';

/**
 * The Question Forge — bespoke selection questions drafted FROM the lore.
 *
 * Claude proposes questions in the Story Pillar voice; nothing it drafts goes
 * anywhere until the lore director has edited it, marked which answers are
 * true of this character, and pressed Approve — which writes the question's
 * AnswerBinding in the same edit. Draft edits, approvals, and discards all
 * ride the desk's ordinary autosave.
 *
 * The pending true-answer selection for a DRAFT lives in the binding array
 * too (weight 10), so a half-reviewed question survives a reload; approval
 * just stamps the question.
 */
export function QuestionForge({
  character,
  siblings,
  loreComplete,
  onChange,
}: {
  character: CuratedCharacter;
  /** The other characters in this archetype — who these questions must separate them from. */
  siblings: readonly CuratedCharacter[];
  /** Generation is blocked until the lore itself is written. */
  loreComplete: boolean;
  onChange: (next: CuratedCharacter) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = (character.generatedQuestions ?? []).filter((q) => q.status !== 'discarded');
  const approvedCount = approvedQuestions(character).length;

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const drafted = await requestGeneratedQuestions(character, siblings);
      if (drafted.length === 0) {
        setError('The model returned nothing usable. Try again.');
        return;
      }
      // Append drafts and pre-mark the model's claimed answers as pending
      // bindings — Tori can untick them before approving.
      let next = {
        ...character,
        generatedQuestions: [
          ...(character.generatedQuestions ?? []),
          ...drafted.map((d) => d.question),
        ],
      };
      for (const d of drafted) {
        if (d.trueOptionIds.length > 0) {
          next = {
            ...next,
            answerBindings: [
              ...next.answerBindings,
              { questionId: d.question.id, optionIds: d.trueOptionIds, weight: DEFAULT_BINDING_WEIGHT },
            ],
          };
        }
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // The review criterion, named. A director staring at five drafted questions
  // needs the test, not a reminder that the questions exist.
  const firstSister =
    siblings[0]?.lore?.cardName?.trim() || siblings[0]?.displayName || null;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2
          className="m-0 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
          style={{ color: 'var(--admin-text)' }}
        >
          <Wand2 size={14} style={{ color: 'var(--admin-accent-alt)' }} aria-hidden="true" />
          Their tiebreaker questions
        </h2>
        <div className="flex items-center gap-2">
          <AdminStatusBadge tone={approvedCount >= MIN_APPROVED_GENERATED_QUESTIONS ? 'success' : 'warning'}>
            {approvedCount} of {MIN_APPROVED_GENERATED_QUESTIONS} approved
          </AdminStatusBadge>
          <AdminButton
            size="sm"
            onClick={() => void generate()}
            disabled={busy || !loreComplete}
            title={loreComplete ? undefined : 'Finish the lore first — the questions come out of it.'}
          >
            {busy ? 'Drafting…' : questions.length ? 'Draft more' : 'Draft questions from their lore'}
          </AdminButton>
        </div>
      </div>

      {questions.length > 0 && (
        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
          Ask of each: would {firstSister ?? 'another character in this archetype'} answer this the
          same way? If yes, discard it — it separates nobody.
        </p>
      )}

      {!loreComplete && (
        <p className="m-0 text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          Drafting unlocks once the name, premise, and all three rank paragraphs are written.
        </p>
      )}
      {error && (
        <p className="m-0 text-[11px]" style={{ color: 'var(--admin-danger)' }}>{error}</p>
      )}

      <ul className="grid gap-3 m-0 p-0 list-none">
        {questions.map((q) => (
          <QuestionCard key={q.id} character={character} question={q} onChange={onChange} />
        ))}
      </ul>
    </div>
  );
}

function QuestionCard({
  character,
  question,
  onChange,
}: {
  character: CuratedCharacter;
  question: GeneratedQuestion;
  onChange: (next: CuratedCharacter) => void;
}) {
  const isApproved = question.status === 'approved';
  const binding = character.answerBindings.find((b) => b.questionId === question.id);
  const claimed = new Set(binding?.optionIds ?? []);

  const patchQuestion = (patch: Partial<GeneratedQuestion>) => {
    onChange({
      ...character,
      generatedQuestions: (character.generatedQuestions ?? []).map((q) =>
        q.id === question.id ? { ...q, ...patch } : q,
      ),
    });
  };

  const setOptionText = (optionId: string, text: string) => {
    patchQuestion({
      options: question.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  };

  const toggleClaim = (optionId: string) => {
    const next = new Set(claimed);
    if (next.has(optionId)) next.delete(optionId);
    else next.add(optionId);
    const others = character.answerBindings.filter((b) => b.questionId !== question.id);
    onChange({
      ...character,
      answerBindings: next.size
        ? [...others, { questionId: question.id, optionIds: [...next], weight: binding?.weight ?? DEFAULT_BINDING_WEIGHT }]
        : others,
    });
  };

  return (
    <li
      className="grid gap-2 p-3"
      style={{
        background: 'var(--admin-surface-subtle)',
        border: `1px solid ${isApproved ? 'var(--admin-success)' : 'var(--admin-border)'}`,
        borderRadius: 'var(--admin-radius-control)',
      }}
    >
      <div className="flex items-center gap-2">
        <AdminStatusBadge tone={isApproved ? 'success' : 'neutral'}>
          {isApproved ? 'Approved' : 'Draft'}
        </AdminStatusBadge>
        {isApproved && question.approvedBy && (
          <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            by {question.approvedBy}
          </span>
        )}
        <span className="flex-1" />
        {isApproved ? (
          <AdminButton
            size="sm"
            variant="ghost"
            onClick={() => patchQuestion({ status: 'draft', approvedAt: undefined, approvedBy: undefined })}
          >
            Reopen
          </AdminButton>
        ) : (
          <>
            <AdminButton
              size="sm"
              variant="primary"
              disabled={claimed.size === 0}
              title={claimed.size === 0 ? 'Tick at least one answer that is true of this character.' : undefined}
              onClick={() =>
                onChange(
                  approveGeneratedQuestion(
                    character,
                    question.id,
                    [...claimed],
                    getCurrentUser()?.email ?? 'lore desk',
                  ),
                )
              }
            >
              Approve
            </AdminButton>
            <AdminButton
              size="sm"
              variant="ghost"
              onClick={() => onChange(discardGeneratedQuestion(character, question.id))}
            >
              Discard
            </AdminButton>
          </>
        )}
      </div>

      <AdminField
        label="Question"
        value={question.prompt}
        disabled={isApproved}
        onChange={(e) => patchQuestion({ prompt: e.target.value })}
      />

      <fieldset className="grid gap-1.5 m-0 p-0 border-0">
        <legend className="text-xs font-medium mb-1" style={{ color: 'var(--admin-text-muted)' }}>
          Answers — tick the ones true of this character
        </legend>
        {question.options.map((option) => (
          <div key={option.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={claimed.has(option.id)}
              disabled={isApproved}
              onChange={() => toggleClaim(option.id)}
              aria-label="True of this character"
              className="shrink-0 w-4 h-4 accent-[var(--admin-accent)]"
            />
            <input
              value={option.text}
              disabled={isApproved}
              onChange={(e) => setOptionText(option.id, e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
              style={{
                background: 'var(--admin-surface-strong)',
                border: '1px solid var(--admin-border)',
                borderRadius: 'var(--admin-radius-control)',
                color: 'var(--admin-text)',
                opacity: isApproved ? 0.75 : 1,
              }}
            />
          </div>
        ))}
      </fieldset>
    </li>
  );
}

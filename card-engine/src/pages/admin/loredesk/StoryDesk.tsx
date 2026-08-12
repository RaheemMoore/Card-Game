import { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { RANKS, type Rank } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { ARCHETYPE_BIBLE } from '../../../data/archetypeBible';
import {
  getQuestionsForArchetype,
  getOptionsForQuestion,
} from '../../../data/storyPillars';
import { loreProblems } from '../../../services/workshop/loreReadiness';
import { AdminButton, AdminCard, AdminField, AdminTextArea } from '../../../components/admin/ui';
import { SaveChip, type SaveState } from '../../../components/admin/workshop';
import { ReferenceRail } from './ReferenceRail';
import { AssistPanel } from './AssistPanel';
import { QuestionForge } from './QuestionForge';

/**
 * The desk itself — the three-region story-creation layout.
 *
 *   reference rail | writing canvas | the Muse
 *
 * The rails are sticky so the character and the suggestions never scroll away
 * from the writing. `activeRank` is the page's spine: the rank tabs on the
 * writing canvas and the portrait in the reference rail are the same state,
 * so she is always looking at the person she is describing.
 */
export function StoryDesk({
  character,
  queueCount,
  saveState,
  saveError,
  onChange,
  onBack,
  onConfirm,
}: {
  character: CuratedCharacter;
  queueCount: number;
  saveState: SaveState;
  saveError: string | null;
  onChange: (next: CuratedCharacter) => void;
  onBack: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [activeRank, setActiveRank] = useState<Rank>('Foundation');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const chapter = ARCHETYPE_BIBLE[character.archetype];
  const questions = useMemo(
    () => getQuestionsForArchetype(character.archetype),
    [character.archetype],
  );
  const problems = loreProblems(character, questions.map((q) => q.id));

  // The lore fields alone — what unlocks the Question Forge. Bespoke-question
  // problems must not gate the button that creates bespoke questions.
  const loreFieldsComplete =
    Boolean(character.lore?.cardName?.trim()) &&
    Boolean(character.lore?.nameAndTitle?.trim()) &&
    Boolean(character.coreLore?.trim()) &&
    RANKS.every((r) => character.lore?.rankLore?.[r]?.trim());

  const lastSendBack = [...(character.reviewThread ?? [])]
    .reverse()
    .find((n) => n.kind === 'send_back');

  const setLore = (patch: Partial<NonNullable<CuratedCharacter['lore']>>) => {
    onChange({
      ...character,
      lore: { cardName: '', nameAndTitle: '', rankLore: {}, ...(character.lore ?? {}), ...patch },
    });
  };

  const setRankLore = (rank: Rank, text: string) => {
    setLore({ rankLore: { ...(character.lore?.rankLore ?? {}), [rank]: text } });
  };

  const toggleClaim = (questionId: string, optionId: string) => {
    const existing = character.answerBindings ?? [];
    const found = existing.find((b) => b.questionId === questionId);
    let next;
    if (!found) {
      next = [...existing, { questionId, optionIds: [optionId], weight: 10 }];
    } else if (found.optionIds.includes(optionId)) {
      const optionIds = found.optionIds.filter((id) => id !== optionId);
      next = optionIds.length
        ? existing.map((b) => (b.questionId === questionId ? { ...b, optionIds } : b))
        : existing.filter((b) => b.questionId !== questionId);
    } else {
      next = existing.map((b) =>
        b.questionId === questionId ? { ...b, optionIds: [...b.optionIds, optionId] } : b,
      );
    }
    onChange({ ...character, answerBindings: next });
  };

  const claimed = (questionId: string, optionId: string) =>
    (character.answerBindings ?? [])
      .find((b) => b.questionId === questionId)
      ?.optionIds.includes(optionId) ?? false;

  const confirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      await onConfirm();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(false);
    }
  };

  const wordCount = (text: string | undefined) =>
    text?.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="grid gap-4">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <AdminButton size="sm" variant="ghost" icon={<ArrowLeft size={14} />} onClick={onBack}>
          Queue ({queueCount})
        </AdminButton>
        <h2 className="m-0 text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
          {character.displayName} — {character.archetype} · slot {character.slotIndex}
        </h2>
        <span className="flex-1" />
        <SaveChip state={saveState} error={saveError} />
      </div>

      {lastSendBack && (
        <AdminCard
          surface="subtle"
          className="border-l-4"
          // Amber ribbon — the reviewer's reason this came back.
        >
          <p className="m-0 text-xs" style={{ color: 'var(--admin-text)' }}>
            <strong style={{ color: 'var(--admin-warning, #d9a94a)' }}>Sent back:</strong>{' '}
            {lastSendBack.body}
            <span style={{ color: 'var(--admin-text-muted)' }}> — {lastSendBack.author}</span>
          </p>
        </AdminCard>
      )}

      {/* The three regions. Under 1024px everything stacks; from 1024px the
          reference rail joins and sticks; from 1440px the Muse gets its own
          column (below that it renders after the writing column). */}
      <style>{`
        @media (min-width: 1024px) {
          .lore-desk-grid { grid-template-columns: minmax(220px, 300px) minmax(0, 1fr) !important; }
          .lore-desk-rail, .lore-desk-muse { position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow-y: auto; }
          .lore-desk-muse { grid-column: 2; }
        }
        @media (min-width: 1440px) {
          .lore-desk-grid { grid-template-columns: minmax(220px, 300px) minmax(0, 1fr) minmax(250px, 330px) !important; }
          .lore-desk-muse { grid-column: auto; }
        }
      `}</style>
      <div className="lore-desk-grid grid gap-4 items-start" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
        <div className="lore-desk-rail">
          <ReferenceRail character={character} activeRank={activeRank} onRankChange={setActiveRank} />
        </div>

        {/* Writing canvas */}
        <div className="grid gap-4 min-w-0">
          <AdminCard className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Card name"
                placeholder="What players will call them"
                value={character.lore?.cardName ?? ''}
                onChange={(e) => setLore({ cardName: e.target.value })}
              />
              <AdminField
                label="Name and title"
                placeholder="Name, the Something"
                value={character.lore?.nameAndTitle ?? ''}
                onChange={(e) => setLore({ nameAndTitle: e.target.value })}
              />
            </div>
            <AdminTextArea
              label="Premise"
              rows={2}
              placeholder="One line: who is this?"
              value={character.coreLore ?? ''}
              onChange={(e) => onChange({ ...character, coreLore: e.target.value })}
            />
          </AdminCard>

          {/* Rank writing — tabs mirror the reference rail */}
          <AdminCard padded={false} className="overflow-hidden">
            <div
              className="grid grid-cols-3"
              role="tablist"
              aria-label="Rank lore"
              style={{ borderBottom: '1px solid var(--admin-border)' }}
            >
              {RANKS.map((rank) => {
                const active = rank === activeRank;
                const words = wordCount(character.lore?.rankLore?.[rank]);
                return (
                  <button
                    key={rank}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveRank(rank)}
                    className="px-2 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
                    style={{
                      background: active ? 'var(--admin-active-wash)' : 'transparent',
                      boxShadow: active ? 'inset 0 -2px 0 var(--admin-accent)' : undefined,
                    }}
                  >
                    <span
                      className="block text-[11px] font-bold uppercase tracking-wider"
                      style={{ color: active ? 'var(--admin-accent-alt)' : 'var(--admin-text-muted)' }}
                    >
                      {rank}
                    </span>
                    <span className="block text-[10px] tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>
                      {words ? `${words} words` : 'unwritten'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="p-4 grid gap-2">
              {chapter && (
                <p className="m-0 text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
                  {chapter.rankEvolution[activeRank]}
                </p>
              )}
              <textarea
                key={activeRank}
                rows={12}
                placeholder={`Who they are at ${activeRank}`}
                value={character.lore?.rankLore?.[activeRank] ?? ''}
                onFocus={() => setActiveRank(activeRank)}
                onChange={(e) => setRankLore(activeRank, e.target.value)}
                className="w-full p-3 text-[15px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
                style={{
                  background: 'var(--admin-surface-strong)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 'var(--admin-radius-control)',
                  color: 'var(--admin-text)',
                  lineHeight: 1.7,
                  fontFamily: 'Georgia, "Times New Roman", serif',
                }}
              />
            </div>
          </AdminCard>

          {/* Story pillar claims */}
          <AdminCard className="grid gap-3">
            <h2 className="m-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>
              Which answers lead to this character?
            </h2>
            <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
              A player answers these on their way in. Claim the ones that are true of this
              character — those answers are how they find each other. Every question needs at
              least one.
            </p>
            {questions.map((q) => {
              const claimedCount = (character.answerBindings ?? []).find((b) => b.questionId === q.id)?.optionIds.length ?? 0;
              return (
                <details key={q.id} open={claimedCount === 0}>
                  <summary
                    className="cursor-pointer select-none text-xs font-medium flex items-center gap-2"
                    style={{ color: 'var(--admin-text)' }}
                  >
                    <span className="flex-1">{q.prompt}</span>
                    <span
                      className="shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5"
                      style={{
                        color: claimedCount ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                        border: '1px solid var(--admin-border)',
                        borderRadius: '999px',
                      }}
                    >
                      {claimedCount} claimed
                    </span>
                  </summary>
                  <ul className="mt-2 grid gap-1.5 m-0 p-0 list-none">
                    {getOptionsForQuestion(character.archetype, q.id).map((option) => (
                      <li key={option.id}>
                        <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: 'var(--admin-text)' }}>
                          <input
                            type="checkbox"
                            checked={claimed(q.id, option.id)}
                            onChange={() => toggleClaim(q.id, option.id)}
                            className="shrink-0 mt-0.5 w-4 h-4 accent-[var(--admin-accent)]"
                          />
                          <span>{option.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </AdminCard>

          <QuestionForge character={character} loreComplete={loreFieldsComplete} onChange={onChange} />

          {/* Confirm */}
          <AdminCard surface="glass" className="grid gap-2.5">
            {problems.length > 0 ? (
              <ul className="grid gap-1 m-0 p-0 list-none">
                {problems.map((p) => (
                  <li key={p} className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                    ○ {p}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[11px]" style={{ color: 'var(--admin-success)' }}>
                Everything needed is here. Confirming sends it back for review.
              </p>
            )}
            {confirmError && (
              <p className="m-0 text-[11px]" style={{ color: 'var(--admin-danger)' }}>{confirmError}</p>
            )}
            <AdminButton
              variant="primary"
              disabled={confirming || problems.length > 0}
              onClick={() => void confirm()}
            >
              {confirming ? 'Confirming…' : 'Confirm — send back for review'}
            </AdminButton>
          </AdminCard>
        </div>

        <div className="lore-desk-muse">
          <AssistPanel character={character} onJumpToRank={setActiveRank} />
        </div>
      </div>
    </div>
  );
}

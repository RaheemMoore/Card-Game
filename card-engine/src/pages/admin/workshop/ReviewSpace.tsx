import { useState } from 'react';
import { RANKS } from '../../../types/card';
import type { CuratedCharacter, ReviewNote } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../../../data/storyPillars';
import {
  AdminCard, AdminSection, AdminButton, AdminTextArea, AdminAlert,
  AdminEmptyState, AdminSkeleton,
} from '../../../components/admin/ui';
import { Triptych, StatusBadge, StageIntro } from '../../../components/admin/workshop';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * Stage 5 — the review space.
 *
 * A cross-character queue rather than a per-character stage: everything the
 * lore director has finished, from every archetype, in one list. Judging a
 * roster means comparing its members, and you cannot compare what you can only
 * reach one at a time.
 *
 * Two outcomes, and the asymmetry is deliberate:
 *
 *   Approve    the character passes. Its element variants become publishable.
 *   Send back  it returns to her desk WITH A NOTE, which is required. A
 *              bounce with no reason is just a delay.
 *
 * A send-back never clears her draft. It is an edit request, not a reset — the
 * lore stays exactly as written and the note says what to change.
 */

export function ReviewSpace({ onOpenCharacter }: { onOpenCharacter?: (id: string) => void }) {
  const { loading, error } = useCuratedRoster();
  const store = getCuratedRosterStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const waiting = store.getAllCharacters()
    .filter((c) => c.status === 'lore_ready')
    .sort((a, b) => (a.loreConfirmedAt ?? '').localeCompare(b.loreConfirmedAt ?? ''));

  // Heal the selection when the chosen card leaves the queue — approving or
  // sending one back removes it, and a panel pinned to a row that no longer
  // exists is the classic master/detail bug.
  const selected = waiting.find((c) => c.id === selectedId) ?? null;
  if (selectedId && !selected) setSelectedId(null);

  if (error) {
    return <AdminAlert tone="danger" title="The roster could not be read">{error}</AdminAlert>;
  }

  return (
    <div className="grid gap-4">
      <StageIntro
        step="05"
        title="Review — decide together whether a card is good enough to be permanent"
        next="approving unlocks its element versions. Sending it back returns it to Tori with your note attached."
      >
        <p className="m-0 mb-2">
          Everything the lore director has finished waits here, from every archetype, oldest first.
          You are looking at the pictures and her writing side by side and answering one question:
          <strong> is this a card the game should have forever?</strong>
        </p>
        <p className="m-0">
          This is the filter. Nothing becomes permanent without passing it, and a card can be sent
          back as many times as it needs — her work is never lost when you do.
        </p>
      </StageIntro>

      <AdminSection
        title={`Waiting for your decision (${waiting.length})`}
        subtitle="Characters the lore director has finished writing."
      >
        <AdminCard padded={false}>
          {loading ? (
            <div className="p-4"><AdminSkeleton lines={4} /></div>
          ) : waiting.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                title="Nothing waiting"
                description="When Tori confirms a card's lore it appears here. Until then the queue is genuinely empty — not broken."
              />
            </div>
          ) : (
            <ul>
              {waiting.map((c, i) => (
                <li key={c.id} style={{ borderTop: i === 0 ? undefined : '1px solid var(--admin-border)' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    aria-current={c.id === selectedId ? 'true' : undefined}
                    className="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{ background: c.id === selectedId ? 'var(--admin-active-wash)' : undefined }}
                  >
                    {c.masterArt?.Foundation?.portraitUrl && (
                      <img
                        src={c.masterArt.Foundation.portraitUrl}
                        alt=""
                        aria-hidden="true"
                        className="w-10 h-10 object-cover shrink-0"
                        style={{ borderRadius: 8, border: '1px solid var(--admin-border)' }}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium truncate" style={{ color: 'var(--admin-text)' }}>
                        {c.lore?.cardName || c.displayName || c.id}
                      </span>
                      <span className="block text-xs truncate" style={{ color: 'var(--admin-text-muted)' }}>
                        {c.archetype} · slot {c.slotIndex}
                        {c.loreConfirmedBy ? ` · written by ${c.loreConfirmedBy}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={c.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </AdminSection>

      {selected && <ReviewPanel character={selected} onDone={() => setSelectedId(null)} onOpen={onOpenCharacter} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReviewPanel({
  character, onDone, onOpen,
}: {
  character: CuratedCharacter;
  onDone: () => void;
  onOpen?: (id: string) => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'send_back' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const store = getCuratedRosterStore();
  const questions = getQuestionsForArchetype(character.archetype);

  const author = getCurrentUser()?.email ?? 'unknown';

  const decide = async (outcome: 'approve' | 'send_back') => {
    if (outcome === 'send_back' && !note.trim()) {
      setError('Say what needs changing. A card sent back with no reason is just a delay.');
      return;
    }
    setBusy(outcome);
    setError(null);
    try {
      const thread = character.reviewThread ?? [];
      const entry: ReviewNote | null = note.trim()
        ? {
            id: `note_${character.id}_${thread.length + 1}_${Date.now()}`,
            author,
            authoredAt: new Date().toISOString(),
            kind: outcome === 'send_back' ? 'send_back' : 'note',
            origin: 'workshop',
            body: note.trim(),
          }
        : null;

      await store.saveCharacter({
        ...character,
        // A send-back leaves `lore` and `loreDrafts` untouched on purpose. She
        // reopens exactly what she wrote, with the note explaining the change.
        status: outcome === 'approve' ? 'approved' : 'awaiting_lore',
        reviewThread: entry ? [...thread, entry] : thread,
      });
      setNote('');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const claimed = (questionId: string) =>
    character.answerBindings?.find((b) => b.questionId === questionId)?.optionIds ?? [];

  return (
    <AdminSection
      title={character.lore?.cardName || character.displayName}
      subtitle={`${character.archetype} · slot ${character.slotIndex}`}
      actions={onOpen ? (
        <AdminButton size="sm" variant="ghost" onClick={() => onOpen(character.id)}>
          Open in the pipeline
        </AdminButton>
      ) : null}
    >
      <div className="grid gap-4">
        <AdminCard>
          <Triptych art={character.masterArt ?? {}} />
        </AdminCard>

        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <AdminCard>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text)' }}>
              What she wrote
            </h3>
            <dl className="grid gap-3 text-sm">
              <Row label="Card name">{character.lore?.cardName || <Missing />}</Row>
              <Row label="Name and title">{character.lore?.nameAndTitle || <Missing />}</Row>
              <Row label="Premise">{character.coreLore || <Missing />}</Row>
              {RANKS.map((rank) => (
                <Row key={rank} label={rank}>{character.lore?.rankLore?.[rank] || <Missing />}</Row>
              ))}
            </dl>
          </AdminCard>

          <AdminCard>
            <h3 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text)' }}>
              Who this character is for
            </h3>
            <p className="text-xs mb-3 m-0" style={{ color: 'var(--admin-text-muted)' }}>
              The answers she claimed. A player who picks one of these is led toward this character.
            </p>
            <dl className="grid gap-3 text-sm">
              {questions.map((q) => {
                const ids = claimed(q.id);
                const options = getOptionsForQuestion(character.archetype, q.id);
                return (
                  <Row key={q.id} label={q.prompt}>
                    {ids.length === 0 ? (
                      <span style={{ color: 'var(--admin-warning)' }}>
                        Nothing claimed — no player answering this can be matched here.
                      </span>
                    ) : (
                      <ul className="grid gap-1">
                        {ids.map((id) => (
                          <li key={id}>{options.find((o) => o.id === id)?.text ?? id}</li>
                        ))}
                      </ul>
                    )}
                  </Row>
                );
              })}
            </dl>
          </AdminCard>
        </div>

        <AdminCard>
          <h3 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--admin-text)' }}>
            Your decision
          </h3>
          <AdminTextArea
            rows={3}
            value={note}
            label="Note"
            hint="Optional when approving. Required when sending back — it is the only thing telling her what to change."
            placeholder="What works, or what needs to change"
            disabled={busy !== null}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <div className="mt-3"><AdminAlert tone="danger">{error}</AdminAlert></div>}
          <div className="flex flex-wrap gap-2 mt-3">
            <AdminButton
              variant="primary"
              disabled={busy !== null}
              onClick={() => void decide('approve')}
            >
              {busy === 'approve' ? 'Approving…' : 'Approve — this belongs in the game'}
            </AdminButton>
            <AdminButton
              disabled={busy !== null}
              onClick={() => void decide('send_back')}
            >
              {busy === 'send_back' ? 'Sending back…' : 'Send back to Tori'}
            </AdminButton>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
            Approving does not publish anything yet — it unlocks the element versions, which are
            published one at a time. Sending back keeps every word she wrote.
          </p>
        </AdminCard>
      </div>
    </AdminSection>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
        {label}
      </dt>
      <dd className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--admin-text)' }}>
        {children}
      </dd>
    </div>
  );
}

function Missing() {
  return <span className="italic" style={{ color: 'var(--admin-warning)' }}>Not written</span>;
}

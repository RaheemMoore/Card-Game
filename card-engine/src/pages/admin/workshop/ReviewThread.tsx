import { useState } from 'react';
import type { CuratedCharacter, ReviewNote } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import {
  AdminCard, AdminSection, AdminButton, AdminTextArea, AdminAlert,
} from '../../../components/admin/ui';

/**
 * The argument about whether a character is good enough, kept attached to the
 * character.
 *
 * Raheem: *"Make sure we figure out a good question in conversations before
 * something becomes permanent in the game."* The checklist is the gate; this is
 * where the judgment happens. The thread travels with the row, so it is visible
 * both here and on Tori's desk — a send-back and the reply to it sit next to
 * each other instead of in two systems and a chat log nobody can find later.
 *
 * Append-only. Editable history would be worth less than no history.
 */

export function ReviewThread({
  character, origin,
}: { character: CuratedCharacter; origin: 'workshop' | 'desk' }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const thread = character.reviewThread ?? [];

  const post = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const note: ReviewNote = {
        id: `note_${character.id}_${thread.length + 1}_${Date.now()}`,
        author: getCurrentUser()?.email ?? 'unknown',
        authoredAt: new Date().toISOString(),
        kind: 'note',
        origin,
        body: text,
      };
      await getCuratedRosterStore().saveCharacter({ ...character, reviewThread: [...thread, note] });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminSection title={`Discussion (${thread.length})`}>
      <AdminCard>
        <div className="grid gap-3">
          {thread.length === 0 ? (
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              Nothing said yet. Anything written here stays attached to this character — in six
              months it is still the reason it looks the way it does.
            </p>
          ) : (
            <ol className="grid gap-2">
              {thread.map((note) => (
                <li
                  key={note.id}
                  className="px-3 py-2"
                  style={{
                    background: 'var(--admin-surface-subtle)',
                    border: '1px solid var(--admin-border)',
                    borderLeft: `3px solid ${note.kind === 'send_back' ? 'var(--admin-warning)' : 'var(--admin-border)'}`,
                    borderRadius: 'var(--admin-radius-control)',
                  }}
                >
                  <div className="flex flex-wrap gap-2 items-baseline mb-1 text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                    <strong className="text-[11px]" style={{ color: 'var(--admin-text)' }}>{note.author}</strong>
                    <span>
                      {note.kind === 'send_back' ? 'sent back' : 'note'} · {note.origin} ·{' '}
                      {new Date(note.authoredAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed m-0 whitespace-pre-wrap" style={{ color: 'var(--admin-text)' }}>
                    {note.body}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <AdminTextArea
            rows={3}
            value={body}
            placeholder="What do you think?"
            disabled={busy}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void post(); }}
          />
          {error && <AdminAlert tone="danger">{error}</AdminAlert>}
          <AdminButton variant="primary" disabled={busy || !body.trim()} onClick={() => void post()}>
            {busy ? 'Posting…' : 'Post — or ⌘/Ctrl+Enter'}
          </AdminButton>
        </div>
      </AdminCard>
    </AdminSection>
  );
}

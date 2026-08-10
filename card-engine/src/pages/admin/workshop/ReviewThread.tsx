import { useState } from 'react';
import type { CuratedCharacter, ReviewNote } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import { WkPanel } from '../../../components/workshop/ui';

/**
 * The argument about whether a character is good enough, kept attached to the
 * character.
 *
 * Raheem: *"Make sure we figure out a good question in conversations before
 * something becomes permanent in the game."* The checklist is the gate; this is
 * where the judgment happens. It travels with the row, so it is visible both in
 * the Workshop and on Tori's desk — a send-back and the reply to it sit next to
 * each other instead of in two systems and a chat log nobody can find later.
 *
 * Notes are append-only. Editing history would make the record worth less than
 * no record at all.
 */

export function ReviewThread({
  character,
  origin,
}: {
  character: CuratedCharacter;
  origin: 'workshop' | 'desk';
}) {
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
      await getCuratedRosterStore().saveCharacter({
        ...character,
        reviewThread: [...thread, note],
      });
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WkPanel title={`Discussion (${thread.length})`}>
      <div style={{ display: 'grid', gap: 12 }}>
        {thread.length === 0 ? (
          <p className="wk-note">
            Nothing said yet. Anything written here stays attached to this character — in six
            months it is still the reason it looks the way it does.
          </p>
        ) : (
          <ol style={{ display: 'grid', gap: 10 }}>
            {thread.map((note) => (
              <li
                key={note.id}
                className={note.kind === 'send_back' ? 'wk-note-card is-sendback' : 'wk-note-card'}
              >
                <div className="wk-note-meta">
                  <strong>{note.author}</strong>
                  <span>
                    {note.kind === 'send_back' ? 'sent back' : 'note'} · {note.origin} ·{' '}
                    {new Date(note.authoredAt).toLocaleDateString()}
                  </span>
                </div>
                <p>{note.body}</p>
              </li>
            ))}
          </ol>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          <textarea
            className="wk-select"
            rows={3}
            value={body}
            placeholder="What do you think?"
            disabled={busy}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void post();
            }}
          />
          {error ? <p className="wk-error">{error}</p> : null}
          <button
            type="button"
            className="wk-primary"
            disabled={busy || !body.trim()}
            onClick={() => void post()}
          >
            {busy ? 'Posting…' : 'Post — or ⌘/Ctrl+Enter'}
          </button>
        </div>
      </div>
    </WkPanel>
  );
}

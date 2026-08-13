import { useState } from 'react';
import { Sparkles, Copy, X, Check } from 'lucide-react';
import type { Rank } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import {
  requestLoreSuggestions,
  type LoreSuggestion,
  type SuggestionKind,
} from '../../../services/workshop/loreAssist';
import { AdminButton, AdminCard } from '../../../components/admin/ui';

/**
 * The Muse — suggestions beside the writing, never in it.
 *
 * One explicit button fires one paid call; the last batch stays on screen
 * until replaced. Nothing is ever inserted into a field — each card offers
 * copy-to-clipboard, and Tori reworks what she takes. Continuity flags are the
 * exception that must not be missed, so they read amber.
 */
export function AssistPanel({
  character,
  onJumpToRank,
}: {
  character: CuratedCharacter;
  onJumpToRank: (rank: Rank) => void;
}) {
  const [suggestions, setSuggestions] = useState<LoreSuggestion[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await requestLoreSuggestions(character);
      setSuggestions(next);
      setDismissed(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const visible = (suggestions ?? []).filter((_, i) => !dismissed.has(i));

  return (
    <AdminCard surface="glass" className="grid gap-3 content-start">
      <div className="flex items-center justify-between gap-2">
        <h2
          className="m-0 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
          style={{ color: 'var(--admin-text)' }}
        >
          <Sparkles size={14} style={{ color: 'var(--admin-accent-alt)' }} aria-hidden="true" />
          The Muse
        </h2>
        <AdminButton size="sm" onClick={() => void fetchSuggestions()} disabled={busy}>
          {busy ? 'Reading…' : suggestions ? 'Fresh suggestions' : 'Get suggestions'}
        </AdminButton>
      </div>

      <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
        Claude reads the art sheet, the canon, and your draft, and offers angles to try, phrases to
        steal, and continuity flags. It suggests — you write. Each press is one paid call.
      </p>

      {error && (
        <p className="m-0 text-[11px]" style={{ color: 'var(--admin-danger)' }}>
          {error}
        </p>
      )}

      {suggestions !== null && visible.length === 0 && !busy && (
        <p className="m-0 text-[11px] italic" style={{ color: 'var(--admin-text-muted)' }}>
          Nothing left in this batch. Press again for a fresh read of the draft.
        </p>
      )}

      <ul className="grid gap-2 m-0 p-0 list-none">
        {(suggestions ?? []).map((s, i) =>
          dismissed.has(i) ? null : (
            <SuggestionCard
              key={i}
              suggestion={s}
              onDismiss={() => setDismissed((prev) => new Set(prev).add(i))}
              onJumpToRank={onJumpToRank}
            />
          ),
        )}
      </ul>
    </AdminCard>
  );
}

const KIND_LABEL: Record<SuggestionKind, string> = {
  angle: 'Angle',
  phrase: 'Phrase',
  continuity: 'Continuity',
};

function SuggestionCard({
  suggestion,
  onDismiss,
  onJumpToRank,
}: {
  suggestion: LoreSuggestion;
  onDismiss: () => void;
  onJumpToRank: (rank: Rank) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isFlag = suggestion.kind === 'continuity';

  const copy = () => {
    void navigator.clipboard?.writeText(suggestion.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <li
      className="grid gap-1.5 p-2.5"
      style={{
        background: 'var(--admin-surface-strong)',
        border: `1px solid ${isFlag ? 'var(--admin-warning, #b58a2e)' : 'var(--admin-border)'}`,
        borderRadius: 'var(--admin-radius-control)',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: isFlag ? 'var(--admin-warning, #d9a94a)' : 'var(--admin-accent-alt)' }}
        >
          {KIND_LABEL[suggestion.kind]}
        </span>
        {suggestion.about && (
          <button
            type="button"
            onClick={() => onJumpToRank(suggestion.about!)}
            className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            style={{
              color: 'var(--admin-text-muted)',
              border: '1px solid var(--admin-border)',
              borderRadius: '999px',
              cursor: 'pointer',
            }}
            title={`Jump to the ${suggestion.about} paragraph`}
          >
            {suggestion.about}
          </button>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={copy}
          aria-label="Copy suggestion"
          title="Copy"
          className="inline-flex items-center justify-center w-6 h-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
          style={{ color: copied ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss suggestion"
          title="Dismiss"
          className="inline-flex items-center justify-center w-6 h-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
          style={{ color: 'var(--admin-text-muted)' }}
        >
          <X size={12} />
        </button>
      </div>
      <p className="m-0 text-xs leading-relaxed" style={{ color: 'var(--admin-text)' }}>
        {suggestion.text}
      </p>
    </li>
  );
}

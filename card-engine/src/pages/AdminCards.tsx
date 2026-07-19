import { useEffect, useMemo, useState } from 'react';
import { CardRenderer } from '../components/CardRenderer';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../types/card';
import type { Card } from '../types/card';
import {
  listAllCards,
  getCardForAdmin,
  type AdminCardListEntry,
} from '../services/persistence/adminService';
import { AdminPageDescription } from '../components/admin/AdminPageDescription';

// Cross-user card gallery. Search by card name / owner email / uid /
// card_id, filter by archetype, paginate server-side (limit/offset).
// Detail drawer shows full CardRenderer + prompt provenance.
//
// Deletion is intentionally NOT surfaced here — plan §5 requires
// admin+Claude review before permanent deletion. The existing user
// drawer keeps its confirm-only delete for now; a proper audited
// deletion flow lands in a follow-up.

const PAGE_SIZE = 24;

export function AdminCards() {
  const [entries, setEntries] = useState<AdminCardListEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [archetype, setArchetype] = useState<ArchetypeName | ''>('');
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce search 300ms so keystrokes don't spam the RPC.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset offset when filters change.
  useEffect(() => {
    setOffset(0);
  }, [debouncedSearch, archetype]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listAllCards({
      search: debouncedSearch,
      archetype: archetype || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((result) => {
        if (cancelled) return;
        setEntries(result.entries);
        setTotalCount(result.totalCount);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message ?? String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, archetype, offset]);

  const from = totalCount === 0 ? 0 : offset + 1;
  const to = Math.min(offset + entries.length, totalCount);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < totalCount;

  return (
    <div>
      <AdminPageDescription
        title="Cards — every user-owned card"
        body={
          'Every row here is a real card sitting in a real user\'s collection ' +
          '(one row per row in the cards table). Failed forges are never persisted; ' +
          'Prompt Lab test forges live in prompt_test_runs and are not shown here; ' +
          'ability art assets live in canonical_art_assets and appear under /admin/abilities. ' +
          'Search matches card name / owner email / uid / card_id. Filter by archetype. ' +
          'Click any card to see its full renderer + prompt provenance in a right-side drawer.'
        }
      />

      <div className="flex flex-wrap gap-3 items-center mb-3">
        <input
          type="search"
          placeholder="Card name, owner email, uid, or card id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[14rem] max-w-md px-3 py-2 rounded border text-sm bg-void/40 text-bone border-bone/20"
        />
        <select
          value={archetype}
          onChange={(e) => setArchetype((e.target.value as ArchetypeName) || '')}
          className="px-3 py-2 rounded border text-sm bg-void/40 text-bone border-bone/20"
        >
          <option value="">All archetypes</option>
          {ARCHETYPE_NAMES.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="text-xs text-bone/50">
          {totalCount === 0 && !loading ? 'No cards match.' : `Showing ${from}–${to} of ${totalCount.toLocaleString()}`}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="text-sm text-bone/60 p-8 text-center">Loading cards…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {entries.map((c) => (
            <CardTile key={c.card_id} entry={c} onOpen={() => setSelectedId(c.card_id)} />
          ))}
        </div>
      )}

      {(canPrev || canNext) && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!canPrev || loading}
            className="text-xs px-3 py-1.5 rounded border border-bone/20 text-bone/80 disabled:opacity-40"
          >
            ← Prev
          </button>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!canNext || loading}
            className="text-xs px-3 py-1.5 rounded border border-bone/20 text-bone/80 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {selectedId && (
        <CardDetailDrawer cardId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}

function CardTile({ entry, onOpen }: { entry: AdminCardListEntry; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-lg border border-bone/15 bg-void/40 p-3 hover:bg-bone/5 transition-colors"
    >
      {entry.portrait_url ? (
        <div
          className="w-full aspect-[3/4] rounded overflow-hidden mb-2 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${entry.portrait_url}")` }}
        />
      ) : (
        <div className="w-full aspect-[3/4] rounded mb-2 bg-void/60 flex items-center justify-center text-bone/40 text-xs">
          No portrait
        </div>
      )}
      <div className="text-sm font-fantasy font-bold text-bone truncate">
        {entry.card_name ?? <span className="italic text-bone/50">Unnamed</span>}
      </div>
      {entry.name_and_title && (
        <div className="text-[11px] text-bone/70 truncate italic">{entry.name_and_title}</div>
      )}
      <div className="text-[10px] text-bone/50 mt-1">{entry.archetype}</div>
      <div className="text-[10px] text-bone/50 truncate">
        {entry.user_email ?? <span className="italic">guest</span>}
      </div>
      <div className="text-[10px] text-bone/40">
        {new Date(entry.created_at).toLocaleDateString()}
      </div>
    </button>
  );
}

function CardDetailDrawer({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setCard(null);
    getCardForAdmin(cardId)
      .then((c) => {
        if (!cancelled) setCard(c);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const provenance = useMemo(() => extractProvenance(card), [card]);

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl h-full overflow-y-auto p-6"
        style={{ background: '#1c1a17', color: '#f6ecd8', borderLeft: '1px solid rgba(246,236,216,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-fantasy text-xl font-bold">
              {card?.cardName ?? <span className="italic text-bone/60">Loading…</span>}
            </h2>
            <div className="text-[10px] font-mono text-bone/50">{cardId}</div>
          </div>
          <button onClick={onClose} className="text-bone/70 text-2xl leading-none" aria-label="Close">
            ×
          </button>
        </div>

        {error && (
          <div className="p-3 rounded text-sm mb-4" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
            {error}
          </div>
        )}

        {card && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CardRenderer card={card} />
            </div>

            <details className="rounded border border-bone/15 bg-void/40" open>
              <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider text-bone/70">
                Prompt provenance
              </summary>
              <div className="p-3 border-t border-bone/10 space-y-3 text-xs">
                {provenance.length === 0 && (
                  <div className="text-bone/50">No prompt data stored on this card.</div>
                )}
                {provenance.map((row) => (
                  <div key={row.label}>
                    <div className="text-[10px] uppercase tracking-wider text-bone/60">{row.label}</div>
                    <pre className="whitespace-pre-wrap text-bone/80 bg-black/40 p-2 rounded mt-1 max-h-64 overflow-y-auto">
                      {row.value}
                    </pre>
                  </div>
                ))}
              </div>
            </details>

            <details className="rounded border border-bone/15 bg-void/40">
              <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wider text-bone/70">
                Raw JSON
              </summary>
              <pre className="p-3 border-t border-bone/10 text-[10px] text-bone/70 overflow-x-auto max-h-96 whitespace-pre-wrap">
                {JSON.stringify(card, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

// Pulls the fields the review flow actually cares about — final Leonardo
// portrait prompt, negative prompt, and lore text. Missing fields skip
// silently rather than rendering "undefined".
function extractProvenance(card: Card | null): Array<{ label: string; value: string }> {
  if (!card) return [];
  const rows: Array<{ label: string; value: string }> = [];
  const withPrompts = card as Card & { portraitPrompt?: string; negativePrompt?: string };
  if (withPrompts.portraitPrompt) {
    rows.push({ label: 'Portrait prompt', value: withPrompts.portraitPrompt });
  }
  if (withPrompts.negativePrompt) {
    rows.push({ label: 'Negative prompt', value: withPrompts.negativePrompt });
  }
  if (card.lore) {
    rows.push({ label: 'Lore', value: card.lore });
  }
  return rows;
}

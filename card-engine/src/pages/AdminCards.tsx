import { useEffect, useMemo, useState } from 'react';
import { CardRenderer } from '../components/CardRenderer';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../types/card';
import type { Card } from '../types/card';
import {
  listAllCards,
  getCardForAdmin,
  type AdminCardListEntry,
} from '../services/persistence/adminService';
import { AdminPreviewPanel } from '../components/admin/AdminPreviewPanel';
import {
  AdminPage, AdminFilterBar, AdminField, AdminSelect, AdminButton,
  AdminDataTable, AdminAlert, AdminCard as AdminCardBox, type AdminColumn,
} from '../components/admin/ui';

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

  const columns: AdminColumn<AdminCardListEntry>[] = [
    {
      key: 'card',
      header: 'Card',
      render: (c) => (
        <div className="flex items-center gap-3 min-w-0">
          {c.portrait_url ? (
            <div
              className="w-10 h-[3.4rem] rounded overflow-hidden shrink-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url("${c.portrait_url}")`, border: '1px solid var(--admin-border)' }}
            />
          ) : (
            <div className="w-10 h-[3.4rem] rounded shrink-0 flex items-center justify-center text-[9px]" style={{ background: 'var(--admin-surface-subtle)', color: 'var(--admin-text-muted)', border: '1px solid var(--admin-border)' }}>
              no art
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ color: 'var(--admin-text)' }}>
              {c.card_name ?? <span className="italic" style={{ color: 'var(--admin-text-muted)' }}>Unnamed</span>}
            </div>
            {c.name_and_title && <div className="text-[11px] italic truncate" style={{ color: 'var(--admin-text-muted)' }}>{c.name_and_title}</div>}
          </div>
        </div>
      ),
    },
    { key: 'archetype', header: 'Archetype', render: (c) => c.archetype },
    { key: 'owner', header: 'Owner', secondary: true, render: (c) => c.user_email ?? <span className="italic" style={{ color: 'var(--admin-text-muted)' }}>guest</span> },
    { key: 'created', header: 'Created', secondary: true, render: (c) => <span style={{ color: 'var(--admin-text-muted)' }}>{new Date(c.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <AdminPage
      title="Cards"
      description="Every user-owned card (one row per row in the cards table). Failed forges and Prompt Lab test forges are excluded; ability art lives under Abilities. Search matches card name / owner email / uid / card_id. Click a row for the full renderer + prompt provenance."
    >
      <AdminFilterBar className="mb-3">
        <div className="flex-1 min-w-[14rem] max-w-md">
          <AdminField
            type="search"
            placeholder="Card name, owner email, uid, or card id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[10rem]">
          <AdminSelect value={archetype} onChange={(e) => setArchetype((e.target.value as ArchetypeName) || '')}>
            <option value="">All archetypes</option>
            {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
          </AdminSelect>
        </div>
        <span className="text-xs ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
          {totalCount === 0 && !loading ? 'No cards match.' : `Showing ${from}–${to} of ${totalCount.toLocaleString()}`}
        </span>
      </AdminFilterBar>

      {error && <AdminAlert tone="danger" className="mb-4">{error}</AdminAlert>}

      <AdminDataTable
        columns={columns}
        rows={loading && entries.length === 0 ? null : entries}
        rowKey={(c) => c.card_id}
        onRowClick={(c) => setSelectedId(c.card_id)}
        selectedKey={selectedId ?? undefined}
        emptyTitle="No cards match"
        emptyDescription="Adjust your search or archetype filter."
      />

      {(canPrev || canNext) && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <AdminButton size="sm" onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} disabled={!canPrev || loading}>← Prev</AdminButton>
          <AdminButton size="sm" onClick={() => setOffset(offset + PAGE_SIZE)} disabled={!canNext || loading}>Next →</AdminButton>
        </div>
      )}

      <CardDetailDrawer cardId={selectedId} onClose={() => setSelectedId(null)} />
    </AdminPage>
  );
}

function CardDetailDrawer({ cardId, onClose }: { cardId: string | null; onClose: () => void }) {
  const [card, setCard] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cardId) return;
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
    <AdminPreviewPanel
      open={Boolean(cardId)}
      onClose={onClose}
      title={card?.cardName ?? 'Loading…'}
      subtitle={cardId ?? undefined}
    >
      {error && <AdminAlert tone="danger" className="mb-4">{error}</AdminAlert>}

      {card && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <CardRenderer card={card} />
          </div>

          <AdminCardBox surface="subtle" padded={false}>
            <details open>
              <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                Prompt provenance
              </summary>
              <div className="p-3 space-y-3 text-xs" style={{ borderTop: '1px solid var(--admin-border)' }}>
                {provenance.length === 0 && <div style={{ color: 'var(--admin-text-muted)' }}>No prompt data stored on this card.</div>}
                {provenance.map((row) => (
                  <div key={row.label}>
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>{row.label}</div>
                    <pre className="whitespace-pre-wrap p-2 rounded mt-1 max-h-64 overflow-y-auto font-mono" style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--admin-text)' }}>
                      {row.value}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          </AdminCardBox>

          <AdminCardBox surface="subtle" padded={false}>
            <details>
              <summary className="cursor-pointer px-3 py-2 text-xs uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>
                Raw JSON
              </summary>
              <pre className="p-3 text-[10px] overflow-x-auto max-h-96 whitespace-pre-wrap font-mono" style={{ borderTop: '1px solid var(--admin-border)', color: 'var(--admin-text-muted)' }}>
                {JSON.stringify(card, null, 2)}
              </pre>
            </details>
          </AdminCardBox>
        </div>
      )}
    </AdminPreviewPanel>
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

import { useEffect, useMemo, useState } from 'react';
import {
  listUsers,
  getSystemStats,
  grantAdminAdjustment,
  listUserCards,
  listUserLedger,
  deleteUserCard,
  type AdminUserRow,
  type SystemStats,
} from '../services/persistence/adminService';
import type { Card } from '../types/card';
import type { CurrencyId, EconomyTransaction } from '../types/economy';
import { CardRenderer } from '../components/CardRenderer';
import { AdminPreviewPanel } from '../components/admin/AdminPreviewPanel';
import {
  AdminPage, AdminFilterBar, AdminField, AdminSelect, AdminButton,
  AdminDataTable, AdminStatusBadge, AdminAlert, AdminCard, AdminEmptyState,
  type AdminColumn,
} from '../components/admin/ui';

// Users destination. Shell (guard, sub-nav, header) is provided by
// AdminShell — this page renders inside its Outlet.

function fmtActivity(iso: string | null): string {
  if (!iso || iso === '-infinity') return '—';
  return new Date(iso).toLocaleString();
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showGuests, setShowGuests] = useState(false);

  const refresh = () => {
    setLoadError(null);
    Promise.all([listUsers(), getSystemStats()])
      .then(([u, s]) => {
        setUsers(u);
        setStats(s);
      })
      .catch((err) => setLoadError(err?.message ?? String(err)));
  };

  useEffect(refresh, []);

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    let list = users;
    if (!showGuests) list = list.filter((u) => !u.is_anonymous);
    if (!q) return list;
    return list.filter(
      (u) => (u.email ?? '').toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q),
    );
  }, [users, query, showGuests]);

  const guestCount = users?.filter((u) => u.is_anonymous).length ?? 0;
  const selected = users?.find((u) => u.user_id === selectedUid) ?? null;

  const columns: AdminColumn<AdminUserRow>[] = [
    {
      key: 'email',
      header: 'Email / UID',
      render: (u) => (
        <div className="min-w-0">
          <div className="truncate" style={{ color: 'var(--admin-text)' }}>
            {u.email ?? <span className="italic" style={{ color: 'var(--admin-text-muted)' }}>no email</span>}
          </div>
          <div className="text-[11px] font-mono truncate" style={{ color: 'var(--admin-text-muted)' }}>
            {u.user_id.slice(0, 8)}… {u.is_anonymous && '· guest'}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) => (u.role === 'admin' ? <AdminStatusBadge tone="accent">admin</AdminStatusBadge> : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>),
    },
    { key: 'cards', header: 'Cards', align: 'right', render: (u) => u.card_count },
    { key: 'txns', header: 'Txns', align: 'right', secondary: true, render: (u) => u.txn_count },
    { key: 'premium', header: 'Premium', align: 'right', render: (u) => u.premium_balance },
    { key: 'gameplay', header: 'Gameplay', align: 'right', render: (u) => u.gameplay_balance },
    { key: 'last', header: 'Last activity', secondary: true, render: (u) => <span style={{ color: 'var(--admin-text-muted)' }}>{fmtActivity(u.last_activity)}</span> },
  ];

  return (
    <AdminPage
      title="Users"
      description="Every signed-in account plus Google/email guest anonymous sessions. Guests are hidden by default. Click a row to grant currency (required reason → admin_adjustment), review cards, or read the ledger."
      actions={<AdminButton size="sm" onClick={refresh}>Refresh</AdminButton>}
    >
      {loadError && <AdminAlert tone="danger" className="mb-4">{loadError}</AdminAlert>}

      <AdminFilterBar className="mb-3">
        <div className="flex-1 min-w-[12rem] max-w-sm">
          <AdminField
            type="search"
            placeholder="Search email or uid…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--admin-text-muted)' }}>
          <input type="checkbox" checked={showGuests} onChange={(e) => setShowGuests(e.target.checked)} />
          Show guests ({guestCount})
        </label>
        {stats && (
          <span className="text-xs ml-auto" style={{ color: 'var(--admin-text-muted)' }}>
            {stats.total_users} total · {stats.total_admins} admin
          </span>
        )}
      </AdminFilterBar>

      <AdminDataTable
        columns={columns}
        rows={filtered}
        rowKey={(u) => u.user_id}
        onRowClick={(u) => setSelectedUid(u.user_id)}
        selectedKey={selectedUid ?? undefined}
        emptyTitle="No users match"
        emptyDescription="Adjust your search or toggle guests to see more."
      />

      <AdminPreviewPanel
        open={Boolean(selected)}
        onClose={() => setSelectedUid(null)}
        title={selected?.email ?? 'Guest user'}
        subtitle={selected?.user_id}
      >
        {selected && <UserDrawerBody user={selected} onMutated={refresh} />}
      </AdminPreviewPanel>
    </AdminPage>
  );
}

type DrawerTab = 'currency' | 'cards' | 'ledger';

function UserDrawerBody({ user, onMutated }: { user: AdminUserRow; onMutated: () => void }) {
  const [tab, setTab] = useState<DrawerTab>('currency');

  return (
    <div>
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
        {(['currency', 'cards', 'ledger'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-2 text-sm -mb-px"
            style={{
              color: tab === t ? 'var(--admin-text)' : 'var(--admin-text-muted)',
              borderBottom: tab === t ? '2px solid var(--admin-accent)' : '2px solid transparent',
              fontWeight: tab === t ? 600 : 400,
            }}
          >
            {t === 'currency' ? 'Currency' : t === 'cards' ? `Cards (${user.card_count})` : `Ledger (${user.txn_count})`}
          </button>
        ))}
      </div>

      {tab === 'currency' && <CurrencyTab user={user} onGranted={onMutated} />}
      {tab === 'cards' && <CardsTab userId={user.user_id} onDeleted={onMutated} />}
      {tab === 'ledger' && <LedgerTab userId={user.user_id} />}
    </div>
  );
}

function CurrencyTab({ user, onGranted }: { user: AdminUserRow; onGranted: () => void }) {
  const [currency, setCurrency] = useState<CurrencyId>('premium');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setSuccess(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed === 0) {
      setError('Amount must be a non-zero number.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setBusy(true);
    try {
      const result = await grantAdminAdjustment({
        userId: user.user_id,
        currency,
        amount: parsed,
        reason: reason.trim(),
      });
      setSuccess(`Adjustment recorded (${parsed >= 0 ? '+' : ''}${parsed} ${currency}). New balance: ${result.balance_after}.`);
      setAmount('');
      setReason('');
      onGranted();
    } catch (err) {
      const e = err as { message?: string };
      setError(e.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <AdminCard surface="subtle">
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Premium</div>
          <div className="text-lg font-bold" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>{user.premium_balance}</div>
        </AdminCard>
        <AdminCard surface="subtle">
          <div className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--admin-text-muted)' }}>Gameplay</div>
          <div className="text-lg font-bold" style={{ color: 'var(--admin-text)', fontVariantNumeric: 'tabular-nums' }}>{user.gameplay_balance}</div>
        </AdminCard>
      </div>

      <div className="space-y-3">
        <AdminSelect
          label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyId)}
        >
          <option value="premium">Premium</option>
          <option value="gameplay">Gameplay</option>
        </AdminSelect>
        <AdminField
          label="Amount"
          hint="Negative to deduct"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <AdminField
          label="Reason"
          required
          hint="Written to the admin_adjustment ledger row"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <AdminAlert tone="danger">{error}</AdminAlert>}
        {success && <AdminAlert tone="success">{success}</AdminAlert>}
        <AdminButton variant="primary" onClick={submit} disabled={busy}>
          {busy ? 'Applying…' : 'Apply adjustment'}
        </AdminButton>
      </div>
    </div>
  );
}

function CardsTab({ userId, onDeleted }: { userId: string; onDeleted: () => void }) {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    listUserCards(userId)
      .then(setCards)
      .catch((err) => setError(err?.message ?? String(err)));
  };
  useEffect(load, [userId]);

  if (error) return <AdminAlert tone="danger">{error}</AdminAlert>;
  if (cards === null) return <div className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>Loading…</div>;
  if (cards.length === 0) return <AdminEmptyState title="No cards" description="This user has no active cards." />;

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.cardId} className="flex flex-col items-center gap-2">
          <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', height: 235 }}>
            <CardRenderer card={card} />
          </div>
          <AdminButton
            variant="danger"
            size="sm"
            onClick={async () => {
              if (!confirm(`Delete "${card.cardName}"? This is permanent.`)) return;
              try {
                await deleteUserCard(card.cardId);
                load();
                onDeleted();
              } catch (err) {
                const e = err as { message?: string };
                setError(e.message ?? String(err));
              }
            }}
          >
            Delete
          </AdminButton>
        </div>
      ))}
    </div>
  );
}

function LedgerTab({ userId }: { userId: string }) {
  const [txns, setTxns] = useState<EconomyTransaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    listUserLedger(userId)
      .then(setTxns)
      .catch((err) => setError(err?.message ?? String(err)));
  }, [userId]);

  const columns: AdminColumn<EconomyTransaction>[] = [
    { key: 'seq', header: 'Seq', render: (t) => <span className="font-mono">{t.sequence}</span> },
    { key: 'type', header: 'Type', render: (t) => t.type },
    { key: 'status', header: 'Status', secondary: true, render: (t) => t.status },
    { key: 'currency', header: 'Currency', secondary: true, render: (t) => t.currency },
    { key: 'amount', header: 'Amount', align: 'right', render: (t) => t.amount },
    { key: 'balance', header: 'Balance', align: 'right', render: (t) => t.balanceAfter },
    { key: 'when', header: 'When', secondary: true, render: (t) => <span style={{ color: 'var(--admin-text-muted)' }}>{new Date(t.createdAt).toLocaleString()}</span> },
    { key: 'note', header: 'Note', secondary: true, render: (t) => <span style={{ color: 'var(--admin-text-muted)' }}>{t.metadata?.reason ?? t.metadata?.refundReason ?? t.actionId ?? t.rewardId ?? ''}</span> },
  ];

  return (
    <AdminDataTable
      columns={columns}
      rows={txns}
      rowKey={(t) => t.transactionId}
      error={error}
      emptyTitle="No transactions"
    />
  );
}

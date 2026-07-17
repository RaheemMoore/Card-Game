import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchIsAdmin } from '../services/persistence/supabaseClient';
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

type GuardState = 'checking' | 'allowed' | 'denied';

export function Admin() {
  const [guard, setGuard] = useState<GuardState>('checking');
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  const refresh = () => {
    setLoadError(null);
    Promise.all([listUsers(), getSystemStats()])
      .then(([u, s]) => {
        setUsers(u);
        setStats(s);
      })
      .catch((err) => setLoadError(err?.message ?? String(err)));
  };

  useEffect(() => {
    if (guard !== 'allowed') return;
    refresh();
  }, [guard]);

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => (u.email ?? '').toLowerCase().includes(q) || u.user_id.toLowerCase().includes(q),
    );
  }, [users, query]);

  if (guard === 'checking') return <div className="p-8 text-center text-bone/70">Checking access…</div>;
  if (guard === 'denied') return <Navigate to="/" replace />;

  const selected = users?.find((u) => u.user_id === selectedUid) ?? null;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="font-fantasy text-2xl font-bold mb-4 text-bone">Admin</h1>

      {loadError && (
        <div className="mb-4 p-3 rounded text-sm" style={{ background: 'rgba(220,38,38,0.15)', color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.4)' }}>
          {loadError}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          <Stat label="Users" value={stats.total_users} sub={`${stats.total_admins} admin`} />
          <Stat label="Cards" value={stats.total_cards} />
          <Stat label="Transactions" value={stats.total_txns} />
          <Stat label="Premium (all)" value={stats.aggregate_premium} />
          <Stat label="Gameplay (all)" value={stats.aggregate_gameplay} />
          <button
            onClick={refresh}
            className="rounded p-2 text-xs font-fantasy font-bold"
            style={{ background: 'rgba(155,182,179,0.15)', color: '#d6f2ec', border: '1px solid rgba(155,182,179,0.3)' }}
          >
            Refresh
          </button>
        </div>
      )}

      <input
        type="search"
        placeholder="Search email or uid…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-sm mb-3 px-3 py-2 rounded border text-sm bg-void/40 text-bone border-bone/20"
      />

      {/* Mobile: stacked cards. Desktop: table. */}
      <div className="sm:hidden space-y-2">
        {filtered === null && (
          <div className="rounded border border-bone/15 p-4 text-center text-bone/60 text-sm">Loading…</div>
        )}
        {filtered && filtered.length === 0 && (
          <div className="rounded border border-bone/15 p-4 text-center text-bone/60 text-sm">No users match.</div>
        )}
        {filtered?.map((u) => (
          <button
            key={u.user_id}
            onClick={() => setSelectedUid(u.user_id)}
            className="w-full text-left rounded-lg border border-bone/15 bg-void/40 p-3 space-y-2 hover:bg-bone/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-bone">
                  {u.email ?? <span className="text-bone/50 italic">no email</span>}
                </div>
                <div className="text-[10px] text-bone/40 font-mono truncate">
                  {u.user_id.slice(0, 12)}… {u.is_anonymous && '· guest'}
                </div>
              </div>
              {u.role === 'admin' && (
                <span
                  className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'rgba(155,182,179,0.2)', color: '#d6f2ec' }}
                >
                  ADMIN
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-bone/70">
              <MobileStat label="Cards" value={u.card_count} />
              <MobileStat label="Txns" value={u.txn_count} />
              <MobileStat label="Prem" value={u.premium_balance} />
              <MobileStat label="Gold" value={u.gameplay_balance} />
            </div>
            {u.last_activity && u.last_activity !== '-infinity' && (
              <div className="text-[10px] text-bone/50">
                Last: {new Date(u.last_activity).toLocaleString()}
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto rounded border border-bone/15">
        <table className="w-full text-sm text-bone/90">
          <thead className="bg-void/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2">Email / UID</th>
              <th className="text-left px-3 py-2">Role</th>
              <th className="text-right px-3 py-2">Cards</th>
              <th className="text-right px-3 py-2">Txns</th>
              <th className="text-right px-3 py-2">Premium</th>
              <th className="text-right px-3 py-2">Gameplay</th>
              <th className="text-left px-3 py-2">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {filtered === null && (
              <tr><td colSpan={7} className="p-4 text-center text-bone/60">Loading…</td></tr>
            )}
            {filtered && filtered.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-bone/60">No users match.</td></tr>
            )}
            {filtered?.map((u) => (
              <tr
                key={u.user_id}
                className="border-t border-bone/10 hover:bg-bone/5 cursor-pointer"
                onClick={() => setSelectedUid(u.user_id)}
              >
                <td className="px-3 py-2">
                  <div>{u.email ?? <span className="text-bone/50 italic">no email</span>}</div>
                  <div className="text-[10px] text-bone/40 font-mono">{u.user_id.slice(0, 8)}… {u.is_anonymous && '· guest'}</div>
                </td>
                <td className="px-3 py-2">
                  {u.role === 'admin' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: 'rgba(155,182,179,0.2)', color: '#d6f2ec' }}>ADMIN</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{u.card_count}</td>
                <td className="px-3 py-2 text-right">{u.txn_count}</td>
                <td className="px-3 py-2 text-right">{u.premium_balance}</td>
                <td className="px-3 py-2 text-right">{u.gameplay_balance}</td>
                <td className="px-3 py-2 text-bone/60 text-xs">
                  {u.last_activity && u.last_activity !== '-infinity' ? new Date(u.last_activity).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelectedUid(null)}
          onMutated={refresh}
        />
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded p-2 border border-bone/15 bg-void/30">
      <div className="text-[10px] uppercase tracking-wider text-bone/60">{label}</div>
      <div className="font-fantasy text-lg font-bold text-bone">{value}</div>
      {sub && <div className="text-[10px] text-bone/50">{sub}</div>}
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-void/40 px-1.5 py-1 text-center">
      <div className="uppercase tracking-wider text-bone/50">{label}</div>
      <div className="font-fantasy text-sm font-bold text-bone">{value}</div>
    </div>
  );
}

type DrawerTab = 'currency' | 'cards' | 'ledger';

function UserDrawer({
  user,
  onClose,
  onMutated,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [tab, setTab] = useState<DrawerTab>('currency');

  return (
    <div className="fixed inset-0 z-[80] flex justify-end" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full overflow-y-auto p-6"
        style={{ background: '#1c1a17', color: '#f6ecd8', borderLeft: '1px solid rgba(246,236,216,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-fantasy text-lg font-bold">{user.email ?? <span className="italic text-bone/60">Guest user</span>}</h2>
            <div className="text-[10px] font-mono text-bone/50">{user.user_id}</div>
          </div>
          <button onClick={onClose} className="text-bone/70 text-2xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="flex gap-1 border-b border-bone/15 mb-4">
          {(['currency', 'cards', 'ledger'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 font-fantasy text-sm ${tab === t ? 'border-b-2 border-power font-bold' : 'opacity-60'}`}
            >
              {t === 'currency' ? 'Currency' : t === 'cards' ? `Cards (${user.card_count})` : `Ledger (${user.txn_count})`}
            </button>
          ))}
        </div>

        {tab === 'currency' && <CurrencyTab user={user} onGranted={onMutated} />}
        {tab === 'cards' && <CardsTab userId={user.user_id} onDeleted={onMutated} />}
        {tab === 'ledger' && <LedgerTab userId={user.user_id} />}
      </div>
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
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded p-2 border border-bone/15">
          <div className="text-bone/60 uppercase tracking-wider">Premium</div>
          <div className="font-fantasy text-lg font-bold">{user.premium_balance}</div>
        </div>
        <div className="rounded p-2 border border-bone/15">
          <div className="text-bone/60 uppercase tracking-wider">Gameplay</div>
          <div className="font-fantasy text-lg font-bold">{user.gameplay_balance}</div>
        </div>
      </div>

      <div className="pt-2">
        <div className="flex gap-2 mb-2">
          <label className="flex items-center gap-1">
            <input type="radio" checked={currency === 'premium'} onChange={() => setCurrency('premium')} />
            <span>Premium</span>
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" checked={currency === 'gameplay'} onChange={() => setCurrency('gameplay')} />
            <span>Gameplay</span>
          </label>
        </div>
        <label className="block mb-2">
          <span className="block text-xs uppercase tracking-wider text-bone/60 mb-1">Amount (negative to deduct)</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-2 py-1 rounded border bg-void/40 border-bone/20 text-bone"
          />
        </label>
        <label className="block mb-2">
          <span className="block text-xs uppercase tracking-wider text-bone/60 mb-1">Reason (required)</span>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-2 py-1 rounded border bg-void/40 border-bone/20 text-bone"
          />
        </label>
        {error && <div className="text-xs mb-2" style={{ color: '#f9c9c9' }}>{error}</div>}
        {success && <div className="text-xs mb-2" style={{ color: '#c9f9d9' }}>{success}</div>}
        <button
          onClick={submit}
          disabled={busy}
          className="px-4 py-2 rounded font-fantasy font-bold text-sm"
          style={{ background: '#8a1c1c', color: '#faeaca', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Applying…' : 'Apply adjustment'}
        </button>
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

  if (error) return <div className="text-sm" style={{ color: '#f9c9c9' }}>{error}</div>;
  if (cards === null) return <div className="text-sm text-bone/60">Loading…</div>;
  if (cards.length === 0) return <div className="text-sm text-bone/60">No cards.</div>;

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <div key={card.cardId} className="flex flex-col items-center gap-2">
          <div style={{ transform: 'scale(0.5)', transformOrigin: 'top center', height: 235 }}>
            <CardRenderer card={card} />
          </div>
          <button
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
            className="text-xs px-2 py-1 rounded font-fantasy"
            style={{ color: '#f9c9c9', border: '1px solid rgba(220,38,38,0.3)' }}
          >
            Delete
          </button>
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

  if (error) return <div className="text-sm" style={{ color: '#f9c9c9' }}>{error}</div>;
  if (txns === null) return <div className="text-sm text-bone/60">Loading…</div>;
  if (txns.length === 0) return <div className="text-sm text-bone/60">No transactions.</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-bone/90">
        <thead className="text-bone/60 uppercase tracking-wider">
          <tr>
            <th className="text-left px-2 py-1">Seq</th>
            <th className="text-left px-2 py-1">Type</th>
            <th className="text-left px-2 py-1">Status</th>
            <th className="text-left px-2 py-1">Currency</th>
            <th className="text-right px-2 py-1">Amount</th>
            <th className="text-right px-2 py-1">Balance</th>
            <th className="text-left px-2 py-1">When</th>
            <th className="text-left px-2 py-1">Note</th>
          </tr>
        </thead>
        <tbody>
          {txns.map((t) => (
            <tr key={t.transactionId} className="border-t border-bone/10">
              <td className="px-2 py-1 font-mono">{t.sequence}</td>
              <td className="px-2 py-1">{t.type}</td>
              <td className="px-2 py-1">{t.status}</td>
              <td className="px-2 py-1">{t.currency}</td>
              <td className="px-2 py-1 text-right">{t.amount}</td>
              <td className="px-2 py-1 text-right">{t.balanceAfter}</td>
              <td className="px-2 py-1 text-bone/60">{new Date(t.createdAt).toLocaleString()}</td>
              <td className="px-2 py-1 text-bone/70">
                {t.metadata?.reason ?? t.metadata?.refundReason ?? t.actionId ?? t.rewardId ?? ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { useEffect, useState, type RefObject } from 'react';
import type { CurrencyId, EconomyTransaction } from '../../types/economy';
import { CURRENCY_DISPLAY } from '../../data/economy/assumptions';
import * as ledger from '../../services/economy/transactionLedger';
import { useBalance } from '../../services/economy/useWallet';

interface WalletPopoverProps {
  currency: CurrencyId;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}

// Popover anchored to a NavBar balance pill. Shows the current balance,
// the last 5 transactions for this currency, and (for premium) a disabled
// "buy more" placeholder that hooks Phase 5's purchase flow.
export function WalletPopover({ currency, anchorRef, onClose }: WalletPopoverProps) {
  const balance = useBalance(currency);
  const display = CURRENCY_DISPLAY[currency];
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    function place() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = anchorRef.current;
      const target = e.target as Node | null;
      if (!target) return;
      // Ignore clicks inside the anchor (they toggle the popover) or the popover itself.
      if (el && el.contains(target)) return;
      const popover = document.getElementById('wallet-popover');
      if (popover && popover.contains(target)) return;
      onClose();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  const recent = ledger
    .all()
    .filter((t) => t.currency === currency)
    .slice(-5)
    .reverse();

  return (
    <div
      id="wallet-popover"
      role="dialog"
      aria-label={`${display.displayName} wallet`}
      className="fixed z-50 w-72 rounded-xl border border-slate-dark bg-obsidian/95 backdrop-blur-md shadow-xl p-3"
      style={{ top: pos.top, right: pos.right }}
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-dark">
        <span className="font-fantasy text-sm font-bold text-ivory">
          {display.displayName}
        </span>
        <span className="font-fantasy text-xl text-gold tabular-nums">
          {balance.toLocaleString()}
        </span>
      </div>

      <div className="mt-3">
        <h4 className="text-[10px] uppercase tracking-wider text-ash mb-1.5">
          Recent activity
        </h4>
        {recent.length === 0 ? (
          <p className="text-xs text-ash/60 italic py-2">No activity yet.</p>
        ) : (
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {recent.map((t) => (
              <TransactionRow key={t.transactionId} txn={t} />
            ))}
          </ul>
        )}
      </div>

      {currency === 'premium' && (
        <div className="mt-3 pt-2 border-t border-slate-dark">
          <button
            disabled
            className="w-full px-3 py-2 rounded-lg text-xs font-fantasy
              bg-slate-dark/50 text-ash/50 cursor-not-allowed"
            title="Available when the backend wallet ships (Phase 5)"
          >
            Buy more — coming soon
          </button>
        </div>
      )}
    </div>
  );
}

function TransactionRow({ txn }: { txn: EconomyTransaction }) {
  const sign = txn.amount > 0 ? '+' : '';
  const isRefund = txn.type === 'refund';
  const isPending = txn.status === 'pending';
  const isRefunded = txn.status === 'refunded';

  let label = txn.actionId ?? txn.rewardId ?? txn.type;
  if (isRefund) label = `refund (${txn.actionId ?? 'unknown'})`;

  const amountColor =
    txn.amount > 0
      ? '#4ade80'
      : isRefunded
        ? '#94a3b8'
        : isPending
          ? '#fbbf24'
          : '#ef4444';

  return (
    <li className="flex items-center justify-between text-[11px] py-0.5">
      <div className="min-w-0 flex items-center gap-1.5">
        <span
          className="w-1 h-1 rounded-full shrink-0"
          style={{ background: amountColor }}
          aria-hidden="true"
        />
        <span className="truncate text-ash">{label}</span>
      </div>
      <span
        className="font-fantasy tabular-nums shrink-0 ml-2"
        style={{
          color: amountColor,
          textDecoration: isRefunded ? 'line-through' : undefined,
        }}
      >
        {isRefund ? '' : sign}
        {isRefund ? 'refunded' : txn.amount}
      </span>
    </li>
  );
}

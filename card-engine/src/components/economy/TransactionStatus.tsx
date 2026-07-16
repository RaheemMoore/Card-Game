import type { TransactionStatus as TxnStatus } from '../../types/economy';

interface TransactionStatusProps {
  status: TxnStatus;
  message?: string;
}

const STYLES: Record<TxnStatus, { color: string; label: string }> = {
  pending:   { color: '#fbbf24', label: 'Reserved' },
  committed: { color: '#4ade80', label: 'Charged' },
  refunded:  { color: '#60a5fa', label: 'Refunded' },
  failed:    { color: '#ef4444', label: 'Failed' },
  cancelled: { color: '#94a3b8', label: 'Cancelled' },
};

export function TransactionStatus({ status, message }: TransactionStatusProps) {
  const s = STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-fantasy"
      style={{ color: s.color }}
      aria-live="polite"
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
        aria-hidden="true"
      />
      <span>{s.label}</span>
      {message && <span className="text-ash/70">— {message}</span>}
    </span>
  );
}

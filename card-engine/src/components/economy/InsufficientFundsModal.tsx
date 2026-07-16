import type { CurrencyId } from '../../types/economy';
import { CURRENCY_DISPLAY } from '../../data/economy/assumptions';
import { CurrencyCost } from './CurrencyCost';

interface InsufficientFundsModalProps {
  currency: CurrencyId;
  required: number;
  available: number;
  actionLabel: string;
  onClose: () => void;
}

export function InsufficientFundsModal({
  currency,
  required,
  available,
  actionLabel,
  onClose,
}: InsufficientFundsModalProps) {
  const display = CURRENCY_DISPLAY[currency];
  const short = required - available;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="insufficient-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-obsidian border-2 border-power/50 rounded-xl p-5 shadow-[0_0_30px_rgba(220,38,38,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="insufficient-title"
          className="font-fantasy text-lg font-bold text-ivory mb-2"
        >
          Not enough {display.displayName}
        </h3>
        <p className="text-sm text-ash mb-4 leading-relaxed">
          {actionLabel} requires{' '}
          <CurrencyCost currency={currency} amount={required} />, but you only have{' '}
          <CurrencyCost currency={currency} amount={available} />. You're short{' '}
          <CurrencyCost currency={currency} amount={short} />.
        </p>
        <div className="text-xs text-ash/60 mb-4">
          {currency === 'premium'
            ? 'Premium bundle purchases aren\'t available yet in this demo. Use the dev panel to top up.'
            : 'Play more, complete challenges, or use the dev panel to top up.'}
        </div>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg font-fantasy text-sm font-bold
            bg-slate-dark text-ivory hover:bg-slate transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

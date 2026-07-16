import type { CurrencyId } from '../../types/economy';
import { CURRENCY_DISPLAY } from '../../data/economy/assumptions';

interface CurrencyCostProps {
  currency: CurrencyId;
  amount: number;
  insufficient?: boolean;
  size?: 'sm' | 'md';
}

const ICONS: Record<CurrencyId, string> = {
  premium: '/assets/economy/crystal-premium.png',
  gameplay: '/assets/economy/coin-gold.png',
};

// Same normalization as CurrencyBalance: coin needs to render a bit larger
// than the crystal to look like the same visual size.
const ICON_SIZE: Record<CurrencyId, { sm: number; md: number }> = {
  premium: { sm: 13, md: 17 },
  gameplay: { sm: 16, md: 21 },
};

export function CurrencyCost({
  currency,
  amount,
  insufficient = false,
  size = 'sm',
}: CurrencyCostProps) {
  const display = CURRENCY_DISPLAY[currency];
  const iconSize = ICON_SIZE[currency][size];
  return (
    <span
      className="inline-flex items-center gap-1 font-fantasy tabular-nums text-xs"
      style={{ color: insufficient ? '#ef4444' : 'currentColor' }}
      aria-label={`${amount} ${display.displayName}${insufficient ? ' — insufficient balance' : ''}`}
    >
      <img
        src={ICONS[currency]}
        alt=""
        style={{ width: iconSize, height: iconSize, objectFit: 'contain' }}
      />
      <span>{amount}</span>
    </span>
  );
}

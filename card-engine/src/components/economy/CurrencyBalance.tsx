import { useState, useRef, useEffect } from 'react';
import type { CurrencyId } from '../../types/economy';
import { CURRENCY_DISPLAY } from '../../data/economy/assumptions';
import { useBalance } from '../../services/economy/useWallet';
import { WalletPopover } from './WalletPopover';

interface CurrencyBalanceProps {
  currency: CurrencyId;
  variant?: 'nav' | 'inline';
  ariaLabel?: string;
  interactive?: boolean;
}

const ICONS: Record<CurrencyId, string> = {
  premium: '/assets/economy/crystal-premium.png',
  gameplay: '/assets/economy/coin-gold.png',
};

// The two source PNGs have different content-to-canvas ratios: the crystal
// fills its frame edge-to-edge (wispy silhouette), while the round coin
// leaves visible corners. Displaying them at the same pixel size makes the
// crystal look bigger than the coin. Compensate with per-currency sizing so
// both read as the same visual weight in the NavBar.
const ICON_SIZE_NAV: Record<CurrencyId, number> = {
  premium: 24,
  gameplay: 30,
};

const ICON_SIZE_COST: Record<CurrencyId, number> = {
  premium: 13,
  gameplay: 16,
};

const NAV_TEXT: Record<CurrencyId, string> = {
  premium: '#4a3211',
  gameplay: '#4a3211',
};

export function CurrencyBalance({
  currency,
  variant = 'nav',
  ariaLabel,
  interactive = true,
}: CurrencyBalanceProps) {
  const balance = useBalance(currency);
  const display = CURRENCY_DISPLAY[currency];
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const label = ariaLabel ?? `${balance} ${display.displayName}`;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (variant === 'inline') {
    return (
      <span
        className="inline-flex items-center gap-1 tabular-nums font-fantasy"
        aria-label={label}
      >
        <img
          src={ICONS[currency]}
          alt=""
          className="inline-block"
          style={{ width: '1em', height: '1em', objectFit: 'contain' }}
        />
        <span>{balance.toLocaleString()}</span>
      </span>
    );
  }

  const size = ICON_SIZE_NAV[currency];
  const pill = (
    <>
      <img
        src={ICONS[currency]}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))',
        }}
      />
      <span
        className="tabular-nums font-bold"
        style={{ color: NAV_TEXT[currency] }}
      >
        {balance.toLocaleString()}
      </span>
    </>
  );

  // Icons have transparent backgrounds so the chip can sit on the beige nav
  // without a dark contrast band. Subtle warm-tinted chip reads as embedded
  // rather than a floating dot.
  const chipBase = 'rgba(74,50,17,0.10)';
  const chipHover = 'rgba(74,50,17,0.20)';

  if (!interactive) {
    return (
      <div
        className="flex items-center gap-1 pl-0.5 pr-2.5 py-0.5 rounded-full text-xs font-fantasy"
        style={{ background: chipBase }}
        aria-label={label}
      >
        {pill}
      </div>
    );
  }

  return (
    <>
      <button
        ref={anchorRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 pl-0.5 pr-2.5 py-0.5 rounded-full text-xs font-fantasy transition-colors"
        style={{
          background: open ? chipHover : chipBase,
        }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={display.displayName}
      >
        {pill}
      </button>
      {open && (
        <WalletPopover
          currency={currency}
          anchorRef={anchorRef}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

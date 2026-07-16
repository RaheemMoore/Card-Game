import { useState } from 'react';
import type { CurrencyId } from '../../types/economy';
import { CURRENCY_DISPLAY } from '../../data/economy/assumptions';
import * as wallet from '../../services/economy/walletService';
import { useBalance } from '../../services/economy/useWallet';

// Dev-only panel — mounted only when import.meta.env.DEV is true.
// Provides balance readout, one-click reset, and manual top-ups for testing.
export function WalletDevPanel({ onClose }: { onClose: () => void }) {
  const premium = useBalance('premium');
  const gameplay = useBalance('gameplay');
  const [confirmingReset, setConfirmingReset] = useState(false);

  function topUp(currency: CurrencyId, amount: number) {
    wallet.grantReward({
      currency,
      amount,
      rewardId: 'dev_topup',
      metadata: { source: 'dev_panel' },
    });
  }

  function reset() {
    wallet.resetForDev();
    setConfirmingReset(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-panel-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-obsidian border-2 border-dashed border-power/60 rounded-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="dev-panel-title" className="font-fantasy text-lg font-bold text-power">
            Dev — Wallet
          </h3>
          <button
            onClick={onClose}
            className="text-ash hover:text-ivory text-xl leading-none"
            aria-label="Close dev panel"
          >
            ×
          </button>
        </div>
        <p className="text-[10px] text-ash/60 mb-4">
          Dev-only. Not visible in production builds. Manual mutations bypass gameplay rules
          and are logged as reward transactions with rewardId <code>dev_topup</code>.
        </p>

        <div className="space-y-3">
          {(['premium', 'gameplay'] as const).map((currency) => {
            const balance = currency === 'premium' ? premium : gameplay;
            return (
              <div
                key={currency}
                className="rounded-lg border border-slate-dark p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-fantasy text-sm text-ivory">
                    {CURRENCY_DISPLAY[currency].displayName}
                  </span>
                  <span className="font-fantasy text-lg text-gold tabular-nums">
                    {balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  {[10, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => topUp(currency, amt)}
                      className="flex-1 px-2 py-1 rounded bg-slate-dark hover:bg-slate text-ash hover:text-ivory transition-colors"
                    >
                      +{amt}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-dark">
          {!confirmingReset ? (
            <button
              onClick={() => setConfirmingReset(true)}
              className="w-full px-3 py-2 rounded-lg text-xs text-ash hover:text-power
                border border-slate-dark hover:border-power/50 transition-colors"
            >
              Wipe ledger and reseed demo balances
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="flex-1 px-3 py-2 rounded-lg bg-power text-ivory text-xs font-bold hover:bg-power-glow transition-colors"
              >
                Yes, wipe
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-dark text-ash text-xs hover:text-ivory transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

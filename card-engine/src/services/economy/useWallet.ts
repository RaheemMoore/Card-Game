import { useSyncExternalStore } from 'react';
import type { CurrencyId } from '../../types/economy';
import * as wallet from './walletService';

export function useBalance(currency: CurrencyId): number {
  return useSyncExternalStore(
    (cb) => wallet.subscribe(cb),
    () => wallet.getBalance(currency),
    () => wallet.getBalance(currency),
  );
}

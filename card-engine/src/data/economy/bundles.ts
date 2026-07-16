import type { CurrencyBundle } from '../../types/economy';

// Empty until Phase 5 (secure backend + real payments). Populating this before
// server-side receipt verification exists would create a real-money code path
// on top of an unauthenticated localStorage wallet — a fraud vector.
export const CURRENCY_BUNDLES: CurrencyBundle[] = [];

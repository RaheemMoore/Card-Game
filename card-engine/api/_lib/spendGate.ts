import type { VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthedUser } from './auth.js';
import { recordApiUsage } from './recordApiUsage.js';

// Vercel doesn't route folders starting with `_`, so this file isn't a public
// endpoint — it's a shared helper for the api/*.ts handlers.

/**
 * The single place a paid endpoint refuses to spend.
 *
 * THE GATE IS THE CRYSTAL BALANCE, NOT THE ACCOUNT. Every one of these calls
 * costs real Leonardo or Anthropic money, and Forge Crystals are the thing the
 * economy already uses to meter that. So: hold crystals, you may spend; hold
 * none, you may not. New accounts start at zero (DEMO_STARTING_BALANCES), so
 * signing up buys you a look around and nothing that costs Raheem anything.
 *
 * Deliberately NOT a role or email allowlist. Raheem: "No need to lock anyone
 * out. I just want the login screen to be required, and users should start with
 * zero forge tokens." An identity gate would bar an ordinary player from ever
 * forging even after being granted crystals, which is backwards — the grant is
 * supposed to be the permission.
 *
 * WHY IT ALSO LIVES SERVER-SIDE when the client already checks the wallet: the
 * client check is a UX affordance in a bundle anyone can read. Without this, a
 * zero-balance account could call `/api/leonardo` directly and spend anyway.
 *
 * 403, NOT 401 — "you are not signed in" and "you are signed in and out of
 * crystals" are completely different things to tell a person.
 */

export const NO_CRYSTALS = 'no_crystals';
export const BALANCE_LOOKUP_UNAVAILABLE = 'balance_lookup_unavailable';

export interface SpendDenial {
  provider: 'anthropic' | 'leonardo';
  operation: string;
}

let cachedClient: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

/**
 * Current premium balance, or null if it could not be read.
 *
 * There is no wallet table — balance is the `balance_after` of the newest
 * ledger row for this user and currency, which is why this reads
 * `economy_transactions` rather than something more obvious.
 */
export async function readPremiumBalance(userId: string): Promise<number | null> {
  const client = getServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .from('economy_transactions')
    .select('balance_after')
    .eq('user_id', userId)
    .eq('currency', 'premium')
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  // No rows at all is a brand-new account: zero, not "unknown".
  return Number(data?.balance_after ?? 0);
}

/** Returns true when the request was denied and a response has been sent. */
export async function denyIfCannotSpend(
  res: VercelResponse,
  user: AuthedUser,
  { provider, operation }: SpendDenial,
): Promise<boolean> {
  // Operators bypass the balance check so they can never lock themselves out of
  // their own tools by running to zero.
  if (user.isPrivileged) return false;

  const balance = await readPremiumBalance(user.userId);
  if (balance !== null && balance > 0) return false;

  const now = new Date().toISOString();
  const unavailable = balance === null;

  await recordApiUsage({
    provider,
    operation,
    userId: user.userId,
    status: 'error',
    errorCode: unavailable ? BALANCE_LOOKUP_UNAVAILABLE : NO_CRYSTALS,
    costAmount: 0,
    startedAt: now,
    completedAt: now,
    durationMs: 0,
    metadata: { role: user.role, balance, isAnonymous: user.isAnonymous },
  }).catch((err) => console.error('[spendGate] recordApiUsage threw', err));

  res.status(403).json({
    error: unavailable
      ? 'Card generation is unavailable right now.'
      : 'You have no Forge Crystals left.',
    code: unavailable ? BALANCE_LOOKUP_UNAVAILABLE : NO_CRYSTALS,
  });
  return true;
}

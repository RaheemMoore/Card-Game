/**
 * Turn a failed `/api/*` proxy response into something worth showing a person.
 *
 * WHY: the paid endpoints now return **403** when a signed-in account is not
 * permitted to spend (see api/_lib/spendGate.ts). Without this, that arrives in
 * the UI as "Anthropic proxy error: 403" — which reads as a crash, sends the
 * reader looking for a bug, and hides the one sentence that would have
 * explained it. A permission decision is not a fault.
 *
 * 401 and 403 are deliberately different messages: one means sign in, the other
 * means signing in again will not help.
 */

/** Error codes the spend gate can return. Keep in step with api/_lib/spendGate.ts. */
export const NO_CRYSTALS = 'no_crystals';
export const BALANCE_LOOKUP_UNAVAILABLE = 'balance_lookup_unavailable';

export async function describeProxyFailure(
  response: Response,
  provider: string,
): Promise<string> {
  let code: string | undefined;
  let serverMessage: string | undefined;
  try {
    const body = (await response.clone().json()) as { code?: string; error?: string };
    code = body.code;
    serverMessage = body.error;
  } catch {
    // Non-JSON body (a gateway error page, usually). Fall through to the status.
  }

  if (response.status === 401) {
    return 'You are signed out. Sign in and try again.';
  }
  if (response.status === 403) {
    if (code === BALANCE_LOOKUP_UNAVAILABLE) {
      // The balance could not be read at all — a missing service-role key,
      // not an empty wallet. Say so, or this looks like a billing problem and
      // gets debugged in entirely the wrong place.
      return 'Card generation is unavailable right now. This is not a problem with your account.';
    }
    return serverMessage ?? 'You have no Forge Crystals left.';
  }
  if (response.status === 429) {
    return `${provider} is rate limiting us. Wait a moment and try again.`;
  }
  if (response.status >= 500) {
    return `${provider} is having trouble (${response.status}). Try again shortly.`;
  }
  return serverMessage ?? `${provider} request failed (${response.status}).`;
}

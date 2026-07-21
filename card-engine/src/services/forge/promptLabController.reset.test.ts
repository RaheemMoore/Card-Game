import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the paid + network surfaces so runTier can complete without real calls.
vi.mock('../claudeApi', () => ({
  generateCardTextWithRetry: vi.fn(async () => ({
    cardName: 'Testname',
    nameAndTitle: 'Testname, the Proof',
    lore: 'lore',
    portraitPrompt: 'a prompt',
    negativePrompt: 'a negative',
    hiddenFate: undefined,
  })),
}));

vi.mock('../leonardoApi', () => ({
  generatePortraitStrict: vi.fn(async () => ({ dataUrl: 'data:image/png;base64,AAAA' })),
}));

vi.mock('../persistence/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  }),
}));

describe('promptLabController — reset during an in-flight run', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ batchId: 'batch-1', runId: 'run-1' }),
      })) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('a run resolving after resetChain must not repopulate the cleared chain', async () => {
    const lab = await import('./promptLabController');
    lab.resetChain();

    // Kick off Foundation. The synchronous "running" write lands before the
    // first await; resetChain() then clears the chain while the paid calls are
    // still pending.
    const run = lab.runTier('Foundation', undefined, undefined);
    expect(lab.getState().foundation.phase).toBe('running');

    lab.resetChain();
    expect(lab.chainStarted()).toBe(false);

    await run;

    // The zombie run must NOT bring the tier back to "done" or restore batchId.
    expect(lab.getState().foundation.phase).toBe('idle');
    expect(lab.getState().batchId).toBeNull();
    expect(lab.chainStarted()).toBe(false);
  });
});

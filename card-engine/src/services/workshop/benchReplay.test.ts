import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BenchCandidate, BenchState } from './benchController';

/**
 * Free replay of past bench candidates.
 *
 * The bench strips image bytes on every save — they are megabytes and
 * localStorage is not the place for them — but the objects stay in
 * `prompt-test-artifacts` for 30 days. Before this, seeing an earlier
 * candidate again meant paying Leonardo to draw it a second time
 * (PRODUCTION.md §6 named it as *the* gap in the Card image workshop).
 *
 * Two things must hold or the feature silently stops working:
 *   1. `objectPath` survives the persist/hydrate round-trip.
 *   2. Nothing re-fetches an image it already has.
 */

const STORAGE_KEY = 'card-engine-workshop-bench';

vi.mock('../claudeApi', () => ({ generateCardTextWithRetry: vi.fn() }));
vi.mock('../leonardoApi', () => ({ generatePortraitStrict: vi.fn() }));
vi.mock('../persistence/supabaseClient', () => ({
  getSupabaseClient: () => ({
    auth: { getSession: async () => ({ data: { session: { access_token: 'tok' } } }) },
  }),
}));

function candidate(over: Partial<BenchCandidate> = {}): BenchCandidate {
  return {
    runId: 'run-1',
    batchId: 'batch-1',
    createdAt: '2026-08-12T00:00:00.000Z',
    archetype: 'Barbarian',
    element: 'Fire',
    bond: 'Kinship',
    imageDataUrl: '',
    imageStripped: true,
    objectPath: 'Barbarian/batch-1/Foundation/run-1/output.png',
    directive: {},
    overrides: {},
    answers: { answers: [] },
    seedNonce: 1,
    portraitPrompt: 'p',
    negativePrompt: 'n',
    ...over,
  } as BenchCandidate;
}

/** Seed localStorage as though a previous session had persisted these. */
function seedStorage(candidates: BenchCandidate[]): void {
  const state = {
    archetype: 'Barbarian',
    element: 'Fire',
    bond: 'Kinship',
    answers: { answers: [] },
    overrides: {},
    seedNonce: 1,
    batchId: 'batch-1',
    status: { phase: 'idle' },
    candidates,
  } as unknown as BenchState;
  globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

describe('bench free replay', () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('fetches a signed URL for a stripped candidate and renders from it', async () => {
    seedStorage([candidate()]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://signed.example/img.png' }),
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String((fetchMock.mock.calls[0] as unknown as string[])[0]);
    expect(url).toContain('/api/prompt-lab-signed-url');
    expect(url).toContain(encodeURIComponent('Barbarian/batch-1/Foundation/run-1/output.png'));
    expect(bench.getState().candidates[0].replayUrl).toBe('https://signed.example/img.png');
  });

  it('spends nothing on candidates that already have their bytes', async () => {
    seedStorage([candidate({ imageDataUrl: 'data:image/png;base64,AAAA', imageStripped: false })]);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips a candidate that recorded no stored object', async () => {
    seedStorage([candidate({ objectPath: undefined })]);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('marks an aged-out object expired rather than retrying it forever', async () => {
    seedStorage([candidate()]);
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();
    expect(bench.getState().candidates[0].replayExpired).toBe(true);

    // A second pass must not spend another request on a known-dead object.
    await bench.replayStrippedCandidates();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('leaves a network blip retryable instead of declaring the image gone', async () => {
    seedStorage([candidate()]);
    const fetchMock = vi.fn(async () => { throw new Error('offline'); });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();

    const c = bench.getState().candidates[0];
    expect(c.replayExpired).toBeUndefined();
    expect(c.replayUrl).toBeUndefined();
  });

  it('keeps objectPath across a save but never persists the signed URL', async () => {
    seedStorage([candidate()]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ url: 'https://signed.example/img.png' }),
    }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const bench = await import('./benchController');
    await bench.replayStrippedCandidates();

    const saved = JSON.parse(globalThis.localStorage.getItem(STORAGE_KEY)!) as BenchState;
    // The path is what makes the next reload free.
    expect(saved.candidates[0].objectPath).toBe('Barbarian/batch-1/Foundation/run-1/output.png');
    // A signed URL expires in 30 minutes; persisting one renders a broken image.
    expect(saved.candidates[0].replayUrl).toBeUndefined();
  });
});

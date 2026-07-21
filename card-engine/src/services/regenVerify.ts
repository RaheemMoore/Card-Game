import type { ArchetypeName, Card, CardStats, Rank } from '../types/card';
import type { StoryPillarAnswers, ElementSelection } from '../types/bible';
import type { VerifyEvidence } from '../types/archetypeProposal';
import { generateCardTextWithRetry } from './claudeApi';
import { generatePortraitStrict } from './leonardoApi';
import { getPromptTestRun, attachProposalVerifyEvidence } from './persistence/adminService';
import { getSupabaseClient } from './persistence/supabaseClient';
import { getOverallRank } from '../data/powerSystem';

// Regen-verify — closes the Lab → Workshop → fix → verify loop.
//
// A proposal filed from a Prompt Lab test carries `payload.labRunId`. Once the
// proposal is shipped, a reviewer can re-run that exact Lab generation through
// the CURRENT (post-fix) Claude + Leonardo pipeline. We reuse the same shared
// services the production forge and Lab use, persist the fresh generation as a
// new prompt_test_run (so it has an object path + full provenance), and attach
// before/after references to the proposal payload. Only object paths are
// stored — never inline image blobs — matching the P1 payload shrink.

export interface RegenVerifyResult {
  evidence: VerifyEvidence;
  /** Signed URLs resolved for immediate display; may expire (advisory). */
  beforeUrl: string | null;
  afterUrl: string | null;
}

/**
 * Re-runs the Lab generation referenced by `beforeRunId` with the current
 * pipeline, persists the result, and writes the resulting evidence onto the
 * proposal. Throws if the original run can't be reproduced (missing snapshot).
 * This spends Leonardo credits — callers must gate it behind a confirmation.
 */
export async function runRegenVerify(opts: {
  proposalId: string;
  beforeRunId: string;
  onStep?: (step: string) => void;
}): Promise<RegenVerifyResult> {
  const { proposalId, beforeRunId, onStep } = opts;

  onStep?.('Loading original run…');
  const original = await getPromptTestRun(beforeRunId);
  if (!original) throw new Error('Original Lab run not found — cannot reproduce.');

  const snap = original.input_snapshot;
  const archetype = (snap?.archetype ?? original.archetype) as ArchetypeName | undefined;
  const stats = snap?.stats as CardStats | undefined;
  const answers = snap?.answers as StoryPillarAnswers | undefined;
  const element = snap?.element as ElementSelection | undefined;
  const tier = original.tier as Rank;
  if (!archetype || !stats || !answers || !element) {
    throw new Error(
      'Original run is missing inputs (archetype/stats/answers/element) — likely a pre-snapshot run.',
    );
  }

  onStep?.('Generating Claude text (current pipeline)…');
  const startedAt = Date.now();
  const claudeResult = await generateCardTextWithRetry({
    archetype,
    stats,
    answers,
    element,
  });

  onStep?.('Generating Leonardo portrait…');
  const { dataUrl } = await generatePortraitStrict(
    claudeResult.portraitPrompt,
    claudeResult.negativePrompt ?? '',
  );
  const durationMs = Date.now() - startedAt;

  onStep?.('Persisting verify run…');
  const persisted = await recordRegenRun({
    archetype,
    tier,
    inputSnapshot: {
      archetype,
      element,
      answers,
      stats,
      regenVerifyOf: beforeRunId,
    },
    claudeResponse: claudeResult as unknown as Record<string, unknown>,
    leonardoPrompt: claudeResult.portraitPrompt,
    leonardoNegativePrompt: claudeResult.negativePrompt ?? '',
    imageDataUrl: dataUrl,
    durationMs,
  });

  const evidence: VerifyEvidence = {
    ranAt: new Date().toISOString(),
    archetype,
    tier: tier as VerifyEvidence['tier'],
    beforeRunId,
    beforeObjectPath: original.output_object_path,
    afterRunId: persisted.runId,
    afterObjectPath: persisted.outputObjectPath,
  };

  onStep?.('Saving evidence to proposal…');
  await attachProposalVerifyEvidence(proposalId, evidence);

  const [beforeUrl, afterUrl] = await Promise.all([
    original.output_object_path ? signedUrl(original.output_object_path) : Promise.resolve(null),
    persisted.outputObjectPath ? signedUrl(persisted.outputObjectPath) : Promise.resolve(null),
  ]);

  return { evidence, beforeUrl, afterUrl };
}

/**
 * Card-sourced verify — for proposals filed against an existing card rather
 * than a Prompt Lab run. "Before" is the card's CURRENT portrait; "after" is a
 * fresh regen through the current pipeline using the card's own generation
 * inputs (storyPillars + element + stats). Both are persisted as prompt_test_run
 * rows so they display through the same signed-url path as the Lab flow. Spends
 * Leonardo credits — gate behind a confirmation. Throws if the card lacks the
 * Bible-era inputs needed to reproduce it.
 */
export async function runCardRegenVerify(opts: {
  proposalId: string;
  card: Card;
  onStep?: (step: string) => void;
}): Promise<RegenVerifyResult> {
  const { proposalId, card, onStep } = opts;

  const archetype = card.archetype;
  const stats = card.stats;
  const answers = card.storyPillars;
  const element = card.elementSelection;
  if (!answers || !element) {
    throw new Error(
      'This card predates the Bible pipeline (no story pillars / element) — card-sourced verify needs those to reproduce it. File the proposal from a Prompt Lab run instead.',
    );
  }
  if (!card.portraitAsset) {
    throw new Error('This card has no portrait to use as the "before" image.');
  }
  const tier = getOverallRank(stats);

  // "Before" — record the card's existing portrait so it has an object path in
  // the artifacts bucket, matching the "after" for uniform display.
  onStep?.('Capturing current portrait…');
  const beforeDataUrl = await toDataUrl(card.portraitAsset);
  const before = await recordRegenRun({
    archetype,
    tier,
    inputSnapshot: { archetype, element, answers, stats, cardBeforeOf: card.cardId },
    claudeResponse: { note: 'existing card portrait (before)' },
    leonardoPrompt: '(existing card portrait — before)',
    leonardoNegativePrompt: '',
    imageDataUrl: beforeDataUrl,
    durationMs: 0,
  });

  onStep?.('Generating Claude text (current pipeline)…');
  const startedAt = Date.now();
  const claudeResult = await generateCardTextWithRetry({ archetype, stats, answers, element });

  onStep?.('Generating Leonardo portrait…');
  const { dataUrl } = await generatePortraitStrict(
    claudeResult.portraitPrompt,
    claudeResult.negativePrompt ?? '',
  );
  const durationMs = Date.now() - startedAt;

  onStep?.('Persisting verify run…');
  const after = await recordRegenRun({
    archetype,
    tier,
    inputSnapshot: { archetype, element, answers, stats, cardRegenVerifyOf: card.cardId },
    claudeResponse: claudeResult as unknown as Record<string, unknown>,
    leonardoPrompt: claudeResult.portraitPrompt,
    leonardoNegativePrompt: claudeResult.negativePrompt ?? '',
    imageDataUrl: dataUrl,
    durationMs,
  });

  const evidence: VerifyEvidence = {
    ranAt: new Date().toISOString(),
    archetype,
    tier: tier as VerifyEvidence['tier'],
    source: 'card',
    beforeRunId: before.runId,
    beforeObjectPath: before.outputObjectPath,
    afterRunId: after.runId,
    afterObjectPath: after.outputObjectPath,
  };

  onStep?.('Saving evidence to proposal…');
  await attachProposalVerifyEvidence(proposalId, evidence);

  const [beforeUrl, afterUrl] = await Promise.all([
    before.outputObjectPath ? signedUrl(before.outputObjectPath) : Promise.resolve(null),
    after.outputObjectPath ? signedUrl(after.outputObjectPath) : Promise.resolve(null),
  ]);

  return { evidence, beforeUrl, afterUrl };
}

/** Fetches an image reference (data URL or http URL) into a data URL. */
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  const resp = await fetch(src);
  if (!resp.ok) throw new Error(`Could not load the card's portrait (${resp.status}).`);
  const blob = await resp.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read portrait image.'));
    reader.readAsDataURL(blob);
  });
}

/** Persists an existing verdict/note edit without re-running generation. */
export async function saveVerifyVerdict(
  proposalId: string,
  evidence: VerifyEvidence,
  patch: { verdict?: VerifyEvidence['verdict']; note?: string },
): Promise<VerifyEvidence> {
  const next: VerifyEvidence = { ...evidence, ...patch };
  await attachProposalVerifyEvidence(proposalId, next);
  return next;
}

// ---- Storage helpers (mirror AdminPromptLab's record + signed-url paths) --

interface RecordRegenInput {
  archetype: ArchetypeName;
  tier: Rank;
  inputSnapshot: Record<string, unknown>;
  claudeResponse: Record<string, unknown>;
  leonardoPrompt: string;
  leonardoNegativePrompt: string;
  imageDataUrl: string;
  durationMs: number;
}

async function recordRegenRun(
  input: RecordRegenInput,
): Promise<{ runId: string; outputObjectPath: string | null }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase not configured');
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No Supabase session');
  const r = await fetch('/api/prompt-lab-record', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      run: {
        archetype: input.archetype,
        tier: input.tier,
        status: 'success',
        inputSnapshot: input.inputSnapshot,
        claudeModel: 'claude-haiku-4-5-20251001',
        claudePrompt: '(regen-verify; see claude_response for output shape)',
        claudeResponse: input.claudeResponse,
        leonardoPrompt: input.leonardoPrompt,
        leonardoNegativePrompt: input.leonardoNegativePrompt,
        imageDataUrl: input.imageDataUrl,
        durationMs: input.durationMs,
      },
      ensureBatch: { intent: 'regen-verify' },
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Verify record failed (${r.status}): ${txt}`);
  }
  const body = (await r.json()) as { runId: string; outputPath: string | null };
  return { runId: body.runId, outputObjectPath: body.outputPath };
}

export async function signedUrl(path: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  try {
    const r = await fetch(`/api/prompt-lab-signed-url?path=${encodeURIComponent(path)}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { url?: string };
    return body.url ?? null;
  } catch {
    return null;
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyUser } from './_lib/auth.js';

// Server side of the Prompt Lab. Accepts the completed test package
// from the admin's browser (which ran the same shared Claude + Leonardo
// production services), uploads the generated image into the private
// prompt-test-artifacts bucket, and inserts a prompt_test_runs row.
//
// Client never talks to Supabase Storage directly for these images so
// the bucket can stay closed (only service_role writes; admins read
// through signed URLs minted by /api/prompt-lab-signed-url).

export const config = { maxDuration: 30 };

let cachedAdmin: SupabaseClient | null = null;
function getAdminClient(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cachedAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedAdmin;
}

interface RunRecord {
  batchId: string;
  archetype: string;
  tier: 'Foundation' | 'Forged' | 'Ascendant';
  parentRunId?: string;
  status: 'success' | 'error';
  inputSnapshot: Record<string, unknown>;
  claudeModel?: string;
  claudePrompt?: string;
  claudeResponse?: Record<string, unknown>;
  claudeInputTokens?: number;
  claudeOutputTokens?: number;
  claudeCostUsd?: number;
  leonardoModel?: string;
  leonardoPrompt?: string;
  leonardoNegativePrompt?: string;
  leonardoSettings?: Record<string, unknown>;
  leonardoGenerationId?: string;
  leonardoCostUsd?: number;
  // Image bytes as a data URL from generatePortraitStrict.
  imageDataUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

interface Request {
  run: RunRecord;
  /** Missing → server creates a fresh batch with this archetype + intent. */
  ensureBatch?: { intent?: string };
}

const RETENTION_DAYS = 30;

function decodeDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }
  const admin = getAdminClient();
  if (!admin) {
    res.status(500).json({ error: 'Supabase service role not configured' });
    return;
  }

  const body: Request = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as Request);
  const { run, ensureBatch } = body;
  if (!run || !run.archetype || !run.tier || !run.inputSnapshot) {
    res.status(400).json({ error: 'Missing required run fields' });
    return;
  }

  // Look up or create the batch.
  let batchId = run.batchId;
  if (!batchId) {
    const { data: created, error: batchErr } = await admin
      .from('prompt_test_batches')
      .insert({
        owner_user_id: caller.userId,
        archetype: run.archetype,
        intent: ensureBatch?.intent ?? null,
      })
      .select('id')
      .single();
    if (batchErr || !created) {
      res.status(500).json({ error: `Batch create failed: ${batchErr?.message}` });
      return;
    }
    batchId = created.id;
  }

  // Insert the row first so we have a run_id for the storage path.
  const startedAt = new Date().toISOString();
  const { data: runRow, error: runErr } = await admin
    .from('prompt_test_runs')
    .insert({
      batch_id: batchId,
      parent_run_id: run.parentRunId ?? null,
      archetype: run.archetype,
      tier: run.tier,
      status: run.status,
      input_snapshot: run.inputSnapshot,
      claude_model: run.claudeModel ?? null,
      claude_prompt: run.claudePrompt ?? null,
      claude_response: run.claudeResponse ?? null,
      claude_input_tokens: run.claudeInputTokens ?? null,
      claude_output_tokens: run.claudeOutputTokens ?? null,
      claude_cost_usd: run.claudeCostUsd ?? null,
      leonardo_model: run.leonardoModel ?? null,
      leonardo_prompt: run.leonardoPrompt ?? null,
      leonardo_negative_prompt: run.leonardoNegativePrompt ?? null,
      leonardo_settings: run.leonardoSettings ?? null,
      leonardo_generation_id: run.leonardoGenerationId ?? null,
      leonardo_cost_usd: run.leonardoCostUsd ?? null,
      error_message: run.errorMessage ?? null,
      duration_ms: run.durationMs ?? null,
      started_at: startedAt,
      completed_at: startedAt,
      image_expires_at: new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single();
  if (runErr || !runRow) {
    res.status(500).json({ error: `Run insert failed: ${runErr?.message}` });
    return;
  }
  const runId = runRow.id;

  // Upload the image if present.
  let outputPath: string | null = null;
  if (run.imageDataUrl && run.status === 'success') {
    const decoded = decodeDataUrl(run.imageDataUrl);
    if (decoded) {
      const ext = decoded.mime === 'image/png' ? 'png' : 'jpg';
      const path = `${run.archetype}/${batchId}/${run.tier}/${runId}/output.${ext}`;
      const { error: uploadErr } = await admin.storage
        .from('prompt-test-artifacts')
        .upload(path, decoded.buffer, {
          contentType: decoded.mime,
          upsert: true,
        });
      if (uploadErr) {
        // Non-fatal: row is already persisted with the prompt provenance.
        console.error('[prompt-lab-record] image upload failed', uploadErr);
      } else {
        outputPath = path;
        await admin.from('prompt_test_runs').update({ output_object_path: path }).eq('id', runId);
      }
    }
  }

  res.status(200).json({
    batchId,
    runId,
    outputPath,
  });
}

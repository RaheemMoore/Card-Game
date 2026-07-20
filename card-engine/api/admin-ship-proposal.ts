import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyUser } from './_lib/auth.js';

// Admin-only "Merge & ship" endpoint — the guarded half of the approve→merge
// link. Raheem approves in the console (status → approved); this endpoint then
// merges the proposal's PR into main via the GitHub API and marks the proposal
// shipped with the real merge commit SHA. Vercel's auto-deploy on `main` ships
// it. A director can never call this (isAdmin gate) and the DB write uses the
// service role so it is server-authoritative.
//
// Requires env: GITHUB_TOKEN (fine-grained PAT with Contents + Pull requests
// read/write on the repo), plus the existing SUPABASE_* server vars.

export const config = { maxDuration: 30 };

const GITHUB_OWNER = process.env.GITHUB_OWNER ?? 'RaheemMoore';
const GITHUB_REPO = process.env.GITHUB_REPO ?? 'Card-Game';

function adminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const caller = await verifyUser(req);
  if (!caller || !caller.isAdmin) {
    res.status(403).json({ error: 'Admin only' });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN not configured on server.' });
    return;
  }
  const db = adminClient();
  if (!db) {
    res.status(500).json({ error: 'Supabase service role not configured on server.' });
    return;
  }

  const proposalId = (req.body as { proposalId?: string } | undefined)?.proposalId;
  if (!proposalId) {
    res.status(400).json({ error: 'proposalId is required.' });
    return;
  }

  // Read the proposal server-side; trust the DB, not the client, for status + PR.
  const { data: row, error: readErr } = await db
    .from('archetype_proposals')
    .select('id, status, payload')
    .eq('id', proposalId)
    .maybeSingle();
  if (readErr) {
    res.status(500).json({ error: `Read failed: ${readErr.message}` });
    return;
  }
  if (!row) {
    res.status(404).json({ error: 'Proposal not found.' });
    return;
  }
  if (row.status !== 'approved') {
    res.status(409).json({ error: `Proposal is "${row.status}", not "approved" — approve it before shipping.` });
    return;
  }
  const prNumber = (row.payload as { prNumber?: number } | null)?.prNumber;
  if (!prNumber) {
    res.status(409).json({ error: 'Proposal has no linked PR (payload.prNumber) to merge.' });
    return;
  }

  // Merge the PR via the GitHub REST API. A 405 here usually means the PR is
  // not mergeable (conflicts / failing required checks / branch protection the
  // token identity can't satisfy) — surfaced verbatim so Raheem can act.
  const ghUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/${prNumber}/merge`;
  let mergeSha: string;
  try {
    const gh = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'card-engine-ship',
      },
      body: JSON.stringify({
        merge_method: 'squash',
        commit_title: `Ship workshop proposal ${proposalId.slice(0, 8)} (PR #${prNumber})`,
      }),
    });
    const body = (await gh.json().catch(() => ({}))) as { merged?: boolean; sha?: string; message?: string };
    if (!gh.ok || !body.merged || !body.sha) {
      res.status(502).json({ error: `GitHub merge failed (${gh.status}): ${body.message ?? 'not merged'}` });
      return;
    }
    mergeSha = body.sha;
  } catch (err) {
    res.status(502).json({ error: `GitHub merge request failed: ${String(err)}` });
    return;
  }

  // Mark shipped with the real merge SHA (service role → authoritative).
  const { error: updErr } = await db
    .from('archetype_proposals')
    .update({ status: 'shipped', commit_sha: mergeSha, decided_at: new Date().toISOString() })
    .eq('id', proposalId);
  if (updErr) {
    // The PR merged but we couldn't record it — report so Raheem can reconcile.
    res.status(500).json({
      error: `PR #${prNumber} merged (${mergeSha.slice(0, 7)}) but recording shipped failed: ${updErr.message}`,
      mergedSha: mergeSha,
    });
    return;
  }

  res.status(200).json({ shipped: true, prNumber, commitSha: mergeSha });
}

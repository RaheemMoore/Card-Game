import { useState } from 'react';
import { getSupabaseClient } from '../services/persistence/supabaseClient';
import {
  AdminPage, AdminSection, AdminCard, AdminButton, AdminStatusBadge, AdminAlert,
} from '../components/admin/ui';

// Phase-0 spike display for the provider diagnostic endpoints. Guard +
// header live on AdminShell now — this page just renders the two Run
// probe cards and their JSON output.

type ProbeState = 'idle' | 'running' | 'done' | 'error';

interface ProbeSlot {
  state: ProbeState;
  status?: number;
  body?: unknown;
  error?: string;
}

const EMPTY: ProbeSlot = { state: 'idle' };

async function runProbe(path: string): Promise<ProbeSlot> {
  const supabase = getSupabaseClient();
  if (!supabase) return { state: 'error', error: 'Supabase not configured' };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { state: 'error', error: 'No Supabase session' };
  try {
    const r = await fetch(path, {
      headers: { authorization: `Bearer ${token}` },
    });
    const text = await r.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { state: 'done', status: r.status, body };
  } catch (err) {
    return { state: 'error', error: String(err) };
  }
}

export function AdminDiagnostics() {
  const [anthropic, setAnthropic] = useState<ProbeSlot>(EMPTY);
  const [leonardo, setLeonardo] = useState<ProbeSlot>(EMPTY);
  const [migrateArt, setMigrateArt] = useState<ProbeSlot>(EMPTY);

  const run = async (
    path: string,
    setter: (s: ProbeSlot) => void,
  ): Promise<void> => {
    setter({ state: 'running' });
    setter(await runProbe(path));
  };

  const migrate = async (): Promise<void> => {
    setMigrateArt({ state: 'running' });
    const supabase = getSupabaseClient();
    if (!supabase) {
      setMigrateArt({ state: 'error', error: 'Supabase not configured' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setMigrateArt({ state: 'error', error: 'No Supabase session' });
      return;
    }
    try {
      const r = await fetch('/api/admin-migrate-ability-art', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      });
      const text = await r.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
      setMigrateArt({ state: 'done', status: r.status, body });
    } catch (err) {
      setMigrateArt({ state: 'error', error: String(err) });
    }
  };

  return (
    <AdminPage
      title="Diagnostics"
      description="Tools that don't fit anywhere else. Each card fires an admin-only server endpoint and prints the raw JSON so you can inspect provider behavior or run a housekeeping migration without leaving the browser. Probes are safe to run any time; migrations are one-shot — read the description before firing."
    >
      <AdminSection title="Provider probes" subtitle="Read-only — safe to run any time">
        <div className="space-y-3">
          <ProbeCard
            title="Anthropic Admin API"
            endpoint="/api/anthropic-admin-usage"
            slot={anthropic}
            onRun={() => run('/api/anthropic-admin-usage', setAnthropic)}
          />
          <ProbeCard
            title="Leonardo Account"
            endpoint="/api/leonardo-account"
            slot={leonardo}
            onRun={() => run('/api/leonardo-account', setLeonardo)}
          />
        </div>
      </AdminSection>

      <AdminSection title="One-shot migrations" subtitle="Destructive / irreversible — confirm before firing">
        <ProbeCard
          title="Migrate ability art (data URL → bucket)"
          endpoint="/api/admin-migrate-ability-art"
          description={
            'One-shot housekeeping. Walks canonical_art_assets, finds rows where asset_url still starts with data: (image bytes stored inline in the DB, ~200KB per row), uploads those bytes into the private ability-art Supabase Storage bucket, and rewrites asset_url + the crops inside the row\'s data jsonb to the new public bucket URL. Idempotent — rows already pointing at https URLs are skipped. Run once after Phase 4 landed; no need to run again unless new data-URL rows appear.'
          }
          slot={migrateArt}
          onRun={migrate}
          actionLabel="Run migration"
          danger
          confirmMessage="Run the ability-art migration? This rewrites canonical_art_assets rows in place. It's idempotent but not trivially reversible."
        />
      </AdminSection>
    </AdminPage>
  );
}

function ProbeCard(props: {
  title: string;
  endpoint: string;
  description?: string;
  slot: ProbeSlot;
  onRun: () => void;
  actionLabel?: string;
  danger?: boolean;
  confirmMessage?: string;
}) {
  const { title, endpoint, description, slot, onRun, actionLabel, danger, confirmMessage } = props;
  const disabled = slot.state === 'running';

  const handleRun = () => {
    if (danger && confirmMessage && !confirm(confirmMessage)) return;
    onRun();
  };

  return (
    <AdminCard surface="strong">
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold" style={{ color: 'var(--admin-text)' }}>{title}</h3>
            {danger && <AdminStatusBadge tone="danger">destructive</AdminStatusBadge>}
          </div>
          <code className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{endpoint}</code>
          {description && <p className="text-xs mt-2" style={{ color: 'var(--admin-text-muted)' }}>{description}</p>}
        </div>
        <AdminButton
          type="button"
          size="sm"
          variant={danger ? 'danger' : 'primary'}
          onClick={handleRun}
          disabled={disabled}
          className="shrink-0"
        >
          {slot.state === 'running' ? 'Running…' : actionLabel ?? 'Run probe'}
        </AdminButton>
      </div>

      {slot.state === 'error' && <AdminAlert tone="danger">{slot.error}</AdminAlert>}

      {slot.state === 'done' && (
        <>
          <div className="text-xs mb-2 flex items-center gap-2">
            <AdminStatusBadge tone={slot.status && slot.status >= 200 && slot.status < 300 ? 'success' : 'danger'}>
              HTTP {slot.status}
            </AdminStatusBadge>
          </div>
          <pre
            className="text-xs p-3 rounded overflow-x-auto max-h-[60vh] whitespace-pre-wrap font-mono"
            style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--admin-text)', border: '1px solid var(--admin-border)' }}
          >
            {JSON.stringify(slot.body, null, 2)}
          </pre>
        </>
      )}
    </AdminCard>
  );
}

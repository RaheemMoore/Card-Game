import { useState } from 'react';
import { getSupabaseClient } from '../services/persistence/supabaseClient';

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
    <div className="space-y-6">
      <p className="text-sm text-bone/70">
        Admin diagnostics + one-shot migrations.
      </p>

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
      <ProbeCard
        title="Migrate ability art (data URL → bucket)"
        endpoint="/api/admin-migrate-ability-art"
        slot={migrateArt}
        onRun={migrate}
        actionLabel="Run migration"
      />
    </div>
  );
}

function ProbeCard(props: {
  title: string;
  endpoint: string;
  slot: ProbeSlot;
  onRun: () => void;
  actionLabel?: string;
}) {
  const { title, endpoint, slot, onRun, actionLabel } = props;
  const disabled = slot.state === 'running';
  return (
    <section className="border border-bone/20 rounded-lg p-4 bg-void/60">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-fantasy text-lg font-bold text-bone">{title}</h2>
          <code className="text-xs text-bone/50">{endpoint}</code>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={disabled}
          className="px-3 py-1.5 rounded font-fantasy font-bold text-xs bg-gold/80 text-void hover:bg-gold disabled:opacity-50"
        >
          {slot.state === 'running' ? 'Running…' : actionLabel ?? 'Run probe'}
        </button>
      </div>
      {slot.state === 'error' && (
        <div className="text-sm text-red-400 font-mono">{slot.error}</div>
      )}
      {slot.state === 'done' && (
        <>
          <div className="text-xs text-bone/60 mb-2">HTTP {slot.status}</div>
          <pre className="text-xs text-bone/80 bg-black/40 p-3 rounded overflow-x-auto max-h-[60vh] whitespace-pre-wrap">
            {JSON.stringify(slot.body, null, 2)}
          </pre>
        </>
      )}
    </section>
  );
}

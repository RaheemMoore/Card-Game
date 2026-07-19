import { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { fetchIsAdmin, getSupabaseClient } from '../services/persistence/supabaseClient';

// Phase-0 spike display for the provider diagnostic endpoints. Runs the
// admin-only /api/anthropic-admin-usage and /api/leonardo-account probes
// with the caller's Supabase JWT attached and pretty-prints the JSON so
// Raheem can share it back for review.

type GuardState = 'checking' | 'allowed' | 'denied';
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
  const [guard, setGuard] = useState<GuardState>('checking');
  const [anthropic, setAnthropic] = useState<ProbeSlot>(EMPTY);
  const [leonardo, setLeonardo] = useState<ProbeSlot>(EMPTY);

  useEffect(() => {
    void fetchIsAdmin().then((ok) => setGuard(ok ? 'allowed' : 'denied'));
  }, []);

  if (guard === 'checking') return <div className="p-8 text-bone/70">Checking access…</div>;
  if (guard === 'denied') return <Navigate to="/" replace />;

  const run = async (
    path: string,
    setter: (s: ProbeSlot) => void,
  ): Promise<void> => {
    setter({ state: 'running' });
    setter(await runProbe(path));
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-fantasy text-2xl font-bold text-bone">Admin Diagnostics</h1>
        <Link to="/admin" className="text-xs text-bone/60 hover:text-bone underline">
          Back to Admin
        </Link>
      </div>
      <p className="text-sm text-bone/70">
        Phase-0 spike output. Runs the two admin-only provider probes and prints raw JSON.
        Share the results with Claude to size the Overview provider modules.
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
    </div>
  );
}

function ProbeCard(props: {
  title: string;
  endpoint: string;
  slot: ProbeSlot;
  onRun: () => void;
}) {
  const { title, endpoint, slot, onRun } = props;
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
          {slot.state === 'running' ? 'Running…' : 'Run probe'}
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

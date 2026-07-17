import { useSyncExternalStore } from 'react';
import { getStatus, subscribe } from '../services/persistence/SyncQueue';
import { isSupabaseConfigured } from '../services/persistence/supabaseClient';

// Small header pill reflecting SyncQueue state. Hidden on the legacy
// path since there's no queue there. Idle state is intentionally muted
// so it doesn't compete with the other nav elements.
export function SyncStatusPill() {
  const status = useSyncExternalStore(subscribe, getStatus, getStatus);

  if (!isSupabaseConfigured()) return null;

  const styles = {
    idle: {
      background: 'rgba(74,50,17,0.08)',
      color: '#4a3211',
      border: '1px solid rgba(74,50,17,0.15)',
    },
    syncing: {
      background: 'rgba(59,130,246,0.15)',
      color: '#1e40af',
      border: '1px solid rgba(59,130,246,0.35)',
    },
    error: {
      background: 'rgba(220,38,38,0.15)',
      color: '#8a1c1c',
      border: '1px solid rgba(220,38,38,0.35)',
    },
  }[status];

  const label = status === 'idle' ? 'Synced' : status === 'syncing' ? 'Syncing…' : 'Sync error';
  const title =
    status === 'error'
      ? 'One or more writes to Supabase failed. Retries continue in the background.'
      : status === 'syncing'
        ? 'Writing changes to Supabase.'
        : 'All local changes are saved.';

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-fantasy font-bold tracking-wider uppercase inline-flex items-center gap-1"
      style={styles}
      title={title}
      aria-live="polite"
    >
      {status === 'syncing' && (
        <span
          className="inline-block w-2 h-2 rounded-full border border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {status === 'error' && <span aria-hidden="true">!</span>}
      {label}
    </span>
  );
}

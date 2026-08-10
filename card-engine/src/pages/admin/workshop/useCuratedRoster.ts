import { useEffect, useState, useSyncExternalStore } from 'react';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';

/**
 * Subscribes a component to the curated roster and hydrates it once per
 * session.
 *
 * Hydration failure is surfaced rather than swallowed. The roster is the
 * permanent side of the game — an operator seeing an empty board must be able
 * to tell "nothing has been authored yet" from "the read failed", because those
 * two look identical and mean opposite things.
 */
export function useCuratedRoster(): {
  version: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
} {
  const store = getCuratedRosterStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!store.isHydrated());
  const [nonce, setNonce] = useState(0);

  // A counter that changes on every store notification — enough to re-render;
  // components read the data straight off the store's synchronous getters.
  const version = useSyncExternalStore(
    (fn) => store.subscribe(fn),
    () => storeVersion,
    () => storeVersion,
  );

  useEffect(() => {
    let cancelled = false;
    if (store.isHydrated() && nonce === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    store
      .hydrate()
      .then(() => {
        if (cancelled) return;
        bumpVersion();
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [store, nonce]);

  return { version, loading, error, reload: () => setNonce((n) => n + 1) };
}

// The store notifies without carrying a value, so a module-level counter gives
// useSyncExternalStore a stable snapshot to compare.
let storeVersion = 0;
function bumpVersion(): void {
  storeVersion += 1;
}

// Keep the counter moving for writes that happen outside hydrate().
getCuratedRosterStore().subscribe(bumpVersion);

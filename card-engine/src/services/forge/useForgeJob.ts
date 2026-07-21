import { useSyncExternalStore } from 'react';
import * as forge from './forgeController';
import type { ForgeJob } from './forgeController';

export function useForgeJob(): ForgeJob | null {
  return useSyncExternalStore(
    (cb) => forge.subscribe(cb),
    () => forge.getJob(),
    () => forge.getJob(),
  );
}

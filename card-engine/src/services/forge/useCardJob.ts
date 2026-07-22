import { useSyncExternalStore } from 'react';
import * as cardJob from './cardJobController';
import type { CardJob } from './cardJobController';

export function useCardJob(): CardJob | null {
  return useSyncExternalStore(
    (cb) => cardJob.subscribe(cb),
    () => cardJob.getJob(),
    () => cardJob.getJob(),
  );
}

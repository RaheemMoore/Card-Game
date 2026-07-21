import { useSyncExternalStore } from 'react';
import * as lab from './promptLabController';
import type { LabChainState } from './promptLabController';

export function usePromptLabChain(): LabChainState {
  return useSyncExternalStore(
    (cb) => lab.subscribe(cb),
    () => lab.getState(),
    () => lab.getState(),
  );
}

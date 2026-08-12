import { useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router-dom';
import * as bench from '../../services/workshop/benchController';

/**
 * "A paid generation is still running" — floating over every admin route.
 *
 * Mounted once in AdminShell. `benchController` runs its generations at module
 * scope precisely so navigating away mid-run does not kill them, which leaves
 * a hole: an operator can start a Leonardo call, walk to another stage, and
 * have nothing on screen saying money is still moving. This pill is that
 * signal, and clicking it goes back to the bench.
 *
 * Repointed from `promptLabController` to `benchController` when the Prompt Lab
 * was retired (2026-08-12). The indicator deliberately OUTLIVED the page it was
 * built for: losing it would have been a regression smuggled in as a cleanup.
 */
export function LabIndicator() {
  const navigate = useNavigate();
  const state = useSyncExternalStore(bench.subscribe, bench.getState, bench.getState);

  if (state.status.phase !== 'running') return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/admin/workshop?stage=bench')}
      aria-label={`The bench is generating a ${state.archetype} candidate — return to it`}
      title={state.status.step}
      className="fixed z-50 bottom-6 right-6 flex items-center gap-2 rounded-full pl-2 pr-4 py-2
        font-semibold text-sm shadow-lg transition-transform hover:scale-105 forge-pulse"
      style={{
        background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
        color: '#7dd3fc',
        border: '1px solid rgba(56,189,248,0.4)',
      }}
    >
      <span
        className="flex items-center justify-center w-7 h-7 rounded-full"
        style={{ background: 'rgba(0,0,0,0.3)' }}
      >
        <span className="w-3.5 h-3.5 border-2 border-sky-300/40 border-t-sky-300 rounded-full animate-spin" />
      </span>
      <span className="whitespace-nowrap">Bench · {state.archetype}</span>
    </button>
  );
}

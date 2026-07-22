import { useNavigate } from 'react-router-dom';
import { usePromptLabChain } from '../../services/forge/usePromptLabChain';

/**
 * Global Prompt Lab indicator. Mounted once in AdminShell so it floats over
 * every admin route. The promptLabController already runs tier generations in
 * module scope (they survive navigating to another admin page) — but nothing
 * told the admin a run was still cooking once they left. This pill does: while
 * any tier slot is running it pulses, and clicking jumps back to the Lab.
 */
export function LabIndicator() {
  const navigate = useNavigate();
  const chain = usePromptLabChain();

  const runningTier =
    chain.foundation.phase === 'running'
      ? 'Foundation'
      : chain.forged.phase === 'running'
        ? 'Forged'
        : chain.ascendant.phase === 'running'
          ? 'Ascendant'
          : null;

  if (!runningTier) return null;

  const step =
    (chain.foundation.phase === 'running' && chain.foundation.step) ||
    (chain.forged.phase === 'running' && chain.forged.step) ||
    (chain.ascendant.phase === 'running' && chain.ascendant.step) ||
    'Generating…';

  return (
    <button
      type="button"
      onClick={() => navigate('/admin/prompt-lab')}
      aria-label={`Prompt Lab is generating the ${runningTier} tier — return to the Lab`}
      title={step}
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
      <span className="whitespace-nowrap">Lab · {runningTier}</span>
    </button>
  );
}

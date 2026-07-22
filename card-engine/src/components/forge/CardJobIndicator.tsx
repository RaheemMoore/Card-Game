import { useNavigate } from 'react-router-dom';
import { useCardJob } from '../../services/forge/useCardJob';

/**
 * Global reforge / tier-up indicator. Mounted once in PlayerShell so it floats
 * over every player route. While a card's portrait is being rerolled or the
 * card is evolving, it shows a glowing, pulsing pill the player can click to
 * jump back to that card; when the work is done it flips to a celebratory
 * state. This is what lets a player leave the Card Detail mid-evolution and
 * still know their card is coming — the same guarantee the forge gives.
 *
 * Positioned above ForgeIndicator so the two never overlap if both are live.
 */
export function CardJobIndicator() {
  const navigate = useNavigate();
  const job = useCardJob();

  if (!job || job.status === 'failed') return null;

  const ready = job.status === 'succeeded';
  const pulsing = !ready;
  const label = ready
    ? 'Card ready!'
    : job.status === 'awaiting-path'
      ? 'Path awaits'
      : job.kind === 'reforge'
        ? 'Rebuilding…'
        : 'Evolving…';

  return (
    <button
      type="button"
      onClick={() => navigate(`/card/${job.cardId}`)}
      aria-label={
        ready
          ? `${job.cardName} is ready — view it`
          : `${job.cardName} is ${job.kind === 'reforge' ? 'being rebuilt' : 'evolving'} — return to the card`
      }
      title={ready ? `${job.cardName} is ready!` : job.step}
      className={`fixed z-50 bottom-40 right-4 lg:bottom-20 lg:right-6 flex items-center gap-2
        rounded-full pl-2 pr-4 py-2 font-fantasy text-sm font-bold shadow-lg transition-transform
        hover:scale-105 ${pulsing ? 'forge-pulse' : ''}`}
      style={{
        background: ready
          ? 'linear-gradient(to bottom, #d4a03c, #b8860b)'
          : 'linear-gradient(to bottom, #3a2a12, #241708)',
        color: ready ? '#241708' : '#f4d78a',
        border: `1px solid ${ready ? '#f4d78a' : 'rgba(212,160,60,0.5)'}`,
      }}
    >
      <span
        className="flex items-center justify-center w-8 h-8 rounded-full"
        style={{ background: 'rgba(0,0,0,0.25)' }}
      >
        <SparkGlyph color={ready ? '#241708' : '#f4d78a'} />
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function SparkGlyph({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Four-point sparkle — evolution / reforge */}
      <path
        d="M12 2l2.2 6.3L20 10.5l-5.8 2.2L12 19l-2.2-6.3L4 10.5l5.8-2.2L12 2z"
        fill={color}
      />
    </svg>
  );
}

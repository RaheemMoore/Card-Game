import { useNavigate } from 'react-router-dom';
import { useForgeJob } from '../../services/forge/useForgeJob';

/**
 * Global forge indicator. Mounted once in PlayerShell so it floats over every
 * player route. While a card is forging it shows a glowing, pulsing anvil the
 * player can click to jump back to the forge; when the card is ready it flips to
 * a celebratory state. This is what lets a player leave the forge mid-ritual and
 * still know their card is coming.
 */
export function ForgeIndicator() {
  const navigate = useNavigate();
  const job = useForgeJob();

  if (!job || (job.status !== 'running' && job.status !== 'succeeded')) return null;

  const ready = job.status === 'succeeded';

  return (
    <button
      type="button"
      onClick={() => navigate('/forge')}
      aria-label={ready ? 'Your card is ready — view it' : 'A card is forging — return to the forge'}
      title={ready ? 'Your card is ready!' : 'Forging your card…'}
      className={`fixed z-50 bottom-24 right-4 lg:bottom-6 lg:right-6 flex items-center gap-2
        rounded-full pl-2 pr-4 py-2 font-fantasy text-sm font-bold shadow-lg transition-transform
        hover:scale-105 ${ready ? '' : 'forge-pulse'}`}
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
        <AnvilGlyph glowing={!ready} />
      </span>
      <span className="whitespace-nowrap">{ready ? 'Card ready!' : 'Forging…'}</span>
    </button>
  );
}

function AnvilGlyph({ glowing }: { glowing: boolean }) {
  const stroke = glowing ? '#f4d78a' : '#241708';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {/* Anvil body */}
      <path
        d="M3 8h13c0 2.5-1.8 3.2-3.5 3.5V13h3l-1.5 3.5H7L5.5 13h3v-1.5C6.5 11.2 4 10.8 4 8H3z"
        fill={stroke}
      />
      {/* Base */}
      <path d="M6 18h9v1.5H6z" fill={stroke} />
    </svg>
  );
}

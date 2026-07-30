import { DESTINATIONS, type Stall } from './courtyard/stalls';

/**
 * The two non-spatial surfaces: the Directory (reach any destination without
 * walking) and the placeholder shown when a stall is opened.
 *
 * The Directory reads from the same DESTINATIONS array the stalls and
 * colliders use, so it cannot list something the courtyard doesn't have.
 */

const PANEL =
  'w-full max-w-sm rounded-xl border border-amber-200/25 bg-[#171320]/95 p-5 shadow-2xl';

export function DirectoryPanel({
  onPick,
  onClose,
}: {
  onPick: (stall: Stall) => void;
  onClose: () => void;
}) {
  return (
    <Scrim onClose={onClose} label="Courtyard directory">
      <div className={PANEL}>
        <h2 className="font-fantasy text-xl text-amber-200 tracking-wide">Directory</h2>
        <p className="text-xs text-white/50 mt-1">
          Every destination in the courtyard, without the walk.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {DESTINATIONS.map((stall) => (
            <li key={stall.id}>
              <button
                onClick={() => onPick(stall)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-white/15 hover:border-amber-300/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
              >
                <span className="font-fantasy text-sm text-white/90">{stall.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <CloseButton onClose={onClose} label="Close directory" />
      </div>
    </Scrim>
  );
}

export function StallPlaceholder({ stall, onClose }: { stall: Stall; onClose: () => void }) {
  return (
    <Scrim onClose={onClose} label={stall.label}>
      <div className={PANEL}>
        <h2 className="font-fantasy text-xl text-amber-200 tracking-wide">{stall.label}</h2>
        <p className="text-sm text-white/70 mt-3">{stall.placeholder}</p>
        <p className="text-[11px] text-white/35 mt-3">
          The courtyard is deliberately not wired to the card game yet.
        </p>
        <CloseButton onClose={onClose} label="Back to the courtyard" />
      </div>
    </Scrim>
  );
}

function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      onClick={onClose}
      autoFocus
      className="mt-5 w-full px-4 py-2 rounded-lg font-fantasy text-sm tracking-widest"
      style={{ background: '#b45309', color: '#0b0709' }}
    >
      {label}
    </button>
  );
}

/** Shared modal scrim — click-outside and Escape both dismiss. */
function Scrim({
  children,
  onClose,
  label,
}: {
  children: React.ReactNode;
  onClose: () => void;
  label: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="absolute inset-0 z-10 grid place-items-center px-6 bg-black/70 pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        // Stop Escape reaching the viewport, or closing a panel would also
        // dump the player out of the courtyard entirely.
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

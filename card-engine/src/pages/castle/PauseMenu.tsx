import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { primaryNav, adminNav } from '../../components/nav/navConfig';
import { signOut } from '../../services/persistence/supabaseClient';

/**
 * The castle's pause menu — where the nav lives once the courtyard is home.
 *
 * WHY A PAUSE MENU RATHER THAN A VISIBLE NAV BAR. Raheem: "We can make the nav
 * menu accessible using the pause button. Just like most games." The courtyard
 * is a full-screen world, and a persistent web nav sitting on top of it reads as
 * a website with a game embedded in it.
 *
 * But the nav itself is NOT optional, which is why this exists rather than the
 * stalls being the only route. It carries:
 *   - speed, for the fortieth visit to the Forge
 *   - deep destinations a courtyard has no stall for (Codex, Admin)
 *   - a non-spatial route for anyone who cannot or does not want to walk
 *
 * Escape opens it, exactly like a game, rather than dumping the player out of
 * the castle — which is what Escape used to do, and which is a surprising amount
 * of destruction to bind to the panic key.
 */
export function PauseMenu({
  open,
  onClose,
  onOpenDirectory,
  isPrivileged,
}: {
  open: boolean;
  onClose: () => void;
  onOpenDirectory: () => void;
  isPrivileged: boolean;
}) {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the panel on open so keyboard users are inside it immediately, and
  // so Escape has somewhere sensible to be caught.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const items = isPrivileged ? [...primaryNav, adminNav] : primaryNav;

  return (
    <div
      className="absolute inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: 'rgba(10,7,3,0.72)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Paused"
        className="w-full max-w-xs rounded-xl p-5 shadow-2xl outline-none"
        style={{
          background: 'linear-gradient(to bottom, #faeaca, #efcfa4)',
          color: '#4a3211',
          border: '1px solid rgba(74,50,17,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <h2 className="font-fantasy text-lg font-bold text-center mb-1">Paused</h2>
        <div
          className="mx-auto mb-4 h-px w-20"
          style={{ background: 'linear-gradient(to right, transparent, rgba(74,50,17,0.5), transparent)' }}
        />

        <div className="flex flex-col gap-1.5 mb-4">
          {items.map(({ to, label, icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-fantasy text-sm font-medium tracking-wide text-left transition-colors hover:bg-[#4a3211]/10"
            >
              <span className="text-lg leading-none w-6 text-center">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="h-px mb-3" style={{ background: 'rgba(74,50,17,0.2)' }} />

        {/* Walking is the point of the courtyard; the Directory is the
            non-spatial way to reach the same stalls. */}
        <button
          onClick={() => {
            onClose();
            onOpenDirectory();
          }}
          className="w-full px-3 py-2 mb-1.5 rounded-lg font-fantasy text-sm text-left hover:bg-[#4a3211]/10"
        >
          <span className="w-6 inline-block text-center">🧭</span> Courtyard directory
        </button>

        {/* The courtyard covers the NavBar, which is where signing out normally
            lives — so it has to be reachable from here or it is unreachable. */}
        <button
          onClick={async () => {
            await signOut();
            window.location.href = '/';
          }}
          className="w-full px-3 py-2 mb-3 rounded-lg font-fantasy text-sm text-left hover:bg-[#4a3211]/10"
        >
          <span className="w-6 inline-block text-center">⤴</span> Sign out
        </button>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 rounded-lg font-fantasy font-bold text-sm"
          style={{ background: '#8a1c1c', color: '#faeaca' }}
        >
          Resume
        </button>
      </div>
    </div>
  );
}

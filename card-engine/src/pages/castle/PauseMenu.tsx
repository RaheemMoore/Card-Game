import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { primaryNav, adminNav } from '../../components/nav/navConfig';
import { signOut } from '../../services/persistence/supabaseClient';
import { Panel } from '../../components/ui/Panel';
import { PixelButton } from '../../components/ui/PixelButton';
import { Slot } from '../../components/ui/Slot';

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
 *
 * WEARS THE PIXEL KIT, because this is the most-used surface in the castle.
 * It was a parchment CSS panel, which meant the journey out of the courtyard read
 * as pixel world → web panel → pixel case. Raheem picked it as the first thing to
 * re-skin for exactly that reason: it is the connective tissue between every
 * other surface, so a seam here is visible every single session.
 *
 * BEHAVIOUR IS UNCHANGED — same items, same Directory hand-off, same sign-out,
 * same Escape handling, same focus-on-open. Only the chrome moved.
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
      {/* Behaviour stays on this wrapper — Panel is a purely visual primitive
          with no ref or handler surface, and widening it just to host a focus
          target would push dialog concerns into every future caller. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Paused"
        className="w-full max-w-xs outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
      <Panel variant="hud" style={{ padding: 14 }}>
        <h2
          className="font-fantasy text-center"
          style={{ fontSize: 18, color: '#f3d99b', letterSpacing: '0.06em', margin: '0 0 12px' }}
        >
          Paused
        </h2>

        {/* Each destination gets its icon in a gem slot — the same tile the
            Codex and the crest rack use, so a door reads the same everywhere. */}
        <div className="flex flex-col gap-2 mb-3">
          {items.map(({ to, label, icon }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-3 text-left"
              style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}
            >
              <Slot framed frameWidth={5} style={{ width: 34, height: 34, flex: '0 0 auto' }}>
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: '100%',
                    height: '100%',
                    fontSize: 15,
                  }}
                >
                  {icon}
                </span>
              </Slot>
              <span
                className="font-fantasy"
                style={{ fontSize: 14, color: '#e8dcc4', letterSpacing: '0.03em' }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(201,162,39,0.28)', margin: '0 0 12px' }} />

        {/* Walking is the point of the courtyard; the Directory is the
            non-spatial way to reach the same stalls. */}
        <div className="flex flex-col gap-2 mb-3">
          <PixelButton
            scale={1.15}
            style={{ width: '100%' }}
            onClick={() => {
              onClose();
              onOpenDirectory();
            }}
          >
            Courtyard directory
          </PixelButton>

        {/* The courtyard covers the NavBar, which is where signing out normally
            lives — so it has to be reachable from here or it is unreachable. */}
          <PixelButton
            scale={1.15}
            style={{ width: '100%', filter: 'brightness(0.85)' }}
            onClick={async () => {
              await signOut();
              window.location.href = '/';
            }}
          >
            Sign out
          </PixelButton>
        </div>

        {/* Resume is the way out of a pause menu, so it gets the heaviest
            control on the panel rather than sharing weight with the nav. */}
        <PixelButton scale={1.5} style={{ width: '100%' }} onClick={onClose}>
          Resume
        </PixelButton>
      </Panel>
      </div>
    </div>
  );
}

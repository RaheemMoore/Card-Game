import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePhaserGame } from './usePhaserGame';
import { CourtyardOverlay } from './CourtyardOverlay';
import { DirectoryPanel, StallPlaceholder } from './CourtyardPanels';
import { useMotionLevel } from '../../services/combat/presentation/useMotionLevel';
import { COURTYARD_EVENTS } from './courtyard/events';
import type { Stall } from './courtyard/stalls';

/**
 * Full-screen surface hosting the Phaser courtyard. Portals to document.body
 * so the canvas escapes PlayerShell's background layers and content offsets —
 * same pattern as pages/battle and pages/minigames/forge-strike.
 *
 * This file deliberately contains no Phaser import; the engine is reached
 * only through usePhaserGame's dynamic import.
 */

interface Props {
  onExit: () => void;
}

export function CourtyardViewport({ onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const { status, game } = usePhaserGame(containerRef);
  const [motionLevel] = useMotionLevel();

  const [openStall, setOpenStall] = useState<Stall | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Reduced motion holds a standing frame instead of animating the walk. The
  // hero still goes where you send him — only the leg animation stops.
  useEffect(() => {
    if (!game) return;
    game.events.emit(COURTYARD_EVENTS.motionOff, motionLevel === 'off');
  }, [game, motionLevel]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    surfaceRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, []);

  // The DOM stall buttons are positioned with the same cover math the camera
  // uses, so they have to re-derive whenever the viewport changes.
  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Escape leaves the courtyard. Bound to the surface, not window, so the
  // listener cannot outlive the component — and the panels stop propagation
  // so closing a panel doesn't also dump the player out.
  //
  // Tab is trapped inside the surface. Without this the courtyard claims to
  // be a modal dialog but lets keyboard users fall straight through into the
  // NavBar behind it — which would make the stalls unreachable by Tab, the
  // one route that has to work for players who can't walk the hero around.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onExit();
      return;
    }
    if (e.key !== 'Tab') return;

    const surface = surfaceRef.current;
    if (!surface) return;
    const focusable = surface.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === surface)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (active === surface) {
      e.preventDefault();
      first.focus();
    }
  };

  const body = (
    <div
      ref={surfaceRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Castle courtyard"
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden outline-none text-bone"
      style={{ background: '#1d2a1f' }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {status === 'loading' && (
        <p className="absolute inset-0 grid place-items-center text-white/60 text-sm">
          Opening the courtyard…
        </p>
      )}
      {status === 'error' && (
        <p className="absolute inset-0 grid place-items-center text-red-300 text-sm px-6 text-center">
          The courtyard failed to open. Check the console for details.
        </p>
      )}

      {status === 'ready' && (
        <CourtyardOverlay
          game={game}
          viewport={viewport}
          motionOff={motionLevel === 'off'}
          onOpenStall={setOpenStall}
        />
      )}

      <button
        onClick={() => setDirectoryOpen(true)}
        className="absolute top-3 left-3 px-3 py-2 rounded-lg border border-white/25 bg-black/50 text-xs tracking-widest text-white/80 hover:border-white/60"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        DIRECTORY
      </button>

      <button
        onClick={onExit}
        className="absolute top-3 right-3 px-3 py-2 rounded-lg border border-white/25 bg-black/50 text-xs tracking-widest text-white/80 hover:border-white/60"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        LEAVE · ESC
      </button>

      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/40 pb-[env(safe-area-inset-bottom)]">
        WASD or arrow keys to walk · tap to walk there · E to interact
      </p>

      {directoryOpen && (
        <DirectoryPanel
          onClose={() => setDirectoryOpen(false)}
          onPick={(stall) => {
            setDirectoryOpen(false);
            setOpenStall(stall);
          }}
        />
      )}
      {openStall && (
        <StallPlaceholder stall={openStall} onClose={() => setOpenStall(null)} />
      )}
    </div>
  );

  return createPortal(body, document.body);
}

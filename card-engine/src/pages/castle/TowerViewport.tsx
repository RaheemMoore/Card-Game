import { useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { usePhaserGame, loadTowerFloor } from './usePhaserGame';
import { useMotionLevel } from '../../services/combat/presentation/useMotionLevel';
import { TOWER_EVENTS } from './tower/events';
import { getFloor } from '../../data/castle/tower';

/**
 * Full-screen surface for one Battle Tower floor.
 *
 * Portalled to document.body for the same reason the courtyard is: the app
 * shell's fantasy background and padding must not box in a scene that owns the
 * whole viewport.
 */
export function TowerViewport() {
  const { floor: floorParam } = useParams();
  const navigate = useNavigate();
  const floor = Number(floorParam) || 1;
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoised so the loader identity is stable — usePhaserGame lists it as a
  // dependency, and a fresh function each render would rebuild the game.
  const loader = useMemo(() => loadTowerFloor(floor), [floor]);
  const { status, game } = usePhaserGame(containerRef, loader);
  const [motion] = useMotionLevel();

  useEffect(() => {
    if (!game) return;
    game.events.emit(TOWER_EVENTS.motionOff, motion === 'off');
  }, [game, motion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/castle');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // NO mounted-guard here, deliberately. Returning null on the first render
  // means the container div does not exist when usePhaserGame's effect runs, so
  // the effect bails on a null ref — and since its deps never change again, it
  // never retries and the scene hangs on "loading" forever. document.body is
  // always present in this client-only app, so the guard bought nothing.
  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#0e1420]">
      <div ref={containerRef} className="absolute inset-0" />
      {status === 'loading' && (
        <p className="absolute inset-0 grid place-items-center text-amber-100/70 font-fantasy">
          Climbing the tower…
        </p>
      )}
      {status === 'error' && (
        <p className="absolute inset-0 grid place-items-center text-red-300 font-fantasy">
          The tower would not open. Check the console.
        </p>
      )}
      <p className="pointer-events-none absolute left-4 top-4 rounded bg-black/45 px-3 py-1.5
                    font-fantasy text-sm text-amber-100/90">
        {getFloor(floor).label}
      </p>
      <button
        onClick={() => navigate('/castle')}
        className="absolute right-4 top-4 rounded border border-amber-200/30 bg-black/45 px-3 py-1.5
                   text-sm text-amber-100/90 hover:bg-black/65 focus-visible:outline
                   focus-visible:outline-2 focus-visible:outline-amber-300"
      >
        Leave the tower
      </button>
    </div>,
    document.body,
  );
}

export default TowerViewport;

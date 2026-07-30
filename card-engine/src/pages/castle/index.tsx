import { useState } from 'react';
import { CourtyardViewport } from './CourtyardViewport';

/**
 * Castle courtyard — technical spike. Proves a Phaser top-down scene can live
 * inside this app; it is not the castle game. Reached by direct route only
 * (/castle) — no nav item, same as forge-strike's first slice.
 */
export function Castle() {
  const [inCourtyard, setInCourtyard] = useState(false);

  if (inCourtyard) return <CourtyardViewport onExit={() => setInCourtyard(false)} />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col gap-6 text-center">
      <header>
        <h1 className="font-fantasy text-3xl font-bold text-amber-200 tracking-wider">
          The Courtyard
        </h1>
        <p className="text-sm text-white/60 mt-2">
          Movement prototype — placeholder geometry, no stations, nothing saved. Walk around,
          bump into the walls, and judge whether the castle direction feels right.
        </p>
      </header>

      <div>
        <button
          onClick={() => setInCourtyard(true)}
          className="px-8 py-3 rounded-lg font-fantasy font-bold tracking-widest text-lg"
          style={{ background: '#b45309', color: '#0b0709' }}
        >
          STEP OUTSIDE
        </button>
      </div>
    </div>
  );
}

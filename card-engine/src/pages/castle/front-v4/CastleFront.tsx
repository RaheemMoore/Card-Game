import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { PauseMenu } from '../PauseMenu';
import { fetchMyRole, type SessionRole } from '../../../services/persistence/supabaseClient';
import { ForgeIndicator } from '../../../components/forge/ForgeIndicator';
import { CardJobIndicator } from '../../../components/forge/CardJobIndicator';
import { FRONT_V4_EVENTS, type FrontV4ScenePort, type FrontV4Snapshot } from './types';

/**
 * `/castle` — the castle front, seen from the side. THE game surface.
 *
 * This replaced the top-down courtyard on 2026-08-16. Raheem, after playing the
 * side-view proof: *"I do not want to see the old courtyards anymore… we're
 * moving on to the other style."* Four-directional exploration multiplied every
 * character performance by four; concentrating into two facings is what buys the
 * budget for dramatic card magic.
 *
 * THE SHELL, AND ONLY THE SHELL. The world is `CastleFrontV4Scene`; this file
 * owns the frame around it — the pause menu, the background-job indicators, the
 * role lookup, and the one player-facing readout a card game cannot do without
 * (which card is selected, and whether it is in your hand or lying on the floor).
 * Everything a developer needs — the bridge, the scenario runner, the tuning
 * readouts — lives on `/dev/castle-front-v4` instead and ships in no player build.
 *
 * It renders OUTSIDE `PlayerShell`, like the courtyard did: no nav bar, no page
 * offset, and Escape belongs to the game rather than to a router. The consequence
 * is that the two indicators PlayerShell used to supply have to be re-provided
 * here, or a card finishing in the forge completes invisibly for a player who is
 * standing in the castle — which is now where they spend their time.
 */
export function CastleFront() {
  const hostRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<FrontV4ScenePort | null>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [hand, setHand] = useState<FrontV4Snapshot['hand'] | null>(null);
  const [paused, setPaused] = useState(false);

  // Only decides whether the pause menu lists Admin. Defaults to 'user', so a
  // failed lookup hides a menu item rather than locking anyone out.
  const [role, setRole] = useState<SessionRole>('user');
  useEffect(() => {
    void fetchMyRole().then(setRole);
  }, []);

  useEffect(() => {
    let alive = true;
    let instance: Phaser.Game | null = null;
    const host = hostRef.current;
    if (!host) return;

    void (async () => {
      try {
        const { createCastleFrontV4Game } = await import('./createGame');
        if (!alive) return;
        instance = createCastleFrontV4Game(host);
        if (!alive) {
          // Cleanup won the race. Nothing else will ever see this instance, so
          // this is the only chance to take the canvas back out of the DOM.
          instance.destroy(true, false);
          instance = null;
          return;
        }
        instance.events.on(FRONT_V4_EVENTS.ready, (port: FrontV4ScenePort) => {
          portRef.current = port;
        });
        setGame(instance);
        setStatus('ready');
      } catch (error) {
        console.error('[castle-front] failed to start', error);
        if (alive) {
          setMessage(String(error));
          setStatus('error');
        }
      }
    })();

    return () => {
      alive = false;
      portRef.current = null;
      instance?.destroy(true, false);
      instance = null;
      setGame(null);
    };
  }, []);

  // The hand readout only. Polled, never per frame: the scene runs at 60Hz and
  // React has no business re-rendering at that rate.
  useEffect(() => {
    if (!game) return;
    const resultEvent = `${FRONT_V4_EVENTS.snapshot}:result`;
    const onSnapshot = (next: FrontV4Snapshot) => setHand(next.hand);
    game.events.on(resultEvent, onSnapshot);
    game.events.emit(FRONT_V4_EVENTS.snapshot);
    const poll = window.setInterval(() => game.events.emit(FRONT_V4_EVENTS.snapshot), 200);
    return () => {
      window.clearInterval(poll);
      game.events.off(resultEvent, onSnapshot);
    };
  }, [game]);

  /**
   * The game swallows Escape while it has focus, but an open React panel does
   * not — so the same key has to close whatever is on top, outermost first.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPaused((wasPaused) => !wasPaused);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={hostRef} className="h-full w-full" />

      {status === 'loading' && (
        <p className="absolute inset-0 grid place-items-center text-sm text-white/50">
          Walking out to the gate…
        </p>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-8">
          <div className="max-w-lg rounded border border-red-500/40 bg-red-950/70 p-4 text-sm text-red-100">
            <p className="mb-2 font-bold">The castle could not load.</p>
            <p>{message}</p>
          </div>
        </div>
      )}

      {/* The hand. Not decoration: the cards ARE the offense, so which one is
          selected and whether it is still yours is the whole state of the fight.
          Hidden while paused so the menu is not competing with it. */}
      {hand && !paused && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {hand.slots.map((slot, i) => (
            <div
              key={i}
              className={`w-24 rounded-md border px-2 py-1.5 text-center backdrop-blur-sm transition-colors ${
                hand.selected === i
                  ? 'border-amber-300 bg-amber-400/20 text-amber-100'
                  : 'border-white/20 bg-black/50 text-white/60'
              } ${slot.state === 'dropped' ? 'opacity-35' : ''}`}
            >
              <div className="font-fantasy text-[11px] leading-tight truncate">
                {slot.name ?? '—'}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-white/45">
                {slot.state === 'dropped' ? 'dropped' : `${i + 1}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <PauseMenu
        open={paused}
        onClose={() => setPaused(false)}
        onOpenDirectory={() => setPaused(false)}
        isPrivileged={role === 'admin' || role === 'lore_director'}
      />

      <ForgeIndicator />
      <CardJobIndicator />
    </div>
  );
}

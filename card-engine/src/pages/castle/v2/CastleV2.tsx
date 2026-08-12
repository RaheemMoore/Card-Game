import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  entriesUsedBy,
  fetchSceneSource,
  loadPackEntries,
  makeScene,
  PRODUCTION_SCENE,
  type HandView,
  type PackEntry,
  type Status,
} from './courtyardRuntime';
import { ALWAYS_LOADED } from './sceneManifest';
import { HERO_SHEET } from '../../../data/castle/heroSprite';
import { getAllCards } from '../../../services/storage';
import { DOOR_LABELS, type DoorDestination } from '../../dev/sceneColliders';
import { PauseMenu } from '../PauseMenu';
import { CollectionStall } from '../stalls/CollectionStall';
import { fetchMyRole, type SessionRole } from '../../../services/persistence/supabaseClient';
import { ForgeIndicator } from '../../../components/forge/ForgeIndicator';
import { CardJobIndicator } from '../../../components/forge/CardJobIndicator';

/**
 * `/castle` — the courtyard you actually live in.
 *
 * This replaced the painted-plate courtyard on 2026-08-08. Raheem, logging in
 * and finding the old one still there: "I wanna remove the whole old courtyard.
 * It should be gone, and this should be the new courtyard."
 *
 * The world is `courtyardRuntime.ts`, shared verbatim with `/dev/scene`. This file
 * is only the shell around it — the doors, the prompt and the pause menu. That
 * split is the point: the thing Raheem reviews in the harness and the thing a
 * player walks are the same code, so they cannot drift.
 *
 * DOORS ARE AUTHORED, NOT CODED. Each is a coloured rectangle in the Editor's
 * `L24_DOORS` layer; the colour says where it goes. Adding the tower later is a
 * rectangle and one line in `DOOR_COLORS`, not a change here.
 *
 * WHY THE FORGE NAVIGATES AND THE ARCHIVE DOES NOT
 *
 * The Archive opens `CollectionStall` in place, over the courtyard, because that
 * component exists and was built for exactly this. The Forge navigates to
 * `/forge`, the real web forge — there IS a pixel-cased forge at
 * `/dev/forge-stall`, and it is deliberately NOT used here. Raheem, 2026-08-04:
 * "Do not get rid of the current forge process... this is the most critical
 * aspect of the game." Swapping it in is his call, made after seeing both, not a
 * side effect of moving the courtyard.
 */
export function CastleV2() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>({ phase: 'loading' });
  const [atDoor, setAtDoor] = useState<DoorDestination | null>(null);
  const [openStall, setOpenStall] = useState<DoorDestination | null>(null);
  const [paused, setPaused] = useState(false);
  const [hand, setHand] = useState<HandView | null>(null);

  // Only decides whether the pause menu lists Admin. Defaults to 'user', so a
  // failed lookup hides a menu item rather than locking anyone out.
  const [role, setRole] = useState<SessionRole>('user');
  useEffect(() => {
    void fetchMyRole().then(setRole);
  }, []);
  const isPrivileged = role === 'admin' || role === 'lore_director';

  /**
   * Kept in a ref and read through a stable callback so the game is built ONCE.
   * Passing these straight into the effect would list them as dependencies, and
   * every state change would tear down and rebuild the Phaser game — which reads
   * to a player as the courtyard flickering every time they near a door.
   */
  const openDoor = useCallback(
    (destination: DoorDestination) => {
      if (destination === 'forge') {
        navigate('/forge');
        return;
      }
      setOpenStall(destination);
    },
    [navigate],
  );
  const openDoorRef = useRef(openDoor);
  openDoorRef.current = openDoor;

  useEffect(() => {
    let game: import('phaser').Game | undefined;
    let cancelled = false;

    void (async () => {
      let Phaser: typeof import('phaser');
      let allEntries: PackEntry[];
      let source: string;
      try {
        [Phaser, allEntries, source] = await Promise.all([
          import('phaser').then((m) => m.default),
          loadPackEntries(),
          fetchSceneSource(PRODUCTION_SCENE),
        ]);
      } catch (err) {
        if (!cancelled) setStatus({ phase: 'error', message: String(err) });
        return;
      }
      if (cancelled || !hostRef.current) return;

      const entries = entriesUsedBy(source, allEntries, [
        HERO_SHEET.key,
        ...(ALWAYS_LOADED[PRODUCTION_SCENE] ?? []),
      ]);

      const Scene = makeScene(
        Phaser,
        PRODUCTION_SCENE,
        source,
        entries,
        (s) => {
          if (!cancelled) setStatus(s);
        },
        {
          onDoorChange: (d) => {
            if (!cancelled) setAtDoor(d);
          },
          onDoorEnter: (d) => openDoorRef.current(d),
          onPause: () => {
            if (!cancelled) setPaused((p) => !p);
          },
          onHandChange: (h) => {
            if (!cancelled) setHand(h);
          },
          // His actual characters, newest first. The world takes ids and never
          // touches storage itself, so the harness can hand it fixtures instead.
          // An empty collection falls back to practice cards rather than to a
          // courtyard where the attack silently does nothing.
          //
          // The element comes along because it chooses the blast's art. A card
          // forged before elements existed simply has none, and fires the
          // placeholder rather than refusing to fire.
          cards: getAllCards()
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 4)
            .map((c) => ({ cardId: c.cardId, element: c.elementSelection?.element })),
        },
      );

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        backgroundColor: '#0b0f0a',
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.NO_CENTER,
          width: '100%',
          height: '100%',
        },
        scene: [Scene],
      });
    })();

    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  /**
   * The game swallows Escape while it has focus, but an open React panel does
   * not — so the same key has to close whatever is on top, outermost first.
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openStall) return setOpenStall(null);
      if (paused) return setPaused(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openStall, paused]);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <div ref={hostRef} className="h-full w-full" />

      {/* The doorway prompt. There is no pixel key-cap art in the kit, so this
          wears the same parchment ribbon the old courtyard used — it is the one
          castle surface still reading as CSS, and it is a known gap rather than
          an oversight. */}
      {atDoor && !openStall && !paused && (
        <div
          role="status"
          className="pointer-events-none absolute left-1/2 bottom-24 -translate-x-1/2 rounded-md px-4 py-2 shadow-lg"
          style={{ background: 'linear-gradient(180deg, #faeaca 0%, #efcfa4 100%)', color: '#3a2a18' }}
        >
          <span className="font-fantasy text-sm font-bold">
            {DOOR_LABELS[atDoor]} · ⌨ E
          </span>
        </div>
      )}

      {/* The hand. DOM rather than Phaser: it is screen-space chrome like the
          doorway prompt above, and the Phaser version was built correctly and
          drawn off the bottom edge because camera-space UI has to be re-placed
          on every resize. Small and low-contrast on purpose — the courtyard is
          the thing worth looking at. Card faces replace the pips later. */}
      {hand && !paused && (
        <div
          className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2"
          role="status"
          aria-label="Cards carried"
        >
          {hand.slots.map((slot, i) => {
            const selected = hand.selected === i;
            const fill =
              slot.state === 'ready'
                ? '#f2e2b6'
                : slot.state === 'committed'
                  ? '#9a8ac0'
                  : 'transparent';
            return (
              <div
                key={i}
                className="grid h-14 w-10 place-items-center rounded-sm border-2 transition-colors"
                style={{
                  borderColor: selected ? '#ffd479' : '#8a7a55',
                  background: selected ? 'rgba(13,11,8,0.78)' : 'rgba(13,11,8,0.55)',
                }}
              >
                <div
                  className="h-9 w-6 rounded-[2px]"
                  style={{ background: fill, opacity: slot.state === 'empty' ? 0.2 : 1 }}
                />
                <span className="text-[10px] leading-none text-amber-200/70">{i + 1}</span>
              </div>
            );
          })}
        </div>
      )}

      {status.phase === 'loading' && (
        <div className="absolute inset-0 grid place-items-center text-white/60">
          Entering the courtyard…
        </div>
      )}

      {status.phase === 'error' && (
        <div className="absolute inset-0 grid place-items-center p-8">
          <div className="max-w-lg rounded border border-red-500/40 bg-red-950/70 p-4 text-sm text-red-100">
            <p className="mb-2 font-bold">The courtyard could not load.</p>
            <p>{status.message}</p>
          </div>
        </div>
      )}

      {openStall === 'collection' && <CollectionStall onClose={() => setOpenStall(null)} />}

      <PauseMenu
        open={paused}
        onClose={() => setPaused(false)}
        onOpenDirectory={() => setPaused(false)}
        isPrivileged={isPrivileged}
      />

      {/* PlayerShell used to supply these, and the castle no longer renders
          through it. Without them a card forging in the background finishes
          invisibly for anyone standing in the courtyard — which is most of the
          time now that the courtyard is where you land. */}
      <ForgeIndicator />
      <CardJobIndicator />
    </div>
  );
}

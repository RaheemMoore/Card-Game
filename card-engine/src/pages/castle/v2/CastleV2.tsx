import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  entriesUsedBy,
  fetchSceneSource,
  loadPackEntries,
  makeScene,
  PRODUCTION_SCENE,
  type CombatStateView,
  type HandView,
  type PackEntry,
  type Status,
} from './courtyardRuntime';
import { ALWAYS_LOADED } from './sceneManifest';
import { resolveMotionLevel } from './motionLevel';
import { slotFeel } from '../combat/slotFeel';
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
  /**
   * The player's motion preference, read ONCE.
   *
   * Same setting the world reads, through the same resolver — a HUD that kept
   * animating after the courtyard stopped would be the preference half-honoured,
   * which is worse than not offering it. Not reactive, matching the scene:
   * changing it mid-session already requires a reload.
   */
  const [motionOff] = useState(() => resolveMotionLevel() === 'off');
  /** The training construct's state, for the on-screen combat readout. */
  const [combat, setCombat] = useState<CombatStateView | null>(null);

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
          onCombatState: (s) => {
            if (!cancelled) setCombat(s);
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

      {/* Says out loud why nothing happened when he pressed fire. Being disarmed
          is the CORRECT reason the attack refuses, and it is invisible — which
          reads exactly like the game being broken. */}
      {hand && hand.blockedCount > 0 && !paused && !openStall && (
        <div
          key={hand.blockedCount}
          role="status"
          className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 animate-[fadeIn_120ms_ease-out] rounded-md px-3 py-1.5 text-xs font-bold"
          style={{ background: 'rgba(60,20,20,0.82)', color: '#ffd0d0' }}
        >
          Your cards are on the ground — go and get them
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
            const dropped = slot.state === 'dropped';
            /**
             * The attack, said again where the player is already looking.
             *
             * Pure and tested in `slotFeel.ts` rather than worked out in JSX,
             * for the same reason the hero's pose is: the thresholds it draws
             * are the SAME ones `feel.ts` uses to decide the shot's severity,
             * and a HUD that invented its own idea of "heavy" would be teaching
             * a rule the game does not have.
             */
            const feel = slotFeel({
              state: slot.state,
              selected,
              phase: hand.phase,
              charge: hand.charge,
              motionOff,
            });
            /**
             * The pip is the CARD, so it wears the card's element.
             *
             * Every slot used to be the same parchment cream, which made a hand
             * of four look like four of the same thing — and it was, because the
             * practice cards had no element at all. Now that they do, the row is
             * the fastest possible answer to "which one shoots fire": you can
             * see it without selecting anything.
             *
             * A committed card still goes purple: "this one is in the air" is
             * more urgent than what it is made of, and it is the only feedback
             * that a slot is spent.
             */
            const fill =
              slot.state === 'committed'
                ? '#9a8ac0'
                : slot.state === 'ready'
                  ? slot.tint ?? '#f2e2b6'
                  : 'transparent';
            return (
              <div
                key={i}
                className="grid h-14 w-10 place-items-center rounded-sm border-2"
                style={{
                  /* A dropped slot has to look LOST, not empty. It read as
                     near-identical to an empty one — transparent fill, same
                     border — which quietly undid the point of the whole
                     scatter: §12 wants the player to understand what they lost
                     and go and get it. Amber and dashed says "yours, and not
                     here" in a way an absence cannot. */
                  borderColor: dropped
                    ? '#d98a3a'
                    : /* Heavy takes the border, because at that point "this is
                         the big one" outranks "this is the one selected" — and
                         they are the same slot anyway. */
                      feel.heavy
                      ? '#ffb02e'
                      : selected
                        ? '#ffd479'
                        : '#8a7a55',
                  borderStyle: dropped ? 'dashed' : 'solid',
                  background: selected ? 'rgba(13,11,8,0.78)' : 'rgba(13,11,8,0.55)',
                  opacity: feel.opacity,
                  /* The punch is a SNAP up with the settle left to the
                     transition: `active` is 60ms, and easing into it would eat
                     the whole phase and read as a swell instead of a hit. */
                  transform: `scale(${feel.scale})`,
                  transition: motionOff
                    ? 'none'
                    : 'transform 160ms ease-out, opacity 140ms linear, border-color 90ms linear',
                }}
              >
                <div
                  className="relative h-9 w-6 overflow-hidden rounded-[2px]"
                  style={{
                    background: fill,
                    opacity: slot.state === 'empty' ? 0.2 : 1,
                    /* The outline stands in for the card that is not in his
                       hand — the slot still belongs to something. */
                    boxShadow: dropped ? 'inset 0 0 0 2px rgba(217,138,58,0.55)' : undefined,
                  }}
                >
                  {/* The charge, climbing the card itself rather than sitting
                      in a bar beside it. A separate meter would be a fifth
                      thing on a row of four, and it would be readable only by
                      looking away from the card it describes. */}
                  <div
                    className="absolute inset-x-0 bottom-0"
                    style={{
                      height: `${feel.fill * 100}%`,
                      background: 'rgba(255,255,255,0.55)',
                      /* Twelfths arrive from the runtime; this is what makes
                         them look continuous. Kept under the 75ms between
                         steps so the bar is always moving, never catching up. */
                      transition: motionOff ? 'none' : 'height 70ms linear',
                    }}
                  />
                  {/* The cap. Dark until the shot is worth more than a tap,
                      full at heavy — so the moment worth waiting for has its
                      own mark rather than being inferred from a bar's height. */}
                  {feel.glow > 0 && (
                    <div
                      className="absolute inset-x-0"
                      style={{
                        bottom: `calc(${feel.fill * 100}% - 2px)`,
                        height: 2,
                        background: `rgba(255,214,120,${0.35 + 0.65 * feel.glow})`,
                        boxShadow: `0 0 ${4 + 6 * feel.glow}px rgba(255,176,46,${feel.glow})`,
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] leading-none"
                  style={{ color: dropped ? 'rgba(217,138,58,0.95)' : 'rgba(253,230,138,0.7)' }}
                >
                  {dropped ? '▼' : i + 1}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* What the keys do.
          Raheem, testing the knockdown: "I don't know which one it is now because
          f shoots, space jumps, WSD walks." A verb nobody can find is a verb that
          does not exist, and reading it back out of a chat log is not a control
          scheme. Small, dim, bottom-left, out of the way of the world. */}
      {!paused && !openStall && (
        <div
          className="pointer-events-none absolute bottom-5 left-5 select-none rounded-md px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: 'rgba(13,11,8,0.55)', color: 'rgba(242,226,182,0.72)' }}
          aria-label="Controls"
        >
          {[
            ['WASD', 'walk'],
            ['mouse', 'aim'],
            ['1-4', 'pick card'],
            ['click / F', 'tap = quick · hold = heavy'],
            ['G', 'summon (plant the card)'],
            ['SPACE', 'hop a ledge'],
            ['E', 'enter a door'],
            // The combat test keys. They were console commands, which assumed
            // the person testing the game writes JavaScript.
            ['—', ''],
            ['R', 'reset / revive the construct'],
            ['T', 'freeze its brain'],
            ['Y', 'arm its knockdown'],
            ['K', 'knock yourself down'],
            // The two feel keys. Charge is what every part of an attack's
            // weight scales on, and holding a chosen charge by hand means
            // timing a mouse press to the millisecond — so the comparison the
            // review actually needs is impossible without these.
            [', / .', 'fire the lightest / heaviest shot'],
            // One key for the whole exchange, so two playtests are comparable.
            ['P', 'play the scripted duel'],
          ].map(([key, what]) => (
            <div key={key} className="flex gap-2">
              <span className="w-16 shrink-0 font-bold text-amber-200/90">{key}</span>
              <span>{what}</span>
            </div>
          ))}
        </div>
      )}

      {/* The encounter, in words, top-right.
          Everything here used to require typing a function call into the
          browser's developer console — which assumed the person testing the
          game is a programmer. Raheem, playing the script: "what the fuck is
          the console?" Fair. The information was never the problem; the door
          to it was. */}
      {combat && !paused && !openStall && (
        <div
          className="pointer-events-none absolute right-5 top-5 select-none rounded-md px-3 py-2 text-[11px] leading-relaxed"
          style={{ background: 'rgba(13,11,8,0.62)', color: 'rgba(242,226,182,0.85)', minWidth: 190 }}
          role="status"
          aria-label="Combat state"
        >
          <div className="mb-1 font-bold text-amber-200/90">The construct</div>
          {[
            // Plain words, not state-machine names. "telegraph" means nothing
            // to someone who did not write the state machine.
            ['doing', ({
              disabled: 'switched off',
              idle: 'unaware of you',
              alert: 'noticed you',
              face: 'turning to face you',
              approach: 'coming for you',
              telegraph: 'WINDING UP — move!',
              attack: 'striking',
              recovery: 'open — hit it now',
              hitReact: 'flinching',
              knockbackReact: 'staggered',
              defeated: 'defeated',
              reviving: 'reviving',
            } as Record<string, string>)[combat.phase] ?? combat.phase],
            ['health', `${combat.hp} / ${combat.maxHp}`],
            ['distance', `${combat.distance}`],
            ['its knockdown', combat.strongHits ? 'ARMED (Y)' : 'off (press Y)'],
            ['its brain', combat.aiEnabled ? 'running' : 'FROZEN (T)'],
            [
              'you',
              // Down is the one state with an instruction attached, because it
              // is the one state the player has to DO something to leave.
              combat.heroPhase === 'knockdown'
                ? 'DOWN — press a direction'
                : combat.graceMs > 0
                  ? `protected ${(combat.graceMs / 1000).toFixed(1)}s`
                  : combat.heroPhase,
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <span className="opacity-60">{label}</span>
              <span
                className="font-bold"
                style={{
                  color:
                    value === 'WINDING UP — move!'
                      ? '#ffb02e'
                      : value === 'open — hit it now'
                        ? '#8fe08f'
                        : value === 'DOWN — press a direction'
                          ? '#ff9b6a'
                          : undefined,
                }}
              >
                {value}
              </span>
            </div>
          ))}
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

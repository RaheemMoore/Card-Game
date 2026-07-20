import { useEffect, useMemo, useState } from 'react';
import type { Card } from '../../../types/card';
import type { BattleState, PlayerAction } from '../../../types/combat';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import { MobileBossHeader } from './MobileBossHeader';
import { MobileIntentPanel } from './MobileIntentPanel';
import { MobileArenaStage } from './MobileArenaStage';
import { MobilePartyCardTray } from './MobilePartyCardTray';
import { MobileAbilityRow } from './MobileAbilityRow';
import { MobileActionControls } from './MobileActionControls';
import { MobileResourceRow } from './MobileResourceRow';
import { MobileCombatJournal } from './MobileCombatJournal';

interface Props {
  state: BattleState;
  actingActorId: string | null;
  partyCards: Card[];
  currentBeat: AnimationBeat | null;
  journal: readonly AnimationBeat[];
  isPlaying: boolean;
  pendingCount: number;
  onSkip: () => void;
  onSubmit: (action: PlayerAction) => void;
  /** Move a pending hero to the front of the action queue. */
  onSelectActor: (actorId: string) => void;
  onExit: () => void;
}

/**
 * Mobile portrait combat scene.
 *
 * Two-zone composition:
 *   1. ARENA (top, full-bleed) — the arena background stretches edge-to-edge
 *      from the top of the phone to the top of the player-controls dock.
 *      The boss sprite anchors to the upper portion so its head reads near
 *      the top of the screen; the party card tray floats over the arena's
 *      lower portion. Compact overlays (boss header chip, intent chip,
 *      turn/exit) float on top without occluding the boss.
 *   2. PLAYER CONTROLS (bottom, solid dark) — nameplate, compact ability
 *      strip, resource row, action controls, and the collapsed combat
 *      journal. Solid dark background so legibility never fights the arena
 *      art behind it.
 *
 * Modes:
 *   - Decision: full controls visible, cards raised, arena at nominal size.
 *   - Playback: ability + actions collapse, cards lower slightly, boss
 *     gains vertical emphasis. Input is locked by the reducer (canAct).
 */
export function MobileCombatScene({
  state,
  actingActorId,
  partyCards,
  currentBeat,
  journal,
  isPlaying,
  pendingCount: journalPendingCount,
  onSkip,
  onSubmit,
  onSelectActor,
  onExit,
}: Props) {
  const canAct = state.phase === 'awaiting_player_action';

  const defaultSelected =
    actingActorId ??
    state.heroes.find((h) => !h.defeated)?.actorId ??
    state.heroes[0]?.actorId ??
    '';
  const [selectedActorId, setSelectedActorId] = useState<string>(defaultSelected);

  useEffect(() => {
    // Follow the reducer's acting hero when we're between decisions (not
    // awaiting a hero to be picked). When we ARE awaiting input, the user's
    // last tap is the source of truth — do NOT snap back to actingActorId,
    // otherwise their strategic pick keeps getting overridden after each
    // guard/action shrinks pendingActorIds.
    const selectedAlive = state.heroes.find((h) => h.actorId === selectedActorId && !h.defeated);
    if (!selectedAlive) {
      const fallback =
        (canAct ? state.pendingActorIds[0] : null) ??
        state.heroes.find((h) => !h.defeated)?.actorId;
      if (fallback) setSelectedActorId(fallback);
      return;
    }
    if (!canAct && actingActorId && actingActorId !== selectedActorId) {
      setSelectedActorId(actingActorId);
    }
  }, [actingActorId, canAct, state.heroes, state.pendingActorIds, selectedActorId]);

  const selectedHero = useMemo(() => {
    return (
      state.heroes.find((h) => h.actorId === selectedActorId) ??
      state.heroes.find((h) => !h.defeated) ??
      state.heroes[0]
    );
  }, [state.heroes, selectedActorId]);

  const aliveCount = state.heroes.filter((h) => !h.defeated).length;
  const pendingActions = state.pendingActorIds.length;

  const isPlaybackMode = !canAct || isPlaying;

  const [showYourTurn, setShowYourTurn] = useState(false);
  useEffect(() => {
    if (canAct && !isPlaying) {
      setShowYourTurn(true);
      const id = setTimeout(() => setShowYourTurn(false), 1200);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [canAct, isPlaying]);

  // Party card tray height — must accommodate the CardRenderer thumbnail
  // (137×197 device px) plus a small raise for the selected lane, so cards
  // don't overflow into the controls dock. The arena is informed so its
  // ember gradient's darkening band sits directly under the cards.
  const cardTrayHeight = isPlaybackMode ? 190 : 218;

  return (
    <div
      className="relative flex flex-col w-full h-full overflow-hidden text-bone"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ARENA ZONE — full-bleed background, flex-fills everything above the
          controls dock. Contains the arena imagery, boss sprite, floating
          HUD overlays, and the party card tray. */}
      <div className="relative flex-1 min-h-0">
        <MobileArenaStage
          boss={state.boss}
          currentBeat={currentBeat}
          emphasized={isPlaybackMode}
          cardTrayHeight={cardTrayHeight}
        />

        {/* Top overlay row: boss header chip (left) + turn/exit (right) */}
        <div
          className="absolute top-1.5 left-1.5 right-1.5 flex items-start justify-between gap-2 z-20 pointer-events-none"
        >
          <div className="pointer-events-auto">
            <MobileBossHeader boss={state.boss} round={state.round} />
          </div>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onExit}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Leave battle"
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                border: '1px solid #573b1f',
                background: 'rgba(6,4,8,0.85)',
                color: '#d6c7a8',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Inter, system-ui, sans-serif',
                backdropFilter: 'blur(2px)',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Intent chip — sits below the boss header on the left, subtle */}
        <div
          className="absolute left-1.5 z-20 pointer-events-none"
          style={{ top: 70 }}
        >
          <MobileIntentPanel boss={state.boss} intent={state.boss.currentIntent} state={state} />
        </div>

        {/* YOUR TURN cue */}
        {showYourTurn && (
          <div
            aria-live="polite"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 mobile-your-turn"
            style={{
              top: '32%',
              padding: '6px 18px',
              borderRadius: 6,
              background: 'rgba(6,4,8,0.75)',
              border: '1.5px solid #e6a04a',
              color: '#ffdb94',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 2.4,
              fontFamily: 'Inter, system-ui, sans-serif',
              textShadow: '0 1px 6px rgba(0,0,0,0.85)',
              boxShadow: '0 0 22px rgba(230,160,74,0.45)',
            }}
          >
            YOUR TURN
          </div>
        )}

        {/* Party card tray — floats over the arena's lower band */}
        <div
          className="absolute inset-x-0 bottom-0 px-2 z-10"
          style={{ height: cardTrayHeight, transition: 'height 300ms ease-out' }}
        >
          <MobilePartyCardTray
            heroes={state.heroes}
            partyCards={partyCards}
            selectedActorId={selectedActorId}
            onSelect={(id) => {
              setSelectedActorId(id);
              // Also reorder the reducer's pending queue so the next submit
              // acts as this hero — the tap now carries strategic weight
              // instead of just being a visual focus change.
              if (canAct) onSelectActor(id);
            }}
            canAct={canAct}
            currentBeat={currentBeat}
            loweredForPlayback={isPlaybackMode}
          />
        </div>
      </div>

      {/* PLAYER CONTROLS DOCK — solid dark zone, holds nameplate + ability
          strip + resource + actions + journal. Never overlaps the arena. */}
      <div
        className="shrink-0 relative"
        style={{
          background: 'linear-gradient(to bottom, rgba(8,6,12,0.98), rgba(6,4,10,1))',
          borderTop: '1px solid rgba(184,110,40,0.55)',
          boxShadow: '0 -8px 22px rgba(0,0,0,0.55)',
        }}
      >
        {/* Nameplate */}
        {selectedHero && (
          <div className="flex items-center justify-center pt-1.5" style={{ height: 22 }}>
            <div
              style={{
                color: '#ebd9b2',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.6,
                fontFamily: 'Inter, system-ui, sans-serif',
                textShadow: '0 1px 3px rgba(0,0,0,0.75)',
                padding: '1px 12px',
                borderRadius: 3,
                background: 'linear-gradient(to bottom, rgba(90,60,20,0.45), rgba(20,12,6,0.55))',
                border: '1px solid rgba(184,120,40,0.45)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '80%',
              }}
            >
              {selectedHero.snapshot.displayName.toUpperCase()}
              {selectedHero.defeated && (
                <span style={{ marginLeft: 6, color: '#c14444', fontSize: 9, letterSpacing: 1 }}>
                  DEFEATED
                </span>
              )}
            </div>
          </div>
        )}

        {/* Ability strip (collapsed in Playback Mode) */}
        <div
          className="px-2 pt-2 mobile-collapsible"
          style={{
            maxHeight: isPlaybackMode || !selectedHero || selectedHero.defeated ? 0 : 60,
            opacity: isPlaybackMode || !selectedHero || selectedHero.defeated ? 0 : 1,
            overflow: 'visible',
            transition: 'max-height 250ms ease-out, opacity 200ms',
          }}
        >
          {selectedHero && !selectedHero.defeated && (
            <MobileAbilityRow
              hero={selectedHero}
              bossActorId={state.boss.actorId}
              disabled={!canAct}
              onSubmit={onSubmit}
            />
          )}
        </div>

        {/* Resource row */}
        {selectedHero && (
          <div className="mt-1.5">
            <MobileResourceRow
              selectedHero={selectedHero}
              boss={state.boss}
              actionsRemaining={pendingActions === 0 ? aliveCount : pendingActions}
            />
          </div>
        )}

        {/* Action controls (collapsed in Playback Mode) */}
        <div
          className="px-2 pt-2 pb-1 mobile-collapsible"
          style={{
            maxHeight: isPlaybackMode ? 0 : 72,
            opacity: isPlaybackMode ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-height 250ms ease-out, opacity 200ms',
          }}
        >
          <MobileActionControls
            canAct={canAct}
            pendingCount={pendingActions}
            totalHeroes={aliveCount}
            onSubmit={onSubmit}
          />
        </div>

        {/* Combat journal — collapsed strip; drawer overlay when expanded */}
        <MobileCombatJournal
          journal={journal}
          isPlaying={isPlaying}
          pendingCount={journalPendingCount}
          onSkip={onSkip}
        />
      </div>

      <style>{`
        @keyframes mobile-your-turn-in {
          0%   { opacity: 0; transform: translate(-50%, -8px) scale(0.9); }
          60%  { opacity: 1; transform: translate(-50%, 0)   scale(1.04); }
          100% { opacity: 1; transform: translate(-50%, 0)   scale(1); }
        }
        .mobile-your-turn { animation: mobile-your-turn-in 320ms ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .mobile-your-turn { animation: none; }
          .mobile-collapsible { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

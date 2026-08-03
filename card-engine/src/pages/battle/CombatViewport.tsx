import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../../types/card';
import type { AbilitySlotType } from '../../types/abilities';
import type { BattleEvent, BattleState, PlayerAction } from '../../types/combat';
import {
  grantBattleReward,
  type BattleRewardOutcome,
} from '../../services/combat/battleRewardService';
import { TIMEOUT_ROUND_CAP } from '../../services/combat/reducer';
import { useCombatPresentation } from '../../services/combat/presentation/useCombatPresentation';
import { useMotionLevel } from '../../services/combat/presentation/useMotionLevel';
import { summarizeJournal } from '../../services/combat/presentation/journalSummary';
import { buildHeroPerformanceDurations } from '../../services/combat/presentation/performanceTiming';
import { CombatScene } from './CombatScene';
import { CombatJournalRail } from './CombatJournalRail';
import { ResultModal } from './ResultModal';
import { MobileCombatScene } from './mobile/MobileCombatScene';
import { BATTLE_STUDIO_SCENARIO, useBattleStudioBridge } from './studioBridge';

interface Props {
  state: BattleState | null;
  events: readonly BattleEvent[];
  actingActorId: string | null;
  partyCards: Card[];
  entryTxnId: string | null;
  error: string | null;
  onSubmit: (action: PlayerAction) => void;
  onSelectActor: (actorId: string) => void;
  onRestart: () => void;
  onExit: () => void;
}

/** Portrait-phone threshold. Below this width we render the dedicated mobile
 *  combat scene instead of the desktop/tablet grid. 520px comfortably covers
 *  360, 390, and 430 test targets while leaving 7"+ tablets on the desktop
 *  composition. */
const MOBILE_MAX_WIDTH_PX = 520;

function useIsMobileCombatLayout(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_MAX_WIDTH_PX;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}

/**
 * Full-screen combat shell. Escapes the normal App.tsx layout via a portal
 * to document.body, occupying 100vw × 100dvh with no shell chrome.
 *
 * Layout dispatch:
 *   - Desktop / tablet (>520px): one full-bleed CombatScene with the Combat
 *     Journal overlaid as a bounded top-right corner box. (Was a two-column
 *     grid; the journal column cost ~280px permanently and confined the
 *     command shelf to the arena cell.)
 *   - Portrait phone (≤520px): the dedicated MobileCombatScene. No side rail;
 *     the journal collapses to a bottom strip that opens as a drawer.
 *
 * Both dispatches share the same reducer state, presentation queue, wallet
 * lifecycle, and ResultModal.
 */
export function CombatViewport({
  state,
  events,
  actingActorId,
  partyCards,
  entryTxnId,
  error,
  onSubmit,
  onSelectActor,
  onRestart,
  onExit,
}: Props) {
  const [rewardOutcome, setRewardOutcome] = useState<BattleRewardOutcome | null>(null);

  // Lets the presentation queue recognise an ultimate and give it its own
  // pacing. Reads the ALREADY-FROZEN ability snapshots rather than adding a
  // field anywhere, so nothing cosmetic leaks into the determinism payload.
  const slotLookup = useMemo(() => {
    const slots = new Map<string, AbilitySlotType>();
    for (const hero of state?.heroes ?? []) {
      for (const ability of hero.snapshot.abilities) {
        slots.set(ability.definitionId, ability.slot);
      }
    }
    return (definitionId: string) => slots.get(definitionId);
  }, [state?.heroes]);

  // Resolved ONCE for the whole battle and threaded down as a prop. Several
  // components used to read `matchMedia` independently; every new effect
  // would have added another copy of that read. One source, one answer.
  const [motionLevel, setMotionLevel] = useMotionLevel();

  const performanceDurations = useMemo(() => {
    if (!state) return new Map<number, number>();
    return buildHeroPerformanceDurations(
      events,
      state.boss.actorId,
      state.heroes.map((hero) => hero.actorId),
      partyCards,
      motionLevel,
    );
  }, [events, motionLevel, partyCards, state]);

  const performanceDurationLookup = useMemo(
    () => (openerIndex: number) => performanceDurations.get(openerIndex),
    [performanceDurations],
  );

  const presentationOptions = useMemo(
    () => ({ slotLookup, motionLevel, performanceDurationLookup }),
    [slotLookup, motionLevel, performanceDurationLookup],
  );
  const presentation = useCombatPresentation(events, presentationOptions, state?.boss.actorId);
  const isMobile = useIsMobileCombatLayout();

  useBattleStudioBridge({
    state,
    events,
    currentBeat: presentation.currentBeat,
    isPlaying: presentation.isPlaying,
    pendingCount: presentation.pendingCount,
    motionLevel,
  });

  // A separate condensed view over the same event stream, purely for the
  // journal panels — does not touch `presentation` (beat pacing/animation
  // triggers stay exactly as they were).
  const journalEntries = useMemo(
    () => (state ? summarizeJournal(events, state) : []),
    [events, state],
  );

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (!state || !state.result || state.phase !== 'battle_over') {
      setRewardOutcome(null);
      return;
    }
    const outcome = grantBattleReward({
      battleId: state.snapshot.battleId,
      bossId: state.snapshot.boss.bossId,
      outcome: state.result.outcome,
      roundsElapsed: state.result.roundsElapsed,
      entryTxnId: entryTxnId ?? undefined,
    });
    setRewardOutcome(outcome);
  }, [state, entryTxnId]);

  const body = (
    <div
      /* `motion-<level>` is what actually carries the player's Motion choice
         into CSS. Several stylesheets under this root gate their animations on
         `@media (prefers-reduced-motion: reduce)`, which only ever saw the OS
         preference — a player who set Motion → off in the combat HUD without
         the OS flag still got every one of them. Emitting the resolved level
         here fixes all of them at once, and covers the mobile tree too, since
         both layout dispatches live under this element. */
      className={`fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone motion-${motionLevel}`}
      style={{ background: '#050308' }}
      aria-label="Active combat"
      role="dialog"
      aria-modal="true"
      data-battle-runtime="authentic"
      data-battle-scenario={import.meta.env.DEV ? BATTLE_STUDIO_SCENARIO : undefined}
      data-battle-phase={import.meta.env.DEV ? state?.phase : undefined}
      data-battle-id={import.meta.env.DEV ? state?.snapshot.battleId : undefined}
      data-battle-round={import.meta.env.DEV ? state?.round : undefined}
      data-battle-event-count={import.meta.env.DEV ? events.length : undefined}
      data-battle-current-beat={import.meta.env.DEV ? presentation.currentBeat?.id : undefined}
      data-battle-current-event={import.meta.env.DEV ? presentation.currentBeat?.event.kind : undefined}
      data-battle-input-locked={import.meta.env.DEV ? presentation.isPlaying : undefined}
      data-battle-queued-beats={import.meta.env.DEV ? presentation.pendingCount : undefined}
      data-battle-motion={import.meta.env.DEV ? motionLevel : undefined}
    >
      {isMobile ? (
        <div className="w-full h-full">
          {error ? (
            <ErrorPanel error={error} onExit={onExit} />
          ) : !state ? (
            <LoadingPanel />
          ) : (
            <MobileCombatScene
              state={state}
              actingActorId={actingActorId}
              partyCards={partyCards}
              currentBeat={presentation.currentBeat}
              motionLevel={motionLevel}
              journalEntries={journalEntries}
              isPlaying={presentation.isPlaying}
              pendingCount={presentation.pendingCount}
              onSkip={presentation.skip}
              onSubmit={onSubmit}
              onSelectActor={onSelectActor}
              onExit={onExit}
            />
          )}
        </div>
      ) : (
        /* Single full-bleed arena. The journal is an overlay sibling pinned to
           the top-right corner, not a grid column — that's what lets the
           CombatScene command shelf run the full width of the viewport. */
        <div className="relative w-full h-full overflow-hidden">
          {error ? (
            <ErrorPanel error={error} onExit={onExit} />
          ) : !state ? (
            <LoadingPanel />
          ) : (
            <>
              <CombatScene
                state={state}
                events={events}
                actingActorId={actingActorId}
                partyCards={partyCards}
                currentBeat={presentation.currentBeat}
                presentationLocked={presentation.isPlaying}
                motionLevel={motionLevel}
                onChangeMotionLevel={setMotionLevel}
                onSubmit={onSubmit}
                onSelectActor={onSelectActor}
                onExit={onExit}
              />
              <CombatJournalRail
                journalEntries={journalEntries}
                isPlaying={presentation.isPlaying}
                pendingCount={presentation.pendingCount}
                onSkip={presentation.skip}
                round={state.round}
                roundsRemaining={Math.max(0, TIMEOUT_ROUND_CAP - state.round)}
              />
            </>
          )}
        </div>
      )}

      {state?.phase === 'battle_over' && state.result && (
        <ResultModal
          outcome={state.result.outcome}
          roundsElapsed={state.result.roundsElapsed}
          reward={rewardOutcome}
          onRestart={onRestart}
          onExit={onExit}
        />
      )}

      <style>{`
        /* Journal owns the top-right corner outright — the Turn Badge that
           used to share this row was removed; its round counter and timeout
           clock live in the journal header now, and its resolve state moved
           next to End Turn. */
        .combat-journal-box { top: 12px; right: 12px; width: 320px; }

        /* Under ~720px the 372px Boss HUD and a 320px journal can no longer
           share a row without overlapping, so the journal drops below the
           Boss HUD's band. */
        @media (max-width: 720px) {
          .combat-journal-box { top: 216px; width: 280px; }
        }
      `}</style>
    </div>
  );

  return createPortal(body, document.body);
}

function ErrorPanel({ error, onExit }: { error: string; onExit: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="max-w-md p-6 rounded border border-crimson/40 bg-void/70">
        <h2 className="font-fantasy text-xl text-crimson mb-2">Cannot start battle</h2>
        <p className="text-sm mb-4">{error}</p>
        <button
          onClick={onExit}
          className="px-4 py-2 rounded font-fantasy text-sm font-bold"
          style={{ background: '#8a1c1c', color: '#faeaca' }}
        >
          Back
        </button>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-bone/60 font-fantasy">
      Preparing the arena…
    </div>
  );
}

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card } from '../../types/card';
import type { BattleEvent, BattleState, PlayerAction } from '../../types/combat';
import {
  grantBattleReward,
  type BattleRewardOutcome,
} from '../../services/combat/battleRewardService';
import { useCombatPresentation } from '../../services/combat/presentation/useCombatPresentation';
import { CombatScene } from './CombatScene';
import { CombatJournalRail } from './CombatJournalRail';
import { ResultModal } from './ResultModal';
import { MobileCombatScene } from './mobile/MobileCombatScene';

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
 *   - Desktop / tablet (>520px): two-column grid — CombatScene left, Combat
 *     Journal rail right. Unchanged from prior implementation.
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
  const presentation = useCombatPresentation(events);
  const isMobile = useIsMobileCombatLayout();

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
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone"
      style={{ background: '#050308' }}
      aria-label="Active combat"
      role="dialog"
      aria-modal="true"
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
              journal={presentation.journal}
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
        <div className="grid h-full combat-grid">
          {/* Arena column */}
          <div className="relative overflow-hidden min-h-0 h-full">
            {error ? (
              <ErrorPanel error={error} onExit={onExit} />
            ) : !state ? (
              <LoadingPanel />
            ) : (
              <CombatScene
                state={state}
                actingActorId={actingActorId}
                partyCards={partyCards}
                currentBeat={presentation.currentBeat}
                onSubmit={onSubmit}
                onSelectActor={onSelectActor}
                onExit={onExit}
              />
            )}
          </div>
          {/* Journal rail */}
          <CombatJournalRail
            journal={presentation.journal}
            isPlaying={presentation.isPlaying}
            pendingCount={presentation.pendingCount}
            onSkip={presentation.skip}
          />
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
        .combat-grid {
          grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
          grid-template-rows: minmax(0, 1fr);
        }
        .combat-grid > * { min-height: 0; }
        @media (max-width: 900px) and (min-width: 521px) {
          .combat-grid {
            grid-template-columns: 1fr;
            grid-template-rows: minmax(60dvh, 1fr) minmax(0, 320px);
            overflow-y: auto;
          }
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

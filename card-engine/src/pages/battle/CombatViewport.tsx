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

interface Props {
  state: BattleState | null;
  events: readonly BattleEvent[];
  actingActorId: string | null;
  partyCards: Card[];
  entryTxnId: string | null;
  error: string | null;
  onSubmit: (action: PlayerAction) => void;
  onRestart: () => void;
  onExit: () => void;
}

/**
 * Full-screen combat shell. Escapes the normal App.tsx layout via a portal
 * to document.body, occupying 100vw × 100dvh with no shell chrome. The
 * viewport is a two-column grid on desktop (Arena scene left, Journal rail
 * right); on mobile the columns stack vertically.
 *
 * Route lifecycle:
 *   - Picker still renders inside the normal app shell (pre-combat).
 *   - Once a party + boss are chosen and useBattle returns state, this
 *     viewport takes over the entire screen until the user leaves.
 */
export function CombatViewport({
  state,
  events,
  actingActorId,
  partyCards,
  entryTxnId,
  error,
  onSubmit,
  onRestart,
  onExit,
}: Props) {
  const [rewardOutcome, setRewardOutcome] = useState<BattleRewardOutcome | null>(null);
  const presentation = useCombatPresentation(events);

  // Lock document scroll + hide any app-shell overflow behind us while
  // combat owns the viewport.
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
      {/* Two-column grid on desktop; stacked on mobile.
          `min-h-0` on both children is critical — without it CSS Grid's
          default `min-height: auto` lets the intrinsic content of an item
          push the `1fr` row past the container height. Once we cross that,
          the Arena column balloons (observed 2280px in an 800px viewport),
          the CombatScene's absolute children anchor to a bloated containing
          block, and hero lanes end up rendered 1000px below the viewport
          bottom. min-h-0 pins the row to the container. */}
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
        @media (max-width: 900px) {
          .combat-grid {
            grid-template-columns: 1fr;
            /* Arena keeps at least 60dvh so the scene is readable; journal
               scrolls in its own row below. minmax pins both tracks so the
               absolute-positioned CombatScene children do not inflate the
               row past its allotment. */
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

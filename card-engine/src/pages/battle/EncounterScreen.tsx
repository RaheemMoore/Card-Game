import { useEffect, useState } from 'react';
import type { BattleEvent, BattleState, PlayerAction } from '../../types/combat';
import {
  grantBattleReward,
  type BattleRewardOutcome,
} from '../../services/combat/battleRewardService';
import { BossPanel } from './BossPanel';
import { HeroPanel } from './HeroPanel';
import { AbilityRail } from './AbilityRail';
import { UtilityRail } from './UtilityRail';
import { CombatJournal } from './CombatJournal';
import { ResultModal } from './ResultModal';

interface Props {
  state: BattleState | null;
  events: readonly BattleEvent[];
  error: string | null;
  onSubmit: (action: PlayerAction) => void;
  onRestart: () => void;
  onExit: () => void;
}

export function EncounterScreen({ state, events, error, onSubmit, onRestart, onExit }: Props) {
  const [rewardOutcome, setRewardOutcome] = useState<BattleRewardOutcome | null>(null);

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
    });
    setRewardOutcome(outcome);
  }, [state]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-6 rounded border border-crimson/40 bg-void/70 text-bone">
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
    );
  }
  if (!state) {
    return (
      <div className="text-center pt-20 text-bone/60 font-fantasy">Preparing the arena…</div>
    );
  }

  const hero = state.heroes[0];
  const boss = state.boss;
  const isOver = state.phase === 'battle_over';
  const canAct = state.phase === 'awaiting_player_action';

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">
      <div className="flex items-baseline justify-between mb-3">
        <button onClick={onExit} className="text-xs text-bone/60 hover:text-bone underline">
          ← Leave
        </button>
        <span className="text-[10px] uppercase tracking-widest text-bone/50">
          Round {state.round}
        </span>
      </div>

      <BossPanel
        boss={boss}
        intentText={boss.currentIntent?.telegraphText ?? null}
        lastEvent={state.log[state.log.length - 1]}
      />
      <HeroPanel hero={hero} />
      <AbilityRail hero={hero} bossActorId={boss.actorId} disabled={!canAct} onSubmit={onSubmit} />
      <UtilityRail onSubmit={onSubmit} disabled={!canAct} />
      <CombatJournal rawEvents={events} />

      {isOver && (
        <ResultModal
          outcome={state.result!.outcome}
          roundsElapsed={state.result!.roundsElapsed}
          reward={rewardOutcome}
          onRestart={onRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
}

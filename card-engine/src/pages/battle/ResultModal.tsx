import type { BattleRewardOutcome, GrantedItem } from '../../services/combat/battleRewardService';

interface Props {
  outcome: string;
  roundsElapsed: number;
  reward: BattleRewardOutcome | null;
  onRestart: () => void;
  onExit: () => void;
}

export function ResultModal({ outcome, roundsElapsed, reward, onRestart, onExit }: Props) {
  const isWin = outcome === 'victory';
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-void/80 z-30">
      <div
        className="max-w-md mx-4 p-6 rounded-lg border shadow-2xl"
        style={{
          background: isWin
            ? 'linear-gradient(to bottom, #faeaca, #efcfa4)'
            : 'linear-gradient(to bottom, #2a1010, #1a0808)',
          color: isWin ? '#4a3211' : '#faeaca',
          borderColor: isWin ? 'rgba(184,134,11,0.6)' : 'rgba(220,38,38,0.5)',
        }}
      >
        <h2 className="font-fantasy text-3xl mb-2">{isWin ? 'Victory' : 'Defeat'}</h2>
        <p className="text-sm mb-4">
          {isWin
            ? `The Emberborn Wraith falls in ${roundsElapsed} rounds.`
            : `You fell after ${roundsElapsed} rounds. The ash still smoulders.`}
        </p>
        {isWin && reward && <RewardSummary outcome={reward} />}
        <div className="flex gap-2 mt-4">
          <button
            onClick={onRestart}
            className="flex-1 py-2 rounded font-fantasy font-bold"
            style={{ background: isWin ? '#8a1c1c' : '#b8860b', color: '#faeaca' }}
          >
            Rematch
          </button>
          <button
            onClick={onExit}
            className="flex-1 py-2 rounded font-fantasy font-bold border"
            style={{
              background: 'transparent',
              color: isWin ? '#4a3211' : '#faeaca',
              borderColor: 'currentColor',
            }}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardSummary({ outcome }: { outcome: BattleRewardOutcome }) {
  if (outcome.kind === 'no_reward') {
    return <div className="text-xs italic opacity-70">No reward this battle.</div>;
  }
  const items: GrantedItem[] = outcome.items;
  const isFirst = outcome.tier === 'first_clear';
  const isAlready = outcome.kind === 'already_granted';
  return (
    <div
      className="rounded p-3 border"
      style={{ background: 'rgba(74,50,17,0.08)', borderColor: 'rgba(74,50,17,0.3)' }}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-80 mb-1">
        {isFirst ? '★ First Clear' : 'Repeat Clear'}
        {isAlready && ' · already granted'}
      </div>
      <ul className="text-sm space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="tabular-nums">
            +{item.amount} {item.currency === 'gameplay' ? 'Gold' : 'Forge Crystals'}
          </li>
        ))}
      </ul>
    </div>
  );
}

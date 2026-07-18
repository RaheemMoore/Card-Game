import type { BattleState } from '../../types/combat';
import { formatEvent } from './formatEvent';

export function EventLog({ state }: { state: BattleState }) {
  const lastEvents = state.log.slice(-8);
  return (
    <div className="rounded-lg border border-bone/15 bg-void/40 p-3 mb-6 max-h-40 overflow-y-auto">
      <div className="text-[10px] uppercase tracking-widest text-bone/50 mb-1">Combat log</div>
      {lastEvents.map((e, i) => (
        <div key={i} className="text-[11px] text-bone/70 font-mono">
          {formatEvent(e)}
        </div>
      ))}
    </div>
  );
}

import type { BossCombatant, BattleIntent } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';

interface Props {
  boss: BossCombatant;
  intent: BattleIntent | null;
  currentBeat: AnimationBeat | null;
}

/**
 * Compact upper-left overlay: boss name, HP, phase, rage indicator, and
 * intent panel. NOT the boss itself — the actual boss sprite is BossStage.
 */
export function BossHUDOverlay({ boss, intent, currentBeat }: Props) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const phaseLabel = boss.currentPhaseId.replace(/^phase_fe_/, '');
  const isRage = phaseLabel === 'rage';
  const isWindingUp =
    currentBeat?.event.kind === 'boss_intent_declared' &&
    ['heavy_attack', 'area_attack', 'ultimate', 'execute'].includes(
      currentBeat.event.intent.intentType,
    );

  return (
    <div
      className="absolute top-4 left-4 z-30 flex flex-col gap-2"
      style={{ maxWidth: 'min(420px, 40%)' }}
    >
      {/* HP + name card */}
      <div
        className="rounded-md px-3 py-2 border backdrop-blur-sm"
        style={{
          background: 'rgba(8,4,10,0.72)',
          borderColor: isRage ? 'rgba(255,120,40,0.55)' : 'rgba(184,26,26,0.5)',
          boxShadow: isRage ? '0 0 22px rgba(255,120,40,0.35)' : undefined,
        }}
        role="status"
        aria-label={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}`}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-fantasy text-sm text-bone truncate">
            {boss.snapshot.name}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-bone/50">
            {isRage ? '⚡ RAGE' : phaseLabel}
          </span>
        </div>
        <div className="mt-1.5 h-2 rounded-full bg-void/80 overflow-hidden border border-bone/20">
          <div
            className="h-full bg-gradient-to-r from-crimson to-red-500 transition-all duration-300"
            style={{ width: `${hpPct * 100}%` }}
          />
        </div>
        <div className="text-[10px] text-bone/60 mt-0.5 tabular-nums">
          {boss.hp} / {boss.snapshot.maxHp} HP
        </div>
      </div>

      {/* Intent — always render when the boss has one so the player knows what's coming. */}
      {intent && (
        <div
          className="rounded-md px-3 py-2 border text-[11px] backdrop-blur-sm transition-colors"
          style={
            isWindingUp
              ? {
                  background: 'rgba(140,20,20,0.45)',
                  borderColor: 'rgba(255,120,40,0.85)',
                  boxShadow: '0 0 18px rgba(255,120,40,0.6)',
                }
              : {
                  background: 'rgba(30,10,15,0.7)',
                  borderColor: 'rgba(184,26,26,0.5)',
                }
          }
        >
          <div className="text-[9px] uppercase tracking-widest text-crimson/90 font-fantasy">
            {isWindingUp ? 'Winding up' : 'Intent'}
          </div>
          <div className="text-bone mt-0.5">{intent.telegraphText}</div>
        </div>
      )}
    </div>
  );
}

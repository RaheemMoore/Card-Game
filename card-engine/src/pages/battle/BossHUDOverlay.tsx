import type { BossCombatant, BattleIntent } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';

interface Props {
  boss: BossCombatant;
  intent: BattleIntent | null;
  currentBeat: AnimationBeat | null;
}

/**
 * Compact upper-left HUD: boss name (primary), HP + phase bar, intent panel.
 * The intent panel is visually connected to the HUD (shares a spine + border
 * treatment) so the two read as one governed control.
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
      className="absolute top-3 left-3 z-30"
      style={{ maxWidth: 'min(360px, 34%)' }}
    >
      {/* Localized dark gradient behind the HUD for legibility over the arena. */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-lg"
        style={{
          top: '-8px', left: '-10px', right: '-10px', bottom: '-8px',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(4,2,8,0.75) 0%, rgba(4,2,8,0) 75%)',
        }}
      />

      <div
        className="relative rounded-t-md border border-b-0 backdrop-blur-sm"
        style={{
          background: 'linear-gradient(180deg, rgba(20,10,14,0.9) 0%, rgba(12,6,10,0.88) 100%)',
          borderColor: isRage ? 'rgba(255,120,40,0.55)' : 'rgba(184,26,26,0.55)',
          boxShadow: isRage ? '0 0 22px rgba(255,120,40,0.35)' : undefined,
        }}
        role="status"
        aria-label={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}`}
      >
        <div className="px-3 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-fantasy text-base leading-tight text-bone truncate">
              {boss.snapshot.name}
            </span>
            <span
              className={`text-[9px] uppercase tracking-widest font-fantasy ${
                isRage ? 'text-orange-300' : 'text-bone/40'
              }`}
            >
              {isRage ? '⚡ Rage' : phaseLabel}
            </span>
          </div>
          {/* HP bar in a fantasy frame */}
          <div
            className="mt-1.5 h-2.5 rounded-sm overflow-hidden border relative"
            style={{
              borderColor: 'rgba(184,134,11,0.5)',
              background: 'rgba(0,0,0,0.65)',
            }}
          >
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${hpPct * 100}%`,
                background:
                  'linear-gradient(180deg, #d13438 0%, #8a1c1c 50%, #5a0e0e 100%)',
              }}
            />
          </div>
          <div className="text-[10px] text-bone/70 mt-0.5 tabular-nums font-fantasy">
            {boss.hp} / {boss.snapshot.maxHp} HP
          </div>
        </div>

        {/* Intent panel — attached directly to HUD (shared bottom edge) */}
        {intent && (
          <div
            className="mt-2 mx-[-1px] mb-[-1px] rounded-b-md border-t px-3 py-1.5 text-[11px] transition-colors"
            style={
              isWindingUp
                ? {
                    background: 'rgba(140,20,20,0.5)',
                    borderColor: 'rgba(255,120,40,0.85)',
                    boxShadow: '0 0 16px rgba(255,120,40,0.55)',
                  }
                : {
                    background: 'rgba(35,15,20,0.75)',
                    borderColor: 'rgba(184,26,26,0.45)',
                  }
            }
          >
            <div className="text-[9px] uppercase tracking-widest text-crimson/85 font-fantasy">
              {isWindingUp ? 'Winding up' : 'Intent'}
            </div>
            <div className="text-bone/95 mt-0.5 leading-snug">{intent.telegraphText}</div>
          </div>
        )}
      </div>
    </div>
  );
}

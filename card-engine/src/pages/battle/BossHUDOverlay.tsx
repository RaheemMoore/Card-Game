import type { BossCombatant, BattleIntent, BattleState } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { FantasyPanel } from './FantasyPanel';
import { getCurrentBossVersion } from '../../services/bosses/registry';

interface Props {
  boss: BossCombatant;
  intent: BattleIntent | null;
  currentBeat: AnimationBeat | null;
  state: BattleState;
}

/**
 * Upper-left HUD: boss name (primary), HP + phase, Rage meter, resistance
 * icon strip. Intent panel below (visually attached) shows target + exact
 * projected damage, per the approved reference.
 */
export function BossHUDOverlay({ boss, intent, currentBeat, state }: Props) {
  const hpPct = Math.max(0, boss.hp / boss.snapshot.maxHp);
  const phaseLabel = boss.currentPhaseId.replace(/^phase_fe_/, '');
  const isRage = phaseLabel === 'rage';
  const isWindingUp =
    currentBeat?.event.kind === 'boss_intent_declared' &&
    ['heavy_attack', 'area_attack', 'ultimate', 'execute'].includes(
      currentBeat.event.intent.intentType,
    );

  // Rage triggers at 25% HP (v3). Show the % readout regardless so players
  // see how close they are.
  const RAGE_THRESHOLD = 0.25;
  const ragePct = Math.max(
    0,
    Math.min(100, ((RAGE_THRESHOLD - hpPct) / RAGE_THRESHOLD) * -100 + 100),
  );
  const rageReady = hpPct <= RAGE_THRESHOLD;

  // Load the boss version to render the resistance icon strip. Runtime-safe
  // because getCurrentBossVersion is a synchronous library lookup, not a
  // snapshot mutation.
  const version = getCurrentBossVersion(boss.snapshot.bossId);
  const resistances = version?.resistanceProfile ?? { resistant: [], weak: [] };

  // Projected damage for the intent — raw pre-mitigation from the action
  // snapshot. Matches the approved reference's "Attack 428 Damage" format.
  const currentPhase = boss.snapshot.phases.find((p) => p.id === boss.currentPhaseId);
  const intentAction = intent
    ? currentPhase?.actions.find((a) => a.id === intent.actionId)
    : null;
  const projectedDamage = intentAction
    ? intentAction.baseDamage + Math.floor(intentAction.scalingPerRound * state.round)
    : 0;

  const targetHero = intent
    ? state.heroes.find((h) => h.actorId === intent.targetActorIds[0])
    : null;
  const targetLabel = targetHero
    ? targetHero.snapshot.displayName
    : intent && intent.targetActorIds.length > 1
    ? 'ALL HEROES'
    : '—';

  return (
    <div className="absolute top-3 left-3 z-30" style={{ maxWidth: 'min(380px, 34%)' }}>
      {/* Localized dark radial for legibility over arena */}
      <div
        aria-hidden
        className="absolute pointer-events-none rounded-lg"
        style={{
          top: '-10px', left: '-12px', right: '-12px', bottom: '-10px',
          background: 'radial-gradient(ellipse at 30% 40%, rgba(4,2,8,0.75) 0%, rgba(4,2,8,0) 75%)',
        }}
      />

      {/* Primary HUD panel */}
      <FantasyPanel
        className="rounded-t-md"
        accent={isRage ? 'rgba(255,120,40,0.7)' : 'rgba(184,134,11,0.65)'}
        glow={isRage ? 'rgba(255,120,40,0.35)' : undefined}
        role="status"
        ariaLabel={`${boss.snapshot.name}: ${boss.hp} of ${boss.snapshot.maxHp} HP, phase ${phaseLabel}`}
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        <div className="px-3 py-2">
          {/* Name row */}
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-fantasy text-base leading-tight text-crimson tracking-wide">
              {boss.snapshot.name}
            </span>
            <span
              className={`text-[9px] uppercase tracking-widest font-fantasy ${
                isRage ? 'text-orange-300' : 'text-bone/45'
              }`}
            >
              {isRage ? '⚡ Rage' : phaseLabel}
            </span>
          </div>

          {/* HP bar */}
          <BarFrame>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${hpPct * 100}%`,
                background: 'linear-gradient(180deg, #d13438 0%, #8a1c1c 50%, #5a0e0e 100%)',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-fantasy text-bone/95 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {boss.hp} / {boss.snapshot.maxHp} HP
            </span>
          </BarFrame>

          {/* Rage bar */}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest text-bone/55 font-fantasy w-8">
              Rage
            </span>
            <div className="flex-1">
              <BarFrame slim>
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${ragePct}%`,
                    background: rageReady
                      ? 'linear-gradient(180deg, #ffbb44 0%, #f28a2e 50%, #b8860b 100%)'
                      : 'linear-gradient(180deg, #6b3820 0%, #4a220f 100%)',
                  }}
                />
              </BarFrame>
            </div>
            <span className="text-[10px] font-fantasy text-bone/80 tabular-nums w-8 text-right">
              {Math.round(ragePct)}%
            </span>
          </div>

          {/* Resistance icon strip */}
          <div className="mt-2 flex items-center gap-1.5">
            <ResistanceIcon type="fire"   status={statusOf('fire',    resistances)} />
            <ResistanceIcon type="holy"   status={statusOf('holy',    resistances)} />
            <ResistanceIcon type="nature" status={statusOf('nature',  resistances)} />
            <ResistanceIcon type="ice"    status={statusOf('ice',     resistances)} />
            <ResistanceIcon type="dark"   status={statusOf('dark',    resistances)} />
          </div>
        </div>
      </FantasyPanel>

      {/* Intent panel — visually attached below the HUD */}
      {intent && (
        <FantasyPanel
          className="mt-[-1px]"
          accent={
            isWindingUp ? 'rgba(255,120,40,0.85)' : 'rgba(184,26,26,0.55)'
          }
          glow={isWindingUp ? 'rgba(255,120,40,0.5)' : undefined}
          style={{
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            background: isWindingUp
              ? 'linear-gradient(180deg, rgba(96,20,15,0.85) 0%, rgba(45,12,10,0.9) 100%)'
              : 'linear-gradient(180deg, rgba(45,15,20,0.88) 0%, rgba(20,8,12,0.92) 100%)',
          }}
        >
          <div className="px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[9px] uppercase tracking-widest text-crimson/85 font-fantasy">
                {isWindingUp ? 'Winding up' : 'Intent'}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-bone/50 font-fantasy">
                Targets: {targetLabel}
              </span>
            </div>
            <div className="text-[11px] text-bone/95 leading-snug mt-1">
              {intent.telegraphText}
            </div>
            {projectedDamage > 0 && (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] font-fantasy">
                <span className="text-crimson/90">⚔</span>
                <span className="text-bone/80">Attack</span>
                <span className="text-bone tabular-nums font-bold">{projectedDamage}</span>
                <span className="text-bone/60">Damage</span>
              </div>
            )}
          </div>
        </FantasyPanel>
      )}
    </div>
  );
}

/** Slim gold-trimmed bar frame used for HP + Rage. */
function BarFrame({ children, slim = false }: { children: React.ReactNode; slim?: boolean }) {
  return (
    <div
      className="relative overflow-hidden mt-1.5"
      style={{
        height: slim ? 6 : 12,
        borderRadius: 2,
        border: '1px solid rgba(184,134,11,0.55)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.8)',
        background: 'rgba(0,0,0,0.75)',
      }}
    >
      {children}
    </div>
  );
}

const RESIST_ICON: Record<string, string> = {
  fire: '🜂', holy: '☨', nature: '❦', ice: '❄', dark: '🜄',
};

function statusOf(t: string, r: { resistant: readonly string[]; weak: readonly string[] }):
  'resistant' | 'weak' | 'neutral' {
  if (r.resistant.includes(t as never)) return 'resistant';
  if (r.weak.includes(t as never)) return 'weak';
  return 'neutral';
}

function ResistanceIcon({
  type,
  status,
}: {
  type: string;
  status: 'resistant' | 'weak' | 'neutral';
}) {
  const modifier = status === 'resistant' ? '−' : status === 'weak' ? '+' : ' ';
  const badge =
    status === 'resistant'
      ? { bg: 'rgba(80,20,20,0.9)', border: 'rgba(255,80,80,0.6)', label: '−50%' }
      : status === 'weak'
      ? { bg: 'rgba(80,60,20,0.9)', border: 'rgba(255,200,80,0.6)', label: '+50%' }
      : { bg: 'rgba(20,20,30,0.75)', border: 'rgba(120,120,140,0.35)', label: '' };
  return (
    <div
      className="flex items-center justify-center rounded-md text-[10px] leading-none font-fantasy"
      style={{
        width: 22,
        height: 22,
        background: badge.bg,
        border: `1px solid ${badge.border}`,
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
      }}
      title={`${type} ${status === 'neutral' ? 'neutral' : status + ' ' + modifier}`}
      aria-label={`${type} ${status}`}
    >
      <span className="text-bone/85">{RESIST_ICON[type] ?? '·'}</span>
    </div>
  );
}

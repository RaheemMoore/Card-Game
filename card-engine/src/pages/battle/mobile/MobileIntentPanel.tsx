import type { BossCombatant, BattleIntent, BattleState } from '../../../types/combat';

interface Props {
  boss: BossCombatant;
  intent: BattleIntent | null;
  state: BattleState;
}

/**
 * Mobile Intent chip — deliberately subtle. Single-line pill with attack
 * name → target · damage. Sits under the boss header (not in front of the
 * boss sprite) so it never competes with the arena for attention.
 *
 * Uses translucent bg + hairline gold border instead of the full CombatFrame
 * treatment, keeping the boss and cards as the visual focus per Raheem's
 * direction.
 */
export function MobileIntentPanel({ boss, intent, state }: Props) {
  if (!intent) return null;

  const currentPhase = boss.snapshot.phases.find((p) => p.id === boss.currentPhaseId);
  const intentAction = currentPhase?.actions.find((a) => a.id === intent.actionId);
  const projectedDamage = intentAction
    ? intentAction.baseDamage + Math.floor(intentAction.scalingPerRound * state.round)
    : 0;
  const isInterruptible = !!intentAction?.interruptible;

  const targetHero = state.heroes.find((h) => h.actorId === intent.targetActorIds[0]);
  const targetLabel = targetHero
    ? targetHero.snapshot.displayName
    : intent.targetActorIds.length > 1
    ? 'ALL'
    : '—';

  const attackName = intentAction?.displayName ?? 'Attack';

  return (
    <div
      aria-label={`Boss intent: ${attackName} on ${targetLabel} for ${projectedDamage} damage`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 3,
        background: 'rgba(10,6,4,0.72)',
        border: '1px solid rgba(184,110,40,0.55)',
        color: '#d6c19a',
        fontSize: 9,
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: 0.3,
        backdropFilter: 'blur(2px)',
        maxWidth: 200,
      }}
    >
      <span
        aria-hidden
        style={{
          color: '#e0912e',
          fontWeight: 700,
          fontSize: 8,
          letterSpacing: 1.1,
          flexShrink: 0,
        }}
      >
        NEXT
      </span>
      <span
        style={{
          color: '#e8d3a8',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {attackName}
      </span>
      <span aria-hidden style={{ color: '#7a6a4c' }}>→</span>
      <span
        style={{
          color: '#c8a86a',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
        }}
      >
        {targetLabel}
      </span>
      {projectedDamage > 0 && (
        <span
          style={{
            color: '#ff7a4f',
            fontWeight: 700,
            fontSize: 10,
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {projectedDamage}
        </span>
      )}
      {isInterruptible && (
        <span
          title="Interruptible — burst enough damage before the boss acts to fizzle it"
          style={{
            color: '#ffd76a',
            fontSize: 10,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ⚡
        </span>
      )}
    </div>
  );
}

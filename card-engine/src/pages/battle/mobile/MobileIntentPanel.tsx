import type { BattleState } from '../../../types/combat';
import { deriveThreat } from '../../../services/combat/decision/objectives';

interface Props {
  state: BattleState;
}

/**
 * Mobile Intent chip — deliberately subtle. Sits under the boss header (not
 * in front of the boss sprite) so it never competes with the arena for
 * attention.
 *
 * Now built on the same `deriveThreat` view model as the desktop Threat
 * Translator, rather than a second read of `BossActionSnapshot`. The
 * previous version computed `baseDamage + scalingPerRound * round` directly —
 * correct for an unresolved single-round action, but silently WRONG for a
 * charging one: it never applied the charge's partial-mitigation multiplier,
 * so a charge the party had half-broken still showed full damage. Sharing
 * the evaluator means this chip and the desktop panel cannot show two
 * different numbers for the same fight.
 */
export function MobileIntentPanel({ state }: Props) {
  const threat = deriveThreat(state);
  if (!threat) return null;

  const interrupt = threat.objectives.find((o) => o.kind === 'interrupt');
  const charge = threat.objectives.find((o) => o.kind === 'charge');

  const targetLabel = threat.hitsWholeParty
    ? 'ALL'
    : threat.targetActorIds[0]
    ? (state.heroes.find((h) => h.actorId === threat.targetActorIds[0])?.snapshot.displayName ?? '—')
    : '—';

  return (
    <div
      aria-label={`Boss intent: ${threat.displayName} on ${targetLabel}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        padding: '3px 8px',
        borderRadius: 3,
        background: 'rgba(10,6,4,0.72)',
        border: '1px solid rgba(184,110,40,0.55)',
        color: '#d6c19a',
        fontSize: 9,
        fontFamily: 'Inter, system-ui, sans-serif',
        letterSpacing: 0.3,
        backdropFilter: 'blur(2px)',
        maxWidth: 220,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          aria-hidden
          style={{ color: '#e0912e', fontWeight: 700, fontSize: 8, letterSpacing: 1.1, flexShrink: 0 }}
        >
          {threat.timing.kind === 'charged' ? `${threat.timing.roundsRemaining}⏳` : 'NEXT'}
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
          {threat.displayName}
        </span>
        <span aria-hidden style={{ color: '#7a6a4c' }}>
          →
        </span>
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
        {interrupt && (
          <span
            title={`Interrupt: ${interrupt.dealt} / ${interrupt.required} — no partial credit`}
            style={{ color: '#ffd76a', fontSize: 10, fontWeight: 700, flexShrink: 0 }}
          >
            ⚡{interrupt.dealt}/{interrupt.required}
          </span>
        )}
      </div>
      {charge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              flex: 1,
              height: 4,
              background: '#1a1210',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(Math.min(1, Math.max(0, charge.progress)) * 100)}%`,
                height: '100%',
                background: '#ed8c1a',
              }}
            />
          </div>
          <span style={{ color: '#e6a04a', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>
            {charge.break.kind === 'damage' && charge.damage
              ? `${charge.damage.dealt}/${charge.damage.required}`
              : charge.break.kind === 'party_action'
              ? `${charge.contributors?.length ?? 0}/${charge.contributorsRequired}`
              : `${Math.round(charge.progress * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
}

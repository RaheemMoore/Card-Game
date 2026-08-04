import type { BattleState } from '../../types/combat';
import { deriveThreat } from '../../services/combat/decision/objectives';
import { PaintedPanel } from './PaintedPanel';

interface Props {
  state: BattleState;
}

/**
 * The persistent "what is the boss doing right now" surface.
 *
 * Desktop lost its dedicated intent panel when the old one was removed for
 * duplicating the Turn Badge and the Combat Journal — see
 * `BossHUDOverlay`'s docblock. That left the Combat Journal, a HISTORY
 * component, as the only detailed intent surface, which is why the objective
 * a player is actually solving (a two-round charge, a same-round interrupt)
 * had nowhere to live moment-to-moment.
 *
 * This does not replace the journal. It shows the CURRENT threat only;
 * everything that already resolved stays in the journal where it belongs.
 *
 * No Figma reference exists yet for this exact panel — styled to match the
 * existing painted-panel family (`BossHUDOverlay`, the command shelf) rather
 * than inventing new geometry. Flagged for Raheem's review before this
 * becomes the template other bosses use.
 */
export function ThreatTranslator({ state }: Props) {
  const threat = deriveThreat(state);
  if (!threat) return null;

  const interrupt = threat.objectives.find((o) => o.kind === 'interrupt');
  const charge = threat.objectives.find((o) => o.kind === 'charge');

  return (
    <PaintedPanel
      borderWidth={6}
      cornerSize={16}
      background="#0a0708"
      style={{
        position: 'absolute',
        top: 12,
        left: 396,
        width: 300,
        padding: '10px 12px',
        zIndex: 30,
      }}
      role="status"
      ariaLabel={`Current threat: ${threat.displayName}`}
    >
      <div
        style={{
          color: '#8c7d63',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.2,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {threat.timing.kind === 'charged'
          ? `CHARGING · ${threat.timing.roundsRemaining} ROUND${threat.timing.roundsRemaining === 1 ? '' : 'S'} LEFT`
          : 'THIS ROUND'}
      </div>
      <div
        style={{
          color: '#eddbb5',
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginTop: 2,
        }}
      >
        {threat.displayName}
      </div>
      {/* Authored flavour — kept visually distinct from the tactical facts
          below it so the two never blur into one sentence. */}
      <div
        style={{
          color: '#a1907a',
          fontSize: 10,
          fontStyle: 'italic',
          fontFamily: 'Inter, system-ui, sans-serif',
          marginTop: 2,
        }}
      >
        {threat.tell}
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            color: '#d9c7a6',
            fontSize: 10,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {threat.hitsWholeParty ? 'Hits the whole party' : 'Hits one target'}
          {threat.statuses.length > 0 && (
            <> · applies {threat.statuses.map((s) => s.statusId).join(', ')}</>
          )}
        </div>

        {interrupt && (
          <ObjectiveBar
            label={`INTERRUPT · ${interrupt.dealt} / ${interrupt.required}`}
            progress={interrupt.progress}
            note={interrupt.met ? 'Met — cancels the action.' : 'No partial credit below this line.'}
            color="#c71412"
          />
        )}

        {charge && (
          <ObjectiveBar
            label={
              charge.break.kind === 'damage' && charge.damage
                ? `LEDGER · ${charge.damage.dealt} / ${charge.damage.required}`
                : charge.break.kind === 'party_action'
                ? `${charge.break.action.toUpperCase()} · ${charge.contributors?.length ?? 0} / ${charge.contributorsRequired}`
                : charge.break.kind === 'status'
                ? 'STATUS BREAK'
                : 'DISPEL BREAK'
            }
            progress={charge.progress}
            note={
              charge.broken
                ? 'Broken.'
                : `Currently reduces the hit by ${Math.round(charge.mitigation * 100)}% (max ${Math.round(charge.mitigationMax * 100)}%).`
            }
            color="#ed8c1a"
          />
        )}
        {charge?.break.kind === 'party_action' && charge.contributors && charge.contributors.length > 0 && (
          <div
            style={{
              color: '#9c8969',
              fontSize: 9,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Contributed: {charge.contributors.map((c) => c.displayName).join(', ')}
          </div>
        )}
      </div>
    </PaintedPanel>
  );
}

function ObjectiveBar({
  label,
  progress,
  note,
  color,
}: {
  label: string;
  progress: number;
  note: string;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          color: '#d9c7a6',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 0.6,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: '100%',
          height: 6,
          background: '#1a1210',
          border: '1px solid #3a2a1a',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
            height: '100%',
            background: color,
            transition: 'width 300ms',
          }}
        />
      </div>
      <div
        style={{
          color: '#8c7d63',
          fontSize: 9,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginTop: 2,
        }}
      >
        {note}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BattleState, PlayerAction } from '../../types/combat';
import { advance, pickActingHero, submitPlayerAction } from '../../services/combat/reducer';
import { projectAction } from '../../services/combat/decision/projectAction';
import { deriveThreat } from '../../services/combat/decision/objectives';
import { explainAbility } from '../../services/combat/decision/relationships';
import { requiresConfirmation } from '../../services/combat/decision/confirmation';
import { PILOTS, buildPilotFixture, type PilotId } from './decisionLabFixtures';

/**
 * The Decision Lab — Gate 2 of the Decision Experience System.
 *
 * Asks a different question than `/dev/ability-theater`: the Theater asks
 * "how does this action perform?"; this asks "can the player understand why
 * this action matters?" Both read the same combat truth and are cross-linked
 * rather than merged, per `05_ABILITY_PERFORMANCE_INTEGRATION.md` §5 — merging
 * them before both contracts stabilise would produce one oversized tool that
 * answers neither question well.
 *
 * Each pilot loads a REAL frozen state, built by actually running the reducer
 * to the documented moment (see `decisionLabFixtures.ts`) rather than a
 * hand-authored one a real fight could never reach. Stepping a round runs the
 * real reducer with the scripted balance-suite filler for whichever hero is
 * not the one you're inspecting, so progress advances exactly the way it
 * would in `/battle`.
 *
 * Deferred to Stage 2 (see the reviewed plan): the Encounter Briefing / party
 * coverage compiler. This Lab is Pilot C end-to-end plus contextual checks
 * for all three pilots — not the full six-system drop the original handoff
 * asked for in one pass.
 */
export function DecisionLab() {
  const [pilotId, setPilotId] = useState<PilotId>('whole_ledger');
  const [reloadKey, setReloadKey] = useState(0);
  const [tablet, setTablet] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedAbilityId, setSelectedAbilityId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initial = useMemo(() => buildPilotFixture(pilotId), [pilotId, reloadKey]);

  return (
    <DecisionLabInner
      key={`${pilotId}-${reloadKey}`}
      pilotId={pilotId}
      initial={initial}
      tablet={tablet}
      reducedMotion={reducedMotion}
      onChangePilot={(id) => {
        setPilotId(id);
        setSelectedAbilityId(null);
        setSelectedTargetId(null);
        setLog([]);
      }}
      onReload={() => {
        setReloadKey((k) => k + 1);
        setSelectedAbilityId(null);
        setSelectedTargetId(null);
        setLog([]);
      }}
      onToggleTablet={() => setTablet((v) => !v)}
      onToggleReducedMotion={() => setReducedMotion((v) => !v)}
      selectedAbilityId={selectedAbilityId}
      setSelectedAbilityId={setSelectedAbilityId}
      selectedTargetId={selectedTargetId}
      setSelectedTargetId={setSelectedTargetId}
      log={log}
      setLog={setLog}
    />
  );
}

function DecisionLabInner({
  pilotId,
  initial,
  tablet,
  reducedMotion,
  onChangePilot,
  onReload,
  onToggleTablet,
  onToggleReducedMotion,
  selectedAbilityId,
  setSelectedAbilityId,
  selectedTargetId,
  setSelectedTargetId,
  log,
  setLog,
}: {
  pilotId: PilotId;
  initial: BattleState;
  tablet: boolean;
  reducedMotion: boolean;
  onChangePilot: (id: PilotId) => void;
  onReload: () => void;
  onToggleTablet: () => void;
  onToggleReducedMotion: () => void;
  selectedAbilityId: string | null;
  setSelectedAbilityId: (id: string | null) => void;
  selectedTargetId: string | null;
  setSelectedTargetId: (id: string | null) => void;
  log: string[];
  setLog: (fn: (prev: string[]) => string[]) => void;
}) {
  const [state, setState] = useState(initial);

  const threat = deriveThreat(state);
  const actingHero = pickActingHero(state);
  const pilot = PILOTS.find((p) => p.id === pilotId)!;

  const abilities = actingHero?.snapshot.abilities ?? [];
  const selected = abilities.find((a) => a.definitionId === selectedAbilityId) ?? null;

  const needsPick = selected?.version.targetRule.type === 'single_ally';
  const targetActorIds =
    selected && needsPick
      ? selectedTargetId
        ? [selectedTargetId]
        : []
      : [];

  const projection =
    selected && actingHero
      ? projectAction(state, {
          kind: 'ability',
          abilityDefinitionId: selected.definitionId,
          targetActorIds,
        })
      : null;

  const explained = selected && projection ? explainAbility(state, threat, selected, projection) : null;
  const confirmation =
    selected && projection
      ? requiresConfirmation(state, selected, projection, {
          targetResolved: !needsPick || !!selectedTargetId,
        })
      : null;

  function runAction(action: PlayerAction) {
    if (state.phase !== 'awaiting_player_action') return;
    const step = submitPlayerAction(state, action);
    let next = step.state;
    // Drain automatic phases (reactions/boss/end-of-round) until either the
    // next hero needs input or the battle ends — same shape `/battle` uses.
    for (let i = 0; i < 30 && next.phase !== 'awaiting_player_action' && next.phase !== 'battle_over'; i++) {
      next = advance(next).state;
    }
    setState(next);
    setSelectedAbilityId(null);
    setSelectedTargetId(null);
    setLog((prev) => [...prev, describeAction(state, action), ...describeNewEvents(state, next)]);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0708',
        color: '#e8d3a8',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: 20,
      }}
    >
      <style>{`
        .decision-lab-stage { transition: all 300ms ease; }
        .decision-lab-reduced .decision-lab-stage { transition: none !important; }
      `}</style>

      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Decision Lab</h1>
          <p style={{ fontSize: 12, color: '#9c8969', margin: '2px 0 0' }}>
            Can the player understand why this action matters? ·{' '}
            <Link to="/dev/ability-theater" style={{ color: '#e0912e' }}>
              Ability Theater →
            </Link>{' '}
            (how does it perform?)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onToggleTablet} style={pillStyle(tablet)}>
            {tablet ? 'TABLET (900px)' : 'DESKTOP (1440px)'}
          </button>
          <button onClick={onToggleReducedMotion} style={pillStyle(reducedMotion)}>
            {reducedMotion ? 'REDUCED MOTION ON' : 'REDUCED MOTION OFF'}
          </button>
          <button onClick={onReload} style={pillStyle(false)}>
            ↻ RELOAD FIXTURE
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap" style={{ marginBottom: 16 }}>
        {PILOTS.map((p) => (
          <button
            key={p.id}
            onClick={() => onChangePilot(p.id)}
            style={pillStyle(p.id === pilotId)}
            title={p.proves}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#9c8969', maxWidth: 700, marginBottom: 16 }}>
        <strong style={{ color: '#d8b878' }}>Proves:</strong> {pilot.proves}
      </p>

      <div
        className={reducedMotion ? 'decision-lab-reduced' : ''}
        style={{
          width: tablet ? 900 : 1200,
          maxWidth: '100%',
          display: 'grid',
          gridTemplateColumns: tablet ? '1fr' : '340px 1fr 340px',
          gap: 16,
        }}
      >
        {/* Threat */}
        <Panel title="Current threat">
          {threat ? (
            <div style={{ fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: '#eddbb5' }}>{threat.displayName}</div>
              <div style={{ color: '#a1907a', fontStyle: 'italic', margin: '4px 0' }}>{threat.tell}</div>
              <div style={{ color: '#c8b895' }}>
                {threat.timing.kind === 'charged'
                  ? `Charging — ${threat.timing.roundsRemaining} round(s) left`
                  : 'Resolves this round'}
              </div>
              <div style={{ color: '#c8b895' }}>
                {threat.hitsWholeParty ? 'Hits the whole party' : 'Hits one target'}
                {threat.statuses.length > 0 && ` · applies ${threat.statuses.map((s) => s.statusId).join(', ')}`}
              </div>
              {threat.objectives.map((o, i) => (
                <div key={i} style={{ marginTop: 8 }}>
                  {o.kind === 'interrupt' ? (
                    <>
                      <div style={{ fontWeight: 700 }}>
                        INTERRUPT · {o.dealt} / {o.required}
                      </div>
                      <Bar progress={o.progress} color="#c71412" />
                      <div style={{ color: '#8c7d63', fontSize: 10 }}>No partial credit below the line.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700 }}>
                        {o.break.kind === 'damage' && o.damage
                          ? `LEDGER · ${o.damage.dealt} / ${o.damage.required}`
                          : o.break.kind === 'party_action'
                          ? `${o.break.action.toUpperCase()} · ${o.contributors?.length ?? 0} / ${o.contributorsRequired}`
                          : 'CHARGE'}
                      </div>
                      <Bar progress={o.progress} color="#ed8c1a" />
                      <div style={{ color: '#8c7d63', fontSize: 10 }}>
                        {o.broken
                          ? 'Broken.'
                          : `Currently reduces the hit ${Math.round(o.mitigation * 100)}% (max ${Math.round(o.mitigationMax * 100)}%).`}
                      </div>
                      {o.contributors && o.contributors.length > 0 && (
                        <div style={{ color: '#9c8969', fontSize: 10 }}>
                          Contributed: {o.contributors.map((c) => c.displayName).join(', ')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <em style={{ color: '#8c7d63', fontSize: 12 }}>No boss intent declared.</em>
          )}
          <div style={{ marginTop: 12, fontSize: 11, color: '#8c7d63' }}>
            Round {state.round} · Phase {state.phase}
          </div>
          <div style={{ marginTop: 8 }}>
            <button
              disabled={state.phase !== 'awaiting_player_action' || actingHero?.actorId !== pickActingHero(state)?.actorId}
              onClick={() => runAction({ kind: 'strike' })}
              style={actionButtonStyle}
            >
              Strike
            </button>
            <button
              disabled={state.phase !== 'awaiting_player_action'}
              onClick={() => runAction({ kind: 'guard' })}
              style={actionButtonStyle}
            >
              Guard
            </button>
          </div>
        </Panel>

        {/* Abilities + contextual explanation */}
        <Panel title={actingHero ? `Acting: ${actingHero.snapshot.displayName}` : 'Battle over'}>
          {actingHero && (
            <>
              <div className="flex gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                {abilities.map((a) => (
                  <button
                    key={a.definitionId}
                    onClick={() => {
                      setSelectedAbilityId(a.definitionId);
                      setSelectedTargetId(null);
                    }}
                    style={pillStyle(a.definitionId === selectedAbilityId)}
                  >
                    {a.displayName}
                  </button>
                ))}
              </div>
              {needsPick && selected && (
                <div className="flex gap-2 flex-wrap" style={{ marginBottom: 8 }}>
                  {state.heroes
                    .filter((h) => !h.defeated)
                    .map((h) => (
                      <button
                        key={h.actorId}
                        onClick={() => setSelectedTargetId(h.actorId)}
                        style={pillStyle(h.actorId === selectedTargetId)}
                      >
                        {h.snapshot.displayName}
                      </button>
                    ))}
                </div>
              )}

              {selected && explained && projection && (
                <div style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 700, color: '#eddbb5' }}>
                    {explained.displayName}{' '}
                    <span style={{ color: '#c8a86a', fontWeight: 400, fontSize: 10 }}>
                      · {explained.tacticalLabel} · COST {explained.resourceCost}
                    </span>
                  </div>
                  <ConfidenceBadge confidence={projection.confidence} />
                  {projection.deniedReason ? (
                    <div style={{ color: '#e0562e', marginTop: 6 }}>Unavailable: {projection.deniedReason}</div>
                  ) : (
                    <>
                      {explained.relevance.length === 0 && explained.limitations.length === 0 && (
                        <div style={{ color: '#8c7d63', fontStyle: 'italic', marginTop: 6 }}>
                          No matching rule — falls back to exact mechanics only. (Missing-rule fallback state.)
                        </div>
                      )}
                      {explained.relevance.map((n, i) => (
                        <div key={i} style={{ marginTop: 6, color: '#9fd97a' }}>
                          {n.text}
                        </div>
                      ))}
                      {explained.limitations.map((n, i) => (
                        <div key={i} style={{ marginTop: 6, color: '#d89a5c' }}>
                          {n.text}
                        </div>
                      ))}
                    </>
                  )}
                  {confirmation && (
                    <div style={{ marginTop: 10, fontSize: 10, color: confirmation.required ? '#e6a04a' : '#8c7d63' }}>
                      {confirmation.required
                        ? `⚠ Confirmation required: ${confirmation.prompt}`
                        : 'No confirmation required — commits from selection.'}
                    </div>
                  )}
                  <button
                    disabled={
                      !!projection.deniedReason ||
                      state.phase !== 'awaiting_player_action' ||
                      (needsPick && !selectedTargetId)
                    }
                    onClick={() =>
                      runAction({
                        kind: 'ability',
                        abilityDefinitionId: selected.definitionId,
                        targetActorIds,
                      })
                    }
                    style={{ ...actionButtonStyle, marginTop: 10 }}
                  >
                    Use ability
                  </button>
                </div>
              )}
              {!selected && (
                <em style={{ color: '#8c7d63', fontSize: 12 }}>Select an ability to see its exact relationship to the current threat.</em>
              )}
            </>
          )}
          {!actingHero && <em style={{ color: '#8c7d63', fontSize: 12 }}>{state.result?.outcome}</em>}
        </Panel>

        {/* Log */}
        <Panel title="Resolution receipts">
          {log.length === 0 ? (
            <em style={{ color: '#8c7d63', fontSize: 12 }}>Act to see receipts appear here.</em>
          ) : (
            <div style={{ fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {log.map((line, i) => (
                <div key={i} style={{ color: '#c8b895' }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function describeAction(before: BattleState, action: PlayerAction): string {
  const hero = pickActingHero(before);
  const name = hero?.snapshot.displayName ?? 'Hero';
  if (action.kind === 'strike') return `${name} strikes.`;
  if (action.kind === 'guard') return `${name} guards.`;
  if (action.kind === 'focus') return `${name} focuses.`;
  if (action.kind === 'ability') {
    const ability = hero?.snapshot.abilities.find((a) => a.definitionId === action.abilityDefinitionId);
    return `${name} uses ${ability?.displayName ?? action.abilityDefinitionId}.`;
  }
  return `${name} acts.`;
}

/** Compile short, authoritative receipts from what actually resolved — never
 *  from the pre-commit projection. Mirrors `06_ACCEPTANCE_AND_REVIEW_GATES.md`
 *  Gate 5's requirement that receipts reflect real events. */
function describeNewEvents(before: BattleState, after: BattleState): string[] {
  const newEvents = after.log.slice(before.log.length);
  const out: string[] = [];
  for (const e of newEvents) {
    if (e.kind === 'damage_dealt') out.push(`${e.amount} damage dealt (${e.damageType}).`);
    if (e.kind === 'healing_applied') out.push(`${e.amount} healed.`);
    if (e.kind === 'shield_gained') out.push(`${e.amount} shield gained.`);
    if (e.kind === 'status_applied') out.push(`${e.statusId.toUpperCase()} APPLIED.`);
    if (e.kind === 'status_removed') out.push(`${e.reason.toUpperCase()} — STATUS REMOVED.`);
    if (e.kind === 'action_denied' && e.reason === 'interrupted') out.push('INTERRUPTED.');
    if (e.kind === 'phase_transition') out.push('PHASE TRANSITION.');
    if (e.kind === 'actor_defeated') out.push('DEFEATED.');
    if (e.kind === 'battle_ended') out.push(`BATTLE ${e.result.outcome.toUpperCase()}.`);
  }
  return out;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="decision-lab-stage"
      style={{
        background: '#120d0a',
        border: '1px solid #3a2a1a',
        borderRadius: 6,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 1,
          color: '#8c7d63',
          marginBottom: 8,
        }}
      >
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Bar({ progress, color }: { progress: number; color: string }) {
  return (
    <div style={{ width: '100%', height: 6, background: '#1a1210', borderRadius: 3, overflow: 'hidden', margin: '3px 0' }}>
      <div
        style={{
          width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
          height: '100%',
          background: color,
        }}
      />
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: { kind: string; reason?: string; reasons?: readonly string[] } }) {
  const color = confidence.kind === 'exact' ? '#5fbf6a' : confidence.kind === 'conditional' ? '#e6a04a' : '#e0562e';
  const text =
    confidence.kind === 'exact'
      ? 'EXACT'
      : confidence.kind === 'conditional'
      ? `CONDITIONAL — ${confidence.reasons?.join(' ')}`
      : `UNKNOWN — ${confidence.reason}`;
  return (
    <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, color, marginTop: 4 }}>
      {text}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    borderRadius: 4,
    border: active ? '1.5px solid #eb962e' : '1px solid #3a2a1a',
    background: active ? 'rgba(235,150,46,0.15)' : '#120d0a',
    color: active ? '#ffdb94' : '#c8b895',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  };
}

const actionButtonStyle: React.CSSProperties = {
  padding: '5px 12px',
  borderRadius: 4,
  border: '1.5px solid #eb962e',
  background: 'linear-gradient(to right, #592b09, #1a1412)',
  color: '#ffdb94',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
  marginRight: 8,
};

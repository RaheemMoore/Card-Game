import { useEffect, useMemo, useState } from 'react';
import { SEED_BOSSES } from '../../data/bosses/seedBosses';
import { snapshotFromBossVersion } from '../../services/combat/harness';
import { analyzeBoss, type BossAnalysis } from '../../services/combat/bossAnalysis';
import { REFERENCE_PARTY_LABEL } from '../../services/combat/referenceParty';
import { BOSS_NOTES, type ActionNote } from './bossReadoutNotes';
import type { BossActionSnapshot, BossSnapshot } from '../../types/combat';
import { ReadoutStyles } from './BossReadoutStyles';
import { buildStances, type Stance } from './bossStances';
import { toStandaloneHtml } from './bossReadoutHtml';

/**
 * Boss readout — the fight on paper.
 *
 * Everything here is READ FROM THE BOSS DATA and measured by running the real
 * reducer, so it cannot drift from the fight the game ships. Change a damage
 * number in seedBosses and this page says so on the next reload; there is no
 * second copy of the truth to forget to update.
 *
 * Three audiences, one document: whoever is tuning the boss (needs the
 * numbers), whoever is reviewing it (needs the reasoning), and whoever is
 * being shown it (needs the story). Hence prose next to the tables rather
 * than a bare stat dump — and hence the export buttons, because the readout
 * is worth nothing if it only exists on one laptop.
 */

const DETERMINISTIC_PRIORITY = 30;

/**
 * Phase ids are snake_case identifiers, which is right in the data and wrong
 * in a document someone prints for their team. `BossPhaseDefinition` has no
 * display name, so derive one rather than adding a field to the shipped schema
 * for the sake of a dev page.
 */
function phaseLabel(id: string): string {
  return id
    .replace(/^phase_/, '')
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Who the action reaches, mirroring the reducer's `scopeOf`. */
function scopeLabel(a: BossActionSnapshot): string {
  // A move that deals no damage and touches no hero is aimed at himself —
  // saying "One hero" for the self-buff would be a plain lie on the page.
  if (!a.baseDamage && a.selfStatuses?.length && !a.statusApplications?.length) return 'Himself';
  if (!a.baseDamage && a.shieldAmount != null) return 'Himself';
  const scope = a.targetScope ?? (a.intentType === 'area_attack' ? 'all_heroes' : 'single');
  switch (scope) {
    case 'all_heroes':
      return 'Whole party';
    case 'lowest_hp':
      return 'Lowest HP';
    case 'highest_hp':
      return 'Highest HP';
    default:
      return 'One hero';
  }
}

function chargeLabel(a: BossActionSnapshot): string | null {
  if (!a.charge) return null;
  const b = a.charge.break;
  switch (b.kind) {
    case 'damage':
      return `Winds up ${a.charge.rounds} rounds · broken by ${Math.round(b.percentOfMaxHp * 100)}% of his HP in damage`;
    case 'party_action':
      return `Winds up ${a.charge.rounds} rounds · broken by ${b.heroCount} heroes ${b.action === 'guard' ? 'guarding' : 'focusing'} together`;
    case 'status':
      return `Winds up ${a.charge.rounds} rounds · broken by ${b.stacks} stacks of ${b.statusId}`;
    default:
      return `Winds up ${a.charge.rounds} rounds · broken by dispel`;
  }
}

/** How the picker treats this action — the thing that stops the boss looping. */
function selectionLabel(a: BossActionSnapshot): { label: string; tone: 'scripted' | 'drawn' } {
  return a.priority >= DETERMINISTIC_PRIORITY
    ? { label: 'Fires on sight', tone: 'scripted' }
    : { label: `Weighted draw · ${a.weight ?? 1}`, tone: 'drawn' };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

/* ------------------------------------------------------------------ */
/*  Markdown export                                                    */
/* ------------------------------------------------------------------ */

function toMarkdown(
  boss: BossSnapshot,
  name: string,
  analysis: BossAnalysis | null,
): string {
  const note = BOSS_NOTES[boss.bossId];
  const out: string[] = [];
  out.push(`# ${name} — fight readout`);
  out.push('');
  out.push(`**${boss.maxHp.toLocaleString()} HP** · ${boss.phases.length} phases · version \`${boss.versionId}\``);
  if (boss.resistance) {
    out.push('');
    out.push(`Resists: ${boss.resistance.resistant.join(', ') || 'nothing'}  `);
    out.push(`Weak to: ${boss.resistance.weak.join(', ') || 'nothing'}`);
  }
  if (note) {
    out.push('');
    out.push('## The fight');
    out.push('');
    out.push(note.thesis);
    out.push('');
    out.push('## How the moves combine');
    out.push('');
    out.push(note.combo);
  }

  for (const phase of boss.phases) {
    out.push('');
    out.push(`## ${phaseLabel(phase.id)} — ${Math.round(phase.healthThresholdStart * 100)}% → ${Math.round(phase.healthThresholdEnd * 100)}% health`);
    out.push('');
    out.push('| Move | Type | Damage | Hits | Cooldown | Selection | Interruptible |');
    out.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const a of phase.actions) {
      out.push(
        `| ${a.displayName} | ${a.intentType} | ${a.baseDamage || '—'} | ${scopeLabel(a)} | ` +
          `${a.cooldownRounds} | ${selectionLabel(a).label} | ${a.interruptible ? 'Yes' : 'No'} |`,
      );
    }
    for (const a of phase.actions) {
      const n: ActionNote | undefined = note?.actions[a.id];
      const charge = chargeLabel(a);
      if (!n && !charge) continue;
      out.push('');
      out.push(`### ${a.displayName}`);
      out.push('');
      out.push(`> *“${a.telegraphText}”*`);
      if (charge) {
        out.push('');
        out.push(`**Charge** — ${charge}`);
      }
      if (n) {
        out.push('');
        out.push(`**Role** — ${n.role}`);
        out.push('');
        out.push(`**When it fires** — ${n.timing}`);
        out.push('');
        out.push(`**The answer** — ${n.answer}`);
      }
    }
  }

  if (analysis) {
    out.push('');
    out.push(`## Measured over ${analysis.battles} simulated battles`);
    out.push('');
    out.push(`Reference party: ${REFERENCE_PARTY_LABEL}`);
    out.push('');
    out.push(`Average length: **${analysis.avgRounds.toFixed(1)} rounds**. ` +
      `Actions denied by the party: **${analysis.deniedPerBattle.toFixed(2)} per battle**.`);
    out.push('');
    out.push('| Move | Share of damage | Damage/battle | Declared/battle | Kills |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const t of analysis.actions) {
      out.push(
        `| ${t.actionId} | ${pct(t.damageShare)} | ${t.damagePerBattle.toFixed(0)} | ` +
          `${t.declaredPerBattle.toFixed(2)} | ${t.kills} |`,
      );
    }
    out.push('');
    out.push('### Damage spread across the party');
    out.push('');
    out.push(analysis.heroDamageShare.map((h) => `${h.displayName} ${pct(h.share)}`).join(' · '));
    out.push('');
    out.push('### Ways to win');
    out.push('');
    out.push('| Approach | Win rate | Avg rounds | Premise | Answers |');
    out.push('| --- | --- | --- | --- | --- |');
    for (const l of analysis.lines) {
      out.push(`| ${l.name} | ${pct(l.winRate)} | ${l.avgRounds.toFixed(1)} | ${l.premise} | ${l.answers} |`);
    }
  }

  if (note?.caveats.length) {
    out.push('');
    out.push('## Known weaknesses');
    out.push('');
    for (const c of note.caveats) out.push(`- ${c}`);
  }

  out.push('');
  out.push(`*Generated from live boss data on ${new Date().toISOString().slice(0, 10)}.*`);
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function BossReadout() {
  const bosses = useMemo(
    () =>
      SEED_BOSSES.map((b) => ({
        id: b.definition.id,
        name: b.definition.name,
        floor: b.definition.towerFloor,
        lore: b.definition.lore,
        snapshot: snapshotFromBossVersion(b.definition, b.version),
      })).sort((a, b) => (a.floor ?? 99) - (b.floor ?? 99)),
    [],
  );

  const [selectedId, setSelectedId] = useState(bosses[0]?.id ?? '');
  const [analysis, setAnalysis] = useState<BossAnalysis | null>(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stances, setStances] = useState<Stance[]>([]);

  const boss = bosses.find((b) => b.id === selectedId) ?? bosses[0];
  const note = BOSS_NOTES[boss.snapshot.bossId];

  // Crop the sprite stills whenever the boss changes. Async because each sheet
  // has to decode before a frame can come off it; `cancelled` keeps a slow
  // load for the previous boss from overwriting the current one's gallery.
  useEffect(() => {
    let cancelled = false;
    setStances([]);
    void buildStances(boss.snapshot.bossId).then((s) => {
      if (!cancelled) setStances(s);
    });
    return () => {
      cancelled = true;
    };
  }, [boss.snapshot.bossId]);

  const run = () => {
    setRunning(true);
    // Yield a frame so the button can repaint before the reducer blocks the
    // thread. A few hundred battles is fast, but not free.
    window.setTimeout(() => {
      setAnalysis(analyzeBoss(boss.snapshot, 300));
      setRunning(false);
    }, 16);
  };

  const markdown = () => toMarkdown(boss.snapshot, boss.name, analysis);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const saveFile = (contents: string, mime: string, extension: string) => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${boss.snapshot.bossId}-readout.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => saveFile(markdown(), 'text/markdown', 'md');

  const downloadHtml = () =>
    saveFile(
      toStandaloneHtml({
        boss: boss.snapshot,
        name: boss.name,
        lore: boss.lore,
        floor: boss.floor,
        note,
        analysis,
        stances,
        phaseLabel,
        scopeLabel,
        chargeLabel,
        selectionLabel,
      }),
      'text/html',
      'html',
    );

  const telemetryFor = (actionId: string) =>
    analysis?.actions.find((t) => t.actionId === actionId) ?? null;

  return (
    <div className="readout">
      <ReadoutStyles />

      <div className="readout-bar">
        <label className="readout-field">
          <span>Boss</span>
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setAnalysis(null); }}>
            {bosses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.floor != null ? `Floor ${b.floor} — ` : ''}{b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="readout-actions">
          <button type="button" onClick={run} disabled={running}>
            {running ? 'Fighting…' : analysis ? 'Re-run 300 battles' : 'Run 300 battles'}
          </button>
          <button type="button" onClick={downloadHtml} className="primary">Download page (.html)</button>
          <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy as Markdown'}</button>
          <button type="button" onClick={downloadMarkdown}>Download .md</button>
          <button type="button" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      <article className="sheet">
        <header className="sheet-head">
          <p className="eyebrow">
            {boss.floor != null ? `Tower floor ${boss.floor}` : 'Unplaced'} · {boss.snapshot.versionId}
          </p>
          <h1>{boss.name}</h1>
          <p className="lore">{boss.lore}</p>
          <dl className="vitals">
            <div><dt>Health</dt><dd>{boss.snapshot.maxHp.toLocaleString()}</dd></div>
            <div><dt>Phases</dt><dd>{boss.snapshot.phases.length}</dd></div>
            <div><dt>Moves</dt><dd>{boss.snapshot.phases.reduce((n, p) => n + p.actions.length, 0)}</dd></div>
            <div><dt>Resists</dt><dd>{boss.snapshot.resistance?.resistant.join(', ') || '—'}</dd></div>
            <div><dt>Weak to</dt><dd className="weak">{boss.snapshot.resistance?.weak.join(', ') || '—'}</dd></div>
          </dl>
        </header>

        {note && (
          <section className="prose">
            <h2>The fight</h2>
            <p>{note.thesis}</p>
            <h2>How the moves combine</h2>
            <p className="combo">{note.combo}</p>
          </section>
        )}

        {stances.length > 0 && (
          <section className="stances-section">
            <h2>What he looks like</h2>
            <p className="hint">
              One frame from each of his animation sheets — the same clips the battle plays. These
              travel with the downloaded page, so the file works on any machine.
            </p>
            <div className="stances">
              {stances.map((s) => (
                <figure key={s.state} className="stance">
                  {s.dataUrl ? (
                    <img src={s.dataUrl} alt={`${boss.name} — ${s.label}`} width={s.width} height={s.height} />
                  ) : (
                    <div className="stance-missing">no sheet</div>
                  )}
                  <figcaption>
                    <b>{s.label}</b>
                    <span>{s.when}</span>                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {boss.snapshot.phases.map((phase, i) => (
          <section key={phase.id} className="phase">
            <h2 className="phase-head">
              <span className="phase-num">Phase {i + 1} · {phaseLabel(phase.id)}</span>
              <span className="phase-range">
                {Math.round(phase.healthThresholdStart * 100)}% → {Math.round(phase.healthThresholdEnd * 100)}% health
              </span>
            </h2>
            {phase.passiveEffects.map((d) => (
              <p key={d} className="passive">{d}</p>
            ))}

            <ol className="moves">
              {[...phase.actions]
                .sort((a, b) => b.priority - a.priority)
                .map((a) => {
                  const n = note?.actions[a.id];
                  const charge = chargeLabel(a);
                  const sel = selectionLabel(a);
                  const t = telemetryFor(a.id);
                  return (
                    <li key={a.id} className={`move move-${a.intentType}`}>
                      <div className="move-head">
                        <h3>{a.displayName}</h3>
                        <span className={`tag tag-${sel.tone}`}>{sel.label}</span>
                        <span className="tag tag-kind">{a.intentType.replace(/_/g, ' ')}</span>
                      </div>

                      <p className="telegraph">“{a.telegraphText}”</p>

                      <dl className="stats">
                        <div><dt>Damage</dt><dd>{a.baseDamage || '—'}</dd></div>
                        <div><dt>Hits</dt><dd>{scopeLabel(a)}</dd></div>
                        <div><dt>Cooldown</dt><dd>{a.cooldownRounds === 0 ? 'None' : `${a.cooldownRounds} rounds`}</dd></div>
                        <div><dt>Interruptible</dt><dd>{a.interruptible ? 'Yes' : 'No'}</dd></div>
                        {a.shieldAmount != null && (
                          <div><dt>Absorb</dt><dd>{a.shieldAmount} for {a.shieldDurationRounds ?? 2} rounds</dd></div>
                        )}
                        {a.executeMultiplier != null && (
                          <div>
                            <dt>Execute</dt>
                            <dd>×{a.executeMultiplier} under {Math.round((a.executeThresholdPercent ?? 0) * 100)}% HP</dd>
                          </div>
                        )}
                        {a.selfStatuses?.length ? (
                          <div><dt>Buffs himself</dt><dd>{a.selfStatuses.map((s) => `${s.statusId} ×${s.stacks ?? 1}`).join(', ')}</dd></div>
                        ) : null}
                        {a.statusApplications?.length ? (
                          <div><dt>Inflicts</dt><dd>{a.statusApplications.map((s) => `${s.statusId} (${s.duration}r)`).join(', ')}</dd></div>
                        ) : null}
                      </dl>

                      {charge && <p className="charge">{charge}</p>}

                      {n && (
                        <dl className="why">
                          <div><dt>Role</dt><dd>{n.role}</dd></div>
                          <div><dt>When it fires</dt><dd>{n.timing}</dd></div>
                          <div><dt>The answer</dt><dd>{n.answer}</dd></div>
                        </dl>
                      )}

                      {t && (
                        <div className="measured">
                          <span className="measured-label">Measured</span>
                          <span><b>{pct(t.damageShare)}</b> of his damage</span>
                          <span><b>{t.damagePerBattle.toFixed(0)}</b> per battle</span>
                          <span>thrown <b>{t.declaredPerBattle.toFixed(2)}×</b> a fight</span>
                          <span className={t.kills > 0 ? 'lethal' : ''}>
                            <b>{t.kills}</b> {t.kills === 1 ? 'kill' : 'kills'}
                          </span>
                        </div>
                      )}
                    </li>
                  );
                })}
            </ol>
          </section>
        ))}

        {!analysis && (
          <section className="callout">
            <p>
              Run the simulation to fill in what each move actually does across 300 fights — how often
              it lands, how much of the damage it accounts for, and whether it has ever killed anyone.
            </p>
          </section>
        )}

        {analysis && (
          <section className="results">
            <h2>Measured over {analysis.battles} battles</h2>
            <p className="party-note">{REFERENCE_PARTY_LABEL}</p>

            <div className="headline">
              <div><span className="big">{analysis.avgRounds.toFixed(1)}</span><span>rounds, average</span></div>
              <div><span className="big">{analysis.deniedPerBattle.toFixed(2)}</span><span>moves denied per fight</span></div>
              <div>
                <span className="big">{pct(analysis.lines.find((l) => l.id === 'baseline')?.winRate ?? 0)}</span>
                <span>win rate with no plan</span>
              </div>
            </div>

            <h3>Who he actually hits</h3>
            <p className="hint">An even spread is 33% each. One hero above ~60% means the fight has a favourite.</p>
            <div className="spread">
              {analysis.heroDamageShare.map((h) => (
                <div key={h.displayName} className="spread-row">
                  <span className="spread-name">{h.displayName}</span>
                  <span className="spread-bar"><i style={{ width: `${h.share * 100}%` }} /></span>
                  <span className="spread-val">{pct(h.share)}</span>
                </div>
              ))}
            </div>

            <h3>Ways to win</h3>
            <div className="lines-scroll">
              <table className="lines">
                <thead>
                  <tr><th>Approach</th><th>Win rate</th><th>Rounds</th><th>What it does</th><th>What it answers</th></tr>
                </thead>
                <tbody>
                  {analysis.lines.map((l) => (
                    <tr key={l.id} className={l.id === 'baseline' ? 'control' : ''}>
                      <td className="line-name">{l.name}</td>
                      <td className="num"><b>{pct(l.winRate)}</b></td>
                      <td className="num">{l.avgRounds.toFixed(1)}</td>
                      <td>{l.premise}</td>
                      <td>{l.answers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {note?.caveats.length ? (
          <section className="caveats">
            <h2>Known weaknesses</h2>
            <ul>
              {note.caveats.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="sheet-foot">
          Generated from live boss data — every number above is read from the shipped moveset or
          measured by running the real combat reducer.
        </footer>
      </article>
    </div>
  );
}

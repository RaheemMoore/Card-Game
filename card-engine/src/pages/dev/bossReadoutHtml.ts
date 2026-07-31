import type { BossAnalysis } from '../../services/combat/bossAnalysis';
import { REFERENCE_PARTY_LABEL } from '../../services/combat/referenceParty';
import type { BossSnapshot, BossActionSnapshot } from '../../types/combat';
import type { BossNote } from './bossReadoutNotes';
import type { Stance } from './bossStances';

/**
 * The shareable artifact: one HTML file, no dependencies, no network.
 *
 * Markdown was the first export and is still the right one for pasting into a
 * doc or a PR. It cannot carry the sprites, though — a markdown image is a
 * link, and a link into someone's dev server is a broken image on every other
 * machine. This inlines the CSS and embeds every frame as a data URL, so the
 * file opens the same on any laptop, offline, forever, and prints to a clean
 * PDF. That is what makes it usable as a per-boss design record.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export interface HtmlExportInput {
  boss: BossSnapshot;
  name: string;
  lore: string;
  floor?: number;
  note?: BossNote;
  analysis: BossAnalysis | null;
  stances: Stance[];
  phaseLabel: (id: string) => string;
  scopeLabel: (a: BossActionSnapshot) => string;
  chargeLabel: (a: BossActionSnapshot) => string | null;
  selectionLabel: (a: BossActionSnapshot) => { label: string; tone: string };
}

export function toStandaloneHtml(input: HtmlExportInput): string {
  const { boss, name, lore, floor, note, analysis, stances } = input;
  const generated = new Date().toISOString().slice(0, 10);

  const stanceCards = stances
    .filter((s) => s.dataUrl)
    .map(
      (s) => `
      <figure class="stance">
        <img src="${s.dataUrl}" alt="${esc(name)} — ${esc(s.label)}" width="${s.width}" height="${s.height}">
        <figcaption>
          <b>${esc(s.label)}</b>
          <span>${esc(s.when)}</span>        </figcaption>
      </figure>`,
    )
    .join('');

  const phases = boss.phases
    .map((phase, i) => {
      const moves = [...phase.actions]
        .sort((a, b) => b.priority - a.priority)
        .map((a) => {
          const charge = input.chargeLabel(a);
          const n = note?.actions[a.id];
          const t = analysis?.actions.find((x) => x.actionId === a.id);
          const sel = input.selectionLabel(a);
          const extra: string[] = [];
          if (a.shieldAmount != null)
            extra.push(`<div><dt>Absorb</dt><dd>${a.shieldAmount} for ${a.shieldDurationRounds ?? 2} rounds</dd></div>`);
          if (a.executeMultiplier != null)
            extra.push(
              `<div><dt>Execute</dt><dd>×${a.executeMultiplier} under ${Math.round((a.executeThresholdPercent ?? 0) * 100)}% HP</dd></div>`,
            );
          if (a.selfStatuses?.length)
            extra.push(
              `<div><dt>Buffs himself</dt><dd>${esc(a.selfStatuses.map((s) => `${s.statusId} ×${s.stacks ?? 1}`).join(', '))}</dd></div>`,
            );
          if (a.statusApplications?.length)
            extra.push(
              `<div><dt>Inflicts</dt><dd>${esc(a.statusApplications.map((s) => `${s.statusId} (${s.duration}r)`).join(', '))}</dd></div>`,
            );

          return `
        <li class="move ${a.intentType === 'ultimate' || a.intentType === 'execute' ? 'move-big' : ''}">
          <div class="move-head">
            <h3>${esc(a.displayName)}</h3>
            <span class="tag ${sel.tone === 'scripted' ? 'tag-scripted' : ''}">${esc(sel.label)}</span>
            <span class="tag">${esc(a.intentType.replace(/_/g, ' '))}</span>
          </div>
          <p class="telegraph">“${esc(a.telegraphText)}”</p>
          <dl class="stats">
            <div><dt>Damage</dt><dd>${a.baseDamage || '—'}</dd></div>
            <div><dt>Hits</dt><dd>${esc(input.scopeLabel(a))}</dd></div>
            <div><dt>Cooldown</dt><dd>${a.cooldownRounds === 0 ? 'None' : `${a.cooldownRounds} rounds`}</dd></div>
            <div><dt>Interruptible</dt><dd>${a.interruptible ? 'Yes' : 'No'}</dd></div>
            ${extra.join('')}
          </dl>
          ${charge ? `<p class="charge">${esc(charge)}</p>` : ''}
          ${
            n
              ? `<dl class="why">
            <div><dt>Role</dt><dd>${esc(n.role)}</dd></div>
            <div><dt>When it fires</dt><dd>${esc(n.timing)}</dd></div>
            <div><dt>The answer</dt><dd>${esc(n.answer)}</dd></div>
          </dl>`
              : ''
          }
          ${
            t
              ? `<p class="measured"><span class="measured-label">Measured</span>
            <b>${pct(t.damageShare)}</b> of his damage · <b>${t.damagePerBattle.toFixed(0)}</b> per battle ·
            thrown <b>${t.declaredPerBattle.toFixed(2)}×</b> a fight ·
            <b class="${t.kills > 0 ? 'lethal' : ''}">${t.kills}</b> ${t.kills === 1 ? 'kill' : 'kills'}</p>`
              : ''
          }
        </li>`;
        })
        .join('');

      return `
    <section class="phase">
      <h2>Phase ${i + 1} · ${esc(input.phaseLabel(phase.id))}
        <span class="range">${Math.round(phase.healthThresholdStart * 100)}% → ${Math.round(phase.healthThresholdEnd * 100)}% health</span>
      </h2>
      ${phase.passiveEffects.map((d) => `<p class="passive">${esc(d)}</p>`).join('')}
      <ol class="moves">${moves}</ol>
    </section>`;
    })
    .join('');

  const results = analysis
    ? `
    <section class="results">
      <h2>Measured over ${analysis.battles} battles</h2>
      <p class="party">${esc(REFERENCE_PARTY_LABEL)}</p>
      <div class="headline">
        <div><span class="big">${analysis.avgRounds.toFixed(1)}</span><span>rounds, average</span></div>
        <div><span class="big">${analysis.deniedPerBattle.toFixed(2)}</span><span>moves denied per fight</span></div>
        <div><span class="big">${pct(analysis.lines.find((l) => l.id === 'baseline')?.winRate ?? 0)}</span><span>win rate with no plan</span></div>
      </div>
      <h3>Who he actually hits</h3>
      <div class="spread">
        ${analysis.heroDamageShare
          .map(
            (h) => `<div class="spread-row"><span>${esc(h.displayName)}</span>
          <span class="bar"><i style="width:${(h.share * 100).toFixed(1)}%"></i></span>
          <span class="val">${pct(h.share)}</span></div>`,
          )
          .join('')}
      </div>
      <h3>Ways to win</h3>
      <table>
        <thead><tr><th>Approach</th><th>Win rate</th><th>Rounds</th><th>What it does</th><th>What it answers</th></tr></thead>
        <tbody>
          ${analysis.lines
            .map(
              (l) => `<tr><td><b>${esc(l.name)}</b></td><td class="num">${pct(l.winRate)}</td>
            <td class="num">${l.avgRounds.toFixed(1)}</td><td>${esc(l.premise)}</td><td>${esc(l.answers)}</td></tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} — fight readout</title>
<style>
  :root {
    --paper:#ecefe8; --rule:#c4d0c6; --ink:#22282a; --ink-soft:#5c6a63; --ink-faint:#8b968f;
    --ember:#b0461d; --ember-soft:#f0e2d6; --scripted:#2f5d52;
    --serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif;
    --sans:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  }
  * { box-sizing:border-box; }
  body { margin:0; background:#dfe4da; color:var(--ink); font-family:var(--sans); }
  main { max-width:54rem; margin:0 auto; padding:3rem clamp(1.25rem,4vw,3.5rem);
         background:var(--paper); box-shadow:0 18px 40px rgba(0,0,0,.09); }
  h1 { font-family:var(--serif); font-size:clamp(2.1rem,5vw,3.1rem); font-weight:600;
       line-height:1.05; margin:.2rem 0 0; text-wrap:balance; }
  .eyebrow { font-family:var(--mono); font-size:.68rem; letter-spacing:.18em;
             text-transform:uppercase; color:var(--ink-faint); margin:0; }
  .lore { font-family:var(--serif); font-style:italic; font-size:1.06rem; line-height:1.6;
          color:var(--ink-soft); max-width:62ch; margin:1rem 0 0; }
  .vitals { display:flex; flex-wrap:wrap; gap:0 2.5rem; margin:1.75rem 0 0;
            padding-top:1.1rem; border-top:2px solid var(--ink); }
  .vitals div { display:flex; flex-direction:column; gap:.2rem; padding:.35rem 0; }
  .vitals dt { font-family:var(--mono); font-size:.64rem; letter-spacing:.14em;
               text-transform:uppercase; color:var(--ink-faint); }
  .vitals dd { font-family:var(--mono); font-size:1.05rem; font-variant-numeric:tabular-nums; margin:0; }
  .vitals dd.weak { color:var(--ember); }
  h2 { font-family:var(--serif); font-size:1.5rem; font-weight:600; margin:2.75rem 0 .7rem;
       text-wrap:balance; border-bottom:2px solid var(--ink); padding-bottom:.5rem;
       display:flex; flex-wrap:wrap; align-items:baseline; gap:0 1rem; }
  h2 .range { font-family:var(--mono); font-size:.72rem; letter-spacing:.1em;
              text-transform:uppercase; color:var(--ink-faint); }
  h3 { font-family:var(--mono); font-size:.68rem; letter-spacing:.16em; text-transform:uppercase;
       color:var(--ink-faint); margin:2rem 0 .6rem; }
  p.prose, .prose p { font-family:var(--serif); font-size:1.08rem; line-height:1.68; max-width:64ch; }
  .combo { border-left:3px solid var(--ember); padding-left:1.1rem; }
  .passive { font-family:var(--serif); font-style:italic; color:var(--ink-soft); }

  .stances { display:grid; grid-template-columns:repeat(auto-fill,minmax(11rem,1fr)); gap:1.5rem; margin:1rem 0 0; }
  .stance { margin:0; display:flex; flex-direction:column; gap:.6rem; break-inside:avoid; }
  .stance img { width:100%; height:auto; image-rendering:pixelated; background:#181d1f;
                border:1px solid var(--rule); border-radius:2px; }
  .stance figcaption { display:flex; flex-direction:column; gap:.3rem; }
  .stance b { font-family:var(--serif); font-size:1.02rem; }
  .stance span { font-family:var(--sans); font-size:.78rem; line-height:1.5; color:var(--ink-soft); }
  .stance em { font-family:var(--mono); font-size:.66rem; line-height:1.6; color:var(--ink-faint); font-style:normal; }

  .moves { list-style:none; margin:1.25rem 0 0; padding:0; }
  .move { padding:1.4rem 0; border-bottom:1px solid var(--rule); break-inside:avoid; }
  .move-big { border-left:3px solid var(--ember); padding-left:1.1rem; }
  .move-head { display:flex; flex-wrap:wrap; align-items:center; gap:.6rem; }
  .move-head h3 { font-family:var(--serif); font-size:1.3rem; font-weight:600; margin:0;
                  flex:1 1 auto; color:var(--ink); letter-spacing:0; text-transform:none; }
  .tag { font-family:var(--mono); font-size:.62rem; letter-spacing:.12em; text-transform:uppercase;
         padding:.22rem .5rem; border:1px solid var(--rule); border-radius:2px; color:var(--ink-soft); }
  .tag-scripted { color:var(--scripted); border-color:currentColor; }
  .telegraph { font-family:var(--serif); font-style:italic; color:var(--ink-soft); max-width:60ch; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(8.5rem,1fr)); gap:.75rem 1.5rem; margin:1.1rem 0 0; }
  .stats div { display:flex; flex-direction:column; gap:.15rem; }
  .stats dt { font-family:var(--mono); font-size:.6rem; letter-spacing:.13em;
              text-transform:uppercase; color:var(--ink-faint); }
  .stats dd { font-family:var(--mono); font-size:.9rem; font-variant-numeric:tabular-nums; margin:0; }
  .charge { font-family:var(--mono); font-size:.76rem; color:var(--ember); background:var(--ember-soft);
            padding:.5rem .7rem; border-radius:2px; }
  .why { margin:1.1rem 0 0; display:flex; flex-direction:column; gap:.6rem; }
  .why div { display:grid; grid-template-columns:9rem 1fr; gap:.9rem; align-items:baseline; }
  .why dt { font-family:var(--mono); font-size:.62rem; letter-spacing:.13em;
            text-transform:uppercase; color:var(--ink-faint); }
  .why dd { font-family:var(--serif); font-size:1rem; line-height:1.58; margin:0; max-width:58ch; }
  .measured { font-family:var(--mono); font-size:.74rem; color:var(--ink-soft);
              border-top:1px dotted var(--rule); padding-top:.7rem; font-variant-numeric:tabular-nums; }
  .measured b { color:var(--ink); }
  .measured b.lethal { color:var(--ember); }
  .measured-label { font-size:.6rem; letter-spacing:.14em; text-transform:uppercase;
                    color:var(--ink-faint); margin-right:.6rem; }

  .party { font-family:var(--mono); font-size:.72rem; line-height:1.6; color:var(--ink-faint); max-width:70ch; }
  .headline { display:grid; grid-template-columns:repeat(auto-fit,minmax(9rem,1fr)); gap:1rem;
              margin:1rem 0 2rem; padding:1.2rem 0; border-top:2px solid var(--ink); border-bottom:1px solid var(--rule); }
  .headline div { display:flex; flex-direction:column; gap:.25rem; }
  .headline .big { font-family:var(--mono); font-size:2rem; font-variant-numeric:tabular-nums; line-height:1; }
  .headline span:last-child { font-family:var(--mono); font-size:.64rem; letter-spacing:.12em;
                              text-transform:uppercase; color:var(--ink-faint); }
  .spread { display:flex; flex-direction:column; gap:.5rem; }
  .spread-row { display:grid; grid-template-columns:7rem 1fr 3.5rem; gap:.9rem; align-items:center;
                font-family:var(--serif); }
  .bar { display:block; height:.6rem; background:var(--rule); border-radius:1px; overflow:hidden; }
  .bar i { display:block; height:100%; background:var(--ink); }
  .val { font-family:var(--mono); font-size:.8rem; text-align:right; font-variant-numeric:tabular-nums; }
  table { width:100%; border-collapse:collapse; font-size:.85rem; }
  th { font-family:var(--mono); font-size:.6rem; letter-spacing:.13em; text-transform:uppercase;
       color:var(--ink-faint); text-align:left; padding:0 .8rem .5rem 0; border-bottom:2px solid var(--ink); }
  td { font-family:var(--serif); padding:.7rem .8rem .7rem 0; border-bottom:1px solid var(--rule);
       vertical-align:top; line-height:1.5; }
  td.num { font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; }
  .caveats ul { padding-left:1.1rem; }
  .caveats li { font-family:var(--serif); font-size:1rem; line-height:1.6; max-width:64ch; margin-bottom:.7rem; }
  footer { margin-top:3rem; padding-top:1rem; border-top:1px solid var(--rule);
           font-family:var(--mono); font-size:.66rem; line-height:1.7; color:var(--ink-faint); max-width:64ch; }
  @media print {
    body { background:#fff; }
    main { max-width:none; padding:0; box-shadow:none; }
    h1,h2,h3 { break-after:avoid; }
  }
</style>
</head>
<body>
<main>
  <p class="eyebrow">${floor != null ? `Tower floor ${floor}` : 'Unplaced'} · ${esc(boss.versionId)}</p>
  <h1>${esc(name)}</h1>
  <p class="lore">${esc(lore)}</p>
  <dl class="vitals">
    <div><dt>Health</dt><dd>${boss.maxHp.toLocaleString()}</dd></div>
    <div><dt>Phases</dt><dd>${boss.phases.length}</dd></div>
    <div><dt>Moves</dt><dd>${boss.phases.reduce((n, p) => n + p.actions.length, 0)}</dd></div>
    <div><dt>Resists</dt><dd>${esc(boss.resistance?.resistant.join(', ') || '—')}</dd></div>
    <div><dt>Weak to</dt><dd class="weak">${esc(boss.resistance?.weak.join(', ') || '—')}</dd></div>
  </dl>

  ${
    note
      ? `<section class="prose">
    <h2>The fight</h2>
    <p>${esc(note.thesis)}</p>
    <h2>How the moves combine</h2>
    <p class="combo">${esc(note.combo)}</p>
  </section>`
      : ''
  }

  ${
    stanceCards
      ? `<section>
    <h2>What he looks like</h2>
    <div class="stances">${stanceCards}</div>
  </section>`
      : ''
  }

  ${phases}
  ${results}

  ${
    note?.caveats.length
      ? `<section class="caveats">
    <h2>Known weaknesses</h2>
    <ul>${note.caveats.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  </section>`
      : ''
  }

  <footer>
    Generated from live boss data on ${generated}. Every number here is read from the shipped
    moveset or measured by running the game’s own combat reducer; every frame is cropped from the
    sprite sheets the battle plays.
  </footer>
</main>
</body>
</html>`;
}

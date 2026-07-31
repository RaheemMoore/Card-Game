/**
 * Styling for the boss readout.
 *
 * The document is dressed as what the Debt-Bearer keeps: a ruled accounting
 * ledger. Rules under every row, figures in a monospace with tabular numerals
 * so columns line up the way a tally should, and one ember accent — his own
 * molten cracks — reserved strictly for danger. Nothing else is allowed to be
 * that colour, so anything glowing on the page is something that can kill you.
 *
 * It is a document before it is a screen: it prints, and the print rules force
 * paper regardless of the viewer's theme, because a dark-mode PDF is a
 * cartridge of wasted ink.
 */
export function ReadoutStyles() {
  return (
    <style>{`
      .readout {
        --paper: #ecefe8;
        --paper-edge: #dfe4da;
        --rule: #c4d0c6;
        --ink: #22282a;
        --ink-soft: #5c6a63;
        --ink-faint: #8b968f;
        --ember: #b0461d;
        --ember-soft: #f0e2d6;
        --scripted: #2f5d52;

        --serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
        --sans: ui-sans-serif, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;

        min-height: 100vh;
        background: var(--paper-edge);
        color: var(--ink);
        font-family: var(--sans);
        padding: 0 0 4rem;
      }

      @media (prefers-color-scheme: dark) {
        .readout {
          --paper: #171b1c;
          --paper-edge: #101314;
          --rule: #2b3435;
          --ink: #e2e7e3;
          --ink-soft: #9aa8a1;
          --ink-faint: #6c7676;
          --ember: #e0752f;
          --ember-soft: #2a1d14;
          --scripted: #7fbfae;
        }
      }
      :root[data-theme="dark"] .readout {
        --paper: #171b1c;
        --paper-edge: #101314;
        --rule: #2b3435;
        --ink: #e2e7e3;
        --ink-soft: #9aa8a1;
        --ink-faint: #6c7676;
        --ember: #e0752f;
        --ember-soft: #2a1d14;
        --scripted: #7fbfae;
      }
      :root[data-theme="light"] .readout {
        --paper: #ecefe8;
        --paper-edge: #dfe4da;
        --rule: #c4d0c6;
        --ink: #22282a;
        --ink-soft: #5c6a63;
        --ink-faint: #8b968f;
        --ember: #b0461d;
        --ember-soft: #f0e2d6;
        --scripted: #2f5d52;
      }

      /* ---- control bar ------------------------------------------- */
      .readout-bar {
        position: sticky;
        top: 0;
        z-index: 10;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        align-items: end;
        justify-content: space-between;
        padding: 0.85rem 1.5rem;
        background: var(--paper);
        border-bottom: 1px solid var(--rule);
      }
      .readout-field { display: flex; flex-direction: column; gap: 0.3rem; }
      .readout-field span {
        font-family: var(--mono);
        font-size: 0.66rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .readout-field select {
        font-family: var(--serif);
        font-size: 1rem;
        padding: 0.35rem 0.5rem;
        background: var(--paper);
        color: var(--ink);
        border: 1px solid var(--rule);
        border-radius: 2px;
      }
      .readout-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
      .readout-actions button {
        font-family: var(--mono);
        font-size: 0.72rem;
        letter-spacing: 0.06em;
        padding: 0.5rem 0.8rem;
        background: transparent;
        color: var(--ink);
        border: 1px solid var(--rule);
        border-radius: 2px;
        cursor: pointer;
        transition: background 120ms ease, border-color 120ms ease;
      }
      .readout-actions button:hover:not(:disabled) { background: var(--ember-soft); border-color: var(--ember); }
      .readout-actions button:disabled { opacity: 0.5; cursor: progress; }
      .readout-actions button:focus-visible,
      .readout-field select:focus-visible { outline: 2px solid var(--ember); outline-offset: 2px; }

      /* ---- the sheet --------------------------------------------- */
      .sheet {
        max-width: 54rem;
        margin: 2rem auto 0;
        padding: 3rem clamp(1.25rem, 4vw, 3.5rem);
        background: var(--paper);
        border: 1px solid var(--rule);
        box-shadow: 0 1px 0 var(--rule), 0 18px 40px rgba(0,0,0,0.09);
      }

      .sheet h1 {
        font-family: var(--serif);
        font-size: clamp(2.1rem, 5vw, 3.1rem);
        font-weight: 600;
        line-height: 1.05;
        letter-spacing: -0.01em;
        text-wrap: balance;
        margin: 0.2rem 0 0;
      }
      .eyebrow {
        font-family: var(--mono);
        font-size: 0.68rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--ink-faint);
        margin: 0;
      }
      .lore {
        font-family: var(--serif);
        font-size: 1.06rem;
        font-style: italic;
        line-height: 1.6;
        color: var(--ink-soft);
        max-width: 62ch;
        margin: 1rem 0 0;
      }

      .vitals {
        display: flex;
        flex-wrap: wrap;
        gap: 0 2.5rem;
        margin: 1.75rem 0 0;
        padding-top: 1.1rem;
        border-top: 2px solid var(--ink);
      }
      .vitals div { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.35rem 0; }
      .vitals dt {
        font-family: var(--mono);
        font-size: 0.64rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .vitals dd {
        font-family: var(--mono);
        font-size: 1.05rem;
        font-variant-numeric: tabular-nums;
        margin: 0;
      }
      .vitals dd.weak { color: var(--ember); }

      .sheet h2 {
        font-family: var(--serif);
        font-size: 1.5rem;
        font-weight: 600;
        margin: 2.75rem 0 0.7rem;
        text-wrap: balance;
      }
      .prose p {
        font-family: var(--serif);
        font-size: 1.08rem;
        line-height: 1.68;
        max-width: 64ch;
        margin: 0 0 1rem;
      }
      .prose .combo {
        border-left: 3px solid var(--ember);
        padding-left: 1.1rem;
      }

      /* ---- stance gallery ---------------------------------------- */
      .stances {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
        gap: 1.5rem;
        margin: 0.5rem 0 0;
      }
      .stance { margin: 0; display: flex; flex-direction: column; gap: 0.6rem; break-inside: avoid; }
      .stance img {
        width: 100%;
        height: auto;
        /* Pixel art. Smoothing it would blur exactly the detail the frame is
           being shown for. */
        image-rendering: pixelated;
        background: #181d1f;
        border: 1px solid var(--rule);
        border-radius: 2px;
      }
      .stance-missing {
        aspect-ratio: 1;
        display: grid;
        place-items: center;
        border: 1px dashed var(--rule);
        border-radius: 2px;
        font-family: var(--mono);
        font-size: 0.66rem;
        color: var(--ink-faint);
      }
      .stance figcaption { display: flex; flex-direction: column; gap: 0.3rem; }
      .stance b { font-family: var(--serif); font-size: 1.02rem; font-weight: 600; }
      .stance figcaption span { font-size: 0.78rem; line-height: 1.5; color: var(--ink-soft); }
      .stance em {
        font-family: var(--mono);
        font-size: 0.66rem;
        line-height: 1.6;
        color: var(--ink-faint);
        font-style: normal;
      }

      .readout-actions button.primary { border-color: var(--ember); color: var(--ember); }

      /* ---- phases ------------------------------------------------ */
      .phase-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0 1rem;
        border-bottom: 2px solid var(--ink);
        padding-bottom: 0.5rem;
      }
      .phase-num { font-family: var(--serif); }
      .phase-range {
        font-family: var(--mono);
        font-size: 0.72rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--ink-faint);
        font-variant-numeric: tabular-nums;
      }
      .passive {
        font-family: var(--serif);
        font-style: italic;
        color: var(--ink-soft);
        margin: 0.75rem 0 0;
      }

      .moves { list-style: none; margin: 1.25rem 0 0; padding: 0; display: flex; flex-direction: column; }
      .move { padding: 1.4rem 0; border-bottom: 1px solid var(--rule); }
      .move:last-child { border-bottom: none; }

      .move-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
      .move-head h3 {
        font-family: var(--serif);
        font-size: 1.3rem;
        font-weight: 600;
        margin: 0;
        flex: 1 1 auto;
      }
      .tag {
        font-family: var(--mono);
        font-size: 0.62rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        padding: 0.22rem 0.5rem;
        border: 1px solid var(--rule);
        border-radius: 2px;
        white-space: nowrap;
      }
      .tag-scripted { color: var(--scripted); border-color: currentColor; }
      .tag-drawn { color: var(--ink-faint); }
      .tag-kind { color: var(--ink-soft); }

      /* The ultimates carry the ember rule — the page's one loud colour,
         spent only on the moves that end fights. */
      .move-ultimate, .move-execute { border-left: 3px solid var(--ember); padding-left: 1.1rem; }

      .telegraph {
        font-family: var(--serif);
        font-style: italic;
        font-size: 1.02rem;
        color: var(--ink-soft);
        margin: 0.6rem 0 0;
        max-width: 60ch;
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
        gap: 0.75rem 1.5rem;
        margin: 1.1rem 0 0;
      }
      .stats div { display: flex; flex-direction: column; gap: 0.15rem; }
      .stats dt {
        font-family: var(--mono);
        font-size: 0.6rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .stats dd { font-family: var(--mono); font-size: 0.9rem; font-variant-numeric: tabular-nums; margin: 0; }

      .charge {
        font-family: var(--mono);
        font-size: 0.76rem;
        color: var(--ember);
        background: var(--ember-soft);
        padding: 0.5rem 0.7rem;
        margin: 1rem 0 0;
        border-radius: 2px;
      }

      .why { margin: 1.1rem 0 0; display: flex; flex-direction: column; gap: 0.6rem; }
      .why div { display: grid; grid-template-columns: 9rem 1fr; gap: 0.9rem; align-items: baseline; }
      .why dt {
        font-family: var(--mono);
        font-size: 0.62rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .why dd { font-family: var(--serif); font-size: 1rem; line-height: 1.58; margin: 0; max-width: 58ch; }

      .measured {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem 1.4rem;
        align-items: baseline;
        margin: 1.1rem 0 0;
        padding-top: 0.7rem;
        border-top: 1px dotted var(--rule);
        font-family: var(--mono);
        font-size: 0.74rem;
        color: var(--ink-soft);
        font-variant-numeric: tabular-nums;
      }
      .measured b { color: var(--ink); font-weight: 600; }
      .measured-label {
        font-size: 0.6rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }
      .measured .lethal b { color: var(--ember); }

      /* ---- results ----------------------------------------------- */
      .callout {
        margin: 2.5rem 0 0;
        padding: 1.2rem 1.4rem;
        border: 1px dashed var(--rule);
        border-radius: 2px;
      }
      .callout p {
        font-family: var(--serif);
        font-size: 1rem;
        line-height: 1.6;
        color: var(--ink-soft);
        margin: 0;
        max-width: 62ch;
      }

      .party-note, .hint {
        font-family: var(--mono);
        font-size: 0.72rem;
        line-height: 1.6;
        color: var(--ink-faint);
        margin: 0 0 1.2rem;
        max-width: 70ch;
      }

      .headline {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
        gap: 1rem;
        margin: 0 0 2rem;
        padding: 1.2rem 0;
        border-top: 2px solid var(--ink);
        border-bottom: 1px solid var(--rule);
      }
      .headline div { display: flex; flex-direction: column; gap: 0.25rem; }
      .headline .big {
        font-family: var(--mono);
        font-size: 2rem;
        font-variant-numeric: tabular-nums;
        line-height: 1;
      }
      .headline span:last-child {
        font-family: var(--mono);
        font-size: 0.64rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--ink-faint);
      }

      .sheet h3 {
        font-family: var(--mono);
        font-size: 0.68rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--ink-faint);
        margin: 2rem 0 0.5rem;
      }

      .spread { display: flex; flex-direction: column; gap: 0.5rem; }
      .spread-row { display: grid; grid-template-columns: 7rem 1fr 3.5rem; gap: 0.9rem; align-items: center; }
      .spread-name { font-family: var(--serif); font-size: 1rem; }
      .spread-bar { display: block; height: 0.6rem; background: var(--rule); border-radius: 1px; overflow: hidden; }
      .spread-bar i { display: block; height: 100%; background: var(--ink); }
      .spread-val { font-family: var(--mono); font-size: 0.8rem; text-align: right; font-variant-numeric: tabular-nums; }

      .lines-scroll { overflow-x: auto; }
      .lines { width: 100%; border-collapse: collapse; font-size: 0.85rem; min-width: 40rem; }
      .lines th {
        font-family: var(--mono);
        font-size: 0.6rem;
        letter-spacing: 0.13em;
        text-transform: uppercase;
        color: var(--ink-faint);
        text-align: left;
        padding: 0 0.8rem 0.5rem 0;
        border-bottom: 2px solid var(--ink);
      }
      .lines td {
        font-family: var(--serif);
        padding: 0.7rem 0.8rem 0.7rem 0;
        border-bottom: 1px solid var(--rule);
        vertical-align: top;
        line-height: 1.5;
      }
      .lines .num { font-family: var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
      .lines .line-name { font-weight: 600; white-space: nowrap; }
      .lines tr.control td { color: var(--ink-faint); }

      .caveats { margin-top: 2.5rem; }
      .caveats ul { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.7rem; }
      .caveats li { font-family: var(--serif); font-size: 1rem; line-height: 1.6; max-width: 64ch; }

      .sheet-foot {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid var(--rule);
        font-family: var(--mono);
        font-size: 0.66rem;
        line-height: 1.7;
        color: var(--ink-faint);
        max-width: 64ch;
      }

      @media (prefers-reduced-motion: reduce) {
        .readout * { transition: none !important; }
      }

      /* ---- print -------------------------------------------------- */
      @media print {
        /* Paper, whatever the viewer's theme. A dark-mode PDF is a cartridge
           of wasted ink and an unreadable handout. */
        .readout {
          --paper: #ffffff;
          --paper-edge: #ffffff;
          --rule: #ccd3cd;
          --ink: #14181a;
          --ink-soft: #4a5652;
          --ink-faint: #6d7a74;
          --ember: #96400f;
          --ember-soft: #f6ece4;
          background: #fff;
          padding: 0;
        }
        .readout-bar { display: none; }
        .sheet { max-width: none; margin: 0; padding: 0; border: none; box-shadow: none; }
        .move, .results, .caveats, .prose { break-inside: avoid; }
        .phase { break-before: auto; }
        h1, h2, h3 { break-after: avoid; }
        .lines { min-width: 0; font-size: 0.75rem; }
      }
    `}</style>
  );
}

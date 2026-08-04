import { useEffect, useMemo, useState } from 'react';
import type { Card } from '../../types/card';
import type { ElementName } from '../../types/bible';
import type { MotionLevel } from '../../vfx/types';
import { compileActionScopes } from '../../services/combat/performance/actionScope';
import { resolvePerformance } from '../../services/combat/performance/resolvePerformance';
import type { ResolvedPerformance } from '../../services/combat/performance/types';
import { MATERIAL_KITS } from '../../data/combat/performance/materialKits';
import { ALL_PERFORMANCE_ASSETS } from '../../data/combat/performance/assetKits';
import { PERFORMANCE_TEMPO } from '../../data/combat/performance/recipes';
import { PerformanceView, PerformanceStyles } from '../battle/performance/PerformanceLayer';
import { CardCombatFxStyles } from '../battle/CardCombatFx';
import { BOSS, HERO_A, HERO_B, SCENARIOS, type TheaterScenario } from './abilityTheaterFixtures';
import { ArtCandidatePanel } from './ArtCandidatePanel';

/**
 * The Ability Theater — an isolated stage for building and reviewing ability
 * performances without playing a battle.
 *
 * ## Why this exists
 *
 * Iterating on a lash by starting a boss fight, surviving to your turn,
 * spending the resource and hoping the RNG cooperates is not a workflow.
 * Worse, it is not REPEATABLE: a reviewer cannot tell whether a change made
 * something better if the two runs were not the same run. So the theater
 * replays canned event logs — no reducer, no RNG, no battle — and the same
 * scenario looks identical every time.
 *
 * ## What it is for
 *
 * Judging. The controls exist to answer specific questions:
 *
 *  - **Hide colour** is the most important control on the page. The Bible's
 *    rule is that an element must be recognisable WITHOUT colour. This greys
 *    the whole stage so that claim can actually be tested rather than asserted.
 *  - **Step by stage** freezes a performance mid-beat, so "does staged growth
 *    read as growth" is answerable by looking rather than by catching it.
 *  - **Simulate missing assets** forces the procedural path, proving the
 *    renderers degrade safely — which today is every performance anyway, since
 *    no art has been generated yet.
 *  - **Motion** exercises full / subtle / off. Off must still communicate
 *    target, material and consequence.
 *
 * Routed outside `PersistenceGate` alongside `/dev/sprite-preview` and
 * `/dev/boss-readout`: it reads only manifests and fixtures, touches no player
 * data, and gating a review tool behind a login is friction with nothing
 * behind it.
 */

const STAGE_W = 900;
const STAGE_H = 560;

/**
 * Every element, split by how finished it is.
 *
 * Derived from the kits rather than hand-listed, so a newly authored element
 * appears in the picker the moment it is authored and nobody has to remember
 * to add it here. Shadow was missing from the theater for exactly that reason
 * — it existed in the manifest and nowhere in the UI.
 */
const ALL_ELEMENTS = Object.values(MATERIAL_KITS);
const AUTHORED_ELEMENTS = ALL_ELEMENTS.filter((k) => !k.provisional).map((k) => k.element);
const PROVISIONAL_ELEMENTS = ALL_ELEMENTS.filter((k) => k.provisional).map((k) => k.element);

/** Authored elements that also have generated art behind them. */
const ELEMENTS_WITH_ART = new Set(
  ALL_PERFORMANCE_ASSETS.filter(
    (a) => a.approvalStatus === 'candidate' || a.approvalStatus === 'approved',
  ).flatMap((a) => a.intendedMaterials),
);

export function AbilityTheater() {
  const [tab, setTab] = useState<'performances' | 'art'>('performances');
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [motionLevel, setMotionLevel] = useState<MotionLevel>('full');
  const [tablet, setTablet] = useState(false);
  const [greyscale, setGreyscale] = useState(false);
  const [missingAssets, setMissingAssets] = useState(false);
  const [pinnedStage, setPinnedStage] = useState<number | undefined>(undefined);
  const [replayKey, setReplayKey] = useState(0);
  const [compareLashes, setCompareLashes] = useState(false);
  const [loop, setLoop] = useState(true);
  const [speed, setSpeed] = useState(1);
  /*
   * Live tempo dial.
   *
   * Starts at the value baked into `recipes.ts` and rescales the resolved
   * stage plan in place, so the stage list, the total, and the playback all
   * move together and the number on screen is the number to ship. Raheem
   * asked for the dial rather than another round of me guessing a duration —
   * this has been retuned twice by description already.
   */
  const [tempo, setTempo] = useState(PERFORMANCE_TEMPO);
  /*
   * Element is its own control, not a property of the scenario.
   *
   * Adding a scenario per element would have been the obvious fix when Shadow
   * was missing from the dropdown, and it would have been wrong: form and
   * material are INDEPENDENT axes, which is the entire premise of the system.
   * Exposing them as two pickers means every ability can be seen in every
   * material — 8 scenarios x 29 elements — instead of me hand-writing the
   * combinations somebody happens to ask for.
   */
  const [elementOverride, setElementOverride] = useState<ElementName | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const viewportWidth = tablet ? 900 : 1440;

  const effectiveScenario = useMemo(
    () => (elementOverride ? { ...scenario, forcedElement: elementOverride } : scenario),
    [scenario, elementOverride],
  );

  const base = useResolvedPerformance(
    effectiveScenario,
    viewportWidth,
    motionLevel,
    missingAssets,
  );
  const resolved = useMemo(() => (base ? retempo(base, tempo) : null), [base, tempo]);

  const lashTrio = useMemo(
    () => SCENARIOS.filter((s) => s.id.startsWith('lash_')),
    [],
  );

  const replay = () => {
    setPinnedStage(undefined);
    setReplayKey((k) => k + 1);
  };

  /*
   * Autoplay on a loop, with a beat of dead air between runs.
   *
   * The first review of this page failed for a mundane reason: a performance is
   * ~600ms and then it is over, so anyone arriving saw a frozen mid-flight
   * shape and reported "squiggles". A single 600ms event is not reviewable —
   * you cannot judge whether something reads as being FIRED from one still
   * frame of it. Looping it turns the page into something you can watch until
   * you have an opinion, which is the entire job of this harness.
   */
  useEffect(() => {
    if (!loop || pinnedStage !== undefined) return;
    const total = (resolved?.totalMs ?? 700) / speed;
    const id = window.setInterval(() => setReplayKey((k) => k + 1), total + 700);
    return () => window.clearInterval(id);
  }, [loop, pinnedStage, resolved?.totalMs, speed, scenarioId, compareLashes]);

  return (
    <div className="min-h-screen bg-[#0b0910] text-bone p-6">
      <header className="mb-5">
        <h1 className="font-fantasy text-2xl text-parchment">Ability Theater</h1>
        <p className="text-sm text-bone/60 max-w-3xl mt-1">
          Replays a canned event log through the real compiler, resolver and renderers — no
          battle, no RNG. Same scenario, same result, every time.
          {' '}
          <span className="text-amber-300/80">
            Performances below are drawn procedurally — generated art is under Generated art.
          </span>
        </p>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setTab('performances')}
            className={tab === 'performances' ? btnOn : btn}
          >
            Performances
          </button>
          <button onClick={() => setTab('art')} className={tab === 'art' ? btnOn : btn}>
            Generated art
          </button>
        </div>
      </header>

      {tab === 'art' && <ArtCandidatePanel />}

      <div className={tab === 'art' ? 'hidden' : 'flex gap-6 items-start flex-wrap'}>
        {/* ---------------- stage ---------------- */}
        <div>
          <div
            className={`relative overflow-hidden rounded border border-bone/20 motion-${motionLevel}`}
            style={{
              width: tablet ? 720 : STAGE_W,
              height: tablet ? 500 : STAGE_H,
              background: 'radial-gradient(ellipse at 50% 30%, #241a2e 0%, #0b0910 70%)',
              filter: greyscale ? 'grayscale(1)' : undefined,
            }}
          >
            <StageMarkers />

            {compareLashes ? (
              <LashComparison
                scenarios={lashTrio}
                viewportWidth={viewportWidth}
                motionLevel={motionLevel}
                missingAssets={missingAssets}
                pinnedStage={pinnedStage}
                replayKey={replayKey}
                speed={speed}
              />
            ) : (
              resolved && (
                <PerformanceView
                  key={`${scenario.id}_${replayKey}_${motionLevel}_${missingAssets}`}
                  performance={resolved}
                  motionLevel={motionLevel}
                  anchorContext={{ viewportWidth, casterIndex: 0, targetIndex: 1 }}
                  shieldIntegrity={0.85}
                  clock={{ pinnedStageIndex: pinnedStage, replayKey, speed }}
                />
              )
            )}

            <PerformanceStyles />
            <CardCombatFxStyles />
          </div>

          <div className="mt-3 flex gap-2 flex-wrap">
            <button onClick={replay} className={btn}>
              ▶ Replay
            </button>
            <button onClick={() => setLoop((v) => !v)} className={loop ? btnOn : btn}>
              {loop ? '● ' : ''}Loop
            </button>
            {/*
              "1x" is now the SHIPPING speed — the recipes carry
              PERFORMANCE_TEMPO, so what used to be 0.35x playback is what the
              game does. The remaining multipliers are for inspection, and for
              judging whether the baked tempo itself wants moving.
            */}
            {([1, 0.7, 0.5, 1.4] as const).map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={speed === s ? btnOn : btn}>
                {s === 1 ? 'game speed' : s > 1 ? `${s}× faster` : `${s}× slower`}
              </button>
            ))}
            <button
              onClick={() => setCompareLashes((v) => !v)}
              className={compareLashes ? btnOn : btn}
            >
              Blood / Water / Fire side by side
            </button>
            <button onClick={() => setGreyscale((v) => !v)} className={greyscale ? btnOn : btn}>
              {greyscale ? '● ' : ''}Hide colour
            </button>
            <button onClick={() => setTablet((v) => !v)} className={tablet ? btnOn : btn}>
              {tablet ? 'Tablet' : 'Desktop'}
            </button>
            <button
              onClick={() => setMissingAssets((v) => !v)}
              className={missingAssets ? btnOn : btn}
            >
              {missingAssets ? '● ' : ''}Simulate missing assets
            </button>
          </div>

          {/* The tempo dial. Slide it until the pacing is right, then tell me
              the number — or set PERFORMANCE_TEMPO in recipes.ts yourself; it
              is one line and nothing else has to change. */}
          <div className="mt-3 rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2.5">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-fantasy text-amber-200">Tempo</span>
              <input
                type="range"
                min={1}
                max={6}
                step={0.05}
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="flex-1 min-w-[220px] accent-amber-400"
                aria-label="Performance tempo"
              />
              <span className="text-sm font-mono text-amber-100 w-14 text-right">
                {tempo.toFixed(2)}×
              </span>
              <span className="text-xs text-bone/55 font-mono">
                {((resolved?.totalMs ?? 0) / 1000).toFixed(2)}s per ability
              </span>
              {Math.abs(tempo - PERFORMANCE_TEMPO) > 0.001 && (
                <button onClick={() => setTempo(PERFORMANCE_TEMPO)} className={btn}>
                  reset to shipped ({PERFORMANCE_TEMPO}×)
                </button>
              )}
            </div>
            <p className="text-[11px] text-bone/50 mt-1.5">
              Higher = slower and more cinematic. This rescales the real stage plan, so the
              seconds shown are what the game would do. Three heroes acting in sequence is
              roughly{' '}
              <span className="text-bone/75">
                {(((resolved?.totalMs ?? 0) * 3) / 1000).toFixed(1)}s
              </span>{' '}
              of hero turns per round. Shipping value lives in{' '}
              <code className="text-bone/70">recipes.ts → PERFORMANCE_TEMPO</code>.
            </p>
          </div>

          <div className="mt-2 flex gap-2 items-center">
            <span className="text-xs text-bone/50 mr-1">Motion</span>
            {(['full', 'subtle', 'off'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMotionLevel(m)}
                className={motionLevel === m ? btnOn : btn}
              >
                {m}
              </button>
            ))}
          </div>

          {resolved && (
            <div className="mt-2 flex gap-2 items-center flex-wrap">
              <span className="text-xs text-bone/50 mr-1">Stage</span>
              <button
                onClick={() => setPinnedStage(undefined)}
                className={pinnedStage === undefined ? btnOn : btn}
              >
                play
              </button>
              {resolved.stages.map((s, i) => (
                <button
                  key={s.stage}
                  onClick={() => setPinnedStage(i)}
                  className={pinnedStage === i ? btnOn : btn}
                  title={`${s.durationMs}ms${s.consequences.length ? ` — ${s.consequences.length} consequence(s)` : ''}`}
                >
                  {s.stage}
                  {s.consequences.length > 0 && <span className="text-amber-300"> •</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------------- inspector ---------------- */}
        <div className="w-[420px] shrink-0 space-y-4">
          <Panel title="Scenario">
            <select
              value={scenarioId}
              onChange={(e) => {
                setScenarioId(e.target.value);
                setPinnedStage(undefined);
                setCompareLashes(false);
                setReplayKey((k) => k + 1);
              }}
              className="w-full bg-void/60 border border-bone/25 rounded px-2 py-1.5 text-sm"
            >
              {SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-bone/60 mt-2 leading-relaxed">{scenario.proves}</p>

            {/*
              The second axis. Any ability can be cast in any material, because
              that is what the system does — the caster's element decides the
              substance, not the ability. Authored kits are listed first; the
              rest still render on a family default, which is exactly what a
              player holding an un-authored element sees today.
            */}
            <label className="block mt-3">
              <span className="text-xs text-bone/50">Cast as element</span>
              <select
                value={elementOverride ?? ''}
                onChange={(e) => {
                  setElementOverride((e.target.value || null) as ElementName | null);
                  setPinnedStage(undefined);
                  setReplayKey((k) => k + 1);
                }}
                className="w-full mt-1 bg-void/60 border border-bone/25 rounded px-2 py-1.5 text-sm"
              >
                <option value="">
                  — scenario default ({scenario.forcedElement ?? 'none'}) —
                </option>
                <optgroup label="Authored">
                  {AUTHORED_ELEMENTS.map((el) => (
                    <option key={el} value={el}>
                      {el}
                      {ELEMENTS_WITH_ART.has(el) ? ' — with art' : ' — procedural'}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Family default — not yet authored">
                  {PROVISIONAL_ELEMENTS.map((el) => (
                    <option key={el} value={el}>
                      {el}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </Panel>

          {resolved && <ResolutionPanel performance={resolved} scenario={scenario} />}
          {resolved && <StagePanel performance={resolved} />}
          <CoveragePanel />
        </div>
      </div>
    </div>
  );
}

/**
 * Rescale a resolved plan to a different tempo.
 *
 * Rebuilds the stage timings rather than just playing back faster, so the
 * inspector's stage durations and total are the REAL numbers for the tempo on
 * screen — the point of the dial is to read off a value to ship, and a
 * playback-only speed control would show durations that were never true.
 *
 * Ratios between stages are untouched; only the multiplier moves.
 */
function retempo(p: ResolvedPerformance, tempo: number): ResolvedPerformance {
  const factor = tempo / PERFORMANCE_TEMPO;
  if (Math.abs(factor - 1) < 0.001) return p;

  let cursor = 0;
  const stages = p.stages.map((s) => {
    const durationMs = Math.round(s.durationMs * factor);
    const next = { ...s, durationMs, startMs: cursor };
    cursor += durationMs;
    return next;
  });
  return { ...p, stages, totalMs: cursor };
}

/* ------------------------------------------------------------------ */
/*  Resolution                                                         */
/* ------------------------------------------------------------------ */

/**
 * Runs the real pipeline: compile scopes → resolve the first one.
 *
 * Deliberately calls the SAME functions real combat will call, rather than a
 * theater-only shortcut. A review tool that exercises different code from the
 * game proves nothing.
 */
function useResolvedPerformance(
  scenario: TheaterScenario,
  viewportWidth: number,
  motionLevel: MotionLevel,
  simulateMissingAssets: boolean,
): ResolvedPerformance | null {
  return useMemo(() => {
    const compiled = compileActionScopes(scenario.events, BOSS);
    const scope = compiled.scopes.find((s) => !s.isBoss);
    if (!scope) return null;

    // A stand-in card carrying only what the resolver reads: the element.
    // Constructing a whole valid `Card` here would be noise — the resolver
    // makes exactly one card-store read, `resolveCurrentElement`, and that
    // reads `currentElement ?? elementSelection?.element`.
    const card = { currentElement: scenario.forcedElement } as unknown as Card;

    return resolvePerformance(scope, {
      events: scenario.events,
      cardByActorId: new Map([[HERO_A, card], [HERO_B, card]]),
      motionLevel,
      simulateMissingAssets,
    });
  }, [scenario, viewportWidth, motionLevel, simulateMissingAssets]);
}

/** The three lashes on one path, which is the reuse proof. */
function LashComparison({
  scenarios,
  viewportWidth,
  motionLevel,
  missingAssets,
  pinnedStage,
  replayKey,
  speed,
}: {
  scenarios: readonly TheaterScenario[];
  viewportWidth: number;
  motionLevel: MotionLevel;
  missingAssets: boolean;
  pinnedStage: number | undefined;
  replayKey: number;
  speed: number;
}) {
  return (
    <>
      {scenarios.map((s, i) => (
        <LashPane
          key={`${s.id}_${replayKey}`}
          scenario={s}
          index={i}
          count={scenarios.length}
          viewportWidth={viewportWidth}
          motionLevel={motionLevel}
          missingAssets={missingAssets}
          pinnedStage={pinnedStage}
          replayKey={replayKey}
          speed={speed}
        />
      ))}
    </>
  );
}

function LashPane({
  scenario,
  index,
  count,
  viewportWidth,
  motionLevel,
  missingAssets,
  pinnedStage,
  replayKey,
  speed,
}: {
  scenario: TheaterScenario;
  index: number;
  count: number;
  viewportWidth: number;
  motionLevel: MotionLevel;
  missingAssets: boolean;
  pinnedStage: number | undefined;
  replayKey: number;
  speed: number;
}) {
  const resolved = useResolvedPerformance(scenario, viewportWidth, motionLevel, missingAssets);
  if (!resolved) return null;

  const height = `${100 / count}%`;
  return (
    <div
      className="absolute left-0 right-0"
      style={{ top: `${(index * 100) / count}%`, height, overflow: 'hidden' }}
    >
      <div className="absolute left-2 top-1 text-[11px] font-mono text-bone/50 z-30">
        {resolved.material.element} — {resolved.material.silhouette} / {resolved.material.edgeProfile}
      </div>
      <PerformanceView
        performance={resolved}
        motionLevel={motionLevel}
        anchorContext={{ viewportWidth, casterIndex: 0, targetIndex: 1 }}
        clock={{ pinnedStageIndex: pinnedStage, replayKey, speed }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inspector panels                                                   */
/* ------------------------------------------------------------------ */

function ResolutionPanel({
  performance: p,
  scenario,
}: {
  performance: ResolvedPerformance;
  scenario: TheaterScenario;
}) {
  const kit = p.material;
  return (
    <Panel title="Resolution">
      <Row k="ability" v={scenario.abilityDefinitionId} />
      <Row k="recipe" v={p.recipeId} />
      <Row k="form" v={p.form} />
      <Row k="intensity" v={p.intensity} />
      <Row k="cast → target" v={`${p.castAnchor} → ${p.targetAnchor}`} />
      <Row k="total" v={`${(p.totalMs / 1000).toFixed(2)}s`} />
      <Row k="tempo" v={`${PERFORMANCE_TEMPO}× shipped — dial above to try others`} />

      <div className="mt-3 pt-2 border-t border-bone/15">
        <Row k="material" v={kit.element} />
        <Row k="silhouette" v={kit.silhouette} />
        <Row k="edge" v={kit.edgeProfile} />
        <Row k="particle" v={kit.particle} />
        <Row k="impact" v={kit.impact} />
        <Row k="residue" v={kit.residue} />
        <Row k="cites" v={kit.citesVisualLanguage} />
        <div className="flex gap-1 mt-1.5">
          {kit.palette.map((c) => (
            <span
              key={c}
              className="inline-block w-6 h-4 rounded-sm border border-bone/25"
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {kit.provisional && (
        <Warn>
          Material kit for {kit.element} is a family default, not authored art direction.
        </Warn>
      )}
      {p.isFallback && <Warn>{p.fallbackReason}</Warn>}
    </Panel>
  );
}

function StagePanel({ performance: p }: { performance: ResolvedPerformance }) {
  return (
    <Panel title="Stage plan">
      <div className="space-y-1">
        {p.stages.map((s) => (
          <div key={s.stage} className="text-xs font-mono flex gap-2">
            <span className="w-20 text-bone/50">{s.stage}</span>
            <span className="w-16 text-bone/40">{s.durationMs}ms</span>
            <span className="flex-1">
              {s.consequences.length === 0 ? (
                <span className="text-bone/25">—</span>
              ) : (
                s.consequences.map((c, i) => (
                  <span key={i} className="text-amber-300/90 mr-2">
                    {c.kind}
                    {c.amount !== undefined ? ` ${c.amount}` : ''}
                    {c.statusId ? ` ${c.statusId}` : ''}
                  </span>
                ))
              )}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/**
 * Coverage and debt.
 *
 * Kept on the page permanently rather than hidden behind a toggle: the whole
 * risk with a fallback path is that it quietly becomes the answer for
 * everything, and a number that is always visible is the cheapest guard
 * against that.
 */
function CoveragePanel() {
  const kits = Object.values(MATERIAL_KITS);
  const authored = kits.filter((k) => !k.provisional);
  const assets = ALL_PERFORMANCE_ASSETS;
  const ready = assets.filter(
    (a) => a.approvalStatus === 'candidate' || a.approvalStatus === 'approved',
  );

  return (
    <Panel title="Coverage">
      <Row k="materials authored" v={`${authored.length} / ${kits.length}`} />
      <Row k="assets on disk" v={`${ready.length} / ${assets.length}`} />
      <p className="text-[11px] text-bone/45 mt-2 leading-relaxed">
        Every asset row is a spec, not a file — Delivery 1 is code-only by design, so the
        renderers can be reviewed before any generation is paid for. The material count is the
        one to watch: if it stops climbing while abilities keep shipping, the fallback has
        quietly become the default.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Chrome                                                             */
/* ------------------------------------------------------------------ */

/** Reference marks so anchors can be judged against something. */
function StageMarkers() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <ellipse cx={50} cy={34} rx={9} ry={13} fill="#ffffff10" stroke="#ffffff28" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
      <text x={50} y={34} fill="#ffffff55" fontSize={2.6} textAnchor="middle">boss</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect
            x={22 + i * 14}
            y={68}
            width={11}
            height={17}
            rx={1}
            fill="#ffffff0e"
            stroke="#ffffff26"
            strokeWidth={0.3}
            vectorEffect="non-scaling-stroke"
          />
          <text x={27.5 + i * 14} y={78} fill="#ffffff55" fontSize={2.4} textAnchor="middle">
            card {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded border border-bone/20 bg-void/40 p-3">
      <h2 className="font-fantasy text-sm text-parchment mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-xs font-mono">
      <span className="w-28 shrink-0 text-bone/45">{k}</span>
      <span className="text-bone/90 break-all">{v}</span>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 text-[11px] text-amber-300/90 bg-amber-400/10 border border-amber-400/25 rounded px-2 py-1.5">
      {children}
    </p>
  );
}

const btn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-bone/25 bg-void/50 hover:bg-void/80 transition-colors';
const btnOn =
  'px-2.5 py-1 rounded text-xs font-fantasy border border-amber-400/60 bg-amber-400/20 text-amber-100';

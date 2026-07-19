import { useEffect, useState } from 'react';
import type { ArchetypeName, CardStats, Rank } from '../types/card';
import type {
  ElementName,
  ElementSelection,
  StoryPillarAnswers,
  HiddenFate,
} from '../types/bible';
import { generateCardTextWithRetry } from '../services/claudeApi';
import { generatePortrait, getInitStrengthForArchetype } from '../services/leonardoApi';
import { getQuestionsForArchetype, sampleOptions } from '../data/storyPillars';
import { ELEMENT_VISUAL_LANGUAGE } from '../data/elementVisualLanguage';

/**
 * M5.5 verification harness — 10 fresh Foundation forges + optional tier-up
 * batches (Forged, then Ascendant). Renders real Leonardo images plus
 * ember-leak + role-purge assertions per card and rank.
 *
 * Not linked from nav — navigate to /m55harness by URL.
 */

interface HarnessConfig {
  archetype: ArchetypeName;
  element: ElementName;
  note: string;
}

const BATCH: readonly HarnessConfig[] = [
  { archetype: 'Barbarian',   element: 'Storm',  note: 'The M5.4 leak case — must be steel-gray + electric-blue, zero ember' },
  { archetype: 'Monk',        element: 'Wind',   note: 'Wind = green + wispy + floating' },
  { archetype: 'Beastmaster', element: 'Beast',  note: 'Beast fur/claw/tawny, historical failure with fire' },
  { archetype: 'Druid',       element: 'Nature', note: 'Nature vines + blooms; no shadow/scorched' },
  { archetype: 'Necromancer', element: 'Void',   note: 'Void = starless-black + reality-tear, no warm colors' },
  { archetype: 'Vampire',     element: 'Blood',  note: 'Fire-family — ember IS legit; red mist not orange flame' },
  { archetype: 'Lycanthrope', element: 'Moon',   note: 'Moon silver + midnight-blue, no warm' },
  { archetype: 'Mech Pilot',  element: 'Tech',   note: 'Tech circuit-cyan + hologram-teal, no ember' },
  { archetype: 'Android',     element: 'Cosmic', note: 'Cosmic deep-indigo + starlight + constellation patterns on chrome — replaces Sound (M5.7)' },
  { archetype: 'Seraph',      element: 'Light',  note: 'Light gold + prism-rainbow — old celestial-role leak candidate' },
];

const NEUTRAL_ROLES: readonly string[] = [
  'heroic', 'villainous', 'aristocratic', 'scholarly',
  'practical', 'battlefield', 'ceremonial', 'industrial',
];

const FIRE_FAMILY: readonly ElementName[] = ['Fire', 'Blood', 'Ash', 'Holy'];

const EMBER_RX = /\b(ember|infernal|molten|glowing coals|flame-lit|hooked chains?|volcanic glass|warm ember|orange rim)\b/gi;
const FASHION_BANNED_ROLE_RX = /\b(infernal|celestial|corrupted)\b/i;

interface RankStage {
  cardName?: string;
  nameAndTitle?: string;
  portraitDataUrl?: string;
  hiddenFate?: HiddenFate;
  portraitPrompt?: string;
  negativePrompt?: string;
  emberMatches: string[];
  assertions: { label: string; pass: boolean; detail?: string }[];
  status: 'pending' | 'running' | 'done' | 'error';
  error?: string;
}

const EMPTY_STAGE: RankStage = {
  emberMatches: [],
  assertions: [],
  status: 'pending',
};

interface CellResult {
  config: HarnessConfig;
  answers?: StoryPillarAnswers;
  stats?: CardStats;
  element?: ElementSelection;
  foundation: RankStage;
  forged: RankStage;
  ascendant: RankStage;
  selected: boolean;
}

function makeAnswers(archetype: ArchetypeName): StoryPillarAnswers {
  const qs = getQuestionsForArchetype(archetype);
  const answers = qs.map((q) => {
    const opts = sampleOptions(archetype, q.id, 1);
    const chosen = opts[0];
    return {
      questionId: q.id,
      optionId: chosen?.id ?? `${q.id}_seed`,
      answer: chosen?.text ?? '(no seed available)',
    };
  });
  return { answers };
}

function makeElementSelection(el: ElementName): ElementSelection {
  return {
    element: el,
    bond: 'It is my inheritance.',
    compatibility: 'compatible_through_reinterpretation',
  };
}

function makeStats(archetype: ArchetypeName, rank: Rank): CardStats {
  const bumps: Record<Rank, number> = { Foundation: 0, Forged: 16, Ascendant: 30 };
  const bump = bumps[rank];
  const isTech = archetype === 'Mech Pilot' || archetype === 'Android';
  const resource = isTech
    ? { Tech: { value: 55 + bump, bias: 'Mid' as const, hardCap: 85 } }
    : { Mana: { value: 55 + bump, bias: 'Mid' as const, hardCap: 85 } };
  return {
    Atk: { value: 60 + bump, bias: 'Mid-High' as const, hardCap: 90 },
    Def: { value: 45 + bump, bias: 'Mid' as const, hardCap: 85 },
    ...resource,
  };
}

function assertionsFor(
  config: HarnessConfig,
  hiddenFate: HiddenFate | undefined,
  portraitPrompt: string,
  emberMatches: string[],
): RankStage['assertions'] {
  const el = ELEMENT_VISUAL_LANGUAGE[config.element];
  const primaryColors = el?.primaryColors ?? '';
  const paletteWord = primaryColors.split(/[,;]/)[0]?.split(/\s+/)[0]?.toLowerCase() ?? '';

  const role = hiddenFate?.fashion?.role ?? '';
  const armor = hiddenFate?.fashion?.armor ?? '';
  const bodyMass = hiddenFate?.bodyDimensions?.mass ?? '';
  const skinDepth = hiddenFate?.skinPresentation?.depth ?? '';
  const isFireFam = FIRE_FAMILY.includes(config.element);

  return [
    {
      label: 'fashion.role is neutral (no infernal/celestial/corrupted)',
      pass: role !== '' && !FASHION_BANNED_ROLE_RX.test(role) && NEUTRAL_ROLES.includes(role),
      detail: `role="${role}"`,
    },
    {
      label: 'armor description contains no ember/infernal language',
      pass: !EMBER_RX.test(armor),
      detail: armor ? armor.slice(0, 80) : '(empty)',
    },
    {
      label: isFireFam
        ? 'Fire-family element: ember/warm language is legitimate'
        : 'Non-fire element: no ember-leak (excluding anti-contamination clauses)',
      pass: isFireFam ? true : emberMatches.length === 0,
      detail: emberMatches.length ? `matches: ${emberMatches.slice(0, 3).join(', ')}` : '',
    },
    {
      label: `portraitPrompt references element palette ("${paletteWord}")`,
      pass: paletteWord.length > 2 && portraitPrompt.toLowerCase().includes(paletteWord),
    },
    {
      label: 'bodyDimensions.mass populated (not "athletic")',
      pass: bodyMass !== '' && !/athletic/i.test(bodyMass),
      detail: `mass="${bodyMass}"`,
    },
    {
      label: 'skinPresentation.depth is tier + pigment',
      pass: skinDepth !== '' && skinDepth.trim().split(/\s+/).length >= 2,
      detail: `depth="${skinDepth}"`,
    },
  ];
}

function findEmberLeaks(prompt: string): string[] {
  const negativeClauseRx = /(NEVER|NO |AVOID|ZERO|WITHOUT)[^.,]*?(ember|infernal|molten|warm|orange|flame)[^.,]*?[.,]/gi;
  const cleaned = prompt.replace(negativeClauseRx, '');
  const matches = cleaned.match(EMBER_RX) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

const STORAGE_KEY = 'm55-harness-results-v1';

function loadPersistedResults(): CellResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialResults();
    const parsed = JSON.parse(raw) as CellResult[];
    if (!Array.isArray(parsed) || parsed.length !== BATCH.length) return initialResults();
    // Reset any mid-run states so a page reload doesn't leave running spinners.
    return parsed.map((r, i) => ({
      ...r,
      config: BATCH[i],
      foundation: r.foundation?.status === 'running' ? { ...r.foundation, status: 'pending' } : (r.foundation ?? { ...EMPTY_STAGE }),
      forged: r.forged?.status === 'running' ? { ...r.forged, status: 'pending' } : (r.forged ?? { ...EMPTY_STAGE }),
      ascendant: r.ascendant?.status === 'running' ? { ...r.ascendant, status: 'pending' } : (r.ascendant ?? { ...EMPTY_STAGE }),
    }));
  } catch {
    return initialResults();
  }
}

function initialResults(): CellResult[] {
  return BATCH.map((c) => ({
    config: c,
    foundation: { ...EMPTY_STAGE },
    forged: { ...EMPTY_STAGE },
    ascendant: { ...EMPTY_STAGE },
    selected: false,
  }));
}

export function M55Harness() {
  const [results, setResults] = useState<CellResult[]>(loadPersistedResults);
  const [running, setRunning] = useState(false);

  // Persist on every state change so HMR / navigation / tab close doesn't
  // lose Foundation results the way it did before M5.5.1.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } catch (err) {
      console.warn('[M5.5] persist failed', err);
    }
  }, [results]);

  const patch = (i: number, patcher: (r: CellResult) => CellResult) => {
    setResults((prev) => {
      const next = [...prev];
      next[i] = patcher(next[i]);
      return next;
    });
  };

  const runOne = async (
    i: number,
    rank: Rank,
    existing?: { name: string; hiddenFate: HiddenFate; foundationDataUrl?: string; forgedDataUrl?: string },
  ) => {
    const cell = results[i];
    const config = cell.config;
    const answers = cell.answers ?? makeAnswers(config.archetype);
    const element = cell.element ?? makeElementSelection(config.element);
    const stats = makeStats(config.archetype, rank);

    const stageKey: 'foundation' | 'forged' | 'ascendant' =
      rank === 'Foundation' ? 'foundation' : rank === 'Forged' ? 'forged' : 'ascendant';

    patch(i, (r) => ({
      ...r,
      answers,
      element,
      stats,
      [stageKey]: { ...r[stageKey], status: 'running' as const },
    }));

    try {
      const generated = await generateCardTextWithRetry({
        archetype: config.archetype,
        stats,
        answers,
        element,
        existingHiddenFate: existing?.hiddenFate,
        existingName: existing?.name,
      });

      const emberMatches = findEmberLeaks(generated.portraitPrompt);
      const assertions = assertionsFor(
        config,
        generated.hiddenFate,
        generated.portraitPrompt,
        emberMatches,
      );

      patch(i, (r) => ({
        ...r,
        [stageKey]: {
          ...r[stageKey],
          cardName: generated.cardName,
          nameAndTitle: generated.nameAndTitle,
          hiddenFate: generated.hiddenFate,
          portraitPrompt: generated.portraitPrompt,
          negativePrompt: generated.negativePrompt,
          emberMatches,
          assertions,
          status: 'running' as const,
        },
      }));

      // Init image for tier-up = previous rank's portrait for continuity
      const initDataUrl = rank === 'Forged'
        ? existing?.foundationDataUrl
        : rank === 'Ascendant'
        ? existing?.forgedDataUrl
        : undefined;
      const initStrength = rank === 'Foundation'
        ? undefined
        : getInitStrengthForArchetype(config.archetype, rank);

      const { dataUrl } = await generatePortrait(
        generated.portraitPrompt,
        generated.negativePrompt,
        config.archetype,
        rank,
        initDataUrl,
        initStrength,
      );

      patch(i, (r) => ({
        ...r,
        [stageKey]: { ...r[stageKey], portraitDataUrl: dataUrl, status: 'done' as const },
      }));
    } catch (err) {
      console.error(`[M5.5] ${config.archetype} ${rank} failed`, err);
      patch(i, (r) => ({
        ...r,
        [stageKey]: {
          ...r[stageKey],
          status: 'error' as const,
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

  const runFoundationForIndices = async (indices: number[]) => {
    if (running || indices.length === 0) return;
    setRunning(true);
    for (const idx of indices) {
      const c = BATCH[idx];
      localStorage.setItem(`card-engine-fashion-cursor-${c.archetype}`, '2');
      localStorage.setItem(`card-engine-hair-cursor-${c.archetype}`, '1');
      localStorage.setItem(`card-engine-pose-cursor-${c.archetype}`, '0');
    }
    for (const idx of indices) {
      await runOne(idx, 'Foundation');
    }
    setRunning(false);
  };

  const runFoundationBatch = () => runFoundationForIndices(BATCH.map((_, i) => i));

  const runFoundationSelected = () => {
    const indices = results
      .map((r, i) => (r.selected ? i : -1))
      .filter((i) => i >= 0);
    return runFoundationForIndices(indices);
  };

  const clearAll = () => {
    if (running) return;
    if (!confirm('Clear all harness results?')) return;
    setResults(initialResults());
  };

  const tierSelected = async (targetRank: 'Forged' | 'Ascendant') => {
    if (running) return;
    setRunning(true);
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r.selected) continue;
      const prevRank = targetRank === 'Forged' ? r.foundation : r.forged;
      if (prevRank.status !== 'done' || !prevRank.hiddenFate || !prevRank.cardName) {
        console.warn(`[M5.5] skip ${r.config.archetype} — prev rank not done`);
        continue;
      }
      await runOne(i, targetRank, {
        name: prevRank.cardName,
        hiddenFate: prevRank.hiddenFate,
        foundationDataUrl: r.foundation.portraitDataUrl,
        forgedDataUrl: r.forged.portraitDataUrl,
      });
    }
    setRunning(false);
  };

  const toggleSelect = (i: number) => {
    patch(i, (r) => ({ ...r, selected: !r.selected }));
  };

  const foundationDone = results.filter((r) => r.foundation.status === 'done').length;
  const selectedCount = results.filter((r) => r.selected).length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto text-bone">
      <h1 className="text-3xl font-fantasy mb-2">Prompt Lab — Archetype Portrait Harness</h1>
      <p className="text-sm text-bone/70 mb-4">
        Permanent iteration workspace for portrait prompts. Runs the LIVE
        Claude + Leonardo pipeline the game uses — every change to
        <code className="text-emerald-300 mx-1">claudeApi.ts</code>,
        <code className="text-emerald-300 mx-1">elementVisualLanguage.ts</code>, or the
        Bibles shows up here immediately. Results persist to localStorage so
        HMR / reloads don't wipe them. Check boxes to select a subset, then
        run Foundation-for-selected or tier up.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={runFoundationBatch}
          disabled={running}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-600 text-white rounded"
        >
          {running ? `Running… (${foundationDone}/${BATCH.length})` : 'Run Foundation (All 10)'}
        </button>
        <button
          onClick={runFoundationSelected}
          disabled={running || selectedCount === 0}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-600 text-white rounded"
        >
          Run Foundation for Selected ({selectedCount})
        </button>
        <button
          onClick={() => tierSelected('Forged')}
          disabled={running || selectedCount === 0}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-600 text-white rounded"
        >
          Tier Selected → Forged ({selectedCount})
        </button>
        <button
          onClick={() => tierSelected('Ascendant')}
          disabled={running || selectedCount === 0}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-stone-600 text-white rounded"
        >
          Tier Selected → Ascendant ({selectedCount})
        </button>
        <button
          onClick={clearAll}
          disabled={running}
          className="px-4 py-2 bg-stone-700 hover:bg-stone-600 disabled:bg-stone-800 text-white rounded"
        >
          Clear All
        </button>
        <div className="text-sm text-bone/80">
          Foundation done: {foundationDone}/{BATCH.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r, i) => {
          const cellBorder =
            r.foundation.status === 'error' || r.forged.status === 'error' || r.ascendant.status === 'error' ? 'border-rose-500' :
            r.ascendant.status === 'done' ? 'border-violet-400' :
            r.forged.status === 'done' ? 'border-amber-400' :
            r.foundation.status === 'done' ? 'border-emerald-500' :
            r.foundation.status === 'running' || r.forged.status === 'running' || r.ascendant.status === 'running' ? 'border-amber-400 animate-pulse' :
            'border-stone-600';

          return (
            <div key={i} className={`rounded border p-3 bg-void/60 ${cellBorder}`}>
              <div className="flex items-baseline justify-between mb-2">
                <label className="font-fantasy text-lg flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={() => toggleSelect(i)}
                    className="w-4 h-4"
                  />
                  {r.config.archetype} · <span className="text-emerald-300">{r.config.element}</span>
                </label>
                <div className="text-xs text-bone/60">
                  F:{r.foundation.status} · Fg:{r.forged.status} · A:{r.ascendant.status}
                </div>
              </div>
              <p className="text-xs text-bone/60 mb-2">{r.config.note}</p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {(['foundation', 'forged', 'ascendant'] as const).map((k) => {
                  const stage = r[k];
                  const label = k === 'foundation' ? 'Foundation' : k === 'forged' ? 'Forged' : 'Ascendant';
                  return (
                    <div key={k} className="text-center">
                      <div className="text-[10px] text-bone/50 uppercase mb-1">{label}</div>
                      {stage.portraitDataUrl ? (
                        <img
                          src={stage.portraitDataUrl}
                          alt={`${r.config.archetype} ${label}`}
                          className="w-full aspect-square object-cover rounded"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded border border-dashed border-stone-600 flex items-center justify-center text-[10px] text-bone/40">
                          {stage.status === 'running' ? '…' : stage.status === 'error' ? '✗' : '—'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {r.foundation.cardName && (
                <div className="mb-2 text-sm">
                  <div className="font-semibold">{r.foundation.nameAndTitle ?? r.foundation.cardName}</div>
                  <div className="text-bone/70 text-xs mt-1 space-y-0.5">
                    <div><span className="text-bone/50">role:</span> {r.foundation.hiddenFate?.fashion?.role}</div>
                    <div><span className="text-bone/50">sex:</span> {r.foundation.hiddenFate?.sex}</div>
                    <div><span className="text-bone/50">body:</span> {r.foundation.hiddenFate?.bodyDimensions?.mass ?? r.foundation.hiddenFate?.bodyType?.slice(0, 60)}</div>
                    <div><span className="text-bone/50">skin:</span> {r.foundation.hiddenFate?.skinPresentation?.depth ?? r.foundation.hiddenFate?.skinTone?.slice(0, 60)}</div>
                    <div><span className="text-bone/50">hair:</span> {r.foundation.hiddenFate?.hairDetail?.color} {r.foundation.hiddenFate?.hairDetail?.texture}</div>
                    <div><span className="text-bone/50">armor:</span> {r.foundation.hiddenFate?.fashion?.armor?.slice(0, 80) || '(none)'}</div>
                  </div>
                </div>
              )}

              {r.foundation.assertions.length > 0 && (
                <details className="mb-2">
                  <summary className="text-xs text-bone/60 cursor-pointer">
                    Foundation assertions ({r.foundation.assertions.filter(a => a.pass).length}/{r.foundation.assertions.length} ✓)
                  </summary>
                  <ul className="text-xs space-y-0.5 mt-1">
                    {r.foundation.assertions.map((a, j) => (
                      <li key={j} className={a.pass ? 'text-emerald-300' : 'text-rose-400'}>
                        {a.pass ? '✓' : '✗'} {a.label}
                        {a.detail && <span className="text-bone/50 ml-1">— {a.detail}</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {(['forged', 'ascendant'] as const).map((k) => {
                const stage = r[k];
                if (stage.status === 'pending') return null;
                const label = k === 'forged' ? 'Forged' : 'Ascendant';
                return (
                  <div key={k} className="mb-2 text-xs">
                    <div className="text-bone/60">{label}: <span className="text-bone/40">role={stage.hiddenFate?.fashion?.role ?? '—'}, armor={stage.hiddenFate?.fashion?.armor?.slice(0, 50) ?? '—'}</span></div>
                    {stage.assertions.length > 0 && (
                      <div className="ml-2">
                        {stage.assertions.filter(a => !a.pass).map((a, j) => (
                          <div key={j} className="text-rose-400">✗ {a.label} — {a.detail}</div>
                        ))}
                        {stage.assertions.every(a => a.pass) && (
                          <div className="text-emerald-300">✓ all {stage.assertions.length} assertions pass</div>
                        )}
                      </div>
                    )}
                    {stage.error && <div className="text-rose-400">Error: {stage.error}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

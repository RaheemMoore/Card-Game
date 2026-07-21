import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Card, StatName } from '../../../types/card';
import { CardRenderer } from '../../../components/CardRenderer';
import {
  comboMultiplier,
  countSuccesses,
  effectivePerfectHalfWidth,
  runRating,
} from '../../../services/minigames/forge-strike/engine';
import type { RunRating, StrikeGrade } from '../../../services/minigames/forge-strike/types';
import { applyRunToTemper, getTemper } from '../../../services/minigames/forge-strike/temper';
import { applyTestingStatOutcome } from '../../../services/minigames/forge-strike/training';
import { saveCard } from '../../../services/storage';
import { useForgeStrike, hasCompletedPractice } from './useForgeStrike';
import { StrikeEffects } from './effects/StrikeEffects';
import { CrystalGem, PipMedallion, OrnatePanel } from './components/ForgeFrames';
import { TemperGauge } from './components/TemperGauge';
import { isMuted, toggleMuted, unlock, playCue } from './audio/forgeStrikeAudio';

/**
 * Full-screen Forge Strike surface. Escapes the app shell via a portal to
 * document.body, exactly like pages/battle/CombatViewport.tsx.
 *
 * Visuals are CSS/SVG only — no paid assets, no new deps. Permanent art
 * (background, anvil, hammer, rune circle) can later be upgraded to approved
 * Figma assets without touching mechanics. Presentation reacts to the
 * engine's grade and never determines it.
 */

interface ForgeStrikeViewportProps {
  card: Card;
  stat: StatName;
  onExit: () => void;
  onChangeStat: () => void;
}

/** Selected-stat identity colors (plan §8.3). Green stays DEF-only. */
const STAT_COLORS: Record<StatName, string> = {
  Atk: '#dc2626',
  Def: '#10b981',
  Mana: '#7c6cf0',
  Tech: '#d97706',
};

/** Forge temperature ramp: dull red → orange → yellow → white-hot → blue-white. */
const HEAT_STOPS = ['#5a1208', '#b45309', '#eab308', '#f5f0e8', '#bfdbff'];

/** Smoothly interpolate the heat ramp so the glow eases between stages. */
function heatColor(heat: number): string {
  const t = Math.max(0, Math.min(1, heat)) * (HEAT_STOPS.length - 1);
  const i = Math.floor(t);
  if (i >= HEAT_STOPS.length - 1) return HEAT_STOPS[HEAT_STOPS.length - 1];
  return mix(HEAT_STOPS[i], HEAT_STOPS[i + 1], t - i);
}

function mix(a: string, b: string, f: number): string {
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Grade is never color-only: glyph + word per grade (accessibility §17). */
const GRADE_LABEL: Record<StrikeGrade, { glyph: string; word: string; color: string }> = {
  perfect: { glyph: '★', word: 'PERFECT', color: '#fbbf24' },
  good: { glyph: '✦', word: 'GOOD', color: '#86efac' },
  miss: { glyph: '✕', word: 'MISS', color: '#9ca3af' },
};

const RATING_LABEL: Record<RunRating, { word: string; color: string }> = {
  gold: { word: 'GOLD TEMPER', color: '#fbbf24' },
  silver: { word: 'SILVER TEMPER', color: '#d4d4d8' },
  bronze: { word: 'BRONZE TEMPER', color: '#d08a4e' },
  fail: { word: 'UNTEMPERED', color: '#9ca3af' },
};

interface RunSummary {
  score: number;
  rating: RunRating;
  statFrom: number;
  statTo: number;
  statDelta: number;
  gained: number;
  burst: boolean;
}

/** Bounded ember set — fixed count, staggered via CSS (no unbounded DOM). */
const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: 8 + ((i * 61) % 84),
  delay: (i * 237) % 3000,
  dur: 2600 + ((i * 411) % 1800),
  drift: ((i * 53) % 22) - 11,
  peak: 0.4 + ((i * 17) % 40) / 100,
}));

export function ForgeStrikeViewport({ card, stat, onExit, onChangeStat }: ForgeStrikeViewportProps) {
  const game = useForgeStrike(undefined, hasCompletedPractice());
  const statColor = STAT_COLORS[stat];
  const surfaceRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(isMuted());

  // Live card copy — the forge writes the trained stat + Temper Gauge to it on
  // run completion, then persists. Rendered so changes show immediately.
  const [liveCard, setLiveCard] = useState(card);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [justBurst, setJustBurst] = useState(false);
  const temper = getTemper(liveCard);

  // Body scroll lock + initial focus + focus restore on exit (plan §17).
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    surfaceRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      prevFocus?.focus?.();
    };
  }, []);

  const { phase, run, markerPos, armed, lastGrade, practiceGrade, telegraph, config } = game;
  const inPractice = phase === 'practice' || phase === 'practice_done';
  const showResults = phase === 'complete';
  const displayGrade = inPractice ? practiceGrade : lastGrade;
  const strikeNumber = Math.min(run.nextStrikeIndex + 1, config.strikeCount);
  const glow = useMemo(() => heatColor(run.heat), [run.heat]);

  // One counter that bumps on every resolved strike (incl. miss) — drives the
  // hammer swing and the effect burst. Practice fires once per attempt.
  const strikeSeq = inPractice ? (practiceGrade ? run.nextStrikeIndex + 1 : 0) : run.strikes.length;
  const success = displayGrade === 'good' || displayGrade === 'perfect';

  // Audio cues follow the engine's grade (presentation only). Placeholder
  // synth — see audio/forgeStrikeAudio.ts.
  const lastCuedSeq = useRef(0);
  useEffect(() => {
    if (strikeSeq === 0 || strikeSeq === lastCuedSeq.current || !displayGrade) return;
    lastCuedSeq.current = strikeSeq;
    playCue(displayGrade);
  }, [strikeSeq, displayGrade]);

  useEffect(() => {
    if (showResults) playCue(run.outcome === 'win' ? 'win' : 'lose');
  }, [showResults, run.outcome]);

  // Run completion — apply the TESTING stat write (win +1 / loss −1) and pour
  // the run's rating into the persistent Temper Gauge, then save. Fires once
  // per run: run.phase flips to 'complete' on the final strike and the run
  // object identity is stable until the next reset (new createRun object).
  const appliedRunRef = useRef<typeof run | null>(null);
  useEffect(() => {
    if (run.phase !== 'complete') return;
    if (appliedRunRef.current === run) return;
    appliedRunRef.current = run;

    const rating = runRating(config, run.score);
    const statOutcome = run.outcome === 'win' ? 'win' : 'loss';
    const statResult = applyTestingStatOutcome(liveCard, stat, statOutcome);
    const temperResult = applyRunToTemper(config, statResult.card, rating);

    saveCard(temperResult.card);
    setLiveCard(temperResult.card);
    setRunSummary({
      score: run.score,
      rating,
      statFrom: statResult.from,
      statTo: statResult.to,
      statDelta: statResult.delta,
      gained: temperResult.gained,
      burst: temperResult.burst,
    });
    if (temperResult.burst) {
      setJustBurst(true);
      setTimeout(() => setJustBurst(false), 900);
    }
    // liveCard is intentionally omitted — we read the freshest copy at apply
    // time and the ref guard prevents re-application.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, config, stat]);

  const handleMute = () => setMuted(toggleMuted());

  const strikeWithAudio = () => {
    unlock();
    game.strike();
  };

  // Focus trap: keep Tab within the dialog while it owns the screen.
  const onContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;
    const focusables = containerRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const armedPattern = config.patterns[Math.min(run.nextStrikeIndex, config.patterns.length - 1)];
  const perfectHalfWidth = inPractice
    ? config.zones.perfectHalfWidth
    : effectivePerfectHalfWidth(config, countSuccesses(run), armedPattern.perfectMul ?? 1);

  const body = (
    <div
      ref={containerRef}
      onKeyDown={onContainerKeyDown}
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone flex flex-col"
      style={{ background: '#060405', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Forge Strike"
    >
      {/* Painted forge chamber (Leonardo Phoenix asset) — the real backdrop */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center"
        aria-hidden="true"
        style={{ backgroundImage: "url('/assets/backgrounds/forge-strike-chamber.jpg')" }}
      />
      {/* Readability scrim — dark behind the card (top) + rail/pips (bottom),
          lighter through the mid so the hearth glow reads. Keeps the painted
          anvil subdued so the interactive SVG anvil stays the focal one. */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
        background:
          'linear-gradient(to bottom, rgba(6,4,5,0.84) 0%, rgba(6,4,5,0.5) 26%, rgba(6,4,5,0.42) 58%, rgba(6,4,5,0.82) 100%)',
      }} />
      {/* Edge darkening for stone-pilaster depth */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, transparent 18%, transparent 82%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* Central forge light — intensifies with heat */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 74%, ${glow}${Math.round((0.18 + run.heat * 0.4) * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
        }}
      />

      {/* Vignette focuses attention on card + anvil */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{
        boxShadow: 'inset 0 0 220px 60px rgba(0,0,0,0.7)',
      }} />

      {/* Embers rising from the forge (bounded, pointer-transparent) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none overflow-hidden" aria-hidden="true">
        {EMBERS.map((e) => (
          <span
            key={e.id}
            className="fs-ember absolute rounded-full"
            style={
              {
                left: `${e.left}%`,
                bottom: '8%',
                width: 3,
                height: 3,
                background: glow,
                boxShadow: `0 0 6px ${glow}`,
                opacity: 0,
                animationDelay: `${e.delay}ms`,
                '--dur': `${e.dur}ms`,
                '--ember-drift': `${e.drift}px`,
                '--ember-peak': `${e.peak * (0.4 + run.heat * 0.6)}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Compact header (plan §9.2 — no ornamental plaque) */}
      <header className="relative z-10 flex items-center justify-between px-3 py-2">
        <button
          onClick={onExit}
          className="w-8 h-8 rounded-full border border-amber-200/25 text-amber-100/80 hover:text-white hover:border-amber-200/60 transition-colors"
          aria-label="Leave the forge"
        >
          ✕
        </button>
        <span className="font-fantasy tracking-[0.28em] text-sm text-amber-100/75">FORGE STRIKE</span>
        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wide"
            style={{
              background: 'linear-gradient(to bottom, #3a3128, #1c1712)',
              color: statColor,
              border: '1px solid #0d0a07',
              boxShadow: `inset 0 0 0 1px ${statColor}55, inset 0 1px 0 rgba(230,199,140,0.25)`,
            }}
          >
            {stat.toUpperCase()} TRAINING
          </span>
          <span className="text-xs text-white/60 tabular-nums" aria-label={`Strike ${strikeNumber} of ${config.strikeCount}`}>
            {inPractice ? 'PRACTICE' : `${strikeNumber} / ${config.strikeCount}`}
          </span>
          <button
            onClick={handleMute}
            className="w-8 h-8 rounded-full border border-amber-200/25 text-amber-100/80 hover:text-white hover:border-amber-200/60 transition-colors text-sm"
            aria-label={muted ? 'Unmute forge (placeholder audio)' : 'Mute forge (placeholder audio)'}
            aria-pressed={muted}
            title={muted ? 'Sound off — placeholder audio' : 'Sound on — placeholder audio'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </header>

      {/* Live Forge Score HUD — score building toward the goal + combo */}
      {!inPractice && (
        <div className="relative z-10 flex items-center justify-center gap-3 pb-1 pointer-events-none">
          <OrnatePanel className="px-4 py-1 flex items-center gap-3">
            <span className="flex items-baseline gap-1.5">
              <span className="text-[10px] tracking-widest text-amber-100/60">SCORE</span>
              <span className="font-fantasy text-xl font-bold tabular-nums" style={{ color: statColor }}>
                {run.score}
              </span>
              <span className="text-[10px] tracking-widest text-white/40">/ {config.runGoal}</span>
            </span>
            {run.streak > 1 && (
              <span
                className="font-fantasy text-sm font-bold tabular-nums"
                style={{ color: '#fbbf24', textShadow: '0 0 8px rgba(251,191,36,0.5)' }}
              >
                COMBO ×{comboMultiplier(config, run.streak).toFixed(2)}
              </span>
            )}
          </OrnatePanel>
        </div>
      )}

      {/* Persistent Temper Gauge — side-mounted, fills across runs */}
      {!inPractice && (
        <div className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <TemperGauge fill={temper.fill} bursts={temper.bursts} accent={statColor} justBurst={justBurst} />
        </div>
      )}

      {/* Tap-anywhere active surface — one real button, keyboard-activatable */}
      <button
        ref={surfaceRef}
        onPointerDown={(e) => {
          e.preventDefault();
          if (phase === 'practice_done') return;
          if (!showResults) strikeWithAudio();
        }}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !showResults && phase !== 'practice_done') {
            e.preventDefault();
            strikeWithAudio();
          }
        }}
        className="relative z-10 flex-1 flex flex-col items-center justify-between min-h-0 py-2 outline-none cursor-pointer"
        aria-label="Strike the forge"
        disabled={showResults}
      >
        {/* Perfect strikes give a small screen response (reduced-motion: none) */}
        <div
          key={`stage-${strikeSeq}-${displayGrade}`}
          className={`flex-1 min-h-0 flex flex-col items-center justify-between w-full ${displayGrade === 'perfect' ? 'fs-shake' : ''}`}
        >
          {/* Exact card — the visual anchor */}
          <div className="flex-1 min-h-0 flex items-center justify-center pointer-events-none px-4 relative">
            <div style={{ filter: `drop-shadow(0 0 ${10 + run.heat * 20}px ${glow}99)`, maxHeight: '100%' }}>
              <CardRenderer card={liveCard} size="full" />
            </div>
            {/* Stat-colored energy pulse rising into the card on a success */}
            {success && (
              <span
                key={`energy-${strikeSeq}`}
                className="fs-energy absolute left-1/2 -translate-x-1/2 bottom-0"
                style={{
                  width: displayGrade === 'perfect' ? 10 : 6,
                  height: 120,
                  borderRadius: 9999,
                  background: `linear-gradient(to top, ${statColor} 0%, ${statColor}00 100%)`,
                  boxShadow: `0 0 16px ${statColor}`,
                }}
              />
            )}
          </div>

          {/* Impact effects, anchored over the painted anvil in the backdrop
              (the moving SVG anvil was removed per Raheem). */}
          <div className="relative pointer-events-none flex items-end justify-center w-full" style={{ height: 120 }}>
            <StrikeEffects strikeSeq={strikeSeq} grade={displayGrade} color={statColor} />
          </div>
        </div>

        {/* Result label — polite live region, glyph + word, never color-only */}
        <div className="h-9 flex items-center pointer-events-none" aria-live="polite">
          {displayGrade ? (
            <span
              className="font-fantasy text-2xl font-bold tracking-widest"
              style={{ color: GRADE_LABEL[displayGrade].color, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
            >
              {GRADE_LABEL[displayGrade].glyph} {GRADE_LABEL[displayGrade].word}
            </span>
          ) : telegraph ? (
            <span className="text-sm tracking-widest text-amber-300/90 animate-pulse">⇄ REVERSAL</span>
          ) : (
            <span className="text-xs text-white/45 tracking-widest">
              {inPractice ? 'TAP WHEN THE MARKER REACHES THE CENTER' : 'TAP ANYWHERE TO STRIKE'}
            </span>
          )}
        </div>

        {/* Timing rail — ornate forged-metal frame with crystal end-caps */}
        <div className="w-[90%] max-w-xl pointer-events-none pb-1 flex items-center gap-1" aria-hidden="true">
          <CrystalGem color={statColor} size={18} />
          <div
            className="relative h-9 flex-1 rounded-md p-[3px]"
            style={{
              background: 'linear-gradient(to bottom, #5a4c3c, #241c14)',
              boxShadow:
                '0 2px 6px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(201,162,110,0.5), inset 0 1px 0 rgba(230,199,140,0.35)',
            }}
          >
            <div
              className="relative h-full w-full rounded-[4px] overflow-hidden"
              style={{ background: '#17130f', border: '1px solid rgba(201,162,110,0.5)' }}
            >
              {/* Good zone */}
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${(0.5 - config.zones.goodHalfWidth) * 100}%`,
                  width: `${config.zones.goodHalfWidth * 2 * 100}%`,
                  background: 'linear-gradient(to bottom, rgba(90,110,66,0.5), rgba(58,74,42,0.6))',
                }}
              />
              {/* Perfect zone — shrinks per landed strike (transition = visible) */}
              <div
                className="absolute inset-y-0 transition-[left,width] duration-500"
                style={{
                  left: `${(0.5 - perfectHalfWidth) * 100}%`,
                  width: `${perfectHalfWidth * 2 * 100}%`,
                  background: `linear-gradient(to bottom, ${statColor}bb, ${statColor}77)`,
                  boxShadow: `0 0 10px ${statColor}88`,
                }}
              />
              {/* Center hairline */}
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: 'rgba(255,255,255,0.25)' }} />
              {/* Crystal marker */}
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${markerPos * 100}%`,
                  width: 12,
                  height: 12,
                  transform: `translate(-50%, -50%) rotate(45deg)`,
                  background: armed ? '#fdf6e3' : glow,
                  boxShadow: `0 0 10px 2px ${armed ? '#fdf6e3cc' : glow}`,
                  border: '1px solid rgba(0,0,0,0.4)',
                }}
              />
            </div>
          </div>
          <CrystalGem color={statColor} size={18} />
        </div>

        {/* Five result pips — ornate forged medallions, distinct per grade */}
        {!inPractice && (
          <div className="flex gap-2.5 pointer-events-none" aria-label="Strike results">
            {Array.from({ length: config.strikeCount }, (_, i) => {
              const s = run.strikes[i];
              const label = s ? GRADE_LABEL[s.grade] : null;
              const isNext = i === run.nextStrikeIndex && !showResults;
              return (
                <PipMedallion
                  key={i}
                  glyph={label ? label.glyph : i + 1}
                  gemColor={label ? label.color : isNext ? statColor : '#3a332a'}
                  rimColor={label ? label.color : isNext ? statColor : undefined}
                  active={isNext}
                  dim={!label && !isNext}
                />
              );
            })}
          </div>
        )}
      </button>

      {/* Practice-complete interstitial */}
      {phase === 'practice_done' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-4">
          <OrnatePanel corners accent={statColor} className="p-6 max-w-xs text-center flex flex-col gap-4" style={{ animation: 'fadeIn 240ms ease-out both' }}>
            <p className="text-sm text-white/80">
              Practice strike: {practiceGrade ? GRADE_LABEL[practiceGrade].word : ''}. The real run is five
              strikes — score {config.runGoal}+ to temper your card. Perfects and combos score big.
            </p>
            <button
              autoFocus
              onClick={() => {
                unlock();
                playCue('ready');
                game.startRun();
              }}
              className="px-4 py-2 rounded font-fantasy font-bold tracking-wider"
              style={{ background: statColor, color: '#0b0709' }}
            >
              BEGIN THE FIVE STRIKES
            </button>
            <button onClick={game.replayPractice} className="text-xs text-white/50 underline">
              Practice again
            </button>
          </OrnatePanel>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4">
          <OrnatePanel corners accent={run.outcome === 'win' ? statColor : '#9ca3af'} className="p-6 max-w-sm w-full text-center flex flex-col gap-4" style={{ animation: 'fadeIn 260ms ease-out both' }}>
            <h2
              className="font-fantasy text-3xl font-bold tracking-widest"
              style={{ color: run.outcome === 'win' ? statColor : '#9ca3af' }}
            >
              {run.outcome === 'win' ? 'THE FORGE ANSWERS' : 'THE METAL RESISTS'}
            </h2>

            {/* Final score + rating */}
            <div className="flex flex-col items-center gap-1">
              <span className="font-fantasy text-4xl font-bold tabular-nums" style={{ color: statColor }}>
                {run.score}
              </span>
              {runSummary && (
                <span className="text-xs font-bold tracking-widest" style={{ color: RATING_LABEL[runSummary.rating].color }}>
                  {RATING_LABEL[runSummary.rating].word}
                </span>
              )}
            </div>

            <div className="flex justify-center gap-2.5" aria-label="Final strike grades">
              {run.strikes.map((s) => (
                <span key={s.strikeIndex} title={`${GRADE_LABEL[s.grade].word} · +${s.points}`}>
                  <PipMedallion glyph={GRADE_LABEL[s.grade].glyph} gemColor={GRADE_LABEL[s.grade].color} rimColor={GRADE_LABEL[s.grade].color} />
                </span>
              ))}
            </div>

            {/* Stat change + temper gain (testing) */}
            {runSummary && (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-white/80">
                  {stat.toUpperCase()}{' '}
                  <span className="tabular-nums text-white/50">{runSummary.statFrom}</span>
                  {' → '}
                  <span
                    className="tabular-nums font-bold"
                    style={{ color: runSummary.statDelta > 0 ? '#86efac' : runSummary.statDelta < 0 ? '#f87171' : '#9ca3af' }}
                  >
                    {runSummary.statTo}
                  </span>
                  {runSummary.statDelta !== 0 && (
                    <span className="text-xs text-white/40"> ({runSummary.statDelta > 0 ? '+1' : '−1'}, testing)</span>
                  )}
                </span>
                <span className="text-white/60 text-xs">
                  {runSummary.burst
                    ? '⚒ TEMPER GAUGE BURST!'
                    : runSummary.gained > 0
                      ? `Temper +${Math.round(runSummary.gained * 100)}%`
                      : 'No temper gained'}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button
                autoFocus
                onClick={() => {
                  unlock();
                  playCue('ready');
                  game.reset();
                }}
                className="px-4 py-2 rounded font-fantasy font-bold tracking-wider"
                style={{ background: statColor, color: '#0b0709' }}
              >
                STRIKE AGAIN
              </button>
              <button onClick={onChangeStat} className="px-4 py-2 rounded border border-white/25 text-white/80 text-sm">
                Change stat
              </button>
              <button onClick={onExit} className="text-xs text-white/50 underline">
                Leave the forge
              </button>
            </div>
          </OrnatePanel>
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}

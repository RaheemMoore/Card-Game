import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Card, StatName } from '../../../types/card';
import { CardRenderer } from '../../../components/CardRenderer';
import {
  countSuccesses,
  effectivePerfectHalfWidth,
} from '../../../services/minigames/forge-strike/engine';
import type { StrikeGrade } from '../../../services/minigames/forge-strike/types';
import { useForgeStrike, hasCompletedPractice } from './useForgeStrike';

/**
 * Full-screen Forge Strike surface. Escapes the app shell via a portal to
 * document.body, exactly like pages/battle/CombatViewport.tsx. All visuals
 * here are STAGE-1 PLACEHOLDERS — layout/asset truth arrives with the
 * approved Figma pass (Stage 2/3). Mechanics are final; presentation is not.
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

function heatColor(heat: number): string {
  const idx = Math.min(HEAT_STOPS.length - 1, Math.floor(heat * (HEAT_STOPS.length - 1) + 0.0001));
  return HEAT_STOPS[idx];
}

/** Grade is never color-only: glyph + word per grade (accessibility §17). */
const GRADE_LABEL: Record<StrikeGrade, { glyph: string; word: string; color: string }> = {
  perfect: { glyph: '★', word: 'PERFECT', color: '#fbbf24' },
  good: { glyph: '✦', word: 'GOOD', color: '#86efac' },
  miss: { glyph: '✕', word: 'MISS', color: '#9ca3af' },
};

export function ForgeStrikeViewport({ card, stat, onExit, onChangeStat }: ForgeStrikeViewportProps) {
  const game = useForgeStrike(undefined, hasCompletedPractice());
  const statColor = STAT_COLORS[stat];
  const surfaceRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock + initial focus, mirroring CombatViewport.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    surfaceRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const { phase, run, markerPos, armed, lastGrade, practiceGrade, telegraph, config } = game;
  const inPractice = phase === 'practice' || phase === 'practice_done';
  const showResults = phase === 'complete';
  const displayGrade = inPractice ? practiceGrade : lastGrade;
  const strikeNumber = Math.min(run.nextStrikeIndex + 1, config.strikeCount);
  const glow = heatColor(run.heat);
  // Red (Perfect) zone tightens with each landed strike, plus the armed
  // strike's own perfectMul (the final two are tighter). Practice stays base.
  const armedPattern = config.patterns[Math.min(run.nextStrikeIndex, config.patterns.length - 1)];
  const perfectHalfWidth = inPractice
    ? config.zones.perfectHalfWidth
    : effectivePerfectHalfWidth(config, countSuccesses(run), armedPattern.perfectMul ?? 1);

  const body = (
    <div
      className="fixed inset-0 z-50 w-screen h-[100dvh] overflow-hidden text-bone flex flex-col"
      style={{ background: '#0b0709', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Forge Strike"
    >
      {/* Heat wash — presentation only, brightens with performance */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 62%, ${glow}33 0%, transparent 60%)`,
        }}
      />

      {/* Compact header (plan §9.2 — no ornamental plaque) */}
      <header className="relative z-10 flex items-center justify-between px-3 py-2">
        <button
          onClick={onExit}
          className="w-8 h-8 rounded-full border border-white/25 text-white/80 hover:text-white hover:border-white/60"
          aria-label="Leave the forge"
        >
          ✕
        </button>
        <span className="font-fantasy tracking-[0.2em] text-sm text-white/70">FORGE STRIKE</span>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide"
            style={{ background: `${statColor}22`, color: statColor, border: `1px solid ${statColor}66` }}
          >
            {stat.toUpperCase()} TRAINING
          </span>
          <span className="text-xs text-white/60 tabular-nums" aria-label={`Strike ${strikeNumber} of ${config.strikeCount}`}>
            {inPractice ? 'PRACTICE' : `${strikeNumber} / ${config.strikeCount}`}
          </span>
        </div>
      </header>

      {/* Tap-anywhere active surface — one real button, keyboard-activatable */}
      <button
        ref={surfaceRef}
        onPointerDown={(e) => {
          e.preventDefault();
          if (phase === 'practice_done') return; // wait for explicit Begin
          if (!showResults) game.strike();
        }}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !showResults && phase !== 'practice_done') {
            e.preventDefault();
            game.strike();
          }
        }}
        className="relative z-10 flex-1 flex flex-col items-center justify-between min-h-0 py-2 outline-none cursor-pointer"
        aria-label="Strike the forge"
        disabled={showResults}
      >
        {/* Exact card — the visual anchor */}
        <div className="flex-1 min-h-0 flex items-center justify-center pointer-events-none px-4">
          <div
            style={{
              filter: `drop-shadow(0 0 ${12 + run.heat * 24}px ${glow}aa)`,
              maxHeight: '100%',
            }}
          >
            <CardRenderer card={card} size="full" />
          </div>
        </div>

        {/* Placeholder anvil band */}
        <div className="pointer-events-none w-full flex flex-col items-center gap-1 pb-1">
          <div
            className="w-40 h-10 rounded-b-xl rounded-t-sm transition-colors duration-500"
            style={{
              background: `linear-gradient(to bottom, ${glow}55, #1c1917)`,
              border: '1px solid #3f3f46',
            }}
            aria-hidden="true"
          />

          {/* Result label — polite live region, glyph + word, never color-only */}
          <div className="h-9 flex items-center" aria-live="polite">
            {displayGrade ? (
              <span
                className="font-fantasy text-2xl font-bold tracking-widest"
                style={{ color: GRADE_LABEL[displayGrade].color, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
              >
                {GRADE_LABEL[displayGrade].glyph} {GRADE_LABEL[displayGrade].word}
              </span>
            ) : telegraph ? (
              <span className="text-sm tracking-widest text-amber-300/90 animate-pulse">⇄ REVERSAL</span>
            ) : (
              <span className="text-xs text-white/40 tracking-widest">
                {inPractice ? 'TAP WHEN THE MARKER REACHES THE CENTER' : 'TAP ANYWHERE TO STRIKE'}
              </span>
            )}
          </div>

          {/* Timing rail — normalized 0..1, zones mirror engine config exactly */}
          <div className="w-[86%] max-w-xl pointer-events-none" aria-hidden="true">
            <div className="relative h-8 rounded border border-amber-900/60 overflow-hidden" style={{ background: '#17130f' }}>
              {/* Good zone */}
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${(0.5 - config.zones.goodHalfWidth) * 100}%`,
                  width: `${config.zones.goodHalfWidth * 2 * 100}%`,
                  background: 'rgba(74, 92, 58, 0.55)',
                }}
              />
              {/* Perfect zone — shrinks per landed strike (transition = visible) */}
              <div
                className="absolute inset-y-0 transition-[left,width] duration-500"
                style={{
                  left: `${(0.5 - perfectHalfWidth) * 100}%`,
                  width: `${perfectHalfWidth * 2 * 100}%`,
                  background: `${statColor}88`,
                }}
              />
              {/* Marker */}
              <div
                className="absolute top-0 bottom-0 w-[3px] -translate-x-1/2"
                style={{
                  left: `${markerPos * 100}%`,
                  background: armed ? '#f8fafc' : glow,
                  boxShadow: `0 0 8px 2px ${armed ? '#f8fafc88' : glow}`,
                }}
              />
            </div>
          </div>

          {/* Five result pips — distinct shapes per grade, not just color */}
          {!inPractice && (
            <div className="flex gap-3 pt-2 pointer-events-none" aria-label="Strike results">
              {Array.from({ length: config.strikeCount }, (_, i) => {
                const s = run.strikes[i];
                const label = s ? GRADE_LABEL[s.grade] : null;
                return (
                  <span
                    key={i}
                    className="w-7 h-7 rounded-full border flex items-center justify-center text-sm font-bold"
                    style={{
                      borderColor: label ? label.color : '#3f3f46',
                      color: label ? label.color : '#52525b',
                      background: label ? `${label.color}1a` : 'transparent',
                    }}
                  >
                    {label ? label.glyph : i + 1}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </button>

      {/* Practice-complete interstitial */}
      {phase === 'practice_done' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="rounded-xl border border-amber-800/60 bg-[#171310] p-6 max-w-xs text-center flex flex-col gap-4">
            <p className="text-sm text-white/80">
              Practice strike: {practiceGrade ? GRADE_LABEL[practiceGrade].word : ''}. The real run is five
              strikes — three Good or better wins. Practice mode grants no rewards.
            </p>
            <button
              autoFocus
              onClick={game.startRun}
              className="px-4 py-2 rounded font-fantasy font-bold tracking-wider"
              style={{ background: statColor, color: '#0b0709' }}
            >
              BEGIN THE FIVE STRIKES
            </button>
            <button onClick={game.replayPractice} className="text-xs text-white/50 underline">
              Practice again
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4">
          <div className="rounded-xl border border-amber-800/60 bg-[#171310] p-6 max-w-sm w-full text-center flex flex-col gap-4">
            <h2
              className="font-fantasy text-3xl font-bold tracking-widest"
              style={{ color: run.outcome === 'win' ? statColor : '#9ca3af' }}
            >
              {run.outcome === 'win' ? 'THE FORGE ANSWERS' : 'THE METAL RESISTS'}
            </h2>
            <p className="text-sm text-white/70">
              {countSuccesses(run)} of {config.strikeCount} strikes landed · {stat.toUpperCase()} training ·
              practice mode, no rewards granted
            </p>
            <div className="flex justify-center gap-3" aria-label="Final strike grades">
              {run.strikes.map((s) => (
                <span
                  key={s.strikeIndex}
                  className="w-8 h-8 rounded-full border flex items-center justify-center font-bold"
                  style={{ borderColor: GRADE_LABEL[s.grade].color, color: GRADE_LABEL[s.grade].color }}
                  title={GRADE_LABEL[s.grade].word}
                >
                  {GRADE_LABEL[s.grade].glyph}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                autoFocus
                onClick={game.reset}
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
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}

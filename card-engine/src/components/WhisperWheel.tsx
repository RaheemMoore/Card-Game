import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ArchetypeName, ModifierStack, Rank } from '../types/card';
import {
  buildCategoriesForArchetype,
  rollWeighted,
  RARITY_STYLE,
  type ModifierCategory,
  type ModifierEntry,
  type Rarity,
} from '../data/modifierPools';

interface WhisperWheelProps {
  archetype: ArchetypeName;
  overallRank: Rank;
  onComplete: (modifiers: ModifierStack, whisperWords: string[]) => void;
}

type CategoryKey = keyof ModifierStack;

const MAX_SPINS = 3;
const SPIN_DURATION_MS = 1400;
const RING_STAGGER_MS = 180;
const TICK_INTERVAL_MS = 55;

interface RingState {
  entry: ModifierEntry;
  spinning: boolean;
  displayText: string;
}

function rarityBorderClass(rarity: Rarity, isSpinning: boolean, editable: 'editable' | 'fate'): string {
  if (isSpinning) return 'border-gold/60 shadow-[0_0_18px_rgba(212,175,55,0.6)]';
  const style = RARITY_STYLE[rarity];
  if (rarity !== 'common') return `${style.ring} ${style.glow}`;
  return editable === 'editable' ? 'border-gold/30' : 'border-slate-dark';
}

export function WhisperWheel({ archetype, overallRank, onComplete }: WhisperWheelProps) {
  const categories = useMemo<ModifierCategory[]>(
    () => buildCategoriesForArchetype(archetype, overallRank),
    [archetype, overallRank],
  );

  const [rings, setRings] = useState<Record<string, RingState>>(() => {
    const initial: Record<string, RingState> = {};
    for (const cat of categories) {
      const entry = rollWeighted(cat.pool);
      initial[cat.key] = { entry, spinning: false, displayText: entry.text };
    }
    return initial;
  });

  const [browsing, setBrowsing] = useState<CategoryKey | null>(null);
  const [spinsUsed, setSpinsUsed] = useState(0);
  const [lastRarityFlash, setLastRarityFlash] = useState<Rarity | null>(null);
  const tickIntervals = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const landTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    return () => {
      Object.values(tickIntervals.current).forEach(clearInterval);
      Object.values(landTimeouts.current).forEach(clearTimeout);
    };
  }, []);

  const spinsLeft = MAX_SPINS - spinsUsed;
  const canSpin = spinsLeft > 0;

  const spinAll = useCallback(() => {
    if (!canSpin) return;
    Object.values(tickIntervals.current).forEach(clearInterval);
    Object.values(landTimeouts.current).forEach(clearTimeout);
    tickIntervals.current = {};
    landTimeouts.current = {};

    let highestRarityLanded: Rarity = 'common';
    const rarityOrder: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, mythic: 3 };

    setRings((prev) => {
      const next = { ...prev };
      categories.forEach((cat, idx) => {
        const landing = rollWeighted(cat.pool);
        next[cat.key] = {
          entry: landing,
          spinning: true,
          displayText: cat.pool[Math.floor(Math.random() * cat.pool.length)].text,
        };

        tickIntervals.current[cat.key] = setInterval(() => {
          setRings((cur) => {
            const ring = cur[cat.key];
            if (!ring.spinning) return cur;
            const randText = cat.pool[Math.floor(Math.random() * cat.pool.length)].text;
            return { ...cur, [cat.key]: { ...ring, displayText: randText } };
          });
        }, TICK_INTERVAL_MS);

        const landDelay = SPIN_DURATION_MS + idx * RING_STAGGER_MS;
        landTimeouts.current[cat.key] = setTimeout(() => {
          clearInterval(tickIntervals.current[cat.key]);
          delete tickIntervals.current[cat.key];
          setRings((cur) => ({
            ...cur,
            [cat.key]: { ...cur[cat.key], spinning: false, displayText: landing.text, entry: landing },
          }));

          const rarity = landing.rarity ?? 'common';
          if (rarityOrder[rarity] > rarityOrder[highestRarityLanded]) {
            highestRarityLanded = rarity;
          }
          if (idx === categories.length - 1 && highestRarityLanded !== 'common') {
            setLastRarityFlash(highestRarityLanded);
            setTimeout(() => setLastRarityFlash(null), 1600);
          }
        }, landDelay);
      });
      return next;
    });

    setSpinsUsed((n) => n + 1);
  }, [categories, canSpin]);

  const cycle = useCallback(
    (key: CategoryKey, dir: 1 | -1) => {
      const cat = categories.find((c) => c.key === key);
      if (!cat || cat.editable !== 'editable') return;
      setRings((cur) => {
        const ring = cur[key];
        if (ring.spinning) return cur;
        const idx = cat.pool.findIndex((e) => e.text === ring.entry.text);
        const nextIdx = (idx + dir + cat.pool.length) % cat.pool.length;
        const nextEntry = cat.pool[nextIdx];
        return { ...cur, [key]: { ...ring, entry: nextEntry, displayText: nextEntry.text } };
      });
    },
    [categories],
  );

  const pickFromBrowse = useCallback((key: CategoryKey, entry: ModifierEntry) => {
    setRings((cur) => ({
      ...cur,
      [key]: { ...cur[key], entry, displayText: entry.text, spinning: false },
    }));
    setBrowsing(null);
  }, []);

  const anySpinning = Object.values(rings).some((r) => r.spinning);

  const handleForge = useCallback(() => {
    const modifiers: ModifierStack = {
      setting: rings.setting.entry.text,
      demeanor: rings.demeanor.entry.text,
      signatureDetail: rings.signatureDetail.entry.text,
      lighting: rings.lighting.entry.text,
      element: rings.element?.entry.text,
      physique: rings.physique?.entry.text,
      lineage: rings.lineage?.entry.text,
      classSignature: rings.classSignature?.entry.text,
    };

    const whisperWords: string[] = [
      rings.element?.entry.text,
      rings.physique?.entry.text?.split(',')[0],
      rings.lineage?.entry.text?.split(',')[0],
    ].filter((w): w is string => Boolean(w));

    onComplete(modifiers, whisperWords);
  }, [rings, onComplete]);

  const browsingCategory = browsing ? categories.find((c) => c.key === browsing) : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Whisper Wheel</h2>
        <p className="text-ash text-sm italic">
          Spin the wheel of fate up to 3 times. Adjust the three <span className="text-gold">gold-marked</span> rings to your liking.
        </p>
      </div>

      {/* Central spin button + rarity flash */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={spinAll}
          disabled={anySpinning || !canSpin}
          className={`relative w-28 h-28 rounded-full font-fantasy text-lg font-bold
            border-2 text-gold
            bg-gradient-to-br from-obsidian to-slate-dark
            active:scale-95
            transition-all duration-200
            ${!canSpin ? 'border-slate-dark text-ash cursor-not-allowed' : 'border-gold/60 hover:scale-105 hover:shadow-[0_0_28px_rgba(212,175,55,0.5)]'}
            ${anySpinning ? 'animate-pulse' : ''}`}
        >
          <span className="relative z-10 leading-tight flex flex-col items-center">
            {canSpin ? (spinsUsed === 0 ? 'SPIN' : 'RESPIN') : 'FATE SET'}
            <span className={`text-[10px] mt-1 tracking-widest ${canSpin ? 'text-gold/70' : 'text-ash'}`}>
              {spinsLeft}/{MAX_SPINS}
            </span>
          </span>
          {anySpinning && (
            <span className="absolute inset-1 rounded-full border border-gold/30 animate-[spin_1.4s_linear_infinite]" />
          )}
        </button>
        <div className="h-6 flex items-center">
          {lastRarityFlash && lastRarityFlash !== 'common' && (
            <span
              className={`font-fantasy text-xs tracking-widest uppercase animate-[fadeIn_0.4s_ease-out]
                ${RARITY_STYLE[lastRarityFlash].text}`}
            >
              ✦ {RARITY_STYLE[lastRarityFlash].label} whisper ✦
            </span>
          )}
        </div>
      </div>

      {/* Rings */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const ring = rings[cat.key];
          if (!ring) return null;
          const rarity = ring.entry.rarity ?? 'common';
          const style = RARITY_STYLE[rarity];
          const borderCls = rarityBorderClass(rarity, ring.spinning, cat.editable);
          const isEditable = cat.editable === 'editable';

          return (
            <div
              key={cat.key}
              className={`rounded-lg border-2 bg-obsidian/60 transition-all ${borderCls}`}
            >
              <div className="flex items-center gap-2 p-3">
                {/* Label column */}
                <div className="w-32 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className="font-fantasy text-xs font-bold text-bone/70 tracking-wide">
                      {cat.label}
                    </div>
                    {isEditable && (
                      <span
                        className="text-[9px] font-fantasy text-gold/70 tracking-wider"
                        title="You can adjust this"
                      >
                        ✎
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] font-fantasy uppercase tracking-wider">
                    {rarity !== 'common' && !ring.spinning ? (
                      <span className={style.text}>{style.label}</span>
                    ) : (
                      <span className={isEditable ? 'text-gold/50' : 'text-ash/40'}>
                        {isEditable ? 'Editable' : 'Fate'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value column */}
                <button
                  onClick={() => !ring.spinning && isEditable && setBrowsing(cat.key)}
                  disabled={ring.spinning || !isEditable}
                  className={`flex-1 text-left font-fantasy text-sm leading-snug px-2 py-1.5
                    rounded transition-colors
                    ${ring.spinning ? 'text-gold/90' : !isEditable ? 'text-ash cursor-default' : `${style.text} hover:bg-slate-dark/50`}
                  `}
                >
                  {ring.displayText}
                </button>

                {/* Controls — editable rings only */}
                {isEditable ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => cycle(cat.key, -1)}
                      disabled={ring.spinning}
                      className="w-7 h-7 rounded border border-slate-dark text-ash
                        hover:text-ivory hover:border-ash/60 transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                      aria-label="Previous"
                    >
                      ◀
                    </button>
                    <button
                      onClick={() => cycle(cat.key, 1)}
                      disabled={ring.spinning}
                      className="w-7 h-7 rounded border border-slate-dark text-ash
                        hover:text-ivory hover:border-ash/60 transition-colors
                        disabled:opacity-30 disabled:cursor-not-allowed text-sm"
                      aria-label="Next"
                    >
                      ▶
                    </button>
                  </div>
                ) : (
                  <div className="w-16 shrink-0 text-center">
                    <span className="text-lg opacity-30">🎲</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Forge button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={handleForge}
          disabled={anySpinning}
          className="px-8 py-3 rounded-lg font-fantasy text-base font-bold transition-all
            bg-gradient-to-r from-patience to-speed text-ivory
            hover:shadow-[0_0_18px_rgba(124,58,237,0.4)]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Forge the Card
        </button>
      </div>

      {/* Browse modal */}
      {browsingCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setBrowsing(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] bg-obsidian border border-slate-dark
              rounded-lg shadow-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-dark flex items-center justify-between">
              <div>
                <h3 className="font-fantasy text-lg font-bold text-ivory">{browsingCategory.label}</h3>
                <p className="text-xs text-ash italic">{browsingCategory.description}</p>
              </div>
              <button
                onClick={() => setBrowsing(null)}
                className="text-ash hover:text-ivory text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {browsingCategory.pool.map((entry) => {
                const rarity = entry.rarity ?? 'common';
                const style = RARITY_STYLE[rarity];
                const currentText = rings[browsingCategory.key]?.entry.text;
                const isCurrent = currentText === entry.text;
                return (
                  <button
                    key={entry.text}
                    onClick={() => pickFromBrowse(browsingCategory.key, entry)}
                    className={`w-full text-left p-2.5 rounded border transition-all font-fantasy text-sm
                      ${isCurrent ? `${style.ring} ${style.glow}` : 'border-slate-dark hover:border-ash/40'}
                      ${style.text}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{entry.text}</span>
                      {rarity !== 'common' && (
                        <span className={`text-[9px] uppercase tracking-wider shrink-0 ${style.text}`}>
                          {style.label}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

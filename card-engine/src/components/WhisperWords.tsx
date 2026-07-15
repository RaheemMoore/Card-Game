import { useState } from 'react';

interface WhisperWordsProps {
  onComplete: (words: string[]) => void;
}

const ELEMENT_OPTIONS = [
  { value: 'fire', label: 'Fire', desc: 'Flames and fury' },
  { value: 'ice', label: 'Ice', desc: 'Cold and calculated' },
  { value: 'lightning', label: 'Lightning', desc: 'Crackling energy' },
  { value: 'shadow', label: 'Shadow', desc: 'Darkness and stealth' },
  { value: 'earth', label: 'Earth', desc: 'Unbreakable stone' },
  { value: 'wind', label: 'Wind', desc: 'Swift and untamed' },
];

const BUILD_OPTIONS = [
  { value: 'towering', label: 'Towering', desc: 'Massive, imposing frame' },
  { value: 'lean', label: 'Lean', desc: 'Agile, wiry build' },
  { value: 'scarred', label: 'Scarred', desc: 'Battle-marked survivor' },
  { value: 'ethereal', label: 'Ethereal', desc: 'Otherworldly presence' },
  { value: 'armored', label: 'Armored', desc: 'Clad in heavy plate' },
  { value: 'ancient', label: 'Ancient', desc: 'Weathered by centuries' },
];

const LINEAGE_OPTIONS = [
  { value: 'exiled', label: 'Exiled', desc: 'Cast out from homeland' },
  { value: 'royal', label: 'Royal', desc: 'Blood of kings' },
  { value: 'cursed', label: 'Cursed', desc: 'Bearing a dark burden' },
  { value: 'orphaned', label: 'Orphaned', desc: 'Forged by loss' },
  { value: 'blessed', label: 'Blessed', desc: 'Touched by divinity' },
  { value: 'reborn', label: 'Reborn', desc: 'Returned from death' },
];

const CATEGORIES = [
  { key: 'element', label: 'Element', options: ELEMENT_OPTIONS },
  { key: 'build', label: 'Physique', options: BUILD_OPTIONS },
  { key: 'lineage', label: 'Lineage', options: LINEAGE_OPTIONS },
] as const;

export function WhisperWords({ onComplete }: WhisperWordsProps) {
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [customFate, setCustomFate] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  function handleSelect(category: string, value: string) {
    setSelections((prev) => {
      if (prev[category] === value) {
        const next = { ...prev };
        delete next[category];
        return next;
      }
      return { ...prev, [category]: value };
    });
  }

  function handleSubmit() {
    const words = Object.values(selections);
    if (useCustom && customFate.trim()) {
      words.push(...customFate.trim().split(/\s+/).slice(0, 3));
    }
    onComplete(words);
  }

  const hasSelections = Object.keys(selections).length > 0 || (useCustom && customFate.trim());

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Whisper Words</h2>
        <p className="text-ash text-sm italic">
          Shape your champion's destiny. Choose one from each, or write your own fate.
        </p>
      </div>

      {CATEGORIES.map(({ key, label, options }) => (
        <div key={key} className="space-y-2">
          <h3 className="font-fantasy text-sm font-bold text-bone/80 tracking-wide">{label}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {options.map((opt) => {
              const isSelected = selections[key] === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(key, opt.value)}
                  className={`rounded-lg p-2 text-center transition-all border ${
                    isSelected
                      ? 'border-gold/60 bg-gold/10 scale-105'
                      : 'border-slate-dark bg-obsidian hover:border-ash/40 hover:bg-obsidian/80'
                  }`}
                >
                  <span
                    className={`block text-xs font-bold font-fantasy ${
                      isSelected ? 'text-gold' : 'text-bone'
                    }`}
                  >
                    {opt.label}
                  </span>
                  <span className="block text-[9px] text-ash mt-0.5">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom fate option */}
      <div className="space-y-2">
        <button
          onClick={() => setUseCustom(!useCustom)}
          className={`font-fantasy text-sm font-bold tracking-wide transition-colors ${
            useCustom ? 'text-gold' : 'text-ash hover:text-bone'
          }`}
        >
          {useCustom ? '▾ Choose Your Own Fate' : '▸ Choose Your Own Fate'}
        </button>
        {useCustom && (
          <input
            type="text"
            value={customFate}
            onChange={(e) => setCustomFate(e.target.value)}
            placeholder="e.g. vengeful hollow king"
            maxLength={40}
            className="w-full px-4 py-2.5 rounded-lg bg-obsidian border border-slate-dark
              text-ivory placeholder:text-ash/40 font-fantasy text-center text-sm
              focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30
              transition-colors"
          />
        )}
      </div>

      <div className="flex justify-center gap-4 pt-2">
        <button
          onClick={() => onComplete([])}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash"
        >
          Skip
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hasSelections}
          className="px-6 py-2 rounded-lg font-fantasy text-sm font-bold transition-all
            bg-gradient-to-r from-patience to-speed text-ivory
            hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Forge the Card
        </button>
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import type { ModifierStack } from '../types/card';
import {
  MODIFIER_CATEGORIES,
  rollOptions,
  rollSurprise,
  type ModifierEntry,
} from '../data/modifierPools';

interface ModifierSelectorProps {
  onComplete: (modifiers: ModifierStack) => void;
}

const MAX_REROLLS = 2;

type CategoryKey = keyof ModifierStack;

export function ModifierSelector({ onComplete }: ModifierSelectorProps) {
  const [rolledOptions, setRolledOptions] = useState<Record<CategoryKey, ModifierEntry[]>>(() => {
    const initial: Record<string, ModifierEntry[]> = {};
    for (const cat of MODIFIER_CATEGORIES) {
      initial[cat.key] = rollOptions(cat.pool, 3);
    }
    return initial as Record<CategoryKey, ModifierEntry[]>;
  });

  const [selections, setSelections] = useState<Partial<Record<CategoryKey, string>>>({});
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS);

  const handleSelect = useCallback((key: CategoryKey, text: string) => {
    setSelections((prev) => {
      if (prev[key] === text) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: text };
    });
  }, []);

  const handleSurprise = useCallback((key: CategoryKey) => {
    const cat = MODIFIER_CATEGORIES.find((c) => c.key === key)!;
    const surprise = rollSurprise(cat.pool, rolledOptions[key]);
    setSelections((prev) => ({ ...prev, [key]: surprise.text }));
  }, [rolledOptions]);

  const handleSurpriseAll = useCallback(() => {
    const newSelections: Partial<Record<CategoryKey, string>> = {};
    for (const cat of MODIFIER_CATEGORIES) {
      const surprise = rollSurprise(cat.pool, rolledOptions[cat.key]);
      newSelections[cat.key] = surprise.text;
    }
    setSelections(newSelections);
  }, [rolledOptions]);

  const handleRerollAll = useCallback(() => {
    if (rerollsLeft <= 0) return;
    const newRolled: Record<string, ModifierEntry[]> = {};
    for (const cat of MODIFIER_CATEGORIES) {
      newRolled[cat.key] = rollOptions(cat.pool, 3);
    }
    setRolledOptions(newRolled as Record<CategoryKey, ModifierEntry[]>);
    setSelections({});
    setRerollsLeft((r) => r - 1);
  }, [rerollsLeft]);

  const handleSubmit = useCallback(() => {
    if (allSelected) {
      onComplete(selections as ModifierStack);
    }
  }, [selections, onComplete]);

  const allSelected = MODIFIER_CATEGORIES.every((cat) => selections[cat.key]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Portrait Modifiers</h2>
        <p className="text-ash text-sm italic">
          Shape how your champion appears. Choose one from each category, or let fate decide.
        </p>
      </div>

      {MODIFIER_CATEGORIES.map(({ key, label, description }) => {
        const options = rolledOptions[key];
        const selected = selections[key];
        const isCustomSurprise = selected && !options.some((o) => o.text === selected);

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-fantasy text-sm font-bold text-bone/80 tracking-wide">
                  {label}
                </h3>
                <p className="text-[10px] text-ash/60">{description}</p>
              </div>
              <button
                onClick={() => handleSurprise(key)}
                className="text-[10px] font-fantasy text-patience/70 hover:text-patience transition-colors"
              >
                Surprise me
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {options.map((opt) => {
                const isSelected = selected === opt.text;
                return (
                  <button
                    key={opt.text}
                    onClick={() => handleSelect(key, opt.text)}
                    className={`rounded-lg p-3 text-left transition-all border ${
                      isSelected
                        ? 'border-gold/60 bg-gold/10 scale-[1.02]'
                        : 'border-slate-dark bg-obsidian hover:border-ash/40 hover:bg-obsidian/80'
                    }`}
                  >
                    <span
                      className={`block text-xs leading-snug ${
                        isSelected ? 'text-gold font-bold' : 'text-bone/90'
                      }`}
                    >
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {isCustomSurprise && (
              <div className="rounded-lg p-3 border border-patience/40 bg-patience/5">
                <span className="block text-xs text-patience font-bold leading-snug">
                  {selected}
                </span>
                <span className="block text-[9px] text-patience/60 mt-1">Fate's choice</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={handleRerollAll}
          disabled={rerollsLeft <= 0}
          className="px-4 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-xs transition-colors border border-slate-dark hover:border-ash
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Re-roll All ({rerollsLeft})
        </button>
        <button
          onClick={handleSurpriseAll}
          className="px-4 py-2 rounded-lg font-fantasy text-xs transition-all
            bg-gradient-to-r from-patience/80 to-speed/80 text-ivory
            hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]"
        >
          Surprise Me All
        </button>
        <button
          onClick={handleSubmit}
          disabled={!allSelected}
          className="px-6 py-2 rounded-lg font-fantasy text-sm font-bold transition-all
            bg-gradient-to-r from-patience to-speed text-ivory
            hover:shadow-[0_0_15px_rgba(124,58,237,0.3)]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

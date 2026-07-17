import { useState } from 'react';
import type { ArchetypeName } from '../types/card';
import { ARCHETYPE_NAMES } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';
import { ARCHETYPE_EMBLEMS } from '../data/archetypeEmblems';
import { CLASS_AFFINITY } from '../data/powerSystem';
import type { StatName, BiasTier } from '../types/card';

interface ArchetypeSelectorProps {
  onSelect: (archetype: ArchetypeName) => void;
}

const BIAS_LABEL: Record<BiasTier, string> = {
  'Very Low': 'VL',
  'Low': 'L',
  'Mid': 'M',
  'Mid-High': 'MH',
  'High': 'H',
  'Very High': 'VH',
};

const STAT_COLORS: Record<StatName, string> = {
  Atk: '#dc2626',
  Def: '#2563eb',
  Mana: '#7c3aed',
  Tech: '#d97706',
};

export function ArchetypeSelector({ onSelect }: ArchetypeSelectorProps) {
  const [hoveredArchetype, setHoveredArchetype] = useState<ArchetypeName | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollingName, setRollingName] = useState<ArchetypeName | null>(null);

  function handleRandomArchetype() {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setRollingName(ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)]);
      count++;
      if (count > 12) {
        clearInterval(interval);
        const final = ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)];
        setRollingName(final);
        setIsRolling(false);
        setTimeout(() => onSelect(final), 400);
      }
    }, 80);
  }

  const previewArchetype = hoveredArchetype ?? rollingName;
  const previewAffinity = previewArchetype ? CLASS_AFFINITY[previewArchetype] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Choose Your Path</h2>
        <p className="text-ash text-sm">Select an archetype to shape your champion</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ARCHETYPE_NAMES.map((name) => {
          const arch = ARCHETYPES[name];
          const emblem = ARCHETYPE_EMBLEMS[name];
          const hasEmblem = emblem.assetPath !== null;
          return (
            <button
              key={name}
              onClick={() => { if (!isRolling) onSelect(name); }}
              onMouseEnter={() => setHoveredArchetype(name)}
              onMouseLeave={() => setHoveredArchetype(null)}
              disabled={isRolling}
              className="group relative rounded-lg p-2 text-center transition-all hover:scale-105 border disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${arch.palette.primary}33 0%, #12121a 100%)`,
                borderColor: '#2a2a3e',
              }}
            >
              {hasEmblem ? (
                <img
                  src={emblem.assetPath!}
                  alt={`${name} emblem`}
                  className="w-full aspect-square rounded-md mb-2 object-cover"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full aspect-square rounded-md mb-2 flex items-center justify-center text-2xl font-bold font-fantasy"
                  style={{
                    background: `${arch.palette.primary}44`,
                    color: arch.palette.accent,
                    border: `1px solid ${arch.palette.accent}44`,
                  }}
                >
                  {name.charAt(0)}
                </div>
              )}
              <h3 className="font-fantasy text-xs font-bold text-ivory truncate">{name}</h3>
              <p className="text-[9px] text-ash mt-0.5 line-clamp-2">{arch.identity}</p>
            </button>
          );
        })}
      </div>

      {/* Affinity preview on hover */}
      {previewArchetype && previewAffinity && (
        <div className="flex justify-center">
          <div className="bg-abyss/80 border border-slate-dark rounded-lg px-4 py-2 flex gap-4 text-xs">
            {(Object.entries(previewAffinity) as [StatName, BiasTier][]).map(([stat, bias]) => (
              <span key={stat} className="flex items-center gap-1">
                <span className="font-bold" style={{ color: STAT_COLORS[stat] }}>{stat}</span>
                <span className="text-ash">{BIAS_LABEL[bias]}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={handleRandomArchetype}
          disabled={isRolling}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash
            disabled:opacity-50"
        >
          {isRolling ? 'Rolling...' : 'Random Archetype'}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { ArchetypeName, Rank } from '../types/card';
import { ARCHETYPE_NAMES, RANKS } from '../types/card';
import { ARCHETYPES } from '../data/archetypes';

interface ArchetypeSelectorProps {
  onSelect: (archetype: ArchetypeName, rank: Rank) => void;
}

export function ArchetypeSelector({ onSelect }: ArchetypeSelectorProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<ArchetypeName | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  function handleRandomArchetype() {
    setIsRolling(true);
    let count = 0;
    const interval = setInterval(() => {
      setSelectedArchetype(ARCHETYPE_NAMES[Math.floor(Math.random() * ARCHETYPE_NAMES.length)]);
      count++;
      if (count > 12) {
        clearInterval(interval);
        setIsRolling(false);
      }
    }, 80);
  }

  function handleRankSelect(rank: Rank) {
    if (selectedArchetype) {
      onSelect(selectedArchetype, rank);
    }
  }

  function handleRandomRank() {
    if (!selectedArchetype) return;
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    onSelect(selectedArchetype, rank);
  }

  if (selectedArchetype && !isRolling) {
    const arch = ARCHETYPES[selectedArchetype];
    return (
      <div className="w-full max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <button
            onClick={() => setSelectedArchetype(null)}
            className="text-ash hover:text-ivory text-sm transition-colors"
          >
            &larr; Change archetype
          </button>
          <h2 className="font-fantasy text-2xl font-bold text-ivory">
            {selectedArchetype}
          </h2>
          <p className="text-ash text-sm">{arch.identity}</p>
        </div>

        <div className="text-center">
          <p className="font-fantasy text-lg text-bone mb-4">Choose Your Rank</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RANKS.map((rank) => {
            const intensity = rank === 'Ascendant' ? 1 : rank === 'Forged' ? 0.6 : 0.3;
            return (
              <button
                key={rank}
                onClick={() => handleRankSelect(rank)}
                className="group relative rounded-lg p-4 text-center transition-all hover:scale-105 border"
                style={{
                  background: `linear-gradient(180deg, ${arch.palette.primary}${Math.round(intensity * 40).toString(16).padStart(2, '0')} 0%, #12121a 100%)`,
                  borderColor: `${arch.palette.accent}${Math.round(intensity * 100).toString(16).padStart(2, '0')}`,
                  boxShadow: `0 0 ${intensity * 20}px ${arch.palette.accent}22`,
                }}
              >
                <h3
                  className="font-fantasy font-bold text-lg mb-1"
                  style={{
                    color: arch.palette.accent,
                    textShadow: rank === 'Ascendant' ? `0 0 8px ${arch.palette.accent}` : 'none',
                  }}
                >
                  {rank}
                </h3>
                <p className="text-xs text-ash">
                  {rank === 'Foundation' && 'The beginning. Raw potential, unrefined.'}
                  {rank === 'Forged' && 'Shaped by trial. Gaining power.'}
                  {rank === 'Ascendant' && 'Mastery achieved. Legendary presence.'}
                </p>
                <p className="text-[10px] text-ash/60 mt-2 italic">
                  {arch.rankProgression[rank]}
                </p>
              </button>
            );
          })}
        </div>

        <div className="text-center">
          <button
            onClick={handleRandomRank}
            className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
              font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash"
          >
            Random Rank
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Choose Your Path</h2>
        <p className="text-ash text-sm">Select an archetype to shape your champion</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {ARCHETYPE_NAMES.map((name) => {
          const arch = ARCHETYPES[name];
          const isSelected = selectedArchetype === name;
          return (
            <button
              key={name}
              onClick={() => { setIsRolling(false); setSelectedArchetype(name); }}
              className={`group relative rounded-lg p-3 text-center transition-all hover:scale-105 border ${
                isSelected ? 'ring-2 ring-gold scale-105' : ''
              }`}
              style={{
                background: `linear-gradient(180deg, ${arch.palette.primary}33 0%, #12121a 100%)`,
                borderColor: isSelected ? arch.palette.accent : '#2a2a3e',
              }}
            >
              <div
                className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold font-fantasy"
                style={{
                  background: `${arch.palette.primary}44`,
                  color: arch.palette.accent,
                  border: `1px solid ${arch.palette.accent}44`,
                }}
              >
                {name.charAt(0)}
              </div>
              <h3 className="font-fantasy text-xs font-bold text-ivory truncate">{name}</h3>
              <p className="text-[9px] text-ash mt-0.5 line-clamp-2">{arch.identity}</p>
            </button>
          );
        })}
      </div>

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

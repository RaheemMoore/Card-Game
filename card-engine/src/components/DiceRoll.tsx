import { useState, useEffect, useCallback } from 'react';
import type { CombatStats, Rank } from '../types/card';
import { generateCombatStats } from '../services/cardGenerator';

interface DiceRollProps {
  rank: Rank;
  onComplete: (stats: CombatStats, manaCost: number) => void;
}

const DICE_CONFIG = [
  { key: 'atk', label: 'ATK', color: '#dc2626', glow: 'rgba(220,38,38,0.6)', face: 'rgba(220,38,38,0.75)', edge: '#ef4444' },
  { key: 'def', label: 'DEF', color: '#2563eb', glow: 'rgba(37,99,235,0.6)', face: 'rgba(37,99,235,0.75)', edge: '#60a5fa' },
  { key: 'mana', label: 'MANA', color: '#7c3aed', glow: 'rgba(124,58,237,0.6)', face: 'rgba(124,58,237,0.75)', edge: '#a78bfa' },
] as const;

function GemDie({ value, config, rolling, landed, delay }: {
  value: number;
  config: typeof DICE_CONFIG[number];
  rolling: boolean;
  landed: boolean;
  delay: number;
}) {
  const size = 70;
  const half = size / 2;

  const faceStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: size,
    height: size,
    background: config.face,
    border: `2px solid ${config.edge}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
    textShadow: `0 0 10px ${config.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
    backdropFilter: 'blur(2px)',
    boxShadow: `inset 0 0 20px rgba(0,0,0,0.3), 0 0 8px ${config.glow}`,
    ...extra,
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{ width: size, height: size, perspective: '500px' }}
      >
        {/* Glow burst on land */}
        {landed && (
          <div
            className="absolute rounded-full"
            style={{
              inset: -16,
              background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
              animation: 'glow-pulse 0.6s ease-out forwards',
            }}
          />
        )}

        {/* 3D cube */}
        <div
          style={{
            width: size,
            height: size,
            position: 'relative',
            transformStyle: 'preserve-3d',
            animation: rolling
              ? `die-tumble 0.5s ease-in-out infinite`
              : landed
                ? 'die-land 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
                : 'none',
            transform: !rolling && !landed ? 'rotateX(-15deg) rotateY(20deg)' : undefined,
            animationDelay: rolling ? `${delay * 0.05}s` : '0s',
          }}
        >
          {/* Front */}
          <div style={faceStyle({ transform: `translateZ(${half}px)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
          {/* Back */}
          <div style={faceStyle({ transform: `translateZ(-${half}px) rotateY(180deg)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
          {/* Right */}
          <div style={faceStyle({ transform: `translateX(${half}px) rotateY(90deg)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
          {/* Left */}
          <div style={faceStyle({ transform: `translateX(-${half}px) rotateY(-90deg)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
          {/* Top */}
          <div style={faceStyle({ transform: `translateY(-${half}px) rotateX(90deg)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
          {/* Bottom */}
          <div style={faceStyle({ transform: `translateY(${half}px) rotateX(-90deg)` })}>
            <span className="tabular-nums">{value}</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <span
        className="font-fantasy text-sm font-bold tracking-wider transition-opacity duration-300"
        style={{ color: config.color, opacity: landed ? 1 : 0.5 }}
      >
        {config.label}
      </span>
    </div>
  );
}

export function DiceRoll({ rank, onComplete }: DiceRollProps) {
  const [result, setResult] = useState<{ stats: CombatStats; manaCost: number } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'done'>('idle');
  const [landed, setLanded] = useState({ atk: false, def: false, mana: false });
  const [cycleValues, setCycleValues] = useState({ atk: 1, def: 1, mana: 1 });

  const roll = useCallback(() => {
    const r = generateCombatStats(rank);
    setResult(r);
    setPhase('rolling');
    setLanded({ atk: false, def: false, mana: false });

    const cycleInterval = setInterval(() => {
      setCycleValues({
        atk: Math.ceil(Math.random() * 10),
        def: Math.ceil(Math.random() * 10),
        mana: Math.ceil(Math.random() * 8),
      });
    }, 80);

    setTimeout(() => setLanded((p) => ({ ...p, atk: true })), 900);
    setTimeout(() => setLanded((p) => ({ ...p, def: true })), 1400);
    setTimeout(() => {
      setLanded({ atk: true, def: true, mana: true });
      clearInterval(cycleInterval);
      setPhase('done');
    }, 1900);
  }, [rank]);

  useEffect(() => {
    roll();
  }, [roll]);

  const values = result
    ? {
        atk: landed.atk ? result.stats.atk : cycleValues.atk,
        def: landed.def ? result.stats.def : cycleValues.def,
        mana: landed.mana ? result.manaCost : cycleValues.mana,
      }
    : cycleValues;

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Roll the Bones</h2>
        <p className="text-ash text-sm">Your champion's power is being forged...</p>
      </div>

      <div className="flex justify-center gap-10">
        {DICE_CONFIG.map((config, i) => {
          const key = config.key;
          return (
            <GemDie
              key={key}
              value={values[key]}
              config={config}
              rolling={phase === 'rolling' && !landed[key]}
              landed={landed[key]}
              delay={i}
            />
          );
        })}
      </div>

      <div className="flex justify-center gap-4">
        <button
          onClick={roll}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash"
        >
          Reroll
        </button>
        {phase === 'done' && result && (
          <button
            onClick={() => onComplete(result.stats, result.manaCost)}
            className="px-6 py-2 rounded-lg font-fantasy text-sm font-bold transition-all
              bg-gradient-to-r from-power to-endurance text-ivory
              hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            Accept
          </button>
        )}
      </div>
    </div>
  );
}

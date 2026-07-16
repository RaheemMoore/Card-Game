import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ArchetypeName, CardStats, StatName } from '../types/card';
import { generateStats } from '../services/cardGenerator';
import { getStatNames, BIAS_RANGES, CLASS_AFFINITY } from '../data/powerSystem';
import * as wallet from '../services/economy/walletService';
import {
  GAMEPLAY_PRICE_CATALOG,
  FREE_REROLLS_PER_FORGE,
} from '../data/economy/gameplayPriceCatalog';
import { CurrencyCost } from './economy/CurrencyCost';
import { InsufficientFundsModal } from './economy/InsufficientFundsModal';
import { useBalance } from '../services/economy/useWallet';

const REROLL_COST = GAMEPLAY_PRICE_CATALOG.stat_reroll.gameplayCost;

interface DiceRollProps {
  archetype: ArchetypeName;
  onComplete: (stats: CardStats) => void;
}

const STAT_STYLES: Record<StatName, { label: string; color: string; glow: string; face: string; edge: string }> = {
  Atk:  { label: 'ATK',  color: '#dc2626', glow: 'rgba(220,38,38,0.6)',  face: 'rgba(220,38,38,0.75)',  edge: '#ef4444' },
  Def:  { label: 'DEF',  color: '#2563eb', glow: 'rgba(37,99,235,0.6)',  face: 'rgba(37,99,235,0.75)',  edge: '#60a5fa' },
  Mana: { label: 'MANA', color: '#7c3aed', glow: 'rgba(124,58,237,0.6)', face: 'rgba(124,58,237,0.75)', edge: '#a78bfa' },
  Tech: { label: 'TECH', color: '#d97706', glow: 'rgba(217,119,6,0.6)',   face: 'rgba(217,119,6,0.75)',  edge: '#fbbf24' },
};

function GemDie({ value, statName, rolling, landed, delay }: {
  value: number;
  statName: StatName;
  rolling: boolean;
  landed: boolean;
  delay: number;
}) {
  const config = STAT_STYLES[statName];
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
    fontSize: '20px',
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

        <div
          style={{
            width: size,
            height: size,
            position: 'relative',
            transformStyle: 'preserve-3d',
            animation: rolling
              ? `die-tumble 0.5s ease-in-out ${delay * 0.05}s infinite`
              : landed
                ? 'die-land 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards'
                : 'none',
            transform: !rolling && !landed ? 'rotateX(-15deg) rotateY(20deg)' : undefined,
          }}
        >
          {(['front', 'back', 'right', 'left', 'top', 'bottom'] as const).map((face) => {
            const transforms: Record<string, string> = {
              front: `translateZ(${half}px)`,
              back: `translateZ(-${half}px) rotateY(180deg)`,
              right: `translateX(${half}px) rotateY(90deg)`,
              left: `translateX(-${half}px) rotateY(-90deg)`,
              top: `translateY(-${half}px) rotateX(90deg)`,
              bottom: `translateY(${half}px) rotateX(-90deg)`,
            };
            return (
              <div key={face} style={faceStyle({ transform: transforms[face] })}>
                <span className="tabular-nums">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      <span
        className="font-fantasy text-sm font-bold tracking-wider transition-opacity duration-300"
        style={{ color: config.color, opacity: landed ? 1 : 0.5 }}
      >
        {config.label}
      </span>
    </div>
  );
}

export function DiceRoll({ archetype, onComplete }: DiceRollProps) {
  const statNames = useMemo(() => getStatNames(archetype), [archetype]);
  const affinity = CLASS_AFFINITY[archetype];

  const [result, setResult] = useState<CardStats | null>(null);
  const [phase, setPhase] = useState<'idle' | 'rolling' | 'done'>('idle');
  const [landed, setLanded] = useState<Record<StatName, boolean>>({ Atk: false, Def: false, Mana: false, Tech: false });
  const [cycleValues, setCycleValues] = useState<Record<StatName, number>>({ Atk: 30, Def: 30, Mana: 30, Tech: 30 });
  const [freeRerollsLeft, setFreeRerollsLeft] = useState(FREE_REROLLS_PER_FORGE);
  const [insufficientGold, setInsufficientGold] = useState(false);
  const goldBalance = useBalance('gameplay');

  const roll = useCallback(() => {
    const names = getStatNames(archetype);
    const aff = CLASS_AFFINITY[archetype];
    const stats = generateStats(archetype);
    setResult(stats);
    setPhase('rolling');
    setLanded({ Atk: false, Def: false, Mana: false, Tech: false });

    const cycleInterval = setInterval(() => {
      const newValues: Record<StatName, number> = { Atk: 30, Def: 30, Mana: 30, Tech: 30 };
      for (const name of names) {
        const bias = aff[name]!;
        const [min, max] = BIAS_RANGES[bias].foundation;
        newValues[name] = Math.floor(Math.random() * (max - min + 1)) + min;
      }
      setCycleValues(newValues);
    }, 80);

    const delays = [900, 1400, 1900];
    names.forEach((name, i) => {
      setTimeout(() => {
        setLanded((p) => ({ ...p, [name]: true }));
        if (i === names.length - 1) {
          clearInterval(cycleInterval);
          setPhase('done');
        }
      }, delays[i]);
    });
  }, [archetype]);

  useEffect(() => {
    roll();
  }, [roll]);

  function handleReroll() {
    if (phase === 'rolling') return;

    if (freeRerollsLeft > 0) {
      setFreeRerollsLeft((r) => r - 1);
      roll();
      return;
    }

    // Free reroll used; charge gameplay currency for the next.
    let reservation;
    try {
      reservation = wallet.reserve({
        currency: 'gameplay',
        amount: REROLL_COST,
        actionId: 'stat_reroll',
      });
    } catch (err) {
      if (err instanceof wallet.InsufficientFundsError) {
        setInsufficientGold(true);
        return;
      }
      throw err;
    }
    // Reroll is instant and local — no async failure surface, so commit
    // immediately. If we later add server-side reroll logic, wrap this in
    // try/refund the same way as forge/tier-up.
    wallet.commit(reservation.transactionId);
    roll();
  }

  const values: Record<StatName, number> = { Atk: 0, Def: 0, Mana: 0, Tech: 0 };
  for (const name of statNames) {
    if (result && landed[name]) {
      values[name] = result[name]!.value;
    } else {
      values[name] = cycleValues[name];
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="font-fantasy text-2xl font-bold text-ivory">Roll the Bones</h2>
        <p className="text-ash text-sm">Your champion's power is being forged...</p>
      </div>

      <div className="flex justify-center gap-10">
        {statNames.map((name, i) => (
          <GemDie
            key={name}
            value={values[name]}
            statName={name}
            rolling={phase === 'rolling' && !landed[name]}
            landed={landed[name]}
            delay={i}
          />
        ))}
      </div>

      {/* Stat ranges hint */}
      {phase === 'done' && result && (
        <div className="flex justify-center gap-4 text-[10px] text-ash/60">
          {statNames.map((name) => {
            const bias = affinity[name]!;
            const [min, max] = BIAS_RANGES[bias].foundation;
            return (
              <span key={name}>
                {name}: {min}–{max} ({bias})
              </span>
            );
          })}
        </div>
      )}

      <div className="flex justify-center items-center gap-4">
        <button
          onClick={handleReroll}
          disabled={phase === 'rolling' || (freeRerollsLeft <= 0 && goldBalance < REROLL_COST)}
          className="px-6 py-2 rounded-lg bg-slate-dark text-ash hover:text-ivory
            font-fantasy text-sm transition-colors border border-slate-dark hover:border-ash
            disabled:opacity-30 disabled:cursor-not-allowed
            flex items-center gap-2"
        >
          <span>Reroll</span>
          {freeRerollsLeft > 0 ? (
            <span className="text-[10px] text-gold/80">FREE</span>
          ) : (
            <CurrencyCost
              currency="gameplay"
              amount={REROLL_COST}
              insufficient={goldBalance < REROLL_COST}
            />
          )}
        </button>
        {phase === 'done' && result && (
          <button
            onClick={() => onComplete(result)}
            className="px-6 py-2 rounded-lg font-fantasy text-sm font-bold transition-all
              bg-gradient-to-r from-power to-endurance text-ivory
              hover:shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            Accept
          </button>
        )}
      </div>

      {insufficientGold && (
        <InsufficientFundsModal
          currency="gameplay"
          required={REROLL_COST}
          available={goldBalance}
          actionLabel="Rerolling the dice"
          onClose={() => setInsufficientGold(false)}
        />
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { CardRenderer } from '../../components/CardRenderer';
import { FloatingDamage } from './FloatingDamage';

interface Props {
  card: Card;
  combatant: HeroCombatant;
  isActing: boolean;
  laneIndex: number;
  currentBeat: AnimationBeat | null;
}

/**
 * One hero lane in the party row. Renders the live CardRenderer as the
 * source-of-truth visual (per Combat Wiki: "the card IS the hero") and
 * overlays HP / resource / ultimate bars below.
 *
 * Sizing note: uses thumbnail CardRenderer so three lanes fit side-by-side
 * even on narrow desktops. Acting hero gets a gold glow ring + slight
 * upward lift; other lanes shrink to ~85%. C9 handles mobile stacking.
 */
export function HeroLane({ card, combatant, isActing, laneIndex, currentBeat }: Props) {
  const hpPct = Math.max(0, combatant.hp / combatant.snapshot.maxHp);
  const [shakeKey, setShakeKey] = useState(0);
  const lastShakeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastShakeBeatId.current) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt' || e.targetActorId !== combatant.actorId) return;
    lastShakeBeatId.current = currentBeat.id;
    setShakeKey((n) => n + 1);
  }, [currentBeat, combatant.actorId]);
  const rPct =
    combatant.snapshot.maxResource === 0
      ? 0
      : combatant.resource / combatant.snapshot.maxResource;
  const uPct = Math.max(0, Math.min(1, combatant.ultimateCharge / 100));
  const shieldTotal = combatant.shields.reduce((sum, s) => sum + s.amount, 0);
  const isDefeated = combatant.defeated;

  const scaleClass = isActing ? 'scale-100 -translate-y-2' : 'scale-[0.85]';
  const glowStyle = isActing
    ? { boxShadow: '0 0 24px rgba(212, 175, 55, 0.35)' }
    : undefined;

  return (
    <div
      className={`flex flex-col items-center transition-transform duration-300 ease-out ${scaleClass}`}
      aria-label={`Lane ${laneIndex + 1}: ${combatant.snapshot.displayName}`}
    >
      <div key={shakeKey} className="relative rounded-2xl hero-lane-shake" style={glowStyle}>
        <div className={isDefeated ? 'opacity-40 grayscale' : ''}>
          <CardRenderer card={card} size="thumbnail" />
        </div>
        {isDefeated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-fantasy text-xs uppercase tracking-widest text-crimson bg-void/80 px-2 py-1 rounded">
              Defeated
            </span>
          </div>
        )}
        {isActing && !isDefeated && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-gold font-fantasy bg-void/80 px-2 py-0.5 rounded">
            Your turn
          </div>
        )}
        <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
      </div>
      <style>{`
        @keyframes hero-lane-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-3px, 1px); filter: brightness(1.5); }
          30%  { transform: translate(3px, -1px); filter: brightness(1.5); }
          45%  { transform: translate(-2px, 0); }
          60%  { transform: translate(2px, 0); }
          75%  { transform: translate(-1px, 1px); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        .hero-lane-shake { animation: hero-lane-shake 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .hero-lane-shake { animation: none !important; }
        }
      `}</style>

      <div className="w-full max-w-[160px] mt-2 space-y-1">
        <MiniBar
          label="HP"
          value={combatant.hp}
          max={combatant.snapshot.maxHp}
          pct={hpPct}
          color="from-emerald-400 to-emerald-700"
        />
        <MiniBar
          label={combatant.snapshot.resourceType === 'mana' ? 'MP' : 'TP'}
          value={combatant.resource}
          max={combatant.snapshot.maxResource}
          pct={rPct}
          color="from-sky-400 to-sky-700"
        />
        <MiniBar
          label="ULT"
          value={combatant.ultimateCharge}
          max={100}
          pct={uPct}
          color="from-amber-400 to-amber-700"
        />
        {shieldTotal > 0 && (
          <div className="text-[10px] text-bone/70 text-center">🛡 {shieldTotal}</div>
        )}
      </div>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
  pct,
  color,
}: {
  label: string;
  value: number;
  max: number;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[9px] text-bone/60 leading-tight">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-void/80 overflow-hidden border border-bone/20">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
      </div>
    </div>
  );
}

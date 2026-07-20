import { useEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { CardRenderer } from '../../components/CardRenderer';
import { getHeroSprite } from '../../data/combat/heroSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { FloatingDamage } from './FloatingDamage';

interface Props {
  heroes: HeroCombatant[];
  partyCards: Card[];
  actingActorId: string;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
}

/**
 * Bottom-anchored hero foreground. Three fixed lanes. NO visible lane
 * panels — the CardRenderer IS the visual for each hero. Sprites peek
 * from behind the card top; a compact HP/resource strip lives under the
 * card. Selected/acting card rises; idle cards lower.
 */
export function HeroForeground({
  heroes,
  partyCards,
  actingActorId,
  canAct,
  currentBeat,
}: Props) {
  return (
    <div
      className="absolute left-0 right-0 flex justify-center items-end gap-3 sm:gap-6 px-4 pointer-events-none"
      style={{ zIndex: 20, bottom: '13rem' }}
    >
      {heroes.map((combatant, i) => {
        const card = partyCards[i];
        if (!card) return null;
        return (
          <HeroLaneCard
            key={combatant.actorId}
            card={card}
            combatant={combatant}
            isActing={canAct && combatant.actorId === actingActorId}
            currentBeat={currentBeat}
          />
        );
      })}
    </div>
  );
}

function HeroLaneCard({
  card,
  combatant,
  isActing,
  currentBeat,
}: {
  card: Card;
  combatant: HeroCombatant;
  isActing: boolean;
  currentBeat: AnimationBeat | null;
}) {
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

  const hpPct = Math.max(0, combatant.hp / combatant.snapshot.maxHp);
  const rPct =
    combatant.snapshot.maxResource === 0
      ? 0
      : combatant.resource / combatant.snapshot.maxResource;
  const uPct = Math.max(0, Math.min(1, combatant.ultimateCharge / 100));
  const isDefeated = combatant.defeated;

  const spriteAsset = getHeroSprite(combatant.snapshot.archetype);
  const spriteUrl = spriteAsset ? resolveCombatAssetUrl(spriteAsset) : null;

  // Idle cards partially lowered; selected rises. All motion vertical only.
  const liftClass = isActing ? '-translate-y-6' : 'translate-y-6';
  const scaleClass = isActing ? 'scale-100' : 'scale-[0.92]';
  const opacityClass = isDefeated ? 'opacity-40 grayscale' : 'opacity-100';

  return (
    <div
      className={`hero-lane relative flex flex-col items-center transition-transform duration-300 ease-out pointer-events-auto ${liftClass} ${scaleClass} ${opacityClass}`}
      aria-label={`${combatant.snapshot.displayName}, ${combatant.hp} of ${combatant.snapshot.maxHp} HP`}
    >
      {/* Hero sprite — peeks BEHIND the card top */}
      {spriteUrl && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: 'calc(100% - 42px)',
            width: 'min(110px, 12vw)',
            height: 'min(150px, 16vh)',
            filter: 'drop-shadow(0 8px 6px rgba(0,0,0,0.45))',
            zIndex: -1,
          }}
        >
          <img
            src={spriteUrl}
            alt=""
            aria-hidden
            className="w-full h-full object-contain object-bottom"
            draggable={false}
          />
        </div>
      )}

      {/* Card — the visual */}
      <div key={shakeKey} className="relative hero-lane-shake">
        <CardRenderer card={card} size="thumbnail" />
        {isActing && !isDefeated && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-gold font-fantasy bg-void/85 px-2 py-0.5 rounded shadow-lg">
            Your turn
          </div>
        )}
        {isDefeated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-fantasy text-xs uppercase tracking-widest text-crimson bg-void/90 px-2 py-1 rounded">
              Defeated
            </span>
          </div>
        )}
        <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
      </div>

      {/* Compact HP / resource / ult strip — small, sits under the card, does NOT feel like a dashboard */}
      <div className="mt-1.5 w-full max-w-[140px] text-[9px] leading-tight">
        <StripBar label="HP" value={combatant.hp} max={combatant.snapshot.maxHp} pct={hpPct} color="from-emerald-400 to-emerald-600" />
        <StripBar
          label={combatant.snapshot.resourceType === 'mana' ? 'MP' : 'TP'}
          value={combatant.resource}
          max={combatant.snapshot.maxResource}
          pct={rPct}
          color="from-sky-400 to-sky-600"
        />
        {/* Ult as diamond pips */}
        <div className="flex items-center justify-center gap-0.5 mt-0.5">
          {[0.25, 0.5, 0.75, 1.0].map((threshold, idx) => (
            <span
              key={idx}
              aria-hidden
              className="inline-block w-2 h-2 rotate-45 rounded-[1px]"
              style={{
                background:
                  uPct >= threshold
                    ? 'linear-gradient(180deg, #ffe28a, #b8860b)'
                    : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes hero-lane-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-3px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(3px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-2px, 0); }
          60%  { transform: translate(2px, 0); }
          100% { transform: translate(0, 0); filter: brightness(1); }
        }
        .hero-lane-shake { animation: hero-lane-shake 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .hero-lane-shake { animation: none !important; }
          .hero-lane { transition: none !important; }
        }
      `}</style>
    </div>
  );
}

function StripBar({
  label,
  value,
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
    <div className="flex items-center gap-1">
      <span className="text-bone/60 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-void/85 overflow-hidden border border-bone/15">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
      </div>
      <span className="tabular-nums text-bone/70 text-right" style={{ minWidth: '3ch' }}>
        {value}
      </span>
    </div>
  );
}

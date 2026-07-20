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
  onSelectActor: (actorId: string) => void;
}

/**
 * Bottom-anchored hero foreground. Three INDEPENDENT lanes rendered via
 * CSS grid (1fr/1fr/1fr) so each lane sits at a stable horizontal anchor
 * regardless of card size or selection state — cards do not compress into
 * one centered cluster.
 *
 * Each lane hangs from the top of the command shelf: idle cards drop a bit
 * (so their bottom edge tucks slightly into the shelf), the selected card
 * rises and scales up for clear focus contrast. Sprite + card + strip move
 * as one coordinated unit.
 */
export function HeroForeground({
  heroes,
  partyCards,
  actingActorId,
  canAct,
  currentBeat,
  onSelectActor,
}: Props) {
  return (
    <div
      className="absolute left-0 right-0 grid items-end px-6 sm:px-10 lg:px-16 pointer-events-none"
      style={{
        zIndex: 20,
        bottom: '10rem',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 0,
      }}
    >
      {heroes.map((combatant, i) => {
        const card = partyCards[i];
        if (!card) return <div key={combatant.actorId} />;
        return (
          <HeroLaneCard
            key={combatant.actorId}
            card={card}
            combatant={combatant}
            isActing={canAct && combatant.actorId === actingActorId}
            canAct={canAct}
            currentBeat={currentBeat}
            onSelect={() => onSelectActor(combatant.actorId)}
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
  canAct,
  currentBeat,
  onSelect,
}: {
  card: Card;
  combatant: HeroCombatant;
  isActing: boolean;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  onSelect: () => void;
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

  // Selection contrast: acting card rises + scales up + brightens; idle
  // cards drop lower and dim so the eye lands on the selected lane.
  const laneTransform = isActing
    ? 'translate-y-0 scale-100'
    : 'translate-y-8 scale-[0.88]';
  const laneOpacity = isDefeated
    ? 'opacity-40 grayscale'
    : isActing
    ? 'opacity-100'
    : 'opacity-80';

  const tappable = canAct && !isActing && !isDefeated;
  return (
    <div
      className={`hero-lane relative flex flex-col items-center justify-end transition-all duration-300 ease-out pointer-events-auto ${laneTransform} ${laneOpacity} ${tappable ? 'cursor-pointer' : ''}`}
      aria-label={`${combatant.snapshot.displayName}, ${combatant.hp} of ${combatant.snapshot.maxHp} HP${tappable ? ' — tap to act next' : ''}`}
      onClick={tappable ? onSelect : undefined}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onKeyDown={
        tappable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      {/* Hero sprite — subordinate: peeks behind card top */}
      {spriteUrl && !isDefeated && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: 'calc(100% - 28px)',
            width: 'clamp(52px, 5.5vw, 80px)',
            height: 'clamp(68px, 7vw, 104px)',
            filter: `drop-shadow(0 6px 4px rgba(0,0,0,0.7)) brightness(${
              isActing ? '0.95' : '0.75'
            }) saturate(${isActing ? '1' : '0.75'})`,
            opacity: isActing ? 0.9 : 0.55,
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

      {/* Card frame */}
      <div
        key={shakeKey}
        className="relative hero-lane-shake"
        style={{
          filter: isActing
            ? 'drop-shadow(0 14px 26px rgba(0,0,0,0.9)) drop-shadow(0 0 26px rgba(212,175,55,0.55))'
            : 'drop-shadow(0 10px 14px rgba(0,0,0,0.7))',
          maxWidth: 'clamp(160px, 15vw, 220px)',
        }}
      >
        <CardRenderer card={card} size="full" />
        {isDefeated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="font-fantasy text-xs uppercase tracking-widest text-crimson bg-void/90 px-3 py-1 rounded">
              Defeated
            </span>
          </div>
        )}
        <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
      </div>

      {/* Compact stat strip — hangs from the card bottom */}
      <div className="mt-1 w-full max-w-[190px] text-[9px] leading-tight px-1">
        <StripBar label="HP" value={combatant.hp} pct={hpPct} color="from-emerald-400 to-emerald-600" />
        <StripBar
          label={combatant.snapshot.resourceType === 'mana' ? 'MP' : 'TP'}
          value={combatant.resource}
          pct={rPct}
          color="from-sky-400 to-sky-600"
        />
        <div
          className="flex items-center justify-center gap-0.5 mt-0.5"
          aria-label={`Ultimate charge ${Math.round(uPct * 100)}%`}
        >
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
          100% { transform: translate(0, 0); }
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
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-bone/60 w-6 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-void/90 overflow-hidden border border-bone/20">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
      </div>
      <span className="tabular-nums text-bone/80 text-right" style={{ minWidth: '3ch' }}>
        {value}
      </span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { CardRenderer } from '../../components/CardRenderer';
import { getHeroSprite } from '../../data/combat/heroSpriteManifest';
import { resolveCombatAssetUrl } from '../../data/combat/types';
import { FloatingDamage } from './FloatingDamage';

interface TargetPickMode {
  pickableActorIds: string[];
  onPick: (actorId: string) => void;
}

interface Props {
  heroes: HeroCombatant[];
  partyCards: Card[];
  actingActorId: string;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  onSelectActor: (actorId: string) => void;
  /** When set, tapping a pickable ally lane picks an ability target instead
   *  of reordering turn order — the two "tap a hero" behaviors never
   *  overlap since only one is ever active at a time. */
  targetPickMode?: TargetPickMode | null;
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
  targetPickMode = null,
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
        const pickable = targetPickMode ? targetPickMode.pickableActorIds.includes(combatant.actorId) : false;
        return (
          <HeroLaneCard
            key={combatant.actorId}
            card={card}
            combatant={combatant}
            isActing={canAct && combatant.actorId === actingActorId}
            canAct={canAct}
            currentBeat={currentBeat}
            onSelect={() => onSelectActor(combatant.actorId)}
            picking={targetPickMode ? { pickable, onPick: () => targetPickMode.onPick(combatant.actorId) } : null}
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
  picking,
}: {
  card: Card;
  combatant: HeroCombatant;
  isActing: boolean;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  onSelect: () => void;
  /** Non-null while an ability's target picker is active; `pickable`
   *  gates whether THIS lane can be tapped to pick. */
  picking: { pickable: boolean; onPick: () => void } | null;
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

  // HP bar flashes green on a heal; resource bar flashes cyan on gain / amber
  // on spend — same beat-watching pattern as the shake above, just a second
  // independent tracker so a heal and a hit in the same beat don't collide.
  const [hpFlash, setHpFlash] = useState<{ key: number; color: string } | null>(null);
  const lastHpFlashBeatId = useRef<string | null>(null);
  const [resFlash, setResFlash] = useState<{ key: number; color: string } | null>(null);
  const lastResFlashBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    const e = currentBeat.event;
    if (
      e.kind === 'healing_applied' &&
      e.targetActorId === combatant.actorId &&
      currentBeat.id !== lastHpFlashBeatId.current
    ) {
      lastHpFlashBeatId.current = currentBeat.id;
      setHpFlash((cur) => ({ key: (cur?.key ?? 0) + 1, color: '#7dfca0' }));
    }
    if (
      e.kind === 'resource_changed' &&
      e.actorId === combatant.actorId &&
      currentBeat.id !== lastResFlashBeatId.current
    ) {
      lastResFlashBeatId.current = currentBeat.id;
      setResFlash((cur) => ({ key: (cur?.key ?? 0) + 1, color: e.delta > 0 ? '#bfe8ff' : '#ff9d4a' }));
    }
  }, [currentBeat, combatant.actorId]);

  const hpPct = Math.max(0, combatant.hp / combatant.snapshot.maxHp);
  const hpCritical = !combatant.defeated && hpPct <= 0.25;
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

  const tappable = picking ? picking.pickable : canAct && !isActing && !isDefeated;
  const handleTap = picking ? picking.onPick : onSelect;
  const ariaHint = picking
    ? picking.pickable
      ? ' — tap to target this ally'
      : ''
    : tappable
    ? ' — tap to act next'
    : '';
  return (
    <div
      className={`hero-lane relative flex flex-col items-center justify-end transition-all duration-300 ease-out pointer-events-auto ${laneTransform} ${laneOpacity} ${tappable ? 'cursor-pointer' : ''} ${picking?.pickable ? 'hero-lane-pickable' : ''}`}
      aria-label={`${combatant.snapshot.displayName}, ${combatant.hp} of ${combatant.snapshot.maxHp} HP${ariaHint}`}
      onClick={tappable ? handleTap : undefined}
      role={tappable ? 'button' : undefined}
      tabIndex={tappable ? 0 : undefined}
      onKeyDown={
        tappable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTap();
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
        className={`relative hero-lane-shake ${picking?.pickable ? 'hero-lane-target-reticle' : ''}`}
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

      {/* Stat strip — hangs from the card bottom. Bumped up from the original
          9px/6px-bar treatment: HP/resource are critical resources, they need
          to read at a glance, not on close inspection. */}
      <div className="mt-1.5 w-full max-w-[190px] text-[11px] leading-tight px-1">
        <StripBar
          label="HP"
          value={combatant.hp}
          pct={hpPct}
          color="from-emerald-400 to-emerald-600"
          critical={hpCritical}
          flash={hpFlash}
        />
        <StripBar
          label={combatant.snapshot.resourceType === 'mana' ? 'MP' : 'TP'}
          value={combatant.resource}
          pct={rPct}
          color="from-sky-400 to-sky-600"
          flash={resFlash}
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

      {/* Dock tab — a short gold-accented connector bridging the lane down
          into the command shelf's top edge (they sit flush already; this
          gives that seam a visible, deliberate "the card sits on this
          shelf" relationship instead of two layers just happening to touch).
          Wider/brighter for the acting lane, a quieter sliver for idle ones
          so the connection still reads for all three without competing with
          the acting card. */}
      <div
        aria-hidden
        className="mt-1"
        style={{
          width: isActing ? 46 : 22,
          height: 7,
          margin: '4px auto 0',
          background: isActing
            ? 'linear-gradient(180deg, #eb962e, #a8651f)'
            : 'linear-gradient(180deg, rgba(168,101,31,0.55), rgba(120,70,20,0.4))',
          borderRadius: '3px 3px 0 0',
          boxShadow: isActing ? '0 0 8px rgba(235,150,46,0.45)' : 'none',
          transition: 'width 300ms ease-out, background 300ms',
        }}
      />

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

        /* Target-picker affordance — a distinct gold pulsing ring so "pick an
           ability target" never looks like the plain turn-reorder tap-hint. */
        @keyframes hero-lane-target-pulse {
          0%, 100% { box-shadow: 0 0 0 2px #eb962e, 0 0 18px 4px rgba(235,150,46,0.55); }
          50%      { box-shadow: 0 0 0 3px #ffcc63, 0 0 26px 8px rgba(235,150,46,0.75); }
        }
        .hero-lane-target-reticle {
          border-radius: 10px;
          animation: hero-lane-shake 0.35s ease-out, hero-lane-target-pulse 1.1s ease-in-out infinite;
        }

        /* Critical HP — a hero at or below 25% HP gets an unmissable pulsing
           red glow on their HP bar so they can't quietly die unnoticed. */
        @keyframes strip-bar-critical-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(220,38,38,0.6), 0 0 6px 1px rgba(220,38,38,0.5); }
          50%      { box-shadow: 0 0 0 1.5px rgba(255,90,90,0.9), 0 0 12px 3px rgba(220,38,38,0.8); }
        }
        .strip-bar-critical { animation: strip-bar-critical-pulse 1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .hero-lane-shake { animation: none !important; }
          .hero-lane { transition: none !important; }
          .hero-lane-target-reticle {
            animation: none !important;
            box-shadow: 0 0 0 3px #eb962e;
          }
          .strip-bar-critical {
            animation: none !important;
            box-shadow: 0 0 0 1.5px rgba(220,38,38,0.9);
          }
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
  critical = false,
  flash = null,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
  /** Red pulsing treatment — HP at or below 25%, so a hero can't quietly bleed out unnoticed. */
  critical?: boolean;
  /** Recolored `.fs-flash` pulse on the moment this value changes (heal / resource gain-or-spend). */
  flash?: { key: number; color: string } | null;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-0.5">
      <span className="text-bone/70 font-bold w-7 shrink-0">{label}</span>
      <div
        className={`relative flex-1 h-3 rounded-full bg-void/90 overflow-hidden border ${
          critical ? 'border-crimson' : 'border-bone/20'
        } ${critical ? 'strip-bar-critical' : ''}`}
      >
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
        {flash && (
          <div
            key={flash.key}
            aria-hidden
            className="absolute inset-0 fs-flash"
            style={{ background: flash.color }}
          />
        )}
      </div>
      <span className="tabular-nums text-bone/90 font-semibold text-right" style={{ minWidth: '3.5ch' }}>
        {value}
      </span>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { CardRenderer } from '../../components/CardRenderer';
import { useViewportWidth, clampNum } from './useViewportWidth';

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
  onOpenCard: (card: Card, combatant: HeroCombatant) => void;
  targetPickMode?: TargetPickMode | null;
}

/** Native CardRenderer("full") dimensions — the scale wrapper below shrinks
 *  from this so every percentage-positioned child inside the card scales
 *  together instead of drifting (a plain fixed-width thumbnail render would
 *  need its own layout math per size). */
const NATIVE_W = 326;
const NATIVE_H = 470;

/** Rendered card width in the dock, fluid so the shelf never overlaps below
 *  desktop widths — big enough to read as a real card, small enough that
 *  three fit fanned in the reserved shelf width. Ceiling (168) matches the
 *  original fixed-size desktop look exactly; only the floor shrinks it for
 *  narrower viewports. A CSS `clamp()` string can't drive this because it
 *  also feeds a numeric `transform: scale()` below — hence the JS `clampNum`
 *  helper and the shared `useViewportWidth()` hook (same idiom `useIsMobileCombatLayout`
 *  already uses in `CombatViewport.tsx`). */
function cardWidth(viewportWidth: number): number {
  return clampNum(96, 0.115, 168, viewportWidth);
}
/** Fan overlap, kept at the same ~0.357 ratio to card width as the original
 *  fixed 60/168 so the fan's proportions don't change shape as it shrinks. */
function cardOverlap(viewportWidth: number): number {
  return clampNum(34, 0.041, 60, viewportWidth);
}

/** Horizontal space CombatScene reserves so the ability bar / controls never
 *  sit under the (absolutely-positioned) fanned cards. MUST be called with
 *  the same `viewportWidth` PartyDock itself uses — CombatScene and
 *  PartyDock sharing this one function is what keeps the reserved spacer
 *  and the dock's actual rendered width in sync; if they ever compute this
 *  independently, the ability bar will slide back under the dock. */
export function computePartyDockWidth(viewportWidth: number): number {
  const w = cardWidth(viewportWidth);
  const overlap = cardOverlap(viewportWidth);
  return Math.round(3 * w - 2 * overlap) + 36;
}

/** Hero-sprite lane center-points, as a percentage of the full arena width
 *  (the arena is full-viewport, so `viewportWidth` doubles as the arena's
 *  own width). The sprites live entirely to the right of the reserved dock
 *  width so they never sit behind/overlap the fanned mini-cards — the
 *  lanes fill the open floor space to the right of the dock, not the whole
 *  arena width. `AttackVFX.tsx`'s beam anchors MUST call this same
 *  function (with the same `viewportWidth`) rather than hardcoding their
 *  own percentages, or the bolts will drift off the sprites the moment
 *  either side changes independently. */
export function computeHeroLaneXPercents(viewportWidth: number): [number, number, number] {
  const dockRight = computePartyDockWidth(viewportWidth) + 16; // dock + a small gutter
  const rightGutter = 16;
  const regionLeft = dockRight;
  const regionRight = viewportWidth - rightGutter;
  const regionWidth = Math.max(0, regionRight - regionLeft);
  const centers = [regionLeft + regionWidth / 6, regionLeft + (regionWidth * 3) / 6, regionLeft + (regionWidth * 5) / 6];
  return centers.map((px) => (px / viewportWidth) * 100) as [number, number, number];
}

/**
 * Docked party — real cards (fanned, overlapped) anchored to the left of
 * the command shelf. Positioned absolutely so the card art can rise above
 * the shelf's own top edge into the arena, like a hand of cards peeking up
 * from behind the frame — only the HP/MP/ultimate readout row underneath
 * stays fully inside the (short) shelf band.
 */
export function PartyDock({
  heroes,
  partyCards,
  actingActorId,
  canAct,
  currentBeat,
  onSelectActor,
  onOpenCard,
  targetPickMode = null,
}: Props) {
  const rovingRef = useRef<HTMLDivElement>(null);
  const viewportWidth = useViewportWidth();
  const cardW = cardWidth(viewportWidth);
  const cardH = Math.round((cardW / NATIVE_W) * NATIVE_H);
  const cardScale = cardW / NATIVE_W;
  const overlap = cardOverlap(viewportWidth);
  const dockWidth = computePartyDockWidth(viewportWidth);

  return (
    <div
      ref={rovingRef}
      role="group"
      aria-label="Party"
      className="absolute flex flex-col justify-end"
      style={{ left: 24, bottom: 14, zIndex: 20, width: dockWidth - 24 }}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const buttons = Array.from(
          rovingRef.current?.querySelectorAll<HTMLElement>('[data-dock-card]') ?? [],
        );
        const idx = buttons.findIndex((b) => b === document.activeElement);
        if (idx === -1) return;
        e.preventDefault();
        const next = e.key === 'ArrowRight' ? Math.min(idx + 1, buttons.length - 1) : Math.max(idx - 1, 0);
        buttons[next]?.focus();
      }}
    >
      {/* Row 1 — fanned card art. Overlap is purely visual (a hand of
          cards); it rises above the shelf's top edge on purpose. */}
      <div className="flex items-end">
        {heroes.map((combatant, i) => {
          const card = partyCards[i];
          if (!card) return null;
          const pickable = targetPickMode ? targetPickMode.pickableActorIds.includes(combatant.actorId) : false;
          const isActing = canAct && combatant.actorId === actingActorId;
          const tilt = i === 0 ? -6 : i === 1 ? 0 : 6;
          return (
            <div
              key={combatant.actorId}
              style={{
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: isActing ? 10 : i,
                transform: isActing ? 'translateY(-14px) rotate(0deg)' : `translateY(0) rotate(${tilt}deg)`,
                transition: 'transform 250ms ease-out',
              }}
            >
              <DockCardVisual
                cardW={cardW}
                cardH={cardH}
                cardScale={cardScale}
                card={card}
                combatant={combatant}
                isActing={isActing}
                canAct={canAct}
                currentBeat={currentBeat}
                pickable={pickable}
                onSelect={() => onSelectActor(combatant.actorId)}
                onPick={targetPickMode ? () => targetPickMode.onPick(combatant.actorId) : null}
                onOpen={() => onOpenCard(card, combatant)}
              />
            </div>
          );
        })}
      </div>

      {/* Row 2 — HP/MP/ultimate readout, one column per hero, evenly
          spaced with no overlap so every number reads at a glance. This is
          the part that must stay fully inside the shelf's shorter band. */}
      <div className="flex justify-center" style={{ gap: 6, marginTop: 4 }}>
        {heroes.map((combatant, i) => {
          if (!partyCards[i]) return null;
          return <DockStats key={combatant.actorId} combatant={combatant} currentBeat={currentBeat} />;
        })}
      </div>
    </div>
  );
}

function DockCardVisual({
  card,
  combatant,
  isActing,
  canAct,
  currentBeat,
  pickable,
  onSelect,
  onPick,
  onOpen,
  cardW,
  cardH,
  cardScale,
}: {
  card: Card;
  combatant: HeroCombatant;
  isActing: boolean;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  pickable: boolean;
  onSelect: () => void;
  onPick: (() => void) | null;
  onOpen: () => void;
  cardW: number;
  cardH: number;
  cardScale: number;
}) {
  const isDefeated = combatant.defeated;
  const picking = onPick !== null;
  const tappable = picking ? pickable : canAct && !isActing && !isDefeated;
  const handleTap = picking ? onPick! : onSelect;

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

  const ariaLabel = `${combatant.snapshot.displayName}, ${combatant.hp} of ${combatant.snapshot.maxHp} HP${
    isActing ? ', acting' : ''
  }${pickable ? ' — press Enter to target, or Space' : ' — press Enter to view card'}`;

  return (
    <div
      data-dock-card
      key={shakeKey}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={`relative dock-card-shake ${tappable ? 'cursor-pointer' : ''} ${pickable ? 'dock-card-target-reticle' : ''}`}
      style={{
        width: cardW,
        height: cardH,
        filter: isActing
          ? 'drop-shadow(0 10px 18px rgba(0,0,0,0.85)) drop-shadow(0 0 16px rgba(212,175,55,0.55))'
          : 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))',
        opacity: isDefeated ? 0.45 : 1,
      }}
      onClick={() => {
        if (tappable) handleTap();
        else onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (tappable) handleTap();
          else onOpen();
        } else if (e.key === ' ' && tappable) {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      <div style={{ width: NATIVE_W, height: NATIVE_H, transform: `scale(${cardScale})`, transformOrigin: 'top left' }}>
        <CardRenderer card={card} size="full" />
      </div>
      {isDefeated && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-fantasy uppercase tracking-widest text-crimson bg-void/90 px-2 py-0.5 rounded text-xs">
            Fallen
          </span>
        </div>
      )}
      {isActing && (
        <span
          aria-hidden
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-gold"
          style={{ fontSize: 16, textShadow: '0 0 6px rgba(212,175,55,0.8)' }}
        >
          ▶
        </span>
      )}
      <button
        type="button"
        aria-label={`View ${combatant.snapshot.displayName}'s card`}
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        className="absolute top-1 right-1 flex items-center justify-center rounded-sm bg-void/70 hover:bg-void/90 text-bone/80 hover:text-gold transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-gold"
        style={{ width: 20, height: 20, fontSize: 11, lineHeight: 1 }}
      >
        ⤢
      </button>

      <style>{`
        @keyframes dock-card-hit-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-4px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(4px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-3px, 0); }
          60%  { transform: translate(3px, 0); }
          100% { transform: translate(0, 0); }
        }
        .dock-card-shake { animation: dock-card-hit-shake 0.35s ease-out; }

        @keyframes dock-card-target-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(235,150,46,0.6)); }
          50%      { filter: drop-shadow(0 0 16px rgba(235,150,46,0.9)); }
        }
        .dock-card-target-reticle { animation: dock-card-target-pulse 1.1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .dock-card-shake { animation: none !important; }
          .dock-card-target-reticle { animation: none !important; filter: drop-shadow(0 0 12px rgba(235,150,46,0.8)) !important; }
        }
      `}</style>
    </div>
  );
}

function DockStats({ combatant, currentBeat }: { combatant: HeroCombatant; currentBeat: AnimationBeat | null }) {
  const isDefeated = combatant.defeated;

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
  const hpCritical = !isDefeated && hpPct <= 0.25;
  const rPct =
    combatant.snapshot.maxResource === 0 ? 0 : combatant.resource / combatant.snapshot.maxResource;
  const uPct = Math.max(0, Math.min(1, combatant.ultimateCharge / 100));

  return (
    <div className="text-[9px] leading-tight" style={{ width: 108 }}>
      <DockBar
        label="HP"
        value={combatant.hp}
        pct={hpPct}
        color="from-emerald-400 to-emerald-600"
        critical={hpCritical}
        flash={hpFlash}
      />
      <DockBar
        label={combatant.snapshot.resourceType === 'mana' ? 'MP' : 'TP'}
        value={combatant.resource}
        pct={rPct}
        color="from-sky-400 to-sky-600"
        flash={resFlash}
      />
      <div className="flex items-center justify-center gap-0.5 mt-0.5" aria-label={`Ultimate charge ${Math.round(uPct * 100)}%`}>
        {[0.25, 0.5, 0.75, 1.0].map((threshold, idx) => (
          <span
            key={idx}
            aria-hidden
            className="inline-block rounded-[1px] rotate-45"
            style={{
              width: 6,
              height: 6,
              background: uPct >= threshold ? 'linear-gradient(180deg, #ffe28a, #b8860b)' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes dock-bar-critical-pulse {
          0%, 100% { box-shadow: 0 0 0 1px rgba(220,38,38,0.6), 0 0 5px 1px rgba(220,38,38,0.5); }
          50%      { box-shadow: 0 0 0 1.5px rgba(255,90,90,0.9), 0 0 10px 2px rgba(220,38,38,0.8); }
        }
        .dock-bar-critical { animation: dock-bar-critical-pulse 1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .dock-bar-critical { animation: none !important; box-shadow: 0 0 0 1.5px rgba(220,38,38,0.9); }
        }
      `}</style>
    </div>
  );
}

function DockBar({
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
  critical?: boolean;
  flash?: { key: number; color: string } | null;
}) {
  return (
    <div className="flex items-center gap-1 mb-0.5">
      <span className="text-bone/70 font-bold shrink-0" style={{ width: 14 }}>
        {label}
      </span>
      {critical && (
        <span aria-hidden style={{ color: '#ff6b6b', fontSize: 9, marginRight: -2 }}>
          !
        </span>
      )}
      <div
        className={`relative flex-1 h-2 rounded-full bg-void/90 overflow-hidden border ${
          critical ? 'border-crimson' : 'border-bone/20'
        } ${critical ? 'dock-bar-critical' : ''}`}
      >
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-300`}
          style={{ width: `${Math.max(0, Math.min(1, pct)) * 100}%` }}
        />
        {flash && (
          <div key={flash.key} aria-hidden className="absolute inset-0 fs-flash" style={{ background: flash.color }} />
        )}
      </div>
      <span className="tabular-nums text-bone/90 font-semibold text-right" style={{ minWidth: '2.5ch' }}>
        {value}
      </span>
    </div>
  );
}

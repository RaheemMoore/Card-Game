import { useEffect, useRef, useState } from 'react';
import type { Card } from '../../types/card';
import type { HeroCombatant } from '../../types/combat';
import type { AnimationBeat } from '../../services/combat/presentation/types';
import { CardRenderer } from '../../components/CardRenderer';
import { useViewportWidth, clampNum } from './useViewportWidth';
import { CardCracks, CardTargetMark, CardCombatFxStyles } from './CardCombatFx';

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
  // Grown from clamp(96, 0.115, 168). The cards are the characters now — they
  // rise, tilt, crack and flip — and they were the SMALLEST element on screen
  // while three ability tiles were the largest. The ability bar gave up the
  // width for this (see AbilityCommandBar).
  //
  // The CAP is held down deliberately. Card height is width × 470/326, and the
  // dock is now centred directly beneath a centre-anchored boss — at a 204px
  // cap the fan stood ~294px tall and crossed his feet and dais. 176 keeps the
  // top of the fan below that line.
  return clampNum(112, 0.125, 176, viewportWidth);
}
/** Fan overlap, kept at the same ~0.357 ratio to card width as the original
 *  fixed 60/168 so the fan's proportions don't change shape as it shrinks. */
function cardOverlap(viewportWidth: number): number {
  // Loosened from clamp(34, 0.041, 60). The old fan was tuned for cards that
  // never moved; at that overlap the third card was almost entirely hidden and
  // a card rising to act or to take a blow travelled THROUGH its neighbours.
  // A hand of cards still reads as a fan at this spacing, and all three stay
  // legible.
  return clampNum(20, 0.024, 38, viewportWidth);
}

/** Width of the fanned card row itself, ignoring slack. */
export function fanWidth(viewportWidth: number): number {
  return Math.round(3 * cardWidth(viewportWidth) - 2 * cardOverlap(viewportWidth));
}

export function computePartyDockWidth(viewportWidth: number): number {
  // The slack is NOT decoration. Three things push the cards past their layout
  // box and none of them are visible to flex:
  //   - the fan tilt, `rotate(±6deg)`, grows the visual bbox by ~(h·sin6)/2
  //     per side — about 13px at these card heights;
  //   - the acting card's `drop-shadow(0 0 16px …)` gold bloom;
  //   - `.card-acting` / `.card-struck`, which lift and lean the card.
  // With the old 36px of slack the fan visibly crossed into the ability tiles.
  // Do not trim this back to "the cards fit" — they fit, and then they move.
  return fanWidth(viewportWidth) + 56;
}

/**
 * Left edge of the card fan, in px — CENTRED in the viewport.
 *
 * The dock used to be pinned to `left: 24`. The cards are the characters now,
 * so they take the middle of the shelf and the ability list moved left.
 *
 * The shelf centres its matching reservation with two flexible gutters rather
 * than measuring this, and both derive from the same `viewportWidth`, so they
 * agree without either one observing the other.
 */
export function dockLeft(viewportWidth: number): number {
  return Math.round((viewportWidth - fanWidth(viewportWidth)) / 2);
}

/**
 * Centre of each hero CARD in the dock, as a percentage of arena width.
 *
 * This replaces `computeHeroLaneXPercents` as the hero-side anchor for combat
 * VFX. The floor sprites those lanes described are gone — the card in the dock
 * IS the hero now, so a blow has to travel to the card, and it must be the
 * card the player watches rise to meet it.
 *
 * Derived from the dock's own layout constants rather than eyeballed, so the
 * anchors cannot drift when the fluid card width changes: the container sits
 * at `left: DOCK_LEFT`, cards are laid out in a row from there, and each
 * subsequent card is inset by the fan overlap.
 */
export function computeDockCardXPercents(viewportWidth: number): [number, number, number] {
  const w = cardWidth(viewportWidth);
  const step = w - cardOverlap(viewportWidth);
  // Reads `dockLeft()` rather than a constant, so re-positioning the dock
  // re-aims every hero-side VFX beam automatically. `combatAnchors.ts`
  // consumes this; if it ever disagrees with the dock's actual left edge, the
  // boss's attacks land on empty floor.
  const left = dockLeft(viewportWidth);
  const centers = [0, 1, 2].map((i) => left + i * step + w / 2);
  return centers.map((px) => (px / viewportWidth) * 100) as [number, number, number];
}

/**
 * Vertical anchor for a blow landing on a card, as a percentage of arena
 * height — the card's face once it has RISEN to take the hit, not where it
 * rests in the fan.
 *
 * A constant rather than a measurement, matching the convention the old
 * `HERO_POINT_Y` used: the dock is bottom-anchored and the card art is a fixed
 * proportion of it, so this only needs re-tuning if the dock's own geometry
 * changes. Aimed slightly high on purpose — an impact reads better on the
 * portrait than on the stat band at the card's foot.
 */
export const DOCK_CARD_POINT_Y = 76;

/* `computeHeroLaneXPercents` lived here — the floor lanes the hero sprites
 * stood in. Removed with the sprites themselves; `computeDockCardXPercents`
 * above is its replacement, and it points at the cards instead. */

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

  /**
   * Who the boss has named this round.
   *
   * Once the hero sprites come off the floor, NOTHING else on screen shows who
   * is about to be hit — the attack used to visibly travel to a specific
   * chibi. Read off the telegraph beat rather than live state so the mark
   * appears with the warning the player is being given, not before it.
   */
  const markedActorIds =
    currentBeat?.event.kind === 'boss_intent_declared'
      ? currentBeat.event.intent.targetActorIds
      : [];

  return (
    <div
      ref={rovingRef}
      role="group"
      aria-label="Party"
      className="absolute flex flex-col justify-end"
      style={{
        left: dockLeft(viewportWidth),
        bottom: 14,
        // Above the arena's world content (z 21). The player's hand belongs in
        // FRONT of the scene — now that the cards are centred they overlap the
        // boss's lower body, and at the old z 20 he painted over them, which
        // read as a rendering bug rather than as depth.
        zIndex: 22,
        width: fanWidth(viewportWidth),
      }}
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
      <CardCombatFxStyles />
      {/* Row 1 — fanned card art. Overlap is purely visual (a hand of
          cards); it rises above the shelf's top edge on purpose.
          `dock-stage` carries the shared perspective: set per card instead,
          every card gets its own vanishing point and the fan stops reading as
          one hand. */}
      <div className="flex items-end dock-stage">
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
                // Fan tilt ONLY. The lift used to live here too, but
                // `.card-acting` now owns rising and leaning into the arena —
                // keeping both would translate the card twice and it would
                // float above its own glow.
                transform: `rotate(${isActing ? 0 : tilt}deg)`,
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
                marked={markedActorIds.includes(combatant.actorId)}
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
          return (
            <DockStats
              key={combatant.actorId}
              combatant={combatant}
              currentBeat={currentBeat}
              // Derived from the card, not a fixed 108. Three fixed columns
              // plus gaps came to 336px inside a 326px dock at narrow
              // viewports, and because the row is `justify-center` with
              // non-shrinkable children it spilled ~5px out each side — the
              // one genuine layout overflow behind the "cards overlap the
              // abilities" report.
              width={Math.max(72, Math.floor((fanWidth(viewportWidth) - 12) / 3))}
            />
          );
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
  marked,
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
  /** The boss's telegraph names this hero — the only "who is about to be hit"
   *  signal left once the floor sprites are gone. */
  marked: boolean;
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
      className={[
        'relative',
        // `card-struck` replaces the old in-place flinch: the card now rises
        // to meet the blow rather than shuddering where it sits.
        //
        // Gated on having actually been hit. The old class was applied
        // unconditionally and so fired once on mount too — harmless at 350ms
        // of shudder, but this animation lifts the card 24px and holds it, so
        // on mount all three cards would rise and flinch at nothing before the
        // first round begins.
        shakeKey > 0 ? 'card-struck' : '',
        tappable ? 'cursor-pointer' : '',
        pickable ? 'dock-card-target-reticle' : '',
        // Order matters: death outranks everything, and a dead card must not
        // keep pulsing as a live target.
        isDefeated ? 'card-defeated' : isActing ? 'card-acting card-ignited' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        width: cardW,
        height: cardH,
        filter: isActing
          ? 'drop-shadow(0 10px 18px rgba(0,0,0,0.85)) drop-shadow(0 0 16px rgba(212,175,55,0.55))'
          : 'drop-shadow(0 6px 10px rgba(0,0,0,0.6))',
        // Defeat is now carried by the flip animation's own grayscale, not by
        // fading the card out — a 45%-opacity card reads as a rendering bug,
        // whereas a face-down card reads as dead.
        transformStyle: 'preserve-3d',
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
      <div
        style={{
          width: NATIVE_W,
          height: NATIVE_H,
          transform: `scale(${cardScale})`,
          transformOrigin: 'top left',
          // Hidden once the flip passes 90deg, which is what reveals the back
          // plate beneath. Without this the portrait shows through mirrored
          // and the card looks inside-out rather than face-down.
          backfaceVisibility: 'hidden',
        }}
      >
        <CardRenderer card={card} size="full" />
      </div>

      {/* Aimed at, not hurt — brackets outside the art, no red. */}
      {!isDefeated && marked && <CardTargetMark />}

      {/* Damage, drawn on the face. The cracks ARE the health bar. */}
      <CardCracks
        hpFraction={combatant.snapshot.maxHp > 0 ? combatant.hp / combatant.snapshot.maxHp : 1}
        seed={card.cardId}
        width={100}
        height={144}
      />

      {/* The back of the card, sitting behind the face and only ever seen once
          the flip has turned past square. */}
      {isDefeated && (
        <div
          aria-hidden
          className="absolute inset-0 rounded"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            background:
              'repeating-linear-gradient(45deg, #241a12 0 6px, #2e2418 6px 12px)',
            border: '2px solid rgba(212,175,55,0.35)',
            boxShadow: 'inset 0 0 24px rgba(0,0,0,0.9)',
          }}
        />
      )}
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
        /* The in-place hit shudder that used to live here is gone — taking a
           blow is now .card-struck in CardCombatFx (rise, hold, flinch,
           return). Two hit animations on the same element would fight over
           the transform property, and the shorter one would win by finishing
           first. */

        @keyframes dock-card-target-pulse {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(235,150,46,0.6)); }
          50%      { filter: drop-shadow(0 0 16px rgba(235,150,46,0.9)); }
        }
        .dock-card-target-reticle { animation: dock-card-target-pulse 1.1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .dock-card-target-reticle { animation: none !important; filter: drop-shadow(0 0 12px rgba(235,150,46,0.8)) !important; }
        }
      `}</style>
    </div>
  );
}

function DockStats({
  combatant,
  currentBeat,
  width,
}: {
  combatant: HeroCombatant;
  currentBeat: AnimationBeat | null;
  /** Column width, derived from the card fan so three always fit. */
  width: number;
}) {
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
    <div className="text-[9px] leading-tight" style={{ width }}>
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

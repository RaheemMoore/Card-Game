import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../../types/card';
import type { HeroCombatant } from '../../../types/combat';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import { CardRenderer } from '../../../components/CardRenderer';
import { FloatingDamage } from '../FloatingDamage';

interface TargetPickMode {
  pickableActorIds: string[];
  onPick: (actorId: string) => void;
}

interface Props {
  heroes: HeroCombatant[];
  partyCards: Card[];
  selectedActorId: string;
  /** Fires when the user taps a side lane to switch selection. */
  onSelect: (actorId: string) => void;
  canAct: boolean;
  currentBeat: AnimationBeat | null;
  /** Playback Mode: cards lower slightly, glow reduced. */
  loweredForPlayback: boolean;
  /** When set, tapping a pickable ally lane picks an ability target instead
   *  of switching the selected hero. */
  targetPickMode?: TargetPickMode | null;
}

/**
 * Mobile Party Card Tray — three fixed lanes, party order stable. Selected
 * center card is larger, raised, and glow-emphasized; side cards sit smaller
 * and lower with controlled overlap so all three fit in a portrait viewport.
 * Side cards remain tappable to switch selection.
 *
 * The renderer is the exact live `CardRenderer` (size="thumbnail") so the
 * cards remain internally consistent with the Collection.
 */
export function MobilePartyCardTray({
  heroes,
  partyCards,
  selectedActorId,
  onSelect,
  canAct,
  currentBeat,
  loweredForPlayback,
  targetPickMode = null,
}: Props) {
  // Visual rotation so the selected hero always renders in the CENTER
  // display slot, with neighbors on either side. The canonical party order
  // (turn resolution, actor ids, `heroes` array indices) is unchanged — this
  // is purely a display permutation of a 3-slot grid.
  const displayOrder = useMemo(() => {
    const n = heroes.length;
    if (n === 0) return [] as { hero: HeroCombatant; card: Card; canonicalIndex: number }[];
    const selectedIdx = Math.max(
      0,
      heroes.findIndex((h) => h.actorId === selectedActorId),
    );
    // For 1-hero party: just the one. For 2-hero: selected + partner. For 3:
    // rotate so [prev, selected, next] fills [left, center, right].
    if (n === 1) {
      return [{ hero: heroes[0], card: partyCards[0], canonicalIndex: 0 }].filter(
        (r) => r.card,
      );
    }
    if (n === 2) {
      // Selected in center, partner on right (leaves left empty spacer).
      const partnerIdx = (selectedIdx + 1) % 2;
      return [
        { hero: heroes[selectedIdx], card: partyCards[selectedIdx], canonicalIndex: selectedIdx },
        { hero: heroes[partnerIdx], card: partyCards[partnerIdx], canonicalIndex: partnerIdx },
      ].filter((r) => r.card);
    }
    const prev = (selectedIdx - 1 + n) % n;
    const next = (selectedIdx + 1) % n;
    return [
      { hero: heroes[prev], card: partyCards[prev], canonicalIndex: prev },
      { hero: heroes[selectedIdx], card: partyCards[selectedIdx], canonicalIndex: selectedIdx },
      { hero: heroes[next], card: partyCards[next], canonicalIndex: next },
    ].filter((r) => r.card);
  }, [heroes, partyCards, selectedActorId]);

  const gridCols = displayOrder.length === 3 ? '1fr 1fr 1fr' : displayOrder.length === 2 ? '1fr 1fr' : '1fr';

  return (
    <div
      className="relative w-full h-full"
      aria-label="Party card tray"
    >
      <div
        className="absolute inset-x-0 grid pointer-events-none"
        style={{
          bottom: 0,
          top: 0,
          gridTemplateColumns: gridCols,
          alignItems: 'end',
        }}
      >
        {displayOrder.map(({ hero: combatant, card }, displayIdx) => {
          const isSelected = combatant.actorId === selectedActorId;
          const lanePosition: 'left' | 'center' | 'right' =
            displayOrder.length <= 1
              ? 'center'
              : displayIdx === 0 && displayOrder.length >= 2
              ? 'left'
              : displayIdx === displayOrder.length - 1 && displayOrder.length >= 2 && !isSelected
              ? 'right'
              : 'center';
          const pickable = targetPickMode ? targetPickMode.pickableActorIds.includes(combatant.actorId) : false;
          return (
            <MobileHeroLane
              key={combatant.actorId}
              card={card}
              combatant={combatant}
              isSelected={isSelected}
              lanePosition={lanePosition}
              canAct={canAct}
              onSelect={() => onSelect(combatant.actorId)}
              currentBeat={currentBeat}
              loweredForPlayback={loweredForPlayback}
              picking={targetPickMode ? { pickable, onPick: () => targetPickMode.onPick(combatant.actorId) } : null}
            />
          );
        })}
      </div>
    </div>
  );
}

function MobileHeroLane({
  card,
  combatant,
  isSelected,
  lanePosition,
  canAct,
  onSelect,
  currentBeat,
  loweredForPlayback,
  picking,
}: {
  card: Card;
  combatant: HeroCombatant;
  isSelected: boolean;
  lanePosition: 'left' | 'center' | 'right';
  canAct: boolean;
  onSelect: () => void;
  currentBeat: AnimationBeat | null;
  loweredForPlayback: boolean;
  /** Non-null while an ability's target picker is active. */
  picking: { pickable: boolean; onPick: () => void } | null;
}) {
  // One reaction slot, mirroring HeroSpriteLayer's. Until 2026-07-28 this
  // only fired when the hero was the damage TARGET, so on mobile the party
  // never visibly ATTACKED — a big part of why the phone build read as
  // inert. Cards can't lunge sideways without breaking the tray grid, so the
  // attack reaction is a vertical pop instead.
  const [reaction, setReaction] = useState<{ key: number; type: 'hit' | 'attack' } | null>(null);
  const lastShakeBeatId = useRef<string | null>(null);
  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.id === lastShakeBeatId.current) return;
    if (currentBeat.suppressEffects) return;
    const e = currentBeat.event;
    if (e.kind !== 'damage_dealt') return;
    if (e.targetActorId === combatant.actorId) {
      lastShakeBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'hit' }));
    } else if (e.sourceActorId === combatant.actorId) {
      lastShakeBeatId.current = currentBeat.id;
      setReaction((cur) => ({ key: (cur?.key ?? 0) + 1, type: 'attack' }));
    }
  }, [currentBeat, combatant.actorId]);

  const isDefeated = combatant.defeated;
  const hpPct = Math.max(0, combatant.hp / combatant.snapshot.maxHp);
  const hpCritical = !isDefeated && hpPct <= 0.25;

  // Selected: bigger, raised, glow. Side lanes: smaller, dropped, subdued.
  // Playback mode drops selected slightly and dims glow.
  const scale = isSelected ? (loweredForPlayback ? 0.94 : 1.0) : 0.68;
  const raise = isSelected ? (loweredForPlayback ? 6 : 14) : 0;
  const opacity = isDefeated ? 0.45 : isSelected ? 1 : 0.82;
  const zIndex = isSelected ? 3 : 1;

  // Controlled overlap: side cards nudge inward slightly so all three read
  // as a set, not three separated columns.
  const nudgeX = isSelected ? 0 : lanePosition === 'left' ? 14 : lanePosition === 'right' ? -14 : 0;

  return (
    <div
      className="pointer-events-auto flex flex-col items-center justify-end"
      style={{ zIndex, position: 'relative' }}
    >
      <button
        type="button"
        onClick={picking ? picking.onPick : onSelect}
        disabled={picking ? !picking.pickable : isDefeated}
        aria-label={`${combatant.snapshot.displayName} — ${
          picking ? (picking.pickable ? 'tap to target this ally' : '') : isSelected ? 'selected' : 'tap to select'
        }, ${combatant.hp} of ${combatant.snapshot.maxHp} HP`}
        aria-pressed={isSelected}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-lg"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: isDefeated ? 'default' : 'pointer',
          transform: `translate(${nudgeX}px, ${-raise}px) scale(${scale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 250ms ease-out, opacity 200ms',
          opacity,
          filter: isDefeated ? 'grayscale(1)' : 'none',
        }}
      >
        <div
          key={reaction?.key ?? 0}
          className={[
            'relative',
            reaction?.type === 'attack' ? 'mobile-hero-lane-attack' : 'mobile-hero-lane-shake',
            picking?.pickable && 'mobile-hero-lane-target-reticle',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            filter: isSelected
              ? canAct
                ? 'drop-shadow(0 10px 18px rgba(0,0,0,0.9)) drop-shadow(0 0 20px rgba(212,175,55,0.55))'
                : 'drop-shadow(0 8px 14px rgba(0,0,0,0.85)) drop-shadow(0 0 12px rgba(212,175,55,0.3))'
              : 'drop-shadow(0 6px 10px rgba(0,0,0,0.7))',
          }}
        >
          <CardRenderer card={card} size="thumbnail" />
          {isDefeated && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="font-fantasy text-[9px] uppercase tracking-widest text-crimson bg-void/95 px-2 py-0.5 rounded">
                Defeated
              </span>
            </div>
          )}
          {/* HP bar — always visible regardless of selection, so a
              non-selected hero can't quietly die unnoticed on mobile
              (previously HP had no visual here at all, screen-reader label
              only). Overlaid on the card's own bottom edge rather than
              pushed below it, so the tray doesn't need extra height. */}
          {!isDefeated && (
            <div
              aria-hidden
              className="absolute left-1 right-1 bottom-1 rounded-full overflow-hidden pointer-events-none"
              style={{ height: 3, background: 'rgba(0,0,0,0.6)' }}
            >
              <div
                className={`h-full transition-all duration-300 ${
                  hpCritical ? 'bg-crimson mobile-hp-critical' : 'bg-emerald-500'
                }`}
                style={{ width: `${hpPct * 100}%` }}
              />
            </div>
          )}
          <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
        </div>
      </button>

      {/* Resource is shown for the selected hero only by MobileResourceRow
          below the tray — HP now has its own always-visible bar on each
          card above (see the bottom-edge overlay in the render above). */}

      <style>{`
        /* Opens on 18% of hitstop, same as the desktop sprites — the numbers
           live in services/combat/presentation/gameFeel.ts so the two trees
           can differ in WHERE an effect lands but never in how hard it hits. */
        @keyframes mobile-hero-lane-shake {
          0%, 18% { transform: translate(0, 0); filter: brightness(2.2) saturate(0.4); }
          32%     { transform: translate(3px, 1px); filter: brightness(1.15); }
          48%     { transform: translate(-2px, -1px); }
          64%     { transform: translate(1px, 0); }
          100%    { transform: translate(0, 0); }
        }
        .mobile-hero-lane-shake { animation: mobile-hero-lane-shake 0.35s ease-out; }

        /* The attack tell. A card can't lunge horizontally without tearing
           the three-lane grid apart, so the strike reads vertically. */
        @keyframes mobile-hero-lane-attack {
          0%   { transform: translateY(0); }
          20%  { transform: translateY(3px); }
          45%  { transform: translateY(-8px); filter: brightness(1.15); }
          60%  { transform: translateY(-8px); filter: brightness(1.15); }
          100% { transform: translateY(0); }
        }
        .mobile-hero-lane-attack { animation: mobile-hero-lane-attack 380ms cubic-bezier(0.2, 0.9, 0.3, 1); }

        @keyframes mobile-hero-lane-target-pulse {
          0%, 100% { box-shadow: 0 0 0 2px #eb962e, 0 0 14px 3px rgba(235,150,46,0.55); }
          50%      { box-shadow: 0 0 0 3px #ffcc63, 0 0 20px 6px rgba(235,150,46,0.75); }
        }
        .mobile-hero-lane-target-reticle {
          border-radius: 8px;
          animation: mobile-hero-lane-shake 0.35s ease-out, mobile-hero-lane-target-pulse 1.1s ease-in-out infinite;
        }
        @keyframes mobile-hp-critical-pulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
        .mobile-hp-critical { animation: mobile-hp-critical-pulse 1s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .mobile-hero-lane-shake { animation: none !important; }
          .mobile-hero-lane-attack { animation: none !important; }
          .mobile-hero-lane-target-reticle {
            animation: none !important;
            box-shadow: 0 0 0 3px #eb962e;
          }
          .mobile-hp-critical { animation: none !important; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

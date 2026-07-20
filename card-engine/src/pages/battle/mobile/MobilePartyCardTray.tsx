import { useEffect, useMemo, useRef, useState } from 'react';
import type { Card } from '../../../types/card';
import type { HeroCombatant } from '../../../types/combat';
import type { AnimationBeat } from '../../../services/combat/presentation/types';
import { CardRenderer } from '../../../components/CardRenderer';
import { FloatingDamage } from '../FloatingDamage';

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
}: {
  card: Card;
  combatant: HeroCombatant;
  isSelected: boolean;
  lanePosition: 'left' | 'center' | 'right';
  canAct: boolean;
  onSelect: () => void;
  currentBeat: AnimationBeat | null;
  loweredForPlayback: boolean;
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

  const isDefeated = combatant.defeated;

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
        onClick={onSelect}
        disabled={isDefeated}
        aria-label={`${combatant.snapshot.displayName} — ${
          isSelected ? 'selected' : 'tap to select'
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
          key={shakeKey}
          className="relative mobile-hero-lane-shake"
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
          <FloatingDamage currentBeat={currentBeat} actorId={combatant.actorId} />
        </div>
      </button>

      {/* HP + resource overlays are rendered by the card face itself + the
          MobileResourceRow below the tray — no under-card strip needed here.
          Keeping this comment as a reminder not to reintroduce the strip
          without also shrinking the tray container height. */}

      <style>{`
        @keyframes mobile-hero-lane-shake {
          0%   { transform: translate(0, 0); }
          15%  { transform: translate(-2px, 1px); filter: brightness(1.4); }
          30%  { transform: translate(2px, -1px); filter: brightness(1.4); }
          45%  { transform: translate(-1px, 0); }
          60%  { transform: translate(1px, 0); }
          100% { transform: translate(0, 0); }
        }
        .mobile-hero-lane-shake { animation: mobile-hero-lane-shake 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .mobile-hero-lane-shake { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

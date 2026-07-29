import { useState } from 'react';
import { CardRenderer } from '../../components/CardRenderer';
import type { Card } from '../../types/card';

/**
 * Shared "Lineup + Bench" card selector used by both mini-games' pre-game
 * screens (Boss Battle party pick, Forge Strike single pick).
 *
 * - Lineup (top): the chosen party, held as a FANNED HAND. Overlapping the
 *   cards keeps a six-hero party to roughly the footprint of two, which
 *   matters because party size is capped by power rather than headcount and a
 *   wide Foundation party is a legitimate build. Hovering lifts a card out of
 *   the fan to read it; an Expand toggle lays the whole hand out flat, which
 *   is the same affordance for touch, where there is no hover.
 *
 *   Rendering the full slot cap as empty boxes was the earlier approach and
 *   was worse twice over: six placeholders is most of a phone screen of
 *   nothing, and it implies you can field six when an Ascendant roster can
 *   only ever afford two.
 * - Bench (bottom): a horizontally-scrolling strip of the whole eligible
 *   roster. Only the bench scrolls, so the screen never floods regardless of
 *   how many cards the player owns.
 *
 * ── Why the lineup renders THUMBNAILS ──
 * `CardRenderer size="full"` scales its BOX but not its TYPOGRAPHY: the
 * internals sit at percentage positions with fixed font sizes, so a full card
 * rendered at anything other than its native 326px shows a truncated name, an
 * oversized stat number colliding with the frame, and overlapping
 * power/toughness. It only looks correct at exactly one width. The lineup uses
 * `size="thumbnail"`, the variant actually built to render small — the
 * lineup's job is identity and running order, and Expand is there for when a
 * player needs to actually read a card.
 *
 * Presentational only — the parent owns eligibility and start logic. Picking a
 * bench card fills the next open lane; clicking a filled lane (or an already
 * picked bench card) removes it. `selectedIds` is ordered by lane.
 */
interface CardBenchProps {
  eligibleCards: Card[];
  laneCount: number;
  /** Ordered card ids, one per filled lane (length ≤ laneCount). */
  selectedIds: readonly string[];
  /** Toggle a card in/out of the party. */
  onToggle: (cardId: string) => void;
  /** Optional per-lane label, e.g. "Lane 1". Defaults to `Lane ${i + 1}`. */
  laneLabel?: (index: number) => string;
  /** Cards the player cannot currently afford. Rendered dimmed and inert. */
  unaffordableIds?: readonly string[];
  /** Per-card cost pip, e.g. power cost. Omitted when not supplied. */
  costOf?: (card: Card) => number | null;
}

export function CardBench({
  eligibleCards,
  laneCount,
  selectedIds,
  onToggle,
  laneLabel = (i) => `Lane ${i + 1}`,
  unaffordableIds = [],
  costOf,
}: CardBenchProps) {
  const [expanded, setExpanded] = useState(false);
  const cardById = (id: string) => eligibleCards.find((c) => c.cardId === id) ?? null;

  const picked = selectedIds.map(cardById).filter((c): c is Card => c !== null);
  const canAddMore = selectedIds.length < laneCount;

  /**
   * How far each card slides under the one before it.
   *
   * Grows with the hand so the fan's total width stays roughly constant: a
   * six-card hand at a three-card overlap would run ~520px and break a phone.
   */
  const overlapPx = picked.length <= 3 ? 52 : picked.length <= 4 ? 74 : 96;

  /** Symmetric tilt across the hand, in degrees. One card sits flat. */
  const tiltFor = (i: number) => {
    if (picked.length < 2) return 0;
    const arc = Math.min(22, picked.length * 5);
    return -arc / 2 + (arc * i) / (picked.length - 1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Lineup — a fanned hand rather than a row of slots. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between min-h-[24px]">
          <span className="text-[10px] uppercase tracking-widest text-bone/50">
            {picked.length === 0 ? 'Your party' : `Your party — ${picked.length}`}
          </span>
          {picked.length > 1 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] uppercase tracking-widest text-bone/60 hover:text-gold border border-bone/20 hover:border-gold/50 rounded px-2 py-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>

        {picked.length === 0 ? (
          <div className="w-full rounded-xl border border-dashed border-bone/20 bg-void/30 py-8 text-center text-[11px] text-bone/40 italic">
            Pick a card below to begin.
          </div>
        ) : expanded ? (
          // Laid out flat so every card is readable. Wraps on narrow screens.
          <div className="flex flex-wrap justify-center gap-3">
            {picked.map((card, i) => (
              <button
                key={card.cardId}
                type="button"
                onClick={() => onToggle(card.cardId)}
                aria-label={`${card.cardName} — ${laneLabel(i)}. Click to remove.`}
                className="rounded-xl ring-2 ring-gold shadow-lg shadow-gold/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold"
              >
                <CardRenderer card={card} size="thumbnail" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="flex items-end">
              {picked.map((card, i) => (
                <button
                  key={card.cardId}
                  type="button"
                  onClick={() => onToggle(card.cardId)}
                  aria-label={`${card.cardName} — ${laneLabel(i)}. Click to remove.`}
                  // Lift and straighten on hover/focus so a card can be read
                  // without leaving the fan. `hover:z-20` brings it fully clear
                  // of the cards stacked on top of it.
                  className="group relative rounded-xl ring-2 ring-gold shadow-lg shadow-gold/20 transition-transform duration-200 hover:z-20 focus:z-20 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold"
                  style={{
                    marginLeft: i === 0 ? 0 : -overlapPx,
                    zIndex: i,
                    transformOrigin: 'bottom center',
                    transform: `rotate(${tiltFor(i)}deg) translateY(${Math.abs(tiltFor(i)) * 0.6}px)`,
                  }}
                >
                  <span
                    aria-hidden
                    className="block transition-transform duration-200 group-hover:-translate-y-4 group-focus:-translate-y-4"
                  >
                    <CardRenderer card={card} size="thumbnail" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {canAddMore && picked.length > 0 && (
          <p className="text-center text-[10px] uppercase tracking-widest text-bone/35">
            Click a card to remove it
          </p>
        )}
      </div>

      {/* Bench — the roster. Horizontal scroll on purpose: it keeps the page
          height fixed no matter how large a collection gets, and it is the
          gesture a phone player already expects. */}
      <div className="overflow-x-auto pb-3 -mx-4 px-4">
        <div className="flex gap-3 w-max">
          {eligibleCards.map((card) => {
            const laneIdx = selectedIds.indexOf(card.cardId);
            const isPicked = laneIdx >= 0;
            const slotsFull = selectedIds.length >= laneCount;
            const unaffordable = unaffordableIds.includes(card.cardId);
            const disabled = !isPicked && (slotsFull || unaffordable);
            const cost = costOf?.(card) ?? null;
            return (
              <button
                key={card.cardId}
                type="button"
                onClick={() => onToggle(card.cardId)}
                disabled={disabled}
                aria-pressed={isPicked}
                aria-label={
                  isPicked
                    ? `${card.cardName} — in ${laneLabel(laneIdx)}. Click to remove.`
                    : unaffordable
                      ? `${card.cardName} — not enough party power remaining.`
                      : `${card.cardName} — click to add to party.`
                }
                title={unaffordable && !isPicked ? 'Not enough party power remaining' : undefined}
                className={`relative shrink-0 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  isPicked
                    ? 'ring-2 ring-gold shadow-lg shadow-gold/20'
                    : disabled
                      ? 'opacity-25 cursor-not-allowed grayscale'
                      : 'opacity-90 hover:opacity-100 hover:-translate-y-1'
                }`}
              >
                <CardRenderer card={card} size="thumbnail" />
                {isPicked ? (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-widest text-void bg-gold rounded px-1 py-0.5">
                    {laneLabel(laneIdx)}
                  </span>
                ) : (
                  cost !== null && (
                    // The cost is on the card itself, not only in the meter —
                    // otherwise a player has to guess which card is the
                    // expensive one after being refused.
                    <span
                      className="absolute top-1.5 right-1.5 text-[9px] font-bold tabular-nums rounded px-1 py-0.5"
                      style={{
                        background: 'rgba(10,9,8,0.85)',
                        border: '1px solid rgba(203,185,143,0.35)',
                        color: unaffordable ? '#d98a8a' : '#cbb98f',
                      }}
                    >
                      {cost}
                    </span>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

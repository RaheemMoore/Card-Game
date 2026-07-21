import { CardRenderer } from '../../components/CardRenderer';
import type { Card } from '../../types/card';

/**
 * Shared "Lineup + Bench" card selector used by both mini-games' pre-game
 * screens (Boss Battle party pick, Forge Strike single pick).
 *
 * - Lineup (top): `laneCount` large lane slots that fill with real card art
 *   as cards are picked. Empty slots show a dashed placeholder.
 * - Bench (bottom): a horizontally-scrolling strip of card thumbnails for the
 *   whole eligible roster. Only the bench scrolls, so the screen never floods
 *   regardless of how many cards the player owns.
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
}

export function CardBench({
  eligibleCards,
  laneCount,
  selectedIds,
  onToggle,
  laneLabel = (i) => `Lane ${i + 1}`,
}: CardBenchProps) {
  const cardById = (id: string) => eligibleCards.find((c) => c.cardId === id) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Lineup — the chosen champions, shown big */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: laneCount }).map((_, i) => {
          const card = selectedIds[i] ? cardById(selectedIds[i]!) : null;
          return (
            <div key={i} className="flex flex-col items-center gap-2 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-bone/50">
                {laneLabel(i)}
              </div>
              {card ? (
                <button
                  type="button"
                  onClick={() => onToggle(card.cardId)}
                  aria-label={`${card.cardName} — placed in ${laneLabel(i)}. Click to remove.`}
                  className="rounded-xl ring-2 ring-gold shadow-lg shadow-gold/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-gold"
                >
                  <CardRenderer card={card} size="full" />
                </button>
              ) : (
                <div className="w-full aspect-[326/470] max-w-[220px] rounded-xl border border-dashed border-bone/20 bg-void/30 flex items-center justify-center text-xs text-bone/40 italic">
                  empty
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bench — the roster, a compact horizontally-scrolling strip */}
      <div className="overflow-x-auto pb-3 -mx-4 px-4">
        <div className="flex gap-3 w-max">
          {eligibleCards.map((card) => {
            const laneIdx = selectedIds.indexOf(card.cardId);
            const isPicked = laneIdx >= 0;
            const partyFull = selectedIds.length >= laneCount;
            const disabled = !isPicked && partyFull;
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
                    : `${card.cardName} — click to add to party.`
                }
                className={`relative shrink-0 rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                  isPicked
                    ? 'ring-2 ring-gold shadow-lg shadow-gold/20'
                    : disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : 'opacity-90 hover:opacity-100 hover:-translate-y-1'
                }`}
              >
                <CardRenderer card={card} size="thumbnail" />
                {isPicked && (
                  <span className="absolute top-1.5 right-1.5 text-[9px] font-bold uppercase tracking-widest text-void bg-gold rounded px-1 py-0.5">
                    {laneLabel(laneIdx)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

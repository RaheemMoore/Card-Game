import { useEffect, useMemo, useState } from 'react';
import type { Card as CardType } from '../../../types/card';
import { getAllCards } from '../../../services/storage';
import { getOverallRank } from '../../../data/powerSystem';
import { CardRenderer } from '../../../components/CardRenderer';
import { Panel } from '../../../components/ui/Panel';
import { PixelButton } from '../../../components/ui/PixelButton';
import { Scrim } from '../../../components/ui/Scrim';
import { Slot } from '../../../components/ui/Slot';

/**
 * The Collection, as a stall you walk up to inside the courtyard.
 *
 * This is the first surface of the 2D-pixel direction (PRODUCTION.md §1): the
 * chrome is pixel because you touch it, and the cards inside stay painted
 * because you look at them. A pixel case holding painted portraits is the whole
 * idea made literal — resist any urge to pixelate the cards to "match".
 *
 * It does NOT replace `/collection` yet. That page still exists and still
 * works; this is the in-world version standing alongside it until it has been
 * played enough to retire the page deliberately rather than by surprise.
 *
 * EMPTY SLOTS ARE DELIBERATE. The grid always fills to a full case, so a
 * collection of three cards reads as a case with room in it rather than a
 * short list. That is the difference between a game and a database view.
 */

/** A full case, even when the collection isn't. */
const MIN_SLOTS = 18;

export function CollectionStall({ onClose }: { onClose: () => void }) {
  const [cards] = useState<CardType[]>(() => getAllCards());
  const [selected, setSelected] = useState<CardType | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const sorted = useMemo(
    () => [...cards].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [cards],
  );
  const slots = Math.max(MIN_SLOTS, Math.ceil(sorted.length / 6) * 6);

  return (
    <Scrim onClose={onClose} label="The Collection" bottomSheet={narrow}>
      <Panel
        variant="sheet"
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0, maxHeight: '100%' }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            padding: '4px 4px 14px',
            flexWrap: 'wrap',
          }}
        >
          <h2
            className="font-fantasy"
            style={{ fontSize: 22, color: '#f3d99b', letterSpacing: '0.04em', margin: 0 }}
          >
            The Collection
          </h2>
          <span style={{ fontSize: 12, color: '#b9a184' }}>
            {sorted.length === 0
              ? 'Nothing gathered yet'
              : `${sorted.length} ${sorted.length === 1 ? 'character' : 'characters'}`}
          </span>
        </header>

        {/* min-height:0 on the scroller — without it this grid child refuses to
            shrink and pushes the panel past the viewport. Same invariant the
            fullscreen game shell documents. */}
        <div style={{ overflowY: 'auto', minHeight: 0, flex: 1, padding: 4 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 92 : 116}px, 1fr))`,
              gap: 10,
            }}
          >
            {Array.from({ length: slots }, (_, i) => {
              const card = sorted[i];
              return (
                <Slot
                  key={card?.cardId ?? `empty-${i}`}
                  onClick={card ? () => setSelected(card) : undefined}
                  selected={selected?.cardId === card?.cardId && Boolean(card)}
                  label={card ? `${card.cardName}, ${card.archetype}` : 'Empty slot'}
                  style={{ aspectRatio: '326 / 470' }}
                >
                  {card && (
                    // CardRenderer's thumbnail is a fixed 137x197. Scaling it to
                    // the slot with a transform keeps the card's own aspect and
                    // its percentage-positioned children correct — re-laying it
                    // out to fill the slot would break both.
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ transform: `scale(${narrow ? 0.52 : 0.66})` }}>
                        <CardRenderer card={card} size="thumbnail" />
                      </div>
                    </div>
                  )}
                </Slot>
              );
            })}
          </div>
        </div>

        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingTop: 14,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 12, color: '#b9a184', flex: 1, minWidth: '14ch' }}>
            {selected ? `${selected.cardName} · ${getOverallRank(selected.stats)}` : 'Pick a character'}
          </span>
          <PixelButton onClick={onClose}>Back to the courtyard</PixelButton>
        </footer>
      </Panel>
    </Scrim>
  );
}

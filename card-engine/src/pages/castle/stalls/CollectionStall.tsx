import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/** CardRenderer's thumbnail width: 326 * 0.42. Not configurable there. */
const THUMB_W = 137;

interface Props {
  onClose: () => void;
  /**
   * Overrides the player's real collection. Only the ungated dev preview passes
   * this — it lets the case be reviewed full without a signed-in account, which
   * is otherwise impossible to see.
   */
  cards?: CardType[];
}

export function CollectionStall({ onClose, cards: override }: Props) {
  const [cards] = useState<CardType[]>(() => override ?? getAllCards());
  const [selected, setSelected] = useState<CardType | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // CardRenderer's thumbnail is a FIXED 137x197 (326x470 at 0.42). A hardcoded
  // transform scale therefore only fits one cell width, and at 375px portrait
  // the cards overflowed their slots and were clipped mid-portrait. Measuring
  // the real cell and deriving the factor is the only version that holds at
  // every viewport, and every cell is the same width so one observer covers the
  // whole grid.
  const gridRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(0.66);
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const cell = grid.firstElementChild as HTMLElement | null;
      if (!cell) return;
      const w = cell.getBoundingClientRect().width;
      if (w > 0) setCardScale(w / THUMB_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(grid);
    return () => ro.disconnect();
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
            ref={gridRef}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 92 : 116}px, 1fr))`,
              gap: 10,
              // `start`, NOT the default `stretch`. A row containing only empty
              // slots has no card to give it height, so under `stretch` the
              // slots took the row's min-content height and rendered as
              // slivers. With `start` each cell takes its height from its own
              // aspect-ratio and an all-empty row looks like the full ones.
              alignItems: 'start',
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
                        overflow: 'hidden',
                      }}
                    >
                      {/* TOP-LEFT ORIGIN, NOT CENTRED. The card's layout box is
                          137px wide — wider than the cell — and when a grid item
                          overflows its track the browser aligns it to the START
                          rather than centring it (overflow alignment is "safe"
                          by default). Scaling about the centre of a box that was
                          never actually centred pushed every card ~17px right
                          and clipped its frame. Anchoring at 0,0 and scaling
                          from that corner is exact at any cell width. */}
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          transform: `scale(${cardScale})`,
                          transformOrigin: 'left top',
                        }}
                      >
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

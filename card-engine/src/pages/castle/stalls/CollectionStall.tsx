import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ArchetypeName, Card as CardType, Rank } from '../../../types/card';
import { deleteCard, getAllCards } from '../../../services/storage';
import { getOverallRank } from '../../../data/powerSystem';
import { CardRenderer } from '../../../components/CardRenderer';
import { Panel } from '../../../components/ui/Panel';
import { PixelButton } from '../../../components/ui/PixelButton';
import { Scrim } from '../../../components/ui/Scrim';
import { Slot } from '../../../components/ui/Slot';
import { CardSheet } from '../../../components/CardSheet';
import { buildStaticCardSheetAbilities } from '../../../services/abilities/cardSheetAdapter';
import { CollectionFilters, type SortOption } from './CollectionFilters';

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
  const [cards, setCards] = useState<CardType[]>(() => override ?? getAllCards());
  const [selected, setSelected] = useState<CardType | null>(null);
  const [filterArchetype, setFilterArchetype] = useState<ArchetypeName | ''>('');
  const [filterRank, setFilterRank] = useState<Rank | ''>('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [sheetCard, setSheetCard] = useState<CardType | null>(null);
  const [confirmRelease, setConfirmRelease] = useState<string | null>(null);
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

  // Owned-per-archetype drives the crest rack's dimming, and is counted from
  // the UNFILTERED set — a rack that re-counted itself after each filter would
  // show every crest as empty the moment one was picked.
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of cards) out[c.archetype] = (out[c.archetype] ?? 0) + 1;
    return out;
  }, [cards]);

  const sorted = useMemo(() => {
    let out = [...cards];
    if (filterArchetype) out = out.filter((c) => c.archetype === filterArchetype);
    if (filterRank) out = out.filter((c) => getOverallRank(c.stats) === filterRank);
    const total = (c: CardType) =>
      c.stats.Atk.value + c.stats.Def.value + (c.stats.Mana?.value ?? c.stats.Tech?.value ?? 0);
    const rankOrder: Record<Rank, number> = { Ascendant: 0, Forged: 1, Foundation: 2 };
    switch (sort) {
      case 'oldest':
        out.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'strongest':
        out.sort((a, b) => total(b) - total(a));
        break;
      case 'by-rank':
        out.sort((a, b) => rankOrder[getOverallRank(a.stats)] - rankOrder[getOverallRank(b.stats)]);
        break;
      default:
        out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return out;
  }, [cards, filterArchetype, filterRank, sort]);
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
            {cards.length === 0
              ? 'Nothing gathered yet'
              : sorted.length === cards.length
                ? `${cards.length} ${cards.length === 1 ? 'character' : 'characters'}`
                : `${sorted.length} of ${cards.length} shown`}
          </span>
        </header>

        <CollectionFilters
          archetype={filterArchetype}
          rank={filterRank}
          sort={sort}
          counts={counts}
          onArchetype={setFilterArchetype}
          onRank={setFilterRank}
          onSort={setSort}
        />

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
          {selected && (
            <>
              <PixelButton scale={1.2} onClick={() => setSheetCard(selected)}>
                Inspect
              </PixelButton>
              {/* Release is destructive and permanent, so it asks — and it says
                  the character's NAME, because "are you sure?" is not a question
                  anyone can answer safely about a card they cannot see. */}
              <PixelButton
                scale={1.2}
                onClick={() => setConfirmRelease(selected.cardId)}
                style={{ filter: 'hue-rotate(-25deg) saturate(1.2)' }}
              >
                Release
              </PixelButton>
            </>
          )}
          <PixelButton onClick={onClose}>Back to the courtyard</PixelButton>
        </footer>
      </Panel>

      {sheetCard && (
        <CardSheet
          card={sheetCard}
          abilities={buildStaticCardSheetAbilities(sheetCard)}
          onClose={() => setSheetCard(null)}
        />
      )}

      {confirmRelease && (
        <div
          role="alertdialog"
          aria-label="Confirm release"
          onClick={() => setConfirmRelease(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(6,4,10,0.8)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
        >
          <Panel
            variant="hud"
            style={{ maxWidth: 380, padding: 8 }}
            // Stop the backdrop's dismiss from firing when the panel is clicked.
          >
            <div onClick={(e) => e.stopPropagation()}>
              <p style={{ color: '#f3d99b', fontSize: 15, margin: '0 0 6px' }}>
                Release {cards.find((c) => c.cardId === confirmRelease)?.cardName}?
              </p>
              <p style={{ color: '#b9a184', fontSize: 12, margin: '0 0 14px' }}>
                They leave your collection for good. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <PixelButton scale={1.2} onClick={() => setConfirmRelease(null)}>
                  Keep
                </PixelButton>
                <PixelButton
                  scale={1.2}
                  onClick={() => {
                    deleteCard(confirmRelease);
                    setCards(override ?? getAllCards());
                    setSelected(null);
                    setConfirmRelease(null);
                  }}
                  style={{ filter: 'hue-rotate(-25deg) saturate(1.2)' }}
                >
                  Release
                </PixelButton>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </Scrim>
  );
}

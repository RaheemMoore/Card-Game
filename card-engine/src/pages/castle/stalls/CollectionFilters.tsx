import type { ArchetypeName, Rank } from '../../../types/card';
import { ARCHETYPE_NAMES, RANKS } from '../../../types/card';
import { ARCHETYPE_EMBLEMS } from '../../../data/archetypeEmblems';
import { PixelButton } from '../../../components/ui/PixelButton';
import { ScrollArea } from '../../../components/ui/ScrollArea';
import { Slot } from '../../../components/ui/Slot';

/**
 * Filters for the Collection case — as a rack of crests, not a form.
 *
 * Raheem, 2026-08-04: bring the old page's filters across, but "make it look
 * more gamified than it did in the web page."
 *
 * So the archetype filter is the ELEVEN ARCHETYPE EMBLEMS in gem frames — art
 * that already exists and that a player recognises instantly — instead of a
 * `<select>` of eleven words. Picking a crest is a game action; opening a
 * dropdown is paperwork. Rank is three carved chips, and sort is a single
 * cycling button rather than a fourth dropdown, because sort order is something
 * you flick through rather than choose from a list.
 *
 * Every control is a toggle: pressing the active one clears it. That is what
 * removes the need for a separate "clear filters" button, which is the kind of
 * thing that makes a game surface feel like an admin panel.
 */

export type SortOption = 'newest' | 'oldest' | 'strongest' | 'by-rank';

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  strongest: 'Strongest',
  'by-rank': 'By rank',
};

const SORT_CYCLE: SortOption[] = ['newest', 'oldest', 'strongest', 'by-rank'];

interface Props {
  archetype: ArchetypeName | '';
  rank: Rank | '';
  sort: SortOption;
  counts: Record<string, number>;
  onArchetype: (a: ArchetypeName | '') => void;
  onRank: (r: Rank | '') => void;
  onSort: (s: SortOption) => void;
  /** Phone portrait: smaller crests so the rack doesn't eat the case. */
  compact?: boolean;
}

export function CollectionFilters({
  archetype,
  rank,
  sort,
  counts,
  onArchetype,
  onRank,
  onSort,
  compact = false,
}: Props) {
  // 84 gives the crest room on desktop; 64 keeps the rack from taking a third
  // of an iPhone screen before a single card is visible.
  const tile = compact ? 64 : 84;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 12 }}>
      {/* Crest rack. Scrolls sideways rather than wrapping — a single row reads
          as a rack of crests; two ragged rows read as a form. */}
      <ScrollArea
        axis="x"
        label="Filter by archetype"
        contentStyle={{ display: 'flex', gap: 8, paddingBottom: 4 }}
      >
        {ARCHETYPE_NAMES.map((name) => {
          const emblem = ARCHETYPE_EMBLEMS[name]?.assetPath;
          const owned = counts[name] ?? 0;
          const active = archetype === name;
          return (
            <Slot
              key={name}
              selected={active}
              framed
              // Thin ring on purpose: at the default 13 the frame carried more
              // visual weight than the crest it was holding. Raheem: "the
              // frames are taking up a lot of the energy... this is a good
              // chance to showcase the emblem art."
              frameWidth={6}
              // Toggle: pressing the active crest clears the filter.
              onClick={() => onArchetype(active ? '' : name)}
              label={`${name}${owned ? `, ${owned} owned` : ', none owned'}`}
              style={{
                // A 6px ring leaves nearly the whole tile to the crest, versus
                // 20px at the first pass. The cards below scroll, so the rack
                // can afford the height — the emblems are the showcase here.
                width: tile,
                height: tile,
                flex: '0 0 auto',
                // Unowned archetypes stay visible but recede — a collection
                // screen should show you what you HAVEN'T got, not hide it.
                opacity: owned ? 1 : 0.38,
              }}
            >
              {emblem ? (
                <img
                  src={emblem}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <span
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: '100%',
                    height: '100%',
                    color: '#e8dcc4',
                    fontSize: 14,
                  }}
                >
                  {name[0]}
                </span>
              )}
            </Slot>
          );
        })}
      </ScrollArea>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.14em', color: '#a08c6e' }}>RANK</span>
        {RANKS.map((r) => (
          <PixelButton
            key={r}
            scale={0.95}
            onClick={() => onRank(rank === r ? '' : r)}
            aria-pressed={rank === r}
            style={{ filter: rank === r ? 'brightness(1.25)' : 'brightness(0.82)' }}
          >
            {r}
          </PixelButton>
        ))}

        <span style={{ flex: 1 }} />

        <PixelButton
          scale={0.95}
          onClick={() => onSort(SORT_CYCLE[(SORT_CYCLE.indexOf(sort) + 1) % SORT_CYCLE.length])}
          aria-label={`Sort: ${SORT_LABELS[sort]}. Activate to change.`}
        >
          {SORT_LABELS[sort]}
        </PixelButton>
      </div>
    </div>
  );
}

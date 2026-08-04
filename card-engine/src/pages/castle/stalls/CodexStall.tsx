import { useEffect, useMemo, useState } from 'react';
import { ELEMENT_NAMES } from '../../../types/bible';
import type { ElementName } from '../../../types/bible';
import { ARCHETYPE_NAMES } from '../../../types/card';
import type { ArchetypeName } from '../../../types/card';
import { ELEMENT_IMAGES } from '../../../data/elementImages';
import { ARCHETYPE_EMBLEMS } from '../../../data/archetypeEmblems';
import { ARCHETYPE_BIBLE } from '../../../data/archetypeBible';
import { PixelButton } from '../../../components/ui/PixelButton';
import { Slot } from '../../../components/ui/Slot';
import { StallShell } from '../../../components/ui/StallShell';

/**
 * The Codex — a book you open in the courtyard.
 *
 * Raheem, 2026-08-04: "The codex should be able to be accessed from within the
 * courtyard as well. It's gonna be like a little book. Someone walks up to you,
 * open it, open to the codex, but it should look beautiful, and with all the
 * beautiful images that we've made."
 *
 * So this is IMAGE-FIRST, unlike the web Codex it sits beside. The web version
 * is a functional list of ability families with discovery counts — correct for a
 * reference page and wrong for a book you open in a world. There are 28
 * commissioned element crystals and 11 archetype crests already in the repo and
 * the old page shows almost none of them; the whole point here is that they are
 * the content, not decoration around text.
 *
 * A BOOK HAS PAGES, so the sections are pages rather than tabs — same control,
 * but named for what it is. Selecting an entry opens its plate large beside the
 * grid rather than navigating away, because leaving the book to read one page of
 * it is what made the web version feel like a website.
 *
 * The web Codex at /codex is UNTOUCHED and still routed. Same discipline as the
 * Forge: this stands beside it until Raheem decides which one wins.
 */

type Page = 'elements' | 'archetypes';

const PAGES: { id: Page; label: string }[] = [
  { id: 'elements', label: 'Elements' },
  { id: 'archetypes', label: 'Archetypes' },
];

interface Entry {
  id: string;
  name: string;
  image?: string;
  blurb?: string;
}

export function CodexStall({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState<Page>('elements');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(() => window.innerWidth < 720);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 720);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const entries: Entry[] = useMemo(() => {
    if (page === 'elements') {
      // Only elements that HAVE artwork. `Time` has none because no archetype
      // offers it, and a book of beautiful images should not contain a blank
      // page apologising for itself.
      return ELEMENT_NAMES.filter((n) => ELEMENT_IMAGES[n as ElementName]).map((n) => ({
        id: n,
        name: n,
        image: ELEMENT_IMAGES[n as ElementName],
      }));
    }
    return ARCHETYPE_NAMES.map((n) => {
      const chapter = ARCHETYPE_BIBLE[n as ArchetypeName];
      return {
        id: n,
        name: n,
        image: ARCHETYPE_EMBLEMS[n as ArchetypeName]?.assetPath ?? undefined,
        // selectionScreen, not identity — the Bible chapter keeps the
        // player-facing prose there. Verified against the barbarian chapter.
        blurb: chapter?.selectionScreen?.tagline,
      };
    });
  }, [page]);

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  return (
    <StallShell
      title="The Codex"
      subtitle={`${entries.length} entries`}
      narrow={narrow}
      onClose={onClose}
      scrollLabel="Codex entries"
      toolbar={
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12, flexWrap: 'wrap' }}>
          {PAGES.map((p) => (
            <PixelButton
              key={p.id}
              scale={1.1}
              onClick={() => {
                setPage(p.id);
                setSelectedId(null);
              }}
              aria-pressed={page === p.id}
              style={{ filter: page === p.id ? 'brightness(1.25)' : 'brightness(0.8)' }}
            >
              {p.label}
            </PixelButton>
          ))}
        </div>
      }
      footerNote={selected ? selected.name : 'Open a page'}
      footer={<PixelButton onClick={onClose}>Close the book</PixelButton>}
    >
      <div
        style={{
          display: 'grid',
          // The open plate sits BESIDE the grid on desktop and above it on
          // phone, so reading an entry never costs you your place in the book.
          gridTemplateColumns: narrow || !selected ? '1fr' : 'minmax(0,1fr) 300px',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${narrow ? 84 : 104}px, 1fr))`,
            gap: 10,
            alignItems: 'start',
          }}
        >
          {entries.map((e) => (
            <Slot
              key={e.id}
              framed
              frameWidth={6}
              selected={selectedId === e.id}
              onClick={() => setSelectedId(selectedId === e.id ? null : e.id)}
              label={e.name}
              style={{ aspectRatio: '1 / 1' }}
            >
              {e.image ? (
                <img
                  src={e.image}
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
                    fontSize: 16,
                  }}
                >
                  {e.name[0]}
                </span>
              )}
            </Slot>
          ))}
        </div>

        {selected && (
          <aside style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
            {selected.image && (
              <img
                src={selected.image}
                alt={selected.name}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  objectFit: 'cover',
                  display: 'block',
                  border: '2px solid rgba(201,162,39,0.5)',
                }}
              />
            )}
            <h3
              className="font-fantasy"
              style={{ margin: 0, fontSize: 18, color: '#f3d99b', letterSpacing: '0.03em' }}
            >
              {selected.name}
            </h3>
            {selected.blurb && (
              <p style={{ margin: 0, fontSize: 13, color: '#cbb9a0', lineHeight: 1.6 }}>
                {selected.blurb}
              </p>
            )}
          </aside>
        )}
      </div>
    </StallShell>
  );
}

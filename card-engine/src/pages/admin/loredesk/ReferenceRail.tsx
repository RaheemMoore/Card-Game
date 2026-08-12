import { useState } from 'react';
import { RANKS, type Rank, type ArchetypeName } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { ARCHETYPE_BIBLE } from '../../../data/archetypeBible';
import { AdminCard } from '../../../components/admin/ui';
import { ImageZoom } from '../../../components/admin/workshop';

/**
 * The left rail — the character herself, always on screen while the lore is
 * written. One LARGE portrait at a time behind Foundation/Forged/Ascendant
 * tabs (a rank at full width beats a triptych of thumbnails for a writer),
 * then the identity sheet the lore must agree with, then the archetype canon.
 *
 * `activeRank` is shared with the writing canvas: focusing the Forged
 * paragraph shows the Forged portrait. She is always looking at the person
 * she is describing.
 */
export function ReferenceRail({
  character,
  activeRank,
  onRankChange,
}: {
  character: CuratedCharacter;
  activeRank: Rank;
  onRankChange: (rank: Rank) => void;
}) {
  const [zoom, setZoom] = useState<string | null>(null);
  const url = character.masterArt?.[activeRank]?.portraitUrl;

  return (
    <div className="grid gap-3 content-start">
      <AdminCard padded={false} className="overflow-hidden">
        <div
          className="grid grid-cols-3"
          role="tablist"
          aria-label="Rank portrait"
          style={{ borderBottom: '1px solid var(--admin-border)' }}
        >
          {RANKS.map((rank) => {
            const active = rank === activeRank;
            return (
              <button
                key={rank}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onRankChange(rank)}
                className="px-1 py-2 text-[10px] font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
                style={{
                  color: active ? 'var(--admin-accent-alt)' : 'var(--admin-text-muted)',
                  background: active ? 'var(--admin-active-wash)' : 'transparent',
                  boxShadow: active ? 'inset 0 -2px 0 var(--admin-accent)' : undefined,
                }}
              >
                {rank}
              </button>
            );
          })}
        </div>
        {url ? (
          <button
            type="button"
            onClick={() => setZoom(url)}
            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
            style={{ cursor: 'zoom-in' }}
            aria-label={`Zoom the ${activeRank} portrait`}
          >
            <img
              key={url}
              src={url}
              alt={`${activeRank} portrait`}
              className="w-full block motion-safe:animate-[fadeIn_0.3s_ease]"
            />
          </button>
        ) : (
          <div
            className="grid place-items-center text-xs italic"
            style={{ aspectRatio: '3 / 4', color: 'var(--admin-text-muted)' }}
          >
            {activeRank} art not supplied
          </div>
        )}
      </AdminCard>

      <IdentitySheet character={character} />
      <CanonPanel archetype={character.archetype} />

      {zoom && (
        <ImageZoom
          url={zoom}
          caption={`${character.displayName} — ${activeRank}`}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  );
}

/** Open by default — this is the truth the lore has to agree with. */
function IdentitySheet({ character }: { character: CuratedCharacter }) {
  const entries = Object.entries(character.identity ?? {}).filter(
    ([, v]) => typeof v === 'string' && (v as string).trim(),
  );
  return (
    <AdminCard surface="subtle">
      <details open>
        <summary
          className="cursor-pointer text-xs font-semibold uppercase tracking-wide select-none"
          style={{ color: 'var(--admin-text)' }}
        >
          What the art shows
        </summary>
        {entries.length === 0 ? (
          <p className="mt-2 text-xs italic m-0" style={{ color: 'var(--admin-text-muted)' }}>
            No identity sheet was accepted in the Workshop.
          </p>
        ) : (
          <dl className="mt-2 grid gap-1.5 m-0">
            {entries.map(([k, v]) => (
              <div key={k} className="grid gap-x-2" style={{ gridTemplateColumns: '38% 1fr' }}>
                <dt
                  className="text-[11px] capitalize"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {k.replace(/([A-Z])/g, ' $1')}
                </dt>
                <dd className="text-[11px] m-0" style={{ color: 'var(--admin-text)' }}>
                  {String(v)}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-2 text-[11px] m-0" style={{ color: 'var(--admin-text-muted)' }}>
          Read from the three images, accepted by hand in the Workshop. This is what the character
          IS — the lore has to agree with it.
        </p>
      </details>
    </AdminCard>
  );
}

function CanonPanel({ archetype }: { archetype: ArchetypeName }) {
  const chapter = ARCHETYPE_BIBLE[archetype];
  if (!chapter) return null;
  return (
    <AdminCard surface="subtle">
      <details>
        <summary
          className="cursor-pointer text-xs font-semibold uppercase tracking-wide select-none"
          style={{ color: 'var(--admin-text)' }}
        >
          {archetype} canon
        </summary>
        <div className="mt-2 grid gap-2 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
          <p className="m-0">
            <strong style={{ color: 'var(--admin-text)' }}>Identity through:</strong>{' '}
            {chapter.identityThrough}
          </p>
          <p className="m-0">
            <strong style={{ color: 'var(--admin-text)' }}>Core fantasy:</strong>{' '}
            {chapter.coreFantasy}
          </p>
          {RANKS.map((rank) => (
            <p key={rank} className="m-0">
              <strong style={{ color: 'var(--admin-text)' }}>{rank}:</strong>{' '}
              {chapter.rankEvolution[rank]}
            </p>
          ))}
        </div>
      </details>
    </AdminCard>
  );
}

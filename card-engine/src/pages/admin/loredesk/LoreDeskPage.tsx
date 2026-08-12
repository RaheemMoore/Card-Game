import { AdminPage, AdminCard, AdminButton, AdminEmptyState, AdminSkeleton, AdminAlert } from '../../../components/admin/ui';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { useLoreDesk } from './useLoreDesk';
import { StoryDesk } from './StoryDesk';

/**
 * The Lore Desk — its own admin page, below the Workshop in the nav (Raheem,
 * 2026-08-11: "make it his own navigation page below the workshop").
 *
 * The Workshop assembles a character's three rank images and an identity
 * sheet, then proposes it. It lands here as `awaiting_lore`. The lore director
 * writes the name and the lore with the character on screen, the Muse beside
 * her, drafts bespoke selection questions from the finished lore, approves the
 * keepers, and confirms — handing the character back to the Workshop's review
 * space as `lore_ready`. Nothing becomes permanent without passing through
 * this desk (Raheem, 2026-08-10).
 *
 * This page replaces the provisional editor that lived in the studio wiki's
 * /work/tori — moved here so both operators use one login-gated surface with
 * the AI proxy on the same origin.
 */
export function LoreDeskPage() {
  const desk = useLoreDesk();

  if (desk.error) {
    return (
      <AdminPage title="Lore Desk">
        <AdminAlert tone="danger" title="The queue could not be read">
          <p className="m-0">{desk.error}</p>
          <AdminButton size="sm" className="mt-2" onClick={desk.reload}>
            Try again
          </AdminButton>
        </AdminAlert>
      </AdminPage>
    );
  }

  if (desk.loading) {
    return (
      <AdminPage title="Lore Desk">
        <AdminSkeleton lines={6} />
      </AdminPage>
    );
  }

  if (desk.draft) {
    return (
      <AdminPage title="Lore Desk">
        <StoryDesk
          character={desk.draft}
          queueCount={desk.queue.length}
          saveState={desk.saveState}
          saveError={desk.saveError}
          onChange={desk.scheduleSave}
          onBack={() => desk.select(null)}
          onConfirm={desk.confirm}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Lore Desk"
      description="Characters the Workshop has proposed, waiting for their story. Open one to write with the art on screen, draft its selection questions from the finished lore, and confirm it back for review."
    >
      {desk.queue.length === 0 ? (
        <AdminEmptyState
          title="Nothing is waiting"
          description="When a character's three images are ready, the Workshop proposes it and it appears here."
        />
      ) : (
        <ul className="grid gap-3 m-0 p-0 list-none" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {desk.queue.map((c) => (
            <QueueCard key={c.id} character={c} onOpen={() => desk.select(c.id)} />
          ))}
        </ul>
      )}
    </AdminPage>
  );
}

function QueueCard({
  character,
  onOpen,
}: {
  character: CuratedCharacter;
  onOpen: () => void;
}) {
  const sendBack = [...(character.reviewThread ?? [])].reverse().find((n) => n.kind === 'send_back');
  const portrait = character.masterArt?.Foundation?.portraitUrl;

  return (
    <AdminCard as="li" padded={false} className="overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--admin-accent)]"
        style={{ gridTemplateColumns: '84px minmax(0, 1fr)', cursor: 'pointer' }}
      >
        {portrait ? (
          <img src={portrait} alt="" aria-hidden="true" className="w-full h-full object-cover" style={{ minHeight: 96 }} />
        ) : (
          <div className="grid place-items-center text-[10px] italic" style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-surface-subtle)' }}>
            no art
          </div>
        )}
        <div className="p-3 min-w-0">
          <p className="m-0 text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
            {character.archetype} proposes a permanent card
          </p>
          <p className="m-0 mt-0.5 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            {character.displayName} · slot {character.slotIndex}
            {character.proposedAt ? ` · sent ${new Date(character.proposedAt).toLocaleDateString()}` : ''}
          </p>
          {sendBack && (
            <p className="m-0 mt-1.5 text-[11px]" style={{ color: 'var(--admin-warning, #d9a94a)' }}>
              Sent back: {sendBack.body}
            </p>
          )}
        </div>
      </button>
    </AdminCard>
  );
}

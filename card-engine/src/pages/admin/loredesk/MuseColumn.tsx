import { Eye, ListChecks } from 'lucide-react';
import type { Rank } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { continuityPrompts, loreIsBlank } from '../../../services/workshop/continuityPrompts';
import { AdminCard } from '../../../components/admin/ui';
import { AssistPanel } from './AssistPanel';

/**
 * The right rail: the Muse, then the two things worth having permanently in
 * the corner of your eye while you write.
 *
 * The suggestion card used to sit alone here with a screen of empty space
 * under it, which meant the column only earned its width after you had spent
 * money. Both panels below are computed locally and update as you type.
 */
export function MuseColumn({
  character,
  problems,
  onJumpToRank,
}: {
  character: CuratedCharacter;
  /** loreProblems output — the confirm gate, mirrored up here. */
  problems: readonly string[];
  onJumpToRank: (rank: Rank) => void;
}) {
  return (
    <div className="grid gap-3 content-start">
      <AssistPanel character={character} onJumpToRank={onJumpToRank} />
      <NotYetInLore character={character} />
      <WhatsLeft problems={problems} />
    </div>
  );
}

/**
 * What the art shows that the writing has not touched.
 *
 * On a blank character this is a palette of everything you have to work with;
 * once you are writing it becomes a drift check. Same list, and the heading
 * changes to say which it is.
 */
function NotYetInLore({ character }: { character: CuratedCharacter }) {
  const prompts = continuityPrompts(character);
  const blank = loreIsBlank(character);

  return (
    <AdminCard surface="subtle" className="grid gap-2">
      <h3
        className="m-0 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: 'var(--admin-text)' }}
      >
        <Eye size={13} style={{ color: 'var(--admin-accent-alt)' }} aria-hidden="true" />
        {blank ? 'What the art gives you' : 'Not yet in the lore'}
      </h3>

      {prompts.length === 0 ? (
        <p className="m-0 text-[11px] italic" style={{ color: 'var(--admin-success)' }}>
          Every fact the art shows is accounted for in what you have written.
        </p>
      ) : (
        <>
          <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
            {blank
              ? 'The paintings hand you these. Free, and it updates as you write.'
              : 'The paintings show these and nothing you have written mentions them. Not a rule — sometimes silence is right.'}
          </p>
          <ul className="grid gap-1.5 m-0 p-0 list-none">
            {prompts.map((p) => (
              <li key={p.id} className="text-[11px] leading-relaxed">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  {p.label}
                </span>
                <br />
                <span style={{ color: 'var(--admin-text)' }}>{p.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </AdminCard>
  );
}

/** The confirm gate, mirrored into the rail so progress is visible without scrolling. */
function WhatsLeft({ problems }: { problems: readonly string[] }) {
  return (
    <AdminCard surface="subtle" className="grid gap-2">
      <h3
        className="m-0 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
        style={{ color: 'var(--admin-text)' }}
      >
        <ListChecks size={13} style={{ color: 'var(--admin-accent-alt)' }} aria-hidden="true" />
        What's left
      </h3>
      {problems.length === 0 ? (
        <p className="m-0 text-[11px]" style={{ color: 'var(--admin-success)' }}>
          Nothing — this is ready to send back for review.
        </p>
      ) : (
        <ul className="grid gap-1 m-0 p-0 list-none">
          {problems.map((p) => (
            <li key={p} className="text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
              ○ {p}
            </li>
          ))}
        </ul>
      )}
    </AdminCard>
  );
}

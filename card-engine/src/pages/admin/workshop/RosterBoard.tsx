import { useMemo, useState } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../../../types/card';
import { ROSTER_SLOTS_PER_ARCHETYPE, type CuratedCharacter } from '../../../types/curatedCard';
import { elementsAvailableToArchetype } from '../../../data/elements';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import {
  AdminCard, AdminSection, AdminButton, AdminAlert, AdminSkeleton, AdminEmptyState,
} from '../../../components/admin/ui';
import { StatusBadge } from '../../../components/admin/workshop';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * Stage 0 — the roster board.
 *
 * Ten slots per archetype down, that archetype's elements across, so both
 * things an operator needs are on one screen: where each character sits in the
 * pipeline, and which element variants exist.
 *
 * It makes the roster's lopsidedness visible ON PURPOSE. Elements per archetype
 * run from 1 (Human) to 8 (Monk), so ten characters each yields 10 permanent
 * Human cards and 80 Monk ones. That imbalance falls out of data authored for
 * player choice, not for roster spread, and it should be a decision rather than
 * something discovered in month four.
 */

export function RosterBoard({ onOpenCharacter }: { onOpenCharacter?: (id: string) => void }) {
  const { loading, error, reload } = useCuratedRoster();
  const store = getCuratedRosterStore();
  const [archetype, setArchetype] = useState<ArchetypeName>('Lycanthrope');

  const elements = useMemo(() => elementsAvailableToArchetype(archetype), [archetype]);
  const characters = store.getCharactersForArchetype(archetype);
  const projectedTotal = useMemo(
    () => ARCHETYPE_NAMES.reduce(
      (sum, a) => sum + elementsAvailableToArchetype(a).length * ROSTER_SLOTS_PER_ARCHETYPE, 0),
    [],
  );

  if (error) {
    return (
      <AdminAlert tone="danger" title="The roster could not be read">
        <p className="mb-2">{error}</p>
        <p className="mb-3">
          Nothing is shown below because nothing was read. An empty roster and an unreadable one look
          identical on screen and mean opposite things, so this page will not draw a board it cannot
          back with data.
        </p>
        <AdminButton size="sm" onClick={reload}>Try again</AdminButton>
      </AdminAlert>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {ARCHETYPE_NAMES.map((a) => {
          const count = elementsAvailableToArchetype(a).length;
          const slots = count * ROSTER_SLOTS_PER_ARCHETYPE;
          const selected = a === archetype;
          return (
            <button
              key={a}
              type="button"
              aria-pressed={selected}
              onClick={() => setArchetype(a)}
              // The archetype NAME has to lead the accessible name. A bare title
              // attribute would replace it, leaving a screen reader to announce
              // "4 elements, up to 40 cards" with no idea which archetype.
              aria-label={`${a} — ${count} element${count === 1 ? '' : 's'}, up to ${slots} permanent cards`}
              style={{
                background: selected ? 'var(--admin-active-wash)' : 'var(--admin-surface-strong)',
                border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                borderRadius: 999,
                color: selected ? 'var(--admin-text)' : 'var(--admin-text-muted)',
              }}
              className="px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            >
              {a}
              <span className="ml-1.5 text-[10px] tabular-nums opacity-75">{slots}</span>
            </button>
          );
        })}
      </div>

      <AdminSection
        title={`${archetype} — ${ROSTER_SLOTS_PER_ARCHETYPE} slots × ${elements.length} element${elements.length === 1 ? '' : 's'}`}
        subtitle={`${store.getPermanentVariants().length} permanent of ${projectedTotal} possible across every archetype`}
      >
        <AdminCard padded={false}>
          {loading ? (
            <div className="p-4"><AdminSkeleton lines={6} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <Th className="w-10">#</Th>
                    <Th>Character</Th>
                    <Th>Status</Th>
                    {elements.map((e) => <Th key={e}>{e}</Th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: ROSTER_SLOTS_PER_ARCHETYPE }, (_, i) => i + 1).map((slot) => {
                    const character = characters.find((c) => c.slotIndex === slot);
                    return (
                      <SlotRow
                        key={slot}
                        slot={slot}
                        character={character}
                        elements={elements}
                        variantStatus={
                          character
                            ? new Map(store.getVariantsForCharacter(character.id).map((v) => [v.element as string, v.status]))
                            : new Map()
                        }
                        onOpen={onOpenCharacter}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </AdminSection>

      {!loading && characters.length === 0 && (
        <AdminCard surface="subtle">
          <AdminEmptyState
            title={`No ${archetype} characters yet`}
            description="Start one at the bench, or bring three images you have already made."
          />
        </AdminCard>
      )}
    </>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${className}`}
      style={{ color: 'var(--admin-text-muted)', background: 'var(--admin-surface-subtle)' }}
    >
      {children}
    </th>
  );
}

function SlotRow({
  slot, character, elements, variantStatus, onOpen,
}: {
  slot: number;
  character: CuratedCharacter | undefined;
  elements: readonly string[];
  variantStatus: Map<string, string>;
  onOpen?: (id: string) => void;
}) {
  return (
    <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
      <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--admin-text-muted)' }}>{slot}</td>
      <td className="px-3 py-2">
        {character ? (
          <button
            type="button"
            onClick={() => onOpen?.(character.id)}
            className="font-medium text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-accent)]"
            style={{ color: 'var(--admin-text)' }}
          >
            {character.displayName || character.id}
          </button>
        ) : (
          <span className="italic" style={{ color: 'var(--admin-text-muted)' }}>empty</span>
        )}
      </td>
      <td className="px-3 py-2"><StatusBadge status={character?.status ?? 'empty'} /></td>
      {elements.map((element) => {
        const status = variantStatus.get(element) ?? 'none';
        const colour =
          status === 'permanent' ? 'var(--admin-success)'
          : status === 'none' ? 'rgba(255,255,255,0.16)'
          : 'var(--admin-accent)';
        return (
          <td key={element} className="px-3 py-2">
            <span
              aria-hidden="true"
              className="inline-block rounded-full"
              style={{ width: 9, height: 9, background: colour }}
            />
            <span className="sr-only">{element}: {status === 'none' ? 'not started' : status}</span>
          </td>
        );
      })}
    </tr>
  );
}

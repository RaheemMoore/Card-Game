import { useMemo, useState } from 'react';
import { ARCHETYPE_NAMES, type ArchetypeName } from '../../../types/card';
import {
  ROSTER_SLOTS_PER_ARCHETYPE,
  type CuratedCharacter,
  type CuratedVariant,
} from '../../../types/curatedCard';
import { elementsAvailableToArchetype } from '../../../data/elements';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { WkPanel, WkStatus, WkEmpty } from '../../../components/workshop/ui';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * Stage 0 — the roster board.
 *
 * The Workshop's home. Ten slots per archetype down, that archetype's elements
 * across, so the two things an operator needs to see at a glance are both on
 * one screen: where each character is in the pipeline, and which element
 * variants exist.
 *
 * It also makes the lopsidedness visible ON PURPOSE. Elements per archetype
 * range from 1 (Human) to 8 (Monk), so ten characters each produces 10
 * permanent Human cards and 80 Monk ones. That imbalance is a consequence of
 * data authored for player choice, not roster spread, and it should be a
 * decision rather than a surprise discovered in month four — so the tab shows
 * the projected card count and the header says the total out loud.
 */

export function RosterBoard({ onOpenCharacter }: { onOpenCharacter?: (id: string) => void }) {
  const { loading, error, reload } = useCuratedRoster();
  const store = getCuratedRosterStore();
  const [archetype, setArchetype] = useState<ArchetypeName>('Lycanthrope');

  const elements = useMemo(() => elementsAvailableToArchetype(archetype), [archetype]);
  const characters = store.getCharactersForArchetype(archetype);

  const projectedTotal = useMemo(
    () =>
      ARCHETYPE_NAMES.reduce(
        (sum, a) => sum + elementsAvailableToArchetype(a).length * ROSTER_SLOTS_PER_ARCHETYPE,
        0,
      ),
    [],
  );

  const permanentCount = store.getPermanentVariants().length;

  if (error) {
    return (
      <WkPanel title="The roster could not be read">
        <p style={{ color: 'var(--wk-danger)', fontSize: 13, margin: '0 0 12px' }}>{error}</p>
        <p style={{ color: 'var(--wk-muted)', fontSize: 13, margin: '0 0 14px' }}>
          Nothing is shown below because nothing was successfully read. An empty roster and an
          unreadable one look identical on screen and mean opposite things, so this page refuses to
          render a board that would imply the roster is empty.
        </p>
        <button type="button" className="wk-tab" onClick={reload}>
          Try again
        </button>
      </WkPanel>
    );
  }

  return (
    <>
      <div className="wk-archetype-tabs">
        {ARCHETYPE_NAMES.map((a) => {
          const slots = elementsAvailableToArchetype(a).length * ROSTER_SLOTS_PER_ARCHETYPE;
          const elementCount = elementsAvailableToArchetype(a).length;
          return (
            <button
              key={a}
              type="button"
              className="wk-tab"
              aria-pressed={a === archetype}
              onClick={() => setArchetype(a)}
              // The archetype NAME has to lead the accessible name. A bare
              // `title` would replace it entirely, leaving a screen reader to
              // announce "4 elements, up to 40 permanent cards" with no way to
              // tell which archetype that is.
              aria-label={`${a} — ${elementCount} element${elementCount === 1 ? '' : 's'}, up to ${slots} permanent cards`}
            >
              {a}
              <span className="wk-tab-count">{slots}</span>
            </button>
          );
        })}
      </div>

      <WkPanel
        title={`${archetype} — ${ROSTER_SLOTS_PER_ARCHETYPE} slots × ${elements.length} element${elements.length === 1 ? '' : 's'}`}
        action={
          <span style={{ fontSize: 11, color: 'var(--wk-muted)' }}>
            {permanentCount} permanent of {projectedTotal} possible
          </span>
        }
      >
        {loading ? (
          <p style={{ color: 'var(--wk-muted)', fontSize: 13, margin: 0 }}>Reading the roster…</p>
        ) : (
          <div className="wk-matrix-scroll">
            <table className="wk-matrix">
              <thead>
                <tr>
                  <th scope="col" className="wk-slot-index">
                    #
                  </th>
                  <th scope="col">Character</th>
                  <th scope="col">Status</th>
                  {elements.map((e) => (
                    <th key={e} scope="col">
                      {e}
                    </th>
                  ))}
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
                      variants={character ? store.getVariantsForCharacter(character.id) : []}
                      onOpen={onOpenCharacter}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </WkPanel>

      {!loading && characters.length === 0 ? (
        <div style={{ marginTop: 18 }}>
          <WkEmpty title={`No ${archetype} characters yet`}>
            Start one at the bench, or bring three images you have already made.
          </WkEmpty>
        </div>
      ) : null}
    </>
  );
}

function SlotRow({
  slot,
  character,
  elements,
  variants,
  onOpen,
}: {
  slot: number;
  character: CuratedCharacter | undefined;
  elements: readonly string[];
  variants: CuratedVariant[];
  onOpen?: (id: string) => void;
}) {
  const byElement = new Map(variants.map((v) => [v.element as string, v]));

  return (
    <tr>
      <td className="wk-slot-index">{slot}</td>
      <td className={character ? 'wk-slot-name' : 'wk-slot-empty'}>
        {character ? (
          onOpen ? (
            <button
              type="button"
              onClick={() => onOpen(character.id)}
              style={{
                background: 'none',
                border: 0,
                padding: 0,
                color: 'inherit',
                font: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {character.displayName || character.id}
            </button>
          ) : (
            (character.displayName || character.id)
          )
        ) : (
          'empty'
        )}
      </td>
      <td>
        <WkStatus value={character?.status ?? 'empty'} />
      </td>
      {elements.map((element) => {
        const variant = byElement.get(element);
        const state = variant?.status ?? 'none';
        return (
          <td key={element}>
            <span
              className={
                state === 'permanent'
                  ? 'wk-variant-dot wk-variant-dot-permanent'
                  : state === 'none'
                    ? 'wk-variant-dot'
                    : 'wk-variant-dot wk-variant-dot-draft'
              }
              aria-hidden="true"
            />
            <span className="sr-only">
              {element}: {state === 'none' ? 'not started' : state}
            </span>
          </td>
        );
      })}
    </tr>
  );
}

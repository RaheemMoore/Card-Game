import { useMemo, useState } from 'react';
import { RANKS, type Rank } from '../../../types/card';
import { ELEMENT_BONDS, type ElementBond, type ElementName } from '../../../types/bible';
import {
  curatedVariantId, type CuratedCharacter, type CuratedRankArt, type CuratedVariant,
} from '../../../types/curatedCard';
import { elementsAvailableToArchetype, bucketFor } from '../../../data/elements';
import { getQuestionsForArchetype, getOptionsForQuestion } from '../../../data/storyPillars';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import { uploadRankArtFile } from '../../../services/workshop/curatedArt';
import { checkPermanence } from '../../../services/workshop/permanenceGate';
import {
  AdminCard, AdminSection, AdminButton, AdminSelect, AdminTextArea, AdminAlert,
} from '../../../components/admin/ui';
import {
  Triptych, ImageDrop, Checklist, StatusBadge, StageIntro,
} from '../../../components/admin/workshop';

/**
 * Stage 6 — variants, and the only place a card becomes permanent.
 *
 * One character becomes many cards: the same person made again in every element
 * the archetype allows. Each is published on its own, so a Monk with eight
 * elements never waits on all eight before any of them can ship.
 *
 * Publishing is gated by services/workshop/permanenceGate. The checklist here
 * renders that gate's reasons rather than a disabled button with no cause —
 * and it names the owner of each unmet item, because "waiting on Tori" is a
 * status, not a failure.
 */

export function Variants({ character }: { character: CuratedCharacter }) {
  const store = getCuratedRosterStore();
  const elements = useMemo(
    () => elementsAvailableToArchetype(character.archetype),
    [character.archetype],
  );
  const existing = store.getVariantsForCharacter(character.id);
  const [openElement, setOpenElement] = useState<ElementName | null>(null);

  const permanentCount = existing.filter((v) => v.status === 'permanent').length;

  return (
    <div className="grid gap-4">
      <StageIntro
        step="06"
        title="Versions — the same character, once for every element"
        next="each version you publish becomes a card players can actually get."
      >
        <p className="m-0 mb-2">
          {character.archetype} allows <strong>{elements.length} element
          {elements.length === 1 ? '' : 's'}</strong>, so this character can become{' '}
          {elements.length} card{elements.length === 1 ? '' : 's'}. Same person, same story &mdash;
          the element is how their power shows up.
        </p>
        <p className="m-0">
          A version can reuse the character&rsquo;s three pictures, or bring its own if you made
          element-specific art. Publish them one at a time; there is no need to finish all of them.
        </p>
      </StageIntro>

      <AdminSection
        title={`${character.lore?.cardName || character.displayName} — ${elements.length} possible version${elements.length === 1 ? '' : 's'}`}
        subtitle={`${permanentCount} published so far.`}
        actions={<StatusBadge status={character.status} />}
      >
        <AdminCard padded={false}>
          <ul>
            {elements.map((element, i) => {
              const variant = existing.find((v) => v.element === element);
              const isOpen = openElement === element;
              return (
                <li key={element} style={{ borderTop: i === 0 ? undefined : '1px solid var(--admin-border)' }}>
                  <button
                    type="button"
                    onClick={() => setOpenElement(isOpen ? null : element)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                    style={{ background: isOpen ? 'var(--admin-active-wash)' : undefined }}
                  >
                    <span className="text-sm font-medium flex-1" style={{ color: 'var(--admin-text)' }}>
                      {element}
                      {bucketFor(character.archetype, element) === 'rare' && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
                          rare
                        </span>
                      )}
                    </span>
                    {variant ? <StatusBadge status={variant.status} /> : (
                      <span className="text-xs italic" style={{ color: 'var(--admin-text-muted)' }}>Not started</span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4">
                      <VariantEditor character={character} element={element} variant={variant} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </AdminCard>
      </AdminSection>
    </div>
  );
}

// ---------------------------------------------------------------------------

function VariantEditor({
  character, element, variant,
}: {
  character: CuratedCharacter;
  element: ElementName;
  variant: CuratedVariant | undefined;
}) {
  const store = getCuratedRosterStore();
  const [busy, setBusy] = useState(false);
  const [busyRank, setBusyRank] = useState<Rank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(variant?.signOff?.note ?? '');

  const draft: CuratedVariant = variant ?? {
    id: curatedVariantId(character.id, element),
    characterId: character.id,
    element,
    bond: ELEMENT_BONDS[0],
    status: 'draft',
    artMode: 'derived',
    ranks: {},
  };

  const siblings = store.getCharactersForArchetype(character.archetype);
  const questions = getQuestionsForArchetype(character.archetype);
  const optionCounts = useMemo(() => Object.fromEntries(
    questions.map((q) => [q.id, getOptionsForQuestion(character.archetype, q.id).length]),
  ), [questions, character.archetype]);

  // The gate is evaluated against the variant AS IT WOULD BE once signed, so
  // the checklist shows what publishing actually needs rather than what the
  // half-filled form happens to contain.
  const gate = checkPermanence({
    character,
    variant: {
      ...draft,
      signOff: note.trim()
        ? { by: getCurrentUser()?.email ?? 'unknown', at: new Date().toISOString(), note: note.trim() }
        : draft.signOff,
    },
    questionIds: questions.map((q) => q.id),
    siblings,
    optionCounts,
  });

  const save = async (patch: Partial<CuratedVariant>) => {
    setBusy(true);
    setError(null);
    try {
      await store.saveVariant({ ...draft, ...patch });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadBespoke = async (rank: Rank, file: File) => {
    setBusyRank(rank);
    setError(null);
    try {
      const art = await uploadRankArtFile({
        characterId: character.id, scope: element, rank, file,
      });
      const ranks: Partial<Record<Rank, CuratedRankArt>> = { ...draft.ranks, [rank]: art };
      await store.saveVariant({ ...draft, artMode: 'bespoke', ranks });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyRank(null);
    }
  };

  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      await store.saveVariant({
        ...draft,
        status: 'permanent',
        signOff: {
          by: getCurrentUser()?.email ?? 'unknown',
          at: new Date().toISOString(),
          note: note.trim(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const shownArt = draft.artMode === 'derived' ? (character.masterArt ?? {}) : draft.ranks;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <AdminCard surface="subtle">
          <Triptych art={shownArt} />
          <div className="grid gap-3 mt-3">
            <AdminSelect
              label="Where this version's pictures come from"
              value={draft.artMode}
              disabled={busy}
              hint={draft.artMode === 'derived'
                ? 'Reusing the character’s three pictures. Fine when the element does not change how they look.'
                : 'This version has its own art. Upload all three below.'}
              onChange={(e) => void save({ artMode: e.target.value as CuratedVariant['artMode'] })}
            >
              <option value="derived">Reuse the character&rsquo;s pictures</option>
              <option value="bespoke">Its own pictures for this element</option>
            </AdminSelect>

            <AdminSelect
              label="Bond"
              value={draft.bond}
              disabled={busy}
              hint="How this character feels about their element."
              onChange={(e) => void save({ bond: e.target.value as ElementBond })}
            >
              {ELEMENT_BONDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </AdminSelect>

            <AdminTextArea
              label="Element note"
              rows={2}
              defaultValue={draft.elementLore ?? ''}
              placeholder={`A line on how ${element} shows up in them`}
              hint="Optional, and short. Same person — this is an addendum, not a rewrite."
              disabled={busy}
              onBlur={(e) => void save({ elementLore: e.target.value })}
            />
          </div>
        </AdminCard>

        <div className="grid gap-4">
          {draft.artMode === 'bespoke' && (
            <AdminCard surface="subtle">
              <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--admin-text)' }}>
                {element} pictures
              </h4>
              <div className="grid gap-3 sm:grid-cols-3">
                {RANKS.map((rank) => (
                  <ImageDrop
                    key={rank}
                    label={rank}
                    currentUrl={draft.ranks[rank]?.portraitUrl}
                    busy={busyRank === rank}
                    onFile={(file) => void uploadBespoke(rank, file)}
                    onReplace={() => void save({ ranks: { ...draft.ranks, [rank]: undefined } })}
                  />
                ))}
              </div>
            </AdminCard>
          )}

          <AdminCard surface="subtle">
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--admin-text)' }}>
              Before this becomes permanent
            </h4>
            <p className="text-[11px] mb-3 m-0" style={{ color: 'var(--admin-text-muted)' }}>
              {gate.ok
                ? 'Everything is in place.'
                : gate.waitingOn === 'lore'
                  ? 'Waiting on the lore director — that is a status, not a problem to fix here.'
                  : gate.waitingOn === 'review'
                    ? 'Waiting on a decision in the review space.'
                    : 'Some of this is yours to finish.'}
            </p>
            <Checklist items={gate.criteria} />
          </AdminCard>
        </div>
      </div>

      <AdminCard>
        {draft.status === 'permanent' ? (
          <>
            <AdminAlert tone="success" title="This card is in the game">
              Published by {draft.signOff?.by} on{' '}
              {draft.signOff?.at ? new Date(draft.signOff.at).toLocaleDateString() : 'an unknown date'}.
              {draft.signOff?.note ? ` “${draft.signOff.note}”` : ''}
            </AdminAlert>
            <AdminButton
              className="mt-3"
              disabled={busy}
              onClick={() => void save({ status: 'hidden' })}
            >
              Take it out of the game
            </AdminButton>
          </>
        ) : (
          <>
            <AdminTextArea
              label="Sign your name to it"
              rows={2}
              value={note}
              placeholder="Why this one is good enough to keep"
              hint="Required. In six months this is the reason this card exists."
              disabled={busy}
              onChange={(e) => setNote(e.target.value)}
            />
            {error && <div className="mt-3"><AdminAlert tone="danger">{error}</AdminAlert></div>}
            <div className="mt-3">
              <AdminButton
                variant="primary"
                disabled={busy || !gate.ok}
                onClick={() => void publish()}
              >
                {busy ? 'Publishing…' : `Make ${element} permanent`}
              </AdminButton>
            </div>
            {!gate.ok && (
              <p className="mt-2 text-[11px] m-0" style={{ color: 'var(--admin-text-muted)' }}>
                {gate.blocking.length} thing{gate.blocking.length === 1 ? '' : 's'} still missing —
                listed above.
              </p>
            )}
          </>
        )}
      </AdminCard>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { getCurrentUser } from '../../../services/persistence/supabaseClient';
import { withTiebreaker } from '../../../services/workshop/loreReadiness';
import { useCuratedRoster } from '../workshop/useCuratedRoster';
import { devSeedRoster } from './devSeed';
import type { SaveState } from '../../../components/admin/workshop';

/**
 * The Lore Desk's data spine.
 *
 * Same semantics the wiki desk had: proposals are `awaiting_lore` oldest
 * first, edits autosave on a 700 ms debounce through the roster store's
 * direct write (reject loudly, never queue), and confirming stamps the lore,
 * appends a LoreDraft, fills the structural tiebreaker, and hands the
 * character back to the Workshop as `lore_ready`.
 */
export function useLoreDesk() {
  const store = getCuratedRosterStore();
  // DEV-only named scenario: seed one deterministic proposal so the desk can
  // be exercised without Supabase keys. Synchronous, before useCuratedRoster's
  // effect runs, so hydrate() is never attempted over the seam. The DEV guard
  // is a compile-time constant, so the fixture branch is dropped from
  // production builds.
  if (import.meta.env.DEV && !store.isHydrated()
      && new URLSearchParams(window.location.search).get('dev_seed') === '1') {
    store.seedForTest(devSeedRoster());
  }
  const roster = useCuratedRoster();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  // Local mirror of the selected character so typing is synchronous while the
  // debounced write is in flight.
  const [draft, setDraft] = useState<CuratedCharacter | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queue = store
    .getAllCharacters()
    .filter((c) => c.status === 'awaiting_lore')
    .sort((a, b) => (a.proposedAt ?? '').localeCompare(b.proposedAt ?? ''));

  // Heal the selection when the chosen proposal leaves the queue — confirming
  // removes it, and a detail pinned to a vanished row is the classic
  // master/detail bug.
  useEffect(() => {
    if (selectedId && !queue.some((c) => c.id === selectedId)) {
      setSelectedId(null);
      setDraft(null);
    }
  }, [queue, selectedId]);

  const select = useCallback(
    (id: string | null) => {
      if (timer.current) clearTimeout(timer.current);
      setSelectedId(id);
      setDraft(id ? (getCuratedRosterStore().getCharacter(id) ?? null) : null);
      setSaveState('idle');
      setSaveError(null);
    },
    [],
  );

  const scheduleSave = useCallback((next: CuratedCharacter) => {
    setDraft(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState('saving');
      getCuratedRosterStore()
        .saveCharacter(next)
        .then(() => {
          setSaveState('saved');
          setSaveError(null);
        })
        .catch((err: unknown) => {
          setSaveState('error');
          setSaveError(err instanceof Error ? err.message : String(err));
        });
    }, 700);
  }, []);

  // Flush rather than drop on unmount — leaving mid-sentence must not lose
  // the sentence.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const confirm = useCallback(async (): Promise<void> => {
    if (!draft) return;
    if (timer.current) clearTimeout(timer.current);
    const author = getCurrentUser()?.email ?? 'lore desk';
    const now = new Date().toISOString();
    const confirmed: CuratedCharacter = withTiebreaker({
      ...draft,
      status: 'lore_ready',
      loreConfirmedBy: author,
      loreConfirmedAt: now,
      loreDrafts: [
        ...(draft.loreDrafts ?? []),
        {
          id: `draft_${now}`,
          authoredAt: now,
          author,
          cardName: draft.lore?.cardName ?? '',
          nameAndTitle: draft.lore?.nameAndTitle ?? '',
          rankLore: { ...(draft.lore?.rankLore ?? {}) },
        },
      ],
    });
    await getCuratedRosterStore().saveCharacter(confirmed);
    setSelectedId(null);
    setDraft(null);
  }, [draft]);

  // The other characters in this archetype — who the tiebreaker questions
  // must separate her from, and whose names a new name must not collide with.
  const siblings = draft
    ? store.getCharactersForArchetype(draft.archetype).filter((c) => c.id !== draft.id)
    : [];

  return {
    loading: roster.loading,
    error: roster.error,
    reload: roster.reload,
    queue,
    siblings,
    selectedId,
    select,
    draft,
    scheduleSave,
    saveState,
    saveError,
    confirm,
  };
}

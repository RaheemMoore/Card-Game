import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Feather, RefreshCw, Shield, ChevronDown } from 'lucide-react';
import { Panel } from './components';
import {
  listLoreProposals,
  saveCharacterLore,
  confirmCharacterLore,
  ensureViewerSession,
  canWriteLore,
  isStudioDataConfigured,
  type LoreProposal,
} from './studioApi';
import { useStudioSession, StudioSignIn } from './studioSession';
import type { CuratedCharacter, AnswerBinding } from '../../card-engine/src/types/curatedCard';
import type { ArchetypeName, Rank } from '../../card-engine/src/types/card';
import {
  getQuestionsForArchetype,
  getOptionsForQuestion,
} from '../../card-engine/src/data/storyPillars';
import { ARCHETYPE_BIBLE } from '../../card-engine/src/data/archetypeBible';

/**
 * Tori's lore desk.
 *
 * The Workshop assembles a character's three rank images and an identity sheet
 * describing them, then sends it here. She writes the name and the lore, and
 * claims which Story Pillar answers lead a player to this character. Confirming
 * hands it back for final review. Nothing becomes permanent without passing
 * through her (Raheem, 2026-08-10).
 *
 * ⚠ THIS EDITOR IS PROVISIONAL AND MUST NOT BE TREATED AS FINISHED.
 *
 * Raheem: *"we need to ensure that the editor being used by Tori is gonna be
 * good. So we're gonna design that after… we'll go design the editor and review
 * it in her workspace and make sure she has all the tools she needs there."*
 *
 * What exists here is the PIPE — proposals arrive, lore can be written, the
 * loop closes. The writing surface itself gets a dedicated design pass with
 * Tori in the room, once she has used this enough to have opinions grounded in
 * use rather than guesses. Provisional tools have a way of becoming permanent
 * by neglect; this comment is here so that cannot happen quietly.
 */

const RANKS: readonly Rank[] = ['Foundation', 'Forged', 'Ascendant'];

export function LoreDesk() {
  const { session, checking } = useStudioSession();
  const [opening, setOpening] = useState(true);
  const [showSignIn, setShowSignIn] = useState(false);

  // No login form to read the desk (Raheem, 2026-08-10). An anonymous Supabase
  // session is still `authenticated` as far as the read policy is concerned, so
  // the page opens by itself. Writing still needs a real account — see
  // ensureViewerSession's comment for why that line is drawn where it is.
  useEffect(() => {
    if (checking) return;
    if (session) { setOpening(false); return; }
    let cancelled = false;
    void ensureViewerSession().finally(() => { if (!cancelled) setOpening(false); });
    return () => { cancelled = true; };
  }, [checking, session]);

  if (!isStudioDataConfigured()) {
    return (
      <Panel className="studio-service-note">
        <p>
          The proposal desk needs the Studio data service. This deployment has no Supabase
          configuration, so nothing is shown rather than an empty desk that would look like no work
          is waiting.
        </p>
      </Panel>
    );
  }
  if (checking || opening) {
    return (
      <Panel className="review-loading">
        <RefreshCw className="spin" />
        Opening the proposal desk…
      </Panel>
    );
  }
  if (!session) {
    // The automatic session failed — usually anonymous sign-ins being off.
    // Fall back to the form rather than an empty desk.
    return <StudioSignIn purpose="The desk could not open on its own." />;
  }

  const writable = canWriteLore(session);
  return (
    <>
      {!writable ? (
        <Panel className="lore-readonly">
          <Shield />
          <div>
            <p className="eyebrow">READ ONLY</p>
            <h2>You can see everything here, but not change it.</h2>
            <p>
              Anyone can read the desk. Saving lore needs a Studio account with the admin or
              lore-director role — this wiki is public, and its key ships in the browser.
            </p>
            {showSignIn ? null : (
              <button className="studio-signout" onClick={() => setShowSignIn(true)}>
                Sign in to edit
              </button>
            )}
          </div>
        </Panel>
      ) : null}
      {showSignIn && !writable ? (
        <StudioSignIn purpose="Signing in lets you write and confirm lore." />
      ) : null}
      <ProposalWorkspace writable={writable} />
    </>
  );
}

function ProposalWorkspace({ writable }: { writable: boolean }) {
  const [proposals, setProposals] = useState<LoreProposal[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listLoreProposals();
      setProposals(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Heal the selection when the chosen proposal leaves the queue — confirming
  // one removes it, and a detail panel pinned to a row that no longer exists is
  // the classic master/detail bug.
  useEffect(() => {
    if (selectedId && proposals && !proposals.some((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }, [proposals, selectedId]);

  const selected = proposals?.find((p) => p.id === selectedId) ?? null;

  if (error) {
    return (
      <Panel>
        <h2>The proposals could not be read</h2>
        <p>{error}</p>
        <button className="studio-signout" onClick={() => void load()}>Try again</button>
      </Panel>
    );
  }
  if (!proposals) {
    return (
      <Panel className="review-loading">
        <RefreshCw className="spin" />
        Reading the queue…
      </Panel>
    );
  }

  return (
    <>
      <Panel
        title={`Cards waiting on you (${proposals.length})`}
        action={<button className="studio-signout" onClick={() => void load()}>Refresh</button>}
      >
        {proposals.length === 0 ? (
          <p>
            Nothing is waiting. When a character's three images are ready, the Workshop sends it
            here and it appears at the top of this list.
          </p>
        ) : (
          <ul className="lore-proposal-list">
            {proposals.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-current={p.id === selectedId ? 'true' : undefined}
                  onClick={() => setSelectedId(p.id)}
                >
                  <img
                    src={p.character.masterArt?.Foundation?.portraitUrl}
                    alt=""
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{p.archetype} proposes a permanent card</strong>
                    <small>
                      {p.displayName} · slot {p.slotIndex}
                      {p.proposedAt ? ` · sent ${new Date(p.proposedAt).toLocaleDateString()}` : ''}
                    </small>
                    {lastSendBack(p.character) ? (
                      <em className="lore-sendback">Sent back: {lastSendBack(p.character)}</em>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {selected ? <LoreEditor key={selected.id} proposal={selected} writable={writable} onDone={() => void load()} /> : null}
    </>
  );
}

function lastSendBack(character: CuratedCharacter): string | null {
  const notes = character.reviewThread ?? [];
  for (let i = notes.length - 1; i >= 0; i -= 1) {
    if (notes[i].kind === 'send_back') return notes[i].body;
  }
  return null;
}

// ---------------------------------------------------------------------------

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function LoreEditor({ proposal, writable, onDone }: { proposal: LoreProposal; writable: boolean; onDone: () => void }) {
  const [character, setCharacter] = useState<CuratedCharacter>(proposal.character);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const archetype = proposal.archetype as ArchetypeName;
  const chapter = ARCHETYPE_BIBLE[archetype];
  const questions = useMemo(() => getQuestionsForArchetype(archetype), [archetype]);

  // 700 ms debounce, same as Raheem's notebook. Save on unmount too, so
  // clicking to another proposal mid-sentence does not drop the sentence.
  const scheduleSave = useCallback((next: CuratedCharacter) => {
    setCharacter(next);
    // A read-only viewer can still type — it just never persists. Firing the
    // save would produce an RLS rejection they can do nothing about, and a red
    // error on a page they were only reading.
    if (!writable) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState('saving');
      saveCharacterLore(next)
        .then(() => { setSaveState('saved'); setError(null); })
        .catch((err: unknown) => {
          setSaveState('error');
          setError(err instanceof Error ? err.message : String(err));
        });
    }, 700);
  }, [writable]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setLore = (patch: Partial<NonNullable<CuratedCharacter['lore']>>) => {
    const lore = {
      cardName: '', nameAndTitle: '', rankLore: {},
      ...(character.lore ?? {}),
      ...patch,
    };
    scheduleSave({ ...character, lore });
  };

  const setRankLore = (rank: Rank, text: string) => {
    const lore = {
      cardName: '', nameAndTitle: '',
      ...(character.lore ?? {}),
      rankLore: { ...(character.lore?.rankLore ?? {}), [rank]: text },
    };
    scheduleSave({ ...character, lore });
  };

  const toggleClaim = (questionId: string, optionId: string) => {
    const existing = character.answerBindings ?? [];
    const found = existing.find((b) => b.questionId === questionId);
    let next: AnswerBinding[];
    if (!found) {
      next = [...existing, { questionId, optionIds: [optionId], weight: 10 }];
    } else if (found.optionIds.includes(optionId)) {
      const optionIds = found.optionIds.filter((id) => id !== optionId);
      next = optionIds.length
        ? existing.map((b) => (b.questionId === questionId ? { ...b, optionIds } : b))
        : existing.filter((b) => b.questionId !== questionId);
    } else {
      next = existing.map((b) =>
        b.questionId === questionId ? { ...b, optionIds: [...b.optionIds, optionId] } : b,
      );
    }
    scheduleSave({ ...character, answerBindings: next });
  };

  const claimed = (questionId: string, optionId: string) =>
    (character.answerBindings ?? [])
      .find((b) => b.questionId === questionId)?.optionIds.includes(optionId) ?? false;

  const problems = loreProblems(character, questions.map((q) => q.id));

  const confirm = async () => {
    setConfirming(true);
    setError(null);
    try {
      if (timer.current) clearTimeout(timer.current);
      await confirmCharacterLore(withTiebreaker(character));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Panel
      title={`${proposal.displayName} — ${archetype}`}
      action={<SaveChip state={saveState} error={error} />}
    >
      <div className="lore-editor">
        <div className="lore-triptych">
          {RANKS.map((rank) => {
            const url = character.masterArt?.[rank]?.portraitUrl;
            return (
              <figure key={rank}>
                {url ? <img src={url} alt={`${rank} portrait`} /> : <div className="lore-gap">Not supplied</div>}
                <figcaption>{rank}</figcaption>
              </figure>
            );
          })}
        </div>

        <details className="lore-sheet">
          <summary>What the art shows <ChevronDown aria-hidden="true" /></summary>
          <dl>
            {Object.entries(character.identity ?? {})
              .filter(([, v]) => typeof v === 'string' && v.trim())
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k.replace(/([A-Z])/g, ' $1')}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
          <p className="lore-note">
            Read from the three images, then accepted by hand in the Workshop. This is what the
            character IS — the lore has to agree with it.
          </p>
        </details>

        <section className="lore-fields">
          <label>
            <span>Card name</span>
            <input
              value={character.lore?.cardName ?? ''}
              placeholder="What players will call them"
              onChange={(e) => setLore({ cardName: e.target.value })}
            />
          </label>
          <label>
            <span>Name and title</span>
            <input
              value={character.lore?.nameAndTitle ?? ''}
              placeholder="Name, the Something"
              onChange={(e) => setLore({ nameAndTitle: e.target.value })}
            />
          </label>
          <label>
            <span>Premise</span>
            <textarea
              rows={2}
              value={character.coreLore ?? ''}
              placeholder="One line: who is this?"
              onChange={(e) => scheduleSave({ ...character, coreLore: e.target.value })}
            />
          </label>
          {RANKS.map((rank) => (
            <label key={rank}>
              <span>{rank}</span>
              <textarea
                rows={4}
                value={character.lore?.rankLore?.[rank] ?? ''}
                placeholder={`Who they are at ${rank}`}
                onChange={(e) => setRankLore(rank, e.target.value)}
              />
            </label>
          ))}
        </section>

        {chapter ? (
          <details className="lore-sheet">
            <summary>{archetype} canon <ChevronDown aria-hidden="true" /></summary>
            <p><strong>Identity through:</strong> {chapter.identityThrough}</p>
            <p><strong>Core fantasy:</strong> {chapter.coreFantasy}</p>
            <p><strong>Rank evolution</strong></p>
            <ul>
              <li><strong>Foundation:</strong> {chapter.rankEvolution.Foundation}</li>
              <li><strong>Forged:</strong> {chapter.rankEvolution.Forged}</li>
              <li><strong>Ascendant:</strong> {chapter.rankEvolution.Ascendant}</li>
            </ul>
          </details>
        ) : null}

        <section className="lore-claims">
          <h3>Which answers lead to this character?</h3>
          <p className="lore-note">
            A player answers these on their way in. Claim the ones that are true of this character —
            those answers are how they find each other. Every question needs at least one.
          </p>
          {questions.map((q) => (
            <details key={q.id} open>
              <summary>{q.prompt} <ChevronDown aria-hidden="true" /></summary>
              <ul className="lore-claim-options">
                {getOptionsForQuestion(archetype, q.id).map((option) => (
                  <li key={option.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={claimed(q.id, option.id)}
                        onChange={() => toggleClaim(q.id, option.id)}
                      />
                      <span>{option.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>

        <section className="lore-confirm">
          {problems.length > 0 ? (
            <ul className="lore-problems">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          ) : (
            <p className="lore-note">Everything needed is here. Confirming sends it back for review.</p>
          )}
          {error ? <p className="lore-error">{error}</p> : null}
          <button
            type="button"
            className="lore-confirm-button"
            disabled={!writable || confirming || problems.length > 0}
            onClick={() => void confirm()}
          >
            {confirming ? 'Confirming…' : 'Confirm — send back for review'}
          </button>
        </section>
      </div>
    </Panel>
  );
}

/**
 * The visual tiebreaker is structural rather than authored.
 *
 * The tiebreaker question is "which of these calls to you", and the OPTIONS are
 * the archetype's characters themselves, shown by their Foundation art. So
 * every character is automatically its own option and there is nothing for the
 * lore director to write — claiming it by hand would be asking her to restate
 * the character's own id.
 *
 * Recorded on confirm so the matcher has the field it expects.
 */
function withTiebreaker(character: CuratedCharacter): CuratedCharacter {
  if (character.visualTiebreaker?.optionId) return character;
  return {
    ...character,
    visualTiebreaker: {
      questionId: `vt_${character.archetype.toLowerCase().replace(/\s+/g, '_')}`,
      optionId: character.id,
    },
  };
}

/** Mirrors curated_character_lore_is_ready() so the button and the gate agree. */
export function loreProblems(character: CuratedCharacter, questionIds: string[]): string[] {
  const out: string[] = [];
  if (!character.lore?.cardName?.trim()) out.push('The card has no name.');
  if (!character.lore?.nameAndTitle?.trim()) out.push('The name and title is empty.');
  if (!character.coreLore?.trim()) out.push('The premise is empty.');
  for (const rank of RANKS) {
    if (!character.lore?.rankLore?.[rank]?.trim()) out.push(`${rank} has no lore yet.`);
  }
  const bindings = character.answerBindings ?? [];
  const unclaimed = questionIds.filter(
    (id) => !bindings.some((b) => b.questionId === id && b.optionIds.length > 0),
  );
  if (unclaimed.length > 0) {
    out.push(
      `${unclaimed.length} question${unclaimed.length === 1 ? ' has' : 's have'} no claimed answer — ` +
        'a player who answers those can never be matched to this character.',
    );
  }
  return out;
}

function SaveChip({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'idle') return null;
  const text = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : (error ?? 'Not saved');
  return <span className={`lore-save lore-save-${state}`} aria-live="polite">{text}</span>;
}

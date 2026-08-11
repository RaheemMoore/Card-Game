/**
 * The Studio desks.
 *
 * Raheem, 2026-08-10: "We're the only two getting in there, and we should see each
 * other's desk. There should be no differentiation."
 *
 * Two things follow from that, and both are structural rather than promises:
 *
 * 1. `/work/raheem` and `/work/tori` are the SAME component with a different prop.
 *    There is no code path where one desk can do something the other cannot.
 * 2. There is no account sign-in and no ownership check. `DeskPerson` is a
 *    remembered preference so a note is still readable months later; it never
 *    decides what you are allowed to touch.
 *
 * Access is one shared passphrase, verified server-side in `api/desk.ts`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Check, ChevronDown, Command, Hand, Key, Lock, MessageSquare, NotebookPen, Pin, Plus, RefreshCw, Search, Trash2, TriangleAlert, Unlock, X } from 'lucide-react';
import { Panel } from './components';
import {
  DESK_NAMES, DESK_PEOPLE, DeskLockedError, EMPTY_DESK_STATE, collectTags, createNote, filterNotes,
  lockDesks, markDeskSeen, addReply, readDesks, rememberPerson, removeNote, removeReply, rotatePassphrase,
  sortNotes, storedPerson, unlockDesks, unreadCount, updateNote, updateReply, otherPerson,
} from './deskApi';
import type { DeskNote, DeskPerson, DeskReply, DeskState } from './deskApi';

// ---------------------------------------------------------------------------
// Who is at the desk — a preference, shared by every surface that shows a name.
// ---------------------------------------------------------------------------

let activePerson: DeskPerson = storedPerson() ?? 'raheem';
const personListeners = new Set<() => void>();

function setActivePerson(person: DeskPerson): void {
  activePerson = person;
  rememberPerson(person);
  for (const listener of personListeners) listener();
}

export function usePerson(): [DeskPerson, (person: DeskPerson) => void] {
  const [person, setPerson] = useState(activePerson);
  useEffect(() => {
    const sync = () => setPerson(activePerson);
    personListeners.add(sync);
    sync();
    return () => { personListeners.delete(sync); };
  }, []);
  return [person, setActivePerson];
}

/** Sidebar control: switchable from anywhere, because either desk may be open. */
export function PersonPicker() {
  const [person, setPerson] = usePerson();
  return <div className="person-picker">
    <p className="eyebrow">WHO IS AT THE DESK</p>
    <div role="group" aria-label="Who is at the desk">
      {DESK_PEOPLE.map((option) => <button
        key={option}
        className={person === option ? 'selected' : ''}
        aria-pressed={person === option}
        onClick={() => setPerson(option)}
      >{DESK_NAMES[option]}</button>)}
    </div>
    <small>Names what you write. Never limits what you can edit.</small>
  </div>;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

type GatePhase = 'checking' | 'locked' | 'open' | 'unavailable';

/**
 * One passphrase for the Wiki, entered once and remembered on the device.
 *
 * Honest scope: this is a REAL gate on desk data — notes and replies live behind
 * `api/desk.ts` and are unreachable without the cookie. It is only a soft gate on
 * the static wiki pages, whose content is compiled into the JS bundle at build
 * time; truly protecting those needs Vercel Deployment Protection at the edge.
 *
 * A 401 locks. A service error does NOT — bricking the whole Wiki because Supabase
 * is unreachable is a worse failure than the one this guards against, so that case
 * offers a way through with the desks explicitly marked unavailable.
 */
export function StudioGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<GatePhase>('checking');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [bypassed, setBypassed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readDesks()
      .then(() => { if (!cancelled) setPhase('open'); })
      .catch((cause) => {
        if (cancelled) return;
        setPhase(cause instanceof DeskLockedError ? 'locked' : 'unavailable');
        if (!(cause instanceof DeskLockedError)) setError(cause instanceof Error ? cause.message : 'The desk service is not answering.');
      });
    return () => { cancelled = true; };
  }, []);

  if (phase === 'open' || bypassed) return <>{children}</>;

  if (phase === 'checking') {
    return <div className="studio-gate"><Panel className="review-loading"><RefreshCw className="spin"/>Opening the studio…</Panel></div>;
  }

  return <div className="studio-gate">
    <Panel className="studio-gate-panel">
      <Lock aria-hidden="true"/>
      <p className="eyebrow">CARD ENGINE · STUDIO WIKI</p>
      <h1>The studio is locked.</h1>
      {phase === 'unavailable' ? <>
        <p className="studio-gate-warning"><TriangleAlert aria-hidden="true"/>{error || 'The desk service is not configured for this deployment.'}</p>
        <p>The Wiki’s reference pages still work. The desks need <code>SUPABASE_URL</code> and <code>SUPABASE_SERVICE_ROLE_KEY</code> set on this deployment; the passphrase itself lives in the database, not in an environment variable.</p>
        <button className="studio-gate-bypass" onClick={() => setBypassed(true)}>Continue without the desks</button>
      </> : <>
        <p>One passphrase, shared by Raheem and Tori. Enter it once and this device stays open.</p>
        <form onSubmit={async (event) => {
          event.preventDefault();
          setWorking(true);
          setError('');
          try { await unlockDesks(passphrase); setPassphrase(''); setPhase('open'); }
          catch (cause) { setError(cause instanceof Error ? cause.message : 'That is not the studio passphrase.'); }
          finally { setWorking(false); }
        }}>
          <label>Studio passphrase<input type="password" autoComplete="current-password" autoFocus required value={passphrase} onChange={(event) => setPassphrase(event.target.value)}/></label>
          <button disabled={working || !passphrase}>{working ? <RefreshCw className="spin"/> : <Unlock/>}{working ? 'Opening…' : 'Open the studio'}</button>
          {error && <p className="studio-form-error" role="alert">{error}</p>}
        </form>
      </>}
    </Panel>
  </div>;
}

// ---------------------------------------------------------------------------
// A note
// ---------------------------------------------------------------------------

const dayStamp = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

type SaveState = 'saved' | 'saving' | 'error';

/**
 * Debounced autosave, 700 ms, plus a save on blur.
 *
 * Carried over from the original notebook because it was the right call: a desk you
 * have to remember to save is a desk that loses thoughts. What is NOT carried over
 * is the `canEdit` gate — every field here is editable by whoever is sitting down.
 */
function useAutosave(value: string, original: string, commit: (next: string) => Promise<void>) {
  const [state, setState] = useState<SaveState>('saved');
  const save = useCallback(async (next: string) => {
    setState('saving');
    try { await commit(next); setState('saved'); } catch { setState('error'); }
  }, [commit]);
  useEffect(() => {
    if (value === original || !value.trim()) return;
    const timer = window.setTimeout(() => { void save(value); }, 700);
    return () => window.clearTimeout(timer);
  }, [value, original, save]);
  return { state, save };
}

function SaveBadge({ state }: { state: SaveState }) {
  return <span className={`idea-save-state ${state}`} aria-live="polite">
    {state === 'saving' ? <><RefreshCw className="spin"/>Saving…</> : state === 'error' ? <><TriangleAlert/>Could not save</> : <><Check/>Saved</>}
  </span>;
}

function ReplyRow({ reply, apply }: { reply: DeskReply; apply: (run: Promise<DeskState>) => Promise<void> }) {
  const [body, setBody] = useState(reply.body);
  useEffect(() => { setBody(reply.body); }, [reply.id, reply.body]);
  const { state, save } = useAutosave(body, reply.body, useCallback(async (next) => { await apply(updateReply(reply.id, next)); }, [apply, reply.id]));
  return <li className="desk-reply">
    <header><span>{DESK_NAMES[reply.author]} · {dayStamp(reply.createdAt)}</span><SaveBadge state={state}/></header>
    <textarea
      aria-label={`Reply from ${DESK_NAMES[reply.author]}`}
      value={body}
      onChange={(event) => setBody(event.target.value)}
      onBlur={() => { if (body.trim() && body !== reply.body) void save(body); }}
    />
    <button className="desk-icon-button" onClick={() => { void apply(removeReply(reply.id)); }} aria-label="Delete this reply"><Trash2/></button>
  </li>;
}

function NoteCard({ note, replies, viewer, apply }: {
  note: DeskNote;
  replies: DeskReply[];
  viewer: DeskPerson;
  apply: (run: Promise<DeskState>) => Promise<void>;
}) {
  const [body, setBody] = useState(note.body);
  const [draftReply, setDraftReply] = useState('');
  const [draftTag, setDraftTag] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [open, setOpen] = useState(replies.length > 0);
  useEffect(() => { setBody(note.body); }, [note.id, note.body]);
  const { state, save } = useAutosave(body, note.body, useCallback(async (next) => { await apply(updateNote(note.id, { body: next })); }, [apply, note.id]));

  const waitingOnYou = note.needsCallFrom === viewer;
  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || note.tags.includes(tag)) { setDraftTag(''); return; }
    setDraftTag('');
    void apply(updateNote(note.id, { tags: [...note.tags, tag] }));
  };

  return <article className={`idea-note${note.pinned ? ' idea-note-pinned' : ''}${waitingOnYou ? ' idea-note-waiting' : ''}`}>
    <header>
      <span>{DESK_NAMES[note.author]} · {dayStamp(note.createdAt)}</span>
      <SaveBadge state={state}/>
    </header>

    {note.needsCallFrom && <p className="desk-waiting-flag"><Hand aria-hidden="true"/>Waiting on {DESK_NAMES[note.needsCallFrom]}</p>}

    <textarea
      aria-label={`Note from ${DESK_NAMES[note.author]}, ${dayStamp(note.createdAt)}`}
      value={body}
      onChange={(event) => setBody(event.target.value)}
      onBlur={() => { if (body.trim() && body !== note.body) void save(body); }}
    />

    <div className="desk-tag-row">
      {note.tags.map((tag) => <button key={tag} className="desk-tag" onClick={() => { void apply(updateNote(note.id, { tags: note.tags.filter((entry) => entry !== tag) })); }} aria-label={`Remove tag ${tag}`}>{tag}<X/></button>)}
      <input
        className="desk-tag-input"
        value={draftTag}
        placeholder="add tag…"
        aria-label="Add a tag to this note"
        onChange={(event) => setDraftTag(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addTag(draftTag); } }}
        onBlur={() => addTag(draftTag)}
      />
    </div>

    <footer className="desk-note-actions">
      <button className={note.pinned ? 'selected' : ''} aria-pressed={note.pinned} onClick={() => { void apply(updateNote(note.id, { pinned: !note.pinned })); }}><Pin/>{note.pinned ? 'Pinned' : 'Pin'}</button>
      <button
        className={note.needsCallFrom ? 'selected' : ''}
        aria-pressed={Boolean(note.needsCallFrom)}
        onClick={() => { void apply(updateNote(note.id, { needsCallFrom: note.needsCallFrom ? null : otherPerson(viewer) })); }}
      ><Hand/>{note.needsCallFrom ? 'Clear the ask' : `Needs ${DESK_NAMES[otherPerson(viewer)]}’s call`}</button>
      <button className={open ? 'selected' : ''} aria-expanded={open} onClick={() => setOpen((current) => !current)}><MessageSquare/>{replies.length || 'Reply'}<ChevronDown/></button>
      {confirmDelete
        ? <span className="desk-confirm-delete"><strong>Delete for both of you?</strong><button className="desk-danger" onClick={() => { void apply(removeNote(note.id)); }}>Delete</button><button onClick={() => setConfirmDelete(false)}>Keep</button></span>
        : <button className="desk-danger-trigger" onClick={() => setConfirmDelete(true)}><Trash2/>Delete</button>}
    </footer>

    {open && <div className="desk-thread">
      {replies.length > 0 && <ul>{replies.map((reply) => <ReplyRow key={reply.id} reply={reply} apply={apply}/>)}</ul>}
      <div className="desk-reply-composer">
        <textarea
          value={draftReply}
          placeholder={`Reply as ${DESK_NAMES[viewer]}…`}
          aria-label="Write a reply"
          onChange={(event) => setDraftReply(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && draftReply.trim()) {
              event.preventDefault();
              void apply(addReply({ noteId: note.id, author: viewer, body: draftReply })).then(() => setDraftReply(''));
            }
          }}
        />
        <button disabled={!draftReply.trim()} onClick={() => { void apply(addReply({ noteId: note.id, author: viewer, body: draftReply })).then(() => setDraftReply('')); }}><Plus/>Reply</button>
      </div>
    </div>}
  </article>;
}

/**
 * Change the shared phrase without leaving the Wiki.
 *
 * The phrase lives as a scrypt hash in the database rather than an environment
 * variable precisely so this control can exist: neither partner needs a Vercel
 * login, and a phrase that turns out to be awkward to say out loud can be replaced
 * in ten seconds instead of surviving forever because changing it was a chore.
 */
function PassphraseControl() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle');
  const [error, setError] = useState('');

  if (!open) return <button className="studio-signout" onClick={() => setOpen(true)}><Key/>Change passphrase</button>;

  return <form className="desk-passphrase-form" onSubmit={async (event) => {
    event.preventDefault();
    setState('working');
    setError('');
    try { await rotatePassphrase(current, next); setState('done'); setCurrent(''); setNext(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not change the passphrase.'); setState('idle'); }
  }}>
    <label>Current<input type="password" autoComplete="current-password" required value={current} onChange={(event) => setCurrent(event.target.value)}/></label>
    <label>New<input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(event) => setNext(event.target.value)}/></label>
    <button disabled={state === 'working'}>{state === 'working' ? <RefreshCw className="spin"/> : <Key/>}Change</button>
    <button type="button" onClick={() => { setOpen(false); setError(''); setState('idle'); }}>Cancel</button>
    {state === 'done' && <p className="desk-passphrase-done" role="status"><Check/>Changed. Tell the other person — devices already open stay open.</p>}
    {error && <p className="studio-form-error" role="alert">{error}</p>}
  </form>;
}

// ---------------------------------------------------------------------------
// The desk — one component, both people
// ---------------------------------------------------------------------------

export function Desk({ person, reference }: { person: DeskPerson; reference?: ReactNode }) {
  const [viewer] = usePerson();
  const [state, setState] = useState<DeskState>(EMPTY_DESK_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  // Frozen on arrival: the badge must not empty itself out from under you while
  // you are still reading the thing it is pointing at.
  const seenOnArrival = useRef<string | undefined>(undefined);

  const apply = useCallback(async (run: Promise<DeskState>) => {
    setError('');
    try { setState(await run); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The desk could not be updated.'); throw cause; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readDesks()
      .then((next) => {
        if (cancelled) return;
        if (seenOnArrival.current === undefined) seenOnArrival.current = next.lastSeen[viewer] ?? '';
        setState(next);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not open the desk.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [viewer]);

  const deskNotes = useMemo(() => state.notes.filter((note) => note.desk === person), [state.notes, person]);
  const visible = useMemo(() => sortNotes(filterNotes(deskNotes, { search, tags, replies: state.replies })), [deskNotes, search, tags, state.replies]);
  const available = useMemo(() => collectTags(deskNotes), [deskNotes]);
  const unread = unreadCount(state.notes, state.replies, seenOnArrival.current || state.lastSeen[viewer], viewer);
  const waiting = deskNotes.filter((note) => note.needsCallFrom === viewer).length;

  const add = async () => {
    if (!draft.trim() || saving) return;
    setSaving(true);
    try { await apply(createNote({ desk: person, author: viewer, body: draft })); setDraft(''); }
    catch { /* apply already surfaced it. */ }
    finally { setSaving(false); }
  };

  const markSeen = async () => {
    try { await apply(markDeskSeen(viewer)); seenOnArrival.current = new Date().toISOString(); }
    catch { /* apply already surfaced it. */ }
  };

  return <>
    <section className="desk-how">
      <div>
        <NotebookPen/>
        <p className="eyebrow">HOW THIS DESK WORKS</p>
        <h2>Write it down. Keep your focus. Return when the time is right.</h2>
        <p>Both desks are open to both of you — read, write, edit, reply, and delete anything, on either desk. Names say who wrote a thing, never who is allowed to touch it. Notes are durable studio thinking, not tasks, promises, or instructions for Codex and Claude.</p>
      </div>
      <ol><li><span>1</span>Capture the thought in plain language.</li><li><span>2</span>Tag it or ask for the other person’s call.</li><li><span>3</span>Come back and talk it through in the thread.</li></ol>
    </section>

    <Panel className="idea-composer" title={`Add to ${DESK_NAMES[person]}’s desk`} action={<span>SHARED · DURABLE · NOT A TASK</span>}>
      <label htmlFor="desk-draft">What do you want to remember?</label>
      <textarea
        id="desk-draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void add(); } }}
        placeholder={`Writing as ${DESK_NAMES[viewer]}. Put it down before it pulls you away from the current goal…`}
      />
      <div>
        <p><Command/>Ctrl/Cmd + Enter to save</p>
        <button disabled={!draft.trim() || saving} onClick={() => { void add(); }}>{saving ? <RefreshCw className="spin"/> : <Plus/>}{saving ? 'Saving…' : 'Add note'}</button>
      </div>
      {error && <p className="studio-form-error" role="alert">{error}</p>}
    </Panel>

    <div className="desk-toolbar">
      <label className="desk-search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes and replies…" aria-label="Search this desk"/></label>
      {available.length > 0 && <div className="desk-tag-filter" role="group" aria-label="Filter by tag">
        {available.map((tag) => <button key={tag} className={tags.includes(tag) ? 'selected' : ''} aria-pressed={tags.includes(tag)} onClick={() => setTags((current) => current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag])}>{tag}</button>)}
        {tags.length > 0 && <button className="desk-tag-clear" onClick={() => setTags([])}><X/>Clear</button>}
      </div>}
      <div className="desk-signals">
        {waiting > 0 && <span className="desk-badge desk-badge-waiting"><Hand/>{waiting} waiting on you</span>}
        {unread > 0
          ? <button className="desk-badge desk-badge-unread" onClick={() => { void markSeen(); }}>{unread} new from {DESK_NAMES[otherPerson(viewer)]} · mark seen</button>
          : <span className="desk-badge desk-badge-clear"><Check/>Nothing new</span>}
        <PassphraseControl/>
        <button className="studio-signout" onClick={() => { void lockDesks().then(() => window.location.reload()); }}><Lock/>Lock the studio</button>
      </div>
    </div>

    <div className="idea-notebook-heading">
      <div>
        <p className="eyebrow">{DESK_NAMES[person].toUpperCase()}’S NOTEBOOK</p>
        <h2>{visible.length} {visible.length === 1 ? 'note' : 'notes'}{visible.length !== deskNotes.length && ` of ${deskNotes.length}`}</h2>
      </div>
    </div>

    {loading
      ? <Panel className="review-loading"><RefreshCw className="spin"/>Opening the notebook…</Panel>
      : visible.length
        ? <div className="idea-notebook">{visible.map((note) => <NoteCard key={note.id} note={note} replies={state.replies.filter((reply) => reply.noteId === note.id)} viewer={viewer} apply={apply}/>)}</div>
        : <Panel className="review-empty">
            <NotebookPen/>
            <h2>{deskNotes.length ? 'No notes match this view.' : 'The first page is blank.'}</h2>
            <p>{deskNotes.length ? 'Clear the search or the tag filter to see the rest of the desk.' : 'Capture a note above. It stays here until you both decide what, if anything, it should become.'}</p>
          </Panel>}

    {reference}
  </>;
}

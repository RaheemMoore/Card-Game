import { useState } from 'react';
import { ARCHETYPE_NAMES, RANKS, type ArchetypeName, type Rank, type Card } from '../../../types/card';
import type { HiddenFate } from '../../../types/bible';
import {
  ROSTER_SLOTS_PER_ARCHETYPE,
  curatedCharacterId,
  type CuratedCharacter,
  type CuratedRankArt,
} from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { listAllCards, getCardForAdmin, type AdminCardListEntry } from '../../../services/persistence/adminService';
import { uploadRankArtFile } from '../../../services/workshop/curatedArt';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import { WkPanel, WkEmpty, WkImageDrop, WkTriptych, WkStatus } from '../../../components/workshop/ui';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * Stage 2 — intake. Three doors into the same row.
 *
 *   Generate  a bench candidate becomes the seed
 *   Upload    three images made outside the app
 *   Promote   an existing TEMPORARY card crosses the boundary
 *
 * The row is created here; from this point everything autosaves to the
 * database, so nothing after intake can be lost to a reload.
 *
 * A character whose seed is chosen but whose three rank images are still being
 * made sits at `seeded` — a real state, visible on the roster board, so a
 * half-started character is never stranded.
 */

const EMPTY_IDENTITY: HiddenFate = {
  age: '', sex: '', bodyType: '', skinTone: '', facialStructure: '', hair: '',
  disabilityOrCondition: '', posture: '', scars: '', weather: '', lighting: '',
  clothingConstruction: '', minorAccessories: '', environmentDetails: '',
};

export function Intake({
  characterId,
  seed,
  onCharacterCreated,
  onSeedConsumed,
}: {
  characterId: string | null;
  seed: BenchCandidate | null;
  onCharacterCreated: (id: string) => void;
  onSeedConsumed: () => void;
}) {
  const { error } = useCuratedRoster();
  const store = getCuratedRosterStore();
  const character = characterId ? store.getCharacter(characterId) : undefined;

  if (error) {
    return (
      <WkPanel title="The roster could not be read">
        <p className="wk-error">{error}</p>
        <p className="wk-note">Intake writes to the roster, so it stays closed until reads work.</p>
      </WkPanel>
    );
  }

  if (character) {
    return <CharacterIntake character={character} />;
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {seed ? <SeedDoor seed={seed} onCreated={onCharacterCreated} onConsumed={onSeedConsumed} /> : null}
      <NewCharacterDoor onCreated={onCharacterCreated} />
      <PromoteDoor onCreated={onCharacterCreated} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: create the row.
// ---------------------------------------------------------------------------

function blankCharacter(input: {
  archetype: ArchetypeName;
  slotIndex: number;
  displayName: string;
  source: 'generated' | 'upload' | 'promoted';
}): CuratedCharacter {
  const slug = input.displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    || `slot_${input.slotIndex}`;
  return {
    id: curatedCharacterId(input.archetype, slug),
    archetype: input.archetype,
    slotIndex: input.slotIndex,
    status: 'draft',
    displayName: input.displayName.trim(),
    identity: { ...EMPTY_IDENTITY },
    coreLore: '',
    loreDrafts: [],
    answerBindings: [],
    provenance: { source: input.source, authoredBy: 'workshop' },
    reviewThread: [],
  };
}

function SlotPicker({
  archetype,
  slotIndex,
  onArchetype,
  onSlot,
}: {
  archetype: ArchetypeName;
  slotIndex: number;
  onArchetype: (a: ArchetypeName) => void;
  onSlot: (n: number) => void;
}) {
  const store = getCuratedRosterStore();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <label>
        <span className="wk-field-label">Archetype</span>
        <select className="wk-select" value={archetype} onChange={(e) => onArchetype(e.target.value as ArchetypeName)}>
          {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>
      <label>
        <span className="wk-field-label">Roster slot</span>
        <select className="wk-select" value={slotIndex} onChange={(e) => onSlot(Number(e.target.value))}>
          {Array.from({ length: ROSTER_SLOTS_PER_ARCHETYPE }, (_, i) => i + 1).map((n) => {
            const taken = store.getCharacterInSlot(archetype, n);
            return (
              <option key={n} value={n} disabled={Boolean(taken)}>
                {n}{taken ? ` — taken by ${taken.displayName || taken.id}` : ''}
              </option>
            );
          })}
        </select>
      </label>
    </div>
  );
}

function useCreateForm(source: 'generated' | 'upload' | 'promoted') {
  const [archetype, setArchetype] = useState<ArchetypeName>('Lycanthrope');
  const [slotIndex, setSlotIndex] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (decorate?: (c: CuratedCharacter) => CuratedCharacter): Promise<string | null> => {
    if (!displayName.trim()) {
      setError('Give it a working name first — it is how you will find this slot again.');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const base = blankCharacter({ archetype, slotIndex, displayName, source });
      const character = decorate ? decorate(base) : base;
      await getCuratedRosterStore().saveCharacter(character);
      return character.id;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return {
    archetype, setArchetype, slotIndex, setSlotIndex,
    displayName, setDisplayName, busy, error, create,
  };
}

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label>
      <span className="wk-field-label">Working name</span>
      <input
        className="wk-select"
        value={value}
        placeholder="How you will refer to this slot"
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="wk-note" style={{ marginTop: 5 }}>
        Yours, not the player's. The card's real name is written with the lore.
      </p>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Door 1 — a bench candidate.
// ---------------------------------------------------------------------------

function SeedDoor({
  seed,
  onCreated,
  onConsumed,
}: {
  seed: BenchCandidate;
  onCreated: (id: string) => void;
  onConsumed: () => void;
}) {
  const form = useCreateForm('generated');
  // The bench already knows the archetype; don't make them pick it twice.
  const [initialised, setInitialised] = useState(false);
  if (!initialised) {
    form.setArchetype(seed.archetype);
    setInitialised(true);
  }

  return (
    <WkPanel title="Start from the bench candidate">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,220px) minmax(0,1fr)', gap: 16 }}>
        <div>
          {seed.imageDataUrl ? (
            <img src={seed.imageDataUrl} alt="Bench candidate" style={{ width: '100%', borderRadius: 8 }} />
          ) : (
            <WkEmpty title="Image not kept">The run is saved; the preview is not held across reloads.</WkEmpty>
          )}
        </div>
        <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <p className="wk-note">
            This becomes the seed. The three rank images get made outside the app from it, then come
            back through the upload below. Until they do, the character sits at <em>seeded</em> on
            the roster so it cannot be forgotten.
          </p>
          <SlotPicker
            archetype={form.archetype}
            slotIndex={form.slotIndex}
            onArchetype={form.setArchetype}
            onSlot={form.setSlotIndex}
          />
          <NameField value={form.displayName} onChange={form.setDisplayName} />
          {form.error ? <p className="wk-error">{form.error}</p> : null}
          <button
            type="button"
            className="wk-primary"
            disabled={form.busy}
            onClick={() => {
              void form.create((c) => ({
                ...c,
                status: 'seeded',
                seed: {
                  runId: seed.runId,
                  batchId: seed.batchId,
                  imageUrl: seed.imageDataUrl,
                  promptSnapshot: seed.portraitPrompt,
                  directive: seed.directive,
                },
                // What the engine already decided. The read-the-art stage starts
                // from this instead of asking a model to guess it back.
                identity: seed.hiddenFate ?? { ...EMPTY_IDENTITY },
              })).then((id) => {
                if (id) {
                  onConsumed();
                  onCreated(id);
                }
              });
            }}
          >
            {form.busy ? 'Creating…' : 'Take this slot'}
          </button>
        </div>
      </div>
    </WkPanel>
  );
}

// ---------------------------------------------------------------------------
// Door 2 — bring your own three images.
// ---------------------------------------------------------------------------

function NewCharacterDoor({ onCreated }: { onCreated: (id: string) => void }) {
  const form = useCreateForm('upload');
  return (
    <WkPanel title="Bring three images you already made">
      <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
        <p className="wk-note">
          Creates the slot first, then asks for the images — so a failed upload never loses the rest
          of what you typed.
        </p>
        <SlotPicker
          archetype={form.archetype}
          slotIndex={form.slotIndex}
          onArchetype={form.setArchetype}
          onSlot={form.setSlotIndex}
        />
        <NameField value={form.displayName} onChange={form.setDisplayName} />
        {form.error ? <p className="wk-error">{form.error}</p> : null}
        <button
          type="button"
          className="wk-primary"
          disabled={form.busy}
          onClick={() => void form.create().then((id) => id && onCreated(id))}
        >
          {form.busy ? 'Creating…' : 'Create the slot'}
        </button>
      </div>
    </WkPanel>
  );
}

// ---------------------------------------------------------------------------
// Door 3 — promote a temporary card.
// ---------------------------------------------------------------------------

function PromoteDoor({ onCreated }: { onCreated: (id: string) => void }) {
  const form = useCreateForm('promoted');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<AdminCardListEntry[] | null>(null);
  const [picked, setPicked] = useState<Card | null>(null);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      const { entries } = await listAllCards({ search: search || undefined, limit: 12 });
      setResults(entries);
    } finally {
      setSearching(false);
    }
  };

  const pick = async (cardId: string) => {
    const card = await getCardForAdmin(cardId);
    if (!card) return;
    setPicked(card);
    form.setArchetype(card.archetype);
    if (!form.displayName) form.setDisplayName(card.cardName);
  };

  return (
    <WkPanel title="Promote a temporary card">
      <div style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
        <p className="wk-note">
          Everything in the collection is temporary. Promoting copies its identity, stats and art
          references into a new roster slot — the original card is not touched or removed.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="wk-select"
            value={search}
            placeholder="Search by card name"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }}
          />
          <button type="button" className="wk-tab" disabled={searching} onClick={() => void runSearch()}>
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {results !== null ? (
          results.length === 0 ? (
            <p className="wk-note">No cards matched.</p>
          ) : (
            <ul style={{ display: 'grid', gap: 4 }}>
              {results.map((r) => (
                <li key={r.card_id}>
                  <button
                    type="button"
                    className="wk-tab"
                    style={{ width: '100%', textAlign: 'left' }}
                    onClick={() => void pick(r.card_id)}
                  >
                    {r.card_name} — {r.archetype}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {picked ? (
          <>
            <p className="wk-note">
              Promoting <strong>{picked.cardName}</strong>. Its identity sheet and lore come across.
              Its art does not — the three permanent images are still yours to make — and neither do
              its stats, which players roll for themselves when they pull the character.
            </p>
            <SlotPicker
              archetype={form.archetype}
              slotIndex={form.slotIndex}
              onArchetype={form.setArchetype}
              onSlot={form.setSlotIndex}
            />
            <NameField value={form.displayName} onChange={form.setDisplayName} />
            {form.error ? <p className="wk-error">{form.error}</p> : null}
            <button
              type="button"
              className="wk-primary"
              disabled={form.busy}
              onClick={() => {
                void form.create((c) => ({
                  ...c,
                  identity: picked.hiddenFate ?? c.identity,
                  coreLore: picked.lore,
                  provenance: { ...c.provenance, promotedFromCardId: picked.cardId },
                })).then((id) => id && onCreated(id));
              }}
            >
              {form.busy ? 'Promoting…' : 'Promote into this slot'}
            </button>
          </>
        ) : null}
      </div>
    </WkPanel>
  );
}

// ---------------------------------------------------------------------------
// A character that already exists — the three rank images.
// ---------------------------------------------------------------------------

function CharacterIntake({ character }: { character: CuratedCharacter }) {
  const [busyRank, setBusyRank] = useState<Rank | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Rank, string>>>({});
  const store = getCuratedRosterStore();
  const master = character.masterArt ?? {};

  const upload = async (rank: Rank, file: File) => {
    setBusyRank(rank);
    setErrors((e) => ({ ...e, [rank]: undefined }));
    try {
      const art = await uploadRankArtFile({
        characterId: character.id,
        scope: '_master',
        rank,
        file,
      });
      const nextMaster: Partial<Record<Rank, CuratedRankArt>> = { ...master, [rank]: art };
      const complete = RANKS.every((r) => nextMaster[r]?.portraitUrl);
      await store.saveCharacter({
        ...character,
        masterArt: nextMaster,
        // Three images in hand is what makes it proposable. Until then it stays
        // wherever it was — seeded, or draft.
        status: complete && character.status === 'seeded' ? 'draft' : character.status,
      });
    } catch (err) {
      setErrors((e) => ({ ...e, [rank]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusyRank(null);
    }
  };

  const missing = RANKS.filter((r) => !master[r]?.portraitUrl);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <WkPanel
        title={character.displayName || character.id}
        action={<WkStatus value={character.status} />}
      >
        <WkTriptych
          panels={RANKS.map((rank) => ({ rank, portraitUrl: master[rank]?.portraitUrl }))}
        />
        <p className="wk-note" style={{ marginTop: 12 }}>
          {missing.length === 0
            ? 'All three ranks are in. The next stage reads them into an identity sheet.'
            : `Still needed: ${missing.join(', ')}.`}
        </p>
      </WkPanel>

      <WkPanel title="The three permanent images">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {RANKS.map((rank) => (
            <WkImageDrop
              key={rank}
              label={rank}
              currentUrl={master[rank]?.portraitUrl}
              busy={busyRank === rank}
              error={errors[rank] ?? null}
              onFile={(file) => void upload(rank, file)}
              onClear={() => {
                // Replacing means uploading over the same path; clearing the
                // preview is enough to expose the picker again. The old object
                // is overwritten rather than orphaned.
                void store.saveCharacter({
                  ...character,
                  masterArt: { ...master, [rank]: undefined },
                });
              }}
            />
          ))}
        </div>
        <p className="wk-note" style={{ marginTop: 10 }}>
          PNG, JPEG or WebP, up to 5 MB each. These are the master set; element variants can reuse
          them or bring their own later.
        </p>
      </WkPanel>
    </div>
  );
}

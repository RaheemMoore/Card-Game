import { useState } from 'react';
import { ARCHETYPE_NAMES, RANKS, type ArchetypeName, type Rank, type Card } from '../../../types/card';
import type { HiddenFate } from '../../../types/bible';
import {
  ROSTER_SLOTS_PER_ARCHETYPE, curatedCharacterId,
  type CuratedCharacter, type CuratedRankArt,
} from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { listAllCards, getCardForAdmin, type AdminCardListEntry } from '../../../services/persistence/adminService';
import { uploadRankArtFile } from '../../../services/workshop/curatedArt';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import {
  AdminCard, AdminSection, AdminButton, AdminField, AdminSelect, AdminAlert, AdminEmptyState,
} from '../../../components/admin/ui';
import { Triptych, ImageDrop, StatusBadge, StageIntro } from '../../../components/admin/workshop';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * Stage 2 — intake. Three doors into the same row.
 *
 *   Generate  a bench candidate becomes the seed
 *   Upload    three images made outside the app
 *   Promote   an existing TEMPORARY card crosses the boundary
 *
 * The row is created here; from this point everything writes to the database,
 * so nothing after intake is lost to a reload.
 *
 * A character whose seed is chosen but whose rank images are still being made
 * sits at `seeded` — visible on the roster board, so a half-started character
 * is never stranded.
 */

const EMPTY_IDENTITY: HiddenFate = {
  age: '', sex: '', bodyType: '', skinTone: '', facialStructure: '', hair: '',
  disabilityOrCondition: '', posture: '', scars: '', weather: '', lighting: '',
  clothingConstruction: '', minorAccessories: '', environmentDetails: '',
};

export function Intake({
  characterId, seed, onCharacterCreated, onSeedConsumed,
}: {
  characterId: string | null;
  seed: BenchCandidate | null;
  onCharacterCreated: (id: string) => void;
  onSeedConsumed: () => void;
}) {
  const { error } = useCuratedRoster();
  const character = characterId ? getCuratedRosterStore().getCharacter(characterId) : undefined;

  if (error) {
    return (
      <AdminAlert tone="danger" title="The roster could not be read">
        <p className="mb-1">{error}</p>
        <p>Intake writes to the roster, so it stays closed until reads work.</p>
      </AdminAlert>
    );
  }

  if (character) return <CharacterIntake character={character} />;

  return (
    <div className="grid gap-4">
      <StageIntro
        step="02"
        title="Intake — claim a character slot and give it its three pictures"
        next="once all three are in, Read the art describes who the character is."
      >
        <p className="m-0 mb-2">
          A <strong>character slot</strong> is one of the ten places an archetype has for a
          character. Taking a slot creates the record everything else attaches to &mdash; the
          pictures, the description, the lore, and eventually every element version of the card.
          Nothing is permanent yet; a slot can sit half-finished for as long as you like.
        </p>
        <p className="m-0">
          Every character needs <strong>three pictures</strong>: Foundation, Forged and Ascendant.
          The same person at the start, the middle and the peak of their story. Start below in
          whichever way suits &mdash; from a bench image, from art you already made, or from a card
          that already exists in the game.
        </p>
      </StageIntro>

      {seed && <SeedDoor seed={seed} onCreated={onCharacterCreated} onConsumed={onSeedConsumed} />}
      <NewCharacterDoor onCreated={onCharacterCreated} />
      <PromoteDoor onCreated={onCharacterCreated} />
    </div>
  );
}

// ---------------------------------------------------------------------------

function blankCharacter(input: {
  archetype: ArchetypeName; slotIndex: number; displayName: string;
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

function useCreateForm(source: 'generated' | 'upload' | 'promoted') {
  const [archetype, setArchetype] = useState<ArchetypeName>('Lycanthrope');
  const [slotIndex, setSlotIndex] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (decorate?: (c: CuratedCharacter) => CuratedCharacter): Promise<string | null> => {
    if (!displayName.trim()) {
      setError('Give it a name to work with first — it is how you will find this character again.');
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

  return { archetype, setArchetype, slotIndex, setSlotIndex, displayName, setDisplayName, busy, error, create };
}

function SlotPicker({
  archetype, slotIndex, onArchetype, onSlot,
}: {
  archetype: ArchetypeName; slotIndex: number;
  onArchetype: (a: ArchetypeName) => void; onSlot: (n: number) => void;
}) {
  const store = getCuratedRosterStore();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <AdminSelect label="Archetype" value={archetype} onChange={(e) => onArchetype(e.target.value as ArchetypeName)}>
        {ARCHETYPE_NAMES.map((a) => <option key={a} value={a}>{a}</option>)}
      </AdminSelect>
      <AdminSelect
        label="Character slot"
        hint={`Which of ${archetype}'s ten character places this takes. Taken slots are greyed out.`}
        value={slotIndex}
        onChange={(e) => onSlot(Number(e.target.value))}
      >
        {Array.from({ length: ROSTER_SLOTS_PER_ARCHETYPE }, (_, i) => i + 1).map((n) => {
          const taken = store.getCharacterInSlot(archetype, n);
          return (
            <option key={n} value={n} disabled={Boolean(taken)}>
              {n}{taken ? ` — taken by ${taken.displayName || taken.id}` : ''}
            </option>
          );
        })}
      </AdminSelect>
    </div>
  );
}

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <AdminField
      label="What you'll call it for now"
      value={value}
      placeholder="e.g. the scarred shield-bearer"
      hint="A label for you and Tori to find this character by while you build it. Players never see it — the card's real name is written later, with the lore."
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// ---------------------------------------------------------------------------

function SeedDoor({
  seed, onCreated, onConsumed,
}: { seed: BenchCandidate; onCreated: (id: string) => void; onConsumed: () => void }) {
  const form = useCreateForm('generated');
  const [initialised, setInitialised] = useState(false);
  if (!initialised) { form.setArchetype(seed.archetype); setInitialised(true); }

  return (
    <AdminSection title="Start from the bench image" subtitle="Use the candidate you just generated as this character&rsquo;s starting point.">
      <AdminCard>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <div>
            {seed.imageDataUrl ? (
              <img src={seed.imageDataUrl} alt="Bench candidate" className="w-full block"
                style={{ borderRadius: 'var(--admin-radius-control)', border: '1px solid var(--admin-border)' }} />
            ) : (
              <AdminEmptyState title="Image not kept" description="The run is saved; the preview is not held across reloads." />
            )}
          </div>
          <div className="grid gap-3 content-start">
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              This becomes the seed. The three rank images get made outside the app from it, then
              come back through the upload below. Until they do, the character sits at <em>seeded</em>.
            </p>
            <SlotPicker archetype={form.archetype} slotIndex={form.slotIndex}
              onArchetype={form.setArchetype} onSlot={form.setSlotIndex} />
            <NameField value={form.displayName} onChange={form.setDisplayName} />
            {form.error && <AdminAlert tone="danger">{form.error}</AdminAlert>}
            <AdminButton variant="primary" disabled={form.busy} onClick={() => {
              void form.create((c) => ({
                ...c,
                status: 'seeded',
                seed: {
                  runId: seed.runId, batchId: seed.batchId, imageUrl: seed.imageDataUrl,
                  promptSnapshot: seed.portraitPrompt, directive: seed.directive,
                },
                identity: seed.hiddenFate ?? { ...EMPTY_IDENTITY },
              })).then((id) => { if (id) { onConsumed(); onCreated(id); } });
            }}>
              {form.busy ? 'Creating…' : 'Take this slot'}
            </AdminButton>
          </div>
        </div>
      </AdminCard>
    </AdminSection>
  );
}

function NewCharacterDoor({ onCreated }: { onCreated: (id: string) => void }) {
  const form = useCreateForm('upload');
  return (
    <AdminSection title="Start from pictures you already have" subtitle="You made the three rank images elsewhere and want to bring them in.">
      <AdminCard>
        <div className="grid gap-3 max-w-xl">
          <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
            Creates the slot first, then asks for the images — so a failed upload never loses the
            rest of what you typed.
          </p>
          <SlotPicker archetype={form.archetype} slotIndex={form.slotIndex}
            onArchetype={form.setArchetype} onSlot={form.setSlotIndex} />
          <NameField value={form.displayName} onChange={form.setDisplayName} />
          {form.error && <AdminAlert tone="danger">{form.error}</AdminAlert>}
          <AdminButton variant="primary" disabled={form.busy}
            onClick={() => void form.create().then((id) => id && onCreated(id))}>
            {form.busy ? 'Creating…' : 'Create the slot'}
          </AdminButton>
        </div>
      </AdminCard>
    </AdminSection>
  );
}

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
    } finally { setSearching(false); }
  };

  const pick = async (cardId: string) => {
    const card = await getCardForAdmin(cardId);
    if (!card) return;
    setPicked(card);
    form.setArchetype(card.archetype);
    if (!form.displayName) form.setDisplayName(card.cardName);
  };

  return (
    <AdminSection title="Start from a card already in the game" subtitle="Copy an existing temporary card&rsquo;s description and lore into a new slot.">
      <AdminCard>
        <div className="grid gap-3 max-w-2xl">
          <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
            Everything in the collection is temporary. Promoting copies its identity and lore into a
            new roster slot — the original card is not touched.
          </p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <AdminField label="Search" value={search} placeholder="Card name"
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void runSearch(); }} />
            </div>
            <AdminButton disabled={searching} onClick={() => void runSearch()}>
              {searching ? 'Searching…' : 'Search'}
            </AdminButton>
          </div>

          {results !== null && (results.length === 0 ? (
            <p className="text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>No cards matched.</p>
          ) : (
            <ul className="grid gap-1">
              {results.map((r) => (
                <li key={r.card_id}>
                  <AdminButton size="sm" className="w-full justify-start" onClick={() => void pick(r.card_id)}>
                    {r.card_name} — {r.archetype}
                  </AdminButton>
                </li>
              ))}
            </ul>
          ))}

          {picked && (
            <>
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
                Promoting <strong style={{ color: 'var(--admin-text)' }}>{picked.cardName}</strong>. Its
                identity sheet and lore come across. Its art does not — the three permanent images are
                still yours to make — and neither do its stats, which players roll for themselves.
              </p>
              <SlotPicker archetype={form.archetype} slotIndex={form.slotIndex}
                onArchetype={form.setArchetype} onSlot={form.setSlotIndex} />
              <NameField value={form.displayName} onChange={form.setDisplayName} />
              {form.error && <AdminAlert tone="danger">{form.error}</AdminAlert>}
              <AdminButton variant="primary" disabled={form.busy} onClick={() => {
                void form.create((c) => ({
                  ...c,
                  identity: picked.hiddenFate ?? c.identity,
                  coreLore: picked.lore,
                  provenance: { ...c.provenance, promotedFromCardId: picked.cardId },
                })).then((id) => id && onCreated(id));
              }}>
                {form.busy ? 'Promoting…' : 'Promote into this slot'}
              </AdminButton>
            </>
          )}
        </div>
      </AdminCard>
    </AdminSection>
  );
}

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
      const art = await uploadRankArtFile({ characterId: character.id, scope: '_master', rank, file });
      const nextMaster: Partial<Record<Rank, CuratedRankArt>> = { ...master, [rank]: art };
      const complete = RANKS.every((r) => nextMaster[r]?.portraitUrl);
      await store.saveCharacter({
        ...character,
        masterArt: nextMaster,
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
    <div className="grid gap-4">
      <AdminSection
        title={character.displayName || character.id}
        actions={<StatusBadge status={character.status} />}
      >
        <AdminCard>
          <Triptych art={master} />
          <p className="mt-3 text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>
            {missing.length === 0
              ? 'All three ranks are in. The next stage reads them into an identity sheet.'
              : `Still needed: ${missing.join(', ')}.`}
          </p>
        </AdminCard>
      </AdminSection>

      <AdminSection title="The three permanent images">
        <AdminCard>
          <div className="grid gap-4 sm:grid-cols-3">
            {RANKS.map((rank) => (
              <ImageDrop
                key={rank}
                label={rank}
                currentUrl={master[rank]?.portraitUrl}
                busy={busyRank === rank}
                error={errors[rank] ?? null}
                onFile={(file) => void upload(rank, file)}
                onReplace={() => void store.saveCharacter({
                  ...character,
                  masterArt: { ...master, [rank]: undefined },
                })}
              />
            ))}
          </div>
          <p className="mt-3 text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>
            PNG, JPEG or WebP, up to 5 MB each. These are the master set; element variants can reuse
            them or bring their own later.
          </p>
        </AdminCard>
      </AdminSection>
    </div>
  );
}

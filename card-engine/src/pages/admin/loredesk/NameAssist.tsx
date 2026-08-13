import { useMemo, useState } from 'react';
import { Shuffle, ChevronDown } from 'lucide-react';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { selectNamingSparks } from '../../../services/naming/namingPrompt';
import { requestNameCandidates, type NameCandidate } from '../../../services/workshop/nameAssist';
import { AdminButton } from '../../../components/admin/ui';

/**
 * Help with the name, in two halves that must not be confused.
 *
 * The free half shows the Bible's DIRECTION for this archetype — what a name
 * here should be about, which structures are allowed, which cultures to draw
 * on — plus example names. Those examples are the dangerous part: the Bible
 * says they demonstrate structure and rhythm and must never be used as-is.
 * So they are styled as reference rather than as options, and carry
 * user-select: none. A director copying "Brenna Ash-Tusk" straight into the
 * field would be shipping a name the Bible forbids.
 *
 * The paid half is where usable names come from — Claude reading the same
 * Bible block along with her art and her lore.
 */
export function NameAssist({
  character,
  siblings,
  onApply,
}: {
  character: CuratedCharacter;
  siblings: readonly CuratedCharacter[];
  onApply: (cardName: string, nameAndTitle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // Seeded off the character id so two characters do not open on the same
  // slice, and stepping it is free — no network, no cost.
  const [offset, setOffset] = useState(() => character.id.length % 7);
  const [candidates, setCandidates] = useState<NameCandidate[] | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sparks = useMemo(
    () =>
      selectNamingSparks({
        archetype: character.archetype,
        rank: 'Foundation',
        offset,
        sampleCount: 6,
        fullCount: 4,
        registerCount: 3,
      }),
    [character.archetype, offset],
  );

  const hasSomethingToNameAgainst =
    Boolean(character.coreLore?.trim()) ||
    Object.values(character.lore?.rankLore ?? {}).some((t) => t?.trim());

  const draft = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await requestNameCandidates(character, siblings, offset);
      if (next.length === 0) setError('The model returned nothing usable. Try again.');
      setCandidates(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <AdminButton size="sm" variant="ghost" className="justify-self-start" onClick={() => setOpen(true)}>
        Help me name them
      </AdminButton>
    );
  }

  return (
    <div
      className="grid gap-3 p-3"
      style={{
        background: 'var(--admin-surface-subtle)',
        border: '1px solid var(--admin-border)',
        borderRadius: 'var(--admin-radius-control)',
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="m-0 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text)' }}>
          Naming — {character.archetype}
        </h3>
        <span className="flex-1" />
        <AdminButton size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Hide
        </AdminButton>
      </div>

      {/* ---- Free half: the Bible's direction ---- */}
      <section className="grid gap-2">
        <p className="m-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
          Free — the Bible's direction
        </p>
        <p className="m-0 text-xs italic leading-relaxed" style={{ color: 'var(--admin-text)' }}>
          A {character.archetype} name is about {sparks.identity}.
        </p>

        <details>
          <summary className="cursor-pointer text-[11px] select-none" style={{ color: 'var(--admin-text-muted)' }}>
            Allowed name structures <ChevronDown size={11} className="inline" aria-hidden="true" />
          </summary>
          <ul className="mt-1 grid gap-1 m-0 pl-4 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            {sparks.structures.map((s) => <li key={s.key}>{s.label}</li>)}
          </ul>
        </details>

        <div className="flex flex-wrap gap-1">
          {sparks.registers.map((r) => (
            <span
              key={r}
              className="text-[10px] px-2 py-0.5"
              style={{
                color: 'var(--admin-text-muted)',
                border: '1px solid var(--admin-border)',
                borderRadius: 999,
              }}
            >
              {r}
            </span>
          ))}
        </div>

        {/* The examples. Reference, never options — see the docblock. */}
        <div
          className="p-2"
          style={{
            border: '1px dashed var(--admin-border)',
            borderRadius: 'var(--admin-radius-control)',
            opacity: 0.75,
          }}
        >
          <p className="m-0 mb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--admin-text-muted)' }}>
            Rhythm reference — the shape and sound of a name here. Never use one.
          </p>
          <p
            className="m-0 text-[11px]"
            style={{ color: 'var(--admin-text-muted)', userSelect: 'none' }}
          >
            {sparks.sampleNames.join(' · ')}
          </p>
          <p
            className="m-0 mt-1 text-[11px]"
            style={{ color: 'var(--admin-text-muted)', userSelect: 'none' }}
          >
            {sparks.sampleFullNames.join(' · ')}
          </p>
        </div>

        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
          <strong style={{ color: 'var(--admin-text)' }}>At Foundation: </strong>
          {sparks.epithetByRank.Foundation}
        </p>
        <details>
          <summary className="cursor-pointer text-[11px] select-none" style={{ color: 'var(--admin-text-muted)' }}>
            Where the name can go later <ChevronDown size={11} className="inline" aria-hidden="true" />
          </summary>
          <p className="mt-1 m-0 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            <strong>Forged: </strong>{sparks.epithetByRank.Forged}
          </p>
          <p className="mt-1 m-0 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
            <strong>Ascendant: </strong>{sparks.epithetByRank.Ascendant}
          </p>
        </details>
        {sparks.avoid.length > 0 && (
          <details>
            <summary className="cursor-pointer text-[11px] select-none" style={{ color: 'var(--admin-text-muted)' }}>
              Avoid for {character.archetype} <ChevronDown size={11} className="inline" aria-hidden="true" />
            </summary>
            <ul className="mt-1 grid gap-0.5 m-0 pl-4 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
              {sparks.avoid.map((a) => <li key={a}>{a}</li>)}
            </ul>
          </details>
        )}

        <AdminButton
          size="sm"
          variant="ghost"
          icon={<Shuffle size={13} />}
          className="justify-self-start"
          onClick={() => setOffset((o) => o + 1)}
        >
          Different examples — free
        </AdminButton>
      </section>

      {/* ---- Paid half: actual candidates ---- */}
      <section
        className="grid gap-2 pt-3"
        style={{ borderTop: '1px solid var(--admin-border)' }}
      >
        <p className="m-0 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-accent-alt)' }}>
          Names written for this character
        </p>
        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
          Claude reads the Bible above along with the art and what you have written, and proposes
          Foundation names. Each press is one paid call.
        </p>
        <AdminButton
          size="sm"
          className="justify-self-start"
          disabled={busy || !hasSomethingToNameAgainst}
          title={hasSomethingToNameAgainst ? undefined : 'Write the premise first — a name needs a person.'}
          onClick={() => void draft()}
        >
          {busy ? 'Reading…' : candidates ? 'Draft six more' : 'Draft six names'}
        </AdminButton>

        {error && <p className="m-0 text-[11px]" style={{ color: 'var(--admin-danger)' }}>{error}</p>}

        {candidates && candidates.length > 0 && (
          <ul className="grid gap-2 m-0 p-0 list-none">
            {candidates.map((c) => (
              <li
                key={`${c.cardName}-${c.nameAndTitle}`}
                className="grid gap-1 p-2.5"
                style={{
                  background: 'var(--admin-surface-strong)',
                  border: '1px solid var(--admin-border)',
                  borderRadius: 'var(--admin-radius-control)',
                }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className="text-[15px]"
                    style={{ color: 'var(--admin-text)', fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {c.cardName}
                  </span>
                  {c.nameAndTitle !== c.cardName && (
                    <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {c.nameAndTitle}
                    </span>
                  )}
                  <span className="flex-1" />
                  <AdminButton size="sm" onClick={() => { onApply(c.cardName, c.nameAndTitle); setApplied(c.cardName); }}>
                    Use this
                  </AdminButton>
                </div>
                {(c.register || c.structure) && (
                  <p className="m-0 text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                    {[c.register, c.structure].filter(Boolean).join(' · ')}
                  </p>
                )}
                {c.reason && (
                  <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text)' }}>
                    {c.reason}
                  </p>
                )}
                {c.ascendantPreview && (
                  <p className="m-0 text-[10px] italic" style={{ color: 'var(--admin-text-muted)', opacity: 0.8 }}>
                    Could become “{c.ascendantPreview}” — preview only, not saved.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {applied && (
          <p className="m-0 text-[11px]" style={{ color: 'var(--admin-success)' }}>
            “{applied}” filled in above — edit it freely.
          </p>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import { RANKS } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import {
  proposeIdentityFromArt,
  applyAcceptedFields,
  READABLE_FIELDS,
  type ArtReading,
  type ReadableField,
} from '../../../services/workshop/readArt';
import { API_COST_CATALOG } from '../../../data/economy/apiCostCatalog';
import { WkPanel, WkEmpty, WkTriptych, WkStatus } from '../../../components/workshop/ui';

/**
 * Stage 3 — read the art.
 *
 * The three images are described into an identity sheet, field by field, and a
 * human accepts each one. Nothing is written to the character until they do.
 *
 * The two columns matter: what the model SAID stays visible next to what was
 * ACCEPTED, so a value that was edited is obviously an edit and not a reading.
 * Once a proposal is folded silently into a sheet, nobody can tell afterwards
 * which parts were observed and which were typed.
 */

const READ_COST = API_COST_CATALOG.forge_card?.estimatedDirectCostUsd ?? 0;

export function ReadTheArt({ character }: { character: CuratedCharacter }) {
  const store = getCuratedRosterStore();
  const master = character.masterArt ?? {};
  const available = RANKS.filter((r) => master[r]?.portraitUrl);

  const [reading, setReading] = useState<ArtReading | null>(null);
  const [accepted, setAccepted] = useState<Partial<Record<ReadableField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const read = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await proposeIdentityFromArt({
        archetype: character.archetype,
        images: available.map((rank) => ({ rank, url: master[rank]!.portraitUrl })),
      });
      setReading(result);
      // Pre-fill the accepted column with the seed's directive where we already
      // know the answer — a bench character's sex/build/age were DECIDED by the
      // engine, not guessed from a picture, and that is better evidence.
      setAccepted(seedAccepted(character));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const acceptAllAndSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await store.saveCharacter({
        ...character,
        identity: applyAcceptedFields(character.identity, accepted),
        identityAcceptedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (available.length === 0) {
    return (
      <WkPanel title="No art to read yet">
        <WkEmpty title="The three rank images come first">
          This stage describes what is in the pictures. Add them at intake.
        </WkEmpty>
      </WkPanel>
    );
  }

  const filled = Object.values(accepted).filter((v) => v && v.trim()).length;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <WkPanel
        title={character.displayName || character.id}
        action={<WkStatus value={character.status} />}
      >
        <WkTriptych panels={RANKS.map((rank) => ({ rank, portraitUrl: master[rank]?.portraitUrl }))} />
        {available.length < RANKS.length ? (
          <p className="wk-note" style={{ marginTop: 10 }}>
            Reading {available.length} of 3 ranks. A partial set can be read, but continuity across
            ranks cannot be checked from it — the whole point of reading all three at once.
          </p>
        ) : null}
      </WkPanel>

      <WkPanel
        title="The identity sheet"
        action={
          character.identityAcceptedAt ? (
            <span className="wk-note">
              Accepted {new Date(character.identityAcceptedAt).toLocaleDateString()}
            </span>
          ) : null
        }
      >
        {!reading ? (
          <div style={{ display: 'grid', gap: 10, maxWidth: 520 }}>
            <p className="wk-note">
              The images are the truth here and the sheet describes them — not the other way round.
              Because all three ranks are read together, continuity is observed rather than enforced.
            </p>
            {error ? <p className="wk-error">{error}</p> : null}
            <button type="button" className="wk-primary" disabled={busy} onClick={() => void read()}>
              {busy ? 'Looking at the art…' : `Read the art · ~$${READ_COST.toFixed(2)}`}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {reading.notes ? (
              <p className="wk-note">
                <strong>Noticed:</strong> {reading.notes}
              </p>
            ) : null}

            <div className="wk-diff">
              <div className="wk-diff-head">
                <span>Field</span>
                <span>What the art shows</span>
                <span>Accepted</span>
              </div>
              {READABLE_FIELDS.map((field) => (
                <FieldRow
                  key={field}
                  field={field}
                  proposed={reading.fields[field]}
                  confidence={reading.confidence[field]}
                  value={accepted[field] ?? ''}
                  onChange={(v) => setAccepted((a) => ({ ...a, [field]: v }))}
                />
              ))}
            </div>

            {error ? <p className="wk-error">{error}</p> : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="wk-primary"
                style={{ width: 'auto' }}
                disabled={saving || filled === 0}
                onClick={() => void acceptAllAndSave()}
              >
                {saving ? 'Saving…' : `Accept ${filled} field${filled === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                className="wk-tab"
                onClick={() =>
                  setAccepted(
                    Object.fromEntries(
                      READABLE_FIELDS.filter((f) => reading.fields[f]).map((f) => [f, reading.fields[f]!]),
                    ),
                  )
                }
              >
                Take everything proposed
              </button>
              <button type="button" className="wk-tab" onClick={() => setAccepted({})}>
                Clear
              </button>
            </div>
            <p className="wk-note">
              Only accepted fields are written. The sheet is what the lore director will write
              against, so a wrong value here becomes a wrong story.
            </p>
          </div>
        )}
      </WkPanel>
    </div>
  );
}

/**
 * A bench character's presentation was DECIDED by the identity roller, not
 * inferred from a picture. Where that is known, it is better evidence than a
 * reading, so it pre-fills the accepted column.
 */
function seedAccepted(character: CuratedCharacter): Partial<Record<ReadableField, string>> {
  const directive = character.seed?.directive;
  if (!directive) return {};
  const out: Partial<Record<ReadableField, string>> = {};
  if (directive.sex) out.sex = directive.sex;
  if (directive.age) out.age = directive.age;
  if (directive.build) out.bodyType = directive.build;
  if (directive.mark) out.disabilityOrCondition = directive.mark;
  return out;
}

function FieldRow({
  field,
  proposed,
  confidence,
  value,
  onChange,
}: {
  field: ReadableField;
  proposed: string | undefined;
  confidence: 'high' | 'medium' | 'low' | undefined;
  value: string;
  onChange: (v: string) => void;
}) {
  const label = field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="wk-diff-row">
      <div className="wk-diff-field">
        <span>{label}</span>
        {confidence ? <em className={`wk-conf wk-conf-${confidence}`}>{confidence}</em> : null}
      </div>
      <div className="wk-diff-proposed">
        {proposed ? (
          <>
            <p>{proposed}</p>
            {proposed !== value ? (
              <button type="button" className="wk-tab" onClick={() => onChange(proposed)}>
                Accept
              </button>
            ) : null}
          </>
        ) : (
          <p className="wk-note">Not described</p>
        )}
      </div>
      <div>
        <textarea
          className="wk-select"
          rows={2}
          value={value}
          placeholder="Nothing accepted"
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

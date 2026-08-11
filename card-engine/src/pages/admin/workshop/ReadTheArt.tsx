import { useState } from 'react';
import { RANKS } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import {
  proposeIdentityFromArt, applyAcceptedFields, READABLE_FIELDS,
  type ArtReading, type ReadableField,
} from '../../../services/workshop/readArt';
import { API_COST_CATALOG } from '../../../data/economy/apiCostCatalog';
import {
  AdminCard, AdminSection, AdminButton, AdminTextArea, AdminAlert, AdminEmptyState,
} from '../../../components/admin/ui';
import { Triptych, FieldDiffHeader, FieldDiffRow, StatusBadge, StageIntro } from '../../../components/admin/workshop';

/**
 * Stage 3 — read the art.
 *
 * The three images are described into an identity sheet, field by field, and a
 * human accepts each one. Nothing is written until they do.
 *
 * The two columns matter: what the model SAID stays next to what was ACCEPTED,
 * so an edited value is visibly an edit and not a reading. Fold the proposal
 * silently into the sheet and nobody can tell afterwards which parts were
 * observed in the art.
 */

const READ_COST = API_COST_CATALOG.forge_card?.estimatedDirectCostUsd ?? 0;

export function ReadTheArt({ character }: { character: CuratedCharacter }) {
  const store = getCuratedRosterStore();
  const master = character.masterArt ?? {};
  const available = RANKS.filter((r) => master[r]?.portraitUrl);

  const [reading, setReading] = useState<ArtReading | null>(null);
  const [accepted, setAccepted] = useState<Partial<Record<ReadableField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await proposeIdentityFromArt({
        archetype: character.archetype,
        images: available.map((rank) => ({ rank, url: master[rank]!.portraitUrl })),
      });
      setReading(result);
      setAccepted(seedAccepted(character));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
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
      <AdminCard surface="subtle">
        <AdminEmptyState
          title="The three rank images come first"
          description="This stage describes what is in the pictures. Add them at intake."
        />
      </AdminCard>
    );
  }

  const filled = Object.values(accepted).filter((v) => v && v.trim()).length;

  return (
    <div className="grid gap-4">
      <StageIntro
        step="03"
        title="Read the art — write down who this character actually is"
        next="the description goes with the card to Tori, who writes its name and story from it."
      >
        <p className="m-0 mb-2">
          Claude looks at all three pictures and describes the person in them &mdash; body, age,
          skin, hair, clothing, scars, the setting. You accept each line, edit it, or leave it out.
          Nothing is saved until you press Accept.
        </p>
        <p className="m-0">
          This is the record of what the character looks like, and everything downstream trusts it:
          the lore is written against it, and later ranks have to stay the same person. Reading all
          three ranks together is what keeps them consistent.
        </p>
      </StageIntro>

      <AdminSection
        title={character.displayName || character.id}
        actions={<StatusBadge status={character.status} />}
      >
        <AdminCard>
          <Triptych art={master} />
          {available.length < RANKS.length && (
            <p className="mt-3 text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>
              Reading {available.length} of 3 ranks. A partial set can be read, but continuity across
              ranks cannot be checked from it — which is the whole point of reading all three at once.
            </p>
          )}
        </AdminCard>
      </AdminSection>

      <AdminSection
        title="The identity sheet"
        actions={character.identityAcceptedAt ? (
          <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            Accepted {new Date(character.identityAcceptedAt).toLocaleDateString()}
          </span>
        ) : null}
      >
        {!reading ? (
          <AdminCard>
            <div className="grid gap-3 max-w-xl">
              <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
                The images are the truth here and the sheet describes them — not the other way round.
                Because all three ranks are read together, continuity is observed rather than enforced.
              </p>
              {error && <AdminAlert tone="danger">{error}</AdminAlert>}
              <AdminButton variant="primary" disabled={busy} onClick={() => void read()}>
                {busy ? 'Looking at the art…' : `Read the art · ~$${READ_COST.toFixed(2)}`}
              </AdminButton>
            </div>
          </AdminCard>
        ) : (
          <AdminCard padded={false}>
            {reading.notes && (
              <div className="p-4" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                <p className="text-xs m-0" style={{ color: 'var(--admin-text-muted)' }}>
                  <strong style={{ color: 'var(--admin-text)' }}>Noticed:</strong> {reading.notes}
                </p>
              </div>
            )}

            <FieldDiffHeader />
            {READABLE_FIELDS.map((field) => {
              const proposed = reading.fields[field];
              const value = accepted[field] ?? '';
              return (
                <FieldDiffRow
                  key={field}
                  label={field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  proposed={proposed}
                  confidence={reading.confidence[field]}
                  onAccept={proposed && proposed !== value
                    ? () => setAccepted((a) => ({ ...a, [field]: proposed }))
                    : undefined}
                >
                  <AdminTextArea
                    rows={2}
                    value={value}
                    placeholder="Nothing accepted"
                    onChange={(e) => setAccepted((a) => ({ ...a, [field]: e.target.value }))}
                  />
                </FieldDiffRow>
              );
            })}

            <div className="p-4 grid gap-3">
              {error && <AdminAlert tone="danger">{error}</AdminAlert>}
              <div className="flex flex-wrap gap-2 items-center">
                <AdminButton variant="primary" disabled={saving || filled === 0} onClick={() => void save()}>
                  {saving ? 'Saving…' : `Accept ${filled} field${filled === 1 ? '' : 's'}`}
                </AdminButton>
                <AdminButton onClick={() => setAccepted(Object.fromEntries(
                  READABLE_FIELDS.filter((f) => reading.fields[f]).map((f) => [f, reading.fields[f]!]),
                ))}>
                  Take everything proposed
                </AdminButton>
                <AdminButton variant="ghost" onClick={() => setAccepted({})}>Clear</AdminButton>
              </div>
              <p className="text-[11px] leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
                Only accepted fields are written. The sheet is what the lore director writes against,
                so a wrong value here becomes a wrong story.
              </p>
            </div>
          </AdminCard>
        )}
      </AdminSection>
    </div>
  );
}

/**
 * A bench character's presentation was DECIDED by the identity roller, not
 * inferred from a picture. Where that is known it is better evidence than a
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

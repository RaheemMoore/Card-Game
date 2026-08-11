import { useState } from 'react';
import { RANKS } from '../../../types/card';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { READABLE_FIELDS } from '../../../services/workshop/readArt';
import { AdminCard, AdminSection, AdminButton, AdminAlert } from '../../../components/admin/ui';
import { Triptych, Checklist, StatusBadge, StageIntro } from '../../../components/admin/workshop';

/**
 * Stage 4 — propose.
 *
 * The hand-off out of the Workshop. The three images and the identity sheet go
 * to Tori's desk in the studio wiki, where the lore and the Story Pillar
 * bindings are written. Nothing becomes permanent without passing through her
 * (Raheem, 2026-08-10).
 *
 * The checks here are the Workshop's half of the permanence gate and no more.
 * Sending an incomplete proposal wastes the lore director's time on a character
 * that will bounce, so the button stays shut until our side is actually done —
 * but it deliberately does NOT check her half, which she has not started.
 */

export interface ProposalCheck {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
}

/**
 * Pure so it can be tested and so the same predicate drives both the checklist
 * and the button. A list that can disagree with the control next to it is worse
 * than no list.
 */
export function proposalChecks(character: CuratedCharacter): ProposalCheck[] {
  const master = character.masterArt ?? {};
  const missingArt = RANKS.filter((r) => !master[r]?.portraitUrl);
  const emptyIdentity = READABLE_FIELDS.filter((f) => {
    const value = (character.identity as unknown as Record<string, string>)[f];
    return !value || !value.trim();
  });

  return [
    {
      id: 'art',
      label: 'All three rank images are in',
      ok: missingArt.length === 0,
      detail: missingArt.length > 0 ? `Missing ${missingArt.join(', ')}` : undefined,
    },
    {
      id: 'identity-accepted',
      label: 'The identity sheet has been accepted by a human',
      ok: Boolean(character.identityAcceptedAt),
      detail: character.identityAcceptedAt ? undefined : 'Read the art and accept the fields',
    },
    {
      id: 'identity-filled',
      label: 'The identity sheet describes the character',
      ok: emptyIdentity.length === 0,
      detail:
        emptyIdentity.length > 0
          ? `${emptyIdentity.length} field${emptyIdentity.length === 1 ? '' : 's'} still blank`
          : undefined,
    },
    {
      id: 'name',
      label: 'It has a working name',
      ok: Boolean(character.displayName.trim()),
    },
    {
      id: 'not-sent',
      label: 'It is not already with the lore director',
      ok: character.status !== 'awaiting_lore' && character.status !== 'lore_ready',
      detail:
        character.status === 'awaiting_lore'
          ? 'Already on her desk'
          : character.status === 'lore_ready'
            ? 'She has finished — it is in the review space'
            : undefined,
    },
  ];
}

export function Propose({ character }: { character: CuratedCharacter }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const checks = proposalChecks(character);
  const blocking = checks.filter((c) => !c.ok);
  const master = character.masterArt ?? {};

  const propose = async () => {
    setBusy(true);
    setError(null);
    try {
      await getCuratedRosterStore().saveCharacter({
        ...character,
        status: 'awaiting_lore',
        proposedAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4">
      <StageIntro
        step="04"
        title="Propose — hand the character to the lore director"
        next="it appears on Tori's desk in the Studio Wiki. She names it, writes the lore for each rank, and chooses which player answers lead to it."
      >
        <p className="m-0">
          Your half is the pictures and the description. Hers is the story. The checklist below is
          only about your half &mdash; it deliberately does not ask for lore, because that is the
          thing you are asking her for. Sending an unfinished card just means it bounces back.
        </p>
      </StageIntro>

      <AdminSection
        title={character.displayName || character.id}
        actions={<StatusBadge status={character.status} />}
      >
        <AdminCard><Triptych art={master} /></AdminCard>
      </AdminSection>

      <AdminSection title="Before it goes to the lore director">
        <AdminCard>
          <Checklist items={checks} />

          {error && <div className="mt-3"><AdminAlert tone="danger">{error}</AdminAlert></div>}

          {character.status === 'awaiting_lore' ? (
            <p className="mt-4 text-xs leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
              Sent {character.proposedAt ? new Date(character.proposedAt).toLocaleString() : ''}. It is
              waiting on Tori's desk — that is a status, not a delay you can clear from here.
            </p>
          ) : (
            <>
              <div className="mt-4">
                <AdminButton
                  variant="primary"
                  disabled={busy || blocking.length > 0}
                  onClick={() => void propose()}
                >
                  {busy ? 'Sending…' : 'Send to the lore director'}
                </AdminButton>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed m-0" style={{ color: 'var(--admin-text-muted)' }}>
                She writes the name, the lore for each rank, and claims which Story Pillar answers
                lead players to this character. It comes back here for final review.
              </p>
            </>
          )}
        </AdminCard>
      </AdminSection>
    </div>
  );
}

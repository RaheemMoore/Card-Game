import { Route } from 'lucide-react';
import type { ArchetypeName } from '../../../types/card';
import type { StoryPillarQuestion } from '../../../types/bible';
import type { CuratedCharacter } from '../../../types/curatedCard';
import { AdminCard } from '../../../components/admin/ui';
import { ClaimStepper } from './ClaimStepper';
import { QuestionForge } from './QuestionForge';

/**
 * The two halves of ONE thing, said once.
 *
 * Raheem, using the desk: he could not tell what the claim grid and the
 * question forge were for, or how they differed. They had shipped as two
 * unlabelled checkbox lists sitting next to each other, which reads as the
 * same job done twice.
 *
 * They are the two passes of player routing — the shared bank narrows an
 * archetype to a few candidates, then this character's own questions separate
 * those finalists. Saying that once, at the top, is the whole fix; the two
 * halves then only need to say which pass they are.
 */
export function RoutingSection({
  character,
  siblings,
  questions,
  loreComplete,
  claimedCountFor,
  isClaimed,
  onToggle,
  onChange,
}: {
  character: CuratedCharacter;
  siblings: readonly CuratedCharacter[];
  questions: readonly StoryPillarQuestion[];
  loreComplete: boolean;
  claimedCountFor: (questionId: string) => number;
  isClaimed: (questionId: string, optionId: string) => boolean;
  onToggle: (questionId: string, optionId: string) => void;
  onChange: (next: CuratedCharacter) => void;
}) {
  const archetype: ArchetypeName = character.archetype;

  return (
    <AdminCard className="grid gap-4">
      <header className="grid gap-1.5">
        <h2
          className="m-0 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5"
          style={{ color: 'var(--admin-text)' }}
        >
          <Route size={14} style={{ color: 'var(--admin-accent-alt)' }} aria-hidden="true" />
          How a player finds this character
        </h2>
        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)', maxWidth: '68ch' }}>
          A player answers questions on their way in, and their answers decide which character they
          end up holding. It happens in two passes.
        </p>
      </header>

      {/* Pass 1 — the shared bank */}
      <section className="grid gap-2">
        <h3 className="m-0 text-[11px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          1. The shared bank — which answers point here
        </h3>
        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)', maxWidth: '68ch' }}>
          Every {archetype} answers these same questions. Claiming an answer says “a player who
          chose this belongs with them”. This pass narrows the field to two or three characters.
          A question with nothing claimed is a dead end — anyone who answers it can never reach
          this character.
        </p>
        <ClaimStepper
          archetype={archetype}
          questions={questions}
          claimedCountFor={claimedCountFor}
          isClaimed={isClaimed}
          onToggle={onToggle}
        />
      </section>

      {/* Pass 2 — her own questions */}
      <section className="grid gap-2 pt-4" style={{ borderTop: '1px solid var(--admin-border)' }}>
        <h3 className="m-0 text-[11px] font-semibold" style={{ color: 'var(--admin-text)' }}>
          2. Their own questions — the tiebreaker round
        </h3>
        <p className="m-0 text-[11px] leading-relaxed" style={{ color: 'var(--admin-text-muted)', maxWidth: '68ch' }}>
          When two or three {archetype}s are still standing, these separate them. A good tiebreaker
          question is one where this character and their siblings would answer <em>differently</em>.
          If every {archetype} would answer it the same way, it decides nothing.
        </p>
        <QuestionForge
          character={character}
          siblings={siblings}
          loreComplete={loreComplete}
          onChange={onChange}
        />
      </section>

      <p
        className="m-0 text-[11px] italic leading-relaxed pt-3"
        style={{ color: 'var(--admin-text-muted)', borderTop: '1px solid var(--admin-border)', maxWidth: '68ch' }}
      >
        After these, one last visual round shows the finalists' Foundation portraits and asks which
        one calls to you. That round is automatic — there is nothing to write for it.
      </p>
    </AdminCard>
  );
}

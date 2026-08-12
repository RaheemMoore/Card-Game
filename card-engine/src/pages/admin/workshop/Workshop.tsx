import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminPage, AdminCard, AdminEmptyState, AdminButton } from '../../../components/admin/ui';
import { StageRail, StatusBadge, type StageDef } from '../../../components/admin/workshop';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import { RosterBoard } from './RosterBoard';
import { Bench } from './Bench';
import { Intake } from './Intake';
import { ReadTheArt } from './ReadTheArt';
import { Propose } from './Propose';
import { ReviewSpace } from './ReviewSpace';
import { Variants } from './Variants';
import { ReviewThread } from './ReviewThread';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * The Workshop — where a card becomes permanent.
 *
 * Raheem, 2026-08-10: "Only cards that go through this workshop and are now
 * labeled as permanent cards will be included in the game… It's like a filter.
 * A card should have to reach a certain state before it gets through this."
 *
 * Everything in `public.cards` is TEMPORARY. This tool is the boundary; the
 * roster it produces (`curated_characters` / `curated_variants`) is the far
 * side of it.
 *
 * The pipeline crosses two surfaces, which is why a stage can end in a hand-off
 * rather than a result:
 *
 *   WORKSHOP                    LORE DESK (/admin/lore-desk)  WORKSHOP
 *   bench → intake →            lore + claim grid             review space
 *   read the art → propose ──►  confirm ────────────────►     approve → permanent
 *                                       ◄── send back ───     (with a note)
 *
 * Two things are deliberately NOT here:
 *   - **Lore.** It belongs to the lore director, at the Lore Desk — its own
 *     admin page below this one (it lived in the studio wiki until 2026-08-11).
 *   - **Stats.** A curated character is an identity, not a statline. Players
 *     roll their own inside the archetype's bias tiers and level them through
 *     play, so two people who pull the same character differ.
 *
 * Stage and character both live in the query string, so any point in the
 * pipeline is linkable and a reload lands where you were.
 */

const STAGES: readonly StageDef[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'bench', label: 'Bench' },
  { id: 'intake', label: 'Intake' },
  { id: 'art', label: 'Read the art' },
  { id: 'propose', label: 'Propose' },
  { id: 'review', label: 'Review space' },
  { id: 'variants', label: 'Variants' },
];

export function Workshop() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('stage') ?? 'roster';
  const stage = STAGES.some((s) => s.id === requested) ? requested : 'roster';
  const characterId = params.get('character');

  /**
   * A bench candidate on its way to intake. Held in memory rather than the URL:
   * it is a selection, not work. If a reload drops it the candidate is still in
   * the bench's list one click away, whereas putting a whole generation in the
   * query string would make every link unreadable.
   */
  const [seed, setSeed] = useState<BenchCandidate | null>(null);

  useCuratedRoster();
  const character = characterId ? getCuratedRosterStore().getCharacter(characterId) : undefined;

  const patchParams = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) merged.delete(key);
      else merged.set(key, value);
    }
    setParams(merged);
  };
  const selectStage = (id: string) => patchParams({ stage: id });
  const openCharacter = (id: string) => patchParams({ stage: 'intake', character: id });

  // Stages that work on one character are locked until one is chosen. The rail
  // says why rather than silently refusing.
  const stages = STAGES.map((s) =>
    ['art', 'propose', 'variants'].includes(s.id) && !character
      ? { ...s, lockedReason: 'Pick a character' }
      : s,
  );

  const current = STAGES.find((s) => s.id === stage);
  const showThread = character !== undefined && ['art', 'propose', 'variants'].includes(stage);

  return (
    <AdminPage
      title="Workshop"
      description={
        <>
          Where a card earns its place in the game. Every card that exists today is temporary; one
          becomes <strong>permanent</strong> only by crossing this tool. The stages run left to
          right: make or bring three pictures of a character, describe who they are, hand them to
          the lore director for a name and a story, then judge the result together. Each stage
          explains itself when you open it.
        </>
      }
      actions={
        character ? (
          <div className="flex items-center gap-2">
            <span className="text-sm truncate max-w-[16rem]" style={{ color: 'var(--admin-text)' }}>
              {character.displayName || character.id}
            </span>
            <StatusBadge status={character.status} />
            <AdminButton size="sm" variant="ghost" onClick={() => patchParams({ character: null, stage: 'roster' })}>
              Close
            </AdminButton>
          </div>
        ) : null
      }
    >
      <StageRail stages={stages} current={stage} onSelect={selectStage} />

      {stage === 'roster' ? (
        <RosterBoard onOpenCharacter={openCharacter} />
      ) : stage === 'review' ? (
        <ReviewSpace onOpenCharacter={openCharacter} />
      ) : stage === 'bench' ? (
        <Bench
          onUseAsSeed={(candidate) => {
            setSeed(candidate);
            patchParams({ stage: 'intake', character: null });
          }}
        />
      ) : (
        <div
          className={showThread ? 'grid gap-4 items-start xl:grid-cols-[minmax(0,1fr)_minmax(0,320px)]' : ''}
        >
          <div className="min-w-0">
            {stage === 'intake' ? (
              <Intake
                characterId={characterId}
                seed={seed}
                onCharacterCreated={openCharacter}
                onSeedConsumed={() => setSeed(null)}
              />
            ) : stage === 'art' ? (
              character ? <ReadTheArt character={character} /> : <NoCharacter onBack={() => selectStage('roster')} />
            ) : stage === 'propose' ? (
              character ? <Propose character={character} /> : <NoCharacter onBack={() => selectStage('roster')} />
            ) : stage === 'variants' ? (
              character ? <Variants character={character} /> : <NoCharacter onBack={() => selectStage('roster')} />
            ) : (
              <AdminCard surface="subtle">
                <AdminEmptyState
                  title={`${current?.label} is not built yet`}
                  description="Planned but unimplemented. It appears in the rail so the shape of the whole pipeline stays visible while it is being built — not because it is ready."
                />
              </AdminCard>
            )}
          </div>
          {showThread && character ? (
            <div className="xl:sticky xl:top-4">
              <ReviewThread character={character} origin="workshop" />
            </div>
          ) : null}
        </div>
      )}
    </AdminPage>
  );
}

/**
 * Every stage past intake works on ONE character, so arriving without one is a
 * navigation accident. Say what is missing and offer the way back rather than
 * rendering an empty form that looks broken.
 */
function NoCharacter({ onBack }: { onBack: () => void }) {
  return (
    <AdminCard surface="subtle">
      <AdminEmptyState
        title="No character selected"
        description="This stage works on one character at a time."
        action={<AdminButton onClick={onBack}>Back to the roster</AdminButton>}
      />
    </AdminCard>
  );
}

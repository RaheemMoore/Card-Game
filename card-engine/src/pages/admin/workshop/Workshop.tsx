import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  WkPageHeader,
  WkPanel,
  WkStageNav,
  WkEmpty,
  type WkStageDef,
} from '../../../components/workshop/ui';
import type { BenchCandidate } from '../../../services/workshop/benchController';
import { getCuratedRosterStore } from '../../../services/persistence/CuratedRosterStore';
import { RosterBoard } from './RosterBoard';
import { Bench } from './Bench';
import { Intake } from './Intake';
import { ReadTheArt } from './ReadTheArt';
import { Propose } from './Propose';
import { ReviewThread } from './ReviewThread';
import { useCuratedRoster } from './useCuratedRoster';

/**
 * The Workshop — where a card becomes permanent.
 *
 * Raheem, 2026-08-10: "Only cards that go through this workshop and are now
 * labeled as permanent cards will be included in the game… It's like a filter.
 * A card should have to reach a certain state before it gets through this."
 *
 * Everything in `public.cards` is TEMPORARY. This tool is the boundary, and the
 * roster it produces (`curated_characters` / `curated_variants`) is the far
 * side of it.
 *
 * The pipeline spans two surfaces, which is why some stages here end in a
 * hand-off rather than a result:
 *
 *   WORKSHOP                    TORI'S DESK (studio wiki)      WORKSHOP
 *   bench → intake →            lore + claim grid              review space
 *   read the art → propose ──►  confirm  ─────────────────►    approve → permanent
 *                                        ◄── send back ────    (with a note)
 *
 * Two things are deliberately NOT here:
 *
 *   - **Lore.** It belongs to the lore director, at her desk in the wiki.
 *   - **Stats.** A curated character is an identity, not a statline. Players
 *     roll their own inside the archetype's bias tiers when they pull the
 *     character, and level them through play (Raheem, 2026-08-10).
 *
 * Stage and character both live in the query string, so any point in the
 * pipeline is linkable and a reload lands exactly where you were.
 */

const STAGES: readonly WkStageDef[] = [
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
   * A bench candidate on its way to intake. Held in memory rather than the URL
   * or storage: it is a selection, not work. If it is lost to a reload the
   * candidate is still sitting in the bench's list, one click away — whereas
   * stuffing a whole generation into the query string would make every link
   * unreadable.
   */
  const [seed, setSeed] = useState<BenchCandidate | null>(null);

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

  const current = STAGES.find((s) => s.id === stage);

  // Subscribes the whole page to the roster so a save in any stage re-renders
  // the others (the thread rail in particular, which sits beside them).
  useCuratedRoster();
  const character = characterId ? getCuratedRosterStore().getCharacter(characterId) : undefined;

  /**
   * The discussion rail rides along from the art stage onward — the point of it
   * is that the argument happens WHILE you are looking at the character, not in
   * a separate place you have to remember to open.
   */
  const showThread = character !== undefined && ['art', 'propose', 'variants'].includes(stage);

  return (
    <div className="workshop-root" style={{ padding: '4px 0 60px' }}>
      <WkPageHeader
        eyebrow="THE PERMANENT BOUNDARY"
        title="Workshop"
        intro="Every card in the game today is temporary. A character becomes permanent by crossing this tool — generated or brought in, described from its own art, written by the lore director, then judged."
      />

      <WkStageNav stages={STAGES} current={stage} onSelect={selectStage} />

      {stage === 'roster' ? (
        <RosterBoard onOpenCharacter={openCharacter} />
      ) : stage === 'bench' ? (
        <Bench
          onUseAsSeed={(candidate) => {
            setSeed(candidate);
            patchParams({ stage: 'intake', character: null });
          }}
        />
      ) : (
        <div
          className={showThread ? 'wk-with-thread' : undefined}
          style={
            showThread
              ? { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)', gap: 16, alignItems: 'start' }
              : undefined
          }
        >
          <div style={{ minWidth: 0 }}>
            {stage === 'intake' ? (
              <Intake
                characterId={characterId}
                seed={seed}
                onCharacterCreated={openCharacter}
                onSeedConsumed={() => setSeed(null)}
              />
            ) : stage === 'art' ? (
              character ? (
                <ReadTheArt character={character} />
              ) : (
                <NoCharacter onGoToRoster={() => selectStage('roster')} />
              )
            ) : stage === 'propose' ? (
              character ? (
                <Propose character={character} />
              ) : (
                <NoCharacter onGoToRoster={() => selectStage('roster')} />
              )
            ) : (
              <WkPanel title={current?.label ?? 'Stage'}>
                <WkEmpty title={`${current?.label} is not built yet`}>
                  This stage is planned but unimplemented. It is shown in the rail so the shape of
                  the whole pipeline is visible while it is being built — not because it is ready.
                </WkEmpty>
              </WkPanel>
            )}
          </div>
          {showThread && character ? (
            <div style={{ position: 'sticky', top: 12 }}>
              <ReviewThread character={character} origin="workshop" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Every stage past intake is about ONE character, so arriving without one is a
 * navigation accident rather than an error. Say which is missing and offer the
 * way back, instead of rendering an empty form that looks broken.
 */
function NoCharacter({ onGoToRoster }: { onGoToRoster: () => void }) {
  return (
    <WkPanel title="No character selected">
      <WkEmpty title="This stage works on one character at a time">
        Pick a slot from the roster to carry on with it.
      </WkEmpty>
      <button type="button" className="wk-tab" style={{ marginTop: 12 }} onClick={onGoToRoster}>
        Back to the roster
      </button>
    </WkPanel>
  );
}

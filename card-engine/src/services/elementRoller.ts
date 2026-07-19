import type { ArchetypeName } from '../types/card';
import type { ElementName, StoryPillarAnswers } from '../types/bible';
import {
  BUCKET_WEIGHTS,
  bucketFor,
  elementIsNarrativelyEligible,
  elementsAvailableToArchetype,
} from '../data/elements';

/**
 * Random element roll — Bible §Global Element Pillar + §Element rarity.
 *
 * Player experience decision (approved 2026-07-19): the ELEMENT is rolled
 * automatically after Story Pillars finish. The player only picks their
 * BOND with the element. This makes the element feel like part of the
 * character revealing themselves, not a menu choice, and increases
 * variety across playthroughs.
 *
 * Roll process:
 *   1. Filter to elements narratively eligible per Bible §Element rarity
 *      Gate A (Rare requires supporting Story Pillar answers).
 *   2. Weight by compatibility bucket per BUCKET_WEIGHTS (Naturally
 *      Compatible more often, Rare less often — Bible §Element rarity
 *      Gate B).
 *   3. Pick one.
 */
export function rollElement(
  archetype: ArchetypeName,
  answers: StoryPillarAnswers,
): ElementName {
  const all = elementsAvailableToArchetype(archetype);
  const eligible = all.filter((e) =>
    elementIsNarrativelyEligible(archetype, e, answers.answers),
  );

  const pool = eligible.length > 0 ? eligible : all;

  const totalWeight = pool.reduce(
    (sum, e) => sum + BUCKET_WEIGHTS[bucketFor(archetype, e)],
    0,
  );

  let target = Math.random() * totalWeight;
  for (const element of pool) {
    target -= BUCKET_WEIGHTS[bucketFor(archetype, element)];
    if (target <= 0) return element;
  }
  return pool[pool.length - 1];
}

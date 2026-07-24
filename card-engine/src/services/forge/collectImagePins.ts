import type { ArchetypeName } from '../../types/card';
import type { ImageDirective, StoryPillarAnswers } from '../../types/bible';
import type { ElementName } from '../../types/bible';
import { visualQuestionsFor } from '../../data/visualPillars';

/**
 * Image-first forge (2026-07-24) — resolve the player's overt visual choices
 * into a single `ImageDirective` the identity roller + character-sheet factory
 * consume.
 *
 * `StoryPillarAnswer` persists only `{questionId, optionId, answer}` — it does
 * NOT snapshot the option's `image` directive (types/bible.ts). So the pins are
 * re-resolved from `optionId` against the SAME generator the wizard rendered
 * (`visualQuestionsFor`), keeping one source of truth for both surfaces.
 *
 * Merge order = question order; a later question's defined field wins. Each
 * lever pins mostly disjoint fields (form → species/speciesForm/motifs,
 * build → build, weapon → weapon, companion → companionPresence/companion) so
 * collisions are rare by construction.
 *
 * Returns ONLY what the answers pin. The caller supplies the `species:'humanoid'`
 * default so non-piloted archetypes (no visual questions ⇒ {}) keep the
 * image-first humanoid guarantee and never regress to the 40% non-human roll.
 */
export function collectImagePins(
  archetype: ArchetypeName,
  element: ElementName,
  answers: StoryPillarAnswers,
): ImageDirective {
  const { options } = visualQuestionsFor(archetype, element);
  if (options.length === 0) return {};

  const byId = new Map(options.map((o) => [o.id, o]));
  const merged: ImageDirective = {};

  for (const answer of answers.answers) {
    const image = byId.get(answer.optionId)?.image;
    if (!image) continue;
    for (const [key, value] of Object.entries(image)) {
      if (value !== undefined && value !== null) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }
  }

  return merged;
}

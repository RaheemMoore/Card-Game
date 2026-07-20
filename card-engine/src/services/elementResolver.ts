import type { Card } from '../types/card';
import type { ElementName } from '../types/bible';

/**
 * Resolves the element the art/prompt pipeline should consume for a card.
 *
 * `currentElement` is set only by narrative-axis transmutation (e.g. a
 * Fallen Seraph's Light becoming Infernal at tier-up — see
 * services/tierUp.ts and data/narrativeAxes/seraphAlignment.ts).
 * Non-Seraphs and legacy cards fall back to their origin element from
 * `elementSelection`.
 */
export function resolveCurrentElement(card: Card): ElementName | undefined {
  return card.currentElement ?? card.elementSelection?.element;
}

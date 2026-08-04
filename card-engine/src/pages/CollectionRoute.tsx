import { useNavigate } from 'react-router-dom';
import { CollectionStall } from './castle/stalls/CollectionStall';

/**
 * `/collection` — now the in-world case, not the old web page.
 *
 * Raheem, 2026-08-04: "We'll go ahead and remove the entire collection screen
 * there. And then whenever you hit pause, you'll see the collection screen and
 * you can go there, and it'll show this instead of the old one."
 *
 * The pause menu already links to `/collection`, so pointing this route at the
 * stall UI is the whole wiring — the menu needed no change.
 *
 * WHY A ROUTE AT ALL, when the goal is a stall you walk to: the four courtyard
 * quadrants are still being designed. Until a stall can open it, this is how the
 * surface stays reachable and reviewable. When the stall lands, this route can
 * either retire or stay as the fast path the pause menu already relies on.
 *
 * WHAT THE OLD PAGE HAD THAT THIS DOES NOT — flagged, not silently dropped:
 * archetype/rank filters, five sort orders, card deletion, and the CardSheet
 * detail view. Those are real features and their removal is a decision, not an
 * oversight; see PRODUCTION.md §4. The old component still exists in
 * `pages/Collection.tsx` and is no longer routed.
 */
export function CollectionRoute() {
  const navigate = useNavigate();
  // Back to the castle rather than history.back(): arriving here from the pause
  // menu means "back" is the castle anyway, and a deep link with no history
  // would otherwise strand the player on a dead close button.
  return <CollectionStall onClose={() => navigate('/castle')} />;
}

/**
 * What a stall is, for the React panels that open on top of the world.
 *
 * WHY THIS FILE EXISTS. The definition used to live in the top-down courtyard's
 * `stalls.ts`, alongside the coordinates each stall was traced onto the painted
 * plate at. That plate and its coordinates died with the perspective change on
 * 2026-08-16 — the stall PANELS did not, because a collection screen is a
 * collection screen whichever way the camera points.
 *
 * So the geometry is gone and only identity remains. Where a stall stands in a
 * side-view castle is a placement question, and placement now belongs to Phaser
 * Editor rather than to a hand-traced table in TypeScript.
 */

export interface Stall {
  id: string;
  /** Shown on the proximity ribbon and in the Directory. */
  label: string;
  /** Copy for the not-yet-wired panel. */
  placeholder: string;
}

/**
 * The four doors the castle is meant to have.
 *
 * None is wired to the side-view world yet — the hub-with-doors shape is the
 * plan, not the state. Kept as a list so the panels have something real to
 * preview and so the set does not quietly get forgotten in the move.
 */
export const DESTINATIONS: Record<string, Stall> = {
  collection: {
    id: 'collection',
    label: 'The Collection',
    placeholder: 'Your characters, in their case.',
  },
  forge: {
    id: 'forge',
    label: 'The Crafting Stall',
    placeholder: 'Where a character is made.',
  },
  battles: {
    id: 'battles',
    label: 'The Battle Tower',
    placeholder: 'The tower is the gate. Beating it opens the rest of the game.',
  },
  minigames: {
    id: 'minigames',
    label: 'The Training Yard',
    placeholder: 'Practice, and the small games that pay in gold.',
  },
};

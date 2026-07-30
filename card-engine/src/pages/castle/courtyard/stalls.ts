/**
 * The courtyard's destinations, in one place.
 *
 * This array is the single source of truth for three consumers: the Phaser
 * colliders, the focusable DOM buttons layered over the canvas, and the
 * Directory fallback list. Same discipline as components/nav/navConfig.ts —
 * if they each held their own copy they would drift.
 *
 * Nothing here is wired to a real feature yet. Interacting opens a
 * placeholder; connecting stalls to the Forge, Collection, Minigames, and
 * Boss Battles is a separate plan.
 */
import { KEEPERS } from '../../../data/castle/keepers';

export interface Stall {
  id: string;
  /** Shown on the proximity ribbon and in the Directory. */
  label: string;
  /** Centre point in canvas coordinates. */
  x: number;
  y: number;
  /** Collider footprint. */
  width: number;
  height: number;
  /** Copy for the not-yet-wired panel. */
  placeholder: string;
  /**
   * Plinths are painted-but-empty stands reserved for future destinations.
   * They collide and are visible, but are not interactive and never appear
   * in the Directory.
   */
  reserved?: boolean;
}

/**
 * Positions are traced onto the painted plate, not laid out abstractly — a
 * collider has to sit on the thing it represents. Re-trace if the plate is
 * regenerated. The current plate concentrates its stalls on the right side,
 * so the left-hand destination sits on the carts along the west wall; a
 * future plate should carry four clearly distinct stalls.
 */

/** Hero spawns on open paving below the fountain. */
export const HERO_SPAWN = { x: 768, y: 830 } as const;

/**
 * Arranged as a diamond around the spawn point. Placement deliberately avoids
 * the bottom band (72px + safe-area) and the desktop left rail (224px), where
 * BottomNav/SideNav will return once the castle becomes the home surface —
 * free insurance against repainting the plate later.
 */
export const STALLS: Stall[] = [
  {
    id: 'battles',
    label: 'The Battle Tower',
    x: 768,
    y: 250,
    width: 260,
    height: 150,
    placeholder: 'The tower gate. Not yet connected to boss battles.',
  },
  {
    id: 'forge',
    label: 'The Crafting Stall',
    x: 1300,
    y: 470,
    width: 190,
    height: 260,
    placeholder: 'Where cards are forged. Not yet connected to the Forge itself.',
  },
  {
    id: 'collection',
    label: 'The Collection',
    x: 1225,
    y: 745,
    width: 150,
    height: 120,
    placeholder: 'Your gathered characters. Not yet connected to the Collection.',
  },
  {
    // Traced to the west wall's benches and planters, which a paving probe puts
    // at x < 290 (paving is 0% out to x 260, 25% by 280, 64% by 300).
    //
    // WAS x 185-315, AND THAT MADE A DEAD END. The upper lamps' colliders start
    // at x 330, so the corridor between them was 15px wide — narrower than the
    // hero's 26px feet box, so he simply could not walk down the west side.
    // Raheem found it by trying. When two colliders face each other, the gap has
    // to clear HERO_FEET.width or it is a wall that looks like a path.
    id: 'minigames',
    label: 'The Training Yard',
    x: 240,
    y: 620,
    width: 80,
    height: 320,
    placeholder: 'Training and games. Not yet connected to the minigames.',
  },
  {
    // The fountain is scenery, but it is solid — you walk around it, and it
    // gives the open middle of the courtyard something to read against.
    id: 'fountain',
    label: 'Fountain',
    x: 768,
    y: 600,
    width: 250,
    height: 190,
    placeholder: '',
    reserved: true,
  },
];

/** Stalls a player can actually interact with — excludes reserved plinths. */
export const DESTINATIONS = STALLS.filter((s) => !s.reserved);

/**
 * Everything the player can walk up to and interact with: stall destinations
 * PLUS the shopkeepers standing in the courtyard.
 *
 * Keepers are deliberately absent from DESTINATIONS, because that array drives
 * the Directory — which lists places you can go, not people you can talk to.
 */
export const INTERACTABLES: Stall[] = [
  ...DESTINATIONS,
  // Scenery residents (the grazing horse) are excluded: collider yes, prompt no.
  ...KEEPERS.filter((k) => k.interactive !== false).map((k) => ({
    id: k.id,
    label: k.label,
    x: k.x,
    // Prompt anchors on his torso rather than his feet, so the ribbon sits above
    // his head instead of halfway up his body.
    y: k.y - k.height / 2,
    width: k.width,
    height: k.height,
    placeholder: k.placeholder,
  })),
];

/** Ribbon appears inside this radius and hides outside the larger one. */
export const PROXIMITY_ENTER = 120;
export const PROXIMITY_EXIT = 160;

/**
 * Nearest interactive stall within range, with hysteresis: once a stall is
 * active it stays active out to PROXIMITY_EXIT. Without the two thresholds
 * the ribbon flickers when the player idles on the boundary.
 */
export function nearestStall(
  hero: { x: number; y: number },
  activeId: string | null,
): Stall | null {
  let best: Stall | null = null;
  let bestDist = Infinity;

  for (const stall of INTERACTABLES) {
    const dist = Math.hypot(stall.x - hero.x, stall.y - hero.y);
    const threshold = stall.id === activeId ? PROXIMITY_EXIT : PROXIMITY_ENTER;
    if (dist <= threshold && dist < bestDist) {
      best = stall;
      bestDist = dist;
    }
  }
  return best;
}

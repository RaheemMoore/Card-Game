/**
 * Tower scene events. Deliberately Phaser-free, exactly like the courtyard's,
 * so the DOM overlay can import these names without dragging the ~1MB engine
 * into the synchronous bundle.
 */
export const TOWER_EVENTS = {
  heroMoved: 'tower:hero-moved',
  walkTo: 'tower:walk-to',
  motionOff: 'tower:motion-off',
} as const;

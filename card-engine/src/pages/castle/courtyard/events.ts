/**
 * Event names shared between the Phaser scene and the React overlay.
 *
 * These live in their own Phaser-free module on purpose: the overlay is in
 * the synchronous bundle, so importing a value from CourtyardScene.ts would
 * drag the whole ~1.2MB engine out of its lazy chunk and into the main one.
 * Constants only — never import anything Phaser-valued here.
 */
export const COURTYARD_EVENTS = {
  heroMoved: 'courtyard:hero-moved',
  /** Overlay → scene: walk the hero to a point (tapping a stall). */
  walkTo: 'courtyard:walk-to',
  /** React → scene: reduced-motion preference changed (boolean payload). */
  motionOff: 'courtyard:motion-off',
} as const;

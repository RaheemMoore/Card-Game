import type Phaser from 'phaser';
import type {
  WildlifeAnimationSet,
  WildlifeFacing,
  WildlifeSpeciesId,
} from '../../castle/wildlife';

/**
 * The clips, shared by every scene that has animals in it.
 *
 * Extracted from the Wildlife Lab when the courtyard became the second consumer.
 * Keeping one copy is not tidiness — two copies would drift, and a fox that trots
 * at a different rate in the courtyard than in the lab makes the lab useless as a
 * bench for judging the courtyard.
 */

/** Rows in every wildlife sheet, in file order. Confirmed against all six *.meta.json. */
export const ROWS: readonly WildlifeFacing[] = ['down', 'up', 'left', 'right'];

/**
 * One entry per generated sheet.
 *
 * `columns` is the row stride, and it is NOT the loop length: every sheet's meta
 * file marks column 0 of each row as the idle pose and columns 1..columns-1 as
 * the animation. Looping all of them folds the idle pose into the walk cycle as a
 * hitch once per lap, which is what the original demonstration routine did.
 */
export const SHEETS = {
  foxTrot: { texture: 'wildlife-fox-trot', columns: 7, fps: 9 },
  foxSniff: { texture: 'wildlife-fox-sniff', columns: 7, fps: 7 },
  foxSitAlert: { texture: 'wildlife-fox-sit-alert', columns: 9, fps: 7 },
  // Slower than the sniff it replaced. A sniff is quick and searching; lapping is
  // steady, and at 7fps it read as frantic.
  foxDrink: { texture: 'wildlife-fox-drink', columns: 7, fps: 6 },
  rabbitHop: { texture: 'wildlife-rabbit-hop', columns: 7, fps: 9 },
  rabbitNibble: { texture: 'wildlife-rabbit-nibble-groom', columns: 7, fps: 7 },
  tortoiseToddle: { texture: 'wildlife-tortoise-toddle', columns: 7, fps: 5 },
} as const;

export type SheetName = keyof typeof SHEETS;

/** Namespaced so they cannot collide with any key a scene file defines itself. */
export const loopKey = (sheet: SheetName, facing: WildlifeFacing) =>
  `wl-${SHEETS[sheet].texture}-${facing}`;
export const stillKey = (sheet: SheetName, facing: WildlifeFacing) =>
  `wl-${SHEETS[sheet].texture}-${facing}-still`;

export function createWildlifeAnimations(scene: Phaser.Scene): void {
  for (const name of Object.keys(SHEETS) as SheetName[]) {
    const sheet = SHEETS[name];
    if (!scene.textures.exists(sheet.texture)) {
      console.warn(`[wildlife] texture "${sheet.texture}" is not loaded; skipping its clips.`);
      continue;
    }

    ROWS.forEach((facing, row) => {
      const first = row * sheet.columns;

      if (!scene.anims.exists(loopKey(name, facing))) {
        scene.anims.create({
          key: loopKey(name, facing),
          frames: scene.anims.generateFrameNumbers(sheet.texture, {
            start: first + 1,
            end: first + sheet.columns - 1,
          }),
          frameRate: sheet.fps,
          repeat: -1,
        });
      }

      // A one-frame looping animation, so a held pose and a moving clip are the
      // same kind of thing to WildlifeAgent and it never needs a special case.
      if (!scene.anims.exists(stillKey(name, facing))) {
        scene.anims.create({
          key: stillKey(name, facing),
          frames: scene.anims.generateFrameNumbers(sheet.texture, { start: first, end: first }),
          frameRate: 1,
          repeat: -1,
        });
      }
    });
  }
}

const loopSet = (sheet: SheetName): Record<WildlifeFacing, string> =>
  Object.fromEntries(ROWS.map((f) => [f, loopKey(sheet, f)])) as Record<WildlifeFacing, string>;

const stillSet = (sheet: SheetName): Record<WildlifeFacing, string> =>
  Object.fromEntries(ROWS.map((f) => [f, stillKey(sheet, f)])) as Record<WildlifeFacing, string>;

/**
 * Which clip each decision looks like.
 *
 * The tortoise is deliberately restrained: it has one generated sheet, so its
 * "tuck in and softly glow" reads as stopping and holding still rather than as an
 * invented animation. That is honest with the art we have.
 */
export const ANIMATION_SETS: Record<WildlifeSpeciesId, WildlifeAnimationSet> = {
  'red-fox': {
    move: loopSet('foxTrot'),
    signature: loopSet('foxSniff'),
    observe: loopSet('foxSitAlert'),
    idle: stillSet('foxSitAlert'),
    // Real clip as of 2026-08-10, generated against the SAME PixelLab object as
    // the trot and the sniff, so it is the same fox — frame 0 of every direction
    // is pixel-identical to the trot's, which is how the facing was verified.
    // (It replaced a sniff stand-in, which was indistinguishable from an actual
    // sniff and so made drinking impossible to confirm by eye.)
    drink: loopSet('foxDrink'),
  },
  'forest-rabbit': {
    move: loopSet('rabbitHop'),
    signature: loopSet('rabbitNibble'),
    observe: stillSet('rabbitHop'),
    idle: stillSet('rabbitHop'),
    /** STAND-IN — see the fox. Nibbling is head-down too. */
    drink: loopSet('rabbitNibble'),
  },
  'glowcap-tortoise': {
    move: loopSet('tortoiseToddle'),
    signature: stillSet('tortoiseToddle'),
    observe: stillSet('tortoiseToddle'),
    idle: stillSet('tortoiseToddle'),
  },
};

/**
 * The patch of floor an animal occupies — not its picture.
 *
 * Collision is tested against the feet for the same reason the hero's is: a
 * top-down animal is a picture standing on a small patch of ground, and boxing
 * the picture would stop a fox a body-length short of every wall. The hero's is
 * 34×20 at 100px tall; these are scaled to the animals' rendered heights.
 */
export const WILDLIFE_FEET: Record<WildlifeSpeciesId, { width: number; height: number }> = {
  'red-fox': { width: 26, height: 12 },
  'forest-rabbit': { width: 16, height: 10 },
  'glowcap-tortoise': { width: 24, height: 12 },
};

/**
 * Reduced motion, wired to the manager's existing switch. Returns the unsubscribe
 * so a behaviour's `destroy()` can let go of the listener.
 */
export function watchReducedMotion(apply: (off: boolean) => void): () => void {
  const query =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
  if (!query) return () => {};

  if (query.matches) apply(true);
  const onChange = (event: MediaQueryListEvent) => apply(event.matches);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

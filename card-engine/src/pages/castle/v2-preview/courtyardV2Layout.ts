/**
 * Courtyard V2 — everything Raheem placed in Figma, read off the plate.
 *
 * EVERY NUMBER HERE WAS READ FROM THE FIGMA FILE, NOT ESTIMATED. The plate is
 * locked at 1536x1152, which is the game's own coordinate space, so a layer's
 * Figma x/y IS its world x/y. That is the whole reason the plate must never be
 * moved or resized (see the file's own READ ME).
 *
 * Source: file MpUs9WJKMvwTtpH9Akz4Rm, page 0:1, frame `plate` (1:2).
 * Re-read after any Figma edit; do not hand-tune these.
 */

export interface PlacedArt {
  id: string;
  /** Figma node, so a number can always be traced back to what drew it. */
  node: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** World Y of ground contact — the depth sort key. */
  groundY: number;
  /**
   * NOTE: art no longer carries its own collider. Every blocking shape lives in
   * COURTYARD_V2_BLOCKERS below, mirroring one shape in the Figma `colliders`
   * frame — one source of truth, so a footprint can never drift from the shape
   * Raheem is looking at.
   */
}

const A = (p: string) => new URL(`../../../assets/dev-preview/${p}`, import.meta.url).href;

/**
 * Colliders are the FLOOR each thing stands on, never a box around its picture.
 * In a top-down game you walk on the floor, so a collider that matches the
 * artwork's silhouette blocks the player from walking behind things they should
 * be able to walk behind.
 *
 * EVERY COLLIDER IN THIS FILE NOW MIRRORS ONE SHAPE IN THE FIGMA `colliders`
 * FRAME (128:2), and that frame is the single source of truth. Raheem and I work
 * the same layer: he draws the walls, boundaries and thresholds by hand, and the
 * per-object footprints are derived from each sprite's own alpha by
 * `scripts/sprite-lab/lib/derive_colliders.py` and pushed back into the frame so
 * he can see and adjust them.
 *
 * The derivation scans up from a sprite's lowest opaque row and measures the
 * horizontal extent of the band that actually touches the ground — which is why
 * `hall-brazier` is 8px wide against a 24px sprite. It stands on a slim tripod,
 * and a box around the artwork would have blocked three times the floor it
 * occupies.
 *
 * Routes live in a SEPARATE Figma frame, `walking paths` (136:2), so they can be
 * toggled without the colliders. They used to be loose inside `plate`, mixed in
 * with the art, which is why they could not be hidden on their own.
 */
export const COURTYARD_V2_ART: PlacedArt[] = [
  // ── Forge quadrant, top-right ─────────────────────────────────────────────
  {
    id: 'forge', node: '15:2', url: A('forge/forge-cutout.png'),
    x: 865, y: 149, width: 272, height: 240, groundY: 359,
  },
  {
    // Shadow lifted 2026-08-04 — the rug now shows through underneath.
    // The original is kept as counter-depth-WITH-shadow.png.
    id: 'counter', node: '18:2', url: A('forge/counter-depth.png'),
    x: 894, y: 357, width: 214, height: 110, groundY: 467,
  },
  {
    id: 'bench', node: '34:2', url: A('forge/bench-depth.png'),
    x: 898, y: 452, width: 206, height: 103, groundY: 534,
  },
  {
    id: 'dwarf', node: '102:8', url: A('forge-life/dwarf-chibi-south.png'),
    x: 1025, y: 312, width: 36, height: 64, groundY: 376,
    // Raheem asked for one. Kept TIGHT TO HIS FEET (21x7) rather than boxing his
    // body, so the aisle he works in stays walkable — verified: it intrudes on
    // none of the five traced routes.
  },
  {
    id: 'apprentice', node: '100:2', url: A('forge-life/apprentice-chibi-east.png'),
    x: 1108, y: 344, width: 41, height: 66, groundY: 410,
  },
  {
    id: 'element-crystal', node: '74:8', url: A('magical/element-crystal.png'),
    x: 1154, y: 328, width: 68, height: 90, groundY: 418,
  },
  {
    id: 'forge-brazier', node: '108:64', url: A('tower/watch-brazier.png'),
    x: 1174, y: 401, width: 48, height: 70, groundY: 471,
  },
  {
    id: 'griffin-cub', node: '100:10', url: A('forge-life/curled-asleep.png'),
    // Figma nests it inside art-counter at 148,37 — resolved to world here so
    // the scene never has to know about Figma's parenting.
    x: 1042, y: 394, width: 38, height: 37, groundY: 431,
    // Sits ON the counter. The counter's collider is the obstacle; a second one
    // floating at counter height would block the aisle beside it.
  },

  // ── Proving Hall, top-left ────────────────────────────────────────────────
  {
    id: 'muster-board', node: '108:48', url: A('tower/muster-board.png'),
    x: 575, y: 265, width: 100, height: 79, groundY: 344,
  },
  {
    id: 'archivist', node: '108:50', url: A('forge-life/archivist-chibi-south.png'),
    x: 575, y: 287, width: 35, height: 67, groundY: 354,
  },
  {
    id: 'card-stand', node: '108:60', url: A('magical/card-stand.png'),
    x: 421, y: 277, width: 70, height: 77, groundY: 354,
  },
  {
    id: 'hall-brazier', node: '108:62', url: A('tower/watch-brazier.png'),
    x: 551, y: 305, width: 24, height: 43, groundY: 348,
  },
  {
    id: 'mana-font', node: '108:58', url: A('magical/mana-font.png'),
    x: 493, y: 354, width: 106, height: 106, groundY: 460,
  },

  // ── Reliquary row, mid-left ───────────────────────────────────────────────
  {
    id: 'case-gauntlets', node: '108:74', url: A('proving-hall/case-open-hand-gauntlets.png'),
    x: 256, y: 589, width: 69, height: 71, groundY: 660,
    // The four cases share ONE collider (`reliquary-cases-footprint`, Figma
    // 128:13) rather than four slivers. Raheem drew it as a single bar because
    // the gaps between the cases are narrower than the hero can pass anyway.
  },
  {
    id: 'case-living-staff', node: '108:70', url: A('proving-hall/v2/case-living-staff.png'),
    x: 330, y: 553, width: 39, height: 110, groundY: 663,
  },
  {
    id: 'case-judgment-bow', node: '108:68', url: A('proving-hall/v2/case-judgment-bow.png'),
    x: 381, y: 562, width: 64, height: 103, groundY: 665,
  },
  {
    id: 'case-halo-blade', node: '108:76', url: A('proving-hall/v2/case-halo-blade.png'),
    x: 457, y: 525, width: 53, height: 145, groundY: 670,
  },
];

/**
 * EVERY BLOCKING SHAPE, AS RAHEEM TRACED IT — angles and all.
 *
 * These are polygons, not boxes, because the courtyard is drawn in perspective
 * and its walls and counters lean. An upright rectangle cannot express that:
 * the west wall's bounding box is 146x500 and the east wall's is 143x498, and
 * either one would seal off roughly 80px of open paving at both ends.
 *
 * The interim answer — six stacked upright rectangles per wall — is deleted. It
 * gave the floor back but its face jogged ~24px sideways per step against
 * 34px-wide feet, so walking a wall diagonally snagged on every corner. Measured
 * in `walkBlocking.test.ts`: stacked jogs 24px, traced jogs 1px.
 *
 * Collision runs through `walkBlocking.ts`, not Arcade bodies. See that file for
 * why a small fixed map with one walker does not need a physics simulation.
 *
 * Rectangles below are written as four points so everything is one shape type.
 * Re-read from Figma frame `colliders` (128:2) after any edit; the frame is
 * pinned to the plate origin, so its x/y IS world x/y.
 */
export const COURTYARD_V2_BLOCKERS = [
  // ── Walls and boundaries, hand-traced ───────────────────────────────────
  { id: 'west-wall', node: '128:15',
    points: [[311, 221], [326, 370], [241, 720], [180, 679]] },
  { id: 'east-wall', node: '128:17',
    points: [[1238, 228], [1367, 677], [1315, 725], [1225, 374]] },
  { id: 'north-castle', node: '128:11',
    points: [[412, 200], [1134, 200], [1126, 325], [428, 327]] },
  { id: 'south-wall-left', node: '128:19',
    points: [[274, 886], [638, 886], [638, 942], [274, 942]] },
  { id: 'south-wall-right', node: '128:21',
    points: [[910, 886], [1273, 886], [1290, 936], [910, 936]] },
  { id: 'gate-left-pillar', node: '128:23',
    points: [[629, 814], [690, 814], [690, 881], [629, 881]] },
  { id: 'gate-right-pillar', node: '128:25',
    points: [[852, 817], [912, 817], [912, 871], [852, 871]] },

  // ── Furniture, hand-traced. The counter is a true skewed quad — its right
  //    end is deeper than its left, following the paving. ──────────────────
  { id: 'forge', node: '128:3',
    points: [[873, 317], [1129, 316], [1130, 359], [871, 358]] },
  { id: 'counter', node: '128:5',
    points: [[913, 404], [1089, 404], [1098, 453], [913, 455]] },
  { id: 'bench', node: '128:7',
    points: [[921, 486], [1082, 486], [1081, 527], [919, 527]] },
  { id: 'reliquary-cases', node: '128:13',
    points: [[261, 650], [506, 650], [506, 670], [261, 670]] },

  // ── Object footprints. I derived these from sprite alpha; RAHEEM THEN MOVED
  //    AND GREW THEM, and his positions are what is written here. He pulled
  //    most of them up and gave several real depth instead of a razor-thin
  //    foot line, so the player stops just in front of a thing rather than
  //    clipping into its art. ────────────────────────────────────────────────
  { id: 'dwarf', node: '135:7',
    points: [[1033, 364], [1054, 364], [1054, 371], [1033, 371]] },
  { id: 'apprentice', node: '135:8',
    points: [[1125, 399], [1136, 399], [1136, 408], [1125, 408]] },
  { id: 'element-crystal', node: '135:9',
    points: [[1169, 386], [1207, 386], [1207, 418], [1169, 418]] },
  { id: 'forge-brazier', node: '135:10',
    points: [[1185, 439], [1212, 439], [1212, 468], [1185, 468]] },
  { id: 'muster-board', node: '135:11',
    points: [[587, 326], [663, 326], [663, 340], [587, 340]] },
  { id: 'archivist', node: '135:12',
    points: [[580, 340], [607, 340], [607, 347], [580, 347]] },
  { id: 'card-stand', node: '135:13',
    points: [[435, 332], [472, 332], [472, 347], [435, 347]] },
  { id: 'hall-brazier', node: '135:14',
    points: [[554, 332], [574, 332], [574, 343], [554, 343]] },
  { id: 'mana-font', node: '135:15',
    points: [[508, 405], [585, 405], [585, 442], [508, 442]] },
] as const;

/**
 * The fountain is an ellipse, not a polygon — a ring of points would only
 * approximate it and the player circles this thing constantly. Kept as its own
 * shape so the collision test can handle it exactly.
 */
export const COURTYARD_V2_ELLIPSE_BLOCKERS = [
  { id: 'fountain', node: '94:6', x: 649, y: 557, width: 253, height: 158 },
] as const;

/**
 * Routes Raheem drew that must stay walkable. These are NOT colliders — they
 * are assertions. A named scenario walks each one end to end, so "the courtyard
 * is still traversable" is a test result rather than an opinion.
 *
 * Hero feet are 34x20 and navigation tolerance is 4, so 24px is the hard
 * minimum. Each of these is far wider on purpose: a corridor at the minimum
 * reads as a wall and players will not attempt it.
 */
export const COURTYARD_V2_WALK_ROUTES = [
  { id: 'gate-south',    node: '87:16', x: 691, y: 747, width: 163, height: 338 },
  { id: 'gate-north',    node: '94:25', x: 711, y: 374, width: 129, height: 149 },
  { id: 'tower-aisle',   node: '87:18', x: 264, y: 553, width: 372, height: 72 },
  { id: 'forge-aisle',   node: '94:27', x: 899, y: 550, width: 387, height: 74 },
  { id: 'fountain-ring', node: '94:9',  x: 583, y: 514, width: 390, height: 245 },
] as const;

/** Plate space. Load-bearing: every number above is expressed in it. */
export const COURTYARD_V2_WORLD = { width: 1536, height: 1152 } as const;

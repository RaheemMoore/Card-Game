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
   * Ground footprint. Absent means the player walks through it: wall art, a
   * creature sitting on furniture that already has its own collider, or a
   * character who is scenery rather than an obstacle.
   */
  collider?: { x: number; y: number; width: number; height: number };
}

const A = (p: string) => new URL(`../../../assets/dev-preview/${p}`, import.meta.url).href;

/**
 * Colliders are the FLOOR each thing stands on, never a box around its picture.
 * In a top-down game you walk on the floor, so a collider that matches the
 * artwork's silhouette blocks the player from walking behind things they should
 * be able to walk behind.
 *
 * ALL THIRTEEN OF THE NON-TRACED BOXES ARE NOW DERIVED FROM SPRITE ALPHA by
 * `scripts/sprite-lab/lib/derive_colliders.py`, not typed by hand. It scans up
 * from each sprite's lowest opaque row and measures the horizontal extent of the
 * band that actually touches the ground. That is why `case-living-staff` is 12px
 * wide and `case-halo-blade` is 14px — they stand on slim metal feet, and a box
 * around the artwork would have blocked several times the floor they occupy.
 *
 * Verified: none of them intrudes on any of the five walk routes Raheem traced.
 *
 * The forge, counter and bench boxes come from Raheem's own traced footprints in
 * `scripts/sprite-lab/figma-traces/courtyard-v2-forge-preview.json` and are
 * already proven in play. The rest are derived from each sprite's bottom band
 * and are PRELIMINARY — good enough to walk the map, and expected to be replaced
 * by real traces.
 */
export const COURTYARD_V2_ART: PlacedArt[] = [
  // ── Forge quadrant, top-right ─────────────────────────────────────────────
  {
    id: 'forge', node: '15:2', url: A('forge/forge-cutout.png'),
    x: 865, y: 149, width: 272, height: 240, groundY: 359,
    collider: { x: 869, y: 303, width: 265, height: 56 },   // traced
  },
  {
    // Shadow lifted 2026-08-04 — the rug now shows through underneath.
    // The original is kept as counter-depth-WITH-shadow.png.
    id: 'counter', node: '18:2', url: A('forge/counter-depth.png'),
    x: 894, y: 357, width: 214, height: 110, groundY: 467,
    collider: { x: 917, y: 390, width: 181, height: 75 },   // traced
  },
  {
    id: 'bench', node: '34:2', url: A('forge/bench-depth.png'),
    x: 898, y: 452, width: 206, height: 103, groundY: 534,
    collider: { x: 917, y: 486, width: 168, height: 48 },   // traced
  },
  {
    id: 'dwarf', node: '102:8', url: A('forge-life/dwarf-chibi-south.png'),
    x: 1025, y: 312, width: 36, height: 64, groundY: 376,
    // Raheem asked for one. Kept TIGHT TO HIS FEET (21x7) rather than boxing his
    // body, so the aisle he works in stays walkable — verified: it intrudes on
    // none of the five traced routes.
    collider: { x: 1032, y: 369, width: 21, height: 7 },
  },
  {
    id: 'apprentice', node: '100:2', url: A('forge-life/apprentice-chibi-east.png'),
    x: 1108, y: 344, width: 41, height: 66, groundY: 410,
    collider: { x: 1123, y: 403, width: 11, height: 7 },
  },
  {
    id: 'element-crystal', node: '74:8', url: A('magical/element-crystal.png'),
    x: 1154, y: 328, width: 68, height: 90, groundY: 418,
    collider: { x: 1169, y: 408, width: 38, height: 10 },
  },
  {
    id: 'forge-brazier', node: '108:64', url: A('tower/watch-brazier.png'),
    x: 1174, y: 401, width: 48, height: 70, groundY: 471,
    collider: { x: 1196, y: 463, width: 8, height: 8 },
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
    collider: { x: 587, y: 336, width: 78, height: 8 },
  },
  {
    id: 'archivist', node: '108:50', url: A('forge-life/archivist-chibi-south.png'),
    x: 575, y: 287, width: 35, height: 67, groundY: 354,
    collider: { x: 579, y: 347, width: 27, height: 7 },
  },
  {
    id: 'card-stand', node: '108:60', url: A('magical/card-stand.png'),
    x: 421, y: 277, width: 70, height: 77, groundY: 354,
    collider: { x: 438, y: 346, width: 37, height: 8 },
  },
  {
    id: 'hall-brazier', node: '108:62', url: A('tower/watch-brazier.png'),
    x: 551, y: 305, width: 24, height: 43, groundY: 348,
    collider: { x: 562, y: 343, width: 8, height: 6 },
  },
  {
    id: 'mana-font', node: '108:58', url: A('magical/mana-font.png'),
    x: 493, y: 354, width: 106, height: 106, groundY: 460,
    collider: { x: 508, y: 449, width: 77, height: 11 },
  },

  // ── Reliquary row, mid-left ───────────────────────────────────────────────
  {
    id: 'case-gauntlets', node: '108:74', url: A('proving-hall/case-open-hand-gauntlets.png'),
    x: 256, y: 589, width: 69, height: 71, groundY: 660,
    collider: { x: 263, y: 653, width: 55, height: 7 },
  },
  {
    id: 'case-living-staff', node: '108:70', url: A('proving-hall/v2/case-living-staff.png'),
    x: 330, y: 553, width: 39, height: 110, groundY: 663,
    collider: { x: 344, y: 652, width: 12, height: 11 },
  },
  {
    id: 'case-judgment-bow', node: '108:68', url: A('proving-hall/v2/case-judgment-bow.png'),
    x: 381, y: 562, width: 64, height: 103, groundY: 665,
    collider: { x: 390, y: 654, width: 45, height: 11 },
  },
  {
    id: 'case-halo-blade', node: '108:76', url: A('proving-hall/v2/case-halo-blade.png'),
    x: 457, y: 525, width: 53, height: 145, groundY: 670,
    collider: { x: 477, y: 655, width: 14, height: 15 },
  },
];

/**
 * The fountain is painted INTO the plate, so it has no art layer — only a
 * collider. Traced by Raheem as `fountain-footprint` (node 94:6).
 */
export const COURTYARD_V2_STATIC_COLLIDERS = [
  // NOTE: this sits inside `fountain-ring` by design. The ring is a route AROUND
  // the fountain and a rectangle cannot express an annulus, so the route check
  // reports the overlap and it is expected rather than a failure.
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

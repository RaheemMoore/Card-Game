/**
 * Battle Tower spatial contract — one room, eleven floors.
 *
 * THE COURTYARD AND THE TOWER USE DIFFERENT CAMERAS, deliberately.
 *
 * The courtyard is one fixed screen: its whole plate is always visible, scaled
 * to fit (see courtyard/layout.ts). That works because the room is exactly one
 * screen and nothing is hidden.
 *
 * The tower is roughly four screens and the camera follows you. That is not
 * spectacle — it is the reason clues are worth hiding. Raheem: "if we don't make
 * the room big enough for the player to actually need to look around, then it
 * kinda defeats the purpose."
 *
 * WHY NOT fitScale HERE. Fit shows the whole plate, which is exactly what we do
 * not want. Instead the zoom is derived from a fixed DESIGN_VIEW_H so a constant
 * amount of world height is visible on every device. That fairness matters once
 * things are hidden: a wide monitor must not reveal a clue a tablet cannot see.
 */

/** The plate's own pixel size. World units ARE plate pixels — no second scale. */
export const WORLD_W = 4608;
export const WORLD_H = 3456;

/**
 * World height visible at any viewport, in world units.
 *
 * Sized against the ROOM (1937 tall), not the plate (3456) — the plate is
 * mostly transparent margin. At 1120 you see about 58% of the room, so the
 * camera genuinely has to travel. Set against the plate instead, this showed
 * the whole room at once and the camera never moved at all.
 *
 * Horizontal extent varies with aspect and that is fine — hide things by
 * VERTICAL position and the guarantee holds everywhere.
 */
export const DESIGN_VIEW_H = 1120;

export interface Viewport {
  width: number;
  height: number;
}

/** Zoom that keeps DESIGN_VIEW_H world units on screen vertically. */
export function towerZoom({ height }: Viewport): number {
  return height / DESIGN_VIEW_H;
}

/**
 * Sizes are chosen so the hero reads at the SAME on-screen size as he does in
 * the courtyard (~94px at 1080p). He is 100 world units there against a
 * fit-scaled 1152-tall plate; here the zoom is lower, so his world size is
 * larger to compensate. Getting this wrong makes the tower feel like a
 * different game rather than the next room.
 */
export const HERO_WORLD_HEIGHT = 100;

/**
 * The plinth, cut from Raheem's Figma trace.
 *
 * 25% of the room's height. At its native 807 it filled 42% of a 1937-tall
 * room and swallowed the floor. Painted art downscales cleanly — the
 * never-downscale rule is about pixel-art sprites, not this.
 */
export const PEDESTAL_WORLD_HEIGHT = 480;

/** Boss on the plinth. Big enough to dominate without crowding the arcade. */
export const BOSS_WORLD_HEIGHT = 260;

/**
 * The colonnade's cut interior, MEASURED off the plate rather than guessed.
 *
 * Derived by labelling the ring plate's ENCLOSED transparency and taking the
 * LARGEST connected component. Taking the bounding box of all enclosed
 * transparency instead was wrong by 42%: the seven arch gaps are enclosed too,
 * so they inflated the box to 3186x2943 and the floor disc spilled straight
 * through the colonnade. Raheem: "the circle isn't even fitting inside of the
 * column." The room is the big hole; the gaps are the little ones.
 */
export const INTERIOR = {
  x: 1156, y: 1277, width: 2242, height: 1937,
  cx: 2277, cy: 2245,
} as const;

/**
 * Where the pedestal stands, ANCHORED AT ITS FOOT.
 *
 * Below the interior's centre on purpose: the plinth is 807 tall and grows
 * upward from its foot, so a foot ON the centre line would push the boss into
 * the back of the room. This places the boss's mass just above centre.
 */
export const PEDESTAL_FOOT = { x: INTERIOR.cx, y: 2420 } as const;

/**
 * The top surface of the plinth — where the boss's feet go.
 *
 * NOT derived from the pedestal sprite's height. The sprite includes the steps,
 * which reach further down than the drum's top by a long way, so
 * `foot.y - height` would float the boss well above the stone.
 */
export const PEDESTAL_TOP_Y = PEDESTAL_FOOT.y - 325;

/**
 * The archetype floor is drawn slightly LARGER than the opening so its edge
 * tucks under the colonnade's inner lip. Sized exactly to the opening it met
 * the stone in a hairline seam that read as a gap.
 *
 * The COLLIDER is not oversized — it stays clipped to the true opening, so the
 * few pixels of floor hiding under the lip are visible but not standable.
 * Raheem's traced walkable area overhung the opening by 13.3%, which is exactly
 * how he ended up standing out on the rim.
 */
export const FLOOR_OVERLAP = 1.05;
export const FLOOR_FILL = {
  width: Math.round(INTERIOR.width * FLOOR_OVERLAP),
  height: Math.round(INTERIOR.height * FLOOR_OVERLAP),
} as const;

/** Where the hero appears, just inside the entry arch at the bottom. */
/**
 * Spawn, MEASURED against the built collider rather than chosen.
 *
 * The first guess sat inside a solid, and 300-odd static bodies ejected the hero
 * clean out of the room before the first frame was drawn — he ended up above the
 * colonnade entirely. Read the deepest free row on the centre line and back off.
 */
export const HERO_SPAWN = { x: INTERIOR.cx, y: 3110 } as const;

/**
 * How much the sky moves relative to the room. 0 = painted on the back wall,
 * 1 = moves with you and reads as flat.
 *
 * Only possible because the camera moves — under the courtyard's fixed camera
 * there is nothing to parallax against.
 */
export const SKY_PARALLAX = 0.35;

/** Cloud layer, drifting behind the colonnade and seen through the arch gaps. */
export const CLOUD_PARALLAX = 0.5;
export const CLOUD_COUNT = 6;
/** World units per second. Slow — this is weather, not wind. */
export const CLOUD_DRIFT_MIN = 6;
export const CLOUD_DRIFT_MAX = 16;

export interface TowerFloor {
  floor: number;
  bossId: string;
  /** Full-bleed backdrop. Parallaxes behind everything. */
  sky: string;
  /** The archetype floor disc — the ENTIRE walkable floor, not a medallion. */
  ground: string;
  label: string;
}

/**
 * The eleven floors. Only `sky`, `ground` and `bossId` differ — the colonnade,
 * the pedestal, the colliders and the occluders are shared by every one.
 *
 * That is the whole architectural bet, and it is why the Figma trace was a
 * one-time cost rather than eleven of them.
 */
export const TOWER_FLOORS: Record<number, TowerFloor> = {
  1: {
    floor: 1,
    bossId: 'boss_champion_barbarian',
    sky: '/assets/castle/tower/sky-1.jpg',
    ground: '/assets/castle/tower/floor-1.webp',
    label: 'Floor 1 — the Debt-Bearer',
  },
  2: {
    floor: 2,
    bossId: 'boss_champion_druid',
    sky: '/assets/castle/tower/sky-2.jpg',
    ground: '/assets/castle/tower/floor-2.webp',
    label: 'Floor 2 — the Still Season',
  },
  3: {
    floor: 3,
    bossId: 'boss_champion_seraph',
    sky: '/assets/castle/tower/sky-3.jpg',
    ground: '/assets/castle/tower/floor-3.webp',
    label: 'Floor 3 — the Unclosed Summons',
  },
};

/**
 * Formats are chosen per layer, not uniformly. As PNG this floor was 25 MB on
 * the wire — unshippable. Sky has no alpha and never will, so it is JPEG;
 * everything else needs alpha and is WebP, which carries it at a fraction of
 * PNG's size. 57 MB of source became 5.3 MB of assets.
 */
export const RING_PLATE = '/assets/castle/tower/ring-plate.webp';
export const PEDESTAL_SPRITE = '/assets/castle/tower/pedestal.webp';
export const OCCLUDER_MANIFEST = '/assets/castle/tower/occluders/occluders.json';
export const COLLIDER_MANIFEST = '/assets/castle/tower/occluders/colliders.json';

export function getFloor(n: number): TowerFloor {
  return TOWER_FLOORS[n] ?? TOWER_FLOORS[1];
}

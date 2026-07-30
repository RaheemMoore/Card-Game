/**
 * Solid scenery — painted objects that block movement but are not destinations.
 *
 * WHY THIS IS SEPARATE FROM `STALLS`: that array drives three consumers at once
 * (colliders, focusable DOM buttons, the Directory list). A lamp post needs the
 * first and must never appear in the other two. Bolting scenery onto `STALLS`
 * with `reserved: true` would work for one prop and rot as soon as there are
 * fifteen — the Directory would be one careless filter away from listing a bush.
 *
 * WHY IT EXISTS AT ALL: Raheem, playing the courtyard — "being able to walk
 * through the lamps and things is making it feel much too painted." He is right,
 * and it is the cheapest available fix for that specific complaint. Until now
 * only the five stalls and the three residents were solid; every lamp, barrel,
 * crate and planter in the painting was a decal you strolled through.
 *
 * ALL COORDINATES ARE TRACED ONTO THE PLATE, by cropping and measuring
 * public/assets/castle/courtyard.png — not laid out abstractly. Re-trace every
 * one of them if the plate is regenerated.
 *
 * COLLIDERS SIT ON THE GROUND FOOTPRINT, never on the whole painted shape. A
 * top-down world is walked on the floor: what stops you is where an object meets
 * the paving, not the part of it that leans overhead. The lamps make this vivid —
 * their crystals sit ~110px UP-SCREEN of the feet of their own posts, so a
 * collider drawn around the glow would block you from standing in front of a
 * lamp you should be able to walk right up to.
 */

export interface SceneryRect {
  /** Identity for debugging only — never shown to the player. */
  id: string;
  /** Centre point, in plate coordinates. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export const SCENERY: SceneryRect[] = [
  // ── Crystal lamps ────────────────────────────────────────────────────────
  // GLOW_SPOTS in data/castle/courtyardLayers.ts gives each lamp's CRYSTAL, not
  // its base. The posts lean down-screen, so the feet land roughly +110px below
  // the glow. A collider drawn around the glow would block you from standing in
  // front of a lamp you should be able to walk right up to.
  //
  // WHAT A COLLIDER HERE CAN AND CANNOT FIX. Raheem, with screenshots of the
  // hero apparently standing on a lamp: "you should not be able to walk on
  // them." The footprint below is genuinely all a collider should cover — in a
  // top-down world you walk on the floor, and the floor in front of a lamp is
  // walkable. What looked wrong was the painted post rising up-screen from that
  // footprint with the hero drawn over it. That is an OCCLUSION fault, fixed by
  // data/castle/occluders.ts, not by growing these boxes. Enlarging a collider
  // to cover an object's painted height is the wrong instinct: it walls off
  // floor the player can see is empty.
  //
  // Upper two: bases measured against the live debug overlay (/castle?colliders=1)
  // after a first pass traced from static crops landed ~25px low. Cropping gets
  // you close; only the overlay gets you right.
  { id: 'lamp-upper-left', x: 357, y: 483, width: 40, height: 20 },
  { id: 'lamp-mid-left', x: 331, y: 674, width: 40, height: 20 },
  // Lower two: bases measured at y≈1042, which is past the WALKABLE floor of
  // 1040 — so these are clamped up to 1032 to sit just inside reach. They stop
  // you standing exactly at the foot of the post. Their real fix is the occluder.
  { id: 'lamp-lower-left', x: 351, y: 1032, width: 40, height: 16 },
  { id: 'lamp-lower-right', x: 1084, y: 1032, width: 40, height: 16 },

  // ── Right-hand market row ────────────────────────────────────────────────
  // The blue brazier stand between the two stalls.
  { id: 'brazier', x: 1176, y: 613, width: 48, height: 26 },
  // The water barrel. Its top half already sits inside the Collection stall's
  // collider (which ends at y 805); this catches the ~30px that hangs below.
  { id: 'water-barrel', x: 1245, y: 822, width: 50, height: 26 },

  // NO west-wall entry. A first pass added a strip for the planters and benches
  // along that wall, and the debug overlay showed it sitting almost exactly on
  // top of the Training Yard stall's collider, which already blocks that side.
  // Two overlapping invisible rectangles behave identically to one and give the
  // next person twice as much to re-trace.

  // ── South edge ───────────────────────────────────────────────────────────
  { id: 'bush-south', x: 557, y: 1012, width: 150, height: 30 },
  { id: 'crates-south', x: 938, y: 1018, width: 110, height: 30 },
  { id: 'bush-south-east', x: 1185, y: 1005, width: 120, height: 30 },
];

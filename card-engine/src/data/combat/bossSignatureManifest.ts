/**
 * Per-boss SIGNATURE LAYERS, and which of the boss's actions owns each one.
 *
 * A signature layer is a piece of the boss's art that lives OUTSIDE the sprite
 * and animates in code — a rune halo behind him, a bed of blight at his feet.
 * They exist for two reasons, one visual and one mechanical.
 *
 * ── Visual: they cannot be baked in ──────────────────────────────────────
 * PixelLab's v3 animation warps everything in frame along with the skeleton, so
 * scenery welded to a rigged figure breathes and redecorates frame to frame.
 * The Still Season proved the cost directly: when its clip prompt failed to name
 * the flowers on its own shoulders, they dissolved into moss by frame 2. Kept as
 * separate plates, a halo can spin and a flower bed can bloom, for free and
 * without risking the character.
 *
 * ── Mechanical: an attack the player can SEE coming ──────────────────────
 * `BossStage` already derives a single `charging` boolean, which tells the
 * player *that* something is coming but not *what*. Every heavy intent lights up
 * identically. That is the same failure the wind-up clip work existed to fix at
 * the sprite level — "a telegraph the player can only read in the banner text is
 * not a telegraph" — and it repeats here one level up.
 *
 * Binding a layer to a specific `actionId` fixes it. The Still Season's rune
 * circle belongs to `act_season_hold` and its flower bed to `act_season_root`,
 * so the two attacks announce themselves in different colours in different parts
 * of the screen. `act_season_root` is the only `area_attack` in his set, so
 * "the floor is blooming" comes to mean "everyone is about to be hit" — a
 * mechanic taught by colour rather than by reading a banner.
 *
 * No schema work was needed for any of this: `BattleIntent.actionId` is already
 * on `boss_intent_declared`, and `damage_dealt` already carries
 * `sourceActionId` — added, per its own comment in `types/combat.ts`, precisely
 * because without it "every attack in the game drew the identical bolt no matter
 * which ability fired it".
 */

/** A signature layer's identity. Add a case here and a renderer in BossStage. */
export type SignatureLayerId = 'rune_halo' | 'flower_bed';

export interface RuneHaloSpec {
  /** Outer and inner ring plates, resolved against /assets/combat/. */
  outer: string;
  inner: string;
  /** Diameter as a fraction of the boss sprite box width. */
  scale: number;
  /** Centre offset from the sprite box centre, as a fraction of its height.
   *  Negative lifts it toward the head, which is where a halo belongs. */
  centerYOffset: number;
  /** Seconds per full turn. The two rings counter-rotate, so these are the
   *  visible cadence of the whole effect rather than of one plate. */
  outerPeriodSec: number;
  innerPeriodSec: number;
  /** CSS colour prefix for the bloom, e.g. 'rgba(150,255,90,'. */
  glow: string;
}

export interface FlowerBedSpec {
  /** The bed plate, resolved against /assets/combat/. */
  path: string;
  /**
   * Band HEIGHT as a fraction of the arena height. Sized by height, not width,
   * and this is not a style preference — the plate is 896x452, so sizing it by
   * width (the obvious choice, and what the ring spec does) made it ~650px tall
   * inside a ~700px arena and it swallowed the entire scene. A floor decal is
   * defined by how far up the wall it climbs; it always spans the full width.
   */
  heightPercent: number;
  /** Distance from the arena's bottom edge, as a percentage of arena height. */
  bottomPercent: number;
  glow: string;
}

/**
 * Everything that dresses the boss's stage but is not the boss and not an
 * attack. Purely atmospheric, all of it free, and the reason it exists is a
 * note from Raheem on the first assembled scene: "it's just very grey, it
 * doesn't feel very druid".
 *
 * Three separate causes, all addressed here:
 *  - the arena is a STONE bowl, and stone is grey
 *  - the boss was the only living thing in frame, and the only moving one
 *  - nothing in the scene was lit by anything the boss was doing
 */
export interface SceneDressingSpec {
  /** The carved seat he sits on. Drawn INSIDE the sprite box so it registers
   *  against the figure rather than against the arena. */
  throne?: { path: string; scale: number; bottomOffset: number };
  /** Deadwood/vine mass draped over the tiers and the upper corners. */
  growth?: { path: string; scale: number; opacity: number };
  /**
   * The radial wash that makes the BOSS the light source.
   *
   * He is the only living thing in a dead stone bowl and his ribcage glows, so
   * the room should be lit by him: stone near him goes green, the far tiers
   * stay cold. It also does mechanical work for free — the wash pulses with the
   * core, so "he is powering up" is legible from the room, not just from him.
   */
  wash?: { color: string; radius: number; strength: number };
  /** Slanted god-rays. One CSS gradient; turns a quarry into a forest. */
  shafts?: { color: string; count: number; tiltDeg: number };
  /** Drifting motes, so the air is not empty. */
  motes?: { color: string; count: number };
  /**
   * PixelLab props that fade into existence when the boss casts.
   *
   * Stills by necessity (there is no object-animation endpoint) and stills by
   * design: code owns the fading, growing and placing, so one generation buys
   * an effect that can be re-timed and re-scattered forever.
   */
  summonProps?: readonly string[];
}

export interface BossSignatureSpec {
  halo?: RuneHaloSpec;
  flowers?: FlowerBedSpec;
  dressing?: SceneDressingSpec;
  /**
   * Which layers power up for a given boss action id. An action with no entry
   * simply charges nothing, which is correct for ordinary attacks — if every
   * action lit something up, none of them would read as special.
   */
  byAction: Record<string, SignatureLayerId[]>;
  /**
   * The rim light stacked on the sprite so it reads as lit by its own arena.
   *
   * This was hardcoded to the Debt-Bearer's ember `rgba(255,110,40,0.30)` in
   * `BossStage`, with a comment explaining it matched the lava veins — true of
   * the one boss that existed, and wrong for every other. It is the same bug
   * `ARENA_GROUND_TINT` was split out to fix: a green boss in a grove lit by an
   * orange rim is lit by a fire that is not there.
   */
  rimLight: string;
}

const STILL_SEASON: BossSignatureSpec = {
  halo: {
    outer: 'bosses/still-season/halo/ring-outer.png',
    inner: 'bosses/still-season/halo/ring-inner.png',
    // Wider than the sprite box on purpose. The Debt-Bearer's ring shipped at
    // 0.62 first and was invisible in play, because the boss fills his own box
    // and anything inside it hides behind him.
    scale: 1.55,
    centerYOffset: -0.18,
    // Deliberately not a common multiple, so the two rings never resynchronise
    // into looking like one plate.
    outerPeriodSec: 48,
    innerPeriodSec: 31,
    glow: 'rgba(150,255,90,',
  },
  flowers: {
    path: 'bosses/still-season/decal/flower-bed.png',
    heightPercent: 21,
    bottomPercent: 1,
    glow: 'rgba(255,60,190,',
  },
  /**
   * TRIMMED once the new arena plate landed. Most of this existed to fix a
   * grey stone bowl that had nothing alive in it; the plate now paints its own
   * canopy, its own flowered tiers and its own light shafts, and running the
   * code versions on top of painted ones is mush, not emphasis.
   *
   * The throne is gone entirely: he now sits on a PAINTED dais, so a cut-out
   * wooden seat drawn over it would be a second, differently-lit chair.
   */
  dressing: {
    // Kept at full strength. This is the one thing the plate cannot do: it is
    // HIS light, it has to pulse with his core, and it has to brighten when he
    // charges so the room carries the telegraph.
    wash: { color: '150,255,110', radius: 46, strength: 0.3 },
    // Was 5. The plate has its own painted shafts; two code ones add drift and
    // life without fighting them.
    shafts: { color: '210,255,150', count: 2, tiltDeg: 13 },
    // Kept — the plate's air is still empty, and motes are what stop a static
    // painting reading as a photograph with a sprite pasted on.
    motes: { color: '200,255,160', count: 26 },
    // Four variants at different stages of opening — bud, cluster, bloom,
    // spray — so a scatter reads as a spreading bed rather than one asset
    // stamped twelve times, and growth can be implied by swapping variant.
    // Generated in ONE /create-1-direction-object call (25 generations),
    // style-anchored to the boss's own idle crop.
    summonProps: [
      'bosses/still-season/props/flower-0.png',
      'bosses/still-season/props/flower-1.png',
      'bosses/still-season/props/flower-2.png',
      'bosses/still-season/props/flower-3.png',
    ],
  },
  byAction: {
    // "The light stops moving across the grove floor." The halo does not spin
    // FASTER for this one — it STOPS. Inverting the resting motion reads far
    // harder than accelerating it, and it illustrates the telegraph text
    // literally, which is the cheapest kind of clarity there is.
    act_season_hold: ['rune_halo'],
    // "A whole season of growth arrives at once." The only area_attack he has,
    // and the floor is what lights up.
    act_season_root: ['flower_bed'],
    // Phase 2's finisher. Both at once — the escalation beat, free.
    act_season_close: ['rune_halo', 'flower_bed'],
  },
  rimLight: 'rgba(150,255,90,0.28)',
};

export const BOSS_SIGNATURE_MANIFEST: Record<string, BossSignatureSpec> = {
  boss_champion_druid: STILL_SEASON,
};

/** Null for a boss with no signature layers — the caller renders nothing. */
export function getBossSignature(bossId: string): BossSignatureSpec | null {
  return BOSS_SIGNATURE_MANIFEST[bossId] ?? null;
}

/**
 * Which layers a given action lights up. Empty for an unknown boss, an unknown
 * action, or no action at all — so an ordinary attack quietly charges nothing
 * rather than falling back to lighting everything.
 */
export function layersForAction(
  bossId: string,
  actionId: string | undefined,
): readonly SignatureLayerId[] {
  if (!actionId) return [];
  return BOSS_SIGNATURE_MANIFEST[bossId]?.byAction[actionId] ?? [];
}

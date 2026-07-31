import type { BossCardManifest, CombatArtAsset } from './types';

/**
 * Boss combat sprites (pixel per the C0 hybrid decision — see plan §15.1)
 * and boss card portraits (painted, Picker-only).
 *
 * ── Clips, not stills ────────────────────────────────────────────────────
 * Every state is a CLIP: a horizontal strip sheet plus the frame geometry
 * needed to play it. A still is just `frameCount: 1`, which renders
 * identically to the `<img>` this replaced — that is what lets the frame
 * player ship and be verified BEFORE a single PixelLab generation is spent.
 *
 * Today every Emberborn Wraith clip is a 1-frame still pointing at the same
 * idle PNG. That is not a bug to fix in this file; it is the honest state of
 * the art, and it is why the animated-boss work exists. Replacing a still
 * with a real clip is a data change here and nothing else.
 *
 * ── Sizes are MEASURED, never assumed ────────────────────────────────────
 * PixelLab overrides the size you ask for — the playbook records requesting
 * 128² and receiving 180². Read `size` back off the character detail after
 * generation and record it here. Hardcoding the requested size reintroduces
 * the scale mismatch that `heroSpriteManifest` already had to solve once.
 */

/**
 * `windup` and `attack` are deliberately SEPARATE states.
 *
 * They used to be one: `bossClipForBeat` mapped both the telegraph and the
 * blow to `attack`, so the same clip played twice and the wind-up and the
 * strike were visually identical — the player had no way to see a hit coming,
 * only to be told. A telegraph the player cannot READ is not a telegraph.
 */
export type BossSpriteState =
  | 'idle'
  | 'windup'
  | 'attack'
  | 'hit'
  | 'rage'
  | 'defeat'
  /**
   * A charged/ultimate action gathering. Distinct from `windup`: a wind-up is
   * one telegraphed swing, an ultimate is the boss spending several rounds
   * building something the party is meant to try to stop. Giving them the same
   * pose would make the fight's biggest moment look like its most ordinary one.
   */
  | 'ultimate';

export interface BossClip {
  asset: CombatArtAsset;
  /** Frames in the strip, left to right. 1 = a still. */
  frameCount: number;
  /** Playback rate. Ignored when `frameCount` is 1. */
  fps: number;
  /** One frame's box inside the sheet, in source pixels. */
  frame: { width: number; height: number };
  /** Loop forever, or play once and hold the last frame. */
  loop: boolean;
}

function spriteKey(bossId: string, state: BossSpriteState): string {
  return `${bossId}:${state}`;
}

/** A 1-frame clip — renders exactly like a plain `<img>`. */
function still(asset: CombatArtAsset): BossClip {
  return {
    asset,
    frameCount: 1,
    fps: 1,
    frame: { width: asset.dimensions.width, height: asset.dimensions.height },
    loop: false,
  };
}

const EMBERBORN_WRAITH_ID = 'boss_fire_elemental_v0';

const WRAITH_IDLE: CombatArtAsset = {
  id: 'emberborn_wraith_idle',
  kind: 'boss_sprite',
  source: 'leonardo',
  path: 'bosses/emberborn-wraith/sprite-idle.png',
  dimensions: { width: 1024, height: 1024 },
  approvalStatus: 'approved',
  promptVersion: 'c6.v1',
  notes:
    'Leonardo Phoenix 1.0, seed=555666 (sprite-candidate-1). Approved by Raheem 2026-07-19. ' +
    'Losing candidate-2 kept on disk. Pending replacement by the PixelLab pilot.',
};

/**
 * Every Wraith state is currently the idle still. The differences the player
 * actually sees are produced in CSS by the battle view — a red flash on hit,
 * a rage aura, grayscale on defeat — which is why this reads as four copies.
 */
const EMBERBORN_WRAITH_CLIPS: Record<BossSpriteState, BossClip> = {
  idle: still(WRAITH_IDLE),
  ultimate: still(WRAITH_IDLE),
  windup: still(WRAITH_IDLE),
  attack: still(WRAITH_IDLE),
  hit: still(WRAITH_IDLE),
  rage: still(WRAITH_IDLE),
  defeat: still(WRAITH_IDLE),
};

const DEBT_BEARER_ID = 'boss_champion_barbarian';

/**
 * The shared frame box for EVERY Debt-Bearer clip.
 *
 * `SpriteClipPlayer` sets its aspect ratio from this, so two clips with
 * different boxes make him change size the instant he stops idling and swings.
 * `lib/pack_boss_clips.py` packs all seven clips to one box and takes the
 * GROUND LINE from the resting clip alone — using the union of every frame put
 * his feet 33px above his own platform, because the attack throws flame below
 * his soles.
 *
 * Measured off the packed sheets, never requested: PixelLab overrides the size
 * you ask for.
 */
const DEBT_BEARER_FRAME = { width: 251, height: 189 };

const DEBT_BEARER_ID_PREFIX = 'debt_bearer';

/**
 * One clip + its asset row. Every clip shares the frame box by construction.
 *
 * `file` is separate from the sprite STATE on purpose. The sheets are named
 * after the PixelLab animation id, which does not always match the state that
 * plays them — `attack` is served by `sprite-smash.png`, because the clip was
 * generated as "smash" to keep its action description a single unambiguous
 * motion. Deriving the path from the state name instead silently requested a
 * file that does not exist, and a 404 sheet renders as an invisible boss.
 */
function debtClip(
  file: string,
  frameCount: number,
  fps: number,
  loop: boolean,
  notes: string,
): BossClip {
  return {
    asset: {
      id: `${DEBT_BEARER_ID_PREFIX}_${file}`,
      kind: 'boss_sprite',
      source: 'pixellab',
      path: `bosses/debt-bearer/sprite-${file}.png`,
      dimensions: { width: DEBT_BEARER_FRAME.width * frameCount, height: DEBT_BEARER_FRAME.height },
      approvalStatus: 'candidate',
      promptVersion: 'pixellab.v3.anim.v2',
      notes,
    },
    frameCount,
    fps,
    frame: DEBT_BEARER_FRAME,
    loop,
  };
}

/**
 * All seven clips, generated through PixelLab `/characters/animations` mode v3
 * against character 9e7ee0c4-4913-4c01-864f-b0604c7d7e32.
 *
 * Every clip pins `custom_start_frame` to the SAME rot-south.png, which makes
 * one rotation the sole identity anchor for the set. The single exception is
 * `attack`, chained from the wind-up's last frame so the strike begins with the
 * fists already raised — one hop only, because chaining a chain compounds drift.
 *
 * fps is chosen against the beat each clip has to fit (see
 * `services/combat/presentation/types.ts` TIMINGS), not for how it looks in
 * isolation: a clip that overruns its beat is cut off mid-motion.
 */
const DEBT_BEARER_CLIPS: Record<BossSpriteState, BossClip> = {
  // 1667ms. Slow on purpose — something this heavy breathes slower than a
  // person, and a faster loop read as panting.
  idle: debtClip('idle', 5, 3, true, 'Breathing idle. Frame 0 is the pinned rot-south pose.'),

  // LOOPS, and that is load-bearing: a telegraph stays on screen for however
  // many hero turns the party takes to answer it, so a one-shot would freeze
  // on a raised-fists pose for the rest of the round.
  windup: debtClip('windup', 7, 8, true, 'Arms rise to both fists overhead. Its last frame is the chained start of `attack`.'),

  // 636ms, inside windUpNormal(250) + impact(400). One-shot: the blow lands and
  // holds its finish, which is what reads as weight.
  attack: debtClip('smash', 7, 11, false, 'The downward smash. custom_start_frame CHAINED to anim-windup-south-06.png. Replaces a v1 clip that asked for raise + smash + recover in ONE clip and returned no arm motion at all, just fire.'),

  // 385ms against a 400ms impact beat.
  hit: debtClip('hit', 5, 13, false, 'Recoil from a blow to the chest.'),

  // Phase 2. The change is in the FIRE, not the stance — the lore is "the
  // counting stops, he has reached the total", so he goes blazing and STILL
  // rather than thrashing, which is also how it avoids Barbarian §14's ban on
  // generic rage.
  //
  // Replaces a first attempt that measured 7.65 peak frame-to-frame change
  // against idle's 8.22 — it changed LESS than standing still did, so it was a
  // differently-named idle. Asking for "more still, fire steadier" gave the
  // model nothing to animate. This one measures 14.5.
  //
  // Loops rather than holding its bright last frame: the clip key restarts on
  // every beat, so a one-shot would re-ignite him continuously and flicker.
  rage: debtClip('ablaze', 7, 6, true, 'Phase-2 resting pose. Fire climbs the armour cracks and the core goes white-hot while he stands squared and motionless.'),

  // 875ms, held under the result modal.
  defeat: debtClip('defeat', 7, 8, false, 'Staggers and drops onto one knee, fire dimming. Ends kneeling rather than prone — a ledger-keeper stops, he does not sprawl.'),

  // LOOPS at 1000ms against the 3000ms ultimate beat = three cycles. A
  // one-shot would leave two seconds of frozen boss at the single most
  // dramatic moment in the fight.
  ultimate: debtClip('ultimate', 7, 7, true, 'Fire gathers and engulfs him, core going white-hot. Armour explicitly named as staying ON in the prompt — "gathering power" poses are exactly where a generator tries to strip a figure (M5.7).'),
};

const STILL_SEASON_ID = 'boss_champion_druid';

/**
 * The shared frame box for EVERY Still Season clip, measured off the packed
 * sheets by `lib/pack_boss_clips.py` — which reported zero clipped frames and
 * confirmed all four strips divide evenly into it.
 *
 * Smaller than the Debt-Bearer's 251x189 because a seated figure is compact:
 * his arms spread, but nothing ever goes overhead. The packer's union came out
 * only 14% wider than the idle pose's own bounds.
 *
 * HIS GROUND LINE IS HIS SEAT, NOT A FLOOR. He is cross-legged, so the box
 * bottom is where his shins rest. That held at y=208 in all 31 generated
 * frames, which is why the ground line never had to be forced. When the throne
 * plate lands, IT defines the floor and the sprite registers against it — do
 * not anchor `BossPlatform` to this box bottom and expect a floor.
 */
const STILL_SEASON_FRAME = { width: 155, height: 170 };

function seasonClip(
  file: string,
  frameCount: number,
  fps: number,
  loop: boolean,
  notes: string,
): BossClip {
  return {
    asset: {
      id: `still_season_${file}_${fps}`,
      kind: 'boss_sprite',
      source: 'pixellab',
      path: `bosses/still-season/sprite-${file}.png`,
      dimensions: {
        width: STILL_SEASON_FRAME.width * frameCount,
        height: STILL_SEASON_FRAME.height,
      },
      approvalStatus: 'candidate',
      promptVersion: 'pixellab.v3.anim.v1',
      notes,
    },
    frameCount,
    fps,
    frame: STILL_SEASON_FRAME,
    loop,
  };
}

/**
 * The Still Season — PixelLab character bffcc8f2-8a76-4100-b684-4ab04174c5e0,
 * `/characters/animations` mode v3, 31 generations.
 *
 * FOUR clips were generated, not seven. The other three states below reuse that
 * art deliberately, and each reuse is a decision rather than a placeholder:
 *
 * - `hit` WAS generated and was THROWN AWAY. It came back with a cyan-and-yellow
 *   crown on the skull and magenta sparkles belonging to nothing in the design —
 *   the same invented-decoration failure as the Debt-Bearer's phantom wing. The
 *   frames are kept on disk as evidence. The existing CSS flash and hit-shake
 *   carry the beat, which is why `hit` is the correct clip to cut first.
 * - `rage` is idle art at DOUBLE SPEED. Phase 2 for this boss reads through the
 *   ribcage core, which is a code layer (an alpha/scale sine), not new art — and
 *   the Debt-Bearer already proved a "more still" rage prompt gives the model
 *   nothing to animate and returns a differently-named idle.
 * - `ultimate` reuses the WIND-UP, slowed. A wind-up is already a gathering
 *   pose, so it is the honest stand-in; idle would make the fight's biggest
 *   moment look like its most ordinary one, which is the exact reason
 *   `ultimate` exists as a separate state at all.
 *
 * ── The prompt lesson this set paid for ──────────────────────────────────
 * The first idle asked for the core light "brightening and dimming" and did not
 * name the flowers. The model dimmed the core and never restored it, and the
 * flowers dissolved into moss — by frame 2 the character's whole signature was
 * gone (core pixels 225 -> 8, flower pixels 107 -> 3). Every shipped clip below
 * instead names the core, the flowers and the skull branches VERBATIM and asks
 * for NO change in any of them; all four then held both features across every
 * frame. Never ask a clip to animate a glow, and never leave a feature unnamed.
 */
const STILL_SEASON_CLIPS: Record<BossSpriteState, BossClip> = {
  // 1667ms. As slow as the Debt-Bearer's, for the opposite reason: he is not
  // heavy, he is STOPPED. The whole character is a season that will not move on.
  idle: seasonClip('idle', 5, 3, true, 'Seated breathing idle. Frame 0 is the pinned rot-south pose — measured identical to it, diff 0.0.'),

  // LOOPS: a telegraph stays up for however many hero turns the party takes.
  // Ends on the raised-hands pose that `attack` is chained from.
  windup: seasonClip('windup', 7, 8, true, 'Hands rise from the knees to clasped at the chest. Deliberately worded to keep the arms IN, because his resting arm spread already sets the shared frame box and a wider reach would shrink him on the stage.'),

  // 636ms, inside windUpNormal(250) + impact(400). Sized to the NORMAL beat.
  attack: seasonClip('attack', 7, 11, false, 'A CAST, not a blow — this boss has no fists. Hands open outward with the core blooming; the projectile and ground bloom belong to AttackVFX. custom_start_frame CHAINED to anim-windup-south-06.png, one hop only.'),

  // 1167ms, held under the result modal. Subtle by design — a seated boss's
  // defeat is a slump, which stays inside the silhouette and inside the frame
  // box. A standing boss's fall would have wrecked both.
  defeat: seasonClip('defeat', 7, 6, false, 'Head bows onto the chest, arms fold INWARD. Inward and not downward on purpose: pack_boss_clips.py clips everything below the ground line, so a downward fold would have been silently cut.'),

  // Reuses idle. See the note above — the generated clip invented a crown.
  hit: seasonClip('idle', 5, 3, true, 'REUSES IDLE. The generated hit clip was discarded for inventing a crown and sparkles; CSS flash + hit-shake carry this beat.'),

  // Idle at 2x. Phase 2 reads through the core glow in code, not through art.
  rage: seasonClip('idle', 5, 6, true, 'REUSES IDLE at double speed. Phase 2 is carried by the ribcage core pulse (a code layer) plus a tint — no rage art was generated, and the Debt-Bearer showed that prompting a "more still" rage returns a renamed idle.'),

  // Wind-up at 2/3 speed = 1313ms, so it cycles a little over twice inside the
  // 3000ms ultimate beat rather than freezing.
  ultimate: seasonClip('windup', 7, 5, true, 'REUSES WIND-UP, slowed. A gathering pose is the honest stand-in for a gathering action; idle would flatten the fight\'s biggest moment into its most ordinary one.'),
};

function clipsFor(bossId: string, clips: Record<BossSpriteState, BossClip>) {
  return Object.entries(clips).map(([state, clip]) => [
    spriteKey(bossId, state as BossSpriteState),
    clip,
  ]);
}

export const BOSS_CLIP_MANIFEST: Record<string, BossClip> = Object.fromEntries([
  ...clipsFor(EMBERBORN_WRAITH_ID, EMBERBORN_WRAITH_CLIPS),
  ...clipsFor(DEBT_BEARER_ID, DEBT_BEARER_CLIPS),
  ...clipsFor(STILL_SEASON_ID, STILL_SEASON_CLIPS),
]);

/**
 * The clip for a boss state.
 *
 * Two fallbacks, and the difference between them matters:
 *
 * - **Missing STATE on a known boss** falls back to that boss's own `idle`.
 *   A boss that has art but no defeat clip should stand there, not vanish.
 * - **Unknown BOSS returns null**, and the caller keeps its placeholder glyph.
 *   Deliberately NOT falling back to the Wraith: substituting a burning fire
 *   elemental for an unfinished Druid boss is a worse failure than an honest
 *   placeholder, because it looks intentional and would ship.
 */
export function getBossClip(bossId: string, state: BossSpriteState): BossClip | null {
  return (
    BOSS_CLIP_MANIFEST[spriteKey(bossId, state)] ??
    BOSS_CLIP_MANIFEST[spriteKey(bossId, 'idle')] ??
    null
  );
}

/** Back-compat for callers that only ever wanted the image. */
export function getBossSprite(
  bossId: string,
  state: BossSpriteState,
): CombatArtAsset | undefined {
  return getBossClip(bossId, state)?.asset;
}

/**
 * How long a clip takes to play, in ms. Stills report 0 — they hold as long
 * as the beat does.
 *
 * Exists so clip length can be checked against beat duration. That mismatch is
 * the one risk in the animation work with neither a validator nor a
 * measurement behind it, and it presents as "the animation feels off" rather
 * than as an error: `impact` holds 400ms, so a 6-frame clip at 12fps (500ms)
 * gets cut off mid-swing, and a 3-frame clip (250ms) leaves a finished pose
 * sitting still for 150ms. Decide fps and frame counts BEFORE generating.
 */
export function clipDurationMs(clip: BossClip): number {
  return clip.frameCount <= 1 ? 0 : (clip.frameCount / clip.fps) * 1000;
}

export const BOSS_CARD_MANIFEST: BossCardManifest = {
  [EMBERBORN_WRAITH_ID]: {
    id: 'emberborn_wraith_card',
    kind: 'boss_card',
    source: 'leonardo',
    path: 'bosses/emberborn-wraith/card.png',
    dimensions: { width: 832, height: 1216 },
    approvalStatus: 'approved',
    promptVersion: 'c6.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=333444 (card-candidate-2). Picker/Codex only — never in active combat. ' +
      'FLAGGED FOR RE-FIRE: approved 2026-07-19 with acknowledged M5.7 drift (fitted feminine chest armor ' +
      'with a molten crack) on the reasoning that "M5.7 targets hero portraits; boss cards are ' +
      'Raheem-discretion". That carve-out no longer exists — M5.7 was made sex-neutral and species-neutral ' +
      'and now binds EVERY generated figure including bosses and monsters. This asset predates the rule ' +
      'change and should be regenerated in the next art pass.',
  },
};

export function getBossCard(bossId: string) {
  return BOSS_CARD_MANIFEST[bossId];
}

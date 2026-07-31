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
export type BossSpriteState = 'idle' | 'windup' | 'attack' | 'hit' | 'rage' | 'defeat';

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
  windup: still(WRAITH_IDLE),
  attack: still(WRAITH_IDLE),
  hit: still(WRAITH_IDLE),
  rage: still(WRAITH_IDLE),
  defeat: still(WRAITH_IDLE),
};

const DEBT_BEARER_ID = 'boss_champion_barbarian';

/**
 * First sprite off the PixelLab pipeline (`scripts/sprite-lab/create-boss-pro.mjs`).
 *
 * Raheem's own design, recovered from his Leonardo account and passed to
 * `/create-character-pro` as a real `reference_image` — the only endpoint that
 * takes concept art as an input rather than paraphrasing it into a prompt.
 *
 * 256² despite the endpoint capping the REQUEST at 168² — it upscales its own
 * output. The number here is read off the API response, not the request.
 *
 * The rune-weapon ring from the concept is deliberately NOT in this sprite.
 * Baked in it would be welded to the boss and could only ever spin as one
 * piece; kept out, it becomes an effect layer whose weapons can detach and fly
 * as attacks resolve.
 *
 * Still a still: animation is its own pass.
 */
const DEBT_BEARER_IDLE: CombatArtAsset = {
  id: 'debt_bearer_idle',
  kind: 'boss_sprite',
  source: 'pixellab',
  path: 'bosses/debt-bearer/sprite-idle.png',
  // A 5-frame STRIP, not a still. Was a 154x156 crop of the south ROTATION
  // until 2026-07-30; that asset is retired.
  //
  // Mixing a rotation-sourced still with animation-sourced clips is what
  // produced a 25-33% scale jump in `heroSpriteManifest` — the two sources do
  // not agree on body scale, so standing and moving were different sizes.
  // Frame 0 of this clip IS the resting pose now, and it comes from the same
  // generation as the motion.
  dimensions: { width: 216 * 5, height: 198 },
  approvalStatus: 'candidate',
  promptVersion: 'pixellab.v3.anim.v1',
  notes:
    'PixelLab POST /characters/animations, mode v3, character ' +
    '9e7ee0c4-4913-4c01-864f-b0604c7d7e32, directions ["south"], custom_start_frame pinned ' +
    'to rot-south.png. Asked frame_count 4 (the API minimum — 3 was rejected 422), ' +
    'RETURNED 5. Pinning every clip to the SAME rotation is what anchors identity across ' +
    'the set and makes frame 0 of each clip checkable against that one file. All 8 ' +
    'rotations kept in scripts/sprite-lab/out/boss-debt-bearer/; only south ships, the ' +
    'stage being frontal. NOT yet approved by Raheem in a real fight.',
};

/**
 * The shared frame box for EVERY Debt-Bearer clip.
 *
 * `SpriteClipPlayer` sets its aspect ratio from this, so two clips with
 * different boxes make her change size the instant she stops idling and
 * swings. `lib/pack_boss_clips.py` computes it as the union of every frame's
 * alpha bounds across every clip and packs them all to it — which is why this
 * is one constant and not a per-clip number.
 *
 * Measured off the packed sheets, not requested: the source frames are 256²
 * and this is the figure's actual extent within them.
 */
const DEBT_BEARER_FRAME = { width: 178, height: 165 };

const DEBT_BEARER_WINDUP: CombatArtAsset = {
  id: 'debt_bearer_windup',
  kind: 'boss_sprite',
  source: 'pixellab',
  path: 'bosses/debt-bearer/sprite-windup.png',
  dimensions: { width: DEBT_BEARER_FRAME.width * 7, height: DEBT_BEARER_FRAME.height },
  approvalStatus: 'candidate',
  promptVersion: 'pixellab.v3.anim.v2',
  notes:
    'PixelLab v3, 6 generations, pinned to rot-south.png. Arms rise to both fists overhead ' +
    'by frame 5. Its LAST frame is the chained start of the smash clip.',
};

const DEBT_BEARER_SMASH: CombatArtAsset = {
  id: 'debt_bearer_smash',
  kind: 'boss_sprite',
  source: 'pixellab',
  path: 'bosses/debt-bearer/sprite-smash.png',
  dimensions: { width: DEBT_BEARER_FRAME.width * 7, height: DEBT_BEARER_FRAME.height },
  approvalStatus: 'candidate',
  promptVersion: 'pixellab.v3.anim.v2',
  notes:
    'PixelLab v3, 6 generations. custom_start_frame CHAINED to anim-windup-south-06.png ' +
    'rather than the shared rotation — the strike has to begin from the raised-fists pose ' +
    'the wind-up ends on, or it snaps back to standing before it swings. One hop only. ' +
    'Replaces a v1 "attack" clip that asked for raise + smash + recover in ONE clip and ' +
    'returned no arm motion at all, just a fire eruption, plus a rogue frame with ' +
    'wing-shaped artifacts. Splitting the motion into two clips is what fixed it.',
};

const DEBT_BEARER_CLIPS: Record<BossSpriteState, BossClip> = {
  // 5 frames at 3fps = 1667ms. Slow on purpose — something this heavy should
  // breathe slower than a person, and the dwarf's 5fps loop read as ~75
  // breaths/min and looked wrong.
  idle: {
    asset: DEBT_BEARER_IDLE,
    frameCount: 5,
    fps: 3,
    frame: DEBT_BEARER_FRAME,
    loop: true,
  },
  // LOOPS, and that is load-bearing. A telegraph stays on screen for however
  // many hero turns the party takes to answer it, so a one-shot would finish
  // in half a second and then freeze on a raised-fists pose for the rest of
  // the round. Looping, he keeps straining at the top of the swing.
  windup: {
    asset: DEBT_BEARER_WINDUP,
    frameCount: 7,
    fps: 8,
    frame: DEBT_BEARER_FRAME,
    loop: true,
  },
  // 7 frames at 11fps = 636ms, inside windUpNormal(250) + impact(400) = 650ms.
  // One-shot: the blow lands and holds its finish, which is what reads as
  // weight. Looping a strike would make him flail.
  attack: {
    asset: DEBT_BEARER_SMASH,
    frameCount: 7,
    fps: 11,
    frame: DEBT_BEARER_FRAME,
    loop: false,
  },
  // Not yet generated. They fall back to the idle LOOP rather than to a frozen
  // still, so an ungenerated state is a boss who is at least breathing. Each
  // becomes a data change here the day its clip lands.
  hit: {
    asset: DEBT_BEARER_IDLE,
    frameCount: 5,
    fps: 3,
    frame: DEBT_BEARER_FRAME,
    loop: true,
  },
  rage: {
    asset: DEBT_BEARER_IDLE,
    frameCount: 5,
    // Faster than idle: the same art reading as a different state costs
    // nothing and makes enrage legible before the rage clip exists.
    fps: 6,
    frame: DEBT_BEARER_FRAME,
    loop: true,
  },
  defeat: {
    asset: DEBT_BEARER_IDLE,
    frameCount: 5,
    fps: 3,
    frame: DEBT_BEARER_FRAME,
    loop: true,
  },
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

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

export type BossSpriteState = 'idle' | 'attack' | 'hit' | 'rage' | 'defeat';

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
  attack: still(WRAITH_IDLE),
  hit: still(WRAITH_IDLE),
  rage: still(WRAITH_IDLE),
  defeat: still(WRAITH_IDLE),
};

export const BOSS_CLIP_MANIFEST: Record<string, BossClip> = Object.fromEntries(
  Object.entries(EMBERBORN_WRAITH_CLIPS).map(([state, clip]) => [
    spriteKey(EMBERBORN_WRAITH_ID, state as BossSpriteState),
    clip,
  ]),
);

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

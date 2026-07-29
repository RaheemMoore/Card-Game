import type { ArenaManifest } from './types';

/**
 * Arena backgrounds — Leonardo-generated painted 16:9 scenes with a HUD-safe
 * upper-left region and low-contrast lower foreground. Prompts live in
 * Combat_Art_Acquisition_and_Integration_Plan.md and get pasted into the
 * C6 PR body for approval. C5 ships placeholder rows only.
 */
export const ARENA_MANIFEST: ArenaManifest = {
  forbidden_mountain_passage: {
    id: 'forbidden_mountain_passage',
    kind: 'arena',
    source: 'leonardo',
    path: 'arenas/forbidden-mountain-passage/base.png',
    dimensions: { width: 1360, height: 768 },
    approvalStatus: 'approved',
    promptVersion: 'p1.v1',
    notes:
      'Leonardo Phoenix 1.0 pixel-art pass (p1-candidate-4, seed=45ba9e9d job). ' +
      'Approved by Raheem 2026-07-20. Flat circular dais, gothic pilasters, ' +
      'lava-web floor, dark HUD-safe sky. Supersedes the C6 painted asset, ' +
      'archived at arenas/forbidden-mountain-passage/legacy-c6-painted.png. ' +
      'Losing p1-candidate-{1,2,3,5}.png kept on disk for reference.',
  },
};

/**
 * The arena for a boss, falling back to the default when that boss has no
 * arena of its own or its arena has no art yet. Never returns undefined —
 * a missing background would render the fight on a blank void.
 */
/**
 * The colour the arena's own light throws up onto the fighters.
 *
 * This used to be hardcoded warm ember in BOTH scene trees, with a comment
 * saying it existed "to match the pixel arena's lava veins" — true of the one
 * arena that existed, and actively wrong for any other. Drop a grove or a
 * bone-white sanctum under an orange floor-glow and you get a forest lit from
 * below by a lava pool that is not there.
 *
 * Per-arena, so a new background cannot be sabotaged by the previous one's
 * lighting.
 */
export const ARENA_GROUND_TINT: Record<string, { mid: string; low: string }> = {
  forbidden_mountain_passage: { mid: 'rgba(60,18,8,0.30)', low: 'rgba(80,20,10,0.60)' },
};

/** Falls back to the default arena's tint, matching resolveArenaFor. */
export function resolveGroundTint(arenaId: string | undefined) {
  return (
    (arenaId ? ARENA_GROUND_TINT[arenaId] : undefined) ??
    ARENA_GROUND_TINT[DEFAULT_ARENA_ID]
  );
}

export function resolveArenaFor(arenaId: string | undefined) {
  return (arenaId ? ARENA_MANIFEST[arenaId] : undefined) ?? ARENA_MANIFEST[DEFAULT_ARENA_ID];
}

export function getArena(arenaId: string) {
  return ARENA_MANIFEST[arenaId];
}

/** Default arena when a boss encounter doesn't specify one. */
export const DEFAULT_ARENA_ID = 'forbidden_mountain_passage';

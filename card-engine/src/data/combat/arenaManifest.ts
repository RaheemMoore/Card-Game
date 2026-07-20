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
    path: 'arenas/forbidden-mountain-passage/base.svg',
    dimensions: { width: 1920, height: 1080 },
    approvalStatus: 'placeholder',
    notes: 'Placeholder SVG — Leonardo painted 16:9 pending C6 approval.',
  },
};

export function getArena(arenaId: string) {
  return ARENA_MANIFEST[arenaId];
}

/** Default arena when a boss encounter doesn't specify one. */
export const DEFAULT_ARENA_ID = 'forbidden_mountain_passage';

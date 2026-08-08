#!/usr/bin/env node
/**
 * scene-guard — stop Claude destroying Raheem's work in the Phaser Editor scene.
 *
 * WHY THIS EXISTS. 2026-08-06: Claude ran a 24-object `scene-delete-game-objects`
 * built from a filter over coordinates read out of the .scene FILE ON DISK. The
 * disk was stale — Raheem had dragged several of those objects back into his
 * cliff after the last save — so the coordinates were fiction while the IDs were
 * still live. The delete removed them from wherever they actually were. It was
 * the third time in one session that trusting the disk over the live editor
 * caused a failure, and the first time it destroyed work.
 *
 * Raheem: "Do what you need to do to stop making this mistake."
 *
 * THE RULE. Claude does not delete objects from the scene. Ever. It lists
 * candidates with their ids and labels; Raheem deletes. Deletion is destructive
 * and he is the only one who knows what he has moved since the last save.
 *
 * WHY A HOOK AND NOT A NOTE IN CLAUDE.md. A note is a thing Claude remembers
 * when it is being careful. This runs whether or not Claude is being careful,
 * which is exactly when it is needed.
 *
 * ALSO BLOCKED: clearing a whole scene, and resizing/clearing a tilemap layer,
 * for the same reason — they are one-shot destructive and cannot be diffed
 * afterwards.
 *
 * NOT BLOCKED: adding, updating, moving, or writing tile data. Those are
 * additive or reversible with undo, and blocking them would stop the actual work.
 */
import { readFileSync } from 'node:fs';

const DESTRUCTIVE = new Set([
  'mcp__phaser-editor__scene-delete-game-objects',
  'mcp__phaser-editor__scene-clear-scene',
  'mcp__phaser-editor__scene-delete-plain-objects',
  'mcp__phaser-editor__scene-resize-editable-tilemap-layer',
  'mcp__phaser-editor__scene-delete-tileset-from-editable-tilemap',
]);

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0); // never break the session on a parse failure
}

const tool = payload.tool_name ?? '';
if (!DESTRUCTIVE.has(tool)) process.exit(0);

const ids = payload.tool_input?.objectIds ?? [];
const count = Array.isArray(ids) ? ids.length : 0;

const reason = [
  `BLOCKED: ${tool.replace('mcp__phaser-editor__', '')} is not available to Claude.`,
  '',
  'Deleting from the scene is Raheem\'s call, not Claude\'s. On 2026-08-06 a',
  '24-object delete built from stale on-disk coordinates destroyed the cliff he',
  'was building, because the objects had been moved since the last save.',
  '',
  count ? `This call would have removed ${count} object(s).` : '',
  '',
  'Do this instead:',
  '  1. Read the LIVE scene with scene-get-scene-data (never the .scene file on',
  '     disk while the editor is open — the disk is only current as of the last save).',
  '  2. Print the candidates as a list of id + label + position.',
  '  3. Ask Raheem to delete them, or to confirm before you move them aside.',
  '',
  'Moving an object out of the way with scene-update-game-objects is allowed and',
  'is reversible. Prefer it over deletion in every case.',
].join('\n');

console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PreToolUse',
    permissionDecision: 'deny',
    permissionDecisionReason: reason,
  },
}));
process.exit(0);

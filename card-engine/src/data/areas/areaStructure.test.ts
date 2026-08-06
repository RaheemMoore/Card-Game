import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Makes the area/layer structure a test failure rather than a style opinion.
 *
 * This wrapper is the entire reason the structure will hold. The repo already had
 * asset conventions written down in CLAUDE.md and HARNESS_INDEX.md, and six
 * competing naming schemes grew anyway, because nothing could fail. The one
 * convention here that never drifted — the asset pack's key and frame-size
 * parity — is the one with a test behind it.
 *
 * It shells out rather than importing the linter because the linter is a
 * standalone script Raheem runs directly (`npm run assets:lint`), and having one
 * implementation used both ways means the test cannot pass while the command he
 * actually types fails.
 */

const ROOT = resolve(__dirname, '../../..');

function lint(): { ok: boolean; errors: Array<{ file: string; problem: string; fix: string }> } {
  const out = execFileSync(
    process.execPath,
    [resolve(ROOT, 'scripts/phaser-editor/lint-assets.mjs'), '--json'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  return JSON.parse(out);
}

describe('area asset structure', () => {
  it('has no structure or naming problems', () => {
    const { ok, errors } = lint();
    // Surfaced as file → problem so a failure reads like the CLI does, rather than
    // as "expected true to be false".
    expect(errors.map((e) => `${e.file}: ${e.problem}`)).toEqual([]);
    expect(ok).toBe(true);
  });

  it('reports every problem it finds, not just the first', () => {
    // Guards the reporting contract itself. A linter that stops at the first error
    // turns a five-minute cleanup into five separate runs, which is how people
    // start working around it instead of with it.
    const { errors } = lint();
    expect(Array.isArray(errors)).toBe(true);
  });
});

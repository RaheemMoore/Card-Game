import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { WIKI_ASSET_PATHS } from '../asset-manifest';

/**
 * The Wiki no longer ships the game's whole public folder — it ships
 * `asset-manifest.ts`. That trade only stays safe if adding art to a page also
 * adds it to the manifest, and nobody is going to remember to do that.
 *
 * So: scan the source for asset URLs and fail when one is not covered. This is the
 * test that would have caught a page silently losing its images in production while
 * looking perfect in dev, which is the exact failure the manifest introduces.
 */

const wikiSource = resolve(import.meta.dirname);
const gamePublic = resolve(import.meta.dirname, '../../card-engine/public');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [full] : [];
  });
}

/**
 * Pull the static leading part of every `/assets/...` or `/portraits/...` URL.
 * A template such as `/assets/elements/${slug}.jpg` contributes `assets/elements/`
 * — the fixed prefix is what the manifest has to cover.
 */
function referencedPrefixes(): Set<string> {
  const found = new Set<string>();
  for (const file of sourceFiles(wikiSource)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/['"`](\/(?:assets|portraits)\/[^'"`]*)/g)) {
      const url = match[1].replace(/^\//, '');
      const staticPart = url.split('${')[0];
      found.add(staticPart);
    }
  }
  return found;
}

function isCovered(reference: string): boolean {
  return WIKI_ASSET_PATHS.some(
    (entry) => reference === entry || reference.startsWith(`${entry}/`) || entry.startsWith(reference),
  );
}

describe('Wiki asset manifest', () => {
  it('covers every asset URL referenced in the source', () => {
    const uncovered = [...referencedPrefixes()].filter((reference) => !isCovered(reference));
    expect(uncovered, `add these to studio-wiki/asset-manifest.ts:\n${uncovered.join('\n')}`).toEqual([]);
  });

  it('lists only paths that exist in the game public folder', () => {
    const missing = WIKI_ASSET_PATHS.filter((entry) => {
      try {
        readdirSync(resolve(gamePublic, entry));
        return false;
      } catch (error) {
        // A file rather than a directory is fine; anything else is a dead entry.
        return (error as NodeJS.ErrnoException).code !== 'ENOTDIR';
      }
    });
    expect(missing).toEqual([]);
  });

  it('does not ship the large game-only art the Wiki never renders', () => {
    // backgrounds/ and borders/ are 41 MB of forge plates and card frames. If a
    // Wiki page ever genuinely needs one, add the specific file, not the folder.
    expect(WIKI_ASSET_PATHS).not.toContain('assets/backgrounds');
    expect(WIKI_ASSET_PATHS).not.toContain('assets/borders');
  });
});

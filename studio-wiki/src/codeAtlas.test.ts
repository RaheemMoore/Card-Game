import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atlasPaths, codeAtlasFeatures } from './codeAtlas';

const repositoryRoot = resolve(import.meta.dirname, '../..');

describe('Code Atlas', () => {
  it('uses unique feature ids and routes', () => {
    expect(new Set(codeAtlasFeatures.map(({ id }) => id)).size).toBe(codeAtlasFeatures.length);
    expect(new Set(codeAtlasFeatures.map(({ route }) => route)).size).toBe(codeAtlasFeatures.length);
  });

  it('only points beginners to paths that still exist', () => {
    const missing = atlasPaths.filter((path) => !existsSync(resolve(repositoryRoot, path)));
    expect(missing).toEqual([]);
  });

  it('gives every area a useful starting point and search vocabulary', () => {
    for (const feature of codeAtlasFeatures) {
      expect(feature.startHere.goal.length).toBeGreaterThan(8);
      expect(feature.startHere.purpose.length).toBeGreaterThan(20);
      expect(feature.keywords.length).toBeGreaterThan(2);
    }
  });
});

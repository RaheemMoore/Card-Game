/// <reference types="node" />
import { test, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ARCHETYPE_NAMES } from '../../types/card';
import { buildImageEngineReference, buildLoreEngineReference } from './generateEngineReference';

/**
 * Doubles as (a) a guard that the generator covers every archetype and (b) the
 * `npm run docs:engines` writer. It only writes the .md files when GEN_DOCS=1 so
 * a normal `npm test` validates the generator without mutating tracked docs.
 */
test('engine references cover every archetype', () => {
  const image = buildImageEngineReference();
  const lore = buildLoreEngineReference();

  for (const archetype of ARCHETYPE_NAMES) {
    expect(image, `image ref missing ${archetype}`).toContain(`### ${archetype}`);
    expect(lore, `lore ref missing ${archetype}`).toContain(`### ${archetype}`);
  }

  if (process.env.GEN_DOCS === '1') {
    const root = resolve(process.cwd(), '..'); // card-engine → repo root
    writeFileSync(resolve(root, 'IMAGE_ENGINE_REFERENCE.md'), image);
    writeFileSync(resolve(root, 'LORE_ENGINE_REFERENCE.md'), lore);
  }
});

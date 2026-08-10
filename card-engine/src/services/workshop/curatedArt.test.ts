import { describe, it, expect } from 'vitest';
import { validateImageFile, MAX_UPLOAD_BYTES } from './curatedArt';
import {
  curatedArtPath,
  curatedCharacterId,
  curatedVariantId,
} from '../../types/curatedCard';

/**
 * The upload path is the first place in this app where a human-supplied FILE
 * reaches storage, so the rules that keep it safe are worth pinning down. The
 * server is the authority — these cover the client half that decides what is
 * even worth sending, plus the id/path helpers that decide where it lands.
 */

function fakeFile(name: string, type: string, size: number): File {
  const file = new File(['x'], name, { type });
  // File size is read-only; override for the size-cap cases.
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('validateImageFile', () => {
  it('accepts the three formats the endpoint allows', () => {
    expect(validateImageFile(fakeFile('a.png', 'image/png', 1024))).toBeNull();
    expect(validateImageFile(fakeFile('a.jpg', 'image/jpeg', 1024))).toBeNull();
    expect(validateImageFile(fakeFile('a.webp', 'image/webp', 1024))).toBeNull();
  });

  it('rejects a format the endpoint would refuse, naming the file', () => {
    const problem = validateImageFile(fakeFile('sneaky.gif', 'image/gif', 1024));
    expect(problem).toContain('sneaky.gif');
    expect(problem).toContain('PNG, JPEG, or WebP');
  });

  it('rejects a file with no type at all rather than hoping', () => {
    expect(validateImageFile(fakeFile('mystery', '', 1024))).toContain('unknown type');
  });

  it('rejects over the 5 MB cap and says how big it actually was', () => {
    const problem = validateImageFile(fakeFile('huge.png', 'image/png', MAX_UPLOAD_BYTES + 1));
    expect(problem).toContain('5 MB');
    expect(problem).toContain('5.0 MB');
  });

  it('accepts a file exactly at the cap — the limit is inclusive', () => {
    expect(validateImageFile(fakeFile('edge.png', 'image/png', MAX_UPLOAD_BYTES))).toBeNull();
  });

  it('rejects an empty file, which would upload as a valid-looking zero-byte object', () => {
    expect(validateImageFile(fakeFile('empty.png', 'image/png', 0))).toContain('empty');
  });
});

describe('id and path helpers', () => {
  it('builds a character id that survives an archetype with a space', () => {
    expect(curatedCharacterId('Mech Pilot', 'ash_runner')).toBe('char_mech_pilot_ash_runner');
  });

  it('derives the variant id from the character id without doubling the prefix', () => {
    const character = curatedCharacterId('Lycanthrope', 'thornhowl');
    expect(curatedVariantId(character, 'Moon')).toBe('var_lycanthrope_thornhowl_moon');
  });

  it('routes master art to _master and element art to its own folder', () => {
    expect(curatedArtPath('char_lycanthrope_thornhowl', '_master', 'Foundation', 'png'))
      .toBe('char_lycanthrope_thornhowl/_master/foundation.png');
    expect(curatedArtPath('char_lycanthrope_thornhowl', 'Moon', 'Ascendant', 'webp'))
      .toBe('char_lycanthrope_thornhowl/moon/ascendant.webp');
  });

  it('keeps every path segment inside the character-scoped prefix', () => {
    // The endpoint validates segments, but the generator should never produce
    // something that needs rejecting in the first place.
    const path = curatedArtPath('char_seraph_dawnward', 'Infernal', 'Forged', 'jpg');
    expect(path.startsWith('char_seraph_dawnward/')).toBe(true);
    expect(path).not.toContain('..');
    expect(path.split('/')).toHaveLength(3);
  });
});

import { describe, it, expect } from 'vitest';
import { decodeImageDataUrl, isSafePathSegment } from '../../../api/_lib/curatedArtStorage';

/**
 * The server-side half of the upload guard. These two functions are the only
 * thing between a browser-supplied string and a service-role write, so they are
 * tested from the same repo rather than trusted because they look careful.
 *
 * Imported across the api/ boundary deliberately: duplicating them into src to
 * make testing convenient would mean testing a copy while the real one drifts.
 */

describe('isSafePathSegment', () => {
  it('accepts the ids the workshop actually generates', () => {
    expect(isSafePathSegment('char_lycanthrope_thornhowl')).toBe(true);
    expect(isSafePathSegment('moon')).toBe(true);
    expect(isSafePathSegment('foundation')).toBe(true);
  });

  it('rejects traversal in every form, not just the obvious one', () => {
    expect(isSafePathSegment('..')).toBe(false);
    expect(isSafePathSegment('../secrets')).toBe(false);
    expect(isSafePathSegment('a/../../b')).toBe(false);
    expect(isSafePathSegment('....//')).toBe(false);
  });

  it('rejects separators, so a segment can never become a path', () => {
    expect(isSafePathSegment('a/b')).toBe(false);
    expect(isSafePathSegment('a\\b')).toBe(false);
    expect(isSafePathSegment('/absolute')).toBe(false);
  });

  it('rejects empties and whitespace that would collapse the path', () => {
    expect(isSafePathSegment('')).toBe(false);
    expect(isSafePathSegment(' ')).toBe(false);
    expect(isSafePathSegment('with space')).toBe(false);
  });

  it('rejects an absurdly long segment rather than letting it reach storage', () => {
    expect(isSafePathSegment('a'.repeat(129))).toBe(false);
    expect(isSafePathSegment('a'.repeat(128))).toBe(true);
  });
});

describe('decodeImageDataUrl', () => {
  // A one-pixel PNG, base64. Small but genuinely decodable.
  const PNG_1PX =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  it('decodes a png data URL to bytes and a stored extension', () => {
    const decoded = decodeImageDataUrl(`data:image/png;base64,${PNG_1PX}`);
    expect(decoded).not.toBeNull();
    expect(decoded!.ext).toBe('png');
    expect(decoded!.mime).toBe('image/png');
    expect(decoded!.buffer.byteLength).toBeGreaterThan(0);
  });

  it('normalises jpeg to a single stored extension so one rank cannot land twice', () => {
    // jpg and jpeg must not produce foundation.jpg AND foundation.jpeg for the
    // same rank — the second would not overwrite the first.
    const decoded = decodeImageDataUrl(`data:image/jpeg;base64,${PNG_1PX}`);
    expect(decoded!.ext).toBe('jpg');
  });

  it('accepts webp', () => {
    expect(decodeImageDataUrl(`data:image/webp;base64,${PNG_1PX}`)!.ext).toBe('webp');
  });

  it('rejects a bare base64 string with no data URL wrapper', () => {
    expect(decodeImageDataUrl(PNG_1PX)).toBeNull();
  });

  it('rejects a non-image mime type dressed as a data URL', () => {
    expect(decodeImageDataUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(decodeImageDataUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
  });

  it('rejects an empty payload, which would store a zero-byte object', () => {
    expect(decodeImageDataUrl('data:image/png;base64,')).toBeNull();
  });

  it('rejects a url-encoded (non-base64) data URL', () => {
    expect(decodeImageDataUrl('data:image/png,rawbytes')).toBeNull();
  });
});

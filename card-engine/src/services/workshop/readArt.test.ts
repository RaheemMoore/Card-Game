import { describe, it, expect } from 'vitest';
import { parseReading, applyAcceptedFields, READABLE_FIELDS } from './readArt';
import type { HiddenFate } from '../../types/bible';

/**
 * Parsing a model's answer is where an invented detail becomes an "observation".
 * These pin the behaviours that stop that: unknown keys are dropped, non-strings
 * are ignored, and an "unclear" value can never arrive labelled high-confidence.
 */

const EMPTY: HiddenFate = {
  age: '', sex: '', bodyType: '', skinTone: '', facialStructure: '', hair: '',
  disabilityOrCondition: '', posture: '', scars: '', weather: '', lighting: '',
  clothingConstruction: '', minorAccessories: '', environmentDetails: '',
};

describe('parseReading', () => {
  it('reads a clean object', () => {
    const r = parseReading(JSON.stringify({
      fields: { age: 'elderly', hair: 'white and braided' },
      confidence: { age: 'high', hair: 'medium' },
      notes: 'Ascendant adds a cloak.',
    }));
    expect(r.fields.age).toBe('elderly');
    expect(r.confidence.hair).toBe('medium');
    expect(r.notes).toBe('Ascendant adds a cloak.');
  });

  it('survives prose or a code fence around the JSON', () => {
    const r = parseReading('Here is what I see:\n```json\n{"fields":{"sex":"female"}}\n```\nHope that helps.');
    expect(r.fields.sex).toBe('female');
  });

  it('drops keys that are not HiddenFate fields', () => {
    const r = parseReading(JSON.stringify({
      fields: { age: 'young', backstory: 'orphaned in a fire', __proto__: 'x' },
    }));
    expect(r.fields.age).toBe('young');
    expect(Object.keys(r.fields)).toEqual(['age']);
  });

  it('ignores a non-string value instead of stringifying it into a description', () => {
    const r = parseReading(JSON.stringify({ fields: { age: 42, hair: { colour: 'red' }, sex: 'male' } }));
    expect(r.fields.age).toBeUndefined();
    expect(r.fields.hair).toBeUndefined();
    expect(r.fields.sex).toBe('male');
  });

  it('ignores an empty or whitespace value', () => {
    const r = parseReading(JSON.stringify({ fields: { age: '   ', sex: '' } }));
    expect(r.fields.age).toBeUndefined();
    expect(r.fields.sex).toBeUndefined();
  });

  it('forces "unclear" to low confidence even when the model claimed high', () => {
    const r = parseReading(JSON.stringify({
      fields: { scars: 'unclear — the Foundation image is cropped' },
      confidence: { scars: 'high' },
    }));
    expect(r.confidence.scars).toBe('low');
  });

  it('drops a confidence value outside the three allowed levels', () => {
    const r = parseReading(JSON.stringify({
      fields: { hair: 'short' },
      confidence: { hair: 'very high' },
    }));
    expect(r.confidence.hair).toBeUndefined();
  });

  it('throws on no JSON at all rather than returning an empty reading', () => {
    // Silently returning {} would look like "the art shows nothing", which is a
    // very different statement from "the call failed".
    expect(() => parseReading('I could not see the images.')).toThrow(/readable JSON/i);
  });

  it('throws on malformed JSON', () => {
    expect(() => parseReading('{"fields": {oops}}')).toThrow(/malformed/i);
  });

  it('handles a response with no fields key', () => {
    const r = parseReading(JSON.stringify({ notes: 'nothing legible' }));
    expect(r.fields).toEqual({});
    expect(r.notes).toBe('nothing legible');
  });

  it('covers every readable field it is given', () => {
    const all = Object.fromEntries(READABLE_FIELDS.map((f) => [f, `${f} value`]));
    const r = parseReading(JSON.stringify({ fields: all }));
    expect(Object.keys(r.fields).sort()).toEqual([...READABLE_FIELDS].sort());
  });
});

describe('applyAcceptedFields', () => {
  it('writes only the fields that were accepted', () => {
    const next = applyAcceptedFields(EMPTY, { age: 'prime', hair: 'shaved' });
    expect(next.age).toBe('prime');
    expect(next.hair).toBe('shaved');
    expect(next.skinTone).toBe('');
  });

  it('never blanks an existing value with an empty acceptance', () => {
    const existing = { ...EMPTY, age: 'elderly' };
    const next = applyAcceptedFields(existing, { age: '   ' });
    expect(next.age).toBe('elderly');
  });

  it('does not mutate the sheet it was given', () => {
    const existing = { ...EMPTY, age: 'young' };
    applyAcceptedFields(existing, { age: 'ancient' });
    expect(existing.age).toBe('young');
  });
});

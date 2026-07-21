import { describe, it, expect } from 'vitest';
import { applySeraphTransmutation } from './tierUp';
import type { Card, NarrativeAxisState } from '../types/card';
import type { ElementName } from '../types/bible';

/** Minimal Seraph card carrying only the fields the pure helper reads. */
function seraphCard(opts: {
  element?: ElementName;
  currentElement?: ElementName;
  originalElement?: ElementName;
}): Card {
  return {
    archetype: 'Seraph',
    elementSelection: {
      element: opts.element ?? 'Light',
      bond: 'It is my purpose.',
      compatibility: 'naturally_compatible',
    },
    currentElement: opts.currentElement,
    originalElement: opts.originalElement,
  } as unknown as Card;
}

function axis(path: string, score = 0): NarrativeAxisState {
  return { axisId: 'seraph_alignment', score, path, resolvedAtRank: 'Forged' };
}

describe('applySeraphTransmutation', () => {
  it('transmutes a Fallen Light Seraph to Infernal and records the origin', () => {
    const patch = applySeraphTransmutation(seraphCard({ element: 'Light' }), axis('fallen', -3));
    expect(patch.currentElement).toBe('Infernal');
    expect(patch.originalElement).toBe('Light');
    expect(patch.narrativeAxis.path).toBe('fallen');
  });

  it('does not transmute a Fallen non-Light Seraph', () => {
    const patch = applySeraphTransmutation(seraphCard({ element: 'Holy' }), axis('fallen', -2));
    expect(patch.currentElement).toBeUndefined();
    expect(patch.originalElement).toBeUndefined();
  });

  it('does not transmute a Good Seraph', () => {
    const patch = applySeraphTransmutation(seraphCard({ element: 'Light' }), axis('good', 3));
    expect(patch.currentElement).toBeUndefined();
    expect(patch.originalElement).toBeUndefined();
  });

  it('does not re-record origin when already transmuted and still Fallen', () => {
    const patch = applySeraphTransmutation(
      seraphCard({ element: 'Light', currentElement: 'Infernal', originalElement: 'Light' }),
      axis('fallen', -4),
    );
    // originalElement stays as-is (not in the patch); currentElement stays Infernal.
    expect(patch.originalElement).toBeUndefined();
    expect(patch.currentElement).toBeUndefined();
  });

  it('reverts to the origin element when a transmuted Seraph is no longer Fallen', () => {
    const patch = applySeraphTransmutation(
      seraphCard({ element: 'Light', currentElement: 'Infernal', originalElement: 'Light' }),
      axis('balanced', 0),
    );
    expect(patch.currentElement).toBe('Light');
  });
});

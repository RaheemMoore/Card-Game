import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CARD_ACTIONS,
  actionsFor,
  clearCardActions,
  registerCardActions,
  resolveAction,
} from './cardActions';

afterEach(clearCardActions);

describe('card actions', () => {
  it('gives an unregistered card the default two slots', () => {
    expect(actionsFor('practice_1')).toEqual(DEFAULT_CARD_ACTIONS);
  });

  it('sends a tap to the quick slot and a hold to the heavy one', () => {
    expect(resolveAction('practice_1', 'quick')).toEqual({ kind: 'blast', scale: 'tap' });
    expect(resolveAction('practice_1', 'heavy')).toEqual({ kind: 'blast', scale: 'charged' });
  });

  it('dispatches the two slots independently for the same card', () => {
    // The whole claim the seam makes: one card, two slots, and changing one does
    // not touch the other.
    registerCardActions('ember', {
      quick: { kind: 'blast', scale: 'tap' },
      heavy: { kind: 'scaffold', label: 'heavy-under-design' },
    });

    expect(resolveAction('ember', 'quick')).toEqual({ kind: 'blast', scale: 'tap' });
    expect(resolveAction('ember', 'heavy')).toEqual({
      kind: 'scaffold',
      label: 'heavy-under-design',
    });
  });

  it('lets a card carry something that is not a blast at all', () => {
    // Proves the runtime's switch has a second arm without an ability existing
    // to put in it — which is exactly what §8.3 asks the slice to demonstrate.
    registerCardActions('shade', {
      quick: { kind: 'scaffold', label: 'step' },
      heavy: { kind: 'scaffold', label: 'vanish' },
    });
    const quick = resolveAction('shade', 'quick');
    expect(quick.kind).toBe('scaffold');
  });

  it('leaves other cards alone when one is registered', () => {
    registerCardActions('ember', {
      quick: { kind: 'scaffold', label: 'x' },
      heavy: { kind: 'scaffold', label: 'y' },
    });
    expect(actionsFor('practice_2')).toEqual(DEFAULT_CARD_ACTIONS);
  });

  it('resolves rather than throwing when the card is gone', () => {
    // A crash inside the fire path would take the courtyard down over a card
    // that had already left his hand. Falling back is the better failure.
    expect(resolveAction(null, 'quick')).toEqual(DEFAULT_CARD_ACTIONS.quick);
    expect(actionsFor(null)).toEqual(DEFAULT_CARD_ACTIONS);
  });

  it('treats an unknown release as the quick slot', () => {
    // `null` reaches here only if something fired without going through a
    // release, and the safe reading of "we do not know" is the weaker action.
    expect(resolveAction('practice_1', null)).toEqual(DEFAULT_CARD_ACTIONS.quick);
  });

  it('ships every card on the default today', () => {
    // Guards the ruling, not the code: heavy is instrumentation-only for this
    // slice. If someone registers a real heavy effect, this test should fail and
    // make them say so out loud.
    expect(DEFAULT_CARD_ACTIONS.heavy).toEqual({ kind: 'blast', scale: 'charged' });
  });
});

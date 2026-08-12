import { describe, expect, it } from 'vitest';
import {
  HAND_SIZE,
  canFire,
  cardLocations,
  commitSelected,
  cycleSelection,
  emptyHand,
  handFromCards,
  hasNoDuplicates,
  recoverCard,
  releaseCommitted,
  scatterHand,
  selectSlot,
  selectedSlot,
} from './hand';

const four = ['card_a', 'card_b', 'card_c', 'card_d'];

describe('building a hand', () => {
  it('starts empty with nothing selected', () => {
    const h = emptyHand();
    expect(h.slots).toHaveLength(HAND_SIZE);
    expect(h.selected).toBeNull();
    expect(canFire(h)).toBe(false);
  });

  it('fills from canonical card ids and selects the first', () => {
    const h = handFromCards(four);
    expect(h.slots.map((s) => s.cardId)).toEqual(four);
    expect(h.selected).toBe(0);
    expect(canFire(h)).toBe(true);
  });

  it('ignores cards beyond the four he can carry', () => {
    // The collection is arbitrarily large; more cards than slots is the normal
    // case rather than an error.
    const h = handFromCards([...four, 'card_e', 'card_f']);
    expect(h.slots).toHaveLength(HAND_SIZE);
    expect(cardLocations(h).has('card_e')).toBe(false);
  });
});

describe('selection', () => {
  it('selects by index and ignores indexes that do not exist', () => {
    const h = handFromCards(four);
    expect(selectSlot(h, 2).selected).toBe(2);
    expect(selectSlot(h, 9).selected).toBe(0);
    expect(selectSlot(h, -1).selected).toBe(0);
  });

  it('cycles in both directions and wraps', () => {
    let h = handFromCards(four);
    h = cycleSelection(h, -1);
    expect(h.selected).toBe(HAND_SIZE - 1);
    h = cycleSelection(h, 1);
    expect(h.selected).toBe(0);
  });

  it('lets an empty or dropped slot be selected', () => {
    // Skipping the gap a scattered card left reads as the selection being
    // broken; showing the hole is what tells the player what is missing.
    const h = selectSlot(handFromCards(['card_a']), 2);
    expect(h.selected).toBe(2);
    expect(canFire(h)).toBe(false);
  });

  it('holds exactly one selection at a time', () => {
    const h = selectSlot(handFromCards(four), 3);
    expect(h.selected).toBe(3);
    expect(selectedSlot(h)?.cardId).toBe('card_d');
  });
});

describe('the one-location invariant', () => {
  it('never lists a card in two slots through a full drop and recovery', () => {
    // The bug this whole module exists to prevent: a duplicated card is a
    // duplicated CHARACTER, which is the thing the game is about.
    let h = handFromCards(four);
    const { hand: scattered, dropped } = scatterHand(h);
    h = scattered;
    expect(hasNoDuplicates(h)).toBe(true);

    for (const card of dropped) h = recoverCard(h, card);
    expect(hasNoDuplicates(h)).toBe(true);
    expect(h.slots.map((s) => s.cardId)).toEqual(four);
  });

  it('cannot mint a copy when a pickup is processed twice', () => {
    // Two colliders in one frame, or a replayed event. Without the guard this is
    // how one card becomes two.
    let h = handFromCards(['card_a']);
    const { hand, dropped } = scatterHand(h);
    h = recoverCard(hand, dropped[0]);
    h = recoverCard(h, dropped[0]);
    expect(cardLocations(h).size).toBe(1);
    expect(hasNoDuplicates(h)).toBe(true);
  });

  it('scatters only the cards actually in hand', () => {
    // A committed card belongs to its action, and a dropped card cannot drop
    // again — either scattering here puts one card in two places.
    let h = handFromCards(four);
    h = commitSelected(h);
    const first = scatterHand(h);
    const second = scatterHand(first.hand);
    expect(first.dropped.map((d) => d.cardId)).toEqual(['card_b', 'card_c', 'card_d']);
    expect(second.dropped).toEqual([]);
  });
});

describe('recovery', () => {
  it('returns a card to the slot it fell from', () => {
    let h = handFromCards(four);
    const { hand, dropped } = scatterHand(h);
    const c = dropped.find((d) => d.cardId === 'card_c')!;
    h = recoverCard(hand, c);
    expect(h.slots[2]).toEqual({ cardId: 'card_c', state: 'ready' });
  });

  it('finds another slot when its own has been taken', () => {
    // A player who rearranged their hand between dropping and collecting should
    // not lose the card to a bookkeeping conflict.
    let h = handFromCards(['card_a']);
    const { hand, dropped } = scatterHand(h);
    h = { ...hand, slots: hand.slots.map((s, i) => (i === 0 ? { cardId: 'card_z', state: 'ready' as const } : s)) };
    h = recoverCard(h, dropped[0]);
    expect(cardLocations(h).get('card_a')).toBe('ready');
    expect(hasNoDuplicates(h)).toBe(true);
  });

  it('refuses to lose a card when there is genuinely no room', () => {
    const full = handFromCards(four);
    const stray = { cardId: 'card_z', slotIndex: 0 };
    expect(recoverCard(full, stray)).toBe(full);
  });
});

describe('committing', () => {
  it('stops a committed card firing again or dropping', () => {
    let h = commitSelected(handFromCards(four));
    expect(canFire(h)).toBe(false);
    expect(scatterHand(h).dropped.map((d) => d.cardId)).not.toContain('card_a');
  });

  it('releases back to ready when the action resolves', () => {
    let h = commitSelected(handFromCards(four));
    h = releaseCommitted(h, 0);
    expect(canFire(h)).toBe(true);
  });

  it('will not commit a card that is not ready', () => {
    const { hand } = scatterHand(handFromCards(four));
    expect(commitSelected(hand)).toBe(hand);
  });
});

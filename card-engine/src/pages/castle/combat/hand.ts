/**
 * The four cards the Card-wright carries.
 *
 * THE INVARIANT THIS FILE EXISTS FOR, from handoff §7.4:
 *
 *   > A card has one authoritative location/state: hand slot, committed action,
 *   > dropped world pickup, or active summon — not two at once.
 *
 * It sounds obvious and it is the exact bug this feature invites. Knockdown drops
 * cards into the world while the hand still lists them; picking one up puts it
 * back while the world pickup still exists; a summon commits a card that a later
 * knockdown scatters again. Every one of those duplicates a card, and a duplicated
 * card is a duplicated CHARACTER — the thing the whole game is about. So location
 * is a single field, transitions are functions, and nothing outside this module is
 * allowed to write a slot.
 *
 * Cards are referenced by their canonical `cardId` from types/card.ts. There is
 * deliberately no parallel "combat card" record: a second identity model for the
 * same character is how a rename or a tier-up silently stops matching.
 *
 * Pure: no Phaser, no storage.
 */

export const HAND_SIZE = 4;

/**
 * Where a card is. Exactly one of these is true at a time.
 *
 * `committed` covers the window where a card is mid-action — thrown but not yet
 * resolved, or part way through a summon ritual — during which it can neither be
 * fired again nor dropped.
 */
export type SlotState = 'empty' | 'ready' | 'committed' | 'dropped' | 'summoned';

export interface Slot {
  /** Canonical Card.cardId, or null when the slot is empty. */
  cardId: string | null;
  state: SlotState;
}

export interface Hand {
  slots: Slot[];
  /** Index of the selected slot, or null when nothing is selected. */
  selected: number | null;
}

const emptySlot = (): Slot => ({ cardId: null, state: 'empty' });

export function emptyHand(): Hand {
  return { slots: Array.from({ length: HAND_SIZE }, emptySlot), selected: null };
}

/**
 * Build a hand from canonical card ids.
 *
 * Extra ids beyond four are ignored rather than throwing: the collection is
 * arbitrarily large and the hand is four, so "more cards than slots" is the normal
 * case, not an error.
 */
export function handFromCards(cardIds: readonly string[]): Hand {
  const hand = emptyHand();
  cardIds.slice(0, HAND_SIZE).forEach((cardId, i) => {
    hand.slots[i] = { cardId, state: 'ready' };
  });
  hand.selected = hand.slots.findIndex((s) => s.state === 'ready');
  if (hand.selected === -1) hand.selected = null;
  return hand;
}

/** The selected slot, when there is one and it holds a card. */
export function selectedSlot(hand: Hand): Slot | null {
  if (hand.selected === null) return null;
  return hand.slots[hand.selected] ?? null;
}

/**
 * Whether the selected card can be fired right now.
 *
 * This is what gates the attack. A dropped, committed or summoned card is not a
 * weapon — that is the whole point of scattering them.
 */
export function canFire(hand: Hand): boolean {
  return selectedSlot(hand)?.state === 'ready';
}

/**
 * Select a slot by index.
 *
 * An empty or dropped slot CAN be selected. Refusing would silently skip past the
 * gap a scattered card left, which reads as the selection being broken; showing
 * the empty slot is what tells the player what they are missing and where it goes
 * back.
 */
export function selectSlot(hand: Hand, index: number): Hand {
  if (index < 0 || index >= HAND_SIZE) return hand;
  if (hand.selected === index) return hand;
  return { ...hand, slots: [...hand.slots], selected: index };
}

/** Step the selection, skipping nothing, wrapping at both ends. */
export function cycleSelection(hand: Hand, direction: 1 | -1): Hand {
  const from = hand.selected ?? 0;
  const next = (from + direction + HAND_SIZE) % HAND_SIZE;
  return selectSlot(hand, next);
}

/** A card that leaves the hand for the world, or for a ritual. */
export interface DroppedCard {
  cardId: string;
  /** The slot it came from, so it returns where the player expects. */
  slotIndex: number;
}

/**
 * Scatter every ready card into the world.
 *
 * Only `ready` cards scatter. A card already dropped cannot drop twice, and one
 * mid-action is the action's responsibility — either of those scattering here is
 * precisely how a card ends up existing in two places.
 */
export function scatterHand(hand: Hand): { hand: Hand; dropped: DroppedCard[] } {
  const dropped: DroppedCard[] = [];
  const slots = hand.slots.map((slot, i) => {
    if (slot.state !== 'ready' || !slot.cardId) return slot;
    dropped.push({ cardId: slot.cardId, slotIndex: i });
    return { ...slot, state: 'dropped' as const };
  });
  return { hand: { ...hand, slots }, dropped };
}

/**
 * Return a recovered card to the hand.
 *
 * It goes back to the slot it fell from when that slot is still its own, and to
 * the first free slot otherwise — a player who rearranged their hand between
 * dropping and collecting should not lose the card to a bookkeeping conflict.
 *
 * Returns the hand unchanged if the card is not actually missing, so a pickup
 * processed twice — two colliders in one frame, a replayed event — cannot mint a
 * second copy.
 */
export function recoverCard(hand: Hand, card: DroppedCard): Hand {
  const alreadyHeld = hand.slots.some(
    (s) => s.cardId === card.cardId && s.state !== 'dropped',
  );
  if (alreadyHeld) return hand;

  const home = hand.slots[card.slotIndex];
  const target =
    home && (home.cardId === card.cardId || home.state === 'empty')
      ? card.slotIndex
      : hand.slots.findIndex((s) => s.state === 'empty' || s.cardId === card.cardId);
  if (target === -1) return hand;

  const slots = hand.slots.map((slot, i) =>
    i === target ? { cardId: card.cardId, state: 'ready' as const } : slot,
  );
  return { ...hand, slots };
}

/** Mark the selected card as mid-action, so it can neither fire again nor drop. */
export function commitSelected(hand: Hand): Hand {
  if (!canFire(hand)) return hand;
  const slots = hand.slots.map((slot, i) =>
    i === hand.selected ? { ...slot, state: 'committed' as const } : slot,
  );
  return { ...hand, slots };
}

/** Release a committed card back to the hand once its action has resolved. */
export function releaseCommitted(hand: Hand, slotIndex: number): Hand {
  const slot = hand.slots[slotIndex];
  if (!slot || slot.state !== 'committed') return hand;
  const slots = hand.slots.map((s, i) =>
    i === slotIndex ? { ...s, state: 'ready' as const } : s,
  );
  return { ...hand, slots };
}

/**
 * Every card id the hand knows about, with where it is.
 *
 * Exists so the invariant can be checked from outside — by a test, or by a dev
 * readout — rather than only being believed.
 */
export function cardLocations(hand: Hand): Map<string, SlotState> {
  const found = new Map<string, SlotState>();
  for (const slot of hand.slots) {
    if (slot.cardId) found.set(slot.cardId, slot.state);
  }
  return found;
}

/** Every slot currently lying in the world as a pickup. */
export function droppedSlots(hand: Hand): DroppedCard[] {
  const out: DroppedCard[] = [];
  hand.slots.forEach((slot, i) => {
    if (slot.state === 'dropped' && slot.cardId) out.push({ cardId: slot.cardId, slotIndex: i });
  });
  return out;
}

/** True when no card id appears in more than one slot. */
export function hasNoDuplicates(hand: Hand): boolean {
  const ids = hand.slots.map((s) => s.cardId).filter((id): id is string => id !== null);
  return ids.length === new Set(ids).size;
}

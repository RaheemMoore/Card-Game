import type { ReleaseKind } from './actionState';

/**
 * What a card does with each of its two action slots.
 *
 * THE POINT OF THIS FILE, and the reason it is this small: handoff §8.3 asks for
 * "the smallest seam that proves two independently dispatchable action slots per
 * card" and explicitly warns against building an ability framework during the
 * slice. So this is a lookup and a tagged union, not a system. It exists to
 * answer one question — given a card and how the player released, what should
 * happen — and to make the answer a DATA change rather than a new branch in the
 * runtime's giant switch.
 *
 * What this deliberately does NOT have: costs, cooldowns, targeting modes,
 * status effects, conditions, or any notion of an element. Every one of those is
 * a real future need and every one of them is cheaper to add against a shipped
 * seam than to guess at now. The ability system already exists for card battles
 * (`services/abilities/`); when the overworld needs that vocabulary it should
 * borrow it rather than grow a second one here.
 *
 * Pure: no Phaser, no runtime state.
 */

/**
 * A single action, as a tagged union the runtime switches on.
 *
 * `blast` is the shipped verb — the elemental projectile the courtyard already
 * fires. `scaffold` is a slot that dispatches and is counted but produces no
 * effect; it exists so a card can prove it holds something OTHER than a blast
 * without anyone having to invent an ability to put there.
 */
export type CardActionSpec =
  | {
      kind: 'blast';
      /**
       * How the charge reaches the projectile.
       *
       * `tap` fires at the floor; `charged` fires at whatever the player built.
       * The state machine has already clamped the charge for a quick release, so
       * this is descriptive rather than a second place that decides.
       */
      scale: 'tap' | 'charged';
    }
  | {
      kind: 'scaffold';
      /**
       * What this slot is standing in for, in words.
       *
       * Shown in the dev panel and the counters and NOWHERE the player can see
       * it. A label that leaks into the game is how a test effect becomes canon
       * by accident, which handoff §6.3 asks us not to let happen.
       */
      label: string;
    };

export interface CardActionDef {
  quick: CardActionSpec;
  heavy: CardActionSpec;
}

/**
 * What a card does when nothing more specific is registered.
 *
 * Every card in the game uses this today, and that is the correct state of
 * affairs for this milestone: the heavy slot is real, dispatches separately, and
 * is measurably distinct in charge — but it is still a blast, because inventing
 * a second effect would be throwaway work and a temporary effect documented as a
 * card's heavy is how scaffolding becomes canon.
 */
export const DEFAULT_CARD_ACTIONS: CardActionDef = {
  quick: { kind: 'blast', scale: 'tap' },
  heavy: { kind: 'blast', scale: 'charged' },
};

/**
 * Per-card overrides, keyed by card id.
 *
 * Empty on purpose. It is here so that giving one card a different heavy is a
 * single entry in this map rather than a change to the runtime — which is the
 * whole claim the seam is making, and it is worth being able to demonstrate it
 * without an ability existing yet.
 */
const REGISTRY = new Map<string, CardActionDef>();

/** Register a card's actions. Returns the map for chaining in tests. */
export function registerCardActions(cardId: string, def: CardActionDef) {
  REGISTRY.set(cardId, def);
  return REGISTRY;
}

/** Forget every override. Tests only, so one case cannot leak into the next. */
export function clearCardActions() {
  REGISTRY.clear();
}

/** Everything a card can do, falling back to the default. */
export function actionsFor(cardId: string | null): CardActionDef {
  if (!cardId) return DEFAULT_CARD_ACTIONS;
  return REGISTRY.get(cardId) ?? DEFAULT_CARD_ACTIONS;
}

/**
 * The one call the runtime makes: which action fires, given the card and the
 * release.
 *
 * A null card resolves rather than throwing. The hand should never let a shot
 * reach here without one, but a crash inside the fire path would take the whole
 * courtyard down over a card that was already gone, and falling back to the
 * default blast is a strictly better failure.
 */
export function resolveAction(
  cardId: string | null,
  releaseKind: ReleaseKind | null,
): CardActionSpec {
  const def = actionsFor(cardId);
  return releaseKind === 'heavy' ? def.heavy : def.quick;
}

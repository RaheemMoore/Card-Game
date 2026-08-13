import type { ActionPhase } from './actionState';
import { LIGHT_MAX_CHARGE, HEAVY_CHARGE } from './feel';

/**
 * How a card slot in the HUD looks, for one frame.
 *
 * WHY THIS EXISTS. The row of pips is the only part of an attack the player is
 * ALREADY looking at — it sits under the hero, it is where they pick what to
 * fire, and it is the one surface that knows which card is which. It has been
 * saying almost nothing: a slot went purple when it was spent and that was the
 * whole vocabulary. Everything the attack does — the charge building, the
 * moment of release, the window where he cannot fire again — happened only out
 * in the world, on a 71-pixel character.
 *
 * So this is the same six beats the rest of the initiative is built on, said
 * a second time in the corner of the eye:
 *
 *   anticipation — the fill climbs the selected pip as the charge builds.
 *   commitment   — it reaches the top and the pip locks bright at heavy.
 *   contact      — the pip punches out on the frame the shot leaves.
 *   recovery     — the row dims while he is still recovering, which is the
 *                  only honest answer to "why is nothing happening when I
 *                  press fire".
 *
 * PURE, and separate from the React that draws it, for the reason every other
 * feel module here is: this is arithmetic about a curve, and arithmetic wants
 * tests rather than a person squinting at a HUD deciding whether the fill looks
 * about right.
 *
 * WHAT IT MUST NOT DO. It never decides anything. The charge it is given
 * already decided the shot's severity in `feel.ts`; this only agrees with it.
 * If the fill and the blast could ever disagree about what "heavy" means, the
 * HUD would be teaching the player a threshold the game does not use — which is
 * worse than showing nothing at all.
 */

export interface SlotFeel {
  /**
   * How far the charge fill has climbed, 0–1. Zero when this slot is not the
   * one being charged.
   */
  fill: number;
  /** Multiplier on the pip's size. 1 = untouched. */
  scale: number;
  /** Multiplier on the whole slot's opacity. */
  opacity: number;
  /**
   * How lit the fill's cap is, 0–1 — brightest at a full heavy charge.
   *
   * A separate channel from `fill` because "the bar is full" and "this is now a
   * heavy shot" are different facts, and the second is the one worth acting on.
   */
  glow: number;
  /** True once the charge has crossed into heavy. Drives the border. */
  heavy: boolean;
}

export const SLOT_NEUTRAL: SlotFeel = { fill: 0, scale: 1, opacity: 1, glow: 0, heavy: false };

/**
 * How much the pip swells on the frame the shot leaves, at full charge.
 *
 * Applied as a snap up with the settle left to a CSS transition, because that
 * is what a punch is: `active` lasts 60ms and any easing INTO it would eat the
 * whole phase and read as a swell rather than a hit.
 */
const PUNCH = 0.22;

/** How far the row fades while he cannot fire again. */
const RECOVERY_DIM = 0.55;

export interface SlotFeelInput {
  /** What the hand says about this slot. */
  state: 'empty' | 'ready' | 'committed' | 'dropped' | string;
  /** Whether this is the slot the player has chosen. */
  selected: boolean;
  /** What the Card-wright is doing right now. */
  phase: ActionPhase | string;
  /** How far the charge has built, 0–1. */
  charge: number;
  /** Held plain when the player has asked for no motion. */
  motionOff: boolean;
}

const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/**
 * Resolve one slot's look.
 *
 * Only the SELECTED slot animates. A row where every pip pulses on every shot
 * would be four things competing to say one thing, and the player would lose
 * the one piece of information the row uniquely carries — which card is about
 * to go.
 */
export function slotFeel(input: SlotFeelInput): SlotFeel {
  const { state, selected, phase, motionOff } = input;
  const charge = clamp01(input.charge);

  // An empty or dropped slot has nothing to say about a shot it is not part of.
  // Dropped slots already have their own amber, dashed language for being lost.
  if (!selected || state === 'empty' || state === 'dropped') {
    return phase === 'recovery' ? { ...SLOT_NEUTRAL, opacity: RECOVERY_DIM } : SLOT_NEUTRAL;
  }

  switch (phase) {
    case 'charging':
    case 'windup': {
      // Windup holds the fill where the release left it rather than draining
      // it: the shot is already decided by then, and a bar that emptied during
      // the 180ms before the blast would say the charge had been lost.
      const heavy = charge >= HEAVY_CHARGE;
      return {
        fill: charge,
        // Leans on the pip a little as it loads — the same anticipation the
        // body is doing, at the size a HUD can afford.
        scale: motionOff ? 1 : 1 + 0.06 * charge,
        opacity: 1,
        // Dark until the shot is worth more than a tap, then climbs to full at
        // heavy. A glow that started at zero charge would be on almost always
        // and would mean nothing.
        glow: charge <= LIGHT_MAX_CHARGE ? 0 : clamp01((charge - LIGHT_MAX_CHARGE) / (HEAVY_CHARGE - LIGHT_MAX_CHARGE)),
        heavy,
      };
    }

    case 'active':
      return {
        // Stays full through the release, so the fill is at its peak in the
        // same frame the blast appears. They are the same event.
        fill: 1,
        scale: motionOff ? 1 : 1 + PUNCH * (0.4 + 0.6 * charge),
        opacity: 1,
        glow: 1,
        heavy: charge >= HEAVY_CHARGE,
      };

    case 'recovery':
      // Drained and dimmed: the card is spent and he cannot fire again yet.
      // This is the beat that answers a pressed key doing nothing.
      return { fill: 0, scale: 1, opacity: RECOVERY_DIM, glow: 0, heavy: false };

    default:
      return SLOT_NEUTRAL;
  }
}

import { describe, expect, it } from 'vitest';
import { HEAVY_CHARGE, LIGHT_MAX_CHARGE, severityForCharge } from './feel';
import { slotFeel, SLOT_NEUTRAL, type SlotFeelInput } from './slotFeel';

const feel = (over: Partial<SlotFeelInput> = {}) =>
  slotFeel({
    state: 'ready',
    selected: true,
    phase: 'charging',
    charge: 0,
    motionOff: false,
    ...over,
  });

describe('card slot feedback', () => {
  it('only the selected slot animates', () => {
    // Four pips pulsing on every shot would be four things saying one thing,
    // and the row's unique job — which card is about to go — would be lost.
    expect(feel({ selected: false, phase: 'active', charge: 1 })).toEqual(SLOT_NEUTRAL);
  });

  it('says nothing about a slot with no card in it', () => {
    for (const state of ['empty', 'dropped']) {
      expect(feel({ state, phase: 'active', charge: 1 }), state).toEqual(SLOT_NEUTRAL);
    }
  });

  it('fills as the charge builds', () => {
    expect(feel({ charge: 0 }).fill).toBe(0);
    expect(feel({ charge: 0.5 }).fill).toBe(0.5);
    expect(feel({ charge: 1 }).fill).toBe(1);
  });

  it('holds the fill through windup rather than draining it', () => {
    // The shot is already decided by then. A bar emptying during the 180ms
    // before the blast would say the charge had been lost.
    expect(feel({ phase: 'windup', charge: 0.8 }).fill).toBe(0.8);
    expect(feel({ phase: 'active', charge: 0.8 }).fill).toBe(1);
  });

  it('agrees with feel.ts about what heavy means', () => {
    // THE POINT OF THE WHOLE MODULE. If the HUD had its own threshold it would
    // be teaching the player a rule the game does not use, which is worse than
    // showing nothing. Both sides are checked against `severityForCharge`.
    for (let c = 0; c <= 1.0001; c += 0.02) {
      const heavy = feel({ charge: c }).heavy;
      expect(heavy, `charge ${c.toFixed(2)}`).toBe(severityForCharge(c) === 'heavy');
    }
  });

  it('keeps the cap dark until the shot is worth more than a tap', () => {
    expect(feel({ charge: 0 }).glow).toBe(0);
    expect(feel({ charge: LIGHT_MAX_CHARGE }).glow).toBe(0);
    expect(feel({ charge: HEAVY_CHARGE }).glow).toBe(1);
    // Monotone in between, so it reads as approaching something.
    const mid = feel({ charge: (LIGHT_MAX_CHARGE + HEAVY_CHARGE) / 2 }).glow;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('punches hardest on the heaviest shot, and only on release', () => {
    const tap = feel({ phase: 'active', charge: 0 }).scale;
    const full = feel({ phase: 'active', charge: 1 }).scale;
    expect(tap).toBeGreaterThan(1);
    expect(full).toBeGreaterThan(tap);
    // Nothing punches while merely charging — anticipation and contact are
    // different beats and must not wear the same movement.
    expect(feel({ phase: 'charging', charge: 1 }).scale).toBeLessThan(tap);
  });

  it('dims the whole row through recovery', () => {
    // The only honest answer to "why did nothing happen when I pressed fire".
    expect(feel({ phase: 'recovery' }).opacity).toBeLessThan(1);
    expect(feel({ phase: 'recovery', selected: false }).opacity).toBeLessThan(1);
    expect(feel({ phase: 'recovery', state: 'empty' }).opacity).toBeLessThan(1);
    // And drains the fill: the card is spent.
    expect(feel({ phase: 'recovery', charge: 1 }).fill).toBe(0);
  });

  it('is quiet while exploring', () => {
    expect(feel({ phase: 'explore', charge: 1 })).toEqual(SLOT_NEUTRAL);
    expect(feel({ phase: 'knockdown' })).toEqual(SLOT_NEUTRAL);
  });

  it('with motion off, keeps the information and drops the movement', () => {
    // The fill and the glow are FACTS about the shot; the swell and the punch
    // are decoration. Only the decoration may be dropped.
    const charging = feel({ charge: 0.8, motionOff: true });
    expect(charging.scale).toBe(1);
    expect(charging.fill).toBe(0.8);
    expect(charging.glow).toBeGreaterThan(0);

    const fired = feel({ phase: 'active', charge: 1, motionOff: true });
    expect(fired.scale).toBe(1);
    expect(fired.fill).toBe(1);
  });

  it('clamps a charge outside 0–1', () => {
    expect(feel({ charge: -1 }).fill).toBe(0);
    expect(feel({ charge: 5 }).fill).toBe(1);
  });
});

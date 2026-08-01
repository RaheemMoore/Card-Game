import { test, expect } from 'vitest';
import { ARCHETYPE_NAMES } from '../../types/card';
import { ELEMENT_NAMES } from '../../types/bible';
import { elementsAvailableToArchetype } from '../elements';
import { ELEMENT_TO_DAMAGE_TYPE } from './elementDamageType';

/**
 * Guards the tech-exclusivity invariant (2026-07-31, Raheem).
 *
 * WHY THIS TEST EXISTS: `tech` damage belongs to Human, Android and Mech Pilot
 * alone, and that is what allows a boss to be built so it CANNOT be beaten
 * without a machine in the party. Nothing enforces it at resolution time — it
 * is an emergent property of two files agreeing: which elements map to `tech`
 * here, and who can hold those elements in `elements.ts`.
 *
 * That means it breaks silently, from an edit that looks unrelated and
 * reasonable. It has broken twice already: Psychic mapped to `tech` while
 * being a Monk rare, and the Barbarian held Metal as a rare. Both were found by
 * running this check, not by reading the diff.
 */

/** The only archetypes permitted to deal `tech` damage. */
const MACHINE_FACTION: readonly string[] = ['Human', 'Android', 'Mech Pilot'];

test('only the machine faction can reach tech damage', () => {
  const leaks: string[] = [];

  for (const archetype of ARCHETYPE_NAMES) {
    if (MACHINE_FACTION.includes(archetype)) continue;
    for (const element of elementsAvailableToArchetype(archetype)) {
      if (ELEMENT_TO_DAMAGE_TYPE[element] === 'tech') {
        leaks.push(`${archetype} can hold ${element}, which deals tech damage`);
      }
    }
  }

  expect(
    leaks,
    'A non-machine archetype reached tech damage. Either that element must ' +
      'leave the archetype\'s buckets in elements.ts, or it must map to a ' +
      'different damage type here. Do NOT remap Metal — it is the Human\'s ' +
      'only element, so moving it would strip the tech faction of tech damage.',
  ).toEqual([]);
});

test('every machine-faction archetype can actually reach tech damage', () => {
  // The mirror failure: an edit that closes the leak by emptying the faction's
  // own buckets would satisfy the test above while breaking the game worse.
  for (const archetype of MACHINE_FACTION) {
    const techElements = elementsAvailableToArchetype(
      archetype as (typeof ARCHETYPE_NAMES)[number],
    ).filter((element) => ELEMENT_TO_DAMAGE_TYPE[element] === 'tech');

    expect(
      techElements.length,
      `${archetype} is in the machine faction but can reach no tech element`,
    ).toBeGreaterThan(0);
  }
});

test('every element resolves to a damage type', () => {
  // The record is typed exhaustively, so this catches a hand-edit that removes
  // a key at runtime rather than a missing type.
  for (const element of ELEMENT_NAMES) {
    expect(ELEMENT_TO_DAMAGE_TYPE[element], `${element} has no damage type`).toBeDefined();
  }
});

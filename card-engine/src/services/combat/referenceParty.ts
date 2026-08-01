import { buildAbilitySnapshot, buildHeroSnapshot } from './harness';
import { SEED_ABILITIES } from '../../data/abilities/seedAbilities';
import type { CardStats } from '../../types/card';
import type { HeroSnapshot } from '../../types/combat';

/**
 * The yardstick party.
 *
 * Every balance claim about a boss — win rate, rounds, which line clears — is
 * meaningless without saying who was fighting. This is that "who": three
 * Forged heroes with the same three seed abilities, spread across a tank, a
 * bruiser and a glass cannon.
 *
 * It is a MEASURING INSTRUMENT, not a prediction. Real rosters carry real
 * elements and real ability loadouts, and will not perform like this. What it
 * buys is comparability: a number measured against this party can be compared
 * to another number measured against this party, which is the only way to tell
 * whether a change made a fight harder or just different.
 *
 * Elements are flattened to physical on purpose — these suites assert combat
 * math, not element interaction, and a party carrying a boss's weakness would
 * quietly measure that instead.
 *
 * Shared by the balance suite and the dev boss readout so the readout cannot
 * print numbers the tests never gated on.
 */

function statsFor(atk: number, def: number, mana: number): CardStats {
  return {
    Atk: { value: atk, bias: 'Mid', hardCap: 100 },
    Def: { value: def, bias: 'Mid', hardCap: 100 },
    Mana: { value: mana, bias: 'Mid', hardCap: 100 },
  };
}

function heroFor(id: string, stats: CardStats): HeroSnapshot {
  const soul = SEED_ABILITIES.find((s) => s.definition.id === 'ability_inherited_guard')!;
  const ember = SEED_ABILITIES.find((s) => s.definition.id === 'ability_oathbreakers_answer')!;
  const radiant = SEED_ABILITIES.find((s) => s.definition.id === 'ability_bearing_witness')!;
  return buildHeroSnapshot({
    cardId: id,
    archetype: 'Barbarian',
    displayName: id,
    stats,
    rank: 'Forged',
    elementDamageType: 'kinetic',
    abilities: [
      buildAbilitySnapshot(soul.definition, soul.version),
      buildAbilitySnapshot(ember.definition, ember.version),
      buildAbilitySnapshot(radiant.definition, radiant.version),
    ],
  });
}

/** Fresh instances each call — snapshots are shared by reference downstream. */
export function buildReferenceParty(): HeroSnapshot[] {
  return [
    heroFor('Vanguard', statsFor(70, 55, 60)),
    heroFor('Warden', statsFor(50, 70, 55)),
    heroFor('Reaver', statsFor(65, 45, 65)),
  ];
}

/** Human-readable description of the yardstick, for readouts and reports. */
export const REFERENCE_PARTY_LABEL =
  'Three Forged heroes — Vanguard (70/55/60), Warden (50/70/55), Reaver (65/45/65) — ' +
  'each carrying Inherited Guard, Oathbreaker’s Answer and Bearing Witness, elements flattened to physical.';

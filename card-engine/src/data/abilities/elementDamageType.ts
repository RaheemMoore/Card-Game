import type { ElementName } from '../../types/bible';
import type { DamageType } from '../../types/abilities';

/**
 * Which of the eight combat damage types a card's element fights as.
 *
 * This is the bridge between the Bible's Global Element Pillar (29 narrative
 * elements) and the combat contract (8 mechanical damage types), and it is
 * what makes element choice matter in a fight. Abilities whose version sets
 * `damageTypeSource: 'element'` — the cheap core slot and the shared
 * `Attuned Strike` — resolve their damage type through here; signature and
 * ultimate abilities keep the fixed type their archetype authored, so a card
 * still reads as its archetype rather than as its element wearing a costume.
 *
 * The practical consequence: the Emberborn Wraith is weak to holy and nature,
 * and that weakness is reachable by CHOOSING a Light or Nature element rather
 * than by being forced to play one particular archetype. Element compatibility
 * buckets already gate which archetypes can plausibly hold which elements, so
 * the lore stays honest without any extra rule.
 *
 * Deliberately typed `Record<ElementName, DamageType>` rather than a partial
 * map with a fallback: adding a 30th element should be a COMPILE ERROR that
 * forces a decision, not a silent demotion to `physical`.
 *
 * MECHANICAL ONLY. This does not describe how an element LOOKS — that lives in
 * `data/elementVisualLanguage.ts` (motion, materials, lighting) and
 * `data/elementVisuals.ts` (the text-glow palette). An element can share a
 * damage type with another and still look nothing like it; Void and Bone are
 * both `shadow` here and are visually unrelated.
 */
export const ELEMENT_TO_DAMAGE_TYPE: Record<ElementName, DamageType> = {
  // --- fire ---------------------------------------------------------------
  Fire: 'searing',

  // --- nature: growth, decay, beasts, tides, and the lunar cycle ----------
  // Water sits here rather than in a element of its own: it is the element of
  // life and erosion in the Bible's language, and the roster needs enough
  // nature carriers that the Wraith's weakness isn't a single-element gate.
  Nature: 'primal',
  Beast: 'primal',
  Poison: 'primal',
  Earth: 'primal',
  Wind: 'primal',
  Water: 'primal',
  Moon: 'primal',
  Lunar: 'primal',

  // --- holy: radiance and the divine spark --------------------------------
  Light: 'radiant',
  Holy: 'radiant',
  Prism: 'radiant',
  Spirit: 'radiant',

  // --- shadow: night, absence, blood, the architecture of the dead, and the
  // unseen interior — force that acts where nothing is touched --------------
  Shadow: 'umbral',
  Void: 'umbral',
  Blood: 'umbral',
  Bone: 'umbral',
  Nocturne: 'umbral',
  Sanguine: 'umbral',
  Dream: 'umbral',
  // 2026-07-31: moved off `tech`. The mind and the dream are the same
  // territory — what is not seen directly — and a Monk's Psychic must not
  // resolve as machinery now that `tech` is the machine faction's alone.
  // Sharing a damage type with Dream says nothing about how it LOOKS; see
  // elementVisualLanguage.ts, which is canonical for that.
  Psychic: 'umbral',
  // Infernal is a Fallen Seraph's transmuted Light — molten obsidian and BLACK
  // light. Mapping it to `fire` would drag the fire-orange palette back in
  // through the mechanics, which Seraph Bible §14 forbids outright.
  Infernal: 'umbral',

  // --- tech: the machine faction, and nobody else -------------------------
  // 2026-07-31 (Raheem): ONLY Human, Android and Mech Pilot may deal `tech`
  // damage. These three elements are exactly the three the tech family can
  // hold (see ELEMENT_COMPATIBILITY), so the rule is enforced by the element
  // buckets rather than by a check at resolution time. Adding a fourth entry
  // here without checking who can hold it silently breaks that.
  Metal: 'tech',
  Plasma: 'tech',
  Nanite: 'tech',

  // --- astral: the cosmos, and time ---------------------------------------
  // Cosmic is the Monk's PEACE culmination and Monk-exclusive. It resolved as
  // `tech` until the exclusivity rule above; demoting it into holy or shadow
  // would have folded the culmination into somebody else's family, so it got
  // its own type. Time rides along — no archetype can hold it (below).
  Cosmic: 'astral',
  Time: 'astral',

  // --- physical: force with no elemental claim ----------------------------
  // Ice and Storm are kinetic before they are elemental — impact and shock,
  // not growth or radiance. They get no resistance interaction with the
  // current boss, which is a deliberate cost of picking them.
  //
  // Storm is held by NO archetype (2026-07-31, deliberate — see below), so in
  // practice `physical` reaches the roster through Ice alone. That is known
  // and accepted, not an oversight to "fix".
  Ice: 'kinetic',
  Storm: 'kinetic',
};

/**
 * Elements no archetype can hold, by decision rather than by omission
 * (2026-07-31, Raheem): **Storm** and **Time**.
 *
 * They keep their names, art and damage types and are reachable from nowhere
 * in `ELEMENT_COMPATIBILITY`. This is recorded because the natural reading of
 * an unreferenced element is "somebody forgot" — they did not. The roster is
 * closed to new ELEMENTS, not to new archetypes, and these two are the seed
 * material a future archetype would be built to reach.
 *
 * Not exported as a runtime value on purpose: nothing should branch on it.
 * It is a note to the next person who greps for `Storm` and finds nothing.
 */

/**
 * The damage type a card fights as, given its resolved element.
 *
 * Falls back to `physical` only for a card with NO element at all (legacy
 * cards forged before the Global Element Pillar landed) — never as a silent
 * default for a known element, which the exhaustive record above prevents.
 */
export function damageTypeForElement(element: ElementName | undefined): DamageType {
  return element ? ELEMENT_TO_DAMAGE_TYPE[element] : 'kinetic';
}

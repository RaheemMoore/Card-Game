import type { ElementName } from '../../types/bible';
import type { DamageType } from '../../types/abilities';

/**
 * Which of the seven combat damage types a card's element fights as.
 *
 * This is the bridge between the Bible's Global Element Pillar (29 narrative
 * elements) and the combat contract (7 mechanical damage types), and it is
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
  Fire: 'fire',

  // --- nature: growth, decay, beasts, tides, and the lunar cycle ----------
  // Water sits here rather than in a element of its own: it is the element of
  // life and erosion in the Bible's language, and the roster needs enough
  // nature carriers that the Wraith's weakness isn't a single-element gate.
  Nature: 'nature',
  Beast: 'nature',
  Poison: 'nature',
  Earth: 'nature',
  Wind: 'nature',
  Water: 'nature',
  Moon: 'nature',
  Lunar: 'nature',

  // --- holy: radiance and the divine spark --------------------------------
  Light: 'holy',
  Holy: 'holy',
  Prism: 'holy',
  Spirit: 'holy',

  // --- shadow: night, absence, blood, and the architecture of the dead -----
  Shadow: 'shadow',
  Void: 'shadow',
  Blood: 'shadow',
  Bone: 'shadow',
  Nocturne: 'shadow',
  Sanguine: 'shadow',
  Dream: 'shadow',
  // Infernal is a Fallen Seraph's transmuted Light — molten obsidian and BLACK
  // light. Mapping it to `fire` would drag the fire-orange palette back in
  // through the mechanics, which Seraph Bible §14 forbids outright.
  Infernal: 'shadow',

  // --- tech: the engineered and the computed ------------------------------
  Metal: 'tech',
  Plasma: 'tech',
  Nanite: 'tech',
  Time: 'tech',
  Cosmic: 'tech',
  Psychic: 'tech',

  // --- physical: force with no elemental claim ----------------------------
  // Ice and Storm are kinetic before they are elemental — impact and shock,
  // not growth or radiance. They get no resistance interaction with the
  // current boss, which is a deliberate cost of picking them.
  Ice: 'physical',
  Storm: 'physical',
};

/**
 * The damage type a card fights as, given its resolved element.
 *
 * Falls back to `physical` only for a card with NO element at all (legacy
 * cards forged before the Global Element Pillar landed) — never as a silent
 * default for a known element, which the exhaustive record above prevents.
 */
export function damageTypeForElement(element: ElementName | undefined): DamageType {
  return element ? ELEMENT_TO_DAMAGE_TYPE[element] : 'physical';
}

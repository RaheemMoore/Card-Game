import type { ElementName } from '../types/bible';

/**
 * Per-element crystal artwork shown in the forge element picker (and, optionally,
 * as a thumbnail on the Card Detail page). Custom-designed 1024² crystal renders
 * live in `card-engine/public/assets/elements/` and are served by Vite at
 * `/assets/elements/<name>.jpg`.
 *
 * Kept separate from `elementVisuals.ts` (name color/glow) and
 * `elementVisualLanguage.ts` (Leonardo prompt metadata) — this file is purely
 * the display-image path, mirroring `archetypeEmblems.ts`.
 *
 * `Time` has no artwork (no archetype offers it), so it is intentionally absent
 * and falls back gracefully via `getElementImage`. `Tech` is not an element.
 */
export const ELEMENT_IMAGES: Partial<Record<ElementName, string>> = {
  Fire: '/assets/elements/fire.jpg',
  Water: '/assets/elements/water.jpg',
  Earth: '/assets/elements/earth.jpg',
  Wind: '/assets/elements/wind.jpg',
  Ice: '/assets/elements/ice.jpg',
  Storm: '/assets/elements/storm.jpg',
  Nature: '/assets/elements/nature.jpg',
  Beast: '/assets/elements/beast.jpg',
  Blood: '/assets/elements/blood.jpg',
  Poison: '/assets/elements/poison.jpg',
  Metal: '/assets/elements/metal.jpg',
  Spirit: '/assets/elements/spirit.jpg',
  Shadow: '/assets/elements/shadow.jpg',
  Light: '/assets/elements/light.jpg',
  Holy: '/assets/elements/holy.jpg',
  Void: '/assets/elements/void.jpg',
  Cosmic: '/assets/elements/cosmic.jpg',
  Psychic: '/assets/elements/psychic.jpg',
  Moon: '/assets/elements/moon.jpg',
  Dream: '/assets/elements/dream.jpg',
  Bone: '/assets/elements/bone.jpg',
  Nocturne: '/assets/elements/nocturne.jpg',
  Sanguine: '/assets/elements/sanguine.jpg',
  Lunar: '/assets/elements/lunar.jpg',
  Plasma: '/assets/elements/plasma.jpg',
  Nanite: '/assets/elements/nanite.jpg',
  Prism: '/assets/elements/prism.jpg',
  Infernal: '/assets/elements/infernal.jpg',
};

/** The element's crystal image path, or null when no artwork exists (e.g. Time). */
export function getElementImage(element: ElementName): string | null {
  return ELEMENT_IMAGES[element] ?? null;
}

import type { ElementName } from '../types/bible';
import type { Rank } from '../types/card';

/**
 * Per-element display palette — drives the elemental name treatment on the
 * Card Detail page (color + a glow that intensifies with the card's tier).
 *
 * `color` is the element name text color. `glow` is the same hue expressed as
 * an `r,g,b` triple so we can build tier-scaled `text-shadow` alpha/radius.
 *
 * Lore note: `Infernal` is the Fallen-Seraph-exclusive element — molten
 * obsidian + black light (ultraviolet), NEVER fire-orange (see CLAUDE.md /
 * Bible §Seraph corruption arc). Keep it dark violet, not warm.
 */
export interface ElementVisual {
  color: string;
  glow: string; // "r,g,b"
}

export const ELEMENT_VISUALS: Record<ElementName, ElementVisual> = {
  Fire: { color: '#ff6a3d', glow: '255,106,61' },
  Water: { color: '#3d9bff', glow: '61,155,255' },
  Earth: { color: '#c08a4d', glow: '192,138,77' },
  Wind: { color: '#9fe8dc', glow: '159,232,220' },
  Ice: { color: '#9fdcff', glow: '159,220,255' },
  Storm: { color: '#8a9bff', glow: '138,155,255' },
  Nature: { color: '#4fce6b', glow: '79,206,107' },
  Beast: { color: '#d08a4f', glow: '208,138,79' },
  Blood: { color: '#e0364f', glow: '224,54,79' },
  Poison: { color: '#9fd83a', glow: '159,216,58' },
  Metal: { color: '#c4cdd6', glow: '196,205,214' },
  Spirit: { color: '#bfb0ff', glow: '191,176,255' },
  Shadow: { color: '#9a86bf', glow: '154,134,191' },
  Light: { color: '#fff2b0', glow: '255,242,176' },
  Holy: { color: '#ffe08a', glow: '255,224,138' },
  Void: { color: '#a884d6', glow: '150,110,190' },
  Time: { color: '#dcc37f', glow: '220,195,127' },
  Cosmic: { color: '#8fb6ff', glow: '143,182,255' },
  Tech: { color: '#4de0d0', glow: '77,224,208' },
  Psychic: { color: '#e07fd0', glow: '224,127,208' },
  Moon: { color: '#cdd6ff', glow: '205,214,255' },
  Dream: { color: '#c8a8ff', glow: '200,168,255' },
  // Fallen-exclusive — molten obsidian + black light. Never fire-orange.
  Infernal: { color: '#a15be0', glow: '130,50,200' },
  Bone: { color: '#e8e2d0', glow: '232,226,208' },
  Nocturne: { color: '#a01f2e', glow: '160,31,46' },
  Sanguine: { color: '#9b1b3a', glow: '155,27,58' },
  Lunar: { color: '#eaf0ff', glow: '234,240,255' },
  Plasma: { color: '#a8c8ff', glow: '168,200,255' },
  Nanite: { color: '#c8ccd4', glow: '200,204,212' },
  Prism: { color: '#cfefff', glow: '207,239,255' },
};

/** Fallback for any element without an explicit palette entry. */
export const DEFAULT_ELEMENT_VISUAL: ElementVisual = {
  color: '#e8d7b0',
  glow: '232,215,176',
};

export function getElementVisual(element: ElementName): ElementVisual {
  return ELEMENT_VISUALS[element] ?? DEFAULT_ELEMENT_VISUAL;
}

/**
 * Tier-scaled glow intensity: Foundation is a subtle ember, Forged medium,
 * Ascendant a strong aura. Returns a ready-to-use `text-shadow` string.
 */
export function elementGlowShadow(element: ElementName, rank: Rank): string {
  const { glow } = getElementVisual(element);
  const scale: Record<Rank, { blur: number; alpha: number; layers: number }> = {
    Foundation: { blur: 6, alpha: 0.35, layers: 1 },
    Forged: { blur: 10, alpha: 0.55, layers: 2 },
    Ascendant: { blur: 16, alpha: 0.8, layers: 2 },
  };
  const s = scale[rank] ?? scale.Foundation;
  const shadows = [`0 0 ${s.blur}px rgba(${glow},${s.alpha})`];
  if (s.layers > 1) {
    shadows.push(`0 0 ${s.blur * 2}px rgba(${glow},${(s.alpha * 0.6).toFixed(2)})`);
  }
  return shadows.join(', ');
}

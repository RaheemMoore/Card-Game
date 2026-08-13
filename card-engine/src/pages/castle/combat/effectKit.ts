import { MATERIAL_KITS } from '../../../data/combat/performance/materialKits';
import type { ElementName } from '../../../types/bible';

/**
 * Which art draws a card's blast, and in what colours.
 *
 * A thin adapter, deliberately. The elemental effect art was generated in
 * PixelLab for the boss battle — 545 PNGs covering 27 elements — and the palette,
 * family and impact character for every element are already authored in
 * `materialKits.ts`. None of that is restated here: this only answers "which
 * Phaser texture, and what colour are its sparks", so the overworld and the tower
 * cannot drift into disagreeing about what Fire looks like.
 *
 * WHAT IS NOT REUSABLE, and why this file is not simply an import. The boss
 * battle's renderers are React components that position `<img>` tags in percent
 * against a DOM stage and animate them with CSS. The ART transfers to Phaser; the
 * plumbing cannot. See combat/blastVfx.ts for the Phaser half.
 *
 * Texture keys come from `scripts/effects/pack_effects.py`, which packs the
 * per-frame PNGs into strips: `fx-<form>-<element>-<clip>`.
 */

/** A resolved effect clip: a packed spritesheet key and how to play it. */
export interface EffectClip {
  key: string;
  frameCount: number;
  fps: number;
}

export interface EffectKit {
  /** The travelling body of the blast. */
  stream: EffectClip | null;
  /** The burst where it lands. */
  impact: EffectClip | null;
  /** [core, edge, accent] from the element's authored kit. */
  palette: readonly [string, string, string];
  /** True when the art is the element's own rather than a stand-in. */
  exact: boolean;
}

/**
 * Frame rates.
 *
 * The stream loops for as long as the shot is in flight; the impact plays once.
 * Both clips are nine frames, so the impact at 18fps reads as a half-second
 * burst — long enough to see, short enough not to trail the projectile that
 * caused it.
 */
const STREAM_FPS = 16;
const IMPACT_FPS = 18;

const FRAMES = 9;

/**
 * Elements whose art exists, lowercased to match the directory names the packer
 * read. Kept as a literal set rather than probing the texture cache so this
 * module stays pure and testable without a running game.
 *
 * Absent on purpose: Holy (its barrier kit was never given art) and Time, which
 * has no effect folder. Both fall through to the family stand-in below.
 */
const ELEMENTS_WITH_ART = new Set([
  'beast', 'blood', 'bone', 'cosmic', 'dream', 'earth', 'fire', 'ice',
  'infernal', 'light', 'lunar', 'metal', 'moon', 'nanite', 'nocturne',
  'plasma', 'poison', 'prism', 'psychic', 'sanguine', 'shadow', 'spirit',
  'storm', 'void', 'water', 'wind',
]);

/**
 * The stand-in when an element has no art of its own.
 *
 * Chosen by FAMILY, not by hue — a Holy blast borrowing Light's art is a
 * plausible radiant shape in the right colours, where borrowing Fire's would be
 * a lie about what the element is. The palette still comes from the element's
 * own kit, so it never actually reads as the element it borrowed from.
 */
const FAMILY_STAND_IN: Record<string, string> = {
  searing: 'fire',
  primal: 'earth',
  radiant: 'light',
  umbral: 'shadow',
  tech: 'nanite',
  astral: 'cosmic',
  kinetic: 'wind',
};

/** Some clips were only ever produced as a still; the packer made them 1 frame. */
const STILL_ONLY_STREAM = new Set(['bone', 'nanite', 'sanguine']);
const STILL_ONLY_IMPACT = new Set(['blood', 'earth', 'metal', 'shadow']);

const clip = (folder: string, name: 'stream' | 'impact'): EffectClip => {
  const still =
    name === 'stream' ? STILL_ONLY_STREAM.has(folder) : STILL_ONLY_IMPACT.has(folder);
  return {
    key: `fx-lash-${folder}-${name}`,
    frameCount: still ? 1 : FRAMES,
    fps: name === 'stream' ? STREAM_FPS : IMPACT_FPS,
  };
};

/**
 * Resolve the effect for an element.
 *
 * Never returns null outright: an element with no art still fires, wearing a
 * family stand-in in its own colours. A card that cannot be shot because nobody
 * drew its element yet would be a far worse bug than one that looks approximate.
 */
export function effectKitFor(element: ElementName | undefined): EffectKit {
  const material = element ? MATERIAL_KITS[element] : undefined;
  const palette = (material?.palette ?? ['#9fd8ff', '#dff2ff', '#ffffff']) as unknown as readonly [
    string,
    string,
    string,
  ];

  const folder = element?.toLowerCase();
  if (folder && ELEMENTS_WITH_ART.has(folder)) {
    return { stream: clip(folder, 'stream'), impact: clip(folder, 'impact'), palette, exact: true };
  }

  const standIn = material ? FAMILY_STAND_IN[material.family] : undefined;
  if (standIn && ELEMENTS_WITH_ART.has(standIn)) {
    return {
      stream: clip(standIn, 'stream'),
      impact: clip(standIn, 'impact'),
      palette,
      exact: false,
    };
  }

  // No element, or one whose family has no stand-in either. The caller draws its
  // own placeholder shape; the palette still applies.
  return { stream: null, impact: null, palette, exact: false };
}

/** Every texture key the courtyard must load to draw any blast. */
export function allEffectTextureKeys(): string[] {
  const keys: string[] = [];
  for (const folder of ELEMENTS_WITH_ART) {
    keys.push(clip(folder, 'stream').key, clip(folder, 'impact').key);
  }
  return keys.sort();
}

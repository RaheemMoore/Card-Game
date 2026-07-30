import type { ArchetypeName } from '../../types/card';
import type { CombatArtAsset, HeroSpriteManifest } from './types';

/**
 * Hero combat sprites, one per archetype. Two sources ship in the same
 * manifest per the C0 hybrid decision (plan §15.1):
 *
 *   - 7 sprites from the Figma community pack
 *     "16 Vector Pixel Fantasy Characters – Fully Scalable SVG RPG Asset Pack"
 *     (voPWJtCJFCl3sik8s5ABkc). Exported via the Figma MCP as PNG@2x.
 *
 *   - 4 sprites generated with Leonardo Phoenix 1.0 where the pack had no
 *     clean fit (Android, Vampire, Monk, Druid). Prompts + seeds recorded in
 *     the individual asset notes below.
 *
 * Full-height character exports (~342×512 to ~1152×1536). Downscaled and
 * composited at battle time via HeroLane; the manifest carries the source
 * dimensions for aspect-ratio reference.
 *
 * ALL OF THESE ARE PLACEHOLDERS, pending replacement via the PixelLab pipeline
 * (scripts/sprite-lab, see the create-character-sprite skill). Note that
 * `human.png` actively contradicts the Human Bible chapter, whose
 * `visualDNA.avoid` bans "generic adventurers, brown leather, swords as
 * default, medieval-soldier shorthand" — it is all four. Replacements must
 * make the archetype's chosen path readable.
 */

/**
 * Where the character actually sits inside its own PNG, as fractions of that
 * PNG's width/height. The two art sources frame their characters completely
 * differently — the Figma pack leaves ~23% dead space under the feet
 * (`baseline` ≈ 0.76) while the Leonardo renders run nearly to the edge
 * (`baseline` ≈ 0.95) — so dropping both into one fixed box with
 * `object-contain object-bottom` aligns the IMAGE bottoms, not the FEET, and
 * scales the two sources to wildly different apparent sizes. These numbers let
 * `HeroSpriteLayer` anchor every archetype to one shared floor line at one
 * shared body height instead.
 *
 * Measured from the largest connected opaque region (NOT the raw alpha
 * bounding box) — `monk.png` and `vampire.png` have a decorative moon floating
 * in the corner that would otherwise drag `top` up and skew both the height
 * normalization and the horizontal centering.
 *
 * Re-measure with `scripts/measure-hero-sprites.py` if a sprite is replaced.
 */
export interface HeroSpriteAnchor {
  /** Fraction of image height at the character's feet — the floor line. */
  baseline: number;
  /** Fraction of image height the character's silhouette spans. */
  bodyHeight: number;
  /** Fraction of image width at the silhouette's horizontal center. */
  centerX: number;
  /**
   * Per-archetype fudge on the normalized body height, for when the measured
   * silhouette is dominated by held gear rather than the character (a raised
   * axe, a bow, a smokestack) and the archetype consequently reads too small
   * next to the rest of the party. 1 = pure measured normalization.
   */
  heightScale?: number;
}

interface HeroSpriteSpec {
  path: string;
  source: CombatArtAsset['source'];
  width: number;
  height: number;
  anchor: HeroSpriteAnchor;
  notes: string;
  promptVersion?: string;
}

const FIGMA_PACK = 'figma:voPWJtCJFCl3sik8s5ABkc';

const SPRITE_SPECS: Record<ArchetypeName, HeroSpriteSpec> = {
  Barbarian: {
    path: 'heroes/archetypes/barbarian.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7656, bodyHeight: 0.5996, centerX: 0.5 },
    notes: `${FIGMA_PACK} · Character 5 (viking berserker with horned helm + axe).`,
  },
  Monk: {
    path: 'heroes/archetypes/monk.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
    anchor: { baseline: 0.9466, bodyHeight: 0.8034, centerX: 0.4688 },
    promptVersion: 'c6.hero.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=808080. Shaven-headed martial artist in ' +
      'wine-red + saffron layered robes with wooden staff. Approved by Raheem 2026-07-19 ' +
      '(replaced the pack cat-rogue fallback).',
  },
  Beastmaster: {
    path: 'heroes/archetypes/beastmaster.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7676, bodyHeight: 0.6602, centerX: 0.5249 },
    notes: `${FIGMA_PACK} · Character 14 (elf archer/ranger with glowing bow).`,
  },
  Druid: {
    path: 'heroes/archetypes/druid.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
    anchor: { baseline: 0.9499, bodyHeight: 0.9108, centerX: 0.5152 },
    promptVersion: 'c6.hero.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=606060. Antlered druid in leaf-green cloak with ' +
      'living-branch staff. Approved by Raheem 2026-07-19 (best pixel-style match of the ' +
      'AI batch; replaced the pack farmer fallback).',
  },
  Necromancer: {
    path: 'heroes/archetypes/necromancer.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7559, bodyHeight: 0.6543, centerX: 0.5 },
    notes: `${FIGMA_PACK} · Character 12 (undead lich with blue flame aura).`,
  },
  Vampire: {
    path: 'heroes/archetypes/vampire.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
    anchor: { baseline: 0.9368, bodyHeight: 0.8477, centerX: 0.4918 },
    promptVersion: 'c6.hero.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=131313. Aristocratic pale humanoid in black plate + ' +
      'crimson-lined cloak with silver longsword. Approved by Raheem 2026-07-19 ' +
      '(replaced the pack fire-sorceress fallback).',
  },
  Lycanthrope: {
    path: 'heroes/archetypes/lycanthrope.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7598, bodyHeight: 0.6211, centerX: 0.5103 },
    notes: `${FIGMA_PACK} · Character 4 (wolf-headed warrior with axe and shield).`,
  },
  'Mech Pilot': {
    path: 'heroes/archetypes/mech-pilot.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7676, bodyHeight: 0.6875, centerX: 0.5059 },
    notes: `${FIGMA_PACK} · Character 8 (steampunk engineer with wrench + goggles).`,
  },
  Android: {
    path: 'heroes/archetypes/android.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
    anchor: { baseline: 0.9622, bodyHeight: 0.9134, centerX: 0.5048 },
    promptVersion: 'c6.hero.v1',
    notes:
      'Leonardo Phoenix 1.0, seed=424242. Synthetic humanoid warrior in brushed-steel ' +
      'plate with cyan visor + amber energy blade. Approved by Raheem 2026-07-19 ' +
      '(no matching character in the Figma pack).',
  },
  Seraph: {
    path: 'heroes/archetypes/seraph.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.7598, bodyHeight: 0.6465, centerX: 0.5029 },
    notes: `${FIGMA_PACK} · Character 2 (crowned paladin with sword + shield).`,
  },
  Human: {
    path: 'heroes/archetypes/human.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    anchor: { baseline: 0.791, bodyHeight: 0.6133, centerX: 0.4415 },
    notes: `${FIGMA_PACK} · Character 6 (young sword adventurer with backpack).`,
  },
};

function specToAsset(archetype: ArchetypeName, spec: HeroSpriteSpec): CombatArtAsset {
  const slug = archetype.toLowerCase().replace(/\s+/g, '-');
  return {
    id: `hero_sprite_${slug}`,
    kind: 'hero_sprite',
    source: spec.source,
    path: spec.path,
    dimensions: { width: spec.width, height: spec.height },
    approvalStatus: 'approved',
    ...(spec.promptVersion ? { promptVersion: spec.promptVersion } : {}),
    notes: spec.notes,
  };
}

export const HERO_SPRITE_MANIFEST: HeroSpriteManifest = Object.fromEntries(
  (Object.entries(SPRITE_SPECS) as [ArchetypeName, HeroSpriteSpec][]).map(
    ([archetype, spec]) => [archetype, specToAsset(archetype, spec)],
  ),
) as HeroSpriteManifest;

export function getHeroSprite(archetype: ArchetypeName): CombatArtAsset {
  return HERO_SPRITE_MANIFEST[archetype];
}

/**
 * Deliberately kept OFF `CombatArtAsset` — bosses, effects and projectiles
 * share that type and none of them stand on the hero floor line, so this is
 * a hero-sprite concern only.
 */
export const HERO_SPRITE_ANCHORS: Record<ArchetypeName, HeroSpriteAnchor> = Object.fromEntries(
  (Object.entries(SPRITE_SPECS) as [ArchetypeName, HeroSpriteSpec][]).map(
    ([archetype, spec]) => [archetype, spec.anchor],
  ),
) as Record<ArchetypeName, HeroSpriteAnchor>;

export function getHeroSpriteAnchor(archetype: ArchetypeName): HeroSpriteAnchor {
  return HERO_SPRITE_ANCHORS[archetype];
}

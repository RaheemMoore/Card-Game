import type { ArchetypeName } from '../../types/card';
import { ARCHETYPE_NAMES } from '../../types/card';
import type { CombatArtAsset, HeroSpriteManifest } from './types';

/**
 * Hero combat sprites — pixel per the C0 hybrid decision. Sourced from a
 * Figma community pack ("16 Vector Pixel Fantasy Characters"); each
 * archetype gets one exported sprite. C5 ships placeholder rows keyed by
 * archetype; individual exports land in C6.
 */

function archetypeSlug(archetype: ArchetypeName): string {
  return archetype.toLowerCase().replace(/\s+/g, '-');
}

function placeholderSprite(archetype: ArchetypeName): CombatArtAsset {
  const slug = archetypeSlug(archetype);
  return {
    id: `hero_sprite_${slug}`,
    kind: 'hero_sprite',
    source: 'figma_community',
    path: `heroes/archetypes/${slug}.svg`,
    dimensions: { width: 256, height: 256 },
    approvalStatus: 'placeholder',
    notes: `Placeholder — replace with Figma-exported pixel sprite for ${archetype} in C6.`,
  };
}

export const HERO_SPRITE_MANIFEST: HeroSpriteManifest = Object.fromEntries(
  ARCHETYPE_NAMES.map((name) => [name, placeholderSprite(name)]),
) as HeroSpriteManifest;

export function getHeroSprite(archetype: ArchetypeName): CombatArtAsset {
  return HERO_SPRITE_MANIFEST[archetype];
}

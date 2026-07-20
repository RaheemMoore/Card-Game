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
 */

interface HeroSpriteSpec {
  path: string;
  source: CombatArtAsset['source'];
  width: number;
  height: number;
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
    notes: `${FIGMA_PACK} · Character 5 (viking berserker with horned helm + axe).`,
  },
  Monk: {
    path: 'heroes/archetypes/monk.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
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
    notes: `${FIGMA_PACK} · Character 14 (elf archer/ranger with glowing bow).`,
  },
  Druid: {
    path: 'heroes/archetypes/druid.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
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
    notes: `${FIGMA_PACK} · Character 12 (undead lich with blue flame aura).`,
  },
  Vampire: {
    path: 'heroes/archetypes/vampire.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
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
    notes: `${FIGMA_PACK} · Character 4 (wolf-headed warrior with axe and shield).`,
  },
  'Mech Pilot': {
    path: 'heroes/archetypes/mech-pilot.png',
    source: 'figma_community',
    width: 342,
    height: 512,
    notes: `${FIGMA_PACK} · Character 8 (steampunk engineer with wrench + goggles).`,
  },
  Android: {
    path: 'heroes/archetypes/android.png',
    source: 'leonardo',
    width: 1152,
    height: 1536,
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
    notes: `${FIGMA_PACK} · Character 2 (crowned paladin with sword + shield).`,
  },
  Human: {
    path: 'heroes/archetypes/human.png',
    source: 'figma_community',
    width: 342,
    height: 512,
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

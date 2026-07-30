import type { AbilityArtCrops } from '../../types/abilities';

/**
 * Approved visual benchmarks from the Ability Tile Art Direction Spec
 * (Gate 7A). Keyed by AbilityDefinition.slug so it survives id changes.
 *
 * Only slugs listed here get real approved art. Everything else falls back
 * to the family-tinted placeholder SVG (see canonicalArtPipeline).
 *
 * Files live under `card-engine/public/assets/abilities/approved/` and are
 * mirrored from `Card Images/Boss and Ability Visual Assets/`. Do not
 * embed UI text into the canonical artwork (see manifest.json rules).
 */
export const APPROVED_ABILITY_ART: Record<string, AbilityArtCrops> = {
  // EMPTY as of 2026-07-28. The five entries that lived here (ember-cleave,
  // aegis-ward, thornbite, soul-drain, radiant-ward) were art for the retired
  // roster. The image files are still on disk under
  // `public/assets/abilities/approved/` — they were not deleted — but they
  // depict those specific abilities, so remapping a fire-sweep painting onto
  // "Oathbreaker's Answer" would put the wrong picture on the card.
  //
  // Nothing is blocked by this: `registerPlaceholderArt` generates a
  // family-tinted placeholder tile for any ability with no manifest entry,
  // and every consumer null-guards. New canonical art is a follow-up.
  //
  // TWO are carried over, because the paintings genuinely depict the new
  // ability rather than merely being available: the old thornbite art is
  // nature-thorn imagery and Thornmantle is a nature-thorn ability; the old
  // radiant-ward art is a holy warding and Bearing Witness is a holy ward.
  // Nothing else survived that test.
  'thornmantle': {
    combat: { url: '/assets/abilities/approved/thornbite/combat.jpg' },
    detail: { url: '/assets/abilities/approved/thornbite/detail.jpg' },
    relic: { url: '/assets/abilities/approved/thornbite/relic.jpg' },
  },
  'bearing-witness': {
    combat: { url: '/assets/abilities/approved/radiant-ward/combat.jpg' },
    detail: { url: '/assets/abilities/approved/radiant-ward/detail.jpg' },
    relic: { url: '/assets/abilities/approved/radiant-ward/relic.jpg' },
  },
};

export function getApprovedArt(slug: string | undefined): AbilityArtCrops | undefined {
  if (!slug) return undefined;
  return APPROVED_ABILITY_ART[slug];
}

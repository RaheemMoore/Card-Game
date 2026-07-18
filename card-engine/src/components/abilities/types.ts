import type { AbilityResourceType } from '../../types/abilities';

/** Command Strip tier accent (ATS §17). */
export type AbilityTier = 'core' | 'signature' | 'ultimate';

/** Base runtime states a Command Strip can be in (ATS §17 lines 627–643). */
export type AbilityCommandState =
  | 'ready'
  | 'hover'
  | 'selected'
  | 'disabled'
  | 'cooldown';

/** Layered informational overlays (ATS §18 lines 751–793). */
export type AbilityOverlayVariant =
  | 'insufficient'
  | 'locked'
  | 'undiscovered'
  | 'effective'
  | 'resisted'
  | 'targeting'
  | 'focus';

/** Relic ceremonial-moment border color (ATS §21). */
export type RelicMoment = 'discovery' | 'evolution' | 'ultimate';

/** Resource badge geometry (ATS §26 lines 1447–1466). */
export type ResourceBadgeSize = 'combat' | 'compact' | 'relicAccent';

export type BadgeResource = Extract<AbilityResourceType, 'mana' | 'tech'>;

import { getDefinition, getArtForAbility } from '../services/abilities/registry';
import { getArtCrops } from '../types/abilities';
import {
  AbilityRelicPresentation,
  type BadgeResource,
  type RelicMoment,
} from './abilities';

interface Props {
  abilityId: string;
  moment: RelicMoment;
  /** Optional decorative accent — mana or tech. */
  resourceAccent?: BadgeResource;
  onClose: () => void;
}

/**
 * Full-screen ceremonial modal that fires when a new PlayerAbilityDiscovery
 * is written — from Forge, tier-up (signature), or ultimate awakening.
 * Wraps `AbilityRelicPresentation` and pulls the def + art from the store.
 *
 * Backdrop-click and Continue button both dismiss. Not gameplay-blocking;
 * the caller decides when it should fire and controls dismissal.
 */
export function RelicDiscoveryModal({ abilityId, moment, resourceAccent, onClose }: Props) {
  const def = getDefinition(abilityId);
  const art = getArtForAbility(abilityId);
  if (!def || !art) return null;
  const crops = getArtCrops(art);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/85 backdrop-blur-sm px-4 animate-[fadeIn_0.35s_ease-out]"
    >
      <div onClick={(e) => e.stopPropagation()} className="relative">
        <AbilityRelicPresentation
          moment={moment}
          abilityName={def.displayName.toUpperCase()}
          artworkUrl={crops.relic.url}
          lore={def.lore ?? def.descriptionShort}
          resourceAccent={resourceAccent}
        />
        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded font-fantasy text-sm font-bold border"
          style={{
            borderColor: 'rgba(196,196,212,0.35)',
            background: 'rgba(20,15,10,0.7)',
            color: 'var(--text-primary, #f4e8d2)',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

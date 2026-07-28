import type { AbilityCombatSnapshot, HeroCombatant } from '../../types/combat';
import type { AbilityEffect, AbilitySlotType } from '../../types/abilities';
import { getStatus } from '../../data/abilities/statuses';
import { AbilityPreviewCard } from './AbilityPreviewCard';

const SLOT_LABEL: Record<AbilitySlotType, string> = {
  core: 'CORE',
  signature: 'SIGNATURE',
  ultimate: 'ULTIMATE',
};

interface Props {
  hero: HeroCombatant;
  /** Armed ability — full AbilityPreviewCard body with Confirm/Cancel. */
  pendingAbility: AbilityCombatSnapshot | null;
  pendingArtUrl: string | null;
  projectedDamage: number | null;
  targetName: string | null;
  needsTargetPick: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Hover-preview — shown only when nothing is armed. */
  hoveredAbility: AbilityCombatSnapshot | null;
}

/**
 * Ability explanation popover — appears above the ability bar only while an
 * ability is armed or hovered (never a persistent fixed-footprint box), so
 * it explains name/cost/cooldown/description/effects without occluding the
 * arena the rest of the time. This is the first place that information is
 * surfaced anywhere in battle (previously only name/cost/cooldown showed on
 * the slot itself). Renders null when there's nothing to show — the parent
 * positions it absolutely, so an empty render must take no space at all.
 */
export function AbilityCodexPanel({
  hero,
  pendingAbility,
  pendingArtUrl,
  projectedDamage,
  targetName,
  needsTargetPick,
  onConfirm,
  onCancel,
  hoveredAbility,
}: Props) {
  if (pendingAbility) {
    return (
      <div role="status" aria-live="polite" style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
        <AbilityPreviewCard
          ability={pendingAbility}
          slot={pendingAbility.slot}
          artUrl={pendingArtUrl}
          projectedDamage={projectedDamage}
          targetName={targetName}
          needsTargetPick={needsTargetPick}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    );
  }
  if (hoveredAbility) {
    return (
      <div role="status" aria-live="polite" style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
        <HoverPreview ability={hoveredAbility} hero={hero} />
      </div>
    );
  }
  return null;
}

function HoverPreview({ ability }: { ability: AbilityCombatSnapshot; hero: HeroCombatant }) {
  const chips = ability.version.effects.slice(0, 3).map((e) => effectChipLabel(e));
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        opacity: 0.75,
        padding: 10,
        border: '1px dashed rgba(184,134,42,0.4)',
        borderRadius: 6,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          style={{
            color: '#f0942e',
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: 1.2,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {SLOT_LABEL[ability.slot]}
          {ability.resourceCost > 0 && (
            <span style={{ color: '#c8a86a', marginLeft: 4 }}>· COST {ability.resourceCost}</span>
          )}
          {ability.cooldownRounds > 0 && (
            <span style={{ color: '#c8a86a', marginLeft: 4 }}>· CD {ability.cooldownRounds}</span>
          )}
        </span>
        <span
          style={{
            color: '#9c8969',
            fontSize: 9,
            fontStyle: 'italic',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          preview
        </span>
      </div>
      <div
        style={{
          color: '#ebd9b2',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'Inter, system-ui, sans-serif',
          marginBottom: 3,
        }}
      >
        {ability.displayName}
      </div>
      <p
        style={{
          color: '#c8b895',
          fontSize: 11,
          lineHeight: 1.4,
          fontFamily: 'Inter, system-ui, sans-serif',
          margin: 0,
        }}
      >
        {ability.def.descriptionLong || ability.def.descriptionShort || 'No description available.'}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {chips.map((label, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(60,45,25,0.5)',
                border: '1px solid rgba(184,134,42,0.3)',
                color: '#d8b878',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function effectChipLabel(effect: AbilityEffect): string {
  switch (effect.type) {
    case 'direct_damage':
      return `Damage ${effect.amount}`;
    case 'damage_over_time':
      return `${getStatus(effect.statusId)?.displayName ?? effect.statusId} ${effect.duration}`;
    case 'healing':
      return `Heal ${effect.amount}`;
    case 'shielding':
      return `Shield ${effect.amount}`;
    case 'apply_status':
      return getStatus(effect.status.statusId)?.displayName ?? effect.status.statusId;
    case 'remove_status':
      return `Cleanse ${effect.category}`;
    case 'resource_gain':
      return `+${effect.amount} ${effect.resource}`;
    case 'resource_drain':
      return `-${effect.amount} ${effect.resource}`;
    case 'summon':
      return 'Summon';
    case 'lifesteal':
      return `Lifesteal ${Math.round(effect.percentOfDamage * 100)}%`;
    case 'multi_hit':
      return `${effect.hitCount}× hits`;
    case 'guard':
      return `Guard ${Math.round(effect.reductionPercent * 100)}%`;
    case 'taunt':
      return 'Taunt';
    case 'conditional_bonus':
      return 'Conditional';
    case 'ultimate_charge_gain':
      return `+${effect.amount} ultimate`;
    default:
      return 'Effect';
  }
}
